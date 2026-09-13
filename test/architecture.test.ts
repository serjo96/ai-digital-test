import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize, relative, resolve } from 'node:path';
import * as ts from 'typescript';
import { ProviderRegistry } from '../src/ai/contracts.js';
import { AiMatchingRunService } from '../src/pipeline/ai-matching-run.service.js';
import { CatalogRunService } from '../src/pipeline/catalog-run.service.js';
import { PublicationRunService } from '../src/pipeline/publication-run.service.js';
import { RunStoreService } from '../src/storage/run-store.service.js';
import { createPipelineService } from '../src/app.js';

const source = (path: string) => readFile(path, 'utf8');
const relativeImports = (text: string): string[] => {
  const parsed = ts.createSourceFile('source.ts', text, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const imports: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text.startsWith('.')) {
      imports.push(node.moduleSpecifier.text);
    }
    if (ts.isExportDeclaration(node) && !node.isTypeOnly && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text.startsWith('.')) {
      imports.push(node.moduleSpecifier.text);
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments.length === 1 && ts.isStringLiteral(node.arguments[0]!) && node.arguments[0].text.startsWith('.')) {
      imports.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(parsed);
  return imports;
};

async function tsFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => entry.isDirectory() ? tsFiles(join(directory, entry.name)) : Promise.resolve(extname(entry.name) === '.ts' ? [join(directory, entry.name)] : [])));
  return nested.flat();
}

describe('architecture boundaries', () => {
  test('composition root and dispatcher stay thin', async () => {
    const appModule = await source('src/app.module.ts');
    assert.doesNotMatch(appModule, /baseline|publicationPipeline|AiRuntime|node:fs/);
    const pipeline = await source('src/pipeline/pipeline.service.ts');
    assert.doesNotMatch(pipeline, /node:fs|publicationPipeline|AiRuntime|evaluate|metricsFor|reportMarkdown/);
    assert.match(pipeline, /CatalogRunService/);
    assert.match(pipeline, /AiMatchingRunService/);
    assert.match(pipeline, /PublicationRunService/);
    assert.match(pipeline, /ComparisonService/);
  });

  test('each run service rejects a scenario owned by another service', async () => {
    const store = new RunStoreService();
    const providers = new ProviderRegistry(new Map());
    const options = { feed: '', taxonomy: '', labels: '', out: '', runId: '' };
    await assert.rejects(new CatalogRunService(store).run({ ...options, baseline: 'b2' }), /only supports B0 and B1/);
    await assert.rejects(new AiMatchingRunService(providers, store).run({ ...options, baseline: 'b1' }), /only supports B2/);
    await assert.rejects(new PublicationRunService(providers, store).run({ ...options, baseline: 'b1' }), /only supports B3/);
  });

  test('scenario-specific option guards fail before any AI runtime can start', async () => {
    const output = await mkdtemp(join(tmpdir(), 'shelf-architecture-'));
    const service = createPipelineService(new ProviderRegistry(new Map()));
    const base = { feed: 'supplier_feed.json', taxonomy: 'taxonomy.json', labels: 'eval/labels.json', out: output };
    try {
      await assert.rejects(service.run({ ...base, runId: 'catalog-ai-option', baseline: 'b1', aiMode: 'live' }), /AI options require/);
      await assert.rejects(service.run({ ...base, runId: 'b2-missing-runtime', baseline: 'b2' }), /requires explicit/);
      await assert.rejects(service.run({ ...base, runId: 'b3-stage3-option', baseline: 'b3', aiMode: 'replay', aiCache: 'unused', aiTask: 'extraction' }), /not valid for B3/);
    } finally {
      await rm(output, { recursive: true, force: true });
    }
  });

  test('domain code is framework-independent and catalog code does not depend on publication', async () => {
    const domainFiles = ['src/baseline.ts', 'src/products.ts', 'src/facts.ts', 'src/evaluation.ts', 'src/metrics.ts', 'src/reports.ts'];
    for (const path of domainFiles) assert.doesNotMatch(await source(path), /@nestjs\//, path);
    for (const path of ['src/baseline.ts', 'src/products.ts', 'src/facts.ts']) assert.doesNotMatch(await source(path), /from ['"].*publication/, path);
  });

  test('root compatibility exports and existing web integration paths remain explicit', async () => {
    const compatibility = await source('src/app.ts');
    assert.match(compatibility, /export \{ AppModule \}/);
    assert.match(compatibility, /export \{ PipelineService \}/);
    const webImports = (await tsFiles('web/src')).flatMap(async path => ({ path, text: await source(path) }));
    const loaded = await Promise.all(webImports);
    const backendTargets = loaded.flatMap(({ text }) => [...text.matchAll(/from ['"]\.\.\/\.\.\/\.\.\/src\/([^'"]+)/g)].map(match => match[1]!));
    assert.deepEqual([...new Set(backendTargets)].sort(), [
      'catalog-snapshot.ts', 'domain.ts', 'evaluation.ts', 'matching-audit.ts', 'publication-evaluation.ts', 'types.ts',
    ]);
  });

  test('production runtime imports have no cycles', async () => {
    const root = resolve('src');
    const files = await tsFiles(root);
    const known = new Set(files.map(path => normalize(path)));
    const graph = new Map<string, string[]>();
    for (const file of files) {
      const dependencies = relativeImports(await source(file)).map(specifier => {
        const target = resolve(dirname(file), specifier.replace(/\.js$/, '.ts'));
        return normalize(target);
      }).filter(target => known.has(target));
      graph.set(normalize(file), dependencies);
    }
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const visit = (file: string, trail: string[]): void => {
      if (visiting.has(file)) assert.fail(`runtime import cycle: ${[...trail, relative(root, file)].join(' -> ')}`);
      if (visited.has(file)) return;
      visiting.add(file);
      for (const dependency of graph.get(file) ?? []) visit(dependency, [...trail, relative(root, file)]);
      visiting.delete(file);
      visited.add(file);
    };
    for (const file of graph.keys()) visit(file, []);
  });
});

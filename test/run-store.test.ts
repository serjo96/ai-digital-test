import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RunStoreService } from '../src/storage/run-store.service.js';
import { baseline } from '../src/baseline.js';
import { persistRun } from '../src/pipeline/run-common.js';
import type { Labels, RunReport, SourceRow } from '../src/types.js';

const temporary = async (fn: (directory: string) => Promise<void>) => {
  const directory = await mkdtemp(join(tmpdir(), 'shelf-store-'));
  try { await fn(directory); } finally { await rm(directory, { recursive: true, force: true }); }
};

describe('RunStoreService', () => {
  test('reserves a safe run directory exactly once', async () => temporary(async root => {
    const store = new RunStoreService();
    assert.equal(await store.reserve(root, 'safe-run_1.0'), join(root, 'safe-run_1.0'));
    await assert.rejects(store.reserve(root, 'safe-run_1.0'), /EEXIST/);
  }));

  test('rejects unsafe run IDs before creating a directory', async () => temporary(async root => {
    await assert.rejects(new RunStoreService().reserve(root, '../escape'), /run ID/);
  }));

  test('surfaces missing reads and never overwrites an artifact', async () => temporary(async root => {
    const store = new RunStoreService();
    const path = join(root, 'artifact.json');
    await assert.rejects(store.readText(path), /ENOENT/);
    await store.saveJson(path, { first: true });
    await assert.rejects(store.saveJson(path, { first: false }), /EEXIST/);
    assert.equal(await readFile(path, 'utf8'), '{\n  "first": true\n}\n');
  }));

  test('persistence rejects a result that lost an original input row', async () => {
    const rows: SourceRow[] = [
      { row_id: 'a', supplier: 'supplier', supplier_sku: 'a', raw_title: 'A', raw_specs: '', price: '$1', stock: 1 },
      { row_id: 'b', supplier: 'supplier', supplier_sku: 'b', raw_title: 'B', raw_specs: '', price: '$1', stock: 1 },
    ];
    const dropped = baseline(rows.slice(0, 1));
    await assert.rejects(
      persistRun(new RunStoreService(), '', dropped, {} as RunReport, {} as Labels, rows, 0),
      /lost source rows/,
    );
  });
});

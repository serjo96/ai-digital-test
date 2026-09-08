import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { hash } from './baseline.js';
import type { BaselineResult, Ratio, RunReport } from './types.js';

export async function codeVersion(): Promise<RunReport['code']> {
  let commit: string | null = null; let dirty: boolean | null = null;
  try {
    commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    dirty = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().length > 0;
  } catch { /* ZIP distribution has no Git metadata. */ }
  const files = ['package.json', 'package-lock.json', 'tsconfig.json'];
  for (const dir of ['src', 'test']) {
    for (const file of await readdir(dir, { recursive: true })) if (file.endsWith('.ts')) files.push(join(dir, file));
  }
  const contents = await Promise.all(files.sort().map(async path => [path, hash(await readFile(path, 'utf8'))]));
  return { commit, dirty, implementationHash: hash(JSON.stringify(contents)) };
}

export function formatRatio(value: Ratio): string {
  return `${value.value === null ? 'N/A' : `${(value.value * 100).toFixed(2)}%`} (${value.numerator}/${value.denominator})`;
}

export function reportMarkdown(report: RunReport): string {
  const e = report.evaluation; const a = report.audit;
  return `# ${report.runId} — B0\n\n` +
    `Status: ${report.status}; mode: ${report.mode}; matching labels: **${e.status}**; split: development. Holdout not evaluated.\n\n` +
    `| Metric | Value |\n|---|---|\n` +
    `| Accounted rows | ${a.accountedRows}/${a.inputRows} |\n| Lost / double assignments | ${a.lostRows} / ${a.duplicateAssignments} |\n` +
    `| Diagnostic groups / grouped rows | ${a.groups} / ${a.groupedRows} |\n| Repeated groups | ${a.repeatedGroups} |\n` +
    `| Non-products / missing-title review | ${a.nonProducts} / ${a.reviewRows} |\n` +
    `| Matching precision (${e.status}) | ${formatRatio(e.precision)} |\n| Matching recall (${e.status}) | ${formatRatio(e.recall)} |\n` +
    `| TP / FP / FN | ${e.tp} / ${e.fp} / ${e.fn} |\n| Cases / evaluated rows | ${e.caseCount} / ${e.evaluatedRows} |\n` +
    `| Unknown / unevaluated attached pairs | ${e.unknownPairs} / ${e.unevaluatedPairs.length} |\n` +
    `| Non-product decisions correct | ${e.nonProducts.correct}/${e.nonProducts.checked} |\n` +
    `| Generation / verifier / category quality | N/A / N/A / N/A |\n| API calls / tokens / cost | 0 / 0 / 0 |\n` +
    `| Wall time (CLI bootstrap through result/diagnostic writes) | ${report.wallTimeMs.toFixed(3)} ms |\n\n` +
    `These are exact-title diagnostic groups, not publication-ready products. Price warnings are recorded per row; the stage-2 review metric is not implemented.\n\n` +
    `## Matching errors\n\n${e.errors.length ? e.errors.map(x => `- ${x.kind}: ${x.pair.join(' ↔ ')}`).join('\n') : 'None on the evaluated relations.'}\n\n` +
    `## Provenance\n\n- Commit: ${report.code.commit ?? 'N/A'}; dirty: ${report.code.dirty ?? 'N/A'}\n` +
    `- Implementation SHA-256: ${report.code.implementationHash}\n- Feed: ${report.hashes.feed}\n- Taxonomy: ${report.hashes.taxonomy}\n` +
    `- Labels: ${report.hashes.labels}\n- Config: ${report.hashes.config}\n- Decisions: ${report.decisionsHash}\n` +
    `- Rules: ${report.rulesVersion}; schema: ${report.schemaVersion}\n\n` +
    `Human verification is required before calling the provisional labels ground truth. Unknown relations are excluded; relations between distinct labelled groups/cases are explicit negatives by annotation policy.\n`;
}

export function compareReports(before: RunReport | null, after: RunReport, beforeResult: BaselineResult | null, afterResult: BaselineResult) {
  const incompatible: string[] = [];
  if (before) {
    for (const key of ['feed', 'taxonomy', 'labels'] as const) if (before.hashes[key] !== after.hashes[key]) incompatible.push(`${key} hash changed`);
    if (before.evaluation.split !== after.evaluation.split) incompatible.push('split changed');
    if (before.schemaVersion !== after.schemaVersion) incompatible.push('report schema changed');
  }
  const comparable = incompatible.length === 0;
  const flatten = (r: RunReport) => ({
    inputRows: r.audit.inputRows, accountedRows: r.audit.accountedRows, lostRows: r.audit.lostRows,
    duplicateAssignments: r.audit.duplicateAssignments, groups: r.audit.groups, nonProducts: r.audit.nonProducts,
    reviewRows: r.audit.reviewRows, tp: r.evaluation.tp, fp: r.evaluation.fp, fn: r.evaluation.fn,
    precision: r.evaluation.precision.value, recall: r.evaluation.recall.value,
  });
  const oldMetrics = before ? flatten(before) : null; const newMetrics = flatten(after);
  const deltas = Object.fromEntries(Object.entries(newMetrics).map(([k, v]) => {
    const old = oldMetrics?.[k as keyof typeof newMetrics];
    return [k, comparable && typeof old === 'number' && typeof v === 'number' ? v - old : null];
  }));
  const oldRows = new Map(beforeResult?.rows.map(r => [r.source.row_id, r]) ?? []);
  const newRows = new Map(afterResult.rows.map(r => [r.source.row_id, r]));
  const changedRows = [...new Set([...oldRows.keys(), ...newRows.keys()])].sort().filter(id =>
    JSON.stringify(oldRows.get(id)) !== JSON.stringify(newRows.get(id)));
  const violations: string[] = [];
  if (after.audit.lostRows || after.audit.duplicateAssignments || after.audit.accountedRows !== after.audit.inputRows) violations.push('row accounting failed');
  if (before && comparable && after.evaluation.fp > before.evaluation.fp) violations.push('new false merges on labelled relations');
  return {
    before: before?.runId ?? 'before-implementation', after: after.runId,
    comparable, incompatible, interpretation: before ? 'Saved run comparison' : 'No prior pipeline; previous quality and deltas are N/A',
    qualityStatus: after.evaluation.status, beforeMetrics: oldMetrics, afterMetrics: newMetrics, deltas,
    decisionsEqual: before ? before.decisionsHash === after.decisionsHash : null,
    changedRowIds: changedRows, configChanged: before ? before.hashes.config !== after.hashes.config : null,
    wallTimeMs: { before: before?.wallTimeMs ?? null, after: after.wallTimeMs }, violations,
  };
}

export function comparisonMarkdown(c: ReturnType<typeof compareReports>): string {
  const display = (v: unknown) => v === null || v === undefined ? 'N/A' : String(v);
  return `# ${c.before} → ${c.after}\n\n${c.interpretation}. Quality: **${c.qualityStatus}**.\n\n` +
    `Comparable: ${c.comparable}. ${c.incompatible.join('; ')}\n\n| Metric | Before | After | Delta |\n|---|---|---|---|\n` +
    Object.entries(c.afterMetrics).map(([k, v]) => `| ${k} | ${display(c.beforeMetrics?.[k as keyof typeof c.afterMetrics])} | ${display(v)} | ${display(c.deltas[k])} |`).join('\n') +
    `\n\nDecisions equal: ${display(c.decisionsEqual)}. Changed/new/removed rows: ${c.changedRowIds.length}.\n` +
    `Wall time: ${display(c.wallTimeMs.before)} → ${c.wallTimeMs.after} ms (not a deterministic metric).\n\n` +
    `Mandatory violations: ${c.violations.join('; ') || 'none'}. Full row IDs are in comparison.json.\n`;
}

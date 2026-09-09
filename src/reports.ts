import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { hash } from './baseline.js';
import { metricTable } from './metrics.js';
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
  if (report.schemaVersion === '2') return `# ${report.runId} — ${report.rulesVersion}\n\n` +
    `Status: ${report.status}; matching labels: **${e.status}**; development only. Holdout not evaluated.\n\n` +
    metricTable(report.metrics ?? []) +
    `\nMatching errors: ${e.errors.length ? JSON.stringify(e.errors) : 'none'}.\n\n` +
    `Quality check errors: ${report.checks ? JSON.stringify(report.checks.errors) : 'N/A'}.\n\n` +
    `Sources/config: ${JSON.stringify(report.hashes)}\n\nCode: ${JSON.stringify(report.code)}\n\n` +
    `Timing: ${JSON.stringify(report.timing)}. Wall measurement ends after result/diagnostics, before metric/report serialization.\n\n` +
    `No generation, verifier, or publication readiness. Counts over all inputs are diagnostics; quality is measured only on the provisional development labels/checks. Unknown relations are excluded.\n`;
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
    if (![before.schemaVersion, after.schemaVersion].every(v => v === '1' || v === '2')) incompatible.push('unsupported report schema');
  }
  const comparable = incompatible.length === 0;
  const flatten = (r: RunReport) => ({
    inputRows: r.audit.inputRows, accountedRows: r.audit.accountedRows, lostRows: r.audit.lostRows,
    duplicateAssignments: r.audit.duplicateAssignments, groups: r.audit.groups, nonProducts: r.audit.nonProducts,
    reviewRows: r.schemaVersion === '2' && r.rulesVersion.startsWith('B1-') ? r.audit.reviewRows : null, tp: r.evaluation.tp, fp: r.evaluation.fp, fn: r.evaluation.fn,
    precision: r.evaluation.precision.value, recall: r.evaluation.recall.value,
  });
  const oldMetrics = before ? flatten(before) : null; const newMetrics = flatten(after);
  const deltas = Object.fromEntries(Object.entries(newMetrics).map(([k, v]) => {
    const old = oldMetrics?.[k as keyof typeof newMetrics];
    return [k, comparable && typeof old === 'number' && typeof v === 'number' ? v - old : null];
  }));
  const membership = (result: BaselineResult | null) => new Map(result?.groups.flatMap(g => g.rowIds.map(id => [id, [...g.rowIds].sort()] as const)) ?? []);
  const oldMembers = membership(beforeResult); const newMembers = membership(afterResult);
  const oldRows = new Map(beforeResult?.rows.map(r => [r.source.row_id, r]) ?? []);
  const newRows = new Map(afterResult.rows.map(r => [r.source.row_id, r]));
  const changedRows = [...new Set([...oldRows.keys(), ...newRows.keys()])].sort().filter(id =>
    JSON.stringify(oldRows.get(id)) !== JSON.stringify(newRows.get(id)));
  const changedMatchingRowIds = [...new Set([...oldRows.keys(), ...newRows.keys()])].sort().filter(id =>
    JSON.stringify([oldRows.get(id)?.outcome, oldMembers.get(id)]) !== JSON.stringify([newRows.get(id)?.outcome, newMembers.get(id)]));
  const metricNames = [...new Set([...(before?.metrics ?? []).map(m => m.name), ...(after.metrics ?? []).map(m => m.name)])].sort();
  const metricDeltas = metricNames.map(name => {
    const old = before?.metrics?.find(m => m.name === name); const next = after.metrics?.find(m => m.name === name);
    const sameProtocol = comparable && (!/^(categories|facts|reconciliation)\.check_accuracy$/.test(name) || before?.hashes.checks === after.hashes.checks);
    return { name, before: old?.value ?? null, after: next?.value ?? null,
      delta: sameProtocol && old?.value != null && next?.value != null ? next.value - old.value : null };
  });
  const violations: string[] = [];
  if (after.audit.lostRows || after.audit.duplicateAssignments || after.audit.accountedRows !== after.audit.inputRows) violations.push('row accounting failed');
  if (before && comparable && after.evaluation.fp > before.evaluation.fp) violations.push('new false merges on labelled relations');
  if (after.checks?.errors.length) violations.push('development quality checks failed');
  return {
    before: before?.runId ?? 'before-implementation', after: after.runId,
    comparable, incompatible, interpretation: before ? 'Saved run comparison' : 'No prior pipeline; previous quality and deltas are N/A',
    qualityStatus: after.evaluation.status, beforeMetrics: oldMetrics, afterMetrics: newMetrics, deltas,
    decisionsEqual: before ? before.decisionsHash === after.decisionsHash : null,
    changedRowIds: changedRows, changedMatchingRowIds, metricDeltas, configChanged: before ? before.hashes.config !== after.hashes.config : null,
    wallTimeMs: { before: before?.wallTimeMs ?? null, after: after.wallTimeMs }, violations,
  };
}

export function comparisonMarkdown(c: ReturnType<typeof compareReports>): string {
  const display = (v: unknown) => v === null || v === undefined ? 'N/A' : String(v);
  return `# ${c.before} → ${c.after}\n\n${c.interpretation}. Quality: **${c.qualityStatus}**.\n\n` +
    `Comparable: ${c.comparable}. ${c.incompatible.join('; ')}\n\n| Metric | Before | After | Delta |\n|---|---|---|---|\n` +
    Object.entries(c.afterMetrics).map(([k, v]) => `| ${k} | ${display(c.beforeMetrics?.[k as keyof typeof c.afterMetrics])} | ${display(v)} | ${display(c.deltas[k])} |`).join('\n') +
    `\n\nDecisions equal: ${display(c.decisionsEqual)}. Changed/new/removed rows: ${c.changedRowIds.length}.\n` +
    `Changed matching membership/outcome rows: ${c.changedMatchingRowIds.length}.\n\n` +
    `Wall time: ${display(c.wallTimeMs.before)} → ${c.wallTimeMs.after} ms (not a deterministic metric).\n\n` +
    `Mandatory violations: ${c.violations.join('; ') || 'none'}. Full row IDs and extended metric deltas are in comparison.json. Historical B0 review is N/A because its definition differed.\n`;
}

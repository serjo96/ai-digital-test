import { join } from 'node:path';
import { compareReports, comparisonMarkdown } from '../reports.js';
import { RunStoreService } from '../storage/run-store.service.js';

export class ComparisonService {
  constructor(private readonly store: RunStoreService) {}

  async compare(beforeDir: string | null, afterDir: string, out: string, runId: string): Promise<string> {
    const [after, afterResult] = await this.store.readRun(afterDir);
    const previous = beforeDir ? await this.store.readRun(beforeDir) : null;
    const comparison = compareReports(previous?.[0] ?? null, after, previous?.[1] ?? null, afterResult);
    const directory = await this.store.reserve(out, runId);
    await this.store.saveJson(join(directory, 'comparison.json'), comparison);
    await this.store.writeTextExclusive(join(directory, 'comparison.md'), comparisonMarkdown(comparison));
    if (!comparison.comparable || comparison.violations.length) throw new Error(`comparison failed; see ${directory}`);
    return directory;
  }
}

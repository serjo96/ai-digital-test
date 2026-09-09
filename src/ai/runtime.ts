import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { z } from 'zod';
import { hash } from '../baseline.js';
import { AiError, ProviderRegistry, type AiCallRecord, type AiRequest, type AiResponse, type AiSummary } from './contracts.js';
import type { AiConfig } from './config.js';

const responseSchema = z.strictObject({
  status: z.enum(['completed', 'refused', 'incomplete', 'invalid']), data: z.unknown(), model: z.string().min(1), requestId: z.string().nullable(),
  usage: z.strictObject({ inputTokens: z.number().int().nonnegative(), outputTokens: z.number().int().nonnegative(), cachedInputTokens: z.number().int().nonnegative(), cacheWriteTokens: z.number().int().nonnegative().nullable() })
    .refine(u => u.cachedInputTokens + (u.cacheWriteTokens ?? 0) <= u.inputTokens).nullable(),
});
const cacheSchema = z.strictObject({ version: z.literal('ai-cache-v1'), key: z.string(), origin: z.enum(['real', 'test']), responseHash: z.string(), response: responseSchema });
export const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
  return JSON.stringify(value);
};

export class AiRuntime {
  readonly records: AiCallRecord[] = [];
  constructor(private readonly registry: ProviderRegistry, readonly config: AiConfig,
    readonly mode: 'live' | 'replay', private readonly cache: string,
    private readonly pause: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms)),
  ) {}

  async execute<T>(providerId: string, role: AiCallRecord['role'], rowIds: string[], request: AiRequest,
    validate: (data: unknown) => T): Promise<T | null> {
    const start = performance.now();
    const record: AiCallRecord = { key: '', role, rowIds, provider: providerId, endpoint: '', model: request.model,
      mode: this.mode, origin: 'real', attempts: 0, errors: 0, elapsedMs: 0, status: 'error', error: null, response: null, attemptUsage: [] };
    this.records.push(record);
    try {
      const provider = this.registry.get(providerId);
      record.endpoint = provider.endpoint; record.origin = provider.kind;
      const key = hash(canonicalJson({ version: 'ai-cache-v1', provider: providerId, endpoint: provider.endpoint, request }));
      record.key = key;
      const path = join(this.cache, `${key}.json`);
      if (this.mode === 'replay') {
        let cached: z.infer<typeof cacheSchema>;
        try { cached = cacheSchema.parse(JSON.parse(await readFile(path, 'utf8'))); } catch { throw new AiError('cache'); }
        if (cached.key !== key || hash(canonicalJson(cached.response)) !== cached.responseHash || cached.origin !== provider.kind) throw new AiError('cache');
        record.response = cached.response;
        if (cached.response.status !== 'completed') throw new AiError('cache');
        const parsed = validate(cached.response.data);
        record.status = 'success';
        return parsed;
      }
      provider.validateConfiguration?.(request);
      // Fresh live runs require a new cache directory. Never overwrite a prior response.
      let exists = false;
      try { await access(path); exists = true; } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new AiError('cache'); }
      if (exists) throw new AiError('cache');
      let response: AiResponse | undefined;
      for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout> | undefined;
        record.attempts++;
        try {
          const timeout = new Promise<never>((_, reject) => {
            timer = setTimeout(() => { controller.abort(); reject(new AiError('timeout', true)); }, this.config.timeoutMs);
          });
          response = responseSchema.parse(await Promise.race([provider.generate(request, controller.signal), timeout]));
          record.attemptUsage.push(response.usage);
          break;
        } catch (error) {
          record.errors++; record.attemptUsage.push(null);
          const safe = error instanceof AiError ? error : new AiError('invalid_response');
          if (!safe.retryable || attempt === this.config.maxRetries) throw safe;
          if (timer) clearTimeout(timer);
          await this.pause(Math.min(1000 * 2 ** attempt, 4000));
        } finally { if (timer) clearTimeout(timer); }
      }
      if (!response) throw new AiError('invalid_response');
      record.response = response;
      if (response.status !== 'completed') throw new AiError('invalid_response');
      const parsed = validate(response.data);
      await mkdir(this.cache, { recursive: true });
      await writeFile(path, JSON.stringify({ version: 'ai-cache-v1', key, origin: provider.kind,
        responseHash: hash(canonicalJson(response)), response }, null, 2) + '\n', { flag: 'wx' });
      record.status = 'success';
      return parsed;
    } catch (error) {
      record.error = error instanceof AiError ? error.kind : 'invalid_response';
      if (!record.errors) record.errors++;
      return null;
    } finally { record.elapsedMs = performance.now() - start; }
  }

  summary(): AiSummary {
    const real = this.records.filter(r => r.origin === 'real');
    const live = real.filter(r => r.mode === 'live');
    const usage = live.flatMap(r => r.attemptUsage);
    const known = usage.every(u => u !== null);
    const inputTokens = known ? usage.reduce((sum, u) => sum + u!.inputTokens, 0) : null;
    const outputTokens = known ? usage.reduce((sum, u) => sum + u!.outputTokens, 0) : null;
    let cost: number | null = 0;
    for (const r of live.filter(r => r.attempts > 0)) {
      const price = this.config.prices.find(p => p.provider === r.provider && p.model === r.model);
      if (!price || r.attemptUsage.some(u => !u || u.cacheWriteTokens === null || u.inputTokens > price.maxInputTokens)) { cost = null; break; }
      for (const u of r.attemptUsage) cost += ((u!.inputTokens - u!.cachedInputTokens - u!.cacheWriteTokens!) * price.inputPerMillion + u!.cachedInputTokens * price.cachedInputPerMillion + u!.cacheWriteTokens! * price.cacheWritePerMillion + u!.outputTokens * price.outputPerMillion) / 1_000_000;
    }
    return { calls: live.reduce((n, r) => n + r.attempts, 0), errors: live.filter(r => r.attempts > 0).reduce((n, r) => n + r.errors, 0),
      retries: live.reduce((n, r) => n + Math.max(0, r.attempts - 1), 0), cacheHits: real.filter(r => r.mode === 'replay' && r.status === 'success').length,
      inputTokens, outputTokens, tokens: inputTokens === null || outputTokens === null ? null : inputTokens + outputTokens, cost };
  }
}

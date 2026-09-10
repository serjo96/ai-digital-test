import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { z } from 'zod';
import { hash } from '../baseline.js';
import { AiError, ProviderRegistry, type AiCallRecord, type AiRequest, type AiSummary } from './contracts.js';
import type { RuntimeConfig } from './config.js';

const responseSchema = z.strictObject({
  status: z.enum(['completed', 'refused', 'incomplete', 'invalid']), data: z.unknown(), model: z.string().min(1), requestId: z.string().nullable(),
  raw: z.string().optional(), jsonParsed: z.boolean().optional(), timings: z.strictObject({ totalMs: z.number().nullable(), loadMs: z.number().nullable(), promptMs: z.number().nullable(), generationMs: z.number().nullable() }).optional(),
  usage: z.strictObject({ inputTokens: z.number().int().nonnegative(), outputTokens: z.number().int().nonnegative(), cachedInputTokens: z.number().int().nonnegative().nullable(), cacheWriteTokens: z.number().int().nonnegative().nullable() })
    .refine(u => (u.cachedInputTokens ?? 0) + (u.cacheWriteTokens ?? 0) <= u.inputTokens).nullable(),
});
const attemptSchema = z.strictObject({ raw: z.string().optional(), elapsedMs: z.number().nonnegative(), error: z.string().nullable(), response: responseSchema.nullable() });
const cacheV2 = z.strictObject({ version: z.literal('ai-cache-v2'), key: z.string(), origin: z.enum(['real', 'test']), responseHash: z.string(), response: responseSchema.nullable(), attempts: z.array(attemptSchema), attemptsHash: z.string(), request: z.unknown() });
const cacheSchema = z.strictObject({ version: z.literal('ai-cache-v1'), key: z.string(), origin: z.enum(['real', 'test']), responseHash: z.string(), response: responseSchema });
export const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
  return JSON.stringify(value);
};

export class AiRuntime<TConfig extends RuntimeConfig = RuntimeConfig> {
  readonly records: AiCallRecord[] = [];
  constructor(private readonly registry: ProviderRegistry, readonly config: TConfig,
    readonly mode: 'live' | 'replay', private readonly cache: string,
    private readonly pause: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms)),
  ) {}

  async execute<T>(providerId: string, role: AiCallRecord['role'], rowIds: string[], request: AiRequest,
    validate: (data: unknown) => T): Promise<T | null> {
    const start = performance.now();
    const diagnostics = Object.fromEntries(['transport', 'completion', 'json', 'schema', 'citations', 'semantic'].map(stage => [stage, { checked: false, passed: false, reason: null as string | null }]));
    const record: AiCallRecord = { key: '', role, rowIds, provider: providerId, endpoint: '', model: request.model,
      mode: this.mode, origin: 'real', attempts: 0, errors: 0, elapsedMs: 0, status: 'error', error: null, response: null, attemptUsage: [], attemptsLog: [], diagnostics };
    this.records.push(record);
    const check = (stage: string, passed: boolean, reason: string | null = null) => { diagnostics[stage] = { checked: true, passed, reason }; };
    try {
      const provider = this.registry.get(providerId);
      record.endpoint = provider.endpoint; record.origin = provider.kind;
      const identity = { provider: providerId, endpoint: provider.endpoint, request };
      const key = hash(canonicalJson({ version: 'ai-cache-v2', ...identity }));
      record.key = key;
      const path = join(this.cache, `${key}.json`);
      if (this.mode === 'replay') {
        let cached;
        try {
          cached = cacheV2.parse(JSON.parse(await readFile(path, 'utf8')));
          if (cached.key !== key || hash(canonicalJson(cached.request)) !== hash(canonicalJson(request)) || hash(canonicalJson(cached.attempts)) !== cached.attemptsHash) throw new Error('cache integrity');
          record.attemptsLog = cached.attempts;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new AiError('cache');
          const oldKey = hash(canonicalJson({ version: 'ai-cache-v1', ...identity }));
          try { cached = cacheSchema.parse(JSON.parse(await readFile(join(this.cache, `${oldKey}.json`), 'utf8'))); } catch { throw new AiError('cache'); }
          if (cached.key !== oldKey) throw new AiError('cache');
          record.key = oldKey;
        }
        if (hash(canonicalJson(cached.response)) !== cached.responseHash || cached.origin !== provider.kind) throw new AiError('cache');
        record.response = cached.response;
        if (!record.response) {
          check('transport', false, record.attemptsLog?.at(-1)?.error ?? 'invalid_response');
          throw new AiError((record.attemptsLog?.at(-1)?.error ?? 'invalid_response') as import('./contracts.js').ErrorKind);
        }
      } else {
        provider.validateConfiguration?.(request);
        let exists = false;
        try { await access(path); exists = true; } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new AiError('cache'); }
        if (exists) throw new AiError('cache');
        await mkdir(this.cache, { recursive: true });
        let terminal: AiError | undefined;
        for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
          const controller = new AbortController();
          let timer: ReturnType<typeof setTimeout> | undefined;
          const attemptStart = performance.now();
          record.attempts++;
          try {
            const timeout = new Promise<never>((_, reject) => {
              timer = setTimeout(() => { controller.abort(); reject(new AiError('timeout', true)); }, this.config.timeoutMs);
            });
            const response = await Promise.race([provider.generate(request, controller.signal), timeout]);
            // Persist returned content before any response, schema, or evidence validation.
            record.response = response;
            record.attemptUsage.push(response.usage);
            record.attemptsLog!.push({ elapsedMs: performance.now() - attemptStart, error: null, response });
          } catch (error) {
            terminal = error instanceof AiError ? error : new AiError('invalid_response');
            record.errors++; record.attemptUsage.push(null);
            record.attemptsLog!.push({ elapsedMs: performance.now() - attemptStart, error: terminal.kind, response: null, ...(terminal.rawBody !== undefined ? { raw: terminal.rawBody } : {}) });
          } finally { if (timer) clearTimeout(timer); }
          await writeFile(join(this.cache, `${key}.attempt-${attempt + 1}.json`), JSON.stringify(record.attemptsLog!.at(-1), null, 2) + '\n', { flag: 'wx' });
          if (record.response || !terminal?.retryable || attempt === this.config.maxRetries) break;
          await this.pause(Math.min(1000 * 2 ** attempt, 4000));
        }
        await writeFile(path, JSON.stringify({ version: 'ai-cache-v2', key, origin: provider.kind, request,
          responseHash: hash(canonicalJson(record.response)), response: record.response,
          attempts: record.attemptsLog, attemptsHash: hash(canonicalJson(record.attemptsLog)) }, null, 2) + '\n', { flag: 'wx' });
        if (!record.response) { check('transport', false, terminal?.kind ?? 'invalid_response'); throw terminal ?? new AiError('invalid_response'); }
      }
      if (this.mode === 'replay' && record.response && provider.replayResponse) record.response = provider.replayResponse(record.response);
      check('transport', true);
      const response = responseSchema.parse(record.response);
      check('completion', response.status === 'completed', response.status === 'completed' ? null : response.status);
      if (response.jsonParsed !== undefined || response.status === 'completed' || response.status === 'invalid') check('json', response.jsonParsed ?? response.status === 'completed', response.jsonParsed === false || response.status === 'invalid' ? 'invalid_json' : null);
      if (response.status !== 'completed') throw new AiError('invalid_response');
      const parsed = validate(response.data);
      record.status = 'success';
      return parsed;
    } catch (error) {
      if (error instanceof z.ZodError) check('schema', false, JSON.stringify(error.issues.map(i => ({ path: i.path, code: i.code }))));
      record.error = error instanceof AiError ? error.kind : 'invalid_response';
      if (!record.errors) record.errors++;
      return null;
    } finally { record.elapsedMs = performance.now() - start; }
  }

  /** Validation levels are shared by all providers and rerun on replay. */
  check<T>(stage: 'schema' | 'citations' | 'semantic', validate: () => T): T {
    const diagnostics = this.records.at(-1)!.diagnostics!;
    try { const value = validate(); diagnostics[stage] = { checked: true, passed: true, reason: null }; return value; }
    catch (error) {
      diagnostics[stage] = { checked: true, passed: false, reason: error instanceof z.ZodError ? JSON.stringify(error.issues.map(i => ({ path: i.path, code: i.code }))) : error instanceof Error ? error.message : 'validation failed' };
      throw new AiError('invalid_response');
    }
  }

  summary(role?: AiCallRecord['role']): AiSummary {
    const real = this.records.filter(r => r.origin === 'real' && (!role || r.role === role));
    const live = real.filter(r => r.mode === 'live');
    const usage = live.flatMap(r => r.attemptUsage);
    const known = usage.every(u => u !== null);
    const inputTokens = known ? usage.reduce((sum, u) => sum + u!.inputTokens, 0) : null;
    const outputTokens = known ? usage.reduce((sum, u) => sum + u!.outputTokens, 0) : null;
    let cost: number | null = 0;
    for (const r of live.filter(r => r.attempts > 0)) {
      const price = this.config.prices.find(p => p.provider === r.provider && p.model === r.model);
      if (!price || r.attemptUsage.some(u => !u || u.cachedInputTokens === null || u.cacheWriteTokens === null || u.inputTokens > price.maxInputTokens)) { cost = null; break; }
      for (const u of r.attemptUsage) cost += ((u!.inputTokens - u!.cachedInputTokens! - u!.cacheWriteTokens!) * price.inputPerMillion + u!.cachedInputTokens! * price.cachedInputPerMillion + u!.cacheWriteTokens! * price.cacheWritePerMillion + u!.outputTokens * price.outputPerMillion) / 1_000_000;
    }
    return { calls: live.reduce((n, r) => n + r.attempts, 0), errors: live.filter(r => r.attempts > 0).reduce((n, r) => n + r.errors, 0),
      retries: live.reduce((n, r) => n + Math.max(0, r.attempts - 1), 0), cacheHits: real.filter(r => r.mode === 'replay' && r.status === 'success').length,
      inputTokens, outputTokens, tokens: inputTokens === null || outputTokens === null ? null : inputTokens + outputTokens, cost };
  }
}

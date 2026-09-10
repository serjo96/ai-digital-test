export interface AiRequest {
  model: string;
  instructions: string;
  input: unknown;
  schema: Record<string, unknown>;
  schemaName: string;
  parameters: { reasoning?: 'low' | 'medium' | 'high'; maxOutputTokens: number; temperature?: number; seed?: number; context?: number; topK?: number; topP?: number; repeatPenalty?: number; keepAlive?: string; thinking?: boolean };
  identity?: { digest: string; serverVersion: string };
}
export interface AiResponse {
  status: 'completed' | 'refused' | 'incomplete' | 'invalid';
  data: unknown;
  model: string;
  requestId: string | null;
  raw?: string | undefined;
  jsonParsed?: boolean | undefined;
  timings?: { totalMs: number | null; loadMs: number | null; promptMs: number | null; generationMs: number | null } | undefined;
  usage: { inputTokens: number; outputTokens: number; cachedInputTokens: number | null; cacheWriteTokens: number | null } | null;
}
export interface AiProvider {
  readonly id: string;
  /** Non-secret endpoint identity, used to isolate caches. */
  readonly endpoint: string;
  readonly kind: 'real' | 'test';
  /** Local-only capability/credential check; must never perform I/O to a provider. */
  validateConfiguration?(request: AiRequest): void;
  /** Pure decoding of saved raw output; never performs network I/O. */
  replayResponse?(response: AiResponse): AiResponse;
  generate(request: AiRequest, signal: AbortSignal): Promise<AiResponse>;
}
export type ErrorKind = 'auth' | 'rate_limit' | 'server' | 'network' | 'timeout' | 'invalid_response' | 'configuration' | 'cache';
export class AiError extends Error {
  constructor(readonly kind: ErrorKind, readonly retryable = false, readonly rawBody?: string) {
    // Never include provider response bodies, request headers, or SDK error messages.
    super(`AI ${kind}`);
  }
}
export const AI_PROVIDERS = Symbol('AI_PROVIDERS');
export type ProviderFactory = () => AiProvider;
export class ProviderRegistry {
  constructor(private readonly factories: ReadonlyMap<string, ProviderFactory>) {}
  get(id: string): AiProvider {
    const factory = this.factories.get(id);
    if (!factory) throw new AiError('configuration');
    const provider = factory();
    if (provider.id !== id) throw new AiError('configuration');
    return provider;
  }
}

export interface AiCallRecord {
  key: string;
  role: 'extraction' | 'matching' | 'generation' | 'verification' | 'repair' | 'controlled_verification';
  rowIds: string[];
  provider: string;
  endpoint: string;
  model: string;
  mode: 'live' | 'replay';
  origin: 'real' | 'test';
  attempts: number;
  errors: number;
  elapsedMs: number;
  status: 'success' | 'error';
  error: string | null;
  response: AiResponse | null;
  diagnostics?: Record<string, { checked: boolean; passed: boolean; reason: string | null }>;
  attemptsLog?: { raw?: string | undefined; elapsedMs: number; error: string | null; response: AiResponse | null }[];
  attemptUsage: AiResponse['usage'][];
}
export interface AiSummary {
  calls: number;
  errors: number;
  retries: number;
  cacheHits: number;
  tokens: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  cost: number | null;
}

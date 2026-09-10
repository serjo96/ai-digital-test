import { AiError, type AiProvider, type AiRequest, type AiResponse } from './contracts.js';

/** Native transport only. All domain validation and retry policy belong to the shared runtime. */
export class OllamaAdapter implements AiProvider {
  readonly id = 'ollama';
  readonly kind: 'real' | 'test';
  constructor(private readonly transport: typeof fetch = fetch, readonly endpoint = 'http://127.0.0.1:11434', kind: 'real' | 'test' = 'real') { this.kind = kind; }

  replayResponse(response: AiResponse): AiResponse {
    return response.raw === undefined ? response : decodeOllama(response.raw, response.model);
  }

  async generate(request: AiRequest, signal: AbortSignal): Promise<AiResponse> {
    const p = request.parameters;
    let response: Response;
    try {
      response = await this.transport(`${this.endpoint}/api/chat`, { method: 'POST', signal,
        headers: { 'content-type': 'application/json' }, body: JSON.stringify({
          model: request.model, stream: false, format: request.schema,
          messages: [{ role: 'system', content: request.instructions }, { role: 'user', content: JSON.stringify(request.input) }],
          ...(p.thinking !== undefined ? { think: p.thinking } : {}), ...(p.keepAlive ? { keep_alive: p.keepAlive } : {}),
          options: { temperature: p.temperature, seed: p.seed, num_ctx: p.context, num_predict: p.maxOutputTokens,
            top_k: p.topK, top_p: p.topP, repeat_penalty: p.repeatPenalty },
        }) });
    } catch { throw new AiError(signal.aborted ? 'timeout' : 'network', true); }
    if (!response.ok) throw new AiError(response.status === 429 ? 'rate_limit' : response.status >= 500 ? 'server' : 'configuration', response.status === 429 || response.status >= 500, await response.text());
    let raw: string;
    try { raw = await response.text(); } catch { throw new AiError(signal.aborted ? 'timeout' : 'network', true); }
    return decodeOllama(raw, request.model);
  }
}

/** Pure envelope/content parsing shared by live and offline replay. */
export function decodeOllama(raw: string, model: string): AiResponse {
    const invalid: AiResponse = { status: 'invalid', jsonParsed: false, raw, data: null, model: model, requestId: null, usage: null };
    let body;
    try { body = JSON.parse(raw); } catch { return invalid; }
    if (typeof body !== 'object' || body === null || typeof body.message?.content !== 'string') return invalid;
    let data: unknown = body.message.content;
    let status: AiResponse['status'] = body.done === true && body.done_reason !== 'length' ? 'completed' : 'incomplete';
    let jsonParsed = true;
    try { data = JSON.parse(body.message.content); } catch { jsonParsed = false; if (status === 'completed') status = 'invalid'; }
    const count = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;
    const ms = (value: unknown) => typeof value === 'number' && value >= 0 ? value / 1e6 : null;
    return { status, raw, data, jsonParsed, model: typeof body.model === 'string' ? body.model : model, requestId: null,
      usage: count(body.prompt_eval_count) && count(body.eval_count) ? { inputTokens: body.prompt_eval_count, outputTokens: body.eval_count,
        cachedInputTokens: count(body.prompt_eval_cached_count) ? body.prompt_eval_cached_count : null, cacheWriteTokens: null } : null,
      timings: { totalMs: ms(body.total_duration), loadMs: ms(body.load_duration), promptMs: ms(body.prompt_eval_duration), generationMs: ms(body.eval_duration) } };
}

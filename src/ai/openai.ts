import OpenAI from 'openai';
import { AiError, type AiProvider, type AiRequest, type AiResponse } from './contracts.js';

export class OpenAiAdapter implements AiProvider {
  readonly id = 'openai';
  readonly kind = 'real' as const;
  private client: OpenAI | undefined;
  constructor(
    private readonly transport: typeof fetch | undefined = undefined,
    private readonly key: string | undefined = undefined,
    readonly endpoint = 'https://api.openai.com/v1',
  ) {}

  validateConfiguration(_request: AiRequest): void {
    if (!this.apiKey()) throw new AiError('auth');
  }

  private apiKey(): string | undefined {
    return this.key ?? process.env.OPENAI_API_KEY;
  }

  replayResponse(response: AiResponse): AiResponse {
    if (response.raw === undefined || !['completed', 'invalid'].includes(response.status)) return response;
    try { return { ...response, status: 'completed', data: JSON.parse(response.raw) }; }
    catch { return { ...response, status: 'invalid', data: response.raw }; }
  }

  async generate(request: AiRequest, signal: AbortSignal): Promise<AiResponse> {
    this.validateConfiguration(request);
    const apiKey = this.apiKey();
    if (!apiKey) throw new AiError('auth');
    this.client ??= new OpenAI({ apiKey, baseURL: this.endpoint, maxRetries: 0,
      ...(this.transport ? { fetch: this.transport } : {}) });
    try {
      const response = await this.client.responses.create({
        model: request.model, instructions: request.instructions, input: JSON.stringify(request.input),
        ...(request.parameters.reasoning ? { reasoning: { effort: request.parameters.reasoning } } : {}), max_output_tokens: request.parameters.maxOutputTokens,
        text: { format: { type: 'json_schema', name: request.schemaName, strict: true, schema: request.schema } },
        store: false, tools: [], service_tier: 'default',
      }, { signal });
      const refused = response.output.some(item => item.type === 'message' && item.content.some(c => c.type === 'refusal'));
      let status: AiResponse['status'] = refused ? 'refused' : response.status === 'completed' ? 'completed' : 'incomplete';
      let data: unknown = null;
      if (status === 'completed') {
        try { data = JSON.parse(response.output_text); } catch { status = 'invalid'; data = response.output_text; }
      }
      return { status, data, raw: response.output_text, model: response.model, requestId: response.id,
        usage: response.usage ? { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens,
          cachedInputTokens: response.usage.input_tokens_details.cached_tokens,
          cacheWriteTokens: response.usage.input_tokens_details.cache_write_tokens ?? null } : null };
    } catch (error) {
      if (error instanceof AiError) throw error;
      if (signal.aborted) throw new AiError('timeout', true);
      if (error instanceof OpenAI.APIConnectionError) throw new AiError('network', true);
      if (error instanceof OpenAI.APIError) {
        if (error.status === 401 || error.status === 403) throw new AiError('auth');
        if (error.status === 429) throw new AiError('rate_limit', true);
        if ((error.status ?? 0) >= 500) throw new AiError('server', true);
        throw new AiError('configuration');
      }
      throw new AiError('invalid_response');
    }
  }
}

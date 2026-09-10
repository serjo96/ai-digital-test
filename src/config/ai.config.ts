import type { AiEnvConfig } from './types.js';

/** Local Ollama is the working development provider; OpenAI is next once the organizer key is in env. */
export const DEFAULT_AI_ENV: AiEnvConfig = {
  defaultProvider: 'ollama',
  ollamaBaseUrl: 'http://127.0.0.1:11434',
  openAiApiKey: null,
  openAiBaseUrl: 'https://api.openai.com/v1',
};

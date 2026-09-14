import { Module } from '@nestjs/common';
import { AI_PROVIDERS, ProviderRegistry, type AiProvider } from './contracts.js';
import { OllamaAdapter } from './ollama.js';
import { OpenAiAdapter } from './openai.js';
import { APP_CONFIG } from '../config/main.config.js';
import type { AppConfig } from '../config/types.js';

@Module({
  providers: [{
    provide: AI_PROVIDERS,
    inject: [APP_CONFIG],
    useFactory: (config: AppConfig) => new ProviderRegistry(new Map<string, () => AiProvider>([
      ['openai', () => new OpenAiAdapter(undefined, config.ai.openAiApiKey ?? undefined, config.ai.openAiBaseUrl)],
      ['ollama', () => new OllamaAdapter(fetch, config.ai.ollamaBaseUrl)],
    ])),
  }],
  exports: [AI_PROVIDERS],
})
export class AiModule {}

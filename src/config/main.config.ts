import { DEFAULT_AI_ENV } from './ai.config.js';
import { loadEnvObject } from './env.loader.js';
import { AppConfigSchema, NodeEnvSchema } from './schema.js';
import type { AppConfig, NodeEnv } from './types.js';

export const APP_CONFIG = Symbol('APP_CONFIG');

function blank(input: string | undefined): string | null {
  const value = input?.trim();
  return value ? value : null;
}

export function loadAppConfig(cwd = process.cwd(), proc: NodeJS.ProcessEnv = process.env): AppConfig {
  const env = loadEnvObject(cwd, proc);
  const nodeEnv = NodeEnvSchema.catch('development').parse(env.NODE_ENV) as NodeEnv;
  const parsed = AppConfigSchema.safeParse({
    nodeEnv,
    paths: {
      feed: env.FEED_PATH?.trim() || 'supplier_feed.json',
      taxonomy: env.TAXONOMY_PATH?.trim() || 'taxonomy.json',
      labels: env.LABELS_PATH?.trim() || 'eval/labels.json',
      reportsDir: env.REPORTS_DIR?.trim() || 'reports/local',
    },
    ai: {
      defaultProvider: env.AI_PROVIDER?.trim() || DEFAULT_AI_ENV.defaultProvider,
      ollamaBaseUrl: env.OLLAMA_BASE_URL?.trim() || DEFAULT_AI_ENV.ollamaBaseUrl,
      openAiApiKey: blank(env.OPENAI_API_KEY),
      openAiBaseUrl: env.OPENAI_BASE_URL?.trim() || DEFAULT_AI_ENV.openAiBaseUrl,
    },
  });
  if (!parsed.success) {
    const details = parsed.error.issues.map(issue => `- ${issue.path.join('.')}: ${issue.message}`).join('\n');
    throw new Error(`Config validation failed:\n${details}`);
  }
  return parsed.data;
}

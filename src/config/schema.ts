import { z } from 'zod';

export const NodeEnvSchema = z.enum(['development', 'production', 'test']);
export const AiProviderNameSchema = z.enum(['ollama', 'openai']);

export const AppConfigSchema = z.strictObject({
  nodeEnv: NodeEnvSchema,
  paths: z.strictObject({
    feed: z.string().min(1),
    taxonomy: z.string().min(1),
    labels: z.string().min(1),
    reportsDir: z.string().min(1),
  }),
  ai: z.strictObject({
    defaultProvider: AiProviderNameSchema,
    ollamaBaseUrl: z.string().url(),
    openAiApiKey: z.string().min(1).nullable(),
    openAiBaseUrl: z.string().url(),
  }),
});

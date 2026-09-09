import { readFile } from 'node:fs/promises';
import { z } from 'zod';

const role = z.strictObject({
  provider: z.string().min(1), model: z.string().min(1),
  reasoning: z.enum(['low', 'medium', 'high']), maxOutputTokens: z.number().int().min(256).max(16384),
});
export const ConfigSchema = z.strictObject({
  version: z.literal('B2-config-v1'),
  extraction: role,
  matching: role.extend({ enabled: z.boolean() }),
  timeoutMs: z.number().int().min(1).max(60000),
  maxRetries: z.number().int().min(0).max(2),
  prices: z.array(z.strictObject({ provider: z.string(), model: z.string(),
    inputPerMillion: z.number().nonnegative(), cachedInputPerMillion: z.number().nonnegative(), cacheWritePerMillion: z.number().nonnegative(), outputPerMillion: z.number().nonnegative(), maxInputTokens: z.number().int().positive(),
    source: z.string().url(), checkedAt: z.string(),
  })),
});
export type AiConfig = z.infer<typeof ConfigSchema>;
export type RoleConfig = AiConfig['extraction'];
export async function readAiConfig(path: string): Promise<AiConfig> {
  return ConfigSchema.parse(JSON.parse(await readFile(path, 'utf8')));
}

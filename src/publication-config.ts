import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { PriceSchema, RoleSchema } from './ai/config.js';

export const Stage4ConfigSchema = z.strictObject({
  version: z.literal('B3-config-v1'),
  generation: RoleSchema,
  verifier: RoleSchema,
  timeoutMs: z.number().int().min(1).max(120000),
  maxRetries: z.number().int().min(0).max(2),
  prices: z.array(PriceSchema),
});

export type Stage4Config = z.infer<typeof Stage4ConfigSchema>;

export async function readStage4Config(path: string): Promise<Stage4Config> {
  return Stage4ConfigSchema.parse(JSON.parse(await readFile(path, 'utf8')));
}

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'dotenv';
import type { NodeEnv } from './types.js';

function envFileByNodeEnv(nodeEnv: string | undefined): string {
  const value = (nodeEnv ?? 'development') as NodeEnv | string;
  if (value === 'production') return '.env.production';
  if (value === 'test') return '.env.test';
  return '.env.development';
}

/**
 * Loads env files without mutating process.env.
 * Precedence: `.env` < `.env.{NODE_ENV}` < process env.
 */
export function loadEnvObject(cwd = process.cwd(), proc: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const fileEnv: Record<string, string> = {};
  for (const name of ['.env', envFileByNodeEnv(proc.NODE_ENV)]) {
    const filePath = resolve(cwd, name);
    if (existsSync(filePath)) Object.assign(fileEnv, parse(readFileSync(filePath)));
  }
  const procEnv: Record<string, string> = {};
  for (const [key, value] of Object.entries(proc)) {
    if (typeof value === 'string') procEnv[key] = value;
  }
  return { ...fileEnv, ...procEnv };
}

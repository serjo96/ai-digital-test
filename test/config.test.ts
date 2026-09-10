import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadEnvObject } from '../src/config/env.loader.js';
import { loadAppConfig } from '../src/config/main.config.js';
import { OpenAiAdapter } from '../src/ai/openai.js';
import { AiError } from '../src/ai/contracts.js';
import { ConfigSchema } from '../src/ai/config.js';

const isolated = async (fn: (dir: string) => Promise<void>) => {
  const dir = await mkdtemp(join(tmpdir(), 'shelf-config-'));
  try { await fn(dir); } finally { await rm(dir, { recursive: true, force: true }); }
};

test('env files load below process env and do not require an OpenAI key', async () => isolated(async dir => {
  await writeFile(join(dir, '.env'), 'OPENAI_API_KEY=from-file\nFEED_PATH=from-file.json\nOLLAMA_BASE_URL=http://127.0.0.1:11434\n');
  const fromFile = loadAppConfig(dir, { NODE_ENV: 'development' });
  assert.equal(fromFile.ai.openAiApiKey, 'from-file');
  assert.equal(fromFile.paths.feed, 'from-file.json');
  assert.equal(fromFile.ai.defaultProvider, 'ollama');
  const fromShell = loadAppConfig(dir, { NODE_ENV: 'development', OPENAI_API_KEY: 'from-shell', FEED_PATH: 'from-shell.json' });
  assert.equal(fromShell.ai.openAiApiKey, 'from-shell');
  assert.equal(fromShell.paths.feed, 'from-shell.json');
  const empty = loadAppConfig(dir, { NODE_ENV: 'development', OPENAI_API_KEY: '' });
  assert.equal(empty.ai.openAiApiKey, null);
}));

test('NODE_ENV overlay overrides .env and invalid provider fails closed', async () => isolated(async dir => {
  await writeFile(join(dir, '.env'), 'AI_PROVIDER=ollama\nOLLAMA_BASE_URL=http://127.0.0.1:11434\nOPENAI_API_KEY=base-key\n');
  await writeFile(join(dir, '.env.development'), 'AI_PROVIDER=openai\nOPENAI_API_KEY=dev-key\n');
  const env = loadEnvObject(dir, { NODE_ENV: 'development' });
  assert.equal(env.AI_PROVIDER, 'openai');
  assert.equal(env.OPENAI_API_KEY, 'dev-key');
  const config = loadAppConfig(dir, { NODE_ENV: 'development' });
  assert.equal(config.ai.defaultProvider, 'openai');
  assert.equal(config.ai.openAiApiKey, 'dev-key');
  await writeFile(join(dir, '.env'), 'AI_PROVIDER=telegram\n');
  await writeFile(join(dir, '.env.development'), 'AI_PROVIDER=telegram\n');
  assert.throws(() => loadAppConfig(dir, { NODE_ENV: 'development' }), /Config validation failed/);
}));

test('OpenAI adapter uses injected env key and pipeline JSON never stores secrets', () => {
  const adapter = new OpenAiAdapter(undefined, 'injected-from-env');
  adapter.validateConfiguration({ model: 'gpt-5.6-sol', schemaName: 't', schema: {}, input: {}, instructions: '', parameters: { maxOutputTokens: 256 } });
  assert.throws(() => new OpenAiAdapter(undefined, '').validateConfiguration({ model: 'x', schemaName: 't', schema: {}, input: {}, instructions: '', parameters: { maxOutputTokens: 256 } }), error => {
    assert.ok(error instanceof AiError); assert.equal(error.kind, 'auth'); return true;
  });
  const parsed = ConfigSchema.parse({
    version: 'B2-config-v1',
    extraction: { provider: 'openai', model: 'gpt-5.6-sol', maxOutputTokens: 4096 },
    matching: { enabled: false, provider: 'openai', model: 'gpt-6-astra', maxOutputTokens: 4096 },
    timeoutMs: 60000, maxRetries: 2, prices: [],
  });
  assert.equal('openAiApiKey' in parsed, false);
});

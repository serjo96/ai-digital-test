import { access, link, mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { readRun as readValidatedRun } from '../benchmark.js';

async function writeAtomicExclusive(path: string, value: string): Promise<void> {
  const temporary = join(dirname(path), `.${basename(path)}.${process.pid}.${crypto.randomUUID()}.tmp`);
  await writeFile(temporary, value, { flag: 'wx' });
  try { await link(temporary, path); }
  catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
  await unlink(temporary);
}

export const writeJsonExclusive = (path: string, value: unknown): Promise<void> =>
  writeAtomicExclusive(path, `${JSON.stringify(value, null, 2)}\n`);

export class RunStoreService {
  async reserve(root: string, id: string): Promise<string> {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id)) {
      throw new Error('run ID must contain only letters, digits, dots, underscores and hyphens');
    }
    await mkdir(root, { recursive: true });
    const directory = join(root, id);
    await mkdir(directory);
    return directory;
  }

  readText(path: string): Promise<string> {
    return readFile(path, 'utf8');
  }

  readRun(directory: string) {
    return readValidatedRun(directory);
  }

  async resolveRunDirectory(root: string, value: string): Promise<string> {
    const candidates = isAbsolute(value) || value.includes('/') ? [resolve(value)] : [resolve(value), join(root, value)];
    for (const candidate of candidates) {
      try { await access(join(candidate, 'report.json')); return candidate; } catch { /* try next */ }
    }
    throw new Error(`run not found: ${value}`);
  }

  saveJson(path: string, value: unknown): Promise<void> {
    return writeJsonExclusive(path, value);
  }

  writeTextExclusive(path: string, value: string): Promise<void> {
    return writeAtomicExclusive(path, value);
  }
}

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readRun as readValidatedRun } from '../benchmark.js';

export const writeJsonExclusive = (path: string, value: unknown): Promise<void> =>
  writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });

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

  saveJson(path: string, value: unknown): Promise<void> {
    return writeJsonExclusive(path, value);
  }

  writeTextExclusive(path: string, value: string): Promise<void> {
    return writeFile(path, value, { flag: 'wx' });
  }
}

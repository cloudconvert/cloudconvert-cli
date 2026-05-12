import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { vi } from 'vitest';

import type { CliDependencies } from '../src/app.js';
import type { CloudConvertClient, Job } from '../src/types.js';

export async function createTempFiles(names: string[]): Promise<{ dir: string; files: string[]; cleanup: () => Promise<void> }> {
  const dir = await mkdtemp(join(tmpdir(), 'cloudconvert-cli-'));
  const files: string[] = [];

  for (const name of names) {
    const file = join(dir, name);
    await writeFile(file, 'fixture');
    files.push(file);
  }

  return {
    dir,
    files,
    cleanup: () => rm(dir, { recursive: true, force: true })
  };
}

export function createFakeJob(): Job {
  return {
    id: 'job-id',
    tasks: []
  };
}

export function createFakeCloudConvertClient(credits = 42): CloudConvertClient {
  return {
    call: vi.fn(),
    jobs: {
      create: vi.fn(),
      get: vi.fn(),
      subscribeEvent: vi.fn(),
      subscribeTaskEvent: vi.fn()
    },
    tasks: {
      upload: vi.fn()
    },
    users: {
      me: vi.fn(async () => ({ credits }))
    },
    closeSocket: vi.fn()
  };
}

export function createSilentLogger(): CliDependencies['logger'] {
  return {
    info: vi.fn(),
    error: vi.fn()
  };
}

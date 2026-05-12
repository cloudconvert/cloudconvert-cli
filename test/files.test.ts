import { afterEach, describe, expect, it } from 'vitest';

import { expandFilePatterns } from '../src/files.js';
import { createTempFiles } from './helpers.js';

describe('file expansion', () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    await Promise.all(cleanups.splice(0).map(cleanup => cleanup()));
  });

  it('returns undefined when a command has no file positional', () => {
    expect(expandFilePatterns(undefined)).toBeUndefined();
  });

  it('expands globbed file arguments and excludes missing patterns', async () => {
    const { dir, files, cleanup } = await createTempFiles(['one.pdf', 'two.pdf']);
    cleanups.push(cleanup);

    expect(expandFilePatterns([`${dir}/*.pdf`, `${dir}/missing.*`])?.sort()).toEqual(files.sort());
  });
});

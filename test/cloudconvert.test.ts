import { afterEach, describe, expect, it, vi } from 'vitest';

import { createCloudConvertClient, getSocketUrl, normalizeApiUrl } from '../src/cloudconvert.js';

describe('CloudConvert client', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('adds the API version to an API URL without path', () => {
    expect(normalizeApiUrl('https://api.cloudconvert.localhost')).toBe('https://api.cloudconvert.localhost/v2/');
    expect(normalizeApiUrl('https://api.cloudconvert.localhost/v2')).toBe('https://api.cloudconvert.localhost/v2/');
    expect(normalizeApiUrl('http://localhost:8089/v2/')).toBe('http://localhost:8089/v2/');
  });

  it('expects the socket on the socketio host of the API', () => {
    expect(getSocketUrl('https://api.cloudconvert.localhost/v2/')).toBe('https://socketio.cloudconvert.localhost');
    expect(getSocketUrl('http://localhost:8089/v2/')).toBe('http://localhost:8089');
  });

  it('sends API calls to the custom API URL', async () => {
    const fetchMock = vi.fn(async () => Response.json({ data: { credits: 42 } }));
    vi.stubGlobal('fetch', fetchMock);

    const client = createCloudConvertClient('key', false, 'https://api.cloudconvert.localhost');
    await expect(client.users.me()).resolves.toEqual({ credits: 42 });

    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toBe('https://api.cloudconvert.localhost/v2/users/me');
  });
});

import CloudConvert from 'cloudconvert';
import { io, type Socket } from 'socket.io-client';

import type { CloudConvertClient } from './types.js';

export function createCloudConvertClient(apiKey: string, useSandbox: boolean, apiUrl?: string): CloudConvertClient {
  const client = apiUrl ? new CustomEndpointCloudConvert(apiKey, apiUrl) : new CloudConvert(apiKey, useSandbox);

  return client as unknown as CloudConvertClient;
}

/**
 * Sends the API calls to another endpoint, such as a local development server. The socket is
 * expected on the host with "socketio." instead of "api.", as with api.cloudconvert.com.
 */
class CustomEndpointCloudConvert extends CloudConvert {
  private readonly baseUrl: string;
  private readonly socketUrl: string;

  constructor(apiKey: string, apiUrl: string) {
    super(apiKey);
    this.baseUrl = normalizeApiUrl(apiUrl);
    this.socketUrl = getSocketUrl(this.baseUrl);
  }

  override async call(...[method, route, parameters, options]: Parameters<CloudConvert['call']>): Promise<any> {
    return await this.callWithBase(this.baseUrl, method, route, parameters, options);
  }

  override subscribe(...args: Parameters<CloudConvert['subscribe']>): void {
    // The SDK connects to the socket of api.cloudconvert.com, unless it is connected already
    const state = this as unknown as { socket?: Socket; subscribedChannels?: Map<string, boolean> };

    if (!state.socket) {
      state.socket = io(this.socketUrl, { transports: ['websocket'] });
      state.subscribedChannels = new Map();
    }

    super.subscribe(...args);
  }
}

export function normalizeApiUrl(apiUrl: string): string {
  const url = new URL(apiUrl);

  if (url.pathname === '/') {
    url.pathname = '/v2/';
  } else if (!url.pathname.endsWith('/')) {
    url.pathname += '/';
  }

  return url.toString();
}

export function getSocketUrl(apiUrl: string): string {
  const url = new URL(apiUrl);

  if (url.hostname.startsWith('api.')) {
    url.hostname = `socketio.${url.hostname.slice('api.'.length)}`;
  }

  return url.origin;
}

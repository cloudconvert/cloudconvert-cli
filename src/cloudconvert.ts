import CloudConvert from 'cloudconvert';

import type { CloudConvertClient } from './types.js';

export function createCloudConvertClient(apiKey: string, useSandbox: boolean): CloudConvertClient {
  return new CloudConvert(apiKey, useSandbox) as unknown as CloudConvertClient;
}

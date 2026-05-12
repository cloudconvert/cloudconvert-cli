import type { CloudConvertClient, CloudConvertOperation, CloudConvertOperationOption } from './types.js';

export interface OperationFilters {
  operation: string;
  inputFormat?: string;
  outputFormat?: string;
  engine?: string;
  engineVersion?: string;
  alternatives?: boolean;
}

export async function fetchOperations(
  cloudconvert: CloudConvertClient,
  filters: OperationFilters
): Promise<CloudConvertOperation[]> {
  const response = (await cloudconvert.call('GET', 'operations', {
    'filter[operation]': filters.operation,
    ...(filters.inputFormat ? { 'filter[input_format]': filters.inputFormat } : {}),
    ...(filters.outputFormat ? { 'filter[output_format]': filters.outputFormat } : {}),
    ...(filters.engine ? { 'filter[engine]': filters.engine } : {}),
    ...(filters.engineVersion ? { 'filter[engine_version]': filters.engineVersion } : {}),
    ...(filters.alternatives ? { alternatives: true } : {}),
    include: 'options'
  })) as { data?: CloudConvertOperation[] } | CloudConvertOperation[] | undefined;

  return Array.isArray(response) ? response : (response?.data ?? []);
}

export function collectOperationOptions(operations: CloudConvertOperation[]): Map<string, CloudConvertOperationOption> {
  const parameterOptions = new Map<string, CloudConvertOperationOption>();

  for (const operation of operations) {
    for (const option of operation.options ?? []) {
      parameterOptions.set(option.name, option);
    }
  }

  return parameterOptions;
}

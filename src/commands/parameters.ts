import type { CommandModule } from 'yargs';

import type { CliArguments, CloudConvertOperation } from '../types.js';
import { fetchOperations as fetchCloudConvertOperations } from '../operations.js';

interface ParametersArguments extends CliArguments {
  operation: string;
  inputFormat?: string;
  outputFormat?: string;
  engine?: string;
  engineVersion?: string;
  alternatives?: boolean;
  json?: boolean;
}

export function createParametersCommand(): CommandModule<object, object> {
  return {
    command: 'parameters <operation>',
    aliases: ['params'],
    describe: 'List available task parameters for an operation',
    builder: yargs =>
      yargs
        .positional('operation', {
          description: 'Operation to inspect, for example: convert, optimize, thumbnail, watermark or capture-website',
          type: 'string'
        })
        .option('input-format', {
          describe: 'Filter by input format',
          type: 'string'
        })
        .option('output-format', {
          alias: ['format', 'f'],
          describe: 'Filter by output format',
          type: 'string'
        })
        .option('engine', {
          describe: 'Filter by engine',
          type: 'string'
        })
        .option('engine-version', {
          describe: 'Filter by engine version',
          type: 'string'
        })
        .option('alternatives', {
          describe: 'Include alternative engines',
          type: 'boolean',
          default: false
        })
        .option('json', {
          describe: 'Print raw operation metadata as JSON',
          type: 'boolean',
          default: false
        })
        .example('cloudconvert parameters convert --input-format pdf --output-format jpg', '')
        .example('cloudconvert parameters optimize --input-format pdf', '')
        .example('cloudconvert parameters thumbnail --input-format pdf -f png', '')
        .hide('version')
        .hide('outputdir')
        .hide('overwrite')
        .hide('parameter'),
    handler: async rawArgv => {
      const argv = rawArgv as unknown as ParametersArguments;
      const operations = await fetchParameterCommandOperations(argv);

      if (argv.json) {
        console.log(JSON.stringify(operations, null, 2));
        return;
      }

      console.log(formatOperations(operations, argv));
    }
  };
}

async function fetchParameterCommandOperations(argv: ParametersArguments): Promise<CloudConvertOperation[]> {
  return fetchCloudConvertOperations(argv.cloudconvert, {
    operation: argv.operation,
    inputFormat: argv.inputFormat,
    outputFormat: argv.outputFormat,
    engine: argv.engine,
    engineVersion: argv.engineVersion,
    alternatives: argv.alternatives
  });
}

function formatOperations(operations: CloudConvertOperation[], argv: ParametersArguments): string {
  if (operations.length === 0) {
    return `No parameters found for ${formatFilterSummary(argv)}.`;
  }

  const lines = [`Available parameters for ${formatFilterSummary(argv)}:`];

  for (const operation of operations) {
    lines.push('');
    lines.push(formatOperationHeading(operation));

    if ((operation.options ?? []).length === 0) {
      lines.push('  No task parameters available.');
      continue;
    }

    for (const option of operation.options ?? []) {
      lines.push(`  ${formatOption(option)}`);
    }
  }

  return lines.join('\n');
}

function formatFilterSummary(argv: ParametersArguments): string {
  const parts = [argv.operation];

  if (argv.inputFormat && argv.outputFormat) {
    parts.push(`${argv.inputFormat} -> ${argv.outputFormat}`);
  } else if (argv.inputFormat) {
    parts.push(`input ${argv.inputFormat}`);
  } else if (argv.outputFormat) {
    parts.push(`output ${argv.outputFormat}`);
  }

  if (argv.engine) {
    parts.push(`engine ${argv.engine}`);
  }

  if (argv.engineVersion) {
    parts.push(`engine version ${argv.engineVersion}`);
  }

  return parts.join(' ');
}

function formatOperationHeading(operation: CloudConvertOperation): string {
  const formats =
    operation.input_format && operation.output_format
      ? `${operation.input_format} -> ${operation.output_format}`
      : operation.input_format ?? operation.output_format ?? 'all formats';
  const engine = operation.engine ? ` (${operation.engine})` : '';

  return `${operation.operation} ${formats}${engine}`;
}

function formatOption(option: NonNullable<CloudConvertOperation['options']>[number]): string {
  const details = [option.type];

  if (option.default !== undefined) {
    details.push(`default: ${String(option.default)}`);
  }

  if ((option.possible_values ?? []).length > 0) {
    details.push(`values: ${option.possible_values?.map(String).join(', ')}`);
  }

  return [`--${option.name}`, details.join(' | '), option.description?.trim()].filter(Boolean).join('  ');
}

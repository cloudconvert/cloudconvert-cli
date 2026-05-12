import type { Argv, CommandModule } from 'yargs';

import type { CliArguments, TaskData } from '../types.js';
import { addTaskParameterMiddleware, collectTaskParameters } from './task-parameters.js';
import type { JobRunner } from './types.js';

interface FileJobCommandDefinition {
  command: string;
  describe: string;
  fileDescription: string;
  operation: string;
  minFiles?: number;
  format?: {
    alias?: string;
    describe: string;
    default?: string;
    required?: boolean;
  };
  examples: string[];
}

export function createFileJobCommand(
  definition: FileJobCommandDefinition,
  runJob: JobRunner
): CommandModule<object, object> {
  return {
    command: definition.command,
    describe: definition.describe,
    builder: yargs => buildFileJobOptions(yargs, definition),
    handler: async rawArgv => {
      const argv = rawArgv as unknown as CliArguments;
      const minFiles = definition.minFiles ?? 1;

      if ((argv.files ?? []).length < minFiles) {
        throw new Error(`You need to provide at least ${minFiles === 1 ? 'one file' : 'two files'}!`);
      }

      await runJob(argv, createTaskData(definition, argv));
    }
  };
}

function buildFileJobOptions(argv: Argv<object>, definition: FileJobCommandDefinition): Argv<object> {
  let builder = argv.positional('files', {
    description: definition.fileDescription
  });

  if (definition.format) {
    builder = builder.option('output-format', {
      alias: [definition.format.alias, 'format'].filter(alias => alias !== undefined),
      describe: definition.format.describe,
      default: definition.format.default,
      required: definition.format.required
    });
  }

  for (const example of definition.examples) {
    builder = builder.example(example, '');
  }

  return addTaskParameterMiddleware(builder)
    .help()
    .hide('version')
    .epilogue(`Find possible task parameters with: cloudconvert parameters ${definition.operation}`);
}

function createTaskData(definition: FileJobCommandDefinition, argv: CliArguments): TaskData {
  return {
    operation: definition.operation,
    ...(definition.format ? { output_format: argv.format as string } : {}),
    ...collectTaskParameters(argv)
  };
}

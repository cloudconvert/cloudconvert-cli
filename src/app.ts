import logSymbols from 'log-symbols';
import ora from 'ora';
import yargs from 'yargs/yargs';
import type { Argv } from 'yargs';

import { createCaptureWebsiteCommand } from './commands/capture-website.js';
import { createCommandCommand } from './commands/command.js';
import { createConvertCommand } from './commands/convert.js';
import { createMergeCommand } from './commands/merge.js';
import { createCreditsCommand } from './commands/minutes.js';
import { createOptimizeCommand } from './commands/optimize.js';
import { createParametersCommand } from './commands/parameters.js';
import { createPdfCommands } from './commands/pdf.js';
import { createThumbnailCommand } from './commands/thumbnail.js';
import { createWatermarkCommand } from './commands/watermark.js';
import type { JobRunner } from './commands/types.js';
import { createCloudConvertClient } from './cloudconvert.js';
import { expandFilePatterns } from './files.js';
import { runJob } from './job.js';
import type { CliArguments, CloudConvertClient, Logger, TaskData } from './types.js';

export interface CliDependencies {
  createClient: (apiKey: string, useSandbox: boolean) => CloudConvertClient;
  runJob: JobRunner;
  logger: Logger;
  exitProcess: boolean;
}

export function createCli(args: string[], partialDependencies: Partial<CliDependencies> = {}): Argv {
  const logger = partialDependencies.logger ?? createConsoleLogger();
  const dependencies: CliDependencies = {
    createClient: partialDependencies.createClient ?? createCloudConvertClient,
    runJob:
      partialDependencies.runJob ??
      ((argv: CliArguments, taskData: TaskData) =>
        runJob(argv, taskData, {
          spinner: ora('Creating job').start(),
          logger
        })),
    logger,
    exitProcess: partialDependencies.exitProcess ?? true
  };

  const cli = yargs(args)
    .scriptName('cloudconvert')
    .command(createConvertCommand(dependencies.runJob))
    .command(createOptimizeCommand(dependencies.runJob))
    .command(createMergeCommand(dependencies.runJob))
    .command(createCaptureWebsiteCommand(dependencies.runJob))
    .command(createThumbnailCommand(dependencies.runJob))
    .command(createWatermarkCommand(dependencies.runJob))
    .command(createCommandCommand(dependencies.runJob))
    .demandCommand()
    .option('api-key', {
      alias: 'apikey',
      describe: 'Set the API key. You can get your API key here: https://cloudconvert.com/dashboard/api/v2/keys',
      type: 'string',
      default: process.env.CLOUDCONVERT_API_KEY,
      defaultDescription: 'CLOUDCONVERT_API_KEY environment variable',
      demandOption: true,
      global: true
    })
    .option('sandbox', {
      describe: 'Use the CloudConvert Sandbox API',
      type: 'boolean',
      default: false,
      global: true
    })
    .option('output-dir', {
      alias: 'outputdir',
      describe: 'Set the directory for storing the output files. defaults to the working directory',
      type: 'string',
      global: true
    })
    .option('overwrite', {
      describe: 'Allow overwriting existing files',
      type: 'boolean',
      default: false,
      global: true
    })
    .option('parameter', {
      alias: 'p',
      describe:
        'Send custom parameters with the task payload. Prefer dynamic options such as --engine=office; -p.engine=office is kept for compatibility',
      global: true
    })
    .middleware(argv => {
      normalizeAliases(argv as unknown as CliArguments);

      Object.defineProperty(argv, 'cloudconvert', {
        value: dependencies.createClient(String(argv.apikey), Boolean(argv.sandbox)),
        enumerable: false,
        configurable: true
      });
    })
    .middleware(argv => {
      const cliArguments = argv as unknown as CliArguments;
      cliArguments.files = expandFilePatterns(cliArguments.files);
    })
    .fail((message, err, yargsInstance) => {
      let output = message ?? '';

      if (err) {
        output = `Error: ${err.message}`;
        const apiError = getApiError(err);

        if (apiError?.message) {
          output = `API Error: ${apiError.message} (Code: ${apiError.code ?? 'UNKNOWN_ERROR'})`;
        }
      } else {
        console.log(yargsInstance.help());
      }

      console.error(`\n${logSymbols.error} ${output}`);

      if (dependencies.exitProcess) {
        process.exit(1);
      }

      throw err ?? new Error(output);
    })
    .help()
    .detectLocale(false)
    .epilogue('For more information, find our manual at https://github.com/cloudconvert/cloudconvert-cli')
    .exitProcess(dependencies.exitProcess);

  for (const command of createPdfCommands(dependencies.runJob)) {
    cli.command(command);
  }

  return cli.command(createCreditsCommand()).command(createParametersCommand());
}

export async function runCli(args: string[]): Promise<void> {
  await createCli(args).parseAsync();
}

function createConsoleLogger(): Logger {
  return {
    info: message => console.log(logSymbols.info, message),
    error: message => console.error(`\n${logSymbols.error} ${message}`)
  };
}

function normalizeAliases(argv: CliArguments): void {
  const aliases = argv as CliArguments & {
    apiKey?: string;
    outputDir?: string;
    outputFormat?: string;
  };

  argv.apikey = aliases.apiKey ?? argv.apikey;
  argv.outputdir = aliases.outputDir ?? argv.outputdir;
  argv.format = aliases.outputFormat ?? argv.format;
}

function getApiError(error: Error): { message?: string; code?: string } | undefined {
  const maybeResponse = error as Error & {
    response?: {
      data?: {
        message?: string;
        code?: string;
      };
    };
  };

  return maybeResponse.response?.data;
}

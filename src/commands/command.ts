import type { Argv, CommandModule } from 'yargs';

import type { CliArguments } from '../types.js';
import { addTaskParameterMiddleware, collectTaskParameters } from './task-parameters.js';
import type { JobRunner } from './types.js';

interface CommandOperationArguments extends CliArguments {
  engine: string;
  command: string;
  arguments: string;
  captureOutput: boolean;
}

export function createCommandCommand(runJob: JobRunner): CommandModule<object, object> {
  return {
    command: 'command <files..>',
    describe: 'Execute custom ffmpeg, imagemagick, or graphicsmagick commands',
    builder: yargs => buildCommandOptions(yargs),
    handler: async rawArgv => {
      const argv = rawArgv as unknown as CommandOperationArguments;

      if ((argv.files ?? []).length < 1) {
        throw new Error('You need to provide at least one file!');
      }

      await runJob(argv, {
        operation: 'command',
        engine: argv.engine,
        command: argv.command,
        arguments: argv.arguments,
        capture_output: argv.captureOutput,
        ...collectTaskParameters(argv)
      });
    }
  };
}

function buildCommandOptions(argv: Argv<object>): Argv<object> {
  return addTaskParameterMiddleware(
    argv
      .positional('files', {
        description: 'Path(s) to file(s) to make available under /input/'
      })
      .option('engine', {
        choices: ['ffmpeg', 'imagemagick', 'graphicsmagick'] as const,
        describe: 'Set the command execution engine',
        demandOption: true
      })
      .option('command', {
        describe: 'Set the executable command, such as ffmpeg',
        type: 'string',
        demandOption: true
      })
      .option('arguments', {
        describe: 'Set the command arguments. Use /input/upload-0/ and /output/ paths',
        type: 'string',
        demandOption: true
      })
      .option('capture-output', {
        describe: 'Capture and print command output',
        type: 'boolean',
        default: true
      })
      .example(
        'cloudconvert command --engine=ffmpeg --command=ffmpeg --arguments="-i /input/upload-0/input.mp4 -vcodec libx264 -acodec copy /output/output.mp4" input.mp4',
        ''
      )
      .example(
        'cloudconvert command --engine=imagemagick --command=convert --arguments="/input/upload-0/input.png -resize 50% /output/output.png" input.png',
        ''
      )
  )
    .help()
    .hide('version')
    .epilogue('Find possible task parameters with: cloudconvert parameters command');
}

import type { CommandModule } from 'yargs';

import type { CliArguments } from '../types.js';
import { addTaskParameterMiddleware, collectTaskParameters } from './task-parameters.js';
import type { JobRunner } from './types.js';

export function createCaptureWebsiteCommand(runJob: JobRunner): CommandModule<object, object> {
  return {
    command: 'capture-website <url>',
    describe: 'Capture a website as PDF, PNG or JPG',
    builder: yargs =>
      addTaskParameterMiddleware(
        yargs
          .positional('url', {
            description: 'URL of the website'
          })
          .option('output-format', {
            alias: ['f', 'format'],
            describe: 'Set the output format',
            default: 'pdf',
            required: true
          })
          .example('cloudconvert capture-website https://www.google.com', '')
          .example('cloudconvert capture-website -f png --screen_width=1000 https://www.google.com', '')
      )
        .help()
        .hide('version')
        .epilogue('Find possible task parameters with: cloudconvert parameters capture-website'),
    handler: async rawArgv => {
      const argv = rawArgv as unknown as CliArguments;
      await runJob(argv, {
        operation: 'capture-website',
        output_format: argv.format as string,
        url: argv.url as string,
        ...collectTaskParameters(argv)
      });
    }
  };
}

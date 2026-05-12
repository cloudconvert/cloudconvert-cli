import type { CommandModule } from 'yargs';

import { createFileJobCommand } from './file-job.js';
import type { JobRunner } from './types.js';

export function createConvertCommand(runJob: JobRunner): CommandModule<object, object> {
  return createFileJobCommand(
    {
      command: 'convert <files..>',
      describe: 'Convert files to an output format',
      fileDescription: 'Path(s) to file(s) to convert',
      operation: 'convert',
      format: {
        alias: 'f',
        describe: 'Set the output format',
        required: true
      },
      examples: [
        'cloudconvert convert -f png input.pdf',
        'cloudconvert convert --output-dir output/ -f png directory/*',
        'cloudconvert convert -f png --pages=1-1 --width=600 input.pdf'
      ]
    },
    runJob
  );
}

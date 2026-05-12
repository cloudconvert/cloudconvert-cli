import type { CommandModule } from 'yargs';

import { createFileJobCommand } from './file-job.js';
import type { JobRunner } from './types.js';

export function createThumbnailCommand(runJob: JobRunner): CommandModule<object, object> {
  return createFileJobCommand(
    {
      command: 'thumbnail <files..>',
      describe: 'Create thumbnails',
      fileDescription: 'Path(s) to file(s) to convert',
      operation: 'thumbnail',
      format: {
        alias: 'f',
        describe: 'Set the thumbnail format',
        default: 'png',
        required: true
      },
      examples: [
        'cloudconvert thumbnail input.pdf',
        'cloudconvert thumbnail -f jpg --output-dir output/ directory/*',
        'cloudconvert thumbnail -f jpg --width=200 --height=200 --fit=crop input.pdf'
      ]
    },
    runJob
  );
}

import type { CommandModule } from 'yargs';

import { createFileJobCommand } from './file-job.js';
import type { JobRunner } from './types.js';

export function createWatermarkCommand(runJob: JobRunner): CommandModule<object, object> {
  return createFileJobCommand(
    {
      command: 'watermark <files..>',
      describe: 'Add watermarks to files',
      fileDescription: 'Path(s) to file(s) to watermark',
      operation: 'watermark',
      examples: [
        'cloudconvert watermark --text="Draft" input.pdf',
        'cloudconvert watermark --image=watermark.png input.pdf'
      ]
    },
    runJob
  );
}

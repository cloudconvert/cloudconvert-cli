import type { CommandModule } from 'yargs';

import { createFileJobCommand } from './file-job.js';
import type { JobRunner } from './types.js';

export function createOptimizeCommand(runJob: JobRunner): CommandModule<object, object> {
  return createFileJobCommand(
    {
      command: 'optimize <files..>',
      describe: 'Optimize and compress files',
      fileDescription: 'Path(s) to file(s) to optimize',
      operation: 'optimize',
      examples: [
        'cloudconvert optimize input.pdf',
        'cloudconvert optimize --output-dir output/ -f png directory/*',
        'cloudconvert optimize --profile=print input.pdf'
      ]
    },
    runJob
  );
}

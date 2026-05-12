import type { CommandModule } from 'yargs';

import { createFileJobCommand } from './file-job.js';
import type { JobRunner } from './types.js';

export function createMergeCommand(runJob: JobRunner): CommandModule<object, object> {
  return createFileJobCommand(
    {
      command: 'merge <files..>',
      describe: 'Merge files to a single PDF',
      fileDescription: 'Paths to files to merge',
      operation: 'merge',
      minFiles: 2,
      format: {
        alias: 'f',
        describe: 'Set the output format',
        default: 'pdf',
        required: true
      },
      examples: ['cloudconvert merge file1.pdf file2.pdf', 'cloudconvert merge --output-dir output/ directory/*']
    },
    runJob
  );
}

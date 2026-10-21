import type { Argv, CommandModule } from 'yargs';

import type { CliArguments } from '../types.js';
import { addTaskParameterMiddleware, collectTaskParameters } from './task-parameters.js';
import type { JobRunner } from './types.js';

interface AgentArguments extends CliArguments {
  prompt: string;
  engine?: string;
}

export function createAgentCommand(runJob: JobRunner): CommandModule<object, object> {
  return {
    command: 'ai/agent [files..]',
    aliases: ['ai-agent', 'agent', 'ai'],
    describe: 'Let an AI agent process files as described in a prompt (beta)',
    builder: yargs => buildAgentOptions(yargs),
    handler: async rawArgv => {
      const argv = rawArgv as unknown as AgentArguments;

      // Files are optional, as the prompt can name the files to import, but not a mistyped path
      if ((argv.filePatterns ?? []).length > 0 && (argv.files ?? []).length < 1) {
        throw new Error(`No files found: ${(argv.filePatterns ?? []).join(', ')}`);
      }

      await runJob(argv, {
        operation: 'ai/agent',
        prompt: argv.prompt,
        ...(argv.engine ? { engine: argv.engine } : {}),
        ...collectTaskParameters(argv)
      });
    }
  };
}

function buildAgentOptions(argv: Argv<object>): Argv<object> {
  return addTaskParameterMiddleware(
    argv
      .positional('files', {
        description: 'Path(s) to file(s) the agent works on. Optional if the prompt names the files to import'
      })
      .option('prompt', {
        describe: 'Describe in plain language what should be done with the files',
        type: 'string',
        demandOption: true
      })
      .option('engine', {
        describe: 'Set the AI model. List the models with: cloudconvert parameters ai/agent --alternatives',
        type: 'string'
      })
      .example('cloudconvert ai/agent --prompt="Convert to PDF/A-2b." input.pdf', '')
      .example('cloudconvert ai/agent --prompt="Make this video smaller, at most 30 MB." input.mp4', '')
      .example('cloudconvert ai/agent --prompt="How many pages does this PDF have?" input.pdf', '')
      .example('cloudconvert ai/agent --prompt="Convert https://example.com/report.docx to PDF."', '')
  )
    .help()
    .hide('version')
    .epilogue('Find possible task parameters with: cloudconvert parameters ai/agent');
}

import type { Argv, CommandModule } from 'yargs';

import type { CliArguments } from '../types.js';
import { createFileJobCommand } from './file-job.js';
import { addTaskParameterMiddleware, collectTaskParameters } from './task-parameters.js';
import type { JobRunner } from './types.js';

interface TextToSpeechArguments extends CliArguments {
  text?: string;
}

export function createSpeechToTextCommand(runJob: JobRunner): CommandModule<object, object> {
  return {
    ...createFileJobCommand(
      {
        command: 'ai/stt <files..>',
        describe: 'Transcribe the speech of audio and video files (beta)',
        fileDescription: 'Path(s) to audio or video file(s) to transcribe',
        operation: 'ai/stt',
        format: {
          alias: 'f',
          describe: 'Format of the transcript: txt, srt, vtt or json. Defaults to txt'
        },
        examples: [
          'cloudconvert ai/stt input.mp3',
          'cloudconvert ai/stt -f srt --language=en input.mp4',
          'cloudconvert ai/stt -f vtt --translate input.mp4'
        ]
      },
      runJob
    ),
    aliases: ['ai-stt', 'stt']
  };
}

export function createRedactCommand(runJob: JobRunner): CommandModule<object, object> {
  return {
    ...createFileJobCommand(
      {
        command: 'ai/redact <files..>',
        describe: 'Remove personal data from PDF, TXT and MD files (beta)',
        fileDescription: 'Path(s) to PDF, TXT or MD file(s) to redact',
        operation: 'ai/redact',
        examples: [
          'cloudconvert ai/redact input.pdf',
          'cloudconvert ai/redact --preset=strict --replacement=mask input.txt',
          'cloudconvert ai/redact --ocr=true --ocr_language.0=eng --ocr_language.1=deu input.pdf'
        ]
      },
      runJob
    ),
    aliases: ['ai-redact', 'redact', 'pdf/redact', 'pdf-redact']
  };
}

export function createTextToSpeechCommand(runJob: JobRunner): CommandModule<object, object> {
  return {
    command: 'ai/tts [files..]',
    aliases: ['ai-tts', 'tts'],
    describe: 'Speak a text or text files to audio files (beta)',
    builder: yargs => buildTextToSpeechOptions(yargs),
    handler: async rawArgv => {
      const argv = rawArgv as unknown as TextToSpeechArguments;
      const hasText = argv.text !== undefined && argv.text !== '';

      if ((argv.filePatterns ?? []).length > 0 && (argv.files ?? []).length < 1) {
        throw new Error(`No files found: ${(argv.filePatterns ?? []).join(', ')}`);
      }

      if (hasText && (argv.files ?? []).length > 0) {
        throw new Error('Set either --text or text files, not both!');
      }

      if (!hasText && (argv.files ?? []).length < 1) {
        throw new Error('You need to provide --text or at least one text file!');
      }

      await runJob(argv, {
        operation: 'ai/tts',
        ...(hasText ? { text: argv.text } : {}),
        ...(argv.format ? { output_format: argv.format } : {}),
        ...collectTaskParameters(argv)
      });
    }
  };
}

function buildTextToSpeechOptions(argv: Argv<object>): Argv<object> {
  return addTaskParameterMiddleware(
    argv
      .positional('files', {
        description: 'Path(s) to UTF-8 text file(s) to speak, instead of --text'
      })
      .option('text', {
        describe: 'The text to speak, up to 10,000 characters',
        type: 'string'
      })
      .option('output-format', {
        alias: ['f', 'format'],
        describe: 'Format of the audio file: mp3, wav, flac or ogg. Defaults to mp3',
        type: 'string'
      })
      .example('cloudconvert ai/tts --text="Welcome to CloudConvert." --voice=ryan', '')
      .example('cloudconvert ai/tts -f wav --instruct="Calm and slow, like a bedtime story." story.txt', '')
  )
    .help()
    .hide('version')
    .epilogue('Find possible task parameters with: cloudconvert parameters ai/tts');
}

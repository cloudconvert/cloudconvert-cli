import type { CommandModule } from 'yargs';

import { createFileJobCommand } from './file-job.js';
import type { JobRunner } from './types.js';

interface PdfOperationDefinition {
  command: string;
  aliases: string[];
  describe: string;
  fileDescription: string;
  operation: string;
  examples: string[];
}

const PDF_OPERATION_DEFINITIONS: PdfOperationDefinition[] = [
  {
    command: 'pdf/a <files..>',
    aliases: ['pdf-a'],
    describe: 'Convert PDF files to PDF/A',
    fileDescription: 'Path(s) to PDF file(s) to convert to PDF/A',
    operation: 'pdf/a',
    examples: ['cloudconvert pdf/a --conformance_level=2b input.pdf']
  },
  {
    command: 'pdf/x <files..>',
    aliases: ['pdf-x'],
    describe: 'Convert PDF files to PDF/X',
    fileDescription: 'Path(s) to PDF file(s) to convert to PDF/X',
    operation: 'pdf/x',
    examples: ['cloudconvert pdf/x --variant=4 input.pdf']
  },
  {
    command: 'pdf/ocr <files..>',
    aliases: ['pdf-ocr'],
    describe: 'Add an OCR text layer to scanned PDF files',
    fileDescription: 'Path(s) to scanned PDF file(s) to OCR',
    operation: 'pdf/ocr',
    examples: ['cloudconvert pdf/ocr --language.0=eng input.pdf']
  },
  {
    command: 'pdf/encrypt <files..>',
    aliases: ['pdf-encrypt'],
    describe: 'Encrypt PDF files',
    fileDescription: 'Path(s) to PDF file(s) to encrypt',
    operation: 'pdf/encrypt',
    examples: ['cloudconvert pdf/encrypt --set_password=123 --set_owner_password=456 input.pdf']
  },
  {
    command: 'pdf/decrypt <files..>',
    aliases: ['pdf-decrypt'],
    describe: 'Decrypt PDF files',
    fileDescription: 'Path(s) to PDF file(s) to decrypt',
    operation: 'pdf/decrypt',
    examples: ['cloudconvert pdf/decrypt --password=123 input.pdf']
  },
  {
    command: 'pdf/split-pages <files..>',
    aliases: ['pdf-split-pages'],
    describe: 'Split PDF files into one file per page',
    fileDescription: 'Path(s) to PDF file(s) to split',
    operation: 'pdf/split-pages',
    examples: ['cloudconvert pdf/split-pages input.pdf']
  },
  {
    command: 'pdf/extract-pages <files..>',
    aliases: ['pdf-extract-pages'],
    describe: 'Extract pages from PDF files',
    fileDescription: 'Path(s) to PDF file(s) to extract pages from',
    operation: 'pdf/extract-pages',
    examples: ['cloudconvert pdf/extract-pages --pages=1,2 input.pdf']
  },
  {
    command: 'pdf/rotate-pages <files..>',
    aliases: ['pdf-rotate-pages'],
    describe: 'Rotate pages in PDF files',
    fileDescription: 'Path(s) to PDF file(s) to rotate',
    operation: 'pdf/rotate-pages',
    examples: ['cloudconvert pdf/rotate-pages --pages=1,2 --rotation=+90 input.pdf']
  }
];

export function createPdfCommands(runJob: JobRunner): Array<CommandModule<object, object>> {
  return PDF_OPERATION_DEFINITIONS.map(definition => ({
    ...createFileJobCommand(definition, runJob),
    aliases: definition.aliases
  }));
}

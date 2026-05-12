import { afterEach, describe, expect, it, vi } from 'vitest';

import { createCli } from '../src/app.js';
import type { CliArguments, TaskData } from '../src/types.js';
import { createFakeCloudConvertClient, createFakeJob, createSilentLogger, createTempFiles } from './helpers.js';

describe('CLI compatibility', () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(cleanups.splice(0).map(cleanup => cleanup()));
  });

  it('keeps the documented command and option surface in help output', async () => {
    const help = await createCli([], {
      exitProcess: false,
      logger: createSilentLogger(),
      createClient: () => createFakeCloudConvertClient()
    }).getHelp();

    expect(help).toContain('cloudconvert convert <files..>');
    expect(help).toContain('cloudconvert optimize <files..>');
    expect(help).toContain('cloudconvert merge <files..>');
    expect(help).toContain('cloudconvert capture-website <url>');
    expect(help).toContain('cloudconvert thumbnail <files..>');
    expect(help).toContain('cloudconvert watermark <files..>');
    expect(help).toContain('cloudconvert pdf/a <files..>');
    expect(help).toContain('cloudconvert pdf/x <files..>');
    expect(help).toContain('cloudconvert pdf/ocr <files..>');
    expect(help).toContain('cloudconvert pdf/encrypt <files..>');
    expect(help).toContain('cloudconvert pdf/decrypt <files..>');
    expect(help).toContain('cloudconvert pdf/split-pages <files..>');
    expect(help).toContain('cloudconvert pdf/extract-pages <files..>');
    expect(help).toContain('cloudconvert pdf/rotate-pages <files..>');
    expect(help).toContain('cloudconvert command <files..>');
    expect(help).toContain('cloudconvert credits');
    expect(help).toContain('cloudconvert parameters <operation>');
    expect(help).toContain('--api-key');
    expect(help).toContain('--sandbox');
    expect(help).toContain('--output-dir');
    expect(help).toContain('--overwrite');
    expect(help).toContain('--parameter');
    expect(help).toContain('-p');
  });

  it('lists credits and parameters as the final commands in help output', async () => {
    const help = await createCli([], {
      exitProcess: false,
      logger: createSilentLogger(),
      createClient: () => createFakeCloudConvertClient()
    }).getHelp();

    const commandIndex = help.indexOf('cloudconvert command <files..>');
    const pdfRotatePagesIndex = help.indexOf('cloudconvert pdf/rotate-pages');
    const creditsIndex = help.indexOf('cloudconvert credits');
    const parametersIndex = help.indexOf('cloudconvert parameters <operation>');
    const optionsIndex = help.indexOf('Options:');

    expect(commandIndex).toBeGreaterThan(-1);
    expect(pdfRotatePagesIndex).toBeGreaterThan(-1);
    expect(creditsIndex).toBeGreaterThan(commandIndex);
    expect(creditsIndex).toBeGreaterThan(pdfRotatePagesIndex);
    expect(parametersIndex).toBeGreaterThan(creditsIndex);
    expect(optionsIndex).toBeGreaterThan(parametersIndex);
  });

  it('shows operation help hints for discovering task parameters', async () => {
    const dependencies = {
      exitProcess: false,
      logger: createSilentLogger(),
      createClient: () => createFakeCloudConvertClient()
    };

    const convertHelp = await createCli(['convert', '--help'], dependencies).getHelp();
    const captureWebsiteHelp = await createCli(['capture-website', '--help'], dependencies).getHelp();
    const commandHelp = await createCli(['command', '--help'], dependencies).getHelp();
    const pdfOcrHelp = await createCli(['pdf/ocr', '--help'], dependencies).getHelp();

    expect(convertHelp).toContain('Find possible task parameters with: cloudconvert parameters convert');
    expect(captureWebsiteHelp).toContain(
      'Find possible task parameters with: cloudconvert parameters capture-website'
    );
    expect(commandHelp).toContain('Find possible task parameters with: cloudconvert parameters command');
    expect(pdfOcrHelp).toContain('Find possible task parameters with: cloudconvert parameters pdf/ocr');
  });

  it('parses convert with -f and dotted -p parameters', async () => {
    const { files, cleanup } = await createTempFiles(['input.pdf']);
    cleanups.push(cleanup);
    const calls = await parseJobCommand(['convert', '-f', 'jpg', '-p.pages=1-1', '-p.width=250', files[0]]);

    expect(calls).toHaveLength(1);
    expect(calls[0].argv.files).toEqual([files[0]]);
    expect(calls[0].taskData).toEqual({
      operation: 'convert',
      output_format: 'jpg',
      pages: '1-1',
      width: 250
    });
  });

  it('keeps legacy flag names as backwards-compatible aliases', async () => {
    const { files, cleanup } = await createTempFiles(['input.pdf']);
    cleanups.push(cleanup);
    const calls: Array<{ argv: CliArguments; taskData: TaskData }> = [];

    await createCli(['--apikey', 'key', '--outputdir', 'output', 'convert', '--format', 'jpg', files[0]], {
      exitProcess: false,
      logger: createSilentLogger(),
      createClient: () => createFakeCloudConvertClient(),
      runJob: async (argv, taskData) => {
        calls.push({ argv, taskData });
        return createFakeJob();
      }
    }).parseAsync();

    expect(calls[0].argv.apikey).toBe('key');
    expect(calls[0].argv.outputdir).toBe('output');
    expect(calls[0].taskData).toMatchObject({
      operation: 'convert',
      output_format: 'jpg'
    });
  });

  it('parses dynamic task parameters from long options', async () => {
    const { files, cleanup } = await createTempFiles(['input.pdf']);
    cleanups.push(cleanup);
    const calls = await parseJobCommand(['thumbnail', '--width=200', '--height=200', '--fit=crop', files[0]]);

    expect(calls[0].taskData).toEqual({
      operation: 'thumbnail',
      output_format: 'png',
      width: 200,
      height: 200,
      fit: 'crop'
    });
  });

  it('keeps -p parameters compatible when mixed with dynamic options', async () => {
    const { files, cleanup } = await createTempFiles(['input.pdf']);
    cleanups.push(cleanup);
    const calls = await parseJobCommand(['thumbnail', '--width=200', '-p.width=300', '-p.height=300', files[0]]);

    expect(calls[0].taskData).toEqual({
      operation: 'thumbnail',
      output_format: 'png',
      width: 300,
      height: 300
    });
  });

  it('parses optimize without changing the command name', async () => {
    const { files, cleanup } = await createTempFiles(['input.pdf']);
    cleanups.push(cleanup);
    const calls = await parseJobCommand(['optimize', files[0]]);

    expect(calls[0].taskData).toEqual({
      operation: 'optimize'
    });
  });

  it('parses merge with the existing default pdf format', async () => {
    const { files, cleanup } = await createTempFiles(['one.pdf', 'two.pdf']);
    cleanups.push(cleanup);
    const calls = await parseJobCommand(['merge', files[0], files[1]]);

    expect(calls[0].argv.files).toEqual(files);
    expect(calls[0].taskData).toEqual({
      operation: 'merge',
      output_format: 'pdf'
    });
  });

  it('parses capture-website with URL and format', async () => {
    const calls = await parseJobCommand(['capture-website', '-f', 'png', '--screen_width=1000', 'https://example.com']);

    expect(calls[0].taskData).toEqual({
      operation: 'capture-website',
      output_format: 'png',
      url: 'https://example.com',
      screen_width: 1000
    });
  });

  it('parses thumbnail with its existing default png format', async () => {
    const { files, cleanup } = await createTempFiles(['input.pdf']);
    cleanups.push(cleanup);
    const calls = await parseJobCommand(['thumbnail', files[0]]);

    expect(calls[0].taskData).toEqual({
      operation: 'thumbnail',
      output_format: 'png'
    });
  });

  it('parses watermark text and secondary image parameters', async () => {
    const { files, cleanup } = await createTempFiles(['input.pdf', 'watermark.png']);
    cleanups.push(cleanup);
    const calls = await parseJobCommand(['watermark', '-p.text=Draft', `-p.image=${files[1]}`, files[0]]);

    expect(calls[0].argv.files).toEqual([files[0]]);
    expect(calls[0].taskData).toEqual({
      operation: 'watermark',
      text: 'Draft',
      image: files[1]
    });
  });

  it('parses PDF operation commands with dynamic parameters', async () => {
    const { files, cleanup } = await createTempFiles(['input.pdf']);
    cleanups.push(cleanup);
    const calls = await parseJobCommand(['pdf/rotate-pages', '--pages=1,2', '--rotation=+90', files[0]]);

    expect(calls[0].argv.files).toEqual([files[0]]);
    expect(calls[0].taskData).toEqual({
      operation: 'pdf/rotate-pages',
      pages: '1,2',
      rotation: '+90'
    });
  });

  it('keeps dashed aliases for PDF operation commands', async () => {
    const { files, cleanup } = await createTempFiles(['input.pdf']);
    cleanups.push(cleanup);
    const calls = await parseJobCommand(['pdf-encrypt', '--set_password=123', files[0]]);

    expect(calls[0].taskData).toEqual({
      operation: 'pdf/encrypt',
      set_password: 123
    });
  });

  it('parses command operation parameters', async () => {
    const { files, cleanup } = await createTempFiles(['input.mp4']);
    cleanups.push(cleanup);
    const calls = await parseJobCommand([
      'command',
      '--engine=ffmpeg',
      '--command=ffmpeg',
      '--arguments=-i /input/upload-0/input.mp4 -vcodec libx264 -acodec copy /output/output.mp4',
      files[0]
    ]);

    expect(calls[0].argv.files).toEqual([files[0]]);
    expect(calls[0].taskData).toEqual({
      operation: 'command',
      engine: 'ffmpeg',
      command: 'ffmpeg',
      arguments: '-i /input/upload-0/input.mp4 -vcodec libx264 -acodec copy /output/output.mp4',
      capture_output: true
    });
  });

  it('allows command output capture to be disabled', async () => {
    const { files, cleanup } = await createTempFiles(['input.mp4']);
    cleanups.push(cleanup);
    const calls = await parseJobCommand([
      'command',
      '--engine=ffmpeg',
      '--command=ffmpeg',
      '--arguments=-i /input/upload-0/input.mp4 /output/output.mp4',
      '--no-capture-output',
      files[0]
    ]);

    expect(calls[0].taskData).toEqual({
      operation: 'command',
      engine: 'ffmpeg',
      command: 'ffmpeg',
      arguments: '-i /input/upload-0/input.mp4 /output/output.mp4',
      capture_output: false
    });
  });

  it('uses credits as the API account command', async () => {
    const client = createFakeCloudConvertClient(12);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await createCli(['--api-key', 'key', 'credits'], {
      exitProcess: false,
      logger: createSilentLogger(),
      createClient: () => client
    }).parseAsync();

    expect(client.users.me).toHaveBeenCalledOnce();
    expect(consoleSpy.mock.calls[0].join(' ')).toContain('Conversion credits: 12');
  });

  it('keeps minutes as a backwards-compatible alias', async () => {
    const client = createFakeCloudConvertClient(9);
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await createCli(['--api-key', 'key', 'minutes'], {
      exitProcess: false,
      logger: createSilentLogger(),
      createClient: () => client
    }).parseAsync();

    expect(client.users.me).toHaveBeenCalledOnce();
    expect(consoleSpy.mock.calls[0].join(' ')).toContain('Conversion credits: 9');
  });

  it('lists available parameters for an operation and format pair', async () => {
    const client = createFakeCloudConvertClient();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    vi.mocked(client.call).mockResolvedValue({
      data: [
        {
          operation: 'convert',
          input_format: 'pdf',
          output_format: 'jpg',
          engine: 'poppler',
          options: [
            {
              name: 'pages',
              type: 'string',
              description: 'Page range to convert'
            },
            {
              name: 'quality',
              type: 'integer',
              description: 'Output image quality',
              default: 90,
              possible_values: [75, 90, 100]
            }
          ]
        }
      ]
    });

    await createCli(
      ['--api-key', 'key', 'parameters', 'convert', '--input-format', 'pdf', '--output-format', 'jpg'],
      {
        exitProcess: false,
        logger: createSilentLogger(),
        createClient: () => client
      }
    ).parseAsync();

    expect(client.call).toHaveBeenCalledWith('GET', 'operations', {
      'filter[operation]': 'convert',
      'filter[input_format]': 'pdf',
      'filter[output_format]': 'jpg',
      include: 'options'
    });
    expect(consoleSpy.mock.calls[0][0]).toContain('Available parameters for convert pdf -> jpg:');
    expect(consoleSpy.mock.calls[0][0]).toContain('--pages  string  Page range to convert');
    expect(consoleSpy.mock.calls[0][0]).toContain(
      '--quality  integer | default: 90 | values: 75, 90, 100  Output image quality'
    );
    expect(consoleSpy.mock.calls[0][0]).not.toContain('-p.pages');
    expect(consoleSpy.mock.calls[0][0]).not.toContain('-p.quality');
  });

  it('prints raw operation metadata as JSON', async () => {
    const client = createFakeCloudConvertClient();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const response = {
      data: [
        {
          operation: 'optimize',
          input_format: 'pdf',
          options: [{ name: 'profile', type: 'enum', possible_values: ['web', 'print'] }]
        }
      ]
    };

    vi.mocked(client.call).mockResolvedValue(response);

    await createCli(['--api-key', 'key', 'parameters', 'optimize', '--input-format', 'pdf', '--json'], {
      exitProcess: false,
      logger: createSilentLogger(),
      createClient: () => client
    }).parseAsync();

    expect(consoleSpy.mock.calls[0][0]).toBe(JSON.stringify(response.data, null, 2));
  });

  it('keeps file validation for commands requiring uploads', async () => {
    await expect(parseJobCommand(['convert', '-f', 'jpg', 'missing.pdf'])).rejects.toThrow(
      'You need to provide at least one file!'
    );
  });
});

async function parseJobCommand(args: string[]): Promise<Array<{ argv: CliArguments; taskData: TaskData }>> {
  const calls: Array<{ argv: CliArguments; taskData: TaskData }> = [];

  await createCli(['--api-key', 'key', ...args], {
    exitProcess: false,
    logger: createSilentLogger(),
    createClient: () => createFakeCloudConvertClient(),
    runJob: async (argv, taskData) => {
      calls.push({ argv, taskData });
      return createFakeJob();
    }
  }).parseAsync();

  return calls;
}

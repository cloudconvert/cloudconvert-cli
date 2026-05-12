import { ReadStream } from 'node:fs';
import { basename, join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildJobTemplate, downloadExportFile, runJob } from '../src/job.js';
import type { CliArguments, CloudConvertClient, Job, JobEvent, Spinner } from '../src/types.js';
import { createFakeCloudConvertClient, createSilentLogger, createTempFiles } from './helpers.js';

describe('job services', () => {
  const cleanups: Array<() => Promise<void>> = [];

  afterEach(async () => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    await Promise.all(cleanups.splice(0).map(cleanup => cleanup()));
  });

  it('builds upload/import tasks around the process task', () => {
    expect(
      buildJobTemplate(
        {
          operation: 'convert',
          output_format: 'jpg'
        },
        ['one.pdf', 'two.pdf']
      )
    ).toEqual({
      tasks: {
        process: {
          operation: 'convert',
          output_format: 'jpg',
          input: ['upload-0', 'upload-1']
        },
        export: {
          operation: 'export/url',
          input: 'process'
        },
        'upload-0': {
          operation: 'import/upload'
        },
        'upload-1': {
          operation: 'import/upload'
        }
      }
    });
  });

  it('builds upload/import tasks for secondary input parameters', () => {
    expect(
      buildJobTemplate(
        {
          operation: 'watermark',
          text: 'Draft',
          image: 'watermark.png'
        },
        ['input.pdf'],
        {
          image: 'watermark.png'
        }
      )
    ).toEqual({
      tasks: {
        process: {
          operation: 'watermark',
          text: 'Draft',
          image: 'upload-image-0',
          input: ['upload-0']
        },
        export: {
          operation: 'export/url',
          input: 'process'
        },
        'upload-0': {
          operation: 'import/upload'
        },
        'upload-image-0': {
          operation: 'import/upload'
        }
      }
    });
  });

  it('uploads files, downloads exports, prints task messages, and closes the socket', async () => {
    const { files, cleanup } = await createTempFiles(['input.pdf']);
    cleanups.push(cleanup);
    const job = createUploadJob();
    const finishedJob = createFinishedJob();
    const client = createFakeCloudConvertClient() as CloudConvertClient;
    const logger = createSilentLogger();
    const spinner = createSpinner();
    let finishedCallback: ((event: JobEvent) => void) | undefined;

    vi.mocked(client.jobs.create).mockResolvedValue(job);
    vi.mocked(client.jobs.subscribeEvent).mockImplementation((_id, event, callback) => {
      if (event === 'finished') {
        finishedCallback = callback;
      }
    });
    vi.mocked(client.tasks.upload).mockResolvedValue(undefined);

    const jobPromise = runJob(
      createArgv(client, files),
      {
        operation: 'convert',
        output_format: 'jpg'
      },
      {
        spinner,
        logger,
        downloadFile: vi.fn(async () => 'downloaded' as const)
      }
    );

    await vi.waitFor(() => expect(client.tasks.upload).toHaveBeenCalledOnce());
    finishedCallback?.({ job: finishedJob });
    await expect(jobPromise).resolves.toBe(finishedJob);

    expect(client.jobs.create).toHaveBeenCalledWith(buildJobTemplate({ operation: 'convert', output_format: 'jpg' }, files));
    expect(client.tasks.upload).toHaveBeenCalledWith(job.tasks[0], expect.any(ReadStream), 'input.pdf', 7);
    expect(spinner.succeed).toHaveBeenCalledWith('Done!');
    expect(logger.info).toHaveBeenCalledWith('Task `process`: File size reduced by 12%');
    expect(client.closeSocket).toHaveBeenCalledOnce();
  });

  it('prints captured command task output', async () => {
    const { files, cleanup } = await createTempFiles(['input.mp4']);
    cleanups.push(cleanup);
    const job = createUploadJob();
    const finishedJob: Job = {
      id: 'job-id',
      tasks: [
        {
          name: 'process',
          operation: 'command',
          result: {
            output: 'ffmpeg output'
          }
        }
      ]
    };
    const client = createFakeCloudConvertClient() as CloudConvertClient;
    const logger = createSilentLogger();
    const spinner = createSpinner();
    let finishedCallback: ((event: JobEvent) => void) | undefined;

    vi.mocked(client.jobs.create).mockResolvedValue(job);
    vi.mocked(client.jobs.subscribeEvent).mockImplementation((_id, event, callback) => {
      if (event === 'finished') {
        finishedCallback = callback;
      }
    });
    vi.mocked(client.tasks.upload).mockResolvedValue(undefined);

    const jobPromise = runJob(
      createArgv(client, files),
      {
        operation: 'command',
        engine: 'ffmpeg',
        command: 'ffmpeg',
        arguments: '-i /input/upload-0/input.mp4 /output/output.mp4',
        capture_output: true
      },
      {
        spinner,
        logger,
        downloadFile: vi.fn(async () => 'downloaded' as const)
      }
    );

    await vi.waitFor(() => expect(client.tasks.upload).toHaveBeenCalledOnce());
    finishedCallback?.({ job: finishedJob });
    await expect(jobPromise).resolves.toBe(finishedJob);

    expect(logger.info).toHaveBeenCalledWith('Task `process` output:\nffmpeg output');
  });

  it('uploads secondary input files from Input task parameters', async () => {
    const { files, cleanup } = await createTempFiles(['input.pdf', 'watermark.png']);
    cleanups.push(cleanup);
    const job = {
      id: 'job-id',
      tasks: [
        {
          name: 'upload-0',
          operation: 'import/upload'
        },
        {
          name: 'upload-image-0',
          operation: 'import/upload'
        }
      ]
    };
    const finishedJob = createFinishedJob();
    const client = createFakeCloudConvertClient() as CloudConvertClient;
    const logger = createSilentLogger();
    const spinner = createSpinner();
    let finishedCallback: ((event: JobEvent) => void) | undefined;

    vi.mocked(client.call).mockResolvedValue({
      data: [
        {
          operation: 'watermark',
          options: [{ name: 'image', type: 'Input' }]
        }
      ]
    });
    vi.mocked(client.jobs.create).mockResolvedValue(job);
    vi.mocked(client.jobs.subscribeEvent).mockImplementation((_id, event, callback) => {
      if (event === 'finished') {
        finishedCallback = callback;
      }
    });
    vi.mocked(client.tasks.upload).mockResolvedValue(undefined);

    const jobPromise = runJob(
      createArgv(client, [files[0]]),
      {
        operation: 'watermark',
        image: files[1]
      },
      {
        spinner,
        logger,
        downloadFile: vi.fn(async () => 'downloaded' as const)
      }
    );

    await vi.waitFor(() => expect(client.tasks.upload).toHaveBeenCalledTimes(2));
    finishedCallback?.({ job: finishedJob });
    await expect(jobPromise).resolves.toBe(finishedJob);

    expect(client.jobs.create).toHaveBeenCalledWith(
      buildJobTemplate({ operation: 'watermark', image: files[1] }, [files[0]], { image: files[1] })
    );
    expect(client.tasks.upload).toHaveBeenNthCalledWith(1, job.tasks[0], expect.any(ReadStream), 'input.pdf', 7);
    expect(client.tasks.upload).toHaveBeenNthCalledWith(2, job.tasks[1], expect.any(ReadStream), 'watermark.png', 7);
  });

  it('casts task parameter values using operation metadata', async () => {
    const { files, cleanup } = await createTempFiles(['input.pdf']);
    cleanups.push(cleanup);
    const job = createUploadJob();
    const finishedJob = createFinishedJob();
    const client = createFakeCloudConvertClient() as CloudConvertClient;
    const logger = createSilentLogger();
    const spinner = createSpinner();
    let finishedCallback: ((event: JobEvent) => void) | undefined;

    vi.mocked(client.call).mockResolvedValue({
      data: [
        {
          operation: 'convert',
          options: [
            { name: 'width', type: 'integer' },
            { name: 'height', type: 'integer' },
            { name: 'scale', type: 'float' },
            { name: 'alpha', type: 'boolean' },
            { name: 'pages', type: 'string' }
          ]
        }
      ]
    });
    vi.mocked(client.jobs.create).mockResolvedValue(job);
    vi.mocked(client.jobs.subscribeEvent).mockImplementation((_id, event, callback) => {
      if (event === 'finished') {
        finishedCallback = callback;
      }
    });
    vi.mocked(client.tasks.upload).mockResolvedValue(undefined);

    const jobPromise = runJob(
      createArgv(client, files),
      {
        operation: 'convert',
        output_format: 'jpg',
        width: '200',
        height: 300,
        scale: '1.5',
        alpha: 'false',
        pages: 1
      },
      {
        spinner,
        logger,
        downloadFile: vi.fn(async () => 'downloaded' as const)
      }
    );

    await vi.waitFor(() => expect(client.tasks.upload).toHaveBeenCalledOnce());
    finishedCallback?.({ job: finishedJob });
    await expect(jobPromise).resolves.toBe(finishedJob);

    expect(client.jobs.create).toHaveBeenCalledWith(
      buildJobTemplate(
        {
          operation: 'convert',
          output_format: 'jpg',
          width: 200,
          height: 300,
          scale: 1.5,
          alpha: false,
          pages: '1'
        },
        files
      )
    );
  });

  it('rejects when the job fails and keeps the old failure text', async () => {
    const client = createFakeCloudConvertClient() as CloudConvertClient;
    const spinner = createSpinner();
    let failedCallback: ((event: JobEvent) => void) | undefined;

    vi.mocked(client.jobs.create).mockResolvedValue({ id: 'job-id', tasks: [] });
    vi.mocked(client.jobs.subscribeEvent).mockImplementation((_id, event, callback) => {
      if (event === 'failed') {
        failedCallback = callback;
      }
    });

    const jobPromise = runJob(createArgv(client, []), { operation: 'capture-website', url: 'https://example.com' }, {
      spinner,
      logger: createSilentLogger()
    });

    await vi.waitFor(() => expect(failedCallback).toBeDefined());
    failedCallback?.({ job: { id: 'job-id', tasks: [] } });

    await expect(jobPromise).rejects.toThrow('Job failed!');
    expect(spinner.fail).toHaveBeenCalledWith('Job failed!');
    expect(client.closeSocket).toHaveBeenCalledOnce();
  });

  it('prints captured command task output when the job fails', async () => {
    const client = createFakeCloudConvertClient() as CloudConvertClient;
    const logger = createSilentLogger();
    const spinner = createSpinner();
    let failedCallback: ((event: JobEvent) => void) | undefined;

    vi.mocked(client.jobs.create).mockResolvedValue({ id: 'job-id', tasks: [] });
    vi.mocked(client.jobs.subscribeEvent).mockImplementation((_id, event, callback) => {
      if (event === 'failed') {
        failedCallback = callback;
      }
    });

    const jobPromise = runJob(
      createArgv(client, []),
      {
        operation: 'command',
        engine: 'ffmpeg',
        command: 'ffmpeg',
        arguments: '-i /input/upload-0/input.mp4 /output/output.mp4',
        capture_output: true
      },
      {
        spinner,
        logger
      }
    );

    await vi.waitFor(() => expect(failedCallback).toBeDefined());
    failedCallback?.({
      job: {
        id: 'job-id',
        tasks: [
          {
            name: 'process',
            operation: 'command',
            status: 'failed',
            message: 'Command failed',
            code: 'COMMAND_FAILED',
            result: {
              output: 'ffmpeg failure output'
            }
          }
        ]
      }
    });

    await expect(jobPromise).rejects.toThrow('Job failed!');
    expect(logger.error).toHaveBeenCalledWith('Task `process` failed: Command failed (Code: COMMAND_FAILED)');
    expect(logger.info).toHaveBeenCalledWith('Task `process` output:\nffmpeg failure output');
  });

  it('cancels the active job when SIGINT is received', async () => {
    const client = createFakeCloudConvertClient() as CloudConvertClient;
    const spinner = createSpinner();
    const signalEmitter = createSignalEmitter();

    vi.mocked(client.jobs.create).mockResolvedValue({ id: 'job-id', tasks: [] });

    const jobPromise = runJob(
      createArgv(client, []),
      {
        operation: 'capture-website',
        url: 'https://example.com'
      },
      {
        spinner,
        logger: createSilentLogger(),
        signalEmitter
      }
    );

    await vi.waitFor(() => expect(signalEmitter.once).toHaveBeenCalledWith('SIGINT', expect.any(Function)));
    signalEmitter.emitSigint();

    await expect(jobPromise).rejects.toThrow('Job cancelled.');
    expect(client.call).toHaveBeenCalledWith('DELETE', 'jobs/job-id');
    expect(spinner.fail).toHaveBeenCalledWith('Job cancelled.');
    expect(client.closeSocket).toHaveBeenCalledOnce();
    expect(signalEmitter.off).toHaveBeenCalledWith('SIGINT', expect.any(Function));
  });

  it('polls job status every 30 seconds and resolves when the finished event is missed', async () => {
    vi.useFakeTimers();
    const client = createFakeCloudConvertClient() as CloudConvertClient;
    const logger = createSilentLogger();
    const spinner = createSpinner();
    const finishedJob = { ...createFinishedJob(), status: 'finished' };
    const downloadFile = vi.fn(async () => 'downloaded' as const);

    vi.mocked(client.jobs.create).mockResolvedValue({ id: 'job-id', tasks: [] });
    vi.mocked(client.jobs.get).mockResolvedValue(finishedJob);

    const jobPromise = runJob(
      createArgv(client, []),
      {
        operation: 'capture-website',
        url: 'https://example.com'
      },
      {
        spinner,
        logger,
        downloadFile
      }
    );

    await Promise.resolve();
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(30_000);

    await expect(jobPromise).resolves.toBe(finishedJob);
    expect(client.jobs.get).toHaveBeenCalledWith('job-id');
    expect(downloadFile).toHaveBeenCalledOnce();
    expect(spinner.succeed).toHaveBeenCalledWith('Done!');
    expect(client.closeSocket).toHaveBeenCalledOnce();
  });

  it('polls job status every 30 seconds and rejects when the failed event is missed', async () => {
    vi.useFakeTimers();
    const client = createFakeCloudConvertClient() as CloudConvertClient;
    const logger = createSilentLogger();
    const spinner = createSpinner();
    const failedJob: Job = {
      id: 'job-id',
      status: 'error',
      tasks: [
        {
          name: 'process',
          operation: 'convert',
          status: 'error',
          message: 'Conversion failed',
          code: 'CONVERSION_FAILED'
        }
      ]
    };

    vi.mocked(client.jobs.create).mockResolvedValue({ id: 'job-id', tasks: [] });
    vi.mocked(client.jobs.get).mockResolvedValue(failedJob);

    const jobPromise = runJob(
      createArgv(client, []),
      {
        operation: 'capture-website',
        url: 'https://example.com'
      },
      {
        spinner,
        logger
      }
    );

    await Promise.resolve();
    await Promise.resolve();
    const expectation = expect(jobPromise).rejects.toThrow('Job failed!');
    await vi.advanceTimersByTimeAsync(30_000);

    await expectation;
    expect(client.jobs.get).toHaveBeenCalledWith('job-id');
    expect(logger.error).toHaveBeenCalledWith(
      'Task `process` failed: Conversion failed (Code: CONVERSION_FAILED)'
    );
    expect(spinner.fail).toHaveBeenCalledWith('Job failed!');
    expect(client.closeSocket).toHaveBeenCalledOnce();
  });

  it('skips downloads when the target exists and overwrite is false', async () => {
    const { dir, cleanup } = await createTempFiles(['output.pdf']);
    cleanups.push(cleanup);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(
      downloadExportFile(
        {
          filename: basename(join(dir, 'output.pdf')),
          url: 'https://example.com/output.pdf'
        },
        dir,
        false
      )
    ).resolves.toBe('skipped');

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('throws useful download errors for non-2xx responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 404 }));

    await expect(
      downloadExportFile(
        {
          filename: 'missing.pdf',
          url: 'https://example.com/missing.pdf'
        },
        undefined,
        true
      )
    ).rejects.toThrow('Download failed for missing.pdf: HTTP 404');
  });
});

function createUploadJob(): Job {
  return {
    id: 'job-id',
    tasks: [
      {
        name: 'upload-0',
        operation: 'import/upload'
      }
    ]
  };
}

function createFinishedJob(): Job {
  return {
    id: 'job-id',
    tasks: [
      {
        name: 'export',
        operation: 'export/url',
        result: {
          files: [
            {
              filename: 'output.pdf',
              url: 'https://example.com/output.pdf'
            }
          ]
        }
      },
      {
        name: 'process',
        operation: 'optimize',
        message: 'File size reduced by 12%'
      }
    ]
  };
}

function createArgv(client: CloudConvertClient, files: string[]): CliArguments {
  return {
    apikey: 'key',
    sandbox: false,
    overwrite: false,
    files,
    cloudconvert: client
  };
}

function createSpinner(): Spinner {
  return {
    text: '',
    succeed: vi.fn(),
    fail: vi.fn()
  };
}

function createSignalEmitter(): {
  once: ReturnType<typeof vi.fn<(signal: 'SIGINT', listener: () => void) => void>>;
  off: ReturnType<typeof vi.fn<(signal: 'SIGINT', listener: () => void) => void>>;
  emitSigint: () => void;
} {
  let sigintListener: (() => void) | undefined;

  return {
    once: vi.fn((signal: 'SIGINT', listener: () => void) => {
      sigintListener = listener;
    }),
    off: vi.fn(),
    emitSigint: () => sigintListener?.()
  };
}

import { createReadStream, createWriteStream, existsSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';

import type {
  CliArguments,
  CloudConvertClient,
  CloudConvertOperationOption,
  ExportedFile,
  Job,
  JobTask,
  JobTemplate,
  Logger,
  Spinner,
  TaskData
} from './types.js';
import { collectOperationOptions, fetchOperations } from './operations.js';

type SecondaryInputFiles = Record<string, string | string[]>;
type UploadFilesByTaskName = Record<string, string>;

interface JobCompletionCallbacks {
  isSettled: () => boolean;
  isCancelled: () => boolean;
  finishJob: (job: Job) => void;
  failJob: (job?: Job) => void;
}

interface InterruptSignalEmitter {
  once(signal: 'SIGINT', listener: () => void): unknown;
  off(signal: 'SIGINT', listener: () => void): unknown;
}

const JOB_STATUS_POLL_INTERVAL_MS = 30_000;
const JOB_CANCELLED_MESSAGE = 'Job cancelled.';

export interface RunJobDependencies {
  spinner: Spinner;
  logger: Logger;
  downloadFile?: typeof downloadExportFile;
  signalEmitter?: InterruptSignalEmitter;
}

export function buildJobTemplate(
  taskData: TaskData,
  files?: string[],
  secondaryInputFiles: SecondaryInputFiles = {}
): JobTemplate {
  const jobData: JobTemplate = {
    tasks: {
      process: createProcessTaskData(taskData, secondaryInputFiles),
      export: {
        operation: 'export/url',
        input: 'process'
      }
    }
  };

  if (files) {
    jobData.tasks.process.input = [];

    files.forEach((_, index) => {
      const taskName = `upload-${index}`;
      jobData.tasks[taskName] = {
        operation: 'import/upload'
      };
      (jobData.tasks.process.input as string[]).push(taskName);
    });
  }

  for (const [parameterName, parameterFiles] of Object.entries(secondaryInputFiles)) {
    const files = Array.isArray(parameterFiles) ? parameterFiles : [parameterFiles];

    files.forEach((_, index) => {
      jobData.tasks[getSecondaryUploadTaskName(parameterName, index)] = {
        operation: 'import/upload'
      };
    });
  }

  return jobData;
}

export async function runJob(
  argv: CliArguments,
  taskData: TaskData,
  { spinner, logger, downloadFile = downloadExportFile, signalEmitter = process }: RunJobDependencies
): Promise<Job> {
  spinner.text = 'Creating job';

  const cloudconvert = argv.cloudconvert;
  const parameterOptions = await fetchParameterOptions(cloudconvert, taskData);
  const castTaskData = castTaskParameterValues(taskData, parameterOptions);
  const secondaryInputFiles = resolveSecondaryInputFiles(castTaskData, parameterOptions);
  const job = await cloudconvert.jobs.create(buildJobTemplate(castTaskData, argv.files, secondaryInputFiles));
  const cancellation = createJobCancellation(job.id, cloudconvert, spinner, signalEmitter);
  const completion = waitForCompletion(job.id, argv, spinner, logger, downloadFile, cancellation.signal);
  const upload = uploadFiles(
    job,
    createUploadFilesByTaskName(argv.files, secondaryInputFiles),
    argv,
    spinner,
    cancellation.signal
  );

  try {
    await Promise.race([upload, cancellation.promise]);
    spinner.text = 'Processing';

    return await Promise.race([completion, cancellation.promise]);
  } finally {
    cancellation.dispose();
    upload.catch(() => undefined);
    completion.catch(() => undefined);
  }
}

export async function downloadExportFile(
  file: ExportedFile,
  outputdir: string | undefined,
  overwrite: boolean
): Promise<'downloaded' | 'skipped'> {
  if (!file.url) {
    throw new Error(`Exported file ${file.filename} has no download URL.`);
  }

  const targetFilename = join(outputdir || '.', file.filename);

  if (!overwrite && existsSync(targetFilename)) {
    return 'skipped';
  }

  const response = await fetch(file.url);
  if (!response.ok) {
    throw new Error(`Download failed for ${file.filename}: HTTP ${response.status}`);
  }
  if (!response.body) {
    throw new Error(`Download failed for ${file.filename}: response body is empty.`);
  }

  const writeStream = createWriteStream(targetFilename, {
    flags: overwrite ? 'w' : 'wx'
  });

  await pipeline(Readable.fromWeb(response.body as unknown as NodeReadableStream), writeStream);
  return 'downloaded';
}

async function waitForCompletion(
  jobId: string,
  argv: CliArguments,
  spinner: Spinner,
  logger: Logger,
  downloadFile: typeof downloadExportFile,
  cancellationSignal?: AbortSignal
): Promise<Job> {
  const cloudconvert = argv.cloudconvert;

  return await new Promise<Job>((resolve, reject) => {
    let settled = false;
    const isSettled = (): boolean => settled;
    const isCancelled = (): boolean => cancellationSignal?.aborted ?? false;

    const stopWaiting = (): void => {
      if (settled) {
        return;
      }

      settled = true;
      stopPolling();
      cancellationSignal?.removeEventListener('abort', stopWaiting);
    };

    const finishJob = (finishedJob: Job): void => {
      if (isSettled() || isCancelled()) {
        return;
      }

      stopWaiting();
      void finishCompletedJob(finishedJob, argv, spinner, logger, downloadFile).then(resolve, reject);
    };

    const failJob = (failedJob?: Job): void => {
      if (isSettled() || isCancelled()) {
        return;
      }

      stopWaiting();
      closeCloudConvertSocket(cloudconvert);
      if (failedJob) {
        printFailedTaskMessages(failedJob.tasks, logger);
        printCommandTaskOutputs(failedJob.tasks, logger);
      }
      spinner.fail('Job failed!');
      reject(new Error('Job failed!'));
    };

    const callbacks: JobCompletionCallbacks = {
      isSettled,
      isCancelled,
      finishJob,
      failJob
    };
    const stopPolling = startJobStatusPolling(jobId, cloudconvert, logger, callbacks);

    cancellationSignal?.addEventListener('abort', stopWaiting, { once: true });
    subscribeToJobEvents(jobId, cloudconvert, logger, callbacks);
  });
}

async function finishCompletedJob(
  finishedJob: Job,
  argv: CliArguments,
  spinner: Spinner,
  logger: Logger,
  downloadFile: typeof downloadExportFile
): Promise<Job> {
  try {
    await downloadExportedFiles(finishedJob, argv, spinner, logger, downloadFile);
    closeCloudConvertSocket(argv.cloudconvert);
    spinner.succeed('Done!');
    printTaskMessages(finishedJob.tasks, logger);
    printCommandTaskOutputs(finishedJob.tasks, logger);
    return finishedJob;
  } catch (error) {
    closeCloudConvertSocket(argv.cloudconvert);
    throw error;
  }
}

function startJobStatusPolling(
  jobId: string,
  cloudconvert: CloudConvertClient,
  logger: Logger,
  callbacks: JobCompletionCallbacks
): () => void {
  let polling = false;
  const pollInterval = setInterval(() => {
    void pollJobStatus();
  }, JOB_STATUS_POLL_INTERVAL_MS);
  pollInterval.unref?.();

  async function pollJobStatus(): Promise<void> {
    if (callbacks.isSettled() || polling) {
      return;
    }

    polling = true;
    try {
      const currentJob = await cloudconvert.jobs.get(jobId);

      if (currentJob.status === 'finished') {
        callbacks.finishJob(currentJob);
        return;
      }

      if (currentJob.status === 'error' || currentJob.status === 'failed') {
        callbacks.failJob(currentJob);
      }
    } catch (error) {
      if (!callbacks.isSettled() && error instanceof Error) {
        logger.error(`Job status polling failed: ${error.message}`);
      }
    } finally {
      polling = false;
    }
  }

  return () => clearInterval(pollInterval);
}

function subscribeToJobEvents(
  jobId: string,
  cloudconvert: CloudConvertClient,
  logger: Logger,
  callbacks: JobCompletionCallbacks
): void {
  cloudconvert.socket?.on?.('error', error => {
    logger.error(error.message);
  });

  void cloudconvert.jobs.subscribeTaskEvent(jobId, 'failed', event => {
    logger.error(
      `Task \`${event.task.name}\` failed: ${event.task.message ?? ''} (Code: ${
        event.task.code ?? 'UNKNOWN_ERROR'
      })`
    );
  });

  void cloudconvert.jobs.subscribeEvent(jobId, 'failed', event => {
    callbacks.failJob(event.job);
  });

  void cloudconvert.jobs.subscribeEvent(jobId, 'finished', event => {
    callbacks.finishJob(event.job);
    });
}

async function uploadFiles(
  job: Job,
  uploadFilesByTaskName: UploadFilesByTaskName,
  argv: CliArguments,
  spinner: Spinner,
  cancellationSignal?: AbortSignal
): Promise<void> {
  const uploadTasks = job.tasks.filter(task => task.operation === 'import/upload');

  for (const task of uploadTasks) {
    throwIfCancelled(cancellationSignal);
    const file = uploadFilesByTaskName[task.name];

    if (!file) {
      throw new Error(`Upload task ${task.name} has no matching input file.`);
    }

    const uploadFile = resolveUploadFilePath(file);
    const { size } = statSync(uploadFile);

    spinner.text = `Uploading ${uploadFile}`;
    const stream = createReadStream(uploadFile);
    const destroyStream = (): void => {
      stream.destroy(new Error(JOB_CANCELLED_MESSAGE));
    };

    cancellationSignal?.addEventListener('abort', destroyStream, { once: true });
    try {
      await argv.cloudconvert.tasks.upload(task, stream, basename(uploadFile), size);
    } finally {
      cancellationSignal?.removeEventListener('abort', destroyStream);
    }
  }
}

function createJobCancellation(
  jobId: string,
  cloudconvert: CloudConvertClient,
  spinner: Spinner,
  signalEmitter: InterruptSignalEmitter
): { signal: AbortSignal; promise: Promise<never>; dispose: () => void } {
  const abortController = new AbortController();
  let cancellationStarted = false;
  let rejectCancellation: (error: Error) => void = () => undefined;
  const promise = new Promise<never>((_, reject) => {
    rejectCancellation = reject;
  });

  const cancelJob = (): void => {
    if (cancellationStarted) {
      return;
    }

    cancellationStarted = true;
    abortController.abort();
    spinner.text = 'Cancelling job';

    void (async () => {
      try {
        await cloudconvert.call('DELETE', `jobs/${jobId}`);
        closeCloudConvertSocket(cloudconvert);
        spinner.fail(JOB_CANCELLED_MESSAGE);
        rejectCancellation(new Error(JOB_CANCELLED_MESSAGE));
      } catch (error) {
        closeCloudConvertSocket(cloudconvert);
        spinner.fail('Job cancellation failed.');
        rejectCancellation(new Error(`Job cancellation failed: ${getErrorMessage(error)}`));
      }
    })();
  };

  signalEmitter.once('SIGINT', cancelJob);

  return {
    signal: abortController.signal,
    promise,
    dispose: () => signalEmitter.off('SIGINT', cancelJob)
  };
}

async function downloadExportedFiles(
  job: Job,
  argv: CliArguments,
  spinner: Spinner,
  logger: Logger,
  downloadFile: typeof downloadExportFile
): Promise<void> {
  for (const task of job.tasks.filter(task => task.operation === 'export/url')) {
    for (const file of task.result?.files ?? []) {
      spinner.text = `Downloading ${file.filename}`;
      const result = await downloadFile(file, argv.outputdir, argv.overwrite);

      if (result === 'skipped') {
        logger.error(
          `File ${join(argv.outputdir || '.', file.filename)} already exists, skipping download. Use --overwrite or --output-dir to use a different directory.`
        );
      }
    }
  }
}

function printTaskMessages(tasks: JobTask[], logger: Logger): void {
  for (const task of tasks.filter(task => task.message)) {
    logger.info(`Task \`${task.name}\`: ${task.message}`);
  }
}

function printCommandTaskOutputs(tasks: JobTask[], logger: Logger): void {
  for (const task of tasks) {
    if (task.operation !== 'command' || typeof task.result?.output !== 'string' || task.result.output.length === 0) {
      continue;
    }

    logger.info(`Task \`${task.name}\` output:\n${task.result.output}`);
  }
}

function printFailedTaskMessages(tasks: JobTask[], logger: Logger): void {
  for (const task of tasks.filter(task => task.status === 'error' || task.status === 'failed')) {
    logger.error(
      `Task \`${task.name}\` failed: ${task.message ?? ''} (Code: ${task.code ?? 'UNKNOWN_ERROR'})`
    );
  }
}

function closeCloudConvertSocket(cloudconvert: CloudConvertClient): void {
  if (cloudconvert.closeSocket) {
    cloudconvert.closeSocket();
    return;
  }

  cloudconvert.socket?.close?.();
}

function throwIfCancelled(cancellationSignal?: AbortSignal): void {
  if (cancellationSignal?.aborted) {
    throw new Error(JOB_CANCELLED_MESSAGE);
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function createProcessTaskData(taskData: TaskData, secondaryInputFiles: SecondaryInputFiles): TaskData {
  const processTaskData = { ...taskData };

  for (const [parameterName, parameterFiles] of Object.entries(secondaryInputFiles)) {
    const files = Array.isArray(parameterFiles) ? parameterFiles : [parameterFiles];
    const taskNames = files.map((_, index) => getSecondaryUploadTaskName(parameterName, index));
    processTaskData[parameterName] = Array.isArray(parameterFiles) ? taskNames : taskNames[0];
  }

  return processTaskData;
}

function createUploadFilesByTaskName(files: string[] = [], secondaryInputFiles: SecondaryInputFiles): UploadFilesByTaskName {
  const uploadFilesByTaskName: UploadFilesByTaskName = {};

  files.forEach((file, index) => {
    uploadFilesByTaskName[`upload-${index}`] = file;
  });

  for (const [parameterName, parameterFiles] of Object.entries(secondaryInputFiles)) {
    const files = Array.isArray(parameterFiles) ? parameterFiles : [parameterFiles];

    files.forEach((file, index) => {
      uploadFilesByTaskName[getSecondaryUploadTaskName(parameterName, index)] = file;
    });
  }

  return uploadFilesByTaskName;
}

function resolveSecondaryInputFiles(
  taskData: TaskData,
  parameterOptions: Map<string, CloudConvertOperationOption>
): SecondaryInputFiles {
  const secondaryInputFiles: SecondaryInputFiles = {};

  for (const [parameterName, option] of parameterOptions) {
    if (option.type.toLowerCase() !== 'input') {
      continue;
    }

    const value = taskData[parameterName];

    if (value === undefined) {
      continue;
    }

    secondaryInputFiles[parameterName] = normalizeInputParameterFiles(parameterName, value);
  }

  return secondaryInputFiles;
}

async function fetchParameterOptions(
  cloudconvert: CloudConvertClient,
  taskData: TaskData
): Promise<Map<string, CloudConvertOperationOption>> {
  return collectOperationOptions(
    await fetchOperations(cloudconvert, {
      operation: taskData.operation,
      inputFormat: typeof taskData.input_format === 'string' ? taskData.input_format : undefined,
      outputFormat: typeof taskData.output_format === 'string' ? taskData.output_format : undefined,
      engine: typeof taskData.engine === 'string' ? taskData.engine : undefined,
      engineVersion: typeof taskData.engine_version === 'string' ? taskData.engine_version : undefined
    })
  );
}

function castTaskParameterValues(
  taskData: TaskData,
  parameterOptions: Map<string, CloudConvertOperationOption>
): TaskData {
  const castTaskData = { ...taskData };

  for (const [parameterName, option] of parameterOptions) {
    if (castTaskData[parameterName] === undefined) {
      continue;
    }

    castTaskData[parameterName] = castParameterValue(parameterName, castTaskData[parameterName], option.type);
  }

  return castTaskData;
}

function castParameterValue(parameterName: string, value: unknown, type: string): unknown {
  if (Array.isArray(value) && type.toLowerCase() !== 'input') {
    return value.map(item => castSingleParameterValue(parameterName, item, type));
  }

  return castSingleParameterValue(parameterName, value, type);
}

function castSingleParameterValue(parameterName: string, value: unknown, type: string): unknown {
  switch (type.toLowerCase()) {
    case 'integer':
    case 'int':
      return castIntegerParameter(parameterName, value);
    case 'float':
    case 'number':
      return castNumberParameter(parameterName, value);
    case 'boolean':
    case 'bool':
      return castBooleanParameter(parameterName, value);
    case 'string':
    case 'enum':
      return String(value);
    default:
      return value;
  }
}

function castIntegerParameter(parameterName: string, value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) {
    return Number(value);
  }

  throw new Error(`Parameter ${parameterName} must be an integer.`);
}

function castNumberParameter(parameterName: string, value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const numberValue = Number(value);

    if (Number.isFinite(numberValue)) {
      return numberValue;
    }
  }

  throw new Error(`Parameter ${parameterName} must be a number.`);
}

function castBooleanParameter(parameterName: string, value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    switch (value.toLowerCase()) {
      case 'true':
      case '1':
      case 'yes':
        return true;
      case 'false':
      case '0':
      case 'no':
        return false;
    }
  }

  throw new Error(`Parameter ${parameterName} must be a boolean.`);
}

function normalizeInputParameterFiles(parameterName: string, value: unknown): string | string[] {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
    return value;
  }

  throw new Error(`Parameter ${parameterName} is an input file parameter and must be a file path.`);
}

function getSecondaryUploadTaskName(parameterName: string, index: number): string {
  return `upload-${parameterName}-${index}`;
}

function resolveUploadFilePath(file: string): string {
  if (file === '~') {
    return homedir();
  }

  if (file.startsWith('~/')) {
    return join(homedir(), file.slice(2));
  }

  return file;
}

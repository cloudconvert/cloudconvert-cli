import type { ReadStream } from 'node:fs';

export type ParameterValues = Record<string, unknown>;

export interface CliArguments {
  apikey: string;
  sandbox: boolean;
  outputdir?: string;
  overwrite: boolean;
  parameter?: ParameterValues;
  files?: string[];
  format?: string;
  url?: string;
  cloudconvert: CloudConvertClient;
}

export interface TaskData extends ParameterValues {
  operation: string;
  input?: string | string[];
  output_format?: string;
  url?: string;
}

export interface JobTask {
  name: string;
  operation: string;
  status?: string;
  message?: string | null;
  code?: string | null;
  result?: {
    files?: ExportedFile[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface Job {
  id: string;
  tasks: JobTask[];
  [key: string]: unknown;
}

export interface ExportedFile {
  filename: string;
  url?: string;
  [key: string]: unknown;
}

export interface JobEvent {
  job: Job;
}

export interface TaskEvent {
  task: JobTask;
}

export interface CloudConvertClient {
  call(method: 'GET' | 'POST' | 'DELETE', route: string, parameters?: object): Promise<unknown>;
  jobs: {
    create(data: JobTemplate): Promise<Job>;
    get(id: string): Promise<Job>;
    subscribeEvent(
      id: string,
      event: 'finished' | 'failed' | string,
      callback: (event: JobEvent) => void
    ): Promise<void> | void;
    subscribeTaskEvent(
      id: string,
      event: 'failed' | string,
      callback: (event: TaskEvent) => void
    ): Promise<void> | void;
  };
  tasks: {
    upload(task: JobTask, stream: ReadStream, filename?: string, fileSize?: number): Promise<unknown>;
  };
  users: {
    me(): Promise<{ credits: number }>;
  };
  closeSocket?: () => void;
  socket?: {
    close?: () => void;
    on?: (event: 'error' | string, callback: (error: Error) => void) => void;
  };
}

export interface JobTemplate {
  tasks: Record<string, TaskData>;
}

export interface CloudConvertOperationOption {
  name: string;
  type: string;
  description?: string;
  default?: unknown;
  possible_values?: unknown[];
}

export interface CloudConvertOperation {
  operation: string;
  input_format?: string;
  output_format?: string;
  engine?: string;
  options?: CloudConvertOperationOption[];
}

export interface Logger {
  info(message: string): void;
  error(message: string): void;
}

export interface Spinner {
  text: string;
  succeed(message: string): void;
  fail(message: string): void;
}


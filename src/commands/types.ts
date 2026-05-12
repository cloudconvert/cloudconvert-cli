import type { CliArguments, Job, TaskData } from '../types.js';

export type JobRunner = (argv: CliArguments, taskData: TaskData) => Promise<Job>;

import type { Argv } from 'yargs';

import type { CliArguments, ParameterValues } from '../types.js';

interface CliArgumentsWithTaskParameters extends CliArguments {
  taskParameters?: ParameterValues;
}

interface YargsParserOptions {
  key?: Record<string, boolean>;
  alias?: Record<string, string[]>;
}

interface ArgvWithParserOptions<T> extends Argv<T> {
  getOptions(): YargsParserOptions;
}

export function collectTaskParameters(argv: CliArguments): ParameterValues {
  const cliArguments = argv as CliArgumentsWithTaskParameters;

  return {
    ...(cliArguments.taskParameters ?? {}),
    ...(cliArguments.parameter ?? {})
  };
}

export function addTaskParameterMiddleware<T>(yargs: Argv<T>): Argv<T> {
  const knownArgumentKeys = getKnownArgumentKeys(yargs);

  return yargs.middleware(argv => {
    const cliArguments = argv as unknown as CliArgumentsWithTaskParameters;
    cliArguments.taskParameters = collectDynamicTaskParameters(argv, knownArgumentKeys);
  });
}

function getKnownArgumentKeys<T>(yargs: Argv<T>): Set<string> {
  const { key = {}, alias = {} } = (yargs as ArgvWithParserOptions<T>).getOptions();
  const knownArgumentKeys = new Set(['_', '$0', 'taskParameters']);

  for (const optionName of Object.keys(key)) {
    knownArgumentKeys.add(optionName);
    knownArgumentKeys.add(toCamelCase(optionName));
  }

  for (const aliasNames of Object.values(alias)) {
    for (const aliasName of aliasNames) {
      knownArgumentKeys.add(aliasName);
      knownArgumentKeys.add(toCamelCase(aliasName));
    }
  }

  return knownArgumentKeys;
}

function toCamelCase(optionName: string): string {
  return optionName.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function collectDynamicTaskParameters(argv: object, knownArgumentKeys: Set<string>): ParameterValues {
  const parameters: ParameterValues = {};

  for (const [key, value] of Object.entries(argv)) {
    if (!knownArgumentKeys.has(key) && value !== undefined) {
      parameters[key] = value;
    }
  }

  return parameters;
}

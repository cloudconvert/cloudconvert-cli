import logSymbols from 'log-symbols';
import type { CommandModule } from 'yargs';

import type { CliArguments } from '../types.js';

export function createCreditsCommand(): CommandModule<object, object> {
  return {
    command: 'credits',
    aliases: ['minutes'],
    describe: 'Print the remaining conversion credits of your account',
    builder: yargs => yargs.hide('version').hide('outputdir').hide('overwrite').hide('parameter'),
    handler: async rawArgv => {
      const argv = rawArgv as unknown as CliArguments;
      const me = await argv.cloudconvert.users.me();
      console.log(logSymbols.info, `Conversion credits: ${me.credits}`);
    }
  };
}

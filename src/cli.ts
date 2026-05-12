#!/usr/bin/env node

import { hideBin } from 'yargs/helpers';

import { runCli } from './app.js';

await runCli(hideBin(process.argv));

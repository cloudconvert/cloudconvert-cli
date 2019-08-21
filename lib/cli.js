#!/usr/bin/env node

const logSymbols = require('log-symbols');

require('yargs')
    .scriptName('cloudconvert')
    .command(require('./commands/convert'))
    .command(require('./commands/optimize'))
    .command(require('./commands/merge'))
    .command(require('./commands/capture-website'))
    .command(require('./commands/minutes'))
    .demandCommand()
    .option('apikey', {
        describe: 'Set the API key. You can get your API key here: https://cloudconvert.com/dashboard/api/v2/keys',
        type: 'string',
        default: process.env.CLOUDCONVERT_API_KEY,
        defaultDescription: 'CLOUDCONVERT_API_KEY enviroment variable',
        required: true,
        global: true
    })
    .option('sandbox', {
        describe: 'Use the CloudConvert Sandbox API',
        type: 'boolean',
        default: false,
        global: true
    })
    .option('outputdir', {
        describe: 'Set the directory for storing the output files. defaults to the working directory',
        type: 'string',
        global: true
    })
    .option('overwrite', {
        describe: 'Allow overwriting existing files',
        type: 'boolean',
        default: false,
        global: true
    })
    .option('parameter', {
        alias: 'p',
        describe: 'Send custom parameters with the task payload. Use the dot notation, for example: -p.engine=office',
        global: true
    })
    .middleware(require('./middleware/cloudconvert'))
    .middleware(require('./middleware/files'))
    .fail(function (message, err, yargs) {

        if (err) {

            message = 'Error: ' + err.message;

            if (err.response && err.response.data && err.response.data.message) {
                message = 'API Error: ' + err.response.data.message + ' (Code: ' + (err.response.data.code || 'UNKNOWN_ERROR') + ')';
            }

        } else {
            console.log(yargs.help());
        }

        console.error('\n' + logSymbols.error, message);
        process.exit(1);

    })
    .help()
    .detectLocale(false)
    .epilogue('For more information, find our manual at https://github.com/cloudconvert/cloudconvert-cli')
    .argv

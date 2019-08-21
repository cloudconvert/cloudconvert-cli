const
    processJob = require('../job');

exports.command = 'convert <files..>';
exports.desc = 'Convert files to an output format';
exports.builder = (yargs) => {

    return yargs
        .positional('files', {
            description: 'Path(s) to file(s) to convert'
        })
        .option('format', {
            alias: 'f',
            describe: 'Set the output format',
            required: true
        })
        .example('cloudconvert convert -f png input.pdf')
        .example('cloudconvert convert --outputdir output/ -f png directory/*')
        .example('cloudconvert convert -f png -p.pages=1-1 -p.width=600 input.pdf')
        .help()
        .hide('version')


};
exports.handler = async (argv) => {

    if (argv.files.length === 0) {
        throw new Error('You need to provide at least one file!');
    }


    await processJob(argv, {
        'operation': 'convert',
        'output_format': argv.format,
        ...argv.parameter
    })


}

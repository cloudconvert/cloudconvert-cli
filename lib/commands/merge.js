const
    processJob = require('../job');

exports.command = 'merge <files..>';
exports.desc = 'Merge files to a single PDF';
exports.builder = (yargs) => {

    return yargs
        .positional('files', {
            description: 'Paths to files to merge'
        })
        .option('format', {
            alias: 'f',
            describe: 'Set the output format',
            default: 'pdf',
            required: true
        })
        .example('cloudconvert merge file1.pdf file2.pdf')
        .example('cloudconvert merge --outputdir output/ directory/*')
        .help()
        .hide('version')


};
exports.handler = async (argv) => {

    if (argv.files.length < 2) {
        throw new Error('You need to provide at least two files!');
    }


    await processJob(argv, {
        'operation': 'merge',
        'output_format': argv.format,
        ...argv.parameter
    })


}

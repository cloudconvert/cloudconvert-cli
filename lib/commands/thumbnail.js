const
    processJob = require('../job');

exports.command = 'thumbnail <files..>';
exports.desc = 'Create thumbnails';
exports.builder = (yargs) => {

    return yargs
        .positional('files', {
            description: 'Path(s) to file(s) to convert'
        })
        .option('format', {
            alias: 'f',
            describe: 'Set the thumbnail format',
            default: 'png',
            required: true
        })
        .example('cloudconvert thumbnail input.pdf')
        .example('cloudconvert thumbnail -f jpg --outputdir output/ directory/*')
        .example('cloudconvert thumbnail -f jpg -p.width=200 -p.height=200 -p.fit=crop input.pdf')
        .help()
        .hide('version')


};
exports.handler = async (argv) => {

    if (argv.files.length === 0) {
        throw new Error('You need to provide at least one file!');
    }


    await processJob(argv, {
        'operation': 'thumbnail',
        'output_format': argv.format,
        ...argv.parameter
    })


}

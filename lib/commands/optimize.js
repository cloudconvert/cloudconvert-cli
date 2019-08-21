const
    processJob = require('../job');

exports.command = 'optimize <files..>';
exports.desc = 'Optimize and compress files';
exports.builder = (yargs) => {

    return yargs
        .positional('files', {
            description: 'Path(s) to file(s) to optimize'
        })
        .example('cloudconvert optimize input.pdf')
        .example('cloudconvert optimize --outputdir output/ -f png directory/*')
        .example('cloudconvert optimize -p.profile=print input.pdf')
        .help()
        .hide('version')


};
exports.handler = async (argv) => {

    if (argv.files.length === 0) {
        throw new Error('You need to provide at least one file!');
    }


    await processJob(argv, {
        'operation': 'optimize',
        ...argv.parameter
    })


}

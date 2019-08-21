const
    processJob = require('../job');

exports.command = 'capture-website <url>';
exports.desc = 'Capture a website as PDF, PNG or JPG';
exports.builder = (yargs) => {

    return yargs
        .positional('url', {
            description: 'URL of the website'
        })
        .option('format', {
            alias: 'f',
            describe: 'Set the output format',
            default: 'pdf',
            required: true
        })
        .example('cloudconvert capture-website https://www.google.com')
        .example('cloudconvert capture-website -f png -p.screen_width=1000 https://www.google.com')
        .help()
        .hide('version')


};
exports.handler = async (argv) => {


    await processJob(argv, {
        'operation': 'capture-website',
        'output_format': argv.format,
        'url': argv.url,
        ...argv.parameter
    })


}

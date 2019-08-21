
const logSymbols = require('log-symbols');

exports.command = 'minutes';
exports.desc = 'Print the remaining conversion minutes of your account';
exports.builder = (yargs) => {


    yargs
        .hide('version')
        .hide('outputdir')
        .hide('parameter');

};
exports.handler = async (argv) => {

    const me = await argv.cloudconvert.users.me();
    console.log(logSymbols.info, 'Conversion minutes: ' + me.credits);

}

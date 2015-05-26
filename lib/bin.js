#!/usr/bin/env node

program = require('commander'), glob = require("glob"), require('pkginfo')(module, 'version'), Cli = require("./cli.js");

files = [];

program
    .option('-f, --format <format>','set the output format the file(s) should be converted to')
    .option('-c, --converteroption <option>=<value>','set a converter option. example: -c page_range=1-2', function collect(val, memo) {
            memo[val.split("=")[0]] = val.split("=")[1];
            return memo;
        } ,  {})
    .option('-p, --preset <id>','use a preset of conversion options. Presets can be managed here: https://cloudconvert.com/preset')
    .option('-o, --outputdir <directory>','set the directory for storing the output files. defaults to the working directory', '.')
    .option('--apikey <value>','set the API key. alternatively you can use the CLOUDCONVERT_API_KEY enviroment variable. You can get your API key here: https://cloudconvert.com/user/profile', process.env.CLOUDCONVERT_API_KEY)
    .option('--concurrent <n>','limit to n concurrent conversions. defaults to 5', parseInt, 5)
    .version(module.exports.version)
    .arguments('[files...]')
    .action(function (argFiles) {
        if (argFiles) {
            argFiles.forEach(function (argFile) {
                files = files.concat(glob.sync(argFile, {
                        nodir: true
                }));
            });
        }
    })
    .on('--help', function(){
        console.log('  Examples:');
        console.log('');
        console.log('    $ cloudconvert -f jpg ../test/*.pdf');
        console.log('    $ cloudconvert -f jpg -c page_range=1-1 test.pdf');
        console.log('');
    })
    .parse(process.argv);



if (files.length == 0) {
    program.help();
}


cli = new Cli();

if(program.format) {
    cli.convertFiles(files);
} else {
    cli.findPossibleFormats(files);
}

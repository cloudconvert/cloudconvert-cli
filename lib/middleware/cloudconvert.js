const CloudConvert = require('cloudconvert');

module.exports = (argv) => {

    return {
        'cloudconvert': new CloudConvert(argv.apikey, argv.sandbox)
    };

};

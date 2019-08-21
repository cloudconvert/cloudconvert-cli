const glob = require('glob');

module.exports = (argv) => {

    if (!argv.files) {
        return;
    }

    let files = [];
    argv.files.forEach(function (file) {
        files = files.concat(glob.sync(file, {
            nodir: true
        }));
    });

    return {
        files
    };

};

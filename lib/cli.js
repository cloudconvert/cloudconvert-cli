async = require("async"), path = require('path'), fs = require('fs'), multibar = new (require('./multibar.js'))();


function Cli() {
    this.cloudconvert = new (require('cloudconvert'))(program.apikey);
}


/*
 * Convert given input files
 */

Cli.prototype.convertFiles = function(files) {

    var self = this;

    async.mapLimit(files, program.concurrent, function (file, callback) {


        var inputformat = self.getFileExtension(file);
        var outputformat = program.format;


        var bar = multibar.newBar(self.padToFixedStringWidth(file, 30) + '  ->  ' + outputformat + '  [:bar] :percent  :message', {
            total: 100,
            width: 50
        });

        bar.update(0, {
            "message": "Starting..."
        });

        fs.createReadStream(file).pipe(self.cloudconvert.convert({
            inputformat: inputformat,
            outputformat: outputformat,
            converteroptions: program.converteroption,
            preset: program.preset
        }).on('progress', function(data) {
            var percent = parseFloat(data.percent / 100);
            if(typeof percent != 'number' || percent <0 || percent >= 1.0)
                percent = 0.99;
            bar.update(percent, {
                "message": data.message
            });
        }).on('error', function(err) {
            bar.update(0, {
                "message": err
            });
            bar.terminate();
            callback(null, false);
        }).on('finished', function(data) {
            this.downloadAll(program.outputdir);
        }).on('downloaded', function(destination) {

        }).on('downloadedAll', function(path) {
            bar.update(1.0, {
                "message": "Conversion finished!"
            });
            callback(null, true);
        }));

    }, function(err, results) {
        var success = 0;
        var failed = 0;
        results.forEach(function(result) {
            if(result)
                success++;
            else
                failed++;
        });
        var text = success + " of " + (success + failed) + " conversions completed successfully.";
        if(failed > 0) {
            console.error(text);
        } else {
            console.log(text);
        }
    });
}


/*
 * Find possible output formats for given files
 */

Cli.prototype.findPossibleFormats = function(files) {

    var self = this;

    console.log("The file(s) can be converted to the following output formats using the -f argument:");


    async.mapLimit(files, program.concurrent, function (file, callback) {

        var inputformat = self.getFileExtension(file);
        self.cloudconvert.get("/conversiontypes", {
            inputformat: inputformat
        }, function(err, data) {
            if(err || data.length == 0) {
                console.log(self.padToFixedStringWidth(file, 30) + " -> " + (err ? err : "this file type is not supported"));
            } else {
                var formats = [];
                data.forEach(function(d) {
                    formats.push(d.outputformat);
                });
                console.log(self.padToFixedStringWidth(file, 30) + " -> " + formats.join(", "));
            }
            callback();
        });

    });

}


/*
 * Some helper functions
 */

Cli.prototype.getFileExtension = function(filename) {
    return path.extname(filename).substr(1);
}


Cli.prototype.padToFixedStringWidth = function(string, width) {
    if(string.length > width) {
        string = "..." + string.substr(string.length - width + 3);
    } else if(string.length < width) {
        while(string.length < width)
            string+=" ";
    }
    return string;
}


module.exports = Cli;
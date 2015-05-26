// source: https://gist.github.com/nuxlli/b425344b92ac1ff99c74

var ProgressBar = require('progress');

function Multibar(stream) {
    this.stream     = stream || process.stderr;
    this.cursor     = 0;
    this.bars       = [];
    this.terminates = 0;
}

Multibar.prototype = {
    newBar: function(schema, options) {
        options.stream = this.stream;
        var bar = new ProgressBar(schema, options);
        this.bars.push(bar);
        var index = this.bars.length - 1;

        // alloc line
        this.move(index);
        this.stream.write('\n');
        this.cursor ++;

        // replace original
        var self  = this;
        bar.otick = bar.tick;
        bar.oterminate = bar.terminate;
        bar.tick = function(value, options) {
            self.tick(index, value, options);
        }
        bar.terminate = function() {
            self.terminates++;
            if (self.terminates == self.bars.length) {
                self.terminate();
            }
        }

        return bar;
    },

    terminate: function() {
        this.move(this.bars.length);
        this.stream.clearLine();
        this.stream.cursorTo(0);
    },

    move: function(index) {
        if (!this.stream.isTTY) return;
        this.stream.moveCursor(0, index - this.cursor);
        this.cursor = index;
    },

    tick: function(index, value, options) {
        var bar = this.bars[index];
        if (bar) {
            this.move(index);
            bar.otick(value, options);
        }
    }
}

module.exports =Multibar;
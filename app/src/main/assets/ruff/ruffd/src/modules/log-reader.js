'use strict';

var EventEmitter = require('events');
var util = require('util');
var Poll = require('poll');

function FileReader(handle) {
    EventEmitter.call(this);

    throw new Error('Not implemented');
}

util.inherits(FileReader, EventEmitter);

function FIFOReader(handle) {
    EventEmitter.call(this);

    this.handle = handle;
    this.pollHandle = new Poll(handle);
}

util.inherits(FIFOReader, EventEmitter);

FIFOReader.prototype.start = function () {
    var that = this;

    this.pollHandle.start(Poll.READ_EVENT, function(err, event) {
        if (!err && event === Poll.READ_EVENT) {
            that._read();
        }
    });
};

FIFOReader.prototype._read = function () {
    var that = this;

    var data;

    try {
        data = uv.fs_read(this.handle, 1024, -1);
    } catch (error) {
        console.error(error);
    }

    if (data) {
        that.emit('data', data);
    }
};

function LogReader(path) {
    EventEmitter.call(this);

    try {
        this.fileHandle = uv.fs_open(path, 'rn', parseInt('644', 8));
    } catch (error) {
        console.error('Failed to open log file "' + path +'".');
        console.error(error);
        return;
    }

    var stats = uv.fs_fstat(this.fileHandle);

    if (stats.type === 'file') {
        this.reader = new FileReader(this.fileHandle);
    } else if (stats.type === 'fifo') {
        this.reader = new FIFOReader(this.fileHandle);
    } else {
        throw new Error('Unknown log file type "' + stats.type + '"');
    }

    var that = this;

    this.reader.on('data', function (data) {
        that.emit('log', data.toString());
    });
}

util.inherits(LogReader, EventEmitter);

LogReader.prototype.start = function () {
    this.reader.start();
};

module.exports = LogReader;

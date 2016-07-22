/*!
 * Copyright (c) 2015-2016, Nanchao, Inc.
 * All rights reserved.
 */

'use strict';
var Poll = require('poll');
var util = require('util');
var EventEmitter = require('events');

function ReadHelper(filePath, flag) {
    EventEmitter.call(this);
    this._fd = uv.fs_open(filePath, flag, parseInt('666', 8));
    this._poll = new Poll(this._fd);
}

util.inherits(ReadHelper, EventEmitter);

ReadHelper.prototype.start = function (chunkSize) {
    var that = this;

    if (!chunkSize) {
        chunkSize = 1024;
    }

    this._poll.start(Poll.READ_EVENT, function (error, event) {
        if (!error && event === Poll.READ_EVENT) {
            var data = uv.fs_read(that._fd, chunkSize, -1);
            that.emit('data', data);
        } else {
            that.emit('error', error);
        }
    });
};

ReadHelper.prototype.stop = function () {
    this._poll.stop();
};

ReadHelper.prototype.close = function (callback) {
    var that = this;
    this._poll.close(function (error) {
        uv.fs_close(that._fd);
        callback(error);
    });
};

module.exports = ReadHelper;

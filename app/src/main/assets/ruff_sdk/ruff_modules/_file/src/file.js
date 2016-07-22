/*!
 * Copyright (c) 2015-2016, Nanchao, Inc.
 * All rights reserved.
 */

'use strict';

var Util = require('util');
var BaseFile = require('./_basefile.js');
var Helper = require('./_helper.js');
var Async = require('./_async.js');

var DEFAULT_FILE_MODE = parseInt('0644', 8);

function File(path) {
    BaseFile.call(this, path);

    this._fd = -1;

    Object.defineProperties(this, {
        opened: {
            get: function () {
                return this._fd >= 0;
            }
        }
    });
}

Util.inherits(File, BaseFile);

File.prototype.open = function (flags) {
    // retrive optional `mode` and required `callback`
    var mode = null;
    var callback = null;
    switch (arguments.length) {
        case 2:
            callback = arguments[1];
            break;
        case 3:
            mode = arguments[1];
            callback = arguments[2];
            break;
        default:
            break;
    }

    // validate arguments
    Helper.checkObjectType(flags, 'string', 'flags');
    if (mode === null) {
        mode = DEFAULT_FILE_MODE;
    } else {
        Helper.checkObjectType(mode, 'number', 'mode');
    }
    Helper.checkObjectType(callback, 'function', 'callback');

    // try to open
    var that = this;
    var funcs = [];
    if (that._fd >= 0) {
        funcs.push(function (succ) {
            function uvCallback(ok, err) {
                if (err) {
                    callback(err);
                } else {
                    succ();
                }
            }
            uv.fs_close(that._fd, uvCallback);
        });
    }
    funcs.push(function () {
        function uvCallback(fd, err) {
            if (!err) {
                that._fd = fd;
            }
            callback(err);
        }
        uv.fs_open(that._path, flags, mode, uvCallback);
    });
    Async.series(funcs);
};

File.prototype.openSync = function (flags, mode) {
    Helper.checkObjectType(flags, 'string', 'flags');
    if (typeof mode === 'undefined') {
        mode = DEFAULT_FILE_MODE;
    } else {
        Helper.checkObjectType(mode, 'number', 'mode');
    }

    if (this._fd >= 0) {
        this.closeSync();
    }
    var fd = uv.fs_open(this._path, flags, mode);
    if (fd < 0) {
        throw new Error('Failed to open file: ' + this._path);
    }
    this._fd = fd;
};

File.prototype.close = function (callback) {
    Helper.checkObjectType(callback, 'function', 'callback');
    var that = this;
    function uvCallback(ok, err) {
        that._fd = -1;
        that._path = '';
        callback(err);
    }
    uv.fs_close(that._fd, uvCallback);
};

File.prototype.closeSync = function () {
    uv.fs_close(this._fd);
    this._fd = -1;
    this._path = '';
};

File.prototype.flushSync = function () {
    Helper.checkFd(this._fd);
    uv.fs_fsync(this._fd);
};

File.prototype.flush = function (callback) {
    Helper.checkFd(this._fd);
    Helper.checkObjectType(callback, 'function', 'callback');
    function uvCallback(err) {
        callback(err);
    }
    uv.fs_fsync(this._fd, uvCallback);
};

File.prototype.read = function (size, offset, callback) {
    Helper.checkFd(this._fd);
    Helper.checkObjectType(size, 'number', 'size');
    Helper.checkObjectType(offset, 'number', 'offset');
    Helper.checkObjectType(callback, 'function', 'callback');
    function uvCallback(uvBuffer, err) {
        var args = [err];
        if (!err) {
            args.push(new Buffer(uvBuffer));
        }
        callback.apply(this, args);
    }
    uv.fs_read(this._fd, size, offset, uvCallback);
};

File.prototype.readSync = function (size, offset) {
    Helper.checkFd(this._fd);
    Helper.checkObjectType(size, 'number', 'size');
    Helper.checkObjectType(offset, 'number', 'offset');
    var uvBuffer = uv.fs_read(this._fd, size, offset);
    return new Buffer(uvBuffer);
};

File.prototype.write = function (data, offset, callback) {
    Helper.checkFd(this._fd);
    Helper.checkData(data);
    Helper.checkObjectType(offset, 'number', 'offset');
    Helper.checkObjectType(callback, 'function', 'callback');
    function uvCallback(written, err) {
        if (err) {
            written = 0;
        }
        callback(err, written, new Buffer(data));
    }
    var uvBuffer = Util._toDuktapeBuffer(data);
    uv.fs_write(this._fd, uvBuffer, offset, uvCallback);
};

File.prototype.writeSync = function (data, offset) {
    Helper.checkFd(this._fd);
    Helper.checkData(data);
    Helper.checkObjectType(offset, 'number', 'offset');
    var uvBuffer = Util._toDuktapeBuffer(data);
    return uv.fs_write(this._fd, uvBuffer, offset);
};

File.prototype.resize = function (size, callback) {
    Helper.checkFd(this._fd);
    Helper.checkObjectType(size, 'number', 'size');
    Helper.checkObjectType(callback, 'function', 'callback');
    function uvCallback(ok, err) {
        callback(err);
    }
    uv.fs_ftruncate(this._fd, size, uvCallback);
};

File.prototype.resizeSync = function (size) {
    // NOTE: uv.fs_ftruncate() won't throw if fd < 0
    Helper.checkFd(this._fd);
    Helper.checkObjectType(size, 'number', 'size');
    uv.fs_ftruncate(this._fd, size);
};

/*
 * NOTE: following methods do not rely on fd
 */

File.prototype.delete = function (callback) {
    Helper.checkObjectType(callback, 'function', 'callback');
    function uvCallback(ok, err) {
        callback(err);
    }
    uv.fs_unlink(this._path, uvCallback);
};

File.prototype.deleteSync = function () {
    uv.fs_unlink(this._path);
};

File.prototype.rename = function (path, callback) {
    Helper.checkObjectType(path, 'string', 'path');
    Helper.checkObjectType(callback, 'function', 'callback');
    function uvCallback(ok, err) {
        callback(err);
    }
    uv.fs_rename(this._path, path, uvCallback);
};

File.prototype.renameSync = function (path) {
    Helper.checkObjectType(path, 'string', 'path');
    var ok = uv.fs_rename(this._path, path);
    if (ok) {
        this._path = path;
    } else {
        throw new Error('Failed to rename to ' + path);
    }
};

module.exports = File;

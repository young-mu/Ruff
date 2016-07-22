/*!
 * Copyright (c) 2015-2016, Nanchao, Inc.
 * All rights reserved.
 */

'use strict';

var Path = require('path');
var Helper = require('./_helper.js');

var BaseFile = function (path) {
    Helper.checkObjectType(path, 'string', 'path');

    this._path = Path.normalize(path);

    Object.defineProperties(this, {
        'path': {
            get: function () {
                return this._path;
            }
        },
        'relativePath': {
            get: function () {
                if (Path.isAbsolute(this._path)) {
                    return Path.normalize(Path.relative(uv.cwd(), this._path));
                } else {
                    return this._path;
                }
            }
        },
        'absolutePath': {
            get: function () {
                if (Path.isAbsolute(this._path)) {
                    return this._path;
                } else {
                    return Path.normalize(Path.join(uv.cwd(), this.path));
                }
            }
        }
    });
};

function genIsAccessable(mode) {
    Helper.checkObjectType(mode, 'string', 'mode');
    return function () {
        try {
            uv.fs_access(this._path, mode);
            return true;
        } catch (e) {
            return false;
        }
    };
}

BaseFile.prototype.isReadable = genIsAccessable('r');
BaseFile.prototype.isWritable = genIsAccessable('w');
BaseFile.prototype.isExecutable = genIsAccessable('x');

BaseFile.prototype.access = function (mode, callback) {
    Helper.checkObjectType(mode, 'string', 'mode');
    Helper.checkObjectType(callback, 'function', 'callback');
    function uvCallback(ok, err) {
        callback(err);
    }
    uv.fs_access(this._path, mode, uvCallback);
};

BaseFile.prototype.accessSync = function (mode) {
    Helper.checkObjectType(mode, 'string', 'mode');
    return uv.fs_access(this._path, mode);
};

BaseFile.prototype.stat = function (callback) {
    Helper.checkObjectType(callback, 'function', 'callback');
    function uvCallback(stat, err) {
        callback(err, stat);
    }
    uv.fs_stat(this._path, uvCallback); // follow link
};

BaseFile.prototype.statSync = function () {
    return uv.fs_stat(this._path); // follow link
};

module.exports = BaseFile;

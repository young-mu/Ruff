/*!
 * Copyright (c) 2015-2016, Nanchao, Inc.
 * All rights reserved.
 */

'use strict';

var Util = require('util');
var Path = require('path');
var BaseFile = require('./_basefile.js');
var Helper = require('./_helper.js');

var DEFAULT_DIR_MODE = parseInt('0744', 8);

function Dir(path) {
    BaseFile.call(this, path);
}

Util.inherits(Dir, BaseFile);

function existsSync() {
    try {
        var stat = uv.fs_stat(this._path); // follow link
        return stat.type === 'directory';
    } catch (e) {
        return false;
    }
}

Dir.prototype.mkdir = function () {
    // retrive optional `mode` and required `callback`
    switch (arguments.length) {
        case 1:
            Array.prototype.splice.call(arguments, 0, 0, DEFAULT_DIR_MODE);
            break;
        default:
            break;
    }
    var mode = arguments[0];
    var callback = arguments[1];
    // validate arguments
    Helper.checkObjectType(mode, 'number', 'mode');
    Helper.checkObjectType(callback, 'function', 'callback');
    // try to mkdir
    function uvCallback(ok, err) {
        callback(err);
    }
    uv.fs_mkdir(this._path, mode, uvCallback);
};

Dir.prototype.mkdirSync = function (mode) {
    if (typeof mode === 'undefined') {
        mode = DEFAULT_DIR_MODE;
    } else {
        Helper.checkObjectType(mode, 'number', 'mode');
    }
    uv.fs_mkdir(this._path, mode);
};

Dir.prototype.mkdirsSync = function (mode) {
    if (typeof mode === 'undefined') {
        mode = DEFAULT_DIR_MODE;
    } else {
        Helper.checkObjectType(mode, 'number', 'mode');
    }
    var todos = [];
    for (var todo = Path.resolve(this._path);
            todo !== '/'; todo = Path.dirname(todo)) {
        if (existsSync.call(new Dir(todo))) {
            break;
        }
        todos.push(todo);
    }
    for (var i = todos.length-1; i >= 0; --i) {
        uv.fs_mkdir(todos[i], mode);
    }
};

Dir.prototype.delete = function (callback) {
    Helper.checkObjectType(callback, 'function', 'callback');
    function uvCallback(ok, err) {
        callback(err);
    }
    uv.fs_rmdir(this._path, uvCallback);
};

Dir.prototype.deleteSync = function () {
    uv.fs_rmdir(this._path);
};

Dir.prototype.deleteRecursiveSync = function () {
    if (!existsSync.call(this)) {
        throw new Error('Directory does not exist: "' + this._path + '"');
    }
    var items = this.listSync();
    for (var i = 0; i < items.length; ++i) {
        var itemType = items[i].type;
        var itemPath = Path.join(this._path, items[i].name);
        if (itemType === 'directory') {
            (new Dir(itemPath)).deleteRecursiveSync();
        } else {
            uv.fs_unlink(itemPath);
        }
    }
    uv.fs_rmdir(this._path);
};

Dir.prototype.cd = function (path, callback) {
    Helper.checkObjectType(path, 'string', 'path');
    Helper.checkObjectType(callback, 'function', 'callback');

    if (!Path.isAbsolute(path)) {
        path = Path.normalize(Path.join(this._path, path));
    }
    var targetDir = new Dir(path);

    var self = this;
    function uvCallback(stat, err) {
        if (!err) {
            if (stat.type !== 'directory') {
                err = new Error('Directory does not exist');
            } else {
                self._path = targetDir.path;
            }
        }
        callback(err);
    }
    uv.fs_stat(targetDir.path, uvCallback); // follow link
};

Dir.prototype.cdSync = function (path) {
    Helper.checkObjectType(path, 'string', 'path');

    if (!Path.isAbsolute(path)) {
        path = Path.normalize(Path.join(this._path, path));
    }
    var targetDir = new Dir(path);

    if (existsSync.call(targetDir)) {
        this._path = targetDir.path;
    } else {
        throw new Error('Directory does not exist');
    }
};

Dir.prototype.list = function (callback) {
    var self = this;
    uv.fs_scandir(self._path, function (ent, err) {
        if (err) {
            callback(err);
        } else {
            var items = [];
            while (true) {
                var item = uv.fs_scandir_next(ent);
                if (!item) {
                    break;
                }
                items.push(item);
            }
            callback(err, items);
        }
    });
};

Dir.prototype.listSync = function () {
    var items = [];
    for (var ent = uv.fs_scandir(this._path); ent; ) {
        var item = uv.fs_scandir_next(ent);
        if (!item) {
            break;
        }
        items.push(item);
    }
    return items;
};

module.exports = Dir;

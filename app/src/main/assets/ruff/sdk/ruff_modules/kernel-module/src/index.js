/*!
 * Copyright (c) 2015-2016, Nanchao, Inc.
 * All rights reserved.
 */

'use strict';

var ReadHelper = require('./helper.js');

function KernelModule() {
}

KernelModule.prototype.list = function() {
    var fileName = '/proc/modules';
    var mode = parseInt('666', 8);
    var bufferList = [];
    var offset = 0;
    var data;
    var fd = uv.fs_open(fileName, 'r', mode);
    do {
        data = uv.fs_read(fd, 4096, offset);
        bufferList.push(new Buffer(data));
        offset += data.length;
    } while(data.length > 0);

    var contents = Buffer.concat(bufferList, offset).toString();

    var modulesInfoText = contents.split('\n');
    var modulesInfo = [];
    modulesInfoText.forEach(function(modData) {
        var modName = modData.split(/\s+/)[0];
        if (modName) {
            modulesInfo.push(modName);
        }
    });

    return modulesInfo;
};

KernelModule.prototype.install = function(name) { // jshint ignore:line
    // TODO:
    // ubox's `modprobe` does not support parameters
    var args = Array.prototype.slice.call(arguments);
    var cmdStr = args.length <= 1 ? '/usr/sbin/modprobe' : '/usr/sbin/insmod';
    uv.exec_sync(cmdStr, args);

    // NOTE:
    // module name may contain '-', while symbols doesn't,
    // therefore we need to replace '-' to '_' here
    var symbol = name.replace(/-/g, '_');
    var modules = this.list();
    if (modules.indexOf(symbol) >= 0) {
        return 0;
    } else {
        throw new Error('fail to load module ' + name);
    }
};

KernelModule.prototype.remove = function(name) {
    uv.exec_sync('/usr/sbin/rmmod', [name]);
};

var kernelModule = new KernelModule();
kernelModule.ReadHelper = ReadHelper;

module.exports = kernelModule;

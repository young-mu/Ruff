/*!
 * Copyright (c) 2015-2016, Nanchao, Inc.
 * All rights reserved.
 */

'use strict';

function checkObjectType(obj, type, hint) {
    if (typeof obj !== type) {
        throw new Error(hint + ' must be a ' + type);
    }
}

function checkData(data) {
    if (typeof data !== 'string' && !(data instanceof Buffer)) {
        throw new Error('data must be either a string or Buffer');
    }
}

function checkFd(fd) {
    if (fd < 0) {
        throw new Error('File is closed');
    }
}

exports.checkObjectType = checkObjectType;
exports.checkData = checkData;
exports.checkFd = checkFd;

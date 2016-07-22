/*!
 * Copyright (c) 2015-2016, Nanchao, Inc.
 * All rights reserved.
 */

'use strict';

var path = require('path');

var RuffBox = require('./ruff-box.js');

var ruffBoxFilePath = path.resolve('ruff_box.json');
var box = new RuffBox(ruffBoxFilePath);

function $() {
    return box.query.apply(box, arguments);
}

$.ready = function (callback) {
    // Event `ready` is always emitted asynchronously.
    box.on('ready', callback);
};

$.end = function (callback) {
    var sync = true;

    box.on('end', function () {
        // Ensure asynchronous callback.
        if (sync) {
            process.nextTick(callback);
        } else {
            callback();
        }
    });

    sync = false;
};

module.exports = $;

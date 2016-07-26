/*
 * Copyright (c) 2015 Nanchao Inc. All rights reserved.
 */

'use strict';

var fs = require('fs');
var path = require('path');

var config = require('../config.json');

var hop = Object.prototype.hasOwnProperty;

function Storage(filePath) {
    this.path = filePath;

    if (fs.existsSync(filePath)) {
        this.data = require(filePath);
    } else {
        this.data = {};
    }
}

Storage.prototype.get = function (key, defaultValue) {
    var value = hop.call(this.data, key) ?
        this.data[key] : undefined;

    if (value !== undefined) {
        return value;
    } else {
        return defaultValue;
    }
};

Storage.prototype.set = function (key, value) {
    if (typeof key === 'string') {
        this.data[key] = value;
    } else {
        var data = key;
        var storageData = this.data;

        Object
            .keys(data)
            .forEach(function (key) {
                storageData[key] = data[key];
            });
    }

    fs.writeFileSync(this.path, JSON.stringify(this.data));
};

Storage.default = new Storage(path.join(process.env.RUFF_PATH, config.deviceDataFileName));

module.exports = Storage;

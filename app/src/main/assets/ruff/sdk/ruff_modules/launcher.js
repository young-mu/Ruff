/*!
 * Copyright (c) 2015-2016, Nanchao, Inc.
 * All rights reserved.
 */

'use strict';
var path = require('path');

var tmpPath = '/data/data/com.young.ruff/tmp/';
var APP_START_FIFO_PATH = tmpPath + 'app_start';

function launch() {
    var ruffBox = require('ruff');

    Object.defineProperty(global, '$', {
        get: function () {
            return ruffBox;
        }
    });

    var appPackageFilePath = path.resolve('package.json');
    var appPackageData = require(appPackageFilePath);

    var entry = require.resolve(path.resolve(appPackageData.main || '.'));

    global.__appEntry = entry;

    var fd = uv.fs_open(APP_START_FIFO_PATH, 'wn', parseInt('666', 8));
    uv.fs_write(fd, 'started', -1);

    require(entry);
}

//trigger uv.run here to refresh timestamp for timers
uv.run();
launch();

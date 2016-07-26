/*!
 * Copyright (c) 2015-2016, Nanchao, Inc.
 * All rights reserved.
 */

'use strict';
var path = require('path');

var tmpPath = '/data/data/com.young.ruff/tmp/';

var PID_FILE_PATH = tmpPath + 'ruff_app.pid';
var APP_START_FIFO_PATH = tmpPath + 'app_start';

function checkandKillAppInstance() {
    var mode = parseInt('666', 8);
    uv.fs_stat(PID_FILE_PATH, function (data, err) { // jshint ignore:line
        var fd;
        if (data) {
            fd = uv.fs_open(PID_FILE_PATH, 'r', mode);
            var pid = uv.fs_read(fd, 1024, 0).toString();
            uv.fs_close(fd);

            pid = Number(pid);
            if (!isNaN(pid)) {
                uv.kill(pid, 9);
            }
        }

        fd = uv.fs_open(PID_FILE_PATH, 'w', mode);
        uv.fs_write(fd, uv.getpid().toString(), 0);
        uv.fs_close(fd);
    });
}

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

checkandKillAppInstance();
//trigger uv.run here to refresh timestamp for timers
uv.run();
launch();

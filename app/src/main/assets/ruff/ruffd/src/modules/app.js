'use strict';

var EventEmitter = require('events');
var fs = require('fs');
var path = require('path');
var Poll = require('poll');
var SDK_PATH = process.env.RUFF_SDK_PATH;

var app = new EventEmitter();

var tmpPath = '/data/data/com.young.ruff/tmp/';

app.deploymentPackagePath = tmpPath + 'app.tgz';
app.logPath = tmpPath + 'ruffapp.log';
app.startFifoPath = tmpPath + 'app_start';
app.path = process.env.RUFF_APP_PATH;
app.packageFilePath = path.join(app.path, 'package.json');
app.launcherPath = path.join(SDK_PATH, 'ruff_modules/launcher.js');

var appStartFileFd = uv.fs_open(app.startFifoPath, 'rn', parseInt('644', 8));
var appStartFilePollHandle = new Poll(appStartFileFd);

var status = fs.existsSync(app.packageFilePath) ?
    'not-started' : 'not-deployed';

var handle;
var startTime;

Object.defineProperties(app, {
    status: {
        get: function () {
            return status;
        }
    },
    handle: {
        get: function () {
            return handle;
        }
    },
    startTime: {
        get: function () {
            return startTime;
        }
    }
});

/**
 * @param status {'not-deployed' | 'not-started', 'started'} - Application status.
 * @param [handle] {Number} - Application process handle, required for status 'started'.
 */
app.updateStatus = function (newStatus, newHandle) {
    // TODO: add statuses 'starting' and 'stoping'.
    console.log('Updating status from ' + status + ' to ' + newStatus + '...');

    var eventType;

    switch (newStatus) {
        case 'not-deployed':
        case 'not-started':
            handle = undefined;
            startTime = undefined;

            if (status === 'starting' || status === 'started') {
                eventType = 'stop';
            }

            break;
        case 'starting':
            if (!newHandle) {
                throw new TypeError('Invalid application handle ' + newHandle);
            }

            handle = newHandle;
            startTime = Math.floor(uv.hrtime() / 1e6);

            if (status === 'starting') {
                return;
            }

            var pollStopped = false;

            appStartFilePollHandle.start(Poll.READ_EVENT, function (err, event) {
                    // TODO: pollStopped might not be necessary after we switched to synchronous fs_read.
                    if (!pollStopped && !err) {
                        try {
                            uv.fs_read(appStartFileFd, 1024, -1);

                            pollStopped = true;

                            app.updateStatus('started');
                            appStartFilePollHandle.stop();
                        } catch (error) {
                            console.error(error);
                        }
                    }
                }
            );

            eventType = 'start';
            break;
        case 'started':
            if (status !== 'starting') {
                return;
            }

            eventType = 'started';
            break;
        default:
            throw new TypeError('Invalid application status "' + status + '"');
    }

    status = newStatus;

    if (eventType) {
        app.emit(eventType);
    }
};

module.exports = app;

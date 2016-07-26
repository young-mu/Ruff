'use strict';

var fs = require('fs');
var net = require('net');

var app = require('../modules/app.js');
var ExpectedError = require('../modules/error.js').ExpectedError;

var tmpPath = '/data/data/com.young.ruff/tmp/';
var EXTRACT_APP_SCRIPT_PATH = tmpPath + 'extract_app.sh';
var DEFAULT_KILLING_TIMEOUT = 5000;

var appLogFileHandle;

try {
    appLogFileHandle = uv.fs_open(app.logPath, 'rw', parseInt('644', 8), 0);
} catch (error) {
    appLogFileHandle = -1;

    console.error('Error opening application log file.');
    console.error(error);
}

exports.start = function (options, callback) {
    switch (app.status) {
        case 'starting':
        case 'started':
            callback(new ExpectedError('Application has already been started', 3));
            return;
        case 'not-deployed':
            callback(new ExpectedError('Application has not been deployed', 1));
            return;
    }

    var args = [
        app.launcherPath,
        '--console'
    ];

    if (options.debug) {
        args.push('--debugger');
    }

    try {
        console.log('Starting application launcher with arguments `' + args.join(' ') + '` in "' + app.path + '".');

        var handle = uv.spawn(
            uv.exepath(),
            args,
            app.path,
            -1, // stdin
            appLogFileHandle, // stdout
            appLogFileHandle, // stderr
            function (code) {
                app.updateStatus('not-started');
                app.removeListener('started', onstarted);
                console.log('Application exited with code ' + code + '.');
            }
        );

        app.updateStatus('starting', handle);
        app.once('started', onstarted);
    } catch (error) {
        console.error('Application failed to start.');
        callback(new ExpectedError('Application failed to start', 2, error));
    }

    function onstarted() {
        callback();
    }
};

exports.stop = function (options, callback) {
    switch (app.status) {
        case 'not-deployed':
            callback(new ExpectedError('No application has been deployed yet', 1));
            return;
        case 'not-started':
            callback(new ExpectedError('Application has not been started yet', 3));
            return;
    }

    var stopEventListenersCount = app.listenerCount('stop');

    console.log('stopEventListenersCount', stopEventListenersCount);

    app.once('stop', onstop);

    if (stopEventListenersCount > 0) {
        startTimer();
        return;
    }

    var timer;

    try {
        console.log('Stopping application...');

        var signal = 2;
        uv.kill_process(app.handle, signal);

        startTimer();
    } catch (error) {
        console.error('Failed to stop application.');
        callback(new ExpectedError('Failed to stop application', 2, error));
    }

    function onstop() {
        clearTimeout(timer);
        console.log('Application exited.');

        app.updateStatus('not-started');

        callback();
    }

    function startTimer() {
        timer = setTimeout(function () {
            // TODO: redeunt app status checking?

            console.log('Killing application...');

            try {
                var signal = 9;
                uv.kill_process(app.handle, signal);
            } catch (e) { }
        }, DEFAULT_KILLING_TIMEOUT);
    }
};

exports.deploy = function (options, callback) {
    switch (app.status) {
        case 'starting':
        case 'started':
            callback(new ExpectedError('Application is currently running', 1));
            return;
    }

    download();

    function download() {
        var remote = options.remote;
        var hasError = false;

        console.log('Start downloading application package from ' + remote.ip + ':' + options.port + '...');

        var client  = net.connect(options.port, remote.ip, function () {
            console.log('Connected to rap server.');
        });

        var downloaded = 0;

        fs.writeFileSync(app.deploymentPackagePath, '');

        client.on('data', function (data) {
            downloaded += data.length;

            console.log('Downloaded ' + Math.floor(downloaded / 1024) + ' kB.');

            fs.appendFileSync(app.deploymentPackagePath, data);
            Duktape.gc();
        });

        client.on('end', function () {
            console.log("Application package downloading socket ended.");
        });

        client.on('close', function () {
            console.log("Application package downloading socket closed.");

            if (hasError) {
                return;
            }

            extract();
        });

        client.on('error', function (error) {
            hasError = true;
            callback(new ExpectedError('Failed to save application package', 2, error));
        });
    }

    function extract() {
        var script = '\
#!/system/bin/sh\n\
/system/bin/rm -fr ' + app.path + '\n\
/system/bin/mkdir -p ' + app.path + '\n\
cd ' + app.path + '\n\
/system/bin/tar -xf ' + app.deploymentPackagePath + '\n\
/system/bin/sync\n\
';

        fs.writeFile(EXTRACT_APP_SCRIPT_PATH, script, {
            mode: parseInt('755', 8)
        }, function (error) {
            if (error) {
                callback(new ExpectedError('Failed to extract application package', 2));
                return;
            }

            try {
                uv.spawn(EXTRACT_APP_SCRIPT_PATH, [], tmpPath, -1, -1, -1, function (code) {
                    if (code === 0) {
                        app.updateStatus('not-started');
                        callback();
                    } else {
                        callback(new ExpectedError('Failed to extract application package', 2));
                    }
                });
            } catch (error) {
                callback(new ExpectedError('Failed to extract application package', 2, error));
            }
        });
    }
};

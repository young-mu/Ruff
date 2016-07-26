'use strict';

var fs = require('fs');
var net = require('net');

var ExpectedError = require('../modules/error.js').ExpectedError;
var app = require('../modules/app.js');
var storage = require('../modules/storage.js').default;
var system = require('../modules/system.js');

var config = require('../config.json');
var packageData = require('../../package.json');

var TMP_FIRMWARE_PATH = '/tmp/ruffos.bin';

exports.ping = function (options, callback) {
    callback();
};

exports.preflight = function (options, callback) {
    callback(undefined, {
        features: {
            bytecode: true
        },
        version: packageData.version,
        minRapVersion: config.minRapVersion,
        tokenSetup: !!storage.get('auth-token')
    });
};

exports.setToken = function (options, callback) {
    storage.set('auth-token', options.newToken);
    callback();
};

exports.verifyToken = function (options, callback) {
    // Verification would actually be done by routing logic.
    callback();
};

exports.rename = function (options, callback) {
    var name = options.name;
    storage.set('device-name', name);
    callback();
};

exports.upgrade = function (options, callback) {
    var remote = options.remote;

    console.log('Start downloading firmware from ' + remote.ip + ':' + options.port + '...');

    var client  = net.connect(options.port, remote.ip, function () {
        console.log('Connected to rap server.');
    });

    var downloaded = 0;
    var hasError = false;

    fs.writeFileSync(TMP_FIRMWARE_PATH, '');

    client.on('data', function (data) {
        downloaded += data.length;

        console.log('Downloaded ' + Math.floor(downloaded / 1024) + ' kB.');

        fs.appendFileSync(TMP_FIRMWARE_PATH, data);
        Duktape.gc();
    });

    client.on('end', function () {
        console.log("Upgrade downloading socket ended.");
    });

    client.on('close', function () {
        console.log("Upgrade downloading socket closed.");

        if (hasError) {
            return;
        }

        try {
            uv.spawn('mtd', ['write', '/tmp/ruffos.bin', 'firmware'], '/', -1, -1, -1, function (code, signal) {
                if (code === 0) {
                    uv.spawn('reboot', [], '/', -1, -1, -1, function () { });
                    callback();
                } else {
                    callback(new ExpectedError('Failed to write fireware', 2));
                }
            });
        } catch (error) {
            callback(new ExpectedError('Failed to write fireware', 2, error));
        }
    });

    client.on('error', function (error) {
        hasError = true;
        callback(new ExpectedError('Failed to download firmware', 2, error));
    });
};

exports.reboot = function (options, callback) {
    try {
        uv.spawn('reboot', [], '/', -1, -1, -1, function () { });
        callback();
    } catch (error) {
        console.error(error);
        callback(new ExpectedError('Failed reboot device', 2));
    }
};

exports.reset = function (options, callback) {
    try {
        uv.spawn('jffs2reset', ['-y'], '/', -1, -1, -1, function (code, signal) {
            if (code === 0) {
                uv.spawn('reboot', [], '/', -1, -1, -1, function () { });
                callback();
            } else {
                callback(new ExpectedError('Failed to reboot device', 2));
            }
        });
    } catch (error) {
        callback(new ExpectedError('Failed to reset device', 2, error));
    }
};

exports.setWiFi = function (options, callback) {
    var ssid = options.ssid;
    var password = options.password;

    try {
        uv.spawn('/usr/sbin/cupid_set_wifi.sh', [ssid, password], '/', -1, -1, -1, function (code) {
            if (code === 0) {
                callback();
            } else {
                callback(new ExpectedError('Failed to configure WiFi settings', 2));
            }
        });
    } catch (error) {
        callback(new ExpectedError('Failed to configure WiFi settings', 2, error));
    }
};

exports.getInfo = function (options, callback) {
    var builders = [
        function () {
            this.deviceName = storage.get('device-name');
        },
        function () {
            this.ruffVersion = fs
                .readFileSync('/etc/ruff_version', 'utf-8')
                .replace(/^RUFF_VERSION=/, '')
                .trim();
        },
        function () {
            var fd = uv.fs_open('/proc/version', 'rn', parseInt('666', 8));

            var text = uv
                .fs_read(fd, 1024, 0)
                .toString()
                .trim();

            uv.fs_close(fd);

            this.systemVersion = text;
        },
        function () {
            var timestamp = Math.floor(uv.hrtime() / 1e6);

            this.ruffdUptime = (timestamp - global.RUFFD_START_TIME) / 1000 || undefined;
            this.appUptime = (timestamp - app.startTime) / 1000 || undefined;

            this.systemUptime = system.getUptime();
        },
        function () {
            var cupidInfo = this.cupid = {};

            var cupidResultFilePath = '/etc/cupid/cupid_result';

            if (fs.existsSync(cupidResultFilePath)) {
                fs
                    .readFileSync(cupidResultFilePath, 'utf-8')
                    .match(/\S.*\S/g)
                    .forEach(function (line) {
                        var index = line.indexOf('=');

                        if (index >= 0) {
                            var key = line.substr(0, index);
                            var value = line.substr(index + 1);

                            if (key === 'password') {
                                return;
                            }

                            cupidInfo[key] = value;
                        }
                    });
            }

            cupidInfo.connected = fs.existsSync('/etc/cupid/wifi_connected');
        },
        function () {
            var macAddress = process.ruff.mac;
            this.macAddress = macAddress && macAddress.replace(/.{2}(?!$)/g, '$&:');
            this.serialNumber = process.ruff.sn;
        },
        function () {
            this.appStatus = app.status;
        },
        function () {
            if (this.status === 'not-deployed') {
                return;
            }

            var json = fs.readFileSync(app.packageFilePath, 'utf-8');
            var data = JSON.parse(json);

            this.appName = data.name;
            this.appVersion = data.version;
        }
    ];

    var info = {};

    builders.forEach(function (builder) {
        try {
            builder.call(info);
        } catch (error) {
            console.error(error);
        }
    });

    callback(undefined, info);
};

/*!
 * Copyright (c) 2015-2016, Nanchao, Inc.
 * All rights reserved.
 */

'use strict';

var EventEmitter = require('events');
var assert = require('assert');
var path = require('path');
var util = require('util');

var SIGINT = 2;
var UV_SIGNAL = uv.signal_init();

var DEVICE_INITIALIZATION_TIMEOUT = 5000;
var INTERFACE_INITIALIZATION_TIMEOUT = 5000;
var END_TIMEOUT = 100;
var DETACH_TIMEOUT = 10;

function RuffBox(ruffBoxFilePath) {
    EventEmitter.call(this);

    var that = this;

    this.path = path.resolve(ruffBoxFilePath);

    var data = require(this.path);
    var deviceInfos = data.devices;

    var deviceInfoMap = Object.create(null);
    var deviceAliasToIdMapping = Object.create(null);

    for (var i = 0; i < deviceInfos.length; i++) {
        var info = deviceInfos[i];
        var id = info.id;
        var alias = info.alias;

        deviceInfoMap[id] = info;

        if (alias) {
            deviceAliasToIdMapping[alias] = id;
        }
    }

    this._deviceInfoMap = deviceInfoMap;
    this._deviceAliasToIdMapping = deviceAliasToIdMapping;

    this._interfaceMapping = data.preloads || Object.create(null);

    this._deviceMap = Object.create(null);
    this._defaultInterfaceMap = Object.create(null);

    this._loadDeviceCallbacksMap = Object.create(null);

    this._preload();

    uv.signal_start(UV_SIGNAL, SIGINT, function () {
        that.emit('end');

        setTimeout(function () {
            that._detachAll(function () {
                process.exit(0);
            });
        }, END_TIMEOUT);
    });
}

util.inherits(RuffBox, EventEmitter);

RuffBox.prototype._preload = function () {
    var that = this;

    var deviceInfoMap = this._deviceInfoMap;

    var sync = true;

    eachSeries(Object.keys(deviceInfoMap), function (id, next) {
        that.getDevice(id, next);
    }, function (error) {
        if (error) {
            emitReady(error);
            return;
        }

        // Preload mapped interfaces after devices,
        // so that used interfaces can be initialized with proper options.
        that._preloadMappedInterfaces(emitReady);
    });

    sync = false;

    function emitReady(error) {
        // Devices on ruff-mbd-v1 would probably make this callback asyncrhonous, though.
        if (sync) {
            process.nextTick(function () {
                that.emit('ready', error);
            });
        } else {
            that.emit('ready', error);
        }
    }
};

RuffBox.prototype._preloadMappedInterfaces = function (callback) {
    var that = this;

    var interfaceMapping = this._interfaceMapping;

    eachSeries(Object.keys(interfaceMapping), function (id, next) {
        var parts = interfaceMapping[id].split('/');

        var deviceId = parts[0];
        var name = parts[1];

        that.getDeviceInterface(deviceId, name, undefined, next);
    }, callback);
};

RuffBox.prototype._detachAll = function (callback) {
    var deviceMap = this._deviceMap;

    var ids = Object.keys(deviceMap).reverse();

    eachSeries(ids, function (id, next) {
        var device = deviceMap[id];

        if (typeof device.detach === 'function') {
            if (device.detach.length) {
                device.detach(function () {
                    next();
                });
            } else {
                device.detach();
                setTimeout(next, DETACH_TIMEOUT);
            }
        } else {
            next();
        }
    }, callback);
};

/**
 * @param {string} deviceId The ID of the device that this interface belongs to.
 * @param {string} name The name of this interface.
 * @param {Object} options The options for initiating the interface.
 * @param {Function} callback
 */
RuffBox.prototype.getDeviceInterface = function (deviceId, name, options, callback) {
    deviceId = this._deviceAliasToIdMapping[deviceId] || deviceId;

    var defaultInterfaceMap;
    var path = deviceId + '/' + name;

    // Cache only if no options given.
    if (!options) {
        defaultInterfaceMap = this._defaultInterfaceMap;

        if (path in defaultInterfaceMap) {
            callback(undefined, defaultInterfaceMap[path]);
            return;
        }

        options = Object.create(null);
    }

    var deviceMap = this._deviceMap;
    var device = deviceMap[deviceId];

    if (device) {
        getInterface(device);
        return;
    }

    this.getDevice(deviceId, function (error, loadedDevice) {
        if (error) {
            callback(error);
            return;
        }

        getInterface(loadedDevice);
    });

    function getInterface(device) {
        if (typeof device.getInterface !== 'function') {
            callback(new Error('Cannot get interface of device "' + deviceId + '"'));
            return;
        }

        // name, options, callback
        if (device.getInterface.length < 3) {
            var gotInterface = device.getInterface(name, options);

            if (defaultInterfaceMap) {
                defaultInterfaceMap[path] = gotInterface;
            }

            callback(undefined, gotInterface);
        } else {
            var timedOut = false;

            var timer = setTimeout(function () {
                timedOut = true;
                callback(new Error('Timed out getting interface "' + name + '" of device "' + deviceId + '"'));
            }, INTERFACE_INITIALIZATION_TIMEOUT);

            device.getInterface(name, options, function (error, gotInterface) {
                if (timedOut) {
                    return;
                }

                clearTimeout(timer);

                if (error) {
                    callback(error);
                    return;
                }

                if (defaultInterfaceMap) {
                    defaultInterfaceMap[path] = gotInterface;
                }

                callback(undefined, gotInterface);
            });
        }
    }
};

RuffBox.prototype.getDevice = function (deviceId, callback) {
    var that = this;

    deviceId = this._deviceAliasToIdMapping[deviceId] || deviceId;

    var info = this._deviceInfoMap[deviceId];

    if (!info) {
        throw new Error('Unknown device ID "' + deviceId + '"');
    }

    var id = info.id;

    var deviceMap = this._deviceMap;

    if (id in deviceMap) {
        callback(undefined, deviceMap[id]);
        return;
    }

    var loadDeviceCallbacksMap = this._loadDeviceCallbacksMap;

    if (id in loadDeviceCallbacksMap) {
        loadDeviceCallbacksMap[id].push(callback);
        return;
    }

    var callbacks = loadDeviceCallbacksMap[id] = callback ? [callback] : [];

    var DeviceConstructor;

    if (this._getDeviceConstructor) {
        DeviceConstructor = this._getDeviceConstructor(info.driver);
    } else {
        var possibleDriverPath = path.join(path.dirname(this.path), 'ruff_modules', info.driver);

        if (existsSync(possibleDriverPath)) {
            DeviceConstructor = require(possibleDriverPath);
        } else {
            DeviceConstructor = require(info.driver);
        }
    }

    var context = {
        id: id,
        model: info.model,
        args: info.args || Object.create(null)
    };

    var inputs = Object.create(null);

    var inputInfoMap = info.inputs;
    var inputNames = Object.keys(inputInfoMap);

    eachSeries(inputNames, function (name, next) {
        var inputInfo = inputInfoMap[name];

        var type = inputInfo.type;
        var args = inputInfo.args || Object.create(null);
        var bind = inputInfo.bind;

        if (type === 'number' || type === 'string') {
            inputs[name] = args;
            next();
            return;
        }

        if (!bind) {
            // It's probably reserved.
            next();
            return;
        }

        var slashIndex = bind.indexOf('/');
        var boundDeviceId = bind.substr(0, slashIndex);
        var boundName = bind.substr(slashIndex + 1);

        that.getDeviceInterface(boundDeviceId, boundName, args, function (error, gotInterface) {
            if (error) {
                processCallbacks(error);
                return;
            }

            inputs[name] = gotInterface;
            next();
        });
    }, function (error) {
        if (error) {
            processCallbacks(error);
            return;
        }

        var device;

        if (DeviceConstructor.async) {
            var timedOut = false;

            var timer = setTimeout(function () {
                timedOut = true;
                processCallbacks(new Error('Timed out initialization of device "' + id + '"'));
            }, DEVICE_INITIALIZATION_TIMEOUT);

            device = new DeviceConstructor(inputs, context, function (error) {
                if (timedOut) {
                    return;
                }

                clearTimeout(timer);

                if (error) {
                    processCallbacks(error);
                    return;
                }

                if (device) {
                    attachDevice(device);
                } else {
                    // This callback is probably called synchronously.
                    setImmediate(function () {
                        attachDevice(device);
                    });
                }
            });
        } else {
            device = new DeviceConstructor(inputs, context);
            attachDevice(device);
        }
    });

    function attachDevice(device) {
        deviceMap[id] = device;
        processCallbacks(undefined, device);
    }

    function processCallbacks(error, device) {
        for (var i = 0; i < callbacks.length; i++) {
            callbacks[i](error, device);
        }
    }
};

RuffBox.prototype.query = function (query, options, callback) {
    assert(/^#/.test(query), 'Invalid device query, currently only queries in the form of "#<device-id>" are supported');

    if (typeof options === 'function') {
        callback = options;
        options = undefined;
    }

    var that = this;

    var path = query.substr(1);

    if (path in this._interfaceMapping) {
        path = this._interfaceMapping[path];
    }

    var parts = path.split('/');

    var deviceId = parts[0];
    var interfaceName = parts[1];

    if (callback) {
        var sync = true;

        getTarget(function (error, target) {
            // Ensure asynchronous callback.
            if (sync) {
                process.nextTick(callback, error, target);
            } else {
                callback(error, target);
            }
        });

        sync = false;
    } else {
        var target;

        getTarget(function (error, gotTarget) {
            if (error) {
                throw error;
            }

            target = gotTarget;
        });

        if (!target) {
            throw new Error('No target loaded matches query "' + query + '"');
        }

        return target;
    }

    function getTarget(callback) {
        if (interfaceName) {
            return that.getDeviceInterface(
                deviceId,
                interfaceName,
                options,
                callback
            );
        } else {
            if (options) {
                throw new TypeError('Options are not available for querying a device');
            }

            return that.getDevice(deviceId, callback);
        }
    }
};

module.exports = RuffBox;

function eachSeries(values, handler, callback) {
    next();

    function next(error) {
        if (error) {
            callback(error);
            return;
        }

        if (!values.length) {
            callback();
            return;
        }

        handler(values.shift(), next);
    }
}

function existsSync(path) {
    try {
        uv.fs_stat(path);
        return true;
    } catch (e) {
        return false;
    }
}

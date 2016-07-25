'use strict';

var net = require('net');

var error = require('./error.js');
var md5 = require('../libs/md5.js');
var packet = require('./packet.js');
var storage = require('./storage.js').default;

var ExpectedError = error.ExpectedError;
var UNKNOWN_ERROR_STATUS = error.UNKNOWN_ERROR_STATUS;
var UNKNOWN_COMMAND_STATUS = error.UNKNOWN_COMMAND_STATUS;
var WRONG_SIGNATURE_STATUS = error.WRONG_SIGNATURE_STATUS;
var SIGNATURE_REQUIRED_STATUS = error.SIGNATURE_REQUIRED_STATUS;

var hop = Object.prototype.hasOwnProperty;

var serverConfig = require('../config.json').server;

var PING_INTERVAL = 5000;
var EXECUTION_TIMEOUT = 10000;

// TODO: remove this mapping in the future and update rap with new commands.
var commandTypeMapping = {
    'deploy': 'app.deploy',
    'start': 'app.start',
    'stop': 'app.stop',
    'ping': 'system.ping',
    'upgrade': 'system.upgrade',
    'rename': 'system.rename',
    'reset': 'system.reset',
    'reboot': 'system.reboot',
    'set-wifi': 'system.setWiFi',
    'get-system-info': 'system.getInfo',
};

var bypassAuthCommandSet = {
    'system.preflight': true,
    'system.ping': true
};

var commandModuleMap = {
    app: require('../commands/app.js'),
    system: require('../commands/system.js')
};

exports.setup = function (logReader) {
    var clients = [];

    var pendingCommandInfos = [];
    var executing = false;
    var executionTimer;

    var server = net.createServer(function (client) {
        var address;

        try {
            address = client._getpeername();
        } catch (error) {
            console.error(error);
            client.destroy();
            return;
        }

        console.log('Client ' + address.ip + ' connected.');

        var parser = new packet.Parser();

        parser.on('data', function (command) {
            appendCommand(command, client, address);
        });

        parser.on('error', function (error) {
            console.error('Parser error.');
            console.error(error);
        });

        client.on('data', function (data) {
            // TODO: there was a bug in ruff_module's net, now it's fixed.
            // This should be removed from ruffd and rap in the future.
            if (data.toString('binary', 0, 5) === 'close') {
                removeClient();
                client.destroy();
            } else {
                parser.append(data);
            }
        });

        client.on('close', function () {
            console.log('Client ' + address.ip + ' disconnected.');
        });

        client.on('error', function (error) {
            removeClient();
            console.error('Client ' + address.ip + ' connection error.');
            console.error(error);
        });

        clients.push(client);

        function removeClient() {
            var index = clients.indexOf(client);

            if (index >= 0) {
                clients.splice(index, 1);
            }

            console.log('Client ' + address.ip + ' removed.');
        }
    });

    server.on('error', function (error) {
        console.error('Socket server error occurs.');
        console.error(error);
    });

    server.listen(serverConfig.port, function () {
        console.log('Ruffd is now listening on port ' + serverConfig.port + '...');
    });

    setInterval(function () {
        var pingPacket = packet.buildPingPacket();

        clients.forEach(function (client) {
            try {
                client.write(pingPacket);
            } catch (error) {
                console.error('Failed to ping client.');
                console.error(error);
            }
        });
    }, PING_INTERVAL);

    logReader.on('log', function (text) {
        var logPacket = packet.buildLogPacket('normal', text);

        clients.forEach(function (client) {
            try {
                client.write(logPacket);
            } catch (error) {
                console.error('Failed to send log.');
                console.error(error);
            }
        });
    });

    logReader.start();

    function authenticate(command, type) {
        var token = storage.get('auth-token');

        if (!token || hop.call(bypassAuthCommandSet, type)) {
            return;
        }

        var signature = command.signature;

        if (!signature) {
            throw new ExpectedError('Signature expected', SIGNATURE_REQUIRED_STATUS);
        }

        delete command.signature;

        command.token = token;

        var dataArray = Object
            .keys(command)
            .filter(function (key) {
                // This should be redundant, but let's make sure.
                return command[key] !== undefined;
            })
            .sort()
            .map(function (key) {
                return [key, command[key]];
            });

        var calculatedSignature = md5(JSON.stringify(dataArray));

        if (calculatedSignature !== signature) {
            throw new ExpectedError('Wrong signature', WRONG_SIGNATURE_STATUS);
        }
    }

    function appendCommand(command, client, address) {
        var type = command.type;
        var callback;

        if (hop.call(commandTypeMapping, type)) {
            type = commandTypeMapping[type];
        }

        try {
            authenticate(command, type);
        } catch (error) {
            callback = createCallback(command, client);
            callback(error);
            return;
        }

        var parts = type.split('.');

        var category = parts[0];
        var operationName = parts[1];

        var commandModule = hop.call(commandModuleMap, category) ?
            commandModuleMap[category] : undefined;

        var operation = commandModule && hop.call(commandModule, operationName) ?
            commandModule[operationName] : undefined;

        command.remote = address;

        if (operation) {
            pendingCommandInfos.push({
                operation: operation.bind(commandModule),
                command: command,
                client: client
            });

            nextCommand();
        } else {
            callback = createCallback(command, client);
            callback(new ExpectedError('Unknown command "' + type + '"', UNKNOWN_COMMAND_STATUS));
        }
    }

    function nextCommand() {
        if (executing) {
            return;
        }

        var info = pendingCommandInfos.shift();

        if (!info) {
            return;
        }

        clearTimeout(executionTimer);

        executing = true;

        var callback = createCallback(info.command, info.client, function () {
            executing = false;
            nextCommand();
        });

        info.operation(info.command, callback);

        executionTimer = setTimeout(function () {
            executing = false;
            nextCommand();
        }, EXECUTION_TIMEOUT);
    }

    function createCallback(command, client, handler) {
        var called = false;

        return function (error, value) {
            if (called) {
                console.error('Command "' + command.type + '" callback has been called more than once.');
                return;
            }

            console.log('Command "' + command.type + '" callback called.');

            if (error instanceof ExpectedError) {
                console.log(error);
            } else if (error) {
                console.error(error.stack);
            }

            called = true;

            if (handler) {
                handler();
            }

            var ackPacket = packet.buildAckPacket(
                command.id,
                value,
                error ? error.code || UNKNOWN_ERROR_STATUS : 0
            );

            try {
                client.write(ackPacket);
            } catch (error) {
                console.error('Failed to send back ack.');
                console.error(error);
            }
        };
    }
};

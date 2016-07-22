/*!
 * Copyright (c) 2015-2016, Nanchao, Inc.
 * All rights reserved.
 */

'use strict';

var EventEmitter = require('events');
var util = require('util');

var hop = Object.prototype.hasOwnProperty;

exports.eval = function () { };

function Parser() {
    EventEmitter.call(this);
    this.pending = new Buffer(0);
}

util.inherits(Parser, EventEmitter);

Parser.prototype.append = function (buffer) {
    this.pending = Buffer.concat([this.pending, buffer]);
    this.parse();
};

Parser.prototype.parse = function () {
    var buffer = this.pending;

    while (buffer.length) {
        var length = buffer.readUInt32BE(0);
        var end = length + 4;

        if (buffer.length < end) {
            break;
        }

        var json = buffer.toString('utf-8', 4, end);

        try {
            this.emit('data', JSON.parse(json));
        } catch (error) {
            this.emit('error', error);
        }

        buffer = buffer.slice(end);
    }

    this.pending = buffer;
};

function buildPacket(data) {
    var json = JSON.stringify(data);

    var dataBuffer = new Buffer(json);
    var length = dataBuffer.length;

    var lengthBuffer = new Buffer(4);
    lengthBuffer.writeUInt32BE(length);

    return Buffer.concat([lengthBuffer, dataBuffer]);
}

var actions = {
    eval: function (data) {
        return exports.eval.call(undefined, data.expression);
    }
};

try {
    var server = uv.new_tcp();

    uv.tcp_bind(server, '0.0.0.0', 7884);

    uv.listen(server, 128, function () {
        var parser = new Parser();
        var client = uv.new_tcp();

        parser.on('data', function (data) {
            if (!data) {
                return;
            }

            var type = data.type;
            var hasError;
            var value;

            if (hop.call(actions, type)) {
                try {
                    value = util.inspect(actions[type](data), {
                        colors: true
                    });
                    hasError = false;
                } catch (error) {
                    value = error && error.stack || error;
                    hasError = true;
                }
            }

            var packet = buildPacket({
                error: hasError,
                value: value
            });

            uv.write(client, util._toDuktapeBuffer(packet), function (error) {
                if (error) {
                    console.error(error);
                }
            });
        });

        uv.accept(server, client);

        console.log('Console client connected.');

        uv.read_start(client, function (error, data) {
            if (error) {
                console.error(error);
                return;
            }

            if (data) {
                parser.append(new Buffer(data));
            }
        });
    });

    console.log('Console server bound.');
} catch (error) {
    console.error(error);
}

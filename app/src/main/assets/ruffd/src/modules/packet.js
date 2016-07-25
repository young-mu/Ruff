'use strict';

var EventEmitter = require('events');
var util = require('util');

var MAGIC = 'RUFF';
var PROTOCOL_VERSION = 2;

var State = {
    magic: 0,
    version: 1,
    length: 2,
    body: 3
};

function Parser() {
    EventEmitter.call(this);

    this._state = State.magic;
    this._magicError = false;
    this._pending = new Buffer(0);
}

util.inherits(Parser, EventEmitter);

Object.defineProperty(Parser.prototype, 'pending', {
    get: function () {
        return this._pending.length > 0 || this._state !== State.magic;
    }
});

Parser.prototype.append = function (buffer) {
    this._pending = Buffer.concat([this._pending, buffer]);
    this._parse();
};

Parser.prototype._parse = function () {
    while (this._pending.length) {
        var parsed;

        switch (this._state) {
            case State.magic:
                parsed = this._parseMagic();
                break;
            case State.version:
                parsed = this._parseVersion();
                break;
            case State.length:
                parsed = this._parseLength();
                break;
            case State.body:
                parsed = this._parseBody();
                break;
        }

        Duktape.gc();

        if (!parsed) {
            break;
        }
    }
};

Parser.prototype._consume = function (length) {
    this._pending = this._pending.slice(length);
};

Parser.prototype._parseMagic = function () {
    var magic = this._pending.toString('binary', 0, MAGIC.length);

    for (var i = 0; i < magic.length; i++) {
        // Magic number should fail as soon as possible.
        if (magic[i] !== MAGIC[i]) {
            // Consume pending buffers.
            this._consume(i + 1);

            // Avoid too many errors.
            if (!this._magicError) {
                this._magicError = true;
                this.emit('error', new Error('Invalid magic number'));
            }

            return true;
        }
    }

    if (magic.length === MAGIC.length) {
        this._consume(magic.length);
        this._state = State.version;
        this._magicError = false;

        return true;
    } else {
        // Insufficient magic length.
        return false;
    }
};

Parser.prototype._parseVersion = function () {
    if (this._pending.length < 2) {
        return false;
    }

    var version = this._pending.readUInt16BE(0);

    this._consume(2);

    if (version !== PROTOCOL_VERSION) {
        this.emit('error', new Error('Invalid protocol version'));
        this._state = State.magic;
    } else {
        this._state = State.length;
    }

    return true;
};

Parser.prototype._parseLength = function () {
    if (this._pending.length < 4) {
        return false;
    }

    this._length = this._pending.readUInt32BE(0);
    this._consume(4);
    this._state = State.body;

    return true;
};

Parser.prototype._parseBody = function () {
    var length = this._length;

    if (this._pending.length < length) {
        return false;
    }

    var json = this._pending.slice(0, length).toString();

    try {
        var data = JSON.parse(json);
        this.emit('data', data);
    } catch (error) {
        this.emit('error', error);
    }

    this._consume(length);
    this._state = State.magic;

    return true;
};

exports.Parser = Parser;

function uuid() {
    return [
        buildRandomHex(8),
        buildRandomHex(4),
        buildRandomHex(4),
        buildRandomHex(4),
        buildRandomHex(12)
    ].join('-');
}

function buildRandomHex(length) {
    var hex = '';

    for (var i = 0; i < length; i++) {
        hex += Math.floor(Math.random() * 16).toString(16);
    }

    return hex;
}

function encodeMagic() {
    return new Buffer(MAGIC);
}

function encodeLength(length) {
    var buffer = new Buffer(4);
    buffer.writeUInt32BE(length);
    return buffer;
}

function encodeVersion() {
    var buffer = new Buffer(2);
    var version = PROTOCOL_VERSION;
    buffer.writeUInt16BE(version);
    return buffer;
}

function encodeBody(data) {
    var json = JSON.stringify(data);
    return new Buffer(json);
}

function build(type, data) {
    var bodyData = {
        timestamp: Date.now(),
        id: uuid(),
        type: type
    };

    if (data) {
        Object
            .keys(data)
            .forEach(function (key) {
                bodyData[key] = data[key];
            });
    }

    var magicNumberBuffer = encodeMagic();
    var versionBuffer = encodeVersion();
    var bodyBuffer = encodeBody(bodyData);
    var bodyLengthBuffer = encodeLength(bodyBuffer.length);

    var packet = Buffer.concat([
        magicNumberBuffer,
        versionBuffer,
        bodyLengthBuffer,
        bodyBuffer
    ]);

    Duktape.gc();

    return packet;
}

exports.build = build;

function buildLogPacket(level, text) {
    return build('log', {
        level: level,
        payload: text
    });
}

exports.buildLogPacket = buildLogPacket;

function buildAckPacket(id, value, status) {
    return build('ack', {
        ack: id,
        response: value,
        status: status
    });
}

exports.buildAckPacket = buildAckPacket;

function buildPingPacket() {
    return build('ping');
}

exports.buildPingPacket = buildPingPacket;

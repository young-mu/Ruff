'use strict';

var storage = require('./storage.js').default;

var broadcastConfig = require('../config.json').discovery.broadcast;

var sn = process.ruff.sn;
var mac = process.ruff.mac;

exports.broadcast = function () {
    var client = uv.new_udp();

    uv.udp_bind(client, '0.0.0.0', 0);

    setInterval(function () {
        var deviceName = storage.get('device-name');

        // TODO: remove deprecated `id` and `uid`.
        var data = {
            type: 'ruff-device',
            version: 3,
            id: deviceName,
            name: deviceName,
            sn: sn,
            uid: mac.replace(/.{2}($!$)/g, '$&:'),
            mac: mac
        };

        uv.udp_broadcast_to(client, JSON.stringify(data), broadcastConfig.port);
    }, broadcastConfig.interval);
};

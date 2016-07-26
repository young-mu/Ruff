/*!
 * Copyright (c) 2015-2016, Nanchao, Inc.
 * All rights reserved.
 */

/* globals uv: false */

'use strict';

function homedir() {
    //TODO
    return '/ruff/app';
}

function tmpdir() {
    //TODO
    return homedir() + '/tmp';
}

function hostname() {
    //TODO
    return 'Ruff';
}

function uptime() {
    return uv.uptime();
}

function loadavg() {
    return uv.loadavg();
}

function totalmem() {
    return uv.get_total_memory(); // jshint ignore:line
}

function freemem() {
    return uv.get_free_memory(); // jshint ignore:line
}

function cpus() {
    return uv.cpu_info(); // jshint ignore:line
}

function networkInterfaces() {
    return uv.interface_addresses(); // jshint ignore:line
}

exports.tmpdir = tmpdir;
exports.homedir = homedir;
exports.hostname = hostname;
exports.uptime = uptime;
exports.loadavg = loadavg;
exports.totalmem = totalmem;
exports.freemem = freemem;
exports.cpus = cpus;
exports.networkInterfaces = networkInterfaces;
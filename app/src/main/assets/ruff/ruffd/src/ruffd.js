'use strict';

global.RUFFD_START_TIME = Math.floor(uv.hrtime() / 1e6);

var app = require('./modules/app.js');
var appCommands = require('./commands/app.js');
var LogReader = require('./modules/log-reader.js');
var server = require('./modules/server.js');
//var discovery = require('./modules/discovery.js');

var logReader = new LogReader(app.logPath);

server.setup(logReader);

//discovery.broadcast();

if (app.status === 'not-started') {
    // TODO: move those to modules.
    appCommands.start({}, function () { });
}

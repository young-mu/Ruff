var net = require('net');
var http = require('http');
var qs = require('querystring');
var url = require('url');
var util = require('util');
var events = require('events');

var HOST = '127.0.0.1';
var PORT_SEND = 8888;
var POST_RECV = 8889;

Android = function() {
    this.name = 'android';
};
util.inherits(Android, events);

Android.prototype.ok = function() {
    console.log('ok');
};

Android.prototype.loadUrl = function(path) {
    var client = net.connect(PORT_SEND, HOST, function() {
        client.write('Webview [' + path + ']');
        client.end();
    });
};

Android.prototype.openPic = function(path) {
    var client = net.connect(PORT_SEND, HOST, function() {
        client.write('Picture [' + path + ']');
        client.end();
    });
};

Android.prototype.playAudio = function(path) {
    var client = net.connect(PORT_SEND, HOST, function() {
        client.write('Audio [' + path + ']');
        client.end();
    });
};

Android.prototype.playAudio = function(path) {
    var client = net.connect(PORT_SEND, HOST, function() {
        client.write('Video [' + path + ']');
        client.end();
    });
};

var android = new Android();

http.createServer(function(req, res) {
    if (req.method == 'POST') {
        var pathname = url.parse(req.url).pathname;
        if (pathname == '/test') {
            req.on('data', function(chunk) {
                var data = qs.parse(chunk.toString());
                if (data.value === '1') {
                    android.emit('button1');
                } else if (data.value === '2') {
                    android.emit('button2');
                } else if (data.value === '3') {
                    android.emit('button3');
                }
            });
        }
    }
}).listen(POST_RECV);

exports.android = android;

var net = require('net');

var HOST = '127.0.0.1';
var PORT = 5678;

var openPic = function(path) {
    var client = net.connect(PORT, HOST, function() {
        client.write('Picture [' + path + ']');
        client.end();
    });
};

var loadUrl = function(path) {
    var client = net.connect(PORT, HOST, function() {
        client.write('Webview [' + path + ']');
        client.end();
    });
};

exports.openPic = openPic;
exports.loadUrl = loadUrl;

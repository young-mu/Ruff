var net = require('net');

var HOST = '127.0.0.1';
var PORT = 5678;

var client = net.connect(PORT, HOST, function() {
    client.write('WebView [web_app/index.html]');

    client.end();
});
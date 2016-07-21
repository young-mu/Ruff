var android = require('./android.js');

//android.loadUrl('web_app/index2.html');

setTimeout(function() {
    android.openPic('ruff_mm/Pictures/test1.jpg');
}, 5000);

setTimeout(function() {
    android.openPic('ruff_mm/Pictures/test2.jpg');
}, 10000);
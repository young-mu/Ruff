var android = require('./android.js').android;


android.loadUrl('web_app/index.html');

android.on('button1', function() {
    console.log('Hey, I\'m button1 callback');
});

android.on('button2', function() {
    console.log('Hey, I\'m button2 callback');
});

android.on('button3', function() {
    console.log('Hey, I\'m button3 callback');
});


//android.loadUrl('web_app/index2.html');

//android.openPic('ruff_mm/Pictures/test1.jpg');
//android.openPic('ruff_mm/Pictures/test2.jpg');
//android.playAudio('ruff_mm/Audios/test.mp3');
//android.playVideo('ruff_mm/Videos/test.mp4');
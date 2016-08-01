var postData = function(data) {
    var xhr = new XMLHttpRequest();

    xhr.open('POST', 'http://localhost:8889/test', true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            console.log('post success');
        }
    };

    xhr.send('value=' + data);
};

$(document).ready(function() {

    $('#button-1').click(function() {
        postData('1');
    });

    $('#button-2').click(function() {
        postData('2');
    });

    $('#button-3').click(function() {
        postData('3');
    });

});

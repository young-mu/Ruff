$.ready(function (error) {
    if (error) {
        console.log(error);
        return;
    }

    console.log('Ruff ready');

});

$.end(function () {
    console.log('Ruff end');
});

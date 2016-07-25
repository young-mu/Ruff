'use strict';

// TODO:

exports.getUptime = function () {
    var fd = uv.fs_open('/proc/uptime', 'rn', parseInt('666', 8));

    var text = uv
        .fs_read(fd, 1024, 0)
        .toString()
        .trim();

    uv.fs_close(fd);

    return Number((text.match(/[\d.]+/) || [])[0]) || undefined;
};

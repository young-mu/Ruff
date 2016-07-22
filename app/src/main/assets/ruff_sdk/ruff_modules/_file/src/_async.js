/*!
 * Copyright (c) 2015-2016, Nanchao, Inc.
 * All rights reserved.
 */

'use strict';

function Async() {
    var self = {};
    Object.setPrototypeOf(self, Async.prototype);
    return self;
}

Async.prototype.series = function(funcs, idx) {
    var self = this;
    if (typeof idx === 'undefined') {
        idx = 0;
    }
    if (idx < funcs.length) {
        funcs[idx](function () {
            self.series(funcs, idx+1);
        });
    }
};

module.exports = new Async();

/*!
 * Copyright (c) 2015-2016, Nanchao, Inc.
 * All rights reserved.
 */

'use strict';

var util = require('util');
var EE = require('Emitter');

function Process() {
    EE.call(this);
}

util.inherits(process, EE);


exports.process = new Process();
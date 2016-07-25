'use strict';

function ExpectedError(message, code, originalError) {
    this.message = message;
    this.code = code;
    this.error = originalError;
}

exports.ExpectedError = ExpectedError;

exports.UNKNOWN_ERROR_STATUS = -999;
exports.UNKNOWN_COMMAND_STATUS = -2;
exports.SIGNATURE_REQUIRED_STATUS = -3;
exports.WRONG_SIGNATURE_STATUS = -4;

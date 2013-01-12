//============================================================================
//
// smfCore.js
// ----------
//
// Methods that are needed by other modules.
//
// R Fisher 2013
//
//============================================================================

"use strict";

var	exec = require('child_process').exec,
	_ = require('underscore'),
	restify = require('restify'),
	moment = require('moment'),
	config = require('./smfConfig');

module.exports = {

log: function(level, msg) {

	// print information. If you run logs through cut(1) with a space as
	// delimiter, field 1 is the timn field 2 the date, field 3 the
	// severity, and the remainder is the log message.
	//
	// The only special value for 'level' is 'err', which denotes an error

	var str = moment().format("HH:mm:ss DD/MM/YY") + ' ' +
		level.toUpperCase() + ' ' + msg;

	if (level === 'err') {
		console.error(str);
	}
	else if (config.verbose) {
		console.log(str);
	}

},


}; // end exports

//----------------------------------------------------------------------------
// PRIVATE METHODS

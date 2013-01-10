"use strict";

var	config = require('./smfConfig'),
	moment = require('moment');

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

cmd: function(cmd, err) {

	 // send information about any external commands being executed. Tell
	 // log() to print the command in single quotes, which I think makes it
	 // easier for the user to see.

	var cmdtxt = '\'' + cmd + '\'';

	if (err) {
		this.log('err', cmdtxt + ' EXIT=' + err.code);
	}
	else{
		this.log('notice', cmdtxt + ' OK');
	}
}

}; // end exports

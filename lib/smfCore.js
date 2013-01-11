"use strict";

var	exec = require('child_process').exec,
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


cmd_log: function(cmd, err) {

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
},


run_cmd: function(cmd, req, res, next) {

	// Function to run an external command and handle what comes back

	exec(cmd, function(err, stdout, stderr) {
		module.exports.cmd_log(cmd, err);

		if (err) {

			// Although svcadm returns 0 for a "no permisson" error, I'm
			// always getting 1 as my error code. I don't know what language
			// the user may have set, so I'm going to try to distinguish
			// between a "no such service" and a "no permission" error by
			// exploiting the fact that the former prints the name of the
			// service you tried to use in strong quotes. Same applies to
			// svccfg(1m).

			// Log the error message we got from the command

			module.exports.log('err', stderr.trim());

			if (stderr.match("'" + req.params.svc + "'")) {
				return next(new restify.ResourceNotFoundError(
						'Invalid service'));
			}
			else if (stderr.match('args')) {
				return next(new restify.InvalidArgumentError(
						'Invalid flag or command'));
			}
			else {
				return next(new restify.InternalError(stderr));
			}

		}

		res.send(200, 'command complete');
	});

}

}; // end exports

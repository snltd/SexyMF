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


mk_cmd: function(cmd, req, next, as_arr) {

	// Make a command to execute. Pass in the command and its arguments as
	// an array. Returns a string for exec() unless the fourth arg is true,
	// when it returns an array suitable for a spawn(). This gives us a
	// central point to add in qualifiers for running in zones, to check
	// commands are legitimate, and to ensure a user is authorized to run
	// them.

	var command = [],
		cmd_str;

	// is the command itself allowed?

	if (!_.contains(config.required_bins, cmd[0])) {
		return next(new restify.NotAuthorizedError('Disallowed command: ' +
					cmd[0]));
	}

	// Are we intending to run this command with zlogin?
	
	if (req.params.cache.zlogin) {
		command.push(req.params.cache.zlogin);
	}

	command.push(cmd.shift());

	// Do we have zone options to add on?
	
	if (req.params.cache.zopts) {
		command.push(req.params.cache.zopts);
	}

	// Tag on the other args and options
	
	command = command.concat(cmd);

	cmd_str = command.join(' ').replace(/\s+/g, ' ').trim();

	// Is the user allowed to run this? I don't really like that this is run
	// in this function, but really it's the best place to do it
	
	if (check_cmd_auths(req.params.cache, cmd_str)) {
		return (as_arr) ? command : cmd_str;
	}
	else {
		return next(new restify.NotAuthorizedError(
					'insufficient privileges'));
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

//----------------------------------------------------------------------------
// PRIVATE METHODS

function check_cmd_auths(cache, cmd_str, next) {

	// Does the user have the right authorizations to run a command? The
	// user's auths AND the required auth are cached, so all we have to do
	// is compare them and act accordingly
	
	if (!_.contains(cache.user_auths, cache.required_auth)) {
		module.exports.log('err', '\'' + cmd_str + '\' REQUIRES \''
				+ cache.required_auth + '\' auth');
		return false;
	}

}


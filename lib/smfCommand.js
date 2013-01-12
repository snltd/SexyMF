var	exec = require('child_process').exec,
	spawn = require('child_process').spawn,
	_ = require('underscore'),
	restify = require('restify'),
	smfCore = require('./smfCore'),
	config = require('./smfConfig');

function smfCommand(raw_cmd, cache, auth) {

	// We get a command, which comes with all its parts in an array, the
	// contents of req.params.cache, and an authorization level required to
	// run the command.

	var cmd_arr = [],
		cmd_str;

	// Are we intending to run this command with zlogin?
	
	if (cache.zlogin) {
		cmd_arr.push(cache.zlogin);
	}

	cmd_arr.push(raw_cmd.shift());

	// Do we have zone options to add on?
	
	if (cache.zopts) {
		cmd_arr.push(cache.zopts);
	}

	// Tag on the other args and options. exec() commands will need the
	// command as a string, spawn() needs it as an arry
	
	cmd_arr = cmd_arr.concat(raw_cmd);

	cmd_str = cmd_arr.join(' ').replace(/\s+/g, ' ').trim();

	return {

		cmdExec: function(callback) {

			if (cmdIsAllowed()) {

				exec(cmd_str, function(err, stdout, stderr) {
					cmdLog(err);

					if (err) {
						errorHandler(err, stderr);
					}

					callback(err, stdout, stderr);
				});
			}
			else {
				smfCore.log('err', '\'' + cmd_str + '\' REQUIRES \''
				+ auth + '\' auth');
			}
		}

	};

	function cmdLog(err) {

		// Log information about any external commands being executed. Tell
		// log() to print the command in single quotes, which I think makes
		// it easier for the user to see.

		var cmdtxt = '\'' + cmd_str + '\'';

		if (err) {
			smfCore.log('err', cmdtxt + ' EXIT=' + err.code);
		}
		else{
			smfCore.log('notice', cmdtxt + ' OK');
		}

	}

	function errorHandler(err, stderr) {
		return new restify.ResourceNotFoundError(stderr);
	}

	function cmdIsAllowed() {

		// Is the command in the required_bins array, and does the user have
		// the right authorizations to run it?
		
		return (_.contains(config.required_bins, cmd_arr[0]) &&
			_.contains(cache.user_auths, auth));
	}

	/*
run_cmd: function(cmd, req, res, next) {

	// Function to run an external command and handle what comes back
	
	// if the mk_cmd() function didn't make a command, don't try to execute
	/ it.  This happens if the user lacks authororizations.

	if (!cmd) {
		return next();
	}

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

},
*/

}

module.exports = smfCommand;

//============================================================================
//
// smfCommand.js
// -------------
//
// Run external commands. Anthing that doesn't use a spawn() passes through
// here, so it's the right place to properly build commands, verify
// authorizations, and generally make sure everything is just so.
//
// R Fisher 2013
//
//============================================================================

"use strict";

var	exec = require('child_process').exec,
	spawn = require('child_process').spawn,
	_ = require('underscore'),
	smfCore = require('./smfCore'),
	smfConfig = require('./smfConfig');

function smfCommand(raw_cmd, cache, auth, eh) {

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

	//-- here's the closure -----------------------------------------------

	return {

		cmdExec: function(callback) {

			// Execute a command. Requires a callback that knows how to
			// handle the data that comes out of exec().
			
			if (cmdIsAllowed()) {

				exec(cmd_str, function(err, stdout, stderr) {
					cmdLog(err);
					callback(err, stdout, stderr);
				});

			}
			else {
				eh.cmdDisallowed(cmd_str, auth);
			}

		},

		// Some of the svccfg commands are spawn()ed, so they don't use
		// cmdExec(). Expose a couple of otherwise private variables and
		// methods for that situation

		asArr: cmd_arr,
		asStr: cmd_str,

		writeLog: function(err) {
			return cmdLog(err);
		},

		isAllowed: function() {
			return cmdIsAllowed();
		}

	};

	//-- private methods --------------------------------------------------

	function cmdLog(err) {

		// Log information about any external commands being executed. Tell
		// log() to print the command in single quotes, which I think makes
		// it easier for the user to see.

		var cmdtxt = 'zone=' + cache.zonename + ',user=' + cache.user.name +
			',cmd=\'' + cmd_str + '\'';

		if (err) {
			smfCore.log('err', cmdtxt + ',EXIT=' + err.code);
		}
		else{
			smfCore.log('notice', cmdtxt + ',OK');
		}

	}

	function cmdIsAllowed() {

		// Is the command in the required_bins array, and does the user have
		// the right authorizations to run it?
		
		return ( _.contains(smfConfig.required_bins, cmd_arr[0]) &&
			_.contains(cache.user.auths, auth) );
	}

}

module.exports = smfCommand;


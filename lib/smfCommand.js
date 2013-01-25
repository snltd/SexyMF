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

			if (cmdIsAllowed(cmd_arr[0])) {

				if (cmdIsAuthorized()) {

					exec(cmd_str, function(err, stdout, stderr) {
						cmdLog(err);
						callback(err, stdout, stderr);
					});

				}
				else {
					eh.unauthorizedCmd(cmd_str, auth);
				}

			}
			else {
				eh.disallowedCmd(cmd_str);
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

		isAllowed: function(cmd) {
			return cmdIsAllowed(cmd);
		},

		isAuthorized: function() {
			return cmdIsAuthorized();
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

	function cmdIsAllowed(c) {

		// Is the command in the required_bins array? Is the subcommand allowed?
		// Are the flags allowed? This depends on you having put the subcommand
		// and flags in the cache. A bit hacky, I know.

		var eb = smfConfig.external_bins,
				af;	// allowed flags

		// Is the external shell command allowed?

		if (_.contains(_.keys(eb), c)) {
			smfCore.log('debug', 'execution permitted: ' + c);

			// do we have a sub-command?

			if (cache.subcmd) {

				// Yes. Is it allowed?

				if (_.contains(_.keys(eb[c]), cache.subcmd)) {
					smfCore.log('debug', 'execution permitted: ' + c + ' ' +
							cache.subcmd);
				}
				else {
					smfCore.log('err', 'unauthorized ' + c + ' subcommand: ' +
							cache.subcmd);
					eh.disallowedSubCmd(cache.subcmd);
					return false;
				}

				// Does the subcommand have flags?

				af = eb[c][cache.subcmd].flags;
			}
			else {
				// We don't have a subcommand, but we may have flags
				af = eb[c].flags;
			}

			// If we have flags, see if they're allowed

			if (cache.flags) {

				_.each(cache.flags.split(''), function(f) {

					if (!_.contains(af, '-'+f)){
						smfCore.log('err', 'unauthorized flag: ' + f);
						eh.disallowedFlag('-'+f);
						return false;
					}

				});

			}

		}
		else { // The external isn't allowed
			return false;
		}

		return true;
	}

	function cmdIsAuthorized() {

		// Does the user have the right authorizations to run a command?

		return _.contains(cache.user.auths, auth);
	}

}

module.exports = smfCommand;


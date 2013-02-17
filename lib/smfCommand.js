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
	// contents of req.params.cache, an authorization level required to
	// run the command, and an error handler.
	//
	// Assemble two commands. One to be executed, one to be checked. The
	// second is compared against the external_bins configuration setting.

	var exec_arr = [],
		cmd_str,
		cmd_word,
		eb = smfConfig.external_bins,
		af;	// allowed flags

	// First, see if the authorization required is in the list of the user's
	// auths. If not, there's no point going any further.

	if (_.contains(cache.t.user.auths, auth)) {
		smfCore.log('debug', 'authorizations met');
	}
	else {
		eh.unauthorizedCmd(auth);
		return next();
	}
	
	// Are we intending to run this command with zlogin? Is zlogin allowed?
	// It ought to be the first element of the cache value

	if (runInOtherZone() && cache.p.zlogin) {
		console.log('here');
		execAllowed(cache.p.zlogin[0]);
		exec_arr = cache.p.zlogin.slice();
	}

	// The external command is the first element of raw_cmd. Check it's
	// allowed, and add it into the exec array.

	cmd_word = raw_cmd.shift();
	execAllowed(cmd_word);
	exec_arr.push(cmd_word);

	// If we have Illumos '-z' options, we have to pop them in right after the
	// command word.

	if (runInOtherZone() && cache.p.zopts) {
		exec_arr.push(cache.p.zopts);
	}

	// Tag on the other args and options. exec() commands will need the
	// command as a string, spawn() needs it as an arry

	exec_arr = exec_arr.concat(raw_cmd);
	cmd_str = exec_arr.join(' ').replace(/\s+/g, ' ').trim();

	// do we have a sub-command? I don't like how this gets passed through
	// manually. We probably ought to be working it out on the fly.

	if (cache.t.subcmd) {

		if (_.contains(_.keys(eb[cmd_word]), cache.t.subcmd)) {
			smfCore.log('debug', cmd_word + ' subcommand permitted: ' +
									cache.t.subcmd);
		}
		else {
			smfCore.log('err', cmd_word + ' unauthorized subcommand: ' +
									cache.t.subcmd);
			eh.disallowedSubCmd(cache.t.subcmd);
			return next();
		}

		// Does the subcommand have a list of allowed flags?

		af = eb[cmd_word][cache.t.subcmd].flags;
	}
	else {
		// We don't have a subcommand, but we may have flags
		af = eb[cmd_word].flags;
	}

	// If we have flags, see if they're allowed

	if (cache.t.flags) {

		_.each(cache.t.flags.split(''), function(f) {

			if (!_.contains(af, '-'+f)){
				eh.disallowedFlag('-'+f);
				return next();
			}

		});

	}

	// If we make it to here, the command can be execed or spawned. You just
	// have to call one of the methods in the closure to do the do.

	return {

		cmdExec: function(callback) {

			// Execute a command. Requires a callback that knows how to
			// handle the data that comes out of exec().
			//
			smfCore.log('debug', 'exec: ' + cmd_str);
			
			exec(cmd_str, function(err, stdout, stderr) {
				cmdLog(err);
				callback(err, stdout, stderr);
			});

		},

		cmdSpawn: function(callback) {

			// Spawn a command. Return a handle to the output stream.
			//

			smfCore.log('debug', 'spawn: ' + exec_arr.join(' '));
			var external = exec_arr.shift();
			return spawn(external, exec_arr);
		},

	};

	//-- private methods --------------------------------------------------

	function runInOtherZone() {
		return (cache.t.zone !== '@' && cache.t.zone !== cache.p.zonename);
	}

	function execAllowed(cmd) {

		// See if a command is allowed.

		if (_.contains(_.keys(eb), cmd)) {
			smfCore.log('debug', 'execution permitted: ' + cmd);
		}
		else {
			eh.disallowedCmd(cmd);
		}

	}

	function cmdLog(err) {

		// Log information about any external commands being executed. Tell
		// log() to print the command in single quotes, which I think makes
		// it easier for the user to see.

		var cmdtxt = 'zone=' + cache.t.zone + ',user=' + cache.t.user.name +
			',cmd=\'' + cmd_str + '\'';

		if (err) {
			smfCore.log('err', cmdtxt + ',EXIT=' + err.code);
		}
		else{
			smfCore.log('notice', cmdtxt + ',OK');
		}

	}

}

module.exports = smfCommand;


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
		smfLog = require('./smfLog')(),
		smfConfig = require('./smfConfig')();

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
		smfLog.debug({auth: auth}, 'authorization met');
	}
	else {
		eh.unauthorizedCmd(auth);
	}

	// Are we intending to run this command with zlogin? Is zlogin allowed?
	// It ought to be the first element of the cache value

	if (runInOtherZone() && cache.t.zlogin) {
		execAllowed(cache.t.zlogin[0]);
		exec_arr = cache.t.zlogin.slice();
	}

	// The external command is the first element of raw_cmd. Check it's
	// allowed, and add it into the exec array.

	cmd_word = raw_cmd.shift();
	execAllowed(cmd_word);
	exec_arr.push(cmd_word);

	// If we have Illumos '-z' options, we have to pop them in right after the
	// command word. svccfg does not support -z!

	if (runInOtherZone() && cache.t.zopts && cmd_word !== '/usr/sbin/svccfg') {
		exec_arr.push(cache.t.zopts);
	}

	// do we have a sub-command? I don't like how this gets passed through
	// manually. We probably ought to be working it out on the fly.

	if (cache.t.subcmd) {

		var log_j = {cmd: cmd_word, subcmd: cache.t.subcmd};

		if (_.contains(_.keys(eb[cmd_word]), cache.t.subcmd)) {
			smfLog.debug(log_j, 'subcommand permitted');
		}
		else {
			smfLog.warn(log_j, 'subcommand not permitted');
			eh.disallowedSubCmd(cache.t.subcmd);
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
			}

		});

	}

	// exec() commands will need the command as a string, spawn() needs it as
	// an array. We know the flags and subcommands are good, so tag them on
	// to the exec_arr and make a string out of the result.

	exec_arr = exec_arr.concat(raw_cmd);

	// If this is a svccfg command for another zone, on Illumos, our command
	// becomes svccfg reading input from stdin. The calling routine will write
	// to its stdin. This has to be spawn()ed, but all our svccfg commands are
	// anyway.

	if (cmd_word === '/usr/sbin/svccfg' && runInOtherZone() && cache.t.zopts) {
		exec_arr = [ '/usr/sbin/svccfg', '-f', '-' ];
	}

	cmd_str = exec_arr.join(' ').replace(/\s+/g, ' ').trim();

	// If we make it to here, the command can be execed or spawned. You just
	// have to call one of the methods in the closure to do the do.


	return {

		cmdExec: function(callback) {

			// Execute a command. Requires a callback that knows how to
			// handle the data that comes out of exec().

			smfLog.debug({cmd: cmd_str, method: 'exec'}, 'running command');

			exec(cmd_str, function(err, stdout, stderr) {
				callback(err, stdout, stderr);
			});

		},

		cmdSpawn: function(callback) {

			// Spawn a command. Return a handle to the output stream.
			//
			var external,
					proc;

			smfLog.debug({cmd: cmd_str, method: 'spawn'}, 'running command');

			external = exec_arr.shift();
			proc = spawn(external, exec_arr);
			smfLog.debug({child_pid: proc.pid}, 'process spawned');
			return proc;
		},

		logExecErr: function(err) {
			cmdLog(err);
		},

		logSpawnInput: function(cmd, input) {

			// Log the input that's sent to a spawned command. This is public
			// because it's called only from smfGetMethods

			smfLog.debug({input: input.replace(/\n/g, '\\n') + "'"},
				'sending input to spawned cmd');
			},

		stream_handler: function(type, proc, req, res, send_complete) {

			// Call with send_complete to send a completeCmd() message to the
			// client. Otherwise we assume the stream we sent was the message and
			// silently close the connection.
			//
			var sent_header,
					last_stderr = '';

			proc.stdout.on('data', function(data) {

				// Send the header on the first write. If you try to set the header
				// before here, Restify seems to get confused about the content-type
				// to use for errors.

				if (!sent_header) {
					res.setHeader('Content-Type', type);
					sent_header = true;
				}

				res.write(data);
			});

			// When the command exits, close the client connection and log the
			// command plus the exit code. Have to listen for 'close' now, not
			// 'exit'!

			proc.on('close', function(exit_code) {
				logSpawnClose(proc.pid, exit_code);

				// We don't send a completeCmd message on streams - the stream
				// itself if the message. We do, however, send an error back to the
				// client if one occurs.

				if (exit_code === 0) {

					if (send_complete) {
						eh.completeCmd();
					}
					else {
						res.end();
					}

				}
				else {
					//
					// The last thing written to stderr is in 'last_stderr'. We can
					// examine that to see what message to send to the user.

					if (last_stderr.match(/doesn't match any services/)) {
						eh.unknownSvc(req.params.svc);
					}
					else {
						eh.genericErr('Command did not complete');
					}

				}

			});

			proc.stderr.on('data', function(data) {
				//
				// We now log any stdout as a notice, but don't halt execution. We also
				// store it in a buffer, to be examined at process end.
				//
				last_stderr = data.toString();
				logSpawnStdErr(proc.pid, data.toString());
			});

		}

	};

	//-- private methods --------------------------------------------------

	function logSpawnStdErr(pid, data) {

		// Put a line in the log file when anything gets written to standard
		// error.

		smfLog.warn({child_pid: pid, STDERR: data.toString()});
	}

	function logSpawnClose(pid, exit) {

		// Write a process's exit to the log file

		var j_log = {child_pid: pid, exit_code: exit}, process_exited;

		if (exit === 0) {
			smfLog.info(j_log);
		}
		else {
			smfLog.warn(j_log);
		}

	}

	function runInOtherZone() {

		// Return true if we're going to run the process in a zone other than
		// the one the daemon is running in
		//
		return (cache.t.zone !== '@' && cache.t.zone !== cache.p.zonename);
	}

	function execAllowed(cmd) {

		// See if a command is allowed.

		if (_.contains(_.keys(eb), cmd)) {
			smfLog.debug({cmd: cmd}, 'execution permitted');
		}
		else {
			eh.disallowedCmd(cmd);
		}

	}

	function cmdLog(err) {

		// Log information about any external commands being executed. Tell
		// log() to print the command in single quotes, which I think makes
		// it easier for the user to see.

		if (err) {
			return err;
		}
		else{
			smfLog.info({zone: cache.t.zone, user: cache.t.user.name, cmd:
				cmd_str, "status": "ok"});
		}

	}

}

module.exports = smfCommand;


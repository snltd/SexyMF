//============================================================================
//
// smfPostMethods.js
// -----------------
//
// Methods that respond to POST requests. These CHANGE things, or at least
// attempt to. External commands are run through the smfCommand module.
//
// R Fisher 01/2013
//
//============================================================================

"use strict";

var smfCommand = require('./smfCommand'),
		smfError = require('./smfError'),
		smfLog = require('./smfLog')(),
		smfCommon = require('./smfCommon');

module.exports = {

svcadmCmd: function(req, res, next) {

	// Control services with svcadm. Params will have been validated in
	// middleware. If the user we're running as doesn't have permission to
	// do the operation, that's not our problem. All we have to do is report
	// it.

	var c_arr,
			cmd,
			eh = smfError(req, res, next);

	req.params.cache.t.subcmd = req.params.cmd;

	c_arr = ['/usr/sbin/svcadm', req.params.cmd, req.params.flags];

	// the "mark" subcommand has a different syntax

	if (req.params.cmd === 'mark') {

		if (req.params.state) {
			c_arr.push(req.params.state);
		}
		else {
			eh.missingState();
		}

	}

	c_arr.push(req.params.svc);

	cmd = smfCommand(c_arr, req.params.cache, 'manage', eh);

	cmd.cmdExec(function(err, stdout, stderr) {

		// 'svcadm restart' and 'refresh' return 0 if a user doesn't have the
		// authorizations to perform the operation. 'enable' and 'disable'
		// return 1. So, it's not safe to go on the error code. However, all
		// commands write to stderr if they don't work

		if (err) {
			cmd.logExecErr(err);

			if (stderr.match(/FMRI/)) {

				if (req.params.flags && stderr.match(/ -- /)) {
					eh.unknownFlag(req.params.flags);
				}
				else {
					eh.unknownCmd(req.params.cmd);
				}

			}
			else {
				eh.genericErr(stderr);
			}

		}
		else {
			eh.completeCmd();
		}


	});

},


svccfgCmd: function(req, res, next) {

	// Run a svccfg(1m) command. As ever, all the params can be trusted
	// thanks to the middleware.

	var eh = smfError(req, res, next),
			c_arr = ['/usr/sbin/svccfg'],
			cmd,
			proc,
			input,
			command,
			last_stderr;

	// Build up the svcccg command.

	command = [req.params.cmd];

	switch (req.params.cmd) {

	case 'setprop':
		command.push(req.params.prop);
		command.push('=');

		if (req.params.type) {
			command.push(req.params.type + ': ');
		}

		command.push(req.params.val);
		break;

	case 'delprop':
		command.push(req.params.prop);
		break;

	default:
		eh.unknownCmd(req.params.cmd);
	}

	// For the local zone we execute a simple svccfg command; for other zones
	// we have to build up input to push into svccfg via stdin.

	if (smfCommon.illumos_ngz(req.params.cache)) {
		input = 'repository ' + smfCommon.path_to_db(req.params) + '\n' +
						'select ' + req.params.svc + '\n' +
						command.join(' ') + '\n\0';
		c_arr = c_arr.concat(['-f', '-']);
	}
	else {
		c_arr = c_arr.concat(['-s', req.params.svc]).concat(command);
	}

	cmd = smfCommand(c_arr, req.params.cache, 'alter', eh);
	proc = cmd.cmdSpawn();

	if (smfCommon.illumos_ngz(req.params.cache)) {
		cmd.logSpawnInput('svccfg', input);
		proc.stdin.write(input);
	}

	cmd.stream_handler('application/xml', proc, req, res, true);
},

kickSvc: function(req, res, next) {

	// If a service is in maintenance, clear it. If it's disabled, enable it.
	// If it's enabled, restart it. This is a response to Illomos RFE #3596.

	var adm_cmd,
			state,
			eh = smfError(req, res, next);

	// Get the service state.

	var cmd = smfCommand(['/bin/svcs', '-H', '-o', 'state', req.params.svc],
			req.params.cache, 'manage', eh);

	cmd.cmdExec(function(err, stdout, stderr) {

		if (err) {
			eh.unknownSvc(req.params.svc);
		}

		// From the service state, work out the action to take, and use the
		// existing svcadm method to run it.

		state = stdout.trim();

		// Check for ambiguous services

		if (state.match(/\n/)) {
			eh.ambiguousSvc(req.params.svc);
		}

		if (state === 'online' || state === 'offline*') {
			adm_cmd = 'restart';
		}
		else if (state === 'disabled') {
			adm_cmd = 'enable';
		}
		else if (state === 'maintenance') {
			adm_cmd = 'clear';
		}
		else {
			eh.unknownState(state);
		}

		smfLog.debug({svc: req.params.svc, state: state, action: 'kick', cmd:
			'svcadm ' + adm_cmd});

		req.params.cmd = adm_cmd;

		module.exports.svcadmCmd(req, res, next);
	});

}

}; // End exports

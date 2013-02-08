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
	smfCore = require('./smfCore');

module.exports = {

svcadmCmd: function(req, res, next) {

	// Control services with svcadm. Params will have been validated in
	// middleware. If the user we're running as doesn't have permission to
	// do the operation, that's not our problem. All we have to do is report
	// it.

	var eh = smfError(req, res, next);

	req.params.cache.t.subcmd = req.params.cmd;

	var c_arr = [ '/usr/sbin/svcadm', req.params.cmd,
			req.params.flags ];

	// the "mark" subcommand has a different syntax

	if (req.params.cmd === 'mark') {

		console.log(req.params.state);
		if (req.params.state) {
			c_arr.push(req.params.state);
		}
		else {
			eh.missingState();
		}

	}

	c_arr.push(req.params.svc);

	var cmd = smfCommand(c_arr, req.params.cache, 'manage', eh);

	cmd.cmdExec(function(err, stdout, stderr) {

		// 'svcadm restart' and 'refresh' return 0 if a user doesn't have the
		// authorizations to perform the operation. 'enable' and 'disable'
		// return 1. So, it's not safe to go on the error code. However, all
		// commands write to stderr if they don't work

		if (stderr) {

			// If we get usage info, assume a nonsense command and send a 404.
			// Unless we also get ' -- ', which is used to denote a bad flag.
			// Otherwise, send stderr through wholesale.

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
			c_arr = [ '/usr/sbin/svccfg', '-s', req.params.svc, req.params.cmd ],
			cmd;

	switch (req.params.cmd) {

	case 'setprop':
		c_arr.push(req.params.prop);
		c_arr.push('=');

		if (req.params.type) {
			c_arr.push(req.params.type + ': ');
		}

		c_arr.push(req.params.val);
		break;

	case 'delprop':
		c_arr.push(req.params.prop);
		break;

	default:
		eh.unknownCmd(req.params.cmd);
	}

	cmd = smfCommand(c_arr, req.params.cache, 'alter', eh);

	cmd.cmdExec(function(err, stdout, stderr) {

		// Errors are most likely due to the SexyMF user not having
		// authorization to perform the requested operation. Just pass
		// whatever the OS says back to the user

		if (err) {
			eh.genericErr(stderr);
		}
		else {
			eh.completeCmd();
		}

	});

}

}; // End exports

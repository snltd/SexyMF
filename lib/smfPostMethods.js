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

	var cmd = smfCommand( [ '/usr/sbin/svcadm', req.params.cmd,
			req.params.flags, req.params.svc ], req.params.cache, 'manage', eh);

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
		cmd = smfCommand( [ '/usr/sbin/svccfg', '-s', req.params.svc,
				req.params.cmd ], req.params.cache, 'manage', eh);

	switch (req.params.cmd) {

	case 'setprop':
		cmd.push(req.params.prop);
		cmd.push('=');

		if (req.params.type) {
			cmd.push(req.params.type + ': ');
		}

		cmd.push(req.params.val);
		break;

	case 'delprop':
		cmd.push(req.params.prop);
		break;

	default:
		eh.unknownCmd(req.params.cmd);
	}

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

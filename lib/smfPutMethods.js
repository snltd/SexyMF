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

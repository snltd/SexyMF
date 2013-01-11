//============================================================================
//
// smfPostMethods.js
// -----------------
//
// Methods that respond to POST requests. These CHANGE things, or at least
// attempt to. The actual running is done by the run_cmd() function at the
// bottom.
//
// R Fisher 01/2013
//
//============================================================================

"use strict";

var 
	restify = require('restify'),
	core = require('./smfCore');

module.exports = {

svcadmCmd: function(req, res, next) {

	// Control services with svcadm. Params will have been validated in
	// middleware. If the user we're running as doesn't have permission to
	// do the operation, that's not our problem. All we have to do is report
	// it.

	var cmd = '/usr/sbin/svcadm ' + req.params.cache.zopts + 
		req.params.cmd + ' ' + req.params.flags + req.params.svc;

	core.run_cmd(cmd, req, res, next);
},


svccfgCmd: function(req, res, next) {

	// Run a svccfg(1m) command. As ever, all the params can be trusted
	// thanks to the middleware.

	var cmd = '/usr/sbin/svccfg -s ' + req.params.cache.zopts + 
		req.params.svc + ' ' + req.params.cmd + ' ';

	switch (req.params.cmd) {

	case 'setprop':
		cmd += req.params.prop + ' = ';
	
		if (req.params.type) {
			cmd += req.params.type + ': ';
		}

		cmd += req.params.val;
		break;

	case 'delprop':
		cmd += req.params.prop;
		break;

	default:
		return next(new restify.ResourceNotFoundError(
					'Unknown or unsupported command: ' + req.params.cmd));

	}

	core.run_cmd(cmd, req, res, next);
}

}; // End exports

//----------------------------------------------------------------------------
// PRIVATE METHODS

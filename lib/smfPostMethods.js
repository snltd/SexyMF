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

var exec = require('child_process').exec,
	child,
	restify = require('restify'),
	core = require('./smfCore');

module.exports = {

svcadmCmd: function(req, res, next) {

	// Control services with svcadm. Params will have been validated in
	// middleware. If the user we're running as doesn't have permission to
	// do the operation, that's not our problem. All we have to do is report
	// it.

	var cmd = '/usr/sbin/svcadm ' + req.params.cmd + ' ' + 
		req.params.flags + ' ' + req.params.svc;

	run_cmd(cmd, req, res, next);
},

svccfgCmd: function(req, res, next) {

	// Set a property value via svccfg(1m).

	var cmd = '/usr/sbin/svccfg -s ' + req.params.svc + ' setprop ' + 
		req.params.prop + ' = ';
	
	if (req.params.type) {
		cmd += req.params.type + ': ';
	}

	cmd += req.params.val;

	run_cmd(cmd, req, res, next);
}

}; // End exports

function run_cmd(cmd, req, res, next) {

	// Function to run an external command and handle what comes back

	child = exec(cmd, function(err, stdout, stderr) {
		core.cmd(cmd, err);

		if (err) {

			// Although svcadm returns 0 for a "no permisson" error, I'm
			// always getting 1 as my error code. I don't know what language
			// the user may have set, so I'm going to try to distinguish
			// between a "no such service" and a "no permission" error by
			// exploiting the fact that the former prints the name of the
			// service you tried to use in strong quotes.

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

}

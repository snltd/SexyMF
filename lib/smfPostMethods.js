"use strict";

var exec = require('child_process').exec,
	child,
	restify = require('restify');

module.exports = {

svcadmSingle: function(req, res, next) {

	// Control services with svcadm. Params will have been validated in
	// middleware
	console.log(req.params);

	child = exec('/usr/sbin/svcadm ' + req.params.cmd + ' ' + req.params.svc,
			function(err, stdout, stderr) {

	// If you try to change a service state and don't have permission to do
	// so, svcadm exists zero. If you try to change a service which doesn't
	// exist, it exits 1.
	
		if (err) {
			console.log(err.code);
			if (err.code === 1) {
				return next(new restify.InternalError(stderr));
			}
			else {
				return next(new restify.InvalidArgumentError(stderr));
			}

		}

		console.log(stderr);
		console.log(stdout);
	});

}
}; // End exports

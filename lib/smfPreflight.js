//============================================================================
//
// smfPreflight.js
// ---------------
//
// Simple checks to make sure the environment is sane and suitable. Exit
// non-zero if anything's totally broken, issue warnings and notifications
// on other triggers.
//
// R Fisher 01/2013
//
//============================================================================

"use strict";

var os = require('os'),
		fs = require('fs'),
		_ = require('underscore'),
		smfLog = require('./smfLog')(),
		smfConfig = require('./smfConfig')();

module.exports = {

runChecks: function() {

	// We only run on SunOS. Is that what we're on?

	if (os.platform() !== 'sunos') {
		console.error('This is not a SunOS platform.');
		process.exit(1);
	}

	// Do we have all the external binaries listed in the core_config file?
	// Doesn't hurt to do this sync as we only do it once, on server
	// startup.

	_.each(_.keys(smfConfig.external_bins), function(bin, x) {

		if (!fs.existsSync(bin)) {
			var str = "missing external: " + bin;
			console.error(str);
			smfLog.fatal(str);
			process.exit(100);
		}

	});

},

userCheck: function() {

	// Who are we running as?
	//
	var uid = process.getuid();

	if (uid === 0) {
		console.error('WARNING: running as root user');
		smfLog.warn({uid: uid}, 'running as root user!');
	}
	else {
		console.error('SexyMF launched with UID ' + uid);
		smfLog.info({uid: uid}, 'launched with UID ' + uid);
	}

}

}; // end exports


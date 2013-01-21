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

var os = require('os'),
	fs = require('fs'),
	_ = require('underscore'),
	smfCore = require('./smfCore'),
	smfConfig = require('./smfConfig');

module.exports = {

runChecks: function() {

	// We only run on SunOS. Is that what we're on?
	
	if (os.platform() !== 'sunos') {
		smfCore.log('err', 'This is not a SunOS platform.');
		process.exit(1);
	}

	// Do we have all the external binaries listed in the core_config file?
	// Doesn't hurt to do this sync as we only do it once, on server
	// startup.
	
	_.each(smfConfig.external_bins, function(bin) {

		if (!fs.existsSync(bin)) {
			smfCore.log('err', 'can\'t find ' + bin);
			process.exit(1);
		}
		
	});

},

userCheck: function() {

	// Who are we running as?

	if (process.getuid() === 0) {
		smfCore.log('warn', 'running as root user!');
	}
	else {
		smfCore.log('notice', 'launched with UID ' + process.getuid());
	}

}

};

/*
	function check_privs() {

		// Does the process have the privileges it needs to operate fully?
		// Say so if not.
		// 04
		// called by check_root()
		// calls start_server()

		if (cache.illumos) {
			exec('/bin/ppriv ' + process.pid, function(err, stdout, stderr)
				 {

				if (!stdout.match(/E: .*file_dac_search/)) {
					smfCore.log('warn', 'process does not have ' + 
					'\'file_dac_search\' privilege.\nWill not be able to ' +
					'access local zones from global.');
				}

				return start_server();
			});
		}
		else {
			// Solaris
			smfCore.log('warn', 'Solaris does not yet support managing ' +
						'services in non-global zones');
			return start_server();
		}

	}


})();
*/

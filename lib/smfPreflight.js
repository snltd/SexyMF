

// Very early, and hopefully unnecessary, pre-flight checks. We only run on
// SunOS, and we need the support binaries listed in the core config file.

if (os.platform() !== 'sunos') {
	smfCore.log('err', 'This is not a SunOS platform.');
	process.exit(1);
}

_.each(smfConfig.required_bins, function(bin) {

	if (!fs.existsSync(bin)) {
		smfCore.log('err', 'can\'t find ' + bin);
		process.exit(1);
	}

});

/*


// More preflight checks before we start up the server
(function main() {

	// This is a startup. Because Node is asynchronous, we have to shove all
	// kinds of stuff in here. I've chosen to chain the functions rather
	// than nesting. I don't mind running them in series because they're all
	// quick, and they only run at startup.

	(function cache_zonename() {

		// Get the current zone's name and cache it.  This is passed to the
		// validation functions by the my_zonename middleware
		// 01
		// calls check_illumos()


	})();

	function check_illumos() {

		// Does this machine give us the cool Illumos extensions to the SMF
		// commands?
		// 02
		// called by cache_zonename()
		// calls check_privs()

		exec('/bin/svcs -h', function(err, stdout, stderr) {
			cache.illumos = (stderr.match(/\-L/)) ? true : false;
			smfCore.log('notice', 'detected Illumos SMF extensions');
			return check_root();
		});
	}

	function check_root() {
	
		// Issue a warning if running as root

		// 03
		// called by check_illumos()
		// calls check_privs()
		
		if (process.getuid() === 0) {
			smfCore.log('warn', 'running as root user!');
		}
		else {
			smfCore.log('notice', 'running with UID ' + process.getuid());
		}

		return check_privs();
	}


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

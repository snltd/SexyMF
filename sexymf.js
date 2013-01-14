#!/bin/env node

//============================================================================
//
// sexymf.js
// ---------
//
// R Fisher 01/2013
//
//============================================================================

"use strict";

// Modules we need. I always go node core, external dependency, then my
// modules. Kind of in descending order of how much I trust them.

var os = require('os'),
	fs = require('fs'),
	path = require('path'),
	exec = require('child_process').exec,
	_ = require('underscore'),
	optparse = require('optparse'),
	smfConfig = require('./lib/smfConfig.js'),
	smfCore = require('./lib/smfCore');

var cache = {},
	ssl;

// Option parsing

var SWITCHES = [
		[ '-p', '--port NUMBER', 'listen on thist port' ],
		[ '-V', '--version', 'print version and exit' ],
		[ '-h', '--help', 'print this and exit' ]
	],
	parser = new optparse.OptionParser(SWITCHES),
	options = { port: smfConfig.listen_port };

parser.banner = 'Usage: ' + path.basename(__filename) + ' [options]';

parser.on('port', function(value) {
	options.port = value;
});

parser.on('version', function() {
	console.log(require(path.join(__dirname, 'package.json')).version);
	process.exit(0);
});

parser.on('help', function() {
	console.log(parser.toString());
	process.exit(0);
});

parser.parse(process.argv);

// Are we using SSL?

if (smfConfig.useSSL) {
	ssl = {
		certificate: fs.readFileSync('./config/ssl/server.crt'),
		key: fs.readFileSync('./config/ssl/server.key')
	};
}
else {
	ssl = { certificate: false, key: false };
}

// Call the app module, which sets up Restify and all the routing.

var smfApp = require('./lib/smfApp');

smfApp.setupApp( {
	name: "SexyMF",
	certificate: ssl.certificate,
	key: ssl.key
	}
);

smfApp.add(function mw_zonename(req, res, next) {

	// This is a crude piece of middleware which sets the zone name the
	// process is running in, so it doesn't have to be queried with every
	// request. It has to go in this file because of variable scope.

	req.params.cache = cache;
	return next();
});

// END OF ROUTING
//----------------------------------------------------------------------------

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

		exec('/bin/zonename', function(err, stdout, stderr) {
			cache.zonename = stdout.trim();
			smfCore.log('notice', 'running in zone \'' + cache.zonename + '\'');
			return check_illumos();
		});

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

	function start_server() {
		smfApp.startApp(options.port);
	}

})();

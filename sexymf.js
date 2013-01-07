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
// modules.

var os = require('os'),
	fs = require('fs'),
	exec = require('child_process').exec,
	child,
	_ = require('underscore'),
	restify = require('restify'),
	config = require('./lib/smfConfig.js'),
	getMethods = require('./lib/smfGetMethods'),
	postMethods = require('./lib/smfPostMethods'),
	v = require('./lib/smfValidate');

var cache = {},
	ssl;

// Pre-flight checks. We only run on SunOS, and we need the support binaries
// listed in the core config file.

if (os.platform() !== 'sunos') {
	console.error('ERROR: This is not a SunOS platform.');
	process.exit(1);
}

_.each(config.required_bins, function(bin) {

	if (!fs.existsSync(bin)) {
		console.error('ERROR: can\'t find ' + bin);
		process.exit(1);
	}

});

// Are we using SSL?

if (config.useSSL) {
	ssl = {
		certificate: fs.readFileSync('./config/ssl/server.crt'),
		key: fs.readFileSync('./config/ssl/server.key')
	};
}
else {
	ssl = { certificate: false, key: false };
}

// So far so good. Time to start a restify instance and tell it that we want
// to parse GET query strings and POST bodies, that we'll always want to
// validate the zone the user supples, then apply a little tweak for cURL 

var app = restify.createServer({ 
	name: "SexyMF",
	certificate: ssl.certificate,
	key: ssl.key
});

app.use(restify.bodyParser());
app.use(restify.queryParser());
app.use(my_zonename);
app.use(v.validate_zone);
app.pre(restify.pre.userAgentConnection());

//----------------------------------------------------------------------------
// ROUTING
//
// GET calls first. These only GET information about the system. They can't
// change anything and they require no special privileges to work

app.get('/smf/:zone/svcs', v.validate_svc, v.validate_state, function(req,
			res, next) {

	// API calls which mimic the svcs(1) command but do not change system
	// state.  There are two methods to handle this input

	if (req.params.svc) {
		getMethods.svcsSingleService(req, res, next);
	}
	else {
		getMethods.svcsMultiService(req, res, next);
	}

});

app.get('/smf/:zone/svcprop', v.validate_svc, v.validate_props,
		function(req, res, next) {

	// API calls which mimic the svcprop(1) command, but do not change
	// system state

	getMethods.svcpropMulti(req, res, next);
});

app.get('/smf/:zone/log', v.validate_lines, v.validate_svc, function(req,
			res, next) {

	// API calls to tail service log files

	getMethods.fetchLog(req, res, next);
});

app.post('/smf/:zone/svcadm', function(req, res, next) {

	// API calls to svcadm

	postMethods.svcadmSingle(req, res, next);
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
			return check_privs();
		});
	}

	function check_privs() {

		// Does the process have the privileges it needs to operate fully?
		// Say so if not.
		// 03
		// called by check_illumos()
		// calls start_server()

		if (cache.illumos) {
			exec('/bin/ppriv ' + process.pid, function(err, stdout, stderr)
				 {

				if (!stdout.match(/E: .*file_dac_search/)) {
					console.log('WARNING: process does not have ' + 
					'\'file_dac_search\' privilege.\nWill not be able to ' +
					'access local zones from global.');
				}

				return start_server();
			});
		}
		else {
			// Solaris
			console.log('WARNING: Solaris does not yet support managing ' +
						'services in non-global zones');
			return start_server();
		}

	}

	function start_server() {

		// Start the server
		// 04
		// called by check_privs()
	
		app.listen(config.listen_port, function() {
			console.log(app.name + ' receiving requests on port ' +
						config.listen_port);
		});

	}

})();

//----------------------------------------------------------------------------
// FUNCTIONS

function my_zonename(req, res, next) {

	// This is a crude piece of middleware which sets the zone name the
	// process is running in, so it doesn't have to be queried with every
	// request. It has to go in this file because of variable scope.

	cache.zopts = ' ';
	req.params.cache = cache;
	next();
}

// Done

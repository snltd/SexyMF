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
	exec = require('child_process').exec,
	_ = require('underscore'),
	restify = require('restify'),
	config = require('./lib/smfConfig.js'),
	getMethods = require('./lib/smfGetMethods'),
	postMethods = require('./lib/smfPostMethods'),
	auth = require('./lib/smfAuth'),
	mw = require('./lib/smfMiddleware'),
	core = require('./lib/smfCore');

var cache = {},
	ssl;

// Pre-flight checks. We only run on SunOS, and we need the support binaries
// listed in the core config file.

if (os.platform() !== 'sunos') {
	core.log('err', 'This is not a SunOS platform.');
	process.exit(1);
}

_.each(config.required_bins, function(bin) {

	if (!fs.existsSync(bin)) {
		core.log('err', 'can\'t find ' + bin);
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
app.use(restify.authorizationParser());
app.use(mw_zonename);
app.use(mw.chkZone);
app.use(auth.authenticate_user);
app.pre(restify.pre.userAgentConnection());

//----------------------------------------------------------------------------
// ROUTING
//
// GET calls first. These only GET information about the system. They can't
// change anything and they require no special OS privileges to work

app.get('/smf/:zone/svcs', mw.chkSvc, mw.chkState, getMethods.svcsCmd);

app.get('/smf/:zone/svcprop', mw.chkSvc, mw.chkProp, getMethods.svcpropCmd);

app.get('/smf/:zone/log', mw.chkSvc, mw.chkLines, getMethods.fetchLog);

app.get('/smf/:zone/svccfg/:cmd', mw.chkSvc, getMethods.svccfgCmd);

// POST routes now

app.post('/smf/:zone/svcadm/:cmd', mw.chkSvc, mw.chkCmd, mw.chkFlag,
		postMethods.svcadmCmd);

app.post('/smf/:zone/svccfg/:cmd', mw.chkSvc, mw.chkCmd, mw.chkProp,
		postMethods.svccfgCmd);

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
					core.log('warn', 'process does not have ' + 
					'\'file_dac_search\' privilege.\nWill not be able to ' +
					'access local zones from global.');
				}

				return start_server();
			});
		}
		else {
			// Solaris
			core.log('warn', 'Solaris does not yet support managing ' +
						'services in non-global zones');
			return start_server();
		}

	}

	function start_server() {

		// Start the server
		// 04
		// called by check_privs()
	
		app.listen(config.listen_port, function() {

			var str = app.name + ' receiving ';

			if (ssl.certificate) {
				str += 'SSL ';
			}

			core.log('notice', str + 'requests on port ' +
				config.listen_port);
		});

	}

})();

//----------------------------------------------------------------------------
// FUNCTIONS

function mw_zonename(req, res, next) {

	// This is a crude piece of middleware which sets the zone name the
	// process is running in, so it doesn't have to be queried with every
	// request. It has to go in this file because of variable scope.

	cache.zopts = ' ';
	req.params.cache = cache;
	return next();
}

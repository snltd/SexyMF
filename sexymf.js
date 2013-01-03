#!/bin/env node

//============================================================================
//
// sexymf.js
// ---------
//
// R Fisher 01/2013
//
//============================================================================

// Modules we need. I always go node core, external dependency, then my
// modules.

var os = require('os'),
	fs = require('fs'),
	_ = require('underscore'),
	restify = require('restify'),
	config = require('./lib/smfConfig.js'),
	getMethods = require('./lib/smfGetMethods'),
	v = require('./lib/smfValidate');

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

// So far so good. Time to start a restify instance and tell it that we want
// to parse query strings, that we'll always want to validate the zone the
// user supples, then apply a little tweak for cURL 

var app = restify.createServer({ name: "SexyMF" });

app.use(restify.queryParser());
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

// END OF ROUTING
//----------------------------------------------------------------------------

// Start up the server

app.listen(config.listen_port);
console.log(app.name + ' receiving requests on port ' + config.listen_port);

// Done

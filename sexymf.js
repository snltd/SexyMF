#!/bin/env node

//============================================================================
//
// sexymf.js
// ---------
//
// R Fisher 01/2013
//
//============================================================================

var os = require('os'),
	restify = require('restify'),
	config = require('./lib/config.js'),
	getMethods = require('./lib/getMethods');

// Start a restify instance

var app = restify.createServer({
	name: "SexyMF"
});

// Tell restify that we want to parse query strings, then apply a little tweak
// for cURL 

app.use(restify.queryParser());
app.pre(restify.pre.userAgentConnection());

//----------------------------------------------------------------------------
// ROUTING
//
// GET calls first. These only GET information about the system. They can't
// change anything and they require no special privileges to work

app.get('/smf/:zone/svcs', function(req, res, next) {

	// API calls which mimic the svcs(1) command but do not change system state

	validate_zone(req.params.zone);

	// There are two methods to handle this input

	if (req.params.svc) {
		getMethods.svcsSingleService(req, res, next);
	}
	else {
		getMethods.svcsMultiService(req, res, next);
	}

});

app.get('/smf/:zone/svcprop', function(req, res, next) {

	// API calls which mimic the svcprop(1) command, but do not change system
	// state

	validate_zone(req.params.zone);
	getMethods.svcpropMulti(req, res, next);
});

app.get('/smf/:zone/log', function(req, res, next) {

	validate_zone(req.params.zone);
	getMethods.fetchLog(req, res, next);
});

// Start up the server

app.listen(config.listen_port);

//----------------------------------------------------------------------------
// FUNCTIONS

function validate_zone(zone) {

	// At the moment we only run in the current zone. If we get a request for a
	// zone other than ourselves, send a RestError

	if (zone !== '@' && zone !== os.hostname()) {
		return next(new restify.InvalidArgumentError('invalid zone. [' + zone +
					']'));
	}

}


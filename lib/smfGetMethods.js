//============================================================================
//
// getMethods.js
// -------------
//
// Methods that respond to GET requests
//
// R Fisher 01/2013
//
//============================================================================

"use strict";

var path = require('path'),
	fs = require('fs'),
	exec = require('child_process').exec,
	_ = require('underscore'),
	restify = require('restify'),
	config = require('./smfConfig');

module.exports = {

svcsSingleService: function(req, res, next) {

	// Send a JSON object describing the current status of a single service.
	// The service name has been validated by middleware

	exec('/bin/svcs -H' + req.params.cache.zopts + req.params.svc, 
			function(err, stdout, stderr) {

		if (err) {
			return next(new restify.InternalError(stderr));
		}

		res.send(svcs_to_json(stdout));
	});

},


svcsMultiService: function(req, res, next) {

	// Send a JSON object describing all services in the state given in
	// req.params.state. The state has been validated by middleware.
	// (Assuming it was set.)

	var i,
		jsvc,
		json = [],
		svcs,
		st = req.params.state;

	exec('/bin/svcs -a' + req.params.cache.zopts, function(err,
				stdout, stderr) {

		if (err) {
			return next(new restify.InternalError(stderr));
		}

		svcs = stdout.split('\n');

		// first line [0] is the header, so start at [1]

		for (i = 1; i < svcs.length; i++) {
			jsvc = svcs_to_json(svcs[i]);

			if (jsvc && ( !st || (st === 'all' || st === jsvc.state))) {
				json.push(jsvc);
			}

		}

		res.send(json);
	});

},


svcpropMulti: function(req, res, next) {

	// Send one, some, or all of a service's properties back as a JSON
	// object of key/value pairs. The value type (astring etc) is discarded.
	// We've validated the service name and all the service properties in
	// middleware.

	var props,
		i,
		kv,
		json = {},
		wants_list = (req.params.prop) ? req.params.prop.split(',') : false;

	exec('/bin/svcprop' + req.params.cache.zopts + req.params.svc,
			function(err, stdout, stderr) {
		props = stdout.split('\n');

		// The first line of output is the service name, so skip that

		for (i = 1; i < props.length; i++) {
			kv = props[i].split(/\s+/);

			if (!wants_list || _.contains(wants_list, kv[0])) {
				json[kv[0]] = kv[2];
			}

		}

		res.send(json);
	});

},


fetchLog: function(req, res, next) {

	// Get the path to the log file for the given service. Looks for lines=
	// and svc= in the params. The service and zone have been validated in
	// middleware. The sending of the log file is done by the
	// process_log_file() function, which is a callback to the exec()s.

	var svcs,
		path;

	// The first thing to do is get the path to the log file. Illumos has an
	// option which does that for us. For Solaris we have to make an
	// educated guess. Illumos first, because it's easy.

	if (req.params.cache.illumos) {
		exec('/bin/svcs -L' + req.params.cache.zopts + req.params.svc,
				function(err, stdout, stderr) { 
			
			if (err) {
				return next(new restify.InvalidArgumentError(stderr));
			}

			return process_log_file(stdout.trim(), req, res, next);
		});
	
	}
	else {

		// XXX not zone aware
		//
		// Solaris makes us do more work. We may only have been given part
		// of the service name, so run it through svcs to get the full FMRI

		exec('/bin/svcs -H ' + req.params.svc, function(err, stdout, stderr)
			{

			svcs = stdout.split('\n');

			if (svcs.length > 2) {
				return next(new restify.InvalidArgumentError('ambiguous name'));
			}

			path = path.join('/var/svc/log', svcs[0].replace(/^.*svc:\//,
					'').replace(/\//g, '-') + '.log');

			return process_log_file(path, req, res, next);
		});

	}

}

}; // end exports

//----------------------------------------------------------------------------
// PRIVATE METHODS

function svcs_to_json(line) {

	// Take a row of svcs(1) output and return a JSON object. Return false
	// if we don't get three fields. If the service is blacklisted, say so

	var json = {},
		a = line.trim().split(/\s+/g);

	if (a.length === 3) {
		json.fmri = a[2];

		// XXX crude first stab
		//
		if (config.blacklist && _.contains(config.blacklist, a[2])) {
			json.state = "DISALLOWED";
			json.stime = "DISALLOWED";
		}
		else {
			json.state = a[0];
			json.stime = a[1];
		}

		return json;
	}
	else {
		return false;
	}

}

function process_log_file(path, req, res, next) {

	var output = "",
		start,
		i,
		numlines = (req.params.lines) ? req.params.lines : config.log_lines;

	// Read in a log file, if it exists, and send some of it

	if (!fs.existsSync(path)) {
		return next(new restify.InternalError('no log file at:' + path));
	}

	fs.readFile(path, 'utf-8', function(err, logtxt) {

		if (err) {
			return next(new restify.InternalError('cannot read ' + path));
		}

		// The last line after this split is blank, hence the pop();
	
		logtxt = logtxt.split('\n');
		logtxt.pop();

		start = (logtxt.length > numlines) ? (logtxt.length - numlines) : 0;

		for (i = start; i < logtxt.length; i++) {
			output += logtxt[i] + '\n';
		}

		res.setHeader('content-type', 'text/plain');
		res.send(output);
	});

}

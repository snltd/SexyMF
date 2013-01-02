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

var path = require('path'),
	fs = require('fs'),
	exec = require('child_process').exec,
	child,
	restify = require('restify'),
	_ = require('underscore'),
	config = require('./config');

module.exports = {

svcsSingleService: function(req, res, next) {

	// Send a JSON object describing the current status of a single service

	child = exec('/bin/svcs -H ' + req.params.svc, function(err, stdout, stderr) {
		sendJSON(res, svcs_to_json(stdout));
	});

},


svcsMultiService: function(req, res, next) {

	// Send a JSON object describing all services in the state given in
	// req.query.state
	//

	var i,
		jsvc,
		json = [];

	child = exec('/bin/svcs -a', function(err, stdout, stderr) {
		svcs = stdout.split('\n');

		// first line [0] is the header, so start at [1]

		for (i = 1; i < svcs.length; i++) {
			jsvc = svcs_to_json(svcs[i]);

			if (jsvc && (req.query.state === 'all' || req.query.state ===
					jsvc.state)) {
				json.push(jsvc);
			}

		}

		sendJSON(res, json);
	});

},


svcpropMulti: function(req, res, next) {

	// Send one, some, or all of a service's properties back as a JSON object of
	// key/value pairs. The value type (astring etc) is discarded.

	var props,
		kv,
		wants_list,
		json = {};

	// XXX do command validation here

	// We may have a list of properties to get.

	wants_list = (req.query.prop) ?  req.query.prop.split(',') : false;
	
	child = exec('/bin/svcprop  ' + req.query.svc, function(err, stdout, stderr) {
		props = stdout.split('\n');

		// The first line of output is the service name, so skip that

		for (i = 1; i < props.length; i++) {
			kv = props[i].split(/\s+/);

			if (!wants_list || _.contains(wants_list, kv[0])) {
				json[kv[0]] = kv[2];
			}

		}

		sendJSON(res, json);
	});

},

fetchLog: function(req, res, next) {

	// Send the user a chunk of the log file for the given service. Looks for
	// lines= and svc= in the query string

	// XXX not zone-aware

	var svcs,
		i,
		logpath,
		logtxt,
		json,
		start,
		numlines = (req.query.lines) ? req.query.lines : config.log_lines;

	// We may only have been given part of the service name, so run it through
	// svcs to get the full FMRI

	child = exec('/bin/svcs -H ' + req.query.svc, function(err, stdout, stderr) {
		svcs = stdout.split('\n');

		if (svcs.length > 2) {
			return next(new restify.InvalidArgumentError('ambiguous name'));
		}

		// Work out the path name

		logpath = path.join('/var/svc/log', svcs[0].replace(/^.*svc:\//,
				'').replace(/\//g, '-') + '.log');

		// Now read in the file, if it exists, and send some of it

		if (fs.existsSync(logpath)) {

			// Read in the file and send only the last 100 lines

			fs.readFile(logpath, 'utf-8', function(err, logtxt) {

				if (err) {
					return next(new restify.InternalError('unable to read file ['
							+ logpath + ']'));
				}

				logtxt = logtxt.split('\n');
				start = (logtxt.length > numlines) ? logtxt.length - numlines : 0;

				for (i = start; i < logtxt.length; i++) {
					json += logtxt[i] + '\n';
				}

				sendJSON(res, json);
			});

		}
		else {
			return next(new restify.InternalError('log file not found [' +
						logpath + ']'));
		}

	});

}

}; // end exports

//----------------------------------------------------------------------------
// PRIVATE METHODS

function svcs_to_json(line) {

	// Take a row of svcs(1) output and return a JSON object. Return false if we
	// don't get three fields

	var a = line.trim().split(/\s+/g);

	return (a.length === 3) ? { fmri: a[2], state: a[0], stime: a[1] } : false;
}


function sendJSON(res, json) {

	// Send a block of stringified JSON through an existing restify app

	json = JSON.stringify(json, null, ' ');
	res.setHeader('Content-Type', 'text/plain');
	res.setHeader('Content-Length', json.length);
	res.send(json);
}


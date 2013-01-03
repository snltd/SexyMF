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
	_ = require('underscore'),
	restify = require('restify'),
	config = require('./smfConfig');


module.exports = {

svcsSingleService: function(req, res, next) {

	// Send a JSON object describing the current status of a single service.
	// The service name has been validated by middleware

	child = exec('/bin/svcs -H ' + svc, function(err, stdout, stderr) {

		if (err) {
			return next(new restify.InternalError(stderr));
		}

		res.send(svcs_to_json(stdout));
	});

},


svcsMultiService: function(req, res, next) {

	// Send a JSON object describing all services in the state given in
	// req.query.state. The state has been validated by middleware.
	// (Assuming it was set.)

	var i,
		jsvc,
		json = [],
		svcs,
		st = req.query.state;

	child = exec('/bin/svcs -a', function(err, stdout, stderr) {

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
		kv,
		json = {},
		wants_list = (req.query.prop) ? req.query.prop.split(',') : false;

	child = exec('/bin/svcprop  ' + svc, function(err, stdout, stderr) {
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

	// Send the user a chunk of the log file for the given service. Looks
	// for lines= and svc= in the query string. The service and zone have
	// been validated in middleware

	// XXX not zone-aware

	var svcs,
		i,
		logpath,
		logtxt,
		output = "",
		start,
		numlines = (req.query.lines) ? req.query.lines : config.log_lines;

	// We may only have been given part of the service name, so run it
	// through svcs to get the full FMRI

	child = exec('/bin/svcs -H ' + req.query.svc, function(err, stdout,
				stderr) {

		svcs = stdout.split('\n');

		if (svcs.length > 2) {
			return next(new restify.InvalidArgumentError('ambiguous name'));
		}

		// Work out the path name

		logpath = path.join('/var/svc/log', svcs[0].replace(/^.*svc:\//,
				'').replace(/\//g, '-') + '.log');

		// Now read in the file, if it exists, and send some of it

		if (fs.existsSync(logpath)) {

			// Read in the file and send only the last however-many lines

			fs.readFile(logpath, 'utf-8', function(err, logtxt) {

				if (err) {
					return next(new restify.InternalError('cannot read ' +
							logpath));
				}

				// The last line after this split is blank, hence the pop();
			
				logtxt = logtxt.split('\n');
				logtxt.pop();

				start = (logtxt.length > numlines) ? 
					( logtxt.length - numlines) : 0;

				for (i = start; i < logtxt.length; i++) {
					output += logtxt[i] + '\n';
				}

				res.setHeader('content-type', 'text/plain');
				res.send(output);
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


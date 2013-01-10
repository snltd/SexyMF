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
	config = require('./smfConfig'),
	core = require('./smfCore');

var util = require('util');
module.exports = {

chock: function(req, res, next) {
	console.log('yay chock!');
},
	

svcsCmd: function(req, res, next) {

	if (req.params.svc) {
		svcState(req, res, next);
	}
	else {
		svcsState(req, res, next);

	}
},


svcpropCmd: function(req, res, next) {

	// Send one, some, or all of a service's properties back as a JSON
	// object of key/value pairs. The value type (astring etc) is discarded.
	// We've validated the service name and all the service properties in
	// middleware.

	var props,
		i,
		sdat,
		json = {},
		wants_list = (req.params.prop) ? req.params.prop.split(',') : false;

	var cmd = '/bin/svcprop' + req.params.cache.zopts + req.params.svc;

	exec(cmd, function(err, stdout, stderr) {
		core.cmd(cmd, err);
		props = stdout.split('\n');

		// The first line of output is the service name, so skip that

		for (i = 1; i < props.length; i++) {
			
			// match the property name and the value. We don't care about
			// the type

			sdat = props[i].match(/^(\S+)\s+\S+\s+(.*)$/);

			if (sdat && (!wants_list || _.contains(wants_list, sdat[1]))) {
				json[sdat[1]] = sdat[2];
			}

		}

		res.send(props2json(json));
	});

},


fetchLog: function(req, res, next) {

	// Get the path to the log file for the given service. Looks for lines=
	// and svc= in the params. The service and zone have been validated in
	// middleware. The sending of the log file is done by the
	// process_log_file() function, which is a callback to the exec()s.

	var svcs,
		path,
		cmd;

	// The first thing to do is get the path to the log file. Illumos has an
	// option which does that for us. For Solaris we have to make an
	// educated guess. Illumos first, because it's easy.

	if (req.params.cache.illumos) {
		cmd = '/bin/svcs -L' + req.params.cache.zopts + req.params.svc;

		exec(cmd, function(err, stdout, stderr) { 
			core.cmd(cmd, err);
			
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

		cmd = '/bin/svcs -H ' + req.params.svc;

		exec(cmd, function(err, stdout, stderr) {
			core.cmd(cmd, err);
			svcs = stdout.split('\n');

			if (svcs.length > 2) {
				return next(new restify.InvalidArgumentError(
						'ambiguous name'));
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

function svcState(req, res, next) {

	// Send a JSON object describing the current status of a single service.
	// The service name has been validated by middleware

	var out = [],
		cmd = '/bin/svcs -H' + req.params.cache.zopts + req.params.svc;

	exec(cmd, function(err, stdout, stderr) {
		core.cmd(cmd, err);

		if (err) {
			return next(new restify.ResourceNotFoundError(stderr));
		}

		// you can get multiple instances of the same service back.
		// console-login is a good example. Let's send them all

		_.each(stdout.trim().split('\n'), function(svc) {
			out.push(svcs2json(svc));
		});

		res.send(out);
	});

}


function svcsState(req, res, next) {

	// Send a JSON object describing all services in the state given in
	// req.params.state. The state has been validated by middleware.
	// (Assuming it was set.)

	var i,
		jsvc,
		json = [],
		svcs,
		st = req.params.state;

	var cmd = '/bin/svcs -a' + req.params.cache.zopts;

	exec(cmd, function(err, stdout, stderr) {
		core.cmd(cmd, err);

		if (err) {
			return next(new restify.InternalError(stderr));
		}

		svcs = stdout.split('\n');

		// first line [0] is the header, so start at [1]

		for (i = 1; i < svcs.length; i++) {
			jsvc = svcs2json(svcs[i]);

			if (jsvc && (!st || (st === 'all' || st === jsvc.state))) {
				json.push(jsvc);
			}

		}

		res.send(json);
	});

}

function svcs2json(line) {

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

	var json = {},
		output = "",
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

		json[path] = output;
		res.send(json);
	});

}


function props2json(data) {
	
	var out = {},
		ka,
		pg;

	_.each(data, function(val, key) {

		ka = key.split('/');

		// Get the property group and make sure it exists. AFAIK properties
		// are only nested two deep. If not, this is not going to work
		// properly.

		pg = ka.shift();

		if (!out[pg]) {
			out[pg] = {};
		}
				
		out[pg][ka[0]] = val;
	});
	
	return(out);
}


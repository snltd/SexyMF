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
	spawn = require('child_process').spawn,
	_ = require('underscore'),
	smfConfig = require('./smfConfig'),
	smfCommand = require('./smfCommand'),
	smfCore = require('./smfCore'),
	smfError = require('./smfError');

module.exports = {

svcsCmd: function(req, res, next) {

	var cmd,
		eh = smfError(req, res, next),
		json = [];

	// Wrapper function, because svcs can be called in two different ways

	if (req.params.svc) {

		// Send a JSON object describing the current status of a single
		// service.The service name has been validated by middleware

		cmd = smfCommand( [ '/bin/svcs', '-H', req.params.svc ],
				req.params.cache, 'view', eh);

		cmd.cmdExec(function(err, stdout, stderr) {

			// Guven that this only takes a service as an argument, let's
			// put any error down to the user not supplying a real service
			// name. Sound fair?

			if (err) {
				eh.unknownSvc(req.params.svc);
			}

			// you can get multiple instances of the same service back.
			// console-login is a good example. Let's send them all

			_.each(stdout.trim().split('\n'), function(svc) {
				json.push(svcs2json(svc));
			});

			res.send(json);
		});

	}
	else {

		// Send a JSON object describing all services in the state given in
		// req.params.state. The state has been validated by middleware.
		// (Assuming it was set.) This is buffered, so if you somehow have
		// more than about 2000 services, this will break.

		var i,
			jsvc,
			svcs,
			st = req.params.state;

		cmd = smfCommand( [ '/bin/svcs', '-a' ], req.params.cache, 'view',
				eh);

		cmd.cmdExec(function(err, stdout, stderr) {

			// This always runs 'svcs -a', so if anything goes wrong, it's
			// because SMF is up the spout, and that's a 500.

			if (err) {
				eh.genericErr(stderr);
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

},


svcpropCmd: function(req, res, next) {

	// Send one, some, or all of a service's properties back as a JSON
	// object of key/value pairs. The value type (astring etc) is discarded.
	// We've validated the service name and all the service properties in
	// middleware. It's not a large amount of information, so we use exec(),
	// buffer it, parse it, then send it.

	var props,
		i,
		sdat,
		json = {},
		eh = smfError(req, res, next),
		wants_list = (req.params.prop) ? req.params.prop.split(',') : false;

	var cmd = smfCommand( [ '/bin/svcprop', req.params.svc ],
			req.params.cache, 'view', eh);

	cmd.cmdExec(function(err, stdout, stderr) {
		props = stdout.split('\n');

		// If the user gives bad props, they'll just get an empty object. So
		// let's assume an error is because the service is invalid. This
		// won't catch failures within SMF, I know.

		if (err) {
			eh.invalidSvc(req.params.svc);
		}

		// If the user asks for a service with multiple instances, we won't
		// get back what we expect - svcprop returns EVERY instance, with
		// the full service name before the key/value pairs. If that
		// happens, we'll just return an "ambiguous service" error. I
		// /could/ return a deeper nested JSON object, but I think that has
		// potential to confuse a client. Better to err and have the user
		// specify the instance they're interested in.

		if (props[0].split('/').length !== 2) {
			eh.ambiguousSvc(req.params.svc);
		}

		for (i = 0; i < props.length; i++) {

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


svccfgCmd: function(req, res, next) {

	// export a manifest, a profile, or the whole damn repository, each as
	// XML. The output is streamed straight back to the client, because the
	// archive is bigger than Node's default exec buffer. (And because this
	// is the proper, "asynchronously asynchronous" way to do such a thing.)

	var c = req.params.cmd,
		args = [ '/usr/sbin/svccfg', c ],
		auth = 'view',
		proc,
		eh = smfError(req, res, next);

	if (c !== 'extract' && c !== 'export' && c !== 'archive') {
		 eh.cmdUnknown(c);
	}

	// export requires a service, extract and archive don't. It also
	// requires a different authorization level

	if (c === 'export') {
		args.push(req.params.svc);
		auth = 'export';
	}

	var cmd = smfCommand(args, req.params.cache, auth );

	// Spawn a process and act on events from it. I think this is where Node
	// comes into its own. This stuff is so easy.

	res.setHeader('content-type', 'application/xml');

	var cmd_arr = cmd.asArr,
		to_run = cmd_arr.shift();

	if (cmd.isAllowed()) {
		proc = spawn(to_run, cmd_arr);
	}
	else {
		eh.cmdDisallowed(cmd.asStr, auth);
	}

	// Stream data directly to the client

	proc.stdout.on('data', function(data) {
		res.write(data);
	});

	// When the command exits, close the client connection and log the
	// command plus the exit code. Have to listen for 'close' now, not
	// 'exit'!

	proc.on('close', function(exit_code) {
		res.end();
		cmd.writeLog(exit_code);
	});

	// If we get anything on stdout, that's bad. It's pretty much bound to
	// be an invalid service though.

	proc.stderr.on('data', function(data) {
		eh.invalidSvc(req.params.svc);
	});

},


fetchLog: function(req, res, next) {

	// Get the path to the log file for the given service. Looks for lines=
	// and svc= in the params. The service and zone have been validated in
	// middleware. The sending of the log file is done by the
	// process_log_file() function, which is a callback to the exec()s.

	var svcs,
		path,
		cmd,
		eh = smfError(req, res, next);

	// The first thing to do is get the path to the log file. Illumos has an
	// option which does that for us. For Solaris we have to make an
	// educated guess. Illumos first, because it's easy.

	if (req.params.cache.illumos) {
		cmd = smfCommand( [ '/bin/svcs', '-L', req.params.svc ],
				req.params.cache, 'log', eh);

		cmd.cmdExec(function(err, stdout, stderr) {

			// Error here pretty much certainly means a bad service name

			if (err) {
				eh.invalidSvc(req.params.svc);
			}

			return process_log_file(stdout.trim(), req, res, next);
		});

	}
	else {

		// Solaris makes us do more work. We may only have been given part
		// of the service name, so run it through svcs to get the full FMRI

		cmd = smfCommand( [ '/bin/svcs', '-H', req.params.svc ]);

		cmd.cmdExec(function(err, stdout, stderr) {
			svcs = stdout.split('\n');

			if (svcs.length > 2) {
				eh.ambiguousSvc();
			}

			path = path.join('/var/svc/log', svcs[0].replace(/^.*svc:\//,
					'').replace(/\//g, '-') + '.log');

			return process_log_file(path, req, res, next);
		});

	}

	function process_log_file(path, req, res, next) {

		// I broke this out into a separate function because I ended up
		// rewriting it a couple of times, and I have a vague feeling I
		// might have to again.

		var json = {},
			output = "",
			start,
			i,
			lines = (req.params.lines) ? req.params.lines :
				smfConfig.log_lines;

		// Read in a log file, if it exists, and send some of it

		fs.exists(path, function(exists) {

			if (exists) {

				// Pull the file in. We can't just stream it straight out, because
				// the user probably doesn't want all of it.

				fs.readFile(path, 'utf-8', function(err, logtxt) {

					// If it's not where we think it should be, that's either our
					// fault or Solaris's fault, so send a 500 and tell the user where
					// we thought it should be.

					if (err) {
						smfCore.log('error', 'no log file at: ' + path);
						eh.genericErr('cannot read logfile:' + path);
					}

					smfCore.log('notice', 'fetching log file from: ' + path);

					// The last line after this split is blank, hence the pop();

					logtxt = logtxt.split('\n');
					logtxt.pop();

					start = (logtxt.length > lines) ?  (logtxt.length - lines) : 0;

					res.contentType = 'text/plain';

					for (i = start; i < logtxt.length; i++) {
						res.write(logtxt[i] + '\n');
					}

					res.end();
				});
			}
			else {
				eh.genericErr('no log file at:' + path);
			}

		});

	}

}

}; // end exports

//----------------------------------------------------------------------------
// PRIVATE METHODS

function svcs2json(line) {

	// Take a row of svcs(1) output and return a JSON object. Return false
	// if we don't get three fields. If the service is blacklisted, say so

	var json = {},
		a = line.trim().split(/\s+/g);

	if (a.length === 3) {
		json.fmri = a[2];

		// XXX crude first stab
		//
		if (smfConfig.blacklist && _.contains(smfConfig.blacklist, a[2])) {
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

function props2json(data) {

	// Turn the output of svcprop(1) into a nice, paresable, JSON object

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


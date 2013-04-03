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
		os = require('os'),
		exec = require('child_process').exec,
		spawn = require('child_process').spawn,
		_ = require('underscore'),
		smfConfig = require('./smfConfig')(),
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

		cmd = smfCommand(['/bin/svcs', '-H', req.params.svc], req.params.cache,
				'view', eh);

		cmd.cmdExec(function(err, stdout, stderr) {

			// Given that this only takes a service as an argument, let's put any
			// error down to the user not supplying a real service name. Sound
			// fair?

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
		// (Assuming it was set.) This is buffered, so if you somehow have more
		// than about 2000 services, this will break.

		var i,
				jsvc,
				svcs,
				st = req.params.state;

		cmd = smfCommand( [ '/bin/svcs', '-a' ], req.params.cache, 'view', eh);

		cmd.cmdExec(function(err, stdout, stderr) {

			// This always runs 'svcs -a', so if anything goes wrong, it's because
			// SMF is up the spout, and that's a 500.

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
			cmd,
			proc,
			eh = smfError(req, res, next);

	if (c !== 'extract' && c !== 'export' && c !== 'archive') {
		 eh.unknownCmd(c);
	}

	// export requires a service, extract and archive don't.  Archive requires
	// a different authorization level

	if (c === 'export') {
		args.push(req.params.svc);
	}
	else if (c === 'archive') {
		auth = 'archive';
	}

	// put the subcommand and flags in the cache for validation

	req.params.cache.t.subcmd = c;

	// Spawn the command and start listening for the stream

	cmd = smfCommand(args, req.params.cache, auth, eh);

	proc = cmd.cmdSpawn();

	if (smfCore.illumos_ngz(req.params.cache)) {

		// Work out the full path to the zone's repository file

		var input = 'repository ' + smfCore.path_to_db(req.params) + '\n';

		if (c === 'extract' || c === 'export' || c === 'archive') {
			input += c;
		}
		else {
			eh.unknownCmd(c);
		}

		input += '\n\0';

		cmd.logSpawnInput('svccfg', input);

		proc.stdin.write(input);
	}

	cmd.stream_handler('application/xml', proc, req, res);
},


fetchLog: function(req, res, next) {

	// Retrieve a specified number of lines from a log file. We now use
	// tail(1) to do this, rather than reading the file in ourselves. Part of
	// me doesn't like shelling out, but it's the only way to get the log
	// files from zones on Solaris without requiring the user has a
	// file_dac_read privilege in addition to zone administration rights.
	//
	// First get the path to the log file for the given service. Looks for
	// lines= and svc= in the params. The service and zone have been validated
	// in middleware. The sending of the log file is done by the
	// process_log_file() function, which is a callback to the exec()s.

	var svcs,
			cmd,
			eh = smfError(req, res, next),
			auth = 'log';

	// The first thing to do is get the path to the log file. Illumos has an
	// option which does that for us. For Solaris we have to make an
	// educated guess. Illumos first, because it's easy.

	if (req.params.cache.p.illumos) {
		cmd = smfCommand( [ '/bin/svcs', '-L', req.params.svc ],
				req.params.cache, auth, eh);

		cmd.cmdExec(function(err, stdout, stderr) {

			// Error here pretty much certainly means a bad service name

			if (err) {
				eh.invalidSvc(req.params.svc);
			}

			// The next external will be tail(1), accessing a file in the root of
			// another zone. So, we don't want to add in the '-z zone' part of the
			// command - it will make no sense. If we remove reference to the
			// other zone, smfCommand will build a normal "local" command.

			req.params.cache.t.zone = req.params.cache.p.zonename;

			return process_log_file(stdout.trim(), req, res, next);
		});

	}
	else {

		// Solaris makes us do more work. We may only have been given part
		// of the service name, so run it through svcs to get the full FMRI

		cmd = smfCommand(['/bin/svcs', '-H', req.params.svc], req.params.cache,
					auth, eh);

		cmd.cmdExec(function(err, stdout, stderr) {

			if (stdout === '' && stderr !== '') {
				eh.genericErr(stderr);
			}

			svcs = stdout.split('\n');

			if (svcs.length > 2) {
				eh.ambiguousSvc(req.params.svc);
			}

			// That's the file. We could tag the zoneroot on the beginning, but
			// that would require a file_dac_read privilege which the user won't
			// have if they have delegated zone admin privs. The correct way is to
			// access it via zlogin.

			var logpath = path.join('/var/svc/log', svcs[0].replace(/^.*svc:\//,
											'').replace(/\//g, '-') + '.log');

			return process_log_file(logpath, req, res, next);
		});

	}

	function process_log_file(path) {

		// We know what log file to ask for. We have to craft a command to get
		// it. We use tail(1) to get the required number of lines, and spawn the
		// command, streaming the output straight to the user.

		var args,
				logcmd,
				logproc,
				lines = (req.params.lines) ? req.params.lines : smfConfig.log_lines;

		args = ['/bin/tail', '-' + lines, path];

		logcmd = smfCommand(args, req.params.cache, auth, eh);

		logproc = logcmd.cmdSpawn();

		cmd.stream_handler('text/plain', logproc, req, res);
	}

},

showStatus: function(req, res, next) {

	// send an object which describes ourselves and our environment. Requires
	// no privileges.

	if (smfConfig.show_status) {

		res.send(
			{
				sexymf: {
					'version': require(path.join(path.dirname(process.argv[1]),
										'package.json')).version,
					'api calls': req.params.cache.p.requests
				},
				host: {
					'hostname': os.hostname(),
					'zonename' : req.params.cache.p.zonename,
					'arch': os.arch()
				},
				process: {
					'path': process.argv[1],
					'pid': process.pid,
					'uptime': process.uptime() + 's',
					'memory': process.memoryUsage(),
					'arch': process.arch
				},
				node: {
					'path': process.execPath,
					'node_versions': process.versions
				}

			}
		);

	}
	else {
		smfCore.log('notice', 'requested status, but show_status is false');
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


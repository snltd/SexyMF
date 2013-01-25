//============================================================================
//
// smfMiddleware.js
// ----------------
//
// Connect middleware. This is mostly methods to validate user input.  We
// allow BodyParser and QueryParser to map variables into the param space,
// which is where all these methods operate, so they'll automatically work
// for GET and POST requests.
//
// R Fisher 01/2013
//
//============================================================================

"use strict";

var exec = require('child_process').exec,
	_ = require('underscore'),
	smfConfig = require('./smfConfig'),
	smfError = require('./smfError');

module.exports = {

chkZone: function(req, res, next) {

	// Check the zone is a valid zone.  This will catch %20 type things. If
	// someone puts raw junk like literal ! or ; in the URI, Restify will
	// give them a 404.

	var eh = smfError(req, res, next),
		zone = req.params.zone;

	if (!zone) {
		return next();
	}

	// Does it look sane?

	if (zone !== '@' && (zone.match(/\W/) || zone.length > 128)) {
		eh.invalidArgs('zone name', zone);
	}

	// If we're running in our own zone, pass on to the next middleware

	if (zone === '@' || zone === req.params.cache.zonename) {
		return next();
	}
	else if (req.params.cache.zonename === 'global') {

		// We've been asked to run in another zone. Does the zone exist? It
		// seems the right thing to do if the zone does not exist is to return a
		// 404, and the only way to do that is check there's such a zone. We
		// can't even cache a list of extant zones at start up, as they may come
		// and go while we're running.

		exec('/usr/sbin/zoneadm -z ' + zone + ' list', function(err, stdout,
					stderr) {

			if (err) {
				eh.unknownZone(zone);
			}
			else {

				// At the moment we can only do this on Illumos systems which
				// support the -z and -L flags.

				if (req.params.cache.illumos) {
					req.params.cache.zopts = ' -z ' + zone + ' ';
					return next();
				}
				else {
					eh.genericErr('NGZ not currently supported outside Illumos');
				}

			}

		});

	}
	else {
		eh.invalidArgs('zone name', zone);
	}

},

allowedAddr: function(req, res, next) {

	// If the connection isn't from a member of the 'allowed_addr' array, drop
	// it.

	var eh = smfError(req, res, next);

	if (_.contains(smfConfig.allowed_addr, req.connection.remoteAddress)) {
		return next();
	}
	else {
		eh.invalidIP(req.connection.remoteAddress);
	}

},


chkSvc: function(req, res, next) {

	// Make sure a service name is valid. If not, send an error to the client.
	// Service names can contain letters, numbers, and [:/-_].

	var eh = smfError(req, res, next),
		svc = req.params.svc;

	if (svc && (svc.match(/[^\w\-:\/]/) || svc.length > 256)) {
		eh.invalidArgs('service', svc);
	}

	return next();
},


chkState: function(req, res, next) {

	// Make sure a state is valid. By "valid" I mean a sane looking string.
	// We don't check to see if it's a word that SMF understands, it's up to
	// the client to get that right. If the word contains anything other than
	// lower-case letters, or is not just a dash, return an error to the
	// client

	var eh = smfError(req, res, next),
		st = req.params.state;

	if (st && ((st.match(/[^_a-z]/) && st !== '-') || st.length > 20)) {
		eh.invalidArgs('state', st);
	}

	return next();
},


chkProp: function(req, res, next) {

	// Make sure a comma-separated list of properties is valid. Property
	// names can contain letters and underscores, slashes, and maybe
	// numbers. (I'm not sure about numbers, but letting them through won't
	// hurt.)

	var eh = smfError(req, res, next);

	if (req.params.prop) {

		_.each(req.params.prop.split(','), function(prop) {

			if (prop.length > 128 || prop.match(/[^\w\/]/)) {
				eh.invalidArgs('property', prop);
			}

		});

	}

	return next();
},


chkLines: function(req, res, next) {

	// Make sure the number of lines requested from a logfile is a number,
	// and a sensible one at that

	var eh = smfError(req, res, next),
		l = req.params.lines;

	if (l && (l < 1 || l > 2048 || l.match(/\D/))) {
		eh.invalidArgs('number', l);
	}

	return next();
},


chkCmd: function(req, res, next) {

	// Validate the command passed to svcadm. All we do is make sure it
	// isn't complete junk, it's up to the user to supply something
	// sensible. Commands can only have lower case letters

	var eh = smfError(req, res, next),
		cmd = req.params.cmd;

	if (cmd && (cmd.length > 20 || cmd.match(/[^a-z]/))) {
		eh.invalidArgs('command', cmd);
	}

	return next();
},


chkType: function(req, res, next) {

	// Validate the datatype passed to svcprop. All we do is make sure it
	// isn't complete junk, it's up to the user to supply something sensible.
	// Types can only have lower case letters

	var eh = smfError(req, res, next),
		type = req.params.type;

	if (type && (type.length > 20 || type.match(/[^a-z]/))) {
		eh.invalidArgs('datatype', type);
	}

	return next();
},


chkFlag: function(req, res, next) {

	// Validate flags which get passed through to commands, such as svcadm.
	// These can only be letters.

	var eh = smfError(req, res, next),
		flags = req.params.flags;

	if (flags && (flags.length > 10 || flags.match(/[^a-z]/))) {
		eh.invalidArgs('flag(s)', flags);
	}

	// If there are flags, put them in the cache and prefix them with a '-',
	// if not, set the variable to a blank string.

	req.params.cache.flags = flags;
	req.params.flags = (flags) ? '-' + flags : '';
	return next();
}

}; // end exports


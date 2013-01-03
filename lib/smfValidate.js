//============================================================================
//
// validate.js
// -----------
//
// Methods to validate user input. These are all accessed as connect 
// middleware. We allow BodyParser and QueryParser to map variables into the
// param space, which is where all these methods operate, so they'll
// automatically work for GET and POST requests.
//
// R Fisher 01/2013
//
//============================================================================

"use strict";

var exec = require('child_process').exec,
	child,
	_ = require('underscore'),
	restify = require('restify'),
	config = require('./smfConfig');

module.exports = {

validate_zone: function(req, res, next) {

	// Check the zone is a valid zone

	var zone = req.params.zone;

	// Does it look sane?

	if (zone !== '@' && (zone.match(/\W/) || zone.length > 128)) {
		return next(new restify.InvalidArgumentError('invalid zone name ' +
					zone));
	}

	// If we're running in our own zone, pass on to the next middleware
	
	if (zone === '@' || zone === req.params.cache.zonename) {
		next();
	}
	else if (req.params.cache.zonename === 'global') {
		
		// We've been asked to run in another zone. At the moment we can
		// only do this on Illumos systems which support the -z and -L
		// flags.

		if (req.params.cache.illumos) {
			req.params.cache.zopts = ' -z ' + zone + ' ';
			next();
		}
		else {
			return next(new restify.InvalidArgumentError('running in ' +
				'other zones is not yet supported on this SunOS revision'));
		}

	}
	else {
		return next(new restify.InvalidArgumentError('invalid zone ' + zone));
	}

},


validate_svc: function(req, res, next) {

	// Make sure a service name is valid. If not, send an error to the
	// client. Service names can contain letters, numbers, and [:/-_].
	
	var svc = req.params.svc;

	if (svc && (svc.match(/[^\w\-:\/]/) || svc.length > 256)) {
		return next(new restify.InvalidArgumentError('invalid service ' +
					svc));
	}

	next();
},


validate_state: function(req, res, next) {

	// Make sure a state is valid. By "valid" I mean a sane looking string.
	// We don't check to see if it's a word that SMF understands, it's up to
	// the client to get that right. If the word contains anything other
	// than lower-case letters, or is not just a dash, return an error to
	// the client
	
	var st = req.params.state;

	if (st && ((st.match(/[^_a-z]/) && st !== '-') || st.length > 20)) {
		return next(new restify.InvalidArgumentError('invalid state ' +
					st));
	}
	
	next();
},


validate_props: function(req, res, next) {

	// Make sure a comma-separated list of properties is valid. Property
	// names can contain letters and underscores, slashes, and maybe
	// numbers. (I'm not sure about numbers, but letting them through won't
	// hurt.)
	
	if (req.params.prop) {

		_.each(req.params.prop.split(','), function(prop) {

			if (prop.length > 128 || prop.match(/[^\w\/]/)) {
				return next(new restify.InvalidArgumentError(
						'invalid property ' + prop));
			}

		});

	}

	next();
},


validate_lines: function(req, res, next) {
					
	// Make sure the number of lines requested from a logfile is a number,
	// and a sensible one at that
	
	var l = req.params.lines;

	if (l && (l < 1 || l > 2048 || l.match(/\D/))) {
		return next(new restify.InvalidArgumentError('invalid number ' + l));
	}

	next();
},

validate_cmd: function(req, res, next) {

	// Validate the command passed to svcadm. All we do is make sure it
	// isn't complete junk, it's up to the user to supply something
	// sensible. Commands can only have lower case letters

	var cmd = req.params.cmd;

	if (cmd && (cmd.length > 20 || cmd.match(/[^a-z]/))) {
		return next(new restify.InvalidArgumentError('invalid command ' + cmd));
	}

	next();
}
}; // end exports

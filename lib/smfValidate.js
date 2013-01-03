//============================================================================
//
// validate.js
// -----------
//
// Methods to validate user input. These are all accessed as connect 
// middleware.
//
// R Fisher 01/2013
//
//============================================================================

var exec = require('child_process').exec,
	child,
	_ = require('underscore'),
	restify = require('restify'),
	config = require('./smfConfig');

module.exports = {

validate_zone: function(req, res, next) {

	// At the moment we only run in the current zone. If we get a request
	// for a zone other than ourselves, send a RestError

	var zone = req.params.zone;

	child = exec('/bin/zonename', function(err, stdout, stderr) {

		if (zone !== '@' && zone !== stdout.trim()) {
			return next(new restify.InvalidArgumentError('invalid zone ' +
					zone));
		}

		next();
	});

},


validate_svc: function(req, res, next) {

	// Make sure a service name is valid. If not, return an error to the
	// client Service names can contain letters, numbers, and [:/-_].
	
	svc = req.query.svc;

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
	
	var st = req.query.state;

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
	
	if (req.query.prop) {

		_.each(req.query.prop.split(','), function(prop) {

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
	
	var l = req.query.lines;

	if (l && (l < 1 || l > 2048 || l.match(/\D/))) {
		return next(new restify.InvalidArgumentError('invalid number ' + l));
	}

	next();
}

}; // end exports

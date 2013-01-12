//============================================================================
//
// smfAuthMethods.js
// -----------------
//
// Methods to handle user authentication and authorization.
//
// R Fisher 2013
//
//============================================================================

"use strict";

var restify = require('restify'),
	passwordHash = require('password-hash'),
	config = require('./smfConfig');

module.exports = {

authenticate_user: function(req, res, next) {

	var user;

	// At the moment user authentication is 'basic'. HTTP Signature
	// authorization is planned for the future.

	if (config.use_auths) {

		if (req.authorization.basic) {

			user = get_user(req.authorization.basic.username);

			if (!basic_auth(user, req, res, next)) {
				access_denied(next);
			}

			// Cash the user's authorizations

			req.params.cache.user_auths = user.auths;
		}
		else {
			return next(new restify.NotAuthorizedError('no credentials'));
		}

	}

	return next();
}

}; // End exports

//----------------------------------------------------------------------------
// PRIVATE METHODS

function get_user(user) {

	// Pull a user out of the config file. Or not.

	return (config.users[user]) ? config.users[user] : false;
}


function basic_auth(user, req, res, next) {

	// Basic HTTP authentication. Returns true if the user authenticates,
	// false if not. All the user credentials have been parsed by Restify
	// and put in the req.authorization variable.

	// Get username details and the password we've been fed. If we can't,
	// we've got an invalid username, it's access_denied()

	if (!user) {
		return false;
	}

	// We allow hashed and cleartext passwords in the config file. Check
	// whichever one is relevant and authenticate like it's 1999.

	var pw_in = req.authorization.basic.password;

	return (passwordHash.isHashed(user.password))
		? passwordHash.verify(pw_in, user.password)
		: (pw_in === user.password);
}


function access_denied(next) {

	// Call this when you realize a user doesn't authenticate. Single exit
	// point means a consistent message, so no clues as to what was right or
	// wrong

	return next(new restify.NotAuthorizedError('incorrect username/password'));
}


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

var passwordHash = require('password-hash'),
		smfConfig = require('./smfConfig'),
		smfError = require('./smfError');

module.exports = {

authenticate_user: function(req, res, next) {

	var eh = smfError(req, res, next),
			user;

	// At the moment user authentication is 'basic'. HTTP Signature
	// authorization is planned for the future.

	if (smfConfig.use_auths) {

		if (req.authorization.basic) {

			user = get_user(req.authorization.basic.username);

			if (!basic_auth(user, req, res, next)) {
				eh.invalidCredentials();
			}

			// Cash the user's name and authorizations

			req.params.cache.t.user = {
				name: req.authorization.basic.username,
				auths: user.auths
			};
		}
		else {
			eh.invalidCredentials();
		}

	}

	return next();
}

}; // End exports

//----------------------------------------------------------------------------
// PRIVATE METHODS

function get_user(user) {

	// Pull a user out of the config file. Or not.

	return (smfConfig.users[user]) ? smfConfig.users[user] : false;
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

	return (passwordHash.isHashed(user.password)) ?
		passwordHash.verify(pw_in, user.password) : (pw_in === user.password);
}


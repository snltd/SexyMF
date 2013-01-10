//============================================================================
//
// smfAuthMethods.js
// -----------------
//
// Methods to handle user authentication
//
// R Fisher 2013
//
//============================================================================

"use strict";

var restify = require('restify'),
	config = require('./smfConfig');

module.exports = {

authenticate_user: function(req, res, next) {

	// At the moment user authorization is really rubbish. There's a
	// plaintext username and password in the user config file. We just
	// compare against that and authenticate like it's 1999. This will
	// improve, I promise.
	
	if (config.use_auths && (
			req.authorization.basic.username !== config.auths.username || 
			req.authorization.basic.password !== config.auths.password)
		) {
		return next(new restify.NotAuthorizedError('get bent'));
	}

	next();
}
}; // End exports

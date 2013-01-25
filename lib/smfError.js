//============================================================================
//
// smfError.js
// -----------
//
// This module provides a single handler for errors. Each route has to
// create an error handler object by requiring it, and on an error, the
// program should call one of the exported methods. Each method provides
// first a string which is written to the log, then a Restify REST error
// which is sent to the client, and optionally a REST message sent to the
// client. If this is omitted, the same message goes to the log and the
// user.
//
// R Fisher 2013
//
//============================================================================

"use strict";

var restify = require('restify'),
	smfCore = require('./smfCore');

function smfError(req, res, next) {

	return {

		genericErr: function(str) {
			doError(str, 'InternalError');
		},

		ambiguousSvc: function(svc) {
			doError('Ambiguous service: ' + svc, 'InvalidArgumentError');
		},

		invalidSvc: function(svc) {
			doError('Invalid service: ' + svc, 'InvalidArgumentError');
		},

		invalidIP: function(ip) {
			doError('Unauthorized client IP addr: ' + ip, 'NotAuthorizedError');
		},

		invalidCredentials: function(ip) {
			doError('Invalid credentials', 'NotAuthorizedError');
		},

		invalidArgs: function(type, val) {
			doError('Invalid value for ' + type + ': ' + val, 'InvalidArgumentError');
		},

		unknownCmd: function(cmd) {
			doError('Unknown command: ' + cmd, 'ResourceNotFoundError');
		},

		unknownSvc: function(svc) {
			doError('Unknown service: ' + svc, 'ResourceNotFoundError');
		},

		unknownFlag: function(flags) {
			doError('Unknown flag(s): ' + flags, 'InvalidArgumentError');
		},

		unknownZone: function(zone) {
			doError('Unknown zone: ' + zone, 'ResourceNotFoundError');
		},

		disallowedCmd: function(cmd) {
			doError('execution of \'' + cmd + '\' not permitted',
					'InternalError');
		},

		disallowedFlag: function(flag) {
			doError('flag not permitted: ' + flag, 'InvalidArgumentError');
		},

		disallowedSubCmd: function(subcmd) {
			doError('subcommand not permitted: ' + subcmd, 'InvalidArgumentError');
		},

		unauthorizedCmd: function(cmd, auth) {
			doError('\'' + cmd + '\' REQUIRES \'' + auth + '\' auth',
					'NotAuthorizedError', 'insufficient authorization: ' + cmd);
		},

		completeCmd: function(msg) {

			// Not an error at all, but this seems the best place to put it.
			// Report that the requested command was completed successfully.

			if (!msg) {
				msg = 'Command complete';
			}

			res.send(msg);
		}

	};

	function doError(log_str, rest_err, rest_str) {
		smfCore.log('err', log_str);

		if (!rest_str) {
			rest_str = log_str;
		}

		return next(new restify[rest_err](rest_str));
	}

}

module.exports = smfError;


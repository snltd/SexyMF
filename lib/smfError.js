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
		smfLog = require('./smfLog')();

function smfError(req, res, next) {

	return {

		genericErr: function(str, stderr) {
			smfLog.warn({internal_error: str, stderr: stderr});
			doError('InternalError', str);
		},

		ambiguousSvc: function(svc) {
			doError('InvalidArgumentError', 'Ambiguous service: ' + svc);
		},

		invalidSvc: function(svc) {
			smfLog.info({svc: svc}, 'invalid service');
			doError('InvalidArgumentError', 'Invalid service: ' + svc);
		},

		invalidIP: function(ip) {
			doError('NotAuthorizedError', 'Unauthorized client IP addr: ' + ip);
		},

		invalidCredentials: function(user) {
			smfLog.info({user: user}, 'invalid credentials');
			doError('NotAuthorizedError', 'Invalid credentials');
		},

		invalidArgs: function(type, val) {
			smfLog.info({entity_type: type, entity_value: val}, 'invalid value');
			doError('InvalidArgumentError', 'Invalid value for ' + type + ': ' +
					val);
		},

		unknownCmd: function(cmd) {
			doError('ResourceNotFoundError',
					'Unknown or incorrectly formed command: ' + cmd);
		},

		unknownSvc: function(svc) {
			smfLog.info({svc: svc}, 'unknown service');
			doError('ResourceNotFoundError', 'Unknown service: ' + svc);
		},

		unknownFlag: function(flags) {
			smfLog.info({flags: flags}, 'unknown flag(s)');
			doError('InvalidArgumentError', 'Unknown flag(s): ' + flags);
		},

		unknownZone: function(zone) {
			smfLog.info({zone: zone}, 'unknown zone');
			doError('ResourceNotFoundError', 'Unknown zone: ' + zone);
		},

		unknownState: function(state) {
			smfLog.info({state: state}, 'unknown state');
			doError('InternalError', 'Unknown state: ' + state);
		},

		ngz2ngz: function() {
			doError('InvalidArgumentError', 'NGZ to NGZ unsupported');
		},

		disallowedCmd: function(cmd) {
			doError('InternalError', 'execution of \'' + cmd +
					'\' disallowed or restricted');
		},

		disallowedFlag: function(flag) {
			doError('InvalidArgumentError', 'flag not permitted: ' + flag);
		},

		disallowedSubCmd: function(subcmd) {
			doError('InvalidArgumentError', 'subcommand not permitted: ' + subcmd);
		},

		unauthorizedCmd: function(auth) {
			smfLog.info({auth: auth}, 'insufficient authorization');
			doError('NotAuthorizedError', 'insufficient authorizations');
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

	function doError(rest_err, rest_str) {
		// Send the REST error to the client.

		return next(new restify[rest_err](rest_str));
	}

}

module.exports = smfError;


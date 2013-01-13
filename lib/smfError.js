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
			doError(str, 'InternalErr');
		},

		ambiguousSvc: function(svc) {
			doError('Ambiguous service: ' + svc, 'InvalidArgument');
		},

		invalidSvc: function(svc) {
			doError('Invalid service: ' + svc, 'InvalidArgument');
		},

		invalidIP: function(ip) {
			doError('Unauthorized client IP addr: ' + ip + 'NotAuthorized'); 
		},

		invalidArgs: function(type, val) {
			doError('Invalid value for' + type + ': ' + val +
					'InvalidArgument'); 
		},

		unknownCmd: function(cmd) {
			doError('Unknown command: ' + cmd, 'ResourceNotFound');
		},

		cmdDisallowed: function(cmd, auth) {
			doError('\'' + cmd + '\' REQUIRES \'' + auth + '\' auth',
			'NotAuthorized', 'command not allowed: ' + cmd);
		},

		cmdComplete: function(msg) {

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

		return next(new restify[rest_err + 'Error'](rest_str));
	}

}

module.exports = smfError;


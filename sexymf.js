#!/bin/env node

//============================================================================
//
// sexymf.js
// ---------
//
// The main program that launches SexyMF. All the real work is done by the
// modules in lib/.
//
// R Fisher 01/2013
//
//============================================================================

"use strict";

// Modules we need. I always go node core, external dependency, then my
// modules. Kind of in descending order of how much I trust them.

var path = require('path'),
		optparse = require('optparse');

// chdir to the directory this file is in, so the config paths work

process.chdir(__dirname);

// Option parsing with optparse. Self-explanatory I think.

var parser = new optparse.OptionParser([
			['-c', '--config FILE', 'specify configuration file'],
			['-d', '--daemon', 'run as a daemon (suppressing stdout)'],
			['-p', '--port PORT_NUMBER', 'listen on this port'],
			['-l', '--loglevel LEVEL', 'set log level'],
			['-V', '--version', 'print version and exit'],
			['-h', '--help', 'print usage information and exit']
		]),
		options = {};

parser.banner = 'Usage: ' + path.basename(__filename) + ' [options]';

parser.on('daemon', function() {
	require('daemon')();
});

parser.on('config', function(name, value) {
	options.config = value;
});

parser.on('port', function(name, value) {
	options.port = value;
});

parser.on('loglevel', function(name, value) {

	// If the user has specified a log level, make sure it's one that
	// Bunyan understands.

	var log_levels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];

	if (log_levels.indexOf(value) !== -1) {
		options.log_level = value;
	}
	else {
		console.log('ERROR: invalid log level. (Try one of ' +
				log_levels.join(', ') + ')');
		process.exit(1);
	}


});

parser.on('version', function() {
	console.log(require(path.join(__dirname, 'package.json')).version);
	process.exit(0);
});

parser.on('help', function() {
	console.log(parser.toString());
	process.exit(0);
});

parser.parse(process.argv);

// Load in the config file

var smfConfig = require('./lib/smfConfig.js')(options.config);

if (!options.port) {
	options.port = smfConfig.listen_port;
}

// Override the log level in the config file, if the user specified
// one. If we don't have one, fall back to 'info'.

if (options.log_level) {
	smfConfig.log_level = options.log_level;
}

if (!smfConfig.log_level) {
	smfConfig.log_level = 'info';
}


// Now we're able to load in our own modules

var	smfPreflight = require('./lib/smfPreflight'),
		smfApp = require('./lib/smfApp');

// Preflight checks

smfPreflight.runChecks();
smfPreflight.userCheck();

// Call the app module, which sets up Restify and all the routing.

smfApp.setupApp({name: "SexyMF"});

// Cache a bit of info, and start the server listening

smfApp.populatePCache(function() {
	smfApp.startApp(options.port);
});


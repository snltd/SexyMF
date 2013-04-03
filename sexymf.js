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
		sys = require('sys'),
		optparse = require('optparse');

// chdir to the directory this file is in, so the config paths work

process.chdir(__dirname);

// Option parsing with optparse

var parser = new optparse.OptionParser([
			['-c', '--config FILE', 'specify configuration file'],
			['-d', '--daemon', 'run as a daemon (suppressing stdout)'],
			['-p', '--port PORT_NUMBER', 'listen on this port'],
			['-V', '--version', 'print version and exit'],
			['-h', '--help', 'print usage information and exit']
		]),
		options = {};

parser.banner = 'Usage: ' + path.basename(__filename) + ' [options]';

parser.on('daemon', function() {
	require('daemon')();
});

// I don't really like using global, but it seems so much cleaner than
// passing the filename to everything

parser.on('config', function(name, value) {
	options.config = value;
});

parser.on('port', function(name, value) {
	options.port = value;
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

// Now we're able to load in our own modules
//
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


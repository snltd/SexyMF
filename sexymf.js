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
	optparse = require('optparse'),
	smfConfig = require('./lib/smfConfig.js'),
	smfPreflight = require('./lib/smfPreflight'),
	smfApp = require('./lib/smfApp');

// chdir to the directory this file is in, so the config paths work

process.chdir(__dirname);

// Preflight checks #1

smfPreflight.runChecks();

// Option parsing with optparse

var SWITCHES = [
		[ '-p', '--port NUMBER', 'listen on this port' ],
		[ '-V', '--version', 'print version and exit' ],
		[ '-h', '--help', 'print this and exit' ]
	],
	parser = new optparse.OptionParser(SWITCHES),
	options = { port: smfConfig.listen_port };

parser.banner = 'Usage: ' + path.basename(__filename) + ' [options]';

parser.on('port', function(value) {
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

smfPreflight.userCheck();

// Call the app module, which sets up Restify and all the routing.

smfApp.setupApp({name: "SexyMF"});

// Cache a bit of info, and start the server listening

smfApp.populatePCache(function() {
	smfApp.startApp(options.port);
});


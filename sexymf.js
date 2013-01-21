#!/bin/env node

//============================================================================
//
// sexymf.js
// ---------
//
// R Fisher 01/2013
//
//============================================================================

"use strict";

// Modules we need. I always go node core, external dependency, then my
// modules. Kind of in descending order of how much I trust them.

var os = require('os'),
	fs = require('fs'),
	path = require('path'),
	exec = require('child_process').exec,
	_ = require('underscore'),
	optparse = require('optparse'),
	smfConfig = require('./lib/smfConfig.js'),
	smfCore = require('./lib/smfCore');

var cache = {},
	ssl;

// Option parsing with optparse

var SWITCHES = [
		[ '-p', '--port NUMBER', 'listen on thist port' ],
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

// Are we using SSL?

if (smfConfig.useSSL) {
	ssl = {
		certificate: fs.readFileSync('./config/ssl/server.crt'),
		key: fs.readFileSync('./config/ssl/server.key')
	};
}
else {
	ssl = { certificate: false, key: false };
}

// Call the app module, which sets up Restify and all the routing.

var smfApp = require('./lib/smfApp');

smfApp.setupApp( {
	name: "SexyMF",
	certificate: ssl.certificate,
	key: ssl.key
	}
);

// Get the zone name, and start the server listening

exec('/bin/zonename', function(err, stdout, stderr) {
	var zonename = stdout.trim();
	smfApp.startApp(zonename, options.port);
});


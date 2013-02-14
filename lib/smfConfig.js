//============================================================================
//
// config.js
//----------
//
// Import configuration info. A centralized point for if/when I start using
// multiple config files.
//
// R Fisher 2013
//
//============================================================================

"use strict";

// We use CJSON so we can have comments in the JSON config file. Don't tell
// Crockford.

var path = require('path'),
	cjson = require('cjson'),
	conf_dir,
	config;

// Work out the proper path to the config dir, and then load the config(s)
	// in.

conf_dir = path.join(path.dirname(process.argv[1]), 'config');

config = cjson.load([ path.join(conf_dir, 'sexymf_config.json') ], true);

module.exports = config;

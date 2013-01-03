//============================================================================
//
// config.js
//----------
//
// Import configuration info. A centralized point for if/when I start using
// multiple config files.
//
//============================================================================

"use strict";

// We use CJSON so we can have comments in the JSON config file. Don't tell
// Crockford.

var path = require('path'),
	cjson = require('cjson'),
	conf_dir,
	config;

// Work out the proper path to the config dir, and then load the configs in.
// Currently we support the core_config.json and a user_config.json, which
// overrides the core.

conf_dir = path.join(path.dirname(process.argv[1]), 'config');

config = cjson.load([ path.join(conf_dir, 'core_config.json'),
					path.join(conf_dir, 'user_config.json')], true);

module.exports = config;

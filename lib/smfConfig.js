//============================================================================
//
// config.js
//----------
//
// Load configuration files into SexyMF.
//
// R Fisher 2013
//
//============================================================================

"use strict";

// We use CJSON so we can have comments in the JSON config file.

var path = require('path'),
		cjson = require('cjson'),
		conf_dir;

// Work out the proper path to the config dir, and then load the config.

conf_dir = path.join(path.dirname(process.argv[1]), 'config');

module.exports = cjson.load([
	path.join(conf_dir, 'config.json'),
	path.join(conf_dir, 'users.json')
], true);


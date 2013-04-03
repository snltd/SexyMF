//============================================================================
//
// config.js
//----------
//
// Load configuration files into SexyMF.  We use CJSON so we can have
// comments in the JSON config file.
//
// R Fisher 2013
//
//============================================================================

"use strict";

var path = require('path'),
		fs = require('fs'),
		cjson = require('cjson'),
		config;

function smfConfig(file) {

	// If the user hasn't specified a path to a config users file, we'll it is
	// called 'config/config.json', at the same level as the 'sexymf.js'
	// executable.

	if (!config) {

		var conf_dir = path.join(path.dirname(process.argv[1]), 'config'),
				c_file = (file) ? file : path.join(conf_dir, 'config.json'),
				uf;

		// Load the config file
		//
		config = load_file(c_file);

		// Now we have to load the users file. The path to it is in the config
		// file. This may not actually be fatal - the

		if (config.use_auths && config.user_file) {
			config.users = cjson.load(config.user_file);
		}
		else if (config.use_auths) {
			console.error("ERROR: No user file specified in config file.");
			process.exit(1);
		}

	}

	return config;
}

function load_file(file) {

	// Return the JSON contents of a file, or exit the program if that file
	// can't be found.
	//
	// Fully qualify the path to the file - this makes the error message more
	// informative.
	//
	file = path.resolve(file);

	if (fs.existsSync(file)) {
		return cjson.load(file);
	}
	else {
		console.error('Missing file: ' + file);
		process.exit(1);
	}

}

module.exports = smfConfig;

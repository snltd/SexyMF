//============================================================================
//
// smfCommon.js
// ------------
//
// Odds-and-ends that are needed by more than one module.
//
//
// R Fisher 2013
//
//============================================================================

"use strict";

var path = require('path'),
		fs = require('fs');

module.exports = {

path_to_db: function(params) {

		// Return the supposed path to an SMF repository file for a non-global
		// zone. Call it with req.params

		return path.join(params.cache.p.zpaths[params.zone], 'root', 'etc', 'svc',
				'repository.db');
},

illumos_ngz: function(cache) {

		// returns true if we are looking at an NGZ and are likely to be using
		// the illumos -z flag. Call it with the contents of req.params.cache

		return ((cache.t.zone !== '@' && cache.t.zone !== cache.p.zonename) &&
				cache.p.illumos );
},

can_write_to_file: function(file) {

	// Can we write to a logfile? If we can't, we'll exit the process.

	file = path.resolve(file);

	var fh,
			err;

	try {
		fh = fs.openSync(file, 'w+');
	}
	catch(e) {
		console.error('ERROR: cannot write to file: ' + file);
		process.exit(2);
	}
	finally {
		fs.closeSync(fh);
	}

}

};

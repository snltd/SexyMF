//============================================================================
//
// smfCore.js
// ----------
//
// Methods that are needed by other modules.
//
// R Fisher 2013
//
//============================================================================

"use strict";

var	path = require('path'),
		config = require('./smfConfig');

module.exports = {

log: function(level, msg) {

	// print information. If you run logs through cut(1) with a space as
	// delimiter, field 1 is the timn field 2 the date, field 3 the
	// severity, and the remainder is the log message.
	//
	// The only special value for 'level' is 'err', which denotes an error

	//	var str = moment().format("HH:mm:ss DD/MM/YY") + ' ' +

	var d = new Date(),
			str = d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds() +
						' ' + ('0' + d.getDate()).slice(-2) + '/' + ('0' +
						(d.getMonth()+1)).slice(-2) + '/' + d.getFullYear() + ' ' +
						level.toUpperCase() + ' ' + msg;

	if (level === 'err') {
		console.error(str);
	}
	else if (config.verbose) {
		console.log(str);
	}

},


illumos_ngz: function(cache) {

	// returns true if we are looking at an NGZ and are likely to be using the
	// illumos -z flag. Call it with the contents of req.params.cache

	return ( (cache.t.zone !== '@' && cache.t.zone !== cache.p.zonename) &&
			cache.p.illumos);
},


path_to_db: function(params) {

	// Return the supposed path to an SMF repository file for a non-global
	// zone. Call it with req.params

	return path.join(params.cache.p.zpaths[params.zone], 'root', 'etc', 'svc',
			'repository.db');
}

}; // end exports


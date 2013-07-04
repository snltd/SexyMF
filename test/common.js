var	restify = require('restify'),
		conf = require('./config.js')();

module.exports = {

in_global: function(cb) {
	//
	// Return true if the server we are talking to is in a global zone.
	// The status view tells us if it is.
	//
	var client = restify.createJsonClient({
		url: conf.url,
		rejectUnauthorized: false
	});

	client.basicAuth('manager', 'plainpass');

	client.get('/smf/status', function(err, req, res, obj) {
		cb(obj.host.zonename === 'global')
	});

},

time_in_state: function(stime) {
	//
	// Returns the number of seconds since a service was restarted. Pass
	// in the stime from a SexyMF svcs request. If it isn't a time (i.e.
	// the service was started many hours ago), returns false.
	//
	var moment = require('moment'),
			now,
			then;

	if (stime.match(/^\d{1,2}:\d{1,2}:\d{1,2}$/)) {
		now = moment(),
		then = moment(now.format('YY-MM-DD') + ' ' + stime, 'YY-MM-DD HH:mm:ss');

		return(now.diff(then, 'seconds'));
	}
	else {
		return Infinity;
	}

}

}

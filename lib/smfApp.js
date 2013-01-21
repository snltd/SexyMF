//============================================================================
//
// smfApp.js
// ---------
//
// Configure and fire up the server, using the Restify framework.
//
// R Fisher 01/2013
//
//============================================================================
//
var fs = require('fs'),
	exec = require('child_process').exec,
	restify = require('restify'),
	smfGet = require('./smfGetMethods'),
	smfPost = require('./smfPostMethods'),
	smfMW = require('./smfMiddleware'),
	smfAuth = require('./smfAuth'),
	smfCore = require('./smfCore'),
	smfConfig = require('./smfConfig');

var app,
	cache = {};

module.exports = {

setupApp: function(options) {
	
	// Start a restify instance and tell it that we want to parse GET query
	// strings, POST bodies and auth headers; that we'll always want to
	// cache and validate the zone the user supplies, then finally apply a
	// little tweak to help cURL users

	// Are we using SSL?

	if (smfConfig.ssl.enabled) {
		options.certificate = fs.readFileSync(smfConfig.ssl.certificate),
		options.key = fs.readFileSync(smfConfig.ssl.key)
	};

	app = restify.createServer(options);

	app.use(restify.bodyParser());
	app.use(restify.queryParser());
	app.use(restify.authorizationParser());
	app.use(cacheZone);
	app.use(smfMW.chkZone);
	app.use(smfAuth.authenticate_user);
	app.pre(restify.pre.userAgentConnection());
	
	// Do we need the source IP checking middleware?

	if (smfConfig.allowed_addr) {
		app.use(smfMW.allowedAddr);
	}

	//------------------------------------------------------------------------
	// ROUTING
	//
	// GET calls first. These only GET information about the system. They
	// can't change anything and they require no special OS privileges to
	// work

	app.get('/smf/:zone/svcs', smfMW.chkSvc, smfMW.chkState,
			smfGet.svcsCmd);
	
	app.get('/smf/:zone/svcprop', smfMW.chkSvc, smfMW.chkProp,
			smfGet.svcpropCmd);
	
	app.get('/smf/:zone/log', smfMW.chkSvc, smfMW.chkLines,
			smfGet.fetchLog);
	
	app.get('/smf/:zone/svccfg/:cmd', smfMW.chkSvc, smfGet.svccfgCmd);
	
	// POST routes now

	app.post('/smf/:zone/svcadm/:cmd', smfMW.chkSvc, smfMW.chkCmd,
			smfMW.chkFlag, smfPost.svcadmCmd);

	app.post('/smf/:zone/svccfg/:cmd', smfMW.chkSvc, smfMW.chkCmd,
			smfMW.chkProp, smfPost.svccfgCmd);

	return app;
},


populateCache: function(callback) {

	// Get the zonename and see if we have the Illumos SMF extensions. The
	// callback will be to start the server. Sometimes I think it would be
	// nice to have a synchronous exec() for one-time cases like this.
	
	exec('/bin/zonename', function(err, stdout, stderr) {
		cache.zonename = stdout.trim();

		exec('/bin/svcs -h', function(err, stdout, stderr) {
			cache.illumos = (stderr.match(/\-L/)) ? true : false;
			smfCore.log('notice', 'detected Illumos SMF extensions');
			return callback();
		});

	});

},

startApp: function(port) {

	// Fire up the server 

	smfCore.log('notice', 'running in zone \'' + cache.zonename + '\'');
	smfCore.log('notice', 'PID is ' + process.pid);

	// Put the zonename in a global variable so the zoneCache middleware can
	// see it and cache it

	app.listen(port, function() {
		var str = app.name + ' receiving ';

		if (app.certificate) {
			str += 'SSL ';
		}

		smfCore.log('notice', str + 'requests on port ' + port);
	});

}

}; // end exports


//----------------------------------------------------------------------------
// MIDDLEWARE

function cacheZone(req, res, next) {

	// This is a crude piece of middleware which sets the zone name the
	// process is running in, so it doesn't have to be queried with every
	// request.  It is always the first piece of middleware called, and it
	// sets up the cache we use to carry things around between middleware.
	// It has to go in this file because of variable scope.

	req.params.cache = cache;
	return next();
}

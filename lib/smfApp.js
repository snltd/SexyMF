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
	smfCommand = require('./smfCommand'),
	smfCore = require('./smfCore'),
	smfConfig = require('./smfConfig');

var app,
	p_cache = {};

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
	app.use(startCache);
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


populatePCache: function(callback) {

	// The permanant cache is populated just once, on application startup. It
	// contains anything that can safely be assumed not to change during the
	// runtime of the application. We store the zonename, and a value that
	// tells us whether or not we have Illumos extensions. This is referred to
	// as 'cache.p'. 'cache.t' is a temporary per-connection cache.
	//
	// The callback will be to start the server. Sometimes I think it would be
	// nice to have a synchronous exec() for one-time cases like this.
	//
	// This only gets called once, when the server starts up.

	exec('/bin/zonename', function(err, stdout, stderr) {
		p_cache.zonename = stdout.trim();

		exec('/bin/svcs -h', function(err, stdout, stderr) {
			p_cache.illumos = (stderr.match(/\-L/)) ? true : false;
			smfCore.log('notice', 'detected Illumos SMF extensions');
			return callback();
		});

	});

},

startApp: function(port) {

	// Fire up the server

	smfCore.log('notice', 'running in zone \'' + p_cache.zonename + '\'');
	smfCore.log('notice', 'PID is ' + process.pid);

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

function startCache(req, res, next) {

	// This is a crude piece of middleware which sets the zone name the
	// process is running in, so it doesn't have to be queried with every
	// request.  It is always the first piece of middleware called, and it
	// sets up the cache we use to carry things around between middleware.
	// It has to go in this file because of variable scope.

	// create a clean cache for the new connection. p_cache is always set

	req.params.cache = {
			p: p_cache,
			t: {}
	};
	
	return next();
}

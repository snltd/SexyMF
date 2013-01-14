var restify = require('restify'),
	getMethods = require('./smfGetMethods'),
	postMethods = require('./smfPostMethods'),
	mw = require('./smfMiddleware'),
	auth = require('./smfAuth'),
	smfCore = require('./smfCore'),
	smfConfig = require('./smfConfig');

var app;

module.exports = {

setupApp: function(options) {
	
	// Start a restify instance and tell it that we want to parse GET query
	// strings, POST bodies and auth headers; that we'll always want to
	// cache and validate the zone the user supplies, then finally apply a
	// little tweak to help cURL users

	app = restify.createServer(options);

	app.use(restify.bodyParser());
	app.use(restify.queryParser());
	app.use(restify.authorizationParser());
	app.use(mw_zonename);
	app.use(mw.chkZone);
	app.use(auth.authenticate_user);
	app.pre(restify.pre.userAgentConnection());
	
	// Do we need the source IP checking middleware?

	if (smfConfig.allowed_addr) {
		app.use(mw.allowedAddr);
	}

	//------------------------------------------------------------------------
	// ROUTING
	//
	// GET calls first. These only GET information about the system. They
	// can't change anything and they require no special OS privileges to
	// work

	app.get('/smf/:zone/svcs', mw.chkSvc, mw.chkState, getMethods.svcsCmd);
	
	app.get('/smf/:zone/svcprop', mw.chkSvc, mw.chkProp,
			getMethods.svcpropCmd);
	
	app.get('/smf/:zone/log', mw.chkSvc, mw.chkLines, getMethods.fetchLog);
	
	app.get('/smf/:zone/svccfg/:cmd', mw.chkSvc, getMethods.svccfgCmd);
	
	// POST routes now

	app.post('/smf/:zone/svcadm/:cmd', mw.chkSvc, mw.chkCmd, mw.chkFlag,
			postMethods.svcadmCmd);

	app.post('/smf/:zone/svccfg/:cmd', mw.chkSvc, mw.chkCmd, mw.chkProp,
			postMethods.svccfgCmd);

	return app;
},

startApp: function(port) {

	// Fire up the server 

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
// FUNCTIONS

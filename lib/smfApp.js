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

"use strict";

var fs = require('fs'),
    exec = require('child_process').exec,
    restify = require('restify'),
    bunyan = require('restify/node_modules/bunyan'),
    smfGet = require('./smfGetMethods'),
    smfPost = require('./smfPostMethods'),
    smfMW = require('./smfMiddleware'),
    smfAuth = require('./smfAuth'),
    smfCommand = require('./smfCommand'),
    smfLog = require('./smfLog')(),
    smfConfig = require('./smfConfig')(),
    smfCommon = require('./smfCommon'),
    app,
    p_cache = {
      requests: 0,
      fmri: {},
      zpaths: {}
    };

module.exports = {

setupApp: function(options) {

  // Start a restify instance and tell it that we want to parse GET query
  // strings, POST bodies and auth headers; that we'll always want to
  // cache and validate the zone the user supplies, then finally apply a
  // little tweak to help cURL users

  // Are we using SSL?

  if (smfConfig.ssl.enabled) {
    options.certificate = fs.readFileSync(smfConfig.ssl.certificate);
    options.key = fs.readFileSync(smfConfig.ssl.key);
  }

  app = restify.createServer(options);

  app.use(restify.bodyParser());
  app.use(restify.queryParser());
  app.use(restify.authorizationParser());
  app.use(startCache);

  if (smfLog.levels() <= 20) {
    app.use(smfMW.requestLogger);
  }

  app.use(smfMW.chkZone);
  app.use(smfMW.chkZone);
  app.use(smfMW.accessZone);
  app.use(smfMW.logRequests);
  app.use(smfAuth.authenticate_user);
  app.use(smfMW.chkSvc);
  app.use(restify.requestLogger());
  app.pre(restify.pre.userAgentConnection());

  // Turn on the Restify audit logger if the user wants it.
  //
  if (smfConfig.log.audit_log) {
    smfCommon.can_write_to_file(smfConfig.log.audit_log);

    app.on('after', restify.auditLogger({

      log: bunyan.createLogger({
        name: 'audit',
        streams: [{
          path: smfConfig.log.audit_log
        }]
      })

    }));

  }

  // Do we need the source IP checking middleware?

  if (smfConfig.allowed_addr) {
    app.use(smfMW.allowedAddr);
  }

  //------------------------------------------------------------------------
  // ROUTING
  //
  // GET calls first. These only GET information about the system. They
  // can't change anything and they require no special OS privileges to
  // work.

  app.get('/smf/:zone/svcs', smfMW.chkState, smfGet.svcsCmd);

  app.get('/smf/:zone/svcprop', smfMW.chkProp, smfGet.svcpropCmd);

  app.get('/smf/:zone/log', smfMW.chkLines, smfGet.fetchLog);

  app.get('/smf/:zone/svccfg/:cmd', smfMW.chkFlag, smfGet.svccfgCmd);

  app.get('/smf/supports/svccfg', smfGet.svccfgSupports);

  app.get('/smf/status', smfGet.showStatus);

  // POST routes now

  app.post('/smf/:zone/svcadm/:cmd', smfMW.chkCmd, smfMW.chkFlag,
           smfPost.svcadmCmd);

  app.post('/smf/:zone/svccfg/:cmd', smfMW.chkCmd, smfMW.chkProp,
           smfPost.svccfgCmd);

  app.post('/smf/:zone/kick', smfPost.kickSvc);

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

    // If we can't run zonename, something is badly wrong and we might as
    // well log the error and exit.

    if (err) {
      smfLog.error(err);
      console.error('cannot find required external: /bin/zonename');
      process.exit(100);
    }

    p_cache.zonename = stdout.trim();

    // Check for Illumos extensions, unless we've been told not to.

    if (smfConfig.force_zlogin) {
      return callback();
    }
    else {
      exec('/bin/svcs -h', function(err, stdout, stderr) {

        if (stderr.match(/\-L/)) {
          p_cache.illumos = true;
          smfLog.info({illumos: true}, 'detected Illumos SMF extensions');
        }

        return callback();
      });

    }

  });

},

startApp: function(port) {

  // Fire up the server and put a bit of info in the logs and to the
  // console.

  var ssl = false;

  smfLog.info( {zone: p_cache.zonename}, 'running in zone \'' +
      p_cache.zonename + '\'');

  app.listen(port, function() {
    var str = app.name + ' accepting ';

    if (app.certificate) {
      str += 'SSL ';
      ssl = true;
    }

    str += 'requests on port ' + port;

    console.log('SexyMF ' + str);

    if (smfConfig.log.logfile) {
      console.log("Logging at '" + smfConfig.log_level + "' level to " +
                  smfConfig.log.logfile);
    }

    smfLog.info({port: port, ssl: ssl }, str);
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

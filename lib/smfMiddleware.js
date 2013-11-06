//============================================================================
//
// smfMiddleware.js
// ----------------
//
// Connect middleware. This is mostly methods to validate user input.  We
// allow BodyParser and QueryParser to map variables into the param space,
// which is where all these methods operate, so they'll automatically work
// for GET and POST requests.
//
// R Fisher 01/2013
//
//============================================================================

"use strict";

var exec = require('child_process').exec,
    _ = require('underscore'),
    smfConfig = require('./smfConfig')(),
    smfError = require('./smfError'),
    smfCommand = require('./smfCommand'),
    smfLog = require('./smfLog')();

module.exports = {

logRequests: function(req, res, next) {
  //
  // Keep count of requests for the status module.
  //
  req.params.cache.p.requests++;
  return next();
},


requestLogger: function(req, res, next) {
  //
  // write the plain HTTP request into the debug log.
  //
  smfLog.debug('enabling HTTP request logging');

  smfLog.debug({
    url: req.headers.host + req.url,
    body: req.body,
    agent: req.headers['user-agent']
  }, 'received request');

  return next();
},


chkZone: function(req, res, next) {

  // Check the zone is a valid zone.  This will catch %20 type things. If
  // someone puts raw junk like literal ! or ; in the URI, Restify will
  // give them a 404.

  var eh = smfError(req, res, next),
      zone = req.params.zone;

  if (!zone) {
    return next();
  }

  // Does it look sane?

  if (zone !== '@' && (zone.match(/[^\w\-_]/) || zone.length > 128)) {
    eh.invalidArgs('zone name', zone);
  }

  // Cache the zone name for logging

  req.params.cache.t.zone = zone;

  // If we're running in our own zone, pass on to the next middleware

  if (zone === '@' || zone === req.params.cache.p.zonename) {
    req.params.cache.t.ngz = false;
    return next();
  }
  else if (req.params.cache.p.zonename === 'global') {
    req.params.cache.t.ngz = true;

    // We've been asked to run in another zone. Does the zone exist? It
    // seems the right thing to do if the zone does not exist is to return a
    // 404, and the only way to do that is check there's such a zone. We
    // can't even cache a list of extant zones at start up, as they may come
    // and go while we're running. We'll get the zone root while we're
    // at it, and cache that.

    exec('/usr/sbin/zoneadm -z ' + zone + ' list -p', function(err, stdout,
          stderr) {

      if (err) {
        eh.unknownZone(zone);
      }
      else {

        var z_info = stdout.split(":");

        // Now z_info contains:
        //   0: zone ID
        //   1: zone name
        //   2: zone state (e.g. running)
        //   3: zone path
        //   4: zone UUID
        //   5: brand
        //   6: IP type

        // Is the zone running? If not, send an error back to the client

        if (z_info[2] !== 'running') {
          eh.nonRunningZone(zone, z_info[2]);
        }

        // Cache the zonepath.

        if (!req.params.cache.p.zpaths[zone]) {
          smfLog.debug({zpath: z_info[3], zone: zone}, "caching zonepath");
          req.params.cache.p.zpaths[zone] = z_info[3];
        }

        // How are we going to run the zone command? Maybe we have, and
        // are using, Illumos extensions? Now we have to use zlogin for
        // manifest imports even on Illumos, we'll always cache the
        // zlogin info.
        //
        // I don't like using the cache as a global variable space, but
        // there are many paths to the smfCommand() method, and it's
        // even more confusing trying to carry state around in
        // Javascript. So, we have a cache variable z_method, which
        // tells smfCommand() which method to use when running NGZ
        // commands. You can override it anywhere.

        req.params.cache.t.z_method = 'zlogin';

        req.params.cache.t.zlogin = ['/usr/sbin/zlogin', zone];

        // Do we need to use pfexec(1) too?

        if (smfConfig.pfexec_zlogin) {
          req.params.cache.t.zlogin.splice(0, 0, '/usr/bin/pfexec');
        }

        // If we have illumos extensions, cache some info on how to use
        // them.

        if (req.params.cache.p.illumos) {
          req.params.cache.t.zopts = '-z ' + zone;
          req.params.cache.t.z_method = 'illumos';
        }

        return next();
      }

    });

  }
  else {  // we're running in an NGZ, and the request is for another zone
    eh.ngz2ngz();
  }

},


allowedAddr: function(req, res, next) {

  // If the connection isn't from a member of the 'allowed_addr' array,
  // drop it.

  var eh = smfError(req, res, next);

  if (_.contains(smfConfig.allowed_addr, req.connection.remoteAddress)) {
    return next();
  }
  else {
    eh.invalidIP(req.connection.remoteAddress);
  }

},


chkSvc: function(req, res, next) {

  // Make sure a service name is valid. If not, send an error to the client.
  // Service names can contain letters, numbers, and [:/-_].

  var eh = smfError(req, res, next),
    svc = req.params.svc;

  if (svc && (svc.match(/[^\w\-:\/]/) || svc.length > 256)) {
    eh.invalidArgs('service', svc);
  }

  return next();
},


chkState: function(req, res, next) {

  // Make sure a state is valid. By "valid" I mean a sane looking string.
  // We don't check to see if it's a word that SMF understands, it's up to
  // the client to get that right. If the word contains anything other than
  // lower-case letters, or is not just a dash, return an error to the
  // client

  var eh = smfError(req, res, next),
      st = req.params.state;

  if (st && ((st.match(/[^_a-z]/) && st !== '-') || st.length > 20)) {
    eh.invalidArgs('state', st);
  }

  return next();
},


chkProp: function(req, res, next) {

  // Make sure a comma-separated list of properties is valid. Property
  // names can contain letters and underscores, slashes, and maybe
  // numbers. (I'm not sure about numbers, but letting them through won't
  // hurt.)

  var eh = smfError(req, res, next);

  if (req.params.prop) {

    _.each(req.params.prop.split(','), function(prop) {

      if (prop.length > 128 || prop.match(/[^\w\/]/)) {
        eh.invalidArgs('property', prop);
      }

    });

  }

  return next();
},


chkLines: function(req, res, next) {

  // Make sure the number of lines requested from a logfile is a number,
  // and a sensible one at that

  var eh = smfError(req, res, next),
      l = req.params.lines;

  if (l && (l < 1 || l > 2048 || l.match(/\D/))) {
    eh.invalidArgs('number', l);
  }

  return next();
},


chkCmd: function(req, res, next) {

  // Validate the command passed to svcadm. All we do is make sure it
  // isn't complete junk, it's up to the user to supply something
  // sensible. Commands can only have lower case letters

  var eh = smfError(req, res, next),
      cmd = req.params.cmd;

  if (cmd && (cmd.length > 20 || cmd.match(/[^a-z]/))) {
    eh.invalidArgs('command', cmd);
  }

  return next();
},


chkType: function(req, res, next) {

  // Validate the datatype passed to svcprop. All we do is make sure it
  // isn't complete junk, it's up to the user to supply something sensible.
  // Types can only have lower case letters

  var eh = smfError(req, res, next),
      type = req.params.type;

  if (type && (type.length > 20 || type.match(/[^a-z]/))) {
    eh.invalidArgs('datatype', type);
  }

  return next();
},


chkFlag: function(req, res, next) {

  // Validate flags which get passed through to commands, such as svcadm.
  // These can only be letters.

  var eh = smfError(req, res, next),
      flags = req.params.flags;

  if (flags && (flags.length > 10 || flags.match(/[^a-z]/))) {
    eh.invalidArgs('flag(s)', flags);
  }

  // If there are flags, put them in the cache and prefix them with a '-',
  // if not, set the variable to a blank string.

  req.params.cache.t.flags = flags;
  req.params.flags = (flags) ? '-' + flags : '';
  return next();
},


accessZone: function(req, res, next) {
  //
  // This middleware handles the service access control lists. Watch out
  // for the embedded function, and remember how scope works!
  //
  // If SexyMF never loaded an access file, our job here is pretty
  // simple. Same applies if this is just a status request.

  var acl = smfConfig.access,
      acc_obj;

  if (!acl || req._path == '/smf/status') {
    return next();
  }

  // Okay, we've got a bit of work to do. Declare some variables and
  // work out what zone the user wants to operate on.

  var eh = smfError(req, res, next),
      block = false,
      cmd,
      fmri,
      zone = (req.params.zone === '@') ? req.params.cache.p.zonename :
                                         req.params.zone;

  // We may have an object in the access file for this zone, use that.
  // If not, fall back to the default. If there's no default, we're
  // done.

  if (acl[zone]) {
    acc_obj = acl[zone];
    smfLog.debug({zone: zone}, 'found acl for zone');
  }
  else if (acl['default']) {
    acc_obj = acl['default'];
    smfLog.debug('using default acl');
  }
  else {
    return next();
  }

  // Is the zone "block"ed? If it is, use the error handler to tell the
  // user. You can't do anything on a blocked zone.

  if (acc_obj.default_action === 'block') {
    smfLog.info({zone: zone}, 'zone blocked in access file');
    eh.blockedZone(zone);
  }

  // We know the zone isn't blocked, so if no service has been
  // specified, or if the user only wants to view state through the
  // svcs(1) command, we've nothing else to do here. Pass control to the
  // next() piece of middleware.

  if (!req.params.svc || req.route.path == '/smf/:zone/svcs') {
    return next();
  }

  // We need to get the fully qualified service FMRI. Have we cached it?
  // Even if we have, we have to call another function to do the check
  // because of the async call in the other branch.

  if (req.params.cache.p.fmri[req.params.svc]) {
    check_fmri(req.params.cache.p.fmri[req.params.svc]);
  }
  else {

    // No. We've got to fetch it by executing svcs(1). This is nicked
    // from smfGetMethods::fetchLog(). I know that's extremely wet, but
    // it's one of those things that's a PITA to do with a callback.

    cmd = smfCommand(['/bin/svcs', '-H', req.params.svc], req.params.cache,
          false, eh);

    cmd.cmdExec(function(err, stdout, stderr) {

      // If we get an error, it'll be because there's no service
      // matching the given string

      if (stdout === '' && stderr !== '') {
        return eh.unknownSvc(req.params.svc);
      }

      // Make sure we only have one service entry

      var svcs = stdout.split('\n');

      if (svcs.length > 2) {
        return eh.ambiguousSvc(req.params.svc);
      }

      // Pull out the FMRI and stick it in the cache. If the FMRI is
      // undefined, the service doesn't exist on the box, and we ought
      // to tell the user

      var fmri = svcs[0].split(/\s+/)[2];

      req.params.cache.p.fmri[req.params.svc] = fmri;
      check_fmri(fmri);
    });

  }

  function check_fmri(fmri) {
    //
    // Look to see if the current service is allowed or not. Assume it
    // won't be.
    //
    var allow = false;

    // What is the default action for this zone? (It it was "block", we
    // won't have reached this point.)

    if (acc_obj.default_action === 'allow') {
      //
      // Anything not in the exception list is allowed.
      //
      if (!_.contains(acc_obj.exceptions, fmri)) {
        allow = true;
      }

    }
    else if (acc_obj.default_action === 'deny') {
      //
      // Anything in the exception list is allowed.
      //
      if (_.contains(acc_obj.exceptions, fmri)) {
        allow = true;
      }

    }
    else {
      smfLog.warn({zone: zone, state: acc_obj.default_action},
                  'unknown state in ACL');
    }

    if (allow) {
      smfLog.debug({zone: zone, fmri: fmri}, 'service passed ACL checks');
      return next();
    }
    else {
      smfLog.info({zone: zone, fmri: fmri}, 'service blocked by ACL');
      eh.blockedSvc(fmri);
    }


  }

}

}; // end exports


//============================================================================
//
// smfLog.js
// ---------
//
// Logging. Obviously. We now use Bunyan for all logging, and pretty much
// all output. The old home-made logging was junk, so I've thrown it out.
//
// R Fisher 2013
//
//============================================================================

"use strict";

var bunyan = require('restify/node_modules/bunyan'),
    smfConfig = require('./smfConfig')(),
    smfCommon = require('./smfCommon'),
    b_log;

module.exports = function log(level, msg, obj) {

  // Following, I guess, a singleton pattern. Create a Bunyan logging
  // instance if we don't already have one, and export it. That's all we do.

  if (!b_log) {

    if (smfConfig.log.logfile) {
      smfCommon.can_write_to_file(smfConfig.log.logfile);

      b_log = bunyan.createLogger({
        name: 'sexymf',
        streams: [{
          path: smfConfig.log.logfile,
          level: smfConfig.log_level
        }],
        src: false
      });

    }
    else {

      // If no logfile is defined, write to stdout

      b_log = bunyan.createLogger({
        name: 'sexymf',
        stream: process.stdout,
        level: smfConfig.log_level,
        src: false
      });

    }

  }

  return b_log;
}; // end of exports

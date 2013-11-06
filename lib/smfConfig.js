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
    config,
    smfLog;

module.exports = function smfConfig(file) {

  // If the user hasn't specified a path to a config users file, we'll it is
  // called 'config/config.json', at the same level as the 'sexymf.js'
  // executable.

  if (!config) {

    var conf_dir = path.join(path.dirname(process.argv[1]), 'config'),
        c_file = (file) ? file : path.join(conf_dir, 'config.json'),
        u_file,
        a_file;

    // Load the config file

    c_file = path.resolve(c_file);
    config = load_file(c_file);

    config.c_paths = { config: c_file };

    // We have the config file, so we can start logging

    smfLog = require('./smfLog')();

    smfLog.info({config_file: c_file}, 'loaded configuration');

    // Now we have to load the users file. The path to it is in the config
    // file. This may not actually be fatal - the

    if (config.use_auths && config.user_file) {
      u_file = path.resolve(config.user_file);
      config.users = load_file(u_file);
      smfLog.info({user_file: u_file}, 'loaded user file');
      config.c_paths.users = u_file;
    }
    else if (config.use_auths) {
      smfLog.fatal('no user file specified in config');
      console.error("ERROR: No user file specified in config file.");
      process.exit(1);
    }

    // If one is defined, load in the access list file

    if (config.access_file) {
      a_file = path.resolve(config.access_file);
      config.access = load_file(a_file);
      smfLog.info({access_file: a_file}, 'loaded access file');
      config.c_paths.acl = a_file;
    }

  }

  return config;
}; // end of exports

//----------------------------------------------------------------------------
// PRIVATE METHODS

function load_file(file) {

  // Return the JSON contents of a file, or exit the program if that file
  // can't be found.
  //
  // Fully qualify the path to the file - this makes the error message more
  // informative.
  //
  file = path.resolve(file);

  if (fs.existsSync(file)) {

    try {
      return cjson.load(file);
    }
    catch (e) {
      //
      // If we can't load it's probably because of a badly formed file. Pass
      // whatever CJSON tells us on to the user.
      //

      if (smfLog) {
        smfLog.fatal({file: file}, 'file failed to load');
      }

      console.error('Failed to load config file: ' + file +
                    '\nCJSON error follows:\n' + e);
      process.exit(1);
    }

  }
  else {

    if (smfLog) {
      smfLog.fatal({file: file}, 'file not found');
    }

    console.error('Missing file: ' + file);
    process.exit(1);
  }

}

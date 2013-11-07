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
    fs = require('fs'),
    _ = require('lodash');

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

  var fh;

  file = path.resolve(file);

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

},

filter_fields: function(req, res, body) {
  //
  // Filter the output if the user has provided the "fields" parameter,
  // for partial response.
  //
  var ret = {},
      data,
      kpath,
      keys,
      key_arr,
      obj;

  if (req.params && req.params.fields) {

    keys = req.params.fields.split(',');

    while(keys.length) {
      data = body;
      kpath = keys.shift();
      key_arr = kpath.split('.');

      while (data && key_arr[0]) {
        data = data[key_arr.shift()] || null;
      }

      if (data !== null) {
        key_arr = kpath.split('.');

        while(key_arr.length) {
          obj = {};
          obj[key_arr.pop()] = data;
          data = obj;
        }

        ret = _.merge(ret, data);
      }

    }

  }
  else {
    ret = body;
  }

  ret = JSON.stringify(ret);
  res.setHeader('Content-Length', Buffer.byteLength(ret));
  return ret;
}

};

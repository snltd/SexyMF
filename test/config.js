module.exports = function() {

  // By default, run tests on a SexyMF instance running in the same zone
  // we are in, performing operations on that same zone.
  //
  var conf = {
    url: "https://0:9206",
    zone: "@",
    test_svc: "stest",
    test_manifest: "test/manifest/stest.xml"
  };
  
  // You can override the zone and the server address with environment
  // variables

  if (process.env.SERVER_URI) {
      conf.url = process.env.SERVER_URI;
  }

  if (process.env.TARGET_ZONE) {
    conf.zone = process.env.TARGET_ZONE;
  }

  return conf;
}


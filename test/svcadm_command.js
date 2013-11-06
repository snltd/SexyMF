// 
// Tests for the svcadm wrapper. These all test for correct failure,
// because all the active svcadm commands are tested in the
// stest_manipulation.js file.
//
var should = require('should'),
    request = require('supertest'),
    common = require('./common.js'),
    conf = require('./config.js')(),
    baseurl = '/smf/' + conf.zone + '/';

describe('Try to restart a service without "manager" auth', function() {

  it('should return an error message', function(done) {

    request(conf.url)
      .post(baseurl + 'svcadm/restart')
      .send({svc: "ssh"})
      .auth('viewer', 'plainpass')
      .expect('Content-Type', 'application/json')
      .expect({ code: "NotAuthorized",
                message: "insufficient authorizations"
      })
      .expect(403, done)

  });

});


describe('Non-existent subcommand', function() {

  it('should return an error message', function(done) {

    request(conf.url)
      .post(baseurl + 'svcadm/nosuch')
      .send({svc: "ssh"})
      .auth('manager', 'plainpass')
      .expect('Content-Type', 'application/json')
      .expect({ code: "NotAuthorized",
                message:"subcommand not permitted: nosuch"
      })
      .expect(403, done)

  });

});


describe('Missing subcommand', function() {

  it('should return an error message', function(done) {

    request(conf.url)
      .post(baseurl + 'svcadm')
      .send({svc: "ssh"})
      .auth('manager', 'plainpass')
      .expect('Content-Type', 'application/json')
      .expect({ code: "ResourceNotFound",
                message: "/smf/" + conf.zone + "/svcadm does not exist"
      })
      .expect(404, done)

  });

});


describe('Try to restart a non-existent service', function() {

  it('should return an error message', function(done) {

    request(conf.url)
      .post(baseurl + 'svcadm/restart')
      .send({svc: "nosuch"})
      .auth('manager', 'plainpass')
      .expect('Content-Type', 'application/json')
      .expect({ code: "ResourceNotFound",
                message: "Unknown service: nosuch"
      })
      .expect(404, done)

  });

});


describe('Try to put a service in an invalid state', function() {

  it('should return an error message', function(done) {

    request(conf.url)
      .post(baseurl + 'svcadm/mark')
      .send({ svc: "ssh",
              state: "nosuch"
      })
      .auth('manager', 'plainpass')
      .expect('Content-Type', 'application/json')
      .expect({ code: "ResourceNotFound",
                message: "Unknown or incorrectly formed command: mark"
      })
      .expect(404, done)

  });

});


describe('Passing an invalid flag to svcadm', function() {

  it('should return an error message', function(done) {

    request(conf.url)
      .post(baseurl + 'svcadm/restart')
      .send({ svc: "ssh",
              flags: "r"
      })
      .auth('manager', 'plainpass')
      .expect('Content-Type', 'application/json')
      .expect({ code: "NotAuthorized",
                message: "flag not permitted: -r"
      })
      .expect(403, done)

  });

});


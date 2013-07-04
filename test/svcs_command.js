// 
// Check output from the svcs(1) command. The old test harness used to
// count instances with the command-line tools and make sure SexyMF got
// the same numbers back. Since the new test suite doesn't assume the
// test agent and the server are running in the same zone, this is no
// longer possible.
//
var should = require('should'),
		exec = require('child_process').exec,
		child,
		request = require('supertest'),
		common = require('./common.js'),
		_ = require('underscore'),
		conf = require('./config.js')();

describe('list svcs', function() {

	it('should return an object listing all services', function(done) {

		request(conf.url)
			.get('/smf/@/svcs')
			.auth('manager', 'plainpass')
			.expect('Content-Type', 'application/json')
			.expect(200)
			.end(function(err, res) {
				res.body.length.should.be.above(50);
				res.body[0].should.have.property('fmri');
				res.body[0].should.have.property('state');
				res.body[0].should.have.property('stime');
				done();
			});

	});

});


describe('list online svcs', function() {

	it('should return an object listing only online services', function(done) {

		request(conf.url)
			.get('/smf/@/svcs?state=online')
			.auth('manager', 'plainpass')
			.expect('Content-Type', 'application/json')
			.expect(200)
			.end(function(err, res) {
				res.body.length.should.be.above(50);
				res.body[0].should.have.property('fmri');
				res.body[0].should.have.property('state');
				res.body[0].should.have.property('stime');

				var not_online = _.without(_.pluck(res.body, 'state'), 'online');

				not_online.length.should.equal(0);
				done();
			});

	});

});


describe('list unknown service', function() {

	it('should return an error', function(done) {

		request(conf.url)
			.get('/smf/@/svcs?svc=nosuchservice')
			.auth('manager', 'plainpass')
			.expect('Content-Type', 'application/json')
			.expect({	"code": "ResourceNotFound",
								"message": "Unknown service: nosuchservice"
			}) 
			.expect(404, done)
	});

});


describe('list disabled svcs', function() {

	it('should return an object listing only disabled services', function(done) {

		request(conf.url)
			.get('/smf/@/svcs?state=disabled')
			.auth('manager', 'plainpass')
			.expect('Content-Type', 'application/json')
			.expect(200)
			.end(function(err, res) {
				res.body.length.should.be.above(10);
				res.body[0].should.have.property('fmri');
				res.body[0].should.have.property('state');
				res.body[0].should.have.property('stime');

				var not_online = _.without(_.pluck(res.body, 'state'), 'disabled');

				not_online.length.should.equal(0);
				done();
			});

	});

});


describe('list unknown service state', function() {

	it('should return an empty object', function(done) {

		request(conf.url)
			.get('/smf/@/svcs?state=nosuch')
			.auth('manager', 'plainpass')
			.expect('Content-Type', 'application/json')
			.expect({})
			.expect(200, done)
	});

});


describe('get state of ambiguous service', function() {

	it('should return an object for multiple instances', function(done) {

		request(conf.url)
			.get('/smf/@/svcs?svc=console-login')
			.auth('manager', 'plainpass')
			.expect('Content-Type', 'application/json')
			.expect(200)
			.end(function(err, res) {
				res.body.length.should.be.above(1);
				res.body[0].should.have.property('fmri');
				res.body[0].should.have.property('state');
				res.body[0].should.have.property('stime');

				_.each(_.pluck(res.body, 'fmri'), function(f) {
					f.should.match(/^svc:\/system\/console-login:/);
				});

				done();
			});

	});

});


describe('invalid service name', function() {

	it('should return an error', function(done) {

		request(conf.url)
			.get('/smf/@/svcs?svc=no;\$(such)')
			.auth('manager', 'plainpass')
			.expect('Content-Type', 'application/json')
			.expect({	"code": "InvalidArgument",
								"message": "Invalid value for service: no;$(such)"
			}) 
			.expect(409, done)
	});

});


describe('invalid service state', function() {

	it('should return an error', function(done) {

		request(conf.url)
			.get('/smf/@/svcs?state=no;\$(such)')
			.auth('manager', 'plainpass')
			.expect('Content-Type', 'application/json')
			.expect({	"code": "InvalidArgument",
								"message": "Invalid value for state: no;$(such)"
			}) 
			.expect(409, done)
	});

});

// The following tests only run if the daemon is in a global zone. You
// need to set the name of the NGZ it will run tests in in the config
// file. The old harness used to check you actually got the zone info
// back, not the global. I'm not sure how to do that from within this
// framework.

common.in_global(function(global) {

	if (global) {

		describe('list online svcs in zone', function() {
		
			it('should return an object listing only online services',
				 function(done) {

				request(conf.url)
					.get('/smf/' + conf.zone + '/svcs?state=online')
					.auth('manager', 'plainpass')
					.expect('Content-Type', 'application/json')
					.expect(200)
					.end(function(err, res) {
						res.body.length.should.be.above(50);
						res.body[0].should.have.property('fmri');
						res.body[0].should.have.property('state');
						res.body[0].should.have.property('stime');

						var not_online = _.without(_.pluck(res.body, 'state'), 'online');

						not_online.length.should.equal(0);
						done();
					});

			});

		});

	}

});


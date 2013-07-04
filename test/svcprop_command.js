// 
// Run tests on how SexyMF uses the svcprop(1m) command in the local
// zone. Looks at standard SunOS services which I expect to provide stable
// interfaces.
//
var should = require('should'),
		request = require('supertest'),
		common = require('./common.js'),
		_ = require('underscore'),
		conf = require('./config.js')();

describe('get start method', function() {

	it('should return an object describing the SSH start method',
		 function(done) {

		request(conf.url)
			.get('/smf/@/svcprop?svc=ssh&prop=start/exec')
			.auth('manager', 'plainpass')
			.expect('Content-Type', 'application/json')
			.expect({"start":{"exec":"/lib/svc/method/sshd\\ start"}})
			.expect(200, done)
	});

});


describe('get start and stop method', function() {

	it('should return an object describing the SSH start and stop methods',
		 function(done) {

		request(conf.url)
			.get('/smf/@/svcprop?svc=ssh&prop=start/exec,stop/exec')
			.auth('manager', 'plainpass')
			.expect('Content-Type', 'application/json')
			.expect({	"start":{"exec":"/lib/svc/method/sshd\\ start"},
								"stop":{"exec":":kill"}
			})
			.expect(200, done)

	});

});


describe('get start and stop method and ask for non-existent property',
		 function() {

	it('should return an object describing the SSH start and stop methods',
		 function(done) {

		request(conf.url)
			.get('/smf/@/svcprop?svc=ssh&prop=start/exec,stop/exec,start/nosuch')
			.auth('manager', 'plainpass')
			.expect('Content-Type', 'application/json')
			.expect({	"start":{"exec":"/lib/svc/method/sshd\\ start"},
								"stop":{"exec":":kill"}
			})
			.expect(200, done)

	});

});


describe('get all SSH properties', function() {

	it('should return an object describing all SSH service properties',
		 function(done) {

		request(conf.url)
			.get('/smf/@/svcprop?svc=ssh')
			.auth('manager', 'plainpass')
			.expect('Content-Type', 'application/json')
			.expect(200)
			.end(function(err, res) {
				res.body.should.have.property('general')
				res.body.should.have.property('restarter')
				done()
			})

	});

});


describe('get start method ACL blocked', function() {

	it('should return an error saying the method is blocked', function(done) {

		request(conf.url)
			.get('/smf/@/svcprop?svc=fmd&prop=start/exec')
			.auth('manager', 'plainpass')
			.expect('Content-Type', 'application/json')
			.expect({ "code": "NotAuthorized",
								"message": "service blocked by ACL: svc:/system/fmd:default"
			})
			.expect(403, done)
	});

});


describe('request properties for amibiguous service', function() {

	it('should return an error saying the request was ambiguous',
		 function(done) {

		request(conf.url)
			.get('/smf/@/svcprop?svc=identity')
			.auth('manager', 'plainpass')
			.expect('Content-Type', 'application/json')
			.expect({	"code":"InvalidArgument",
								"message":"Ambiguous service: identity"
			})
			.expect(409, done)
	});

});


describe('request property which does not exist', function() {

	it('should return an empty object', function(done) {

		request(conf.url)
			.get('/smf/@/svcprop?svc=ssh&prop=no_such_property')
			.auth('manager', 'plainpass')
			.expect('Content-Type', 'application/json')
			.expect({})
			.expect(200, done)
	});

});


describe('request property of a service which does not exist', function() {

	it('should return an empty object', function(done) {

		request(conf.url)
			.get('/smf/@/svcprop?svc=no_such_service&prop=exec/start')
			.auth('manager', 'plainpass')
			.expect('Content-Type', 'application/json')
			.expect({	"code": "ResourceNotFound",
								"message":"Unknown service: no_such_service"
			})
			.expect(404, done)
	});

});


describe('request property with invalid name', function() {

	it('should return an error saying the property name is invalid',
		 function(done) {

		request(conf.url)
			.get('/smf/@/svcprop?svc=ssh&prop=no;\$(such)')
			.auth('manager', 'plainpass')
			.expect('Content-Type', 'application/json')
			.expect({	"code": "InvalidArgument",
								"message": "Invalid value for property: no;$(such)"
			})
			.expect(409, done)
	});

});

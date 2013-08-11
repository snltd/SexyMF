//
// Test the log reading functions work
//
var should = require('should'),
		request = require('supertest'),
		common = require('./common.js'),
		_ = require('underscore'),
		conf = require('./config.js')(),
		baseurl = '/smf/' + conf.zone + '/';

describe('try to view log without "log" authorization', function() {

	it('should return an empty object', function(done) {

		request(conf.url)
			.get(baseurl + 'log?svc=ssh')
			.auth('viewer', 'plainpass')
			.expect('Content-Type', 'application/json')
			.expect({	"code": "NotAuthorized",
								"message": "insufficient authorizations"
			})
			.expect(403, done)
	});

});


describe('get the last five lines of the SSH log', function() {

	it('should return an empty object', function(done) {

		request(conf.url)
			.get(baseurl + 'log?svc=ssh&lines=5')
			.auth('logviewer', 'plainpass')
			.expect('Content-Type', 'text/plain')
			.expect(200)
			.end(function(err, res) {
				var lines = res.text.split('\n');
				lines.should.have.length(6);
				done()
			})
	});

});


describe('ask for too many log lines', function() {

	it('should return an error object', function(done) {

		request(conf.url)
			.get(baseurl + 'log?svc=ssh&lines=5000')
			.auth('logviewer', 'plainpass')
			.expect('Content-Type', 'application/json')
			.expect({	"code": "InvalidArgument",
								"message": "Invalid value for number: 5000"
			})
			.expect(409, done)
	});

});


describe('pass invalid number of log lines', function() {

	it('should return an error object', function(done) {

		request(conf.url)
			.get(baseurl + 'log?svc=ssh&lines=xyz')
			.auth('logviewer', 'plainpass')
			.expect('Content-Type', 'application/json')
			.expect({	"code": "InvalidArgument",
								"message": "Invalid value for number: xyz"
			})
			.expect(409, done)
	});

});


describe('request log for unknown service', function() {

	it('should return an error', function(done) {

		request(conf.url)
			.get(baseurl + 'log?svc=nosuchservice')
			.auth('logviewer', 'plainpass')
			.expect('Content-Type', 'application/json')
			.expect({	"code": "ResourceNotFound",
								"message": "Unknown service: nosuchservice"
			}) 
			.expect(404, done)
	});

});

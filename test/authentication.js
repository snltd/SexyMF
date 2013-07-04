var should = require('should'),
		request = require('supertest'),
		conf = require('./config.js')();

describe('wrong password', function() {

	it('should return a 403', function(done) {

		request(conf.url)
			.get('/smf/@/svcs')
			.auth('manager', 'wrongpass')
			.expect('Content-Type', 'application/json')
			.expect({"code": "NotAuthorized", "message": "Invalid credentials"})
			.expect(403, done)
		});

});


describe('missing credentials', function() {

	it('should return a 403', function(done) {

		request(conf.url)
			.get('/smf/@/svcs')
			.expect('Content-Type', 'application/json')
			.expect({"code": "NotAuthorized", "message": "Invalid credentials"})
			.expect(403, done)

		});

});

var exec = require('child_process').exec,
		should = require('should'),
		request = require('supertest'),
		common = require('./common.js'),
		conf = require('./config.js')();

describe('unknown zone', function() {

	// This tests for different results depending on whether the server is
	// running in a global or non-global zone.

	it('should return an error stating the zone is not known', function(done) {

		common.in_global(function(global) {

			if (global) {
				request(conf.url)
					.get('/smf/nosuchzone/svcs')
					.auth('manager', 'plainpass')
					.expect('Content-Type', 'application/json')
					.expect({	"code": "ResourceNotFound",
										"message": "Unknown zone: nosuchzone"
					})
					.expect(404, done)
			}
			else {
				request(conf.url)
					.get('/smf/nosuchzone/svcs')
					.auth('manager', 'plainpass')
					.expect('Content-Type', 'application/json')
					.expect({"code":"InvalidArgument","message":"NGZ to NGZ unsupported"})
					.expect(409, done)
			}

		})

	})

});


describe('invalid input', function() {

	it('should return an error from middleware stating the invalid zone name',
		 function(done) {

		request(conf.url)
			.get('/smf/z%21ine/svcs')
			.auth('manager', 'plainpass')
			.expect('Content-Type', 'application/json')
			.expect({	"code": "InvalidArgument",
								"message": "Invalid value for zone name: z!ine"
			})
			.expect(409, done)
		});


});


describe('shell injection', function() {

	it('should return an error from Restify stating the invalid zone name',
		 function(done) {

		request(conf.url)
			.get('/smf/;cat /etc/passwd;/svcs')
			.auth('manager', 'plainpass')
			.expect('Content-Type', 'application/json')
			.expect({	"code":"ResourceNotFound",
								"message": "/smf/;cat%20/etc/passwd;/svcs does not exist"
			})
			.expect(404, done)
		});

});


describe('unknown command', function() {

	it('should return an error stating the unknown command', function(done) {

		request(conf.url)
			.get('/smf/@/nosuchcommand')
			.auth('manager', 'plainpass')
			.expect('Content-Type', 'application/json')
			.expect({"code":"ResourceNotFound",
						"message":"/smf/@/nosuchcommand does not exist"})
			.expect(404, done)
		});

});

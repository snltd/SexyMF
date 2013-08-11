// 
// Tests for the svccfg wrapper. These all test for correct failure,
// because all the active svccfg commands are tested in the
// stest_manipulation.js file.
//
var should = require('should'),
		request = require('supertest'),
		common = require('./common.js'),
		conf = require('./config.js')(),
		baseurl = '/smf/' + conf.zone + '/';

describe('Non-existent subcommand', function() {

	it('should return an error message', function(done) {

		request(conf.url)
			.get(baseurl + 'svccfg/nosuch')
			.auth('manager', 'plainpass')
			.expect('Content-Type', 'application/json')
			.expect({ code: "ResourceNotFound",
								message: "Unknown or incorrectly formed command: nosuch"
			})
			.expect(404, done)

	});

});


describe('Try to export non-existent service', function() {

	it('should return an error message', function(done) {

		request(conf.url)
			.get(baseurl + 'svccfg/export?svc=nosuch')
			.auth('manager', 'plainpass')
			.expect('Content-Type', 'application/json')
			.expect({ code: "ResourceNotFound",
								message: "Unknown service: nosuch"
			})
			.expect(404, done)

	});

});


describe('Try to archive without sufficient credentials',
				 function() {

	it('should return an error message', function(done) {

		request(conf.url)
			.get(baseurl + 'svccfg/archive')
			.auth('viewer', 'plainpass')
			.expect('Content-Type', 'application/json')
			.expect({ code: "NotAuthorized",
								message: "insufficient authorizations"
			})
			.expect(403, done)

	});

});


describe('Try to set a property without sufficient credentials',
				 function() {
	it('should return an error message', function(done) {

		request(conf.url)
			.post(baseurl + 'svccfg/setprop')
			.send({	svc: "utmp",
							prop: "tm_man_utmpd1M/title",
							val: "altered"
			})
			.auth('viewer', 'plainpass')
			.expect('Content-Type', 'application/json')
			.expect({ code: "NotAuthorized",
								message: "insufficient authorizations"
			})
			.expect(403, done)

		});
});


describe('Try to set a property in a blacklisted service', function() {

	it('should return an error message', function(done) {

		request(conf.url)
			.post(baseurl + 'svccfg/setprop')
			.send({	svc: "fmd",
							prop: "tm_man_fmd1M/section",
							val: "1M"
			})
			.auth('viewer', 'plainpass')
			.expect('Content-Type', 'application/json')
			.expect({ code: "NotAuthorized",
								message: "service blocked by ACL: svc:/system/fmd:default"
			})
			.expect(403, done)

		});
});


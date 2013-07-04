//
// Tests on archiving and exporting manifests and repositories
//
var exec = require('child_process').exec,
		should = require('should'),
		request = require('supertest'),
		conf = require('./config.js')(),
		child;

// Some of these can take a while on slow machines, so we muck about
// with the test timeouts


describe('Export SSH manifest', function() {

	it('should return an XML stream', function(done) {

		request(conf.url)
			.get('/smf/@/svccfg/export?svc=ssh')
			.auth('viewer', 'plainpass')
			.expect('Content-Type', 'application/xml')
			.expect(200, done)

		});

});


describe('Run SMF extract command', function() {
	this.timeout(10000);

	it('should return an XML stream', function(done) {

		request(conf.url)
			.get('/smf/@/svccfg/extract')
			.auth('viewer', 'plainpass')
			.expect('Content-Type', 'application/xml')
			.expect(200, done)

		});

});


describe('Run SMF archive command', function() {
	//
	// This isn't supported on Solaris 11.
	//
	child = exec('/usr/sbin/svccfg help 2>&1 | grep archive',
			function(err, stdout, stderr) {

		if (err) {

			describe('System does not have "svccfg archive"', function() {

				it('should return an error', function(done) {
					this.timeout(10000);

					request(conf.url)
						.get('/smf/@/svccfg/archive')
						.auth('archiver', 'plainpass')
						.expect('Content-Type', 'application/json')
						.expect({	"code": "ResourceNotFound", "message":
										"Unknown or incorrectly formed command: archive"
						})
						.expect(404, done)
				});

			});
			
		}
		else {

			describe('System has "svccfg archive"', function() {

				it('should return an XML stream', function(done) {
					this.timeout(10000);

					request(conf.url)
						.get('/smf/@/svccfg/archive')
						.auth('archiver', 'plainpass')
						.expect('Content-Type', 'application/xml')
						.expect(200, done)

				});

			});

		}
		
	});

});

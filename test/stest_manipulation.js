//
// These tests import, manipulate, and finally delete a dummy test
// service called 'stest'. There's a lot of repetition here, but I'm not
// worried about it.
//
var exec = require('child_process').exec,
		should = require('should'),
		request = require('supertest'),
		common = require('./common.js'),
		conf = require('./config.js')(),
		child;

describe('stest service manipulation', function() {

	var test_svc = 'stest';

	before(function(done) {

		// Stop the stest service and delete it. Just discard stdout

		child = exec('/usr/sbin/svcadm disable ' + conf.test_svc +
									'; /usr/sbin/svccfg delete ' + conf.test_svc,
				function(err, stdout, stderr) {
			done();
		});
		
	});


	describe('No existing service', function(done) {

		it('ensures the test service does not exist', function(done) {

			request(conf.url)
				.get('/smf/@/svcs?svc=' + test_svc)
				.auth('manager', 'plainpass')
				.expect(404, done)
			});

	});


	describe('Import the test manifest', function(done) {

		console.log(conf.manifest);

		it('should return 200', function(done) {
			request(conf.url)
				.post('/smf/@/svccfg/import')
				.attach('manifest', conf.test_manifest)
				.auth('tamperer', 'plainpass')
				.expect('Content-Type', 'application/json')
				.expect({"msg": "command complete"})
				.expect(200, done)
		});

		after(function(done) {

			request(conf.url)
				.get('/smf/@/svcs?svc=' + test_svc)
				.auth('manager', 'plainpass')
				.expect(200, done)
		});

	});

	// These are repeated in the kick tests, but I'll leave them here so
	// they can be run independently.

	describe('Disable a service', function(done) {

		before(function(done) {

			request(conf.url)
				.get('/smf/@/svcs?svc=' + test_svc)
				.auth('manager', 'plainpass')
				.expect(200)
				.end(function(err, res) {
					res.body[0].state.should.equal('online');
					done();
				})

		});

		it('disables the service', function(done) {
			request(conf.url)
				.post('/smf/@/svcadm/disable')
				.send({ svc: test_svc })
				.auth('manager', 'plainpass')
				.expect('Content-Type', 'application/json')
				.expect({"msg": "command complete"})
				.expect(200, done)
		});

		after(function(done) {

			request(conf.url)
				.get('/smf/@/svcs?svc=' + test_svc)
				.auth('manager', 'plainpass')
				.expect(200)
				.end(function(err, res) {
					res.body[0].state.should.equal('disabled');
					common.time_in_state(res.body[0].stime).should.be.below(10);
					done();
				})

		})

	});

	describe('enable a service', function(done) {

		before(function(done) {

			// Disable the service so we can re-enable it

			request(conf.url)
				.get('/smf/@/svcs?svc=' + test_svc)
				.auth('manager', 'plainpass')
				.expect(200)
				.end(function(err, res) {
					res.body[0].state.should.equal('disabled');
					done();
				})

		});

		it('enables the service', function(done) {
			request(conf.url)
				.post('/smf/@/svcadm/enable')
				.send({ svc: test_svc })
				.auth('manager', 'plainpass')
				.expect('Content-Type', 'application/json')
				.expect({"msg": "command complete"})
				.expect(200, done)
		});

		after(function(done) {

			request(conf.url)
				.get('/smf/@/svcs?svc=' + test_svc)
				.auth('manager', 'plainpass')
				.expect(200)
				.end(function(err, res) {
					res.body[0].state.should.equal('online');
					common.time_in_state(res.body[0].stime).should.be.below(10);
					done();
				})

		})

	});


	describe('put the service into maintenence mode', function(done) {

		before(function(done) {

			request(conf.url)
				.get('/smf/@/svcs?svc=' + test_svc)
				.auth('manager', 'plainpass')
				.expect(200)
				.end(function(err, res) {
					res.body[0].state.should.equal('online');
					done();
				})

		});

		it('marks the service', function(done) {
			request(conf.url)
				.post('/smf/@/svcadm/mark')
				.send({ svc: test_svc,
								state: "maintenance"
				})
				.auth('manager', 'plainpass')
				.expect('Content-Type', 'application/json')
				.expect({"msg": "command complete"})
				.expect(200, done)
		});

		after(function(done) {

			request(conf.url)
				.get('/smf/@/svcs?svc=' + test_svc)
				.auth('manager', 'plainpass')
				.expect(200)
				.end(function(err, res) {
					res.body[0].state.should.equal('maintenance');
					common.time_in_state(res.body[0].stime).should.be.below(10);
					done();
				})

		})

	});


	describe('clear a service in maintenence', function(done) {

		before(function(done) {

			request(conf.url)
				.get('/smf/@/svcs?svc=' + test_svc)
				.auth('manager', 'plainpass')
				.expect(200)
				.end(function(err, res) {
					res.body[0].state.should.equal('maintenance');
					done();
				})

		});

		it('clears the service', function(done) {
			request(conf.url)
				.post('/smf/@/svcadm/clear')
				.send({ svc: test_svc})
				.auth('manager', 'plainpass')
				.expect('Content-Type', 'application/json')
				.expect({"msg": "command complete"})
				.expect(200, done)
		});

		after(function(done) {

			request(conf.url)
				.get('/smf/@/svcs?svc=' + test_svc)
				.auth('manager', 'plainpass')
				.expect(200)
				.end(function(err, res) {
					res.body[0].state.should.equal('online');
					common.time_in_state(res.body[0].stime).should.be.below(10);
					done();
				})

		})

	});

	// Kick tests
	//
	describe('kick a disabled service ', function(done) {

		before(function(done) {

			it('disables the service', function(done) {
				request(conf.url)
					.post('/smf/@/svcadm/disable')
					.send({ svc: test_svc })
					.auth('manager', 'plainpass')
					.expect('Content-Type', 'application/json')
					.expect({"msg": "command complete"})
					.expect(200, done)
			});

			it('makes sure the service is down', function(done) {
				request(conf.url)
					.get('/smf/@/svcs?svc=' + test_svc)
					.auth('manager', 'plainpass')
					.expect(200)
					.end(function(err, res) {
						res.body[0].state.should.equal('disabled');
						done();
					})
			});

			done();
		});

		it('kicks the service', function(done) {
			request(conf.url)
				.post('/smf/@/kick')
				.send({ svc: test_svc })
				.auth('manager', 'plainpass')
				.expect('Content-Type', 'application/json')
				.expect({"msg": "command complete"})
				.expect(200, done)
		});

		after(function(done) {

			request(conf.url)
				.get('/smf/@/svcs?svc=' + test_svc)
				.auth('manager', 'plainpass')
				.expect(200)
				.end(function(err, res) {
					res.body[0].state.should.equal('online');
					done();
				})

		})

	});

	describe('kick a service in maintenance', function(done) {

		before(function(done) {

			it('puts the service in maintenance', function(done) {
				request(conf.url)
					.post('/smf/@/svcadm/mark')
					.send({ svc: test_svc,
									state: "maintenance"
					})
					.auth('manager', 'plainpass')
					.expect('Content-Type', 'application/json')
					.expect({"msg": "command complete"})
					.expect(200, done)
			});

			it('makes sure the service is in maintenance', function(done) {
				request(conf.url)
					.get('/smf/@/svcs?svc=' + test_svc)
					.auth('manager', 'plainpass')
					.expect(200)
					.end(function(err, res) {
						res.body[0].state.should.equal('maintenance');
						done();
					})
			});

			done();
		});

		it('kicks the service', function(done) {
			request(conf.url)
				.post('/smf/@/kick')
				.send({ svc: test_svc })
				.auth('manager', 'plainpass')
				.expect('Content-Type', 'application/json')
				.expect({"msg": "command complete"})
				.expect(200, done)
		});

		after(function(done) {

			request(conf.url)
				.get('/smf/@/svcs?svc=' + test_svc)
				.auth('manager', 'plainpass')
				.expect(200)
				.end(function(err, res) {
					res.body[0].state.should.equal('online');
					done();
				})

		})

	});

	describe('Kick an online service', function(done) {

		before(function(done) {

			it('Puts the service online', function(done) {
				request(conf.url)
					.post('/smf/@/svcadm/enable')
					.send({svc: test_svc })
					.auth('manager', 'plainpass')
					.expect('Content-Type', 'application/json')
					.expect({"msg": "command complete"})
					.expect(200, done)
			});

			it('Makes sure the service is online', function(done) {
				request(conf.url)
					.get('/smf/@/svcs?svc=' + test_svc)
					.auth('manager', 'plainpass')
					.expect(200)
					.end(function(err, res) {
						res.body[0].state.should.equal('online');
						done();
					})
			});

			done();
		});

		it('Kicks the service', function(done) {
			request(conf.url)
				.post('/smf/@/kick')
				.send({ svc: test_svc })
				.auth('manager', 'plainpass')
				.expect('Content-Type', 'application/json')
				.expect({"msg": "command complete"})
				.expect(200, done)
		});

		after(function(done) {

			request(conf.url)
				.get('/smf/@/svcs?svc=' + test_svc)
				.auth('manager', 'plainpass')
				.expect(200)
				.end(function(err, res) {
					res.body[0].state.should.equal('online');
					done();
				})

		})

	});

	describe('Restart an online service', function(done) {

		before(function(done) {

			it('Puts the service online', function(done) {
				request(conf.url)
					.post('/smf/@/svcadm/enable')
					.send({svc: test_svc })
					.auth('manager', 'plainpass')
					.expect('Content-Type', 'application/json')
					.expect({"msg": "command complete"})
					.expect(200, done)
			});

			it('Makes sure the service is online', function(done) {
				request(conf.url)
					.get('/smf/@/svcs?svc=' + test_svc)
					.auth('manager', 'plainpass')
					.expect(200)
					.end(function(err, res) {
						res.body[0].state.should.equal('online');
						done();
					})
			});

			done();
		});

		it('Restarts the service', function(done) {
			request(conf.url)
				.post('/smf/@/svcadm/restart')
				.send({ svc: test_svc })
				.auth('manager', 'plainpass')
				.expect('Content-Type', 'application/json')
				.expect({"msg": "command complete"})
				.expect(200, done)
		});

		after(function(done) {

			request(conf.url)
				.get('/smf/@/svcs?svc=' + test_svc)
				.auth('manager', 'plainpass')
				.expect(200)
				.end(function(err, res) {
					res.body[0].state.should.equal('online');
					common.time_in_state(res.body[0].stime).should.be.below(10);
					done();
				})

		})

	});


	describe('Change service properties', function(done) {

		describe('Change an existing property', function(done) {

			it('Gets the current property state', function(done) {
				request(conf.url)
					.get('/smf/@/svcprop?svc=' + test_svc + '&prop=test_params/p01')
					.auth('tamperer', 'plainpass')
					.expect({	test_params: { p01: "one" } })
					.expect(200, done)
			});

			it('Sets a new value', function(done) {
				request(conf.url)
					.post('/smf/@/svccfg/setprop')
					.send({	svc: test_svc,
									prop: "test_params/p01",
									val: "altered"
					})
					.auth('tamperer', 'plainpass')
					.expect('Content-Type', 'application/json')
					.expect({"msg": "command complete"})
					.expect(200, done)
			});

			it('Refreshes the service', function(done) {
				request(conf.url)
					.post('/smf/@/svcadm/refresh')
					.send({	svc: test_svc })
					.auth('tamperer', 'plainpass')
					.expect('Content-Type', 'application/json')
					.expect({"msg": "command complete"})
					.expect(200, done)
			});

			it('Ensures the value was changed', function(done) {
				request(conf.url)
					.get('/smf/@/svcprop?svc=' + test_svc + '&prop=test_params/p01')
					.auth('tamperer', 'plainpass')
					.expect({	test_params: { p01: "altered" } })
					.expect(200, done)
			});

		});


		describe('Add a new property', function(done) {

			it('Sets a new property', function(done) {
				request(conf.url)
					.post('/smf/@/svccfg/setprop')
					.send({	svc: test_svc,
									prop: "test_params/p04",
									type: "astring",
									val: "four"
					})
					.auth('tamperer', 'plainpass')
					.expect('Content-Type', 'application/json')
					.expect({"msg": "command complete"})
					.expect(200, done)
			});

			it('Refreshes the service', function(done) {
				request(conf.url)
					.post('/smf/@/svcadm/refresh')
					.send({	svc: test_svc })
					.auth('tamperer', 'plainpass')
					.expect('Content-Type', 'application/json')
					.expect({"msg": "command complete"})
					.expect(200, done)
			});

			it('Ensures the property was set', function(done) {
				request(conf.url)
					.get('/smf/@/svcprop?svc=' + test_svc + '&prop=test_params/p04')
					.auth('tamperer', 'plainpass')
					.expect({	test_params: {
											p04: "four"
									}
					})
					.expect(200, done)
			});

		});


		describe('Delete an existing property', function(done) {

			it('Gets the current property state', function(done) {
				request(conf.url)
					.get('/smf/@/svcprop?svc=' + test_svc + '&prop=test_params/p02')
					.auth('tamperer', 'plainpass')
					.expect({	test_params: { p02: "two" } })
					.expect(200, done)
			});

			it('Deletes the property', function(done) {
				request(conf.url)
					.post('/smf/@/svccfg/delprop')
					.send({	svc: test_svc, prop: "test_params/p02" })
					.auth('tamperer', 'plainpass')
					.expect('Content-Type', 'application/json')
					.expect({"msg": "command complete"})
					.expect(200, done)
			});

			it('Refreshes the service', function(done) {
				request(conf.url)
					.post('/smf/@/svcadm/refresh')
					.send({	svc: test_svc })
					.auth('tamperer', 'plainpass')
					.expect('Content-Type', 'application/json')
					.expect({"msg": "command complete"})
					.expect(200, done)
			});

			it('Ensures the property does not exist', function(done) {
				request(conf.url)
					.get('/smf/@/svcprop?svc=' + test_svc + '&prop=test_params/p02')
					.auth('tamperer', 'plainpass')
					.expect({})
					.expect(200, done)
			});

		});
	});

	describe('Delete a service', function(done) {

		before(function(done) {

			it('Disables the service', function(done) {
				request(conf.url)
					.post('/smf/@/svcadm/disable')
					.send({ svc: test_svc })
					.auth('manager', 'plainpass')
					.expect('Content-Type', 'application/json')
					.expect({"msg": "command complete"})
					.expect(200, done)
			});

			it('Checks the service is down', function(done) {
				request(conf.url)
					.get('/smf/@/svcs?svc=' + test_svc)
					.auth('manager', 'plainpass')
					.expect(200)
					.end(function(err, res) {
						res.body[0].state.should.equal('disabled');
						done();
					})

			});

			done();
		});

		it('Deletes the service', function(done) {
			request(conf.url)
				.post('/smf/@/svccfg/delete')
				.send({ svc: test_svc })
				.auth('tamperer', 'plainpass')
				.expect('Content-Type', 'application/json')
				.expect({"msg": "command complete"})
				.expect(200, done)
		});

	});

});


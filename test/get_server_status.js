var should = require('should'),
		request = require('supertest'),
		conf = require('./config.js')();

describe('Status', function() {

	it('should return a valid status object', function(done) {

		request(conf.url)
			.get('/smf/status')
			.auth('manager', 'plainpass')
			.expect('Content-Type', 'application/json')
			.expect(200)
			.end(function(err, res) {
				res.body.should.have.property('sexymf');
				res.body.sexymf.should.have.property('version');
				res.body.should.have.property('node');
				res.body.should.have.property('host');
				res.body.host.should.have.property('hostname');
				done();
			});

		});


});

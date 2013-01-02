#!/bin/env node

LISTEN_PORT = 9206;

var restify = require('restify'),
	exec = require('child_process').exec,
    child;

var app = restify.createServer({
	name: "SexyMF"
});

process.title = 'sexymf';
app.pre(restify.pre.userAgentConnection());

app.get('/svcs/:mode', function(req, res) {

	// This will give you services in any state passed as the final portion
	// of the URI. Pass "list" to get everything.

	var svcs,
		i,
		json = [],
		jsvc;

	// Get a list of all services

	child = exec('svcs -a', function(err, stdout, stderr) {
		svcs = stdout.split('\n');

		// first line [0] is the header, so start at [1]
	
		for (i = 1; i < svcs.length; i++) {
			jsvc = smf_to_json(svcs[i]);

			if (jsvc && (req.params.mode === 'list' || req.params.mode ===
						 jsvc.state)) {
				json.push(jsvc);
			}

		}

		// Now nicely stringify and send it

		res.send(json);
	});

});

app.get('/svc/:service', function(req, res) {
	//
	// Report on a service. Use the query string to get a property
	//
		child = exec('svcs -H ' + req.params.service,
					 function(err, stdout, stderr) {
			json = JSON.stringify(smf_to_json(stdout), null, ' ');
			res.setHeader('Content-Type', 'text/plain');
			res.setHeader('Content-Length', json.length);
			res.end(json);
		});

});


function smf_to_json(line) {
	// Take a row of svcs(1) output and return a JSON object
	
	var arr;

	arr = line.trim().split(/\s+/g);

	return (arr.length === 3)
		? { fmri: arr[2], state: arr[0], stime: arr[1] }
		: false;
}



app.listen(LISTEN_PORT);



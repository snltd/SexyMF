Test harness for SexyMF. Not complicated, not sophisticated, just makes sure
it does what it's supposed to. It's only really written for me, so I haven't
gone out of my way to make it work in your environment.

Tests are little chunks of shell that define some variables used to build up
a `curl` command and examine its output. The variables you can use are:

 * `URI` - the API path. Starts with `/smf/`
 * `USER` - username:password pair, passed to `curl` with `-u`
 * `FLAGS` - extra options to pass in to `curl`
 * `HEADER` - the HTTP return code you expect
 * `L_COUNT` - the number of lines of JSON you expect back
 * `L_COUNT_P` - the number of lines of plain text you expect back
 * `MATCH` - a string you expect to be in the JSON/plain text output

Requires `curl`, and Node's `json`.

It also requires you have the right users set up with the right
authorizations, and that your SexyMF user has the privileges to run all
operations.

Some of the non-destructive tests query the SSH service, but most tests
operate on a dummy `stest` service. The manifest is in the `manifest`
directory, and it has to be in your repository.

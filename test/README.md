This directory contains BDD tests for SexyMF. To run them you will
require the `mocha`, `supertest`, and `should` Node modules. You also
need a correctly configured system, which means SexyMF running as a user
with the ability to make any changes to any service.

The tests can be run in a different zone, or even on a different system,
to the SexyMF daemon they are testing. By default, however, the tests
assume a daemon on the local host, listening on HTTPS. To change these
settings, look at `config.js`.

To run the tests, ensure a SexyMF daemon is listening, and using the
configuration in the `test/config` directory:

    $ ./sexymf.js -c test/config/config.json

and run 

    $ mocha

from the top-level `SexyMF` directory. Watch nyan cat!

At the moment there are no tests for operations run in NGZs by a SexyMF
daemon. These existed in the old test harness, so that mode has been
tested, but I haven't ported them to Mocha yet.

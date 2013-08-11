This directory contains BDD tests for SexyMF. To run them you will
require the `mocha`, `supertest`, and `should` Node modules. You also
need a correctly configured system, which means SexyMF running as a user
with the ability to make any changes to any service.

To run the tests, ensure a SexyMF daemon is listening, and using the
configuration in the `test/config` directory:

    $ ./sexymf.js -c test/config/config.json

and run 

    $ mocha

from the top-level `SexyMF` directory. Watch nyan cat!


The tests can be run in a different zone, or even on a different system,
to the SexyMF daemon they are testing. By default, however, the tests
assume a daemon on the local host, listening on HTTPS. To change these
settings, edit `config.js`, or use environment variables. You can set
the path to the daemon with `SERVER_URI`, and the zone on which to run
the tests with `TARGET_ZONE`. For instance

    $ env SERVER_URI="https://tap:9206" mocha

On a very slow or heavily loaded system, tests can fail supuriously.
They might time out or, more commonly, SMF state changes take longer
than the test suite expects, so you may see a service in `offline*`
state rather than `offline`. 

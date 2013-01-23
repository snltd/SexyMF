# Query a service with multiple instances, without specifying the instance
# we're interested in. This test works on OmniOS and 11/11. Not sure about
# S10 OTOH.

URI="/smf/@/svcprop?svc=identity"
A_USER="viewer:plainpass"
HEADER=409
MATCH="Ambiguous service"

# Get all properties for the SSH service. The call to bc works out how many
# lines of JSON we should expect.

_svc=ssh

URI="/smf/${ZONE}/svcprop?svc=$_svc"
A_USER="viewer:plainpass"
HEADER=200
L_COUNT="$(print $(zlogin $ZONE svcprop $_svc | cut -f1 -d/ | sort -u \
	| wc -l) \* 2 + \ $(zlogin $ZONE svcprop $_svc | wc -l) + 2 | bc)"
MIMETYPE="application/json"

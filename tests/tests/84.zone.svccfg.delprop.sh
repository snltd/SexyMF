# Delete a property

PRE_CMD="zlogin $ZONE svcadm refresh stest; zlogin $ZONE svcprop stest | \
	egrep -s 'test_params/p04 astring four'"
URI="/smf/${ZONE}/svccfg/delprop"
DATA="svc=stest&prop=test_params/p04"
A_USER="tamperer:plainpass"
HEADER=200
MATCH="Command complete"
MIMETYPE="application/json"
POST_CMD="zlogin $ZONE svcadm refresh stest; zlogin $ZONE svcprop stest \
	| grep -c test_params | egrep -s 3"

# Set a string property

POST_CMD="zlogin $ZONE svcprop stest | egrep -s 'test_params/p01 astring one'"
URI="/smf/${ZONE}/svccfg/setprop"
DATA="svc=stest&prop=test_params/p01&val=crabstick"
A_USER="tamperer:plainpass"
HEADER=200
MATCH="Command complete"
MIMETYPE="application/json"
POST_CMD="zlogin $ZONE svcadm refresh stest; zlogin $ZONE svcprop stest | \
	egrep -s 'test_params/p01 astring crabstick'"

# Set a string property

POST_CMD="svcprop stest | egrep -s 'test_params/p01 astring one'"
URI="/smf/@/svccfg/setprop"
DATA="svc=stest&prop=test_params/p01&val=crabstick"
A_USER="tamperer:plainpass"
HEADER=200
MATCH="Command complete"
MIMETYPE="application/json"
POST_CMD="svcadm refresh stest; svcprop stest | \
	egrep -s 'test_params/p01 astring crabstick'"

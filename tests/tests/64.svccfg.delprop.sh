# Delete a property

PRE_CMD="svcadm refresh stest; svcprop stest | \
	egrep -s 'test_params/p04 astring four'"
URI="/smf/@/svccfg/delprop"
DATA="svc=stest&prop=test_params/p04"
A_USER="tamperer:plainpass"
HEADER=200
MATCH="Command complete"
MIMETYPE="application/json"
POST_CMD="svcadm refresh stest; svcprop stest | grep -c test_params \
	| egrep -s 3"

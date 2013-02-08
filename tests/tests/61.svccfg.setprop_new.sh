# Set a string property

PRE_CMD="test $(svcprop stest | grep -c test_params) -eq 3"
URI="/smf/@/svccfg/setprop"
DATA="svc=stest&prop=test_params/p04&type=astring&val=four"
A_USER="tamperer:plainpass"
HEADER=200
MATCH="Command complete"
MIMETYPE="application/json"
POST_CMD="svcadm refresh stest; svcprop stest | \
	egrep -s 'test_params/p04 astring four'"

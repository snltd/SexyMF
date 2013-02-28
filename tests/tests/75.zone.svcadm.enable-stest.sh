# Enable the stest service. If it isn't running, the test will fail.

PRE_CMD='zlogin $ZONE svcs stest | egrep -s disabled'
URI="/smf/${ZONE}/svcadm/enable"
DATA="svc=stest"
A_USER="manager:plainpass"
HEADER=200
MATCH="Command complete"
MIMETYPE="application/json"
POST_CMD='zlogin $ZONE svcs stest | egrep -s online'

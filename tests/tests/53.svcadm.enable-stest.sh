# Enable the stest service. If it isn't running, the test will fail.

SET_UP='svcadm disable stest'
PRE_CMD='svcs stest | egrep -s disabled'
URI="/smf/@/svcadm/enable"
DATA="svc=stest"
A_USER="manager:plainpass"
HEADER=200
MATCH="Command complete"
MIMETYPE="application/json"
POST_CMD='svcs stest | egrep -s online'

# Disable stest

PRE_CMD='svcs stest | egrep -s online'
URI="/smf/@/svcadm/disable"
DATA="svc=stest"
A_USER="manager:plainpass"
HEADER=200
MATCH="Command complete"
MIMETYPE="application/json"
POST_CMD='svcs stest | egrep -s disabled'

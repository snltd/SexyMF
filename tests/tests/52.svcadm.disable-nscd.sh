# Disable nscd. If it isn't running, the test will fail.

URI="/smf/@/svcadm/disable"
DATA="svc=name-service-cache"
A_USER="manager:plainpass"
HEADER=200
MATCH="Command complete"
MIMETYPE="application/json"
PRE_CMD='svcs name-service-cache | egrep -s online'
POST_CMD='svcs name-service-cache | egrep -s disabled'

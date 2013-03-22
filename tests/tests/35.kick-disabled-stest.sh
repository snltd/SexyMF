# Enable the stest service by kicking it

SET_UP='svcadm disable stest'
URI="/smf/@/kick"
DATA="svc=stest"
A_USER="manager:plainpass"
HEADER=200
MATCH="Command complete"
MIMETYPE="application/json"
POST_CMD='svcs stest | egrep -s online'

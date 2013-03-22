# Restart the stest service by kicking it

SET_UP='svcadm enable stest; svcadm mark maintenance stest'
PRE_CMD='svcs stest | egrep -s maintenance'
URI="/smf/@/kick"
DATA="svc=stest"
A_USER="manager:plainpass"
HEADER=200
MATCH="Command complete"
MIMETYPE="application/json"
POST_CMD='sleep 1;svcs stest | egrep -s online'

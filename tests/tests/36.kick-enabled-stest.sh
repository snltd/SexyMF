# Restart the stest service by kicking it

SET_UP='svcadm enable stest'
URI="/smf/@/kick"
DATA="svc=stest"
A_USER="manager:plainpass"
HEADER=200
MATCH="Command complete"
MIMETYPE="application/json"
POST_CMD='d=$(date "+%H:%M"); svcs | tail -1 | egrep -s "${d#0}.*stest"'


# Restart the stest service by kicking it

SET_UP="zlogin $ZONE svcadm enable stest"
URI="/smf/${ZONE}/kick"
DATA="svc=stest"
A_USER="manager:plainpass"
HEADER=200
MATCH="Command complete"
MIMETYPE="application/json"
POST_CMD='zlogin $ZONE svcs | tail -1 | egrep -s stest'


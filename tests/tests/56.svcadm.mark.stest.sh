# Put stest in maintenance mode

PRE_CMD='svcs stest | egrep -s online'
URI="/smf/@/svcadm/mark"
DATA="svc=stest&state=maintenance"
A_USER="manager:plainpass"
HEADER=200
MATCH="Command complete"
MIMETYPE="application/json"
POST_CMD='sleep 1; svcs stest | egrep -s maintenance'

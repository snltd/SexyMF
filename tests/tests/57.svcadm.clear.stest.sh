# Put stest back online

PRE_CMD='svcadm mark maintenance stest'
URI="/smf/@/svcadm/clear"
DATA="svc=stest"
A_USER="manager:plainpass"
HEADER=200
MATCH="Command complete"
MIMETYPE="application/json"
POST_CMD='sleep 1; svcs stest | egrep -s online'

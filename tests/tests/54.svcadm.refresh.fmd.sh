# Refresh the FMD service. Has the same potential weaknesses as the restart
# test.

URI="/smf/@/svcadm/restart"
DATA="svc=fmd"
A_USER="manager:plainpass"
HEADER=200
MATCH="Command complete"
MIMETYPE="application/json"
PRE_CMD='svcs fmd | egrep -s online'
#POST_CMD='svcs | tail -1 | egrep -s "$(date +%H:%M).*fmd"'
POST_CMD='d=$(date "+%H:%M"); svcs | tail -1 | egrep -s "${d#0}.*fmd"'

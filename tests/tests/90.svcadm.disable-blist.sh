# Try to disable a blacklisted service

PRE_CMD='svcs ssh | egrep -s online'
URI="/smf/@/svcadm/disable"
DATA="svc=ssh"
A_USER="manager:plainpass"
HEADER=200
MATCH="Service cannot be manipulated"
MIMETYPE="application/json"
POST_CMD='svcs ssh | egrep -s online'

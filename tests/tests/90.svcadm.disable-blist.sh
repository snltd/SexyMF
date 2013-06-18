# Try to disable a blacklisted service

PRE_CMD='svcs ssh | egrep -s online'
URI="/smf/@/svcadm/disable"
DATA="svc=fmd"
A_USER="manager:plainpass"
HEADER=403
MATCH="service blocked by ACL: svc:/system/fmd:default"
MIMETYPE="application/json"
POST_CMD='svcs fmd | egrep -s online'

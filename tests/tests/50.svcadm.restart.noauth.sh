# Try to restart syslog as a user who can't

URI="/smf/@/svcadm/restart"
DATA="svc-system-log"
A_USER="viewer:plainpass"
HEADER=403
MATCH="insufficient authorization"
MIMETYPE="application/json"

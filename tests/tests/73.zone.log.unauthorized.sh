# Try to get a log file as a user without the 'logview' authorization

URI="/smf/${ZONE}/log?svc=ssh"
A_USER="viewer:plainpass"
HEADER=403
MATCH="insufficient authorization"
MIMETYPE="application/json"

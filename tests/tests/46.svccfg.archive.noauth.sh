# Run svccfg archive as a user without sufficient authorizations

URI="/smf/@/svccfg/archive"
A_USER="viewer:plainpass"
HEADER=403
MATCH="insufficient authorization"
MIMETYPE="application/json"

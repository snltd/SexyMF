# Run svccfg archive as a user without sufficient authorizations

SKIP_IF="test $(svccfg help 2>&1 | grep -c archive) -eq 0"
URI="/smf/@/svccfg/archive"
A_USER="viewer:plainpass"
HEADER=403
MATCH="insufficient authorization"
MIMETYPE="application/json"

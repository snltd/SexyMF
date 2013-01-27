# Run svccfg archive as a user without sufficient authorizations

SKIP_IF='[[ $(svccfg help 2>&1 | grep -c archive) == 0 ]]'
URI="/smf/@/svccfg/archive"
A_USER="viewer:plainpass"
HEADER=403
MATCH="insufficient authorization"
MIMETYPE="application/json"

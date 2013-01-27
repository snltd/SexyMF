# Run svccfg archive as a user who can do that

SKIP_IF='[[ $(svccfg help 2>&1 | grep -c archive) == 0 ]]'
URI="/smf/@/svccfg/archive"
A_USER="archiver:plainpass"
HEADER=200
DIFF_CMD="/usr/sbin/svccfg archive"
MIMETYPE="application/xml"

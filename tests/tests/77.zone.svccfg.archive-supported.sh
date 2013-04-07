# Run svccfg archive on a machine which supports that operation.

SKIP_IF="svccfg archive a 2>&1 | egrep -s Unknown"
URI="/smf/${ZONE}/svccfg/archive"
A_USER="archiver:plainpass"
HEADER=200
DIFF_CMD="zlogin $ZONE /usr/sbin/svccfg archive"
MIMETYPE="application/xml"

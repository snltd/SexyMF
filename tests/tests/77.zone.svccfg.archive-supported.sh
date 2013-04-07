# Run svccfg archive on a machine which supports that operation.

SKIP_IF="test $(svccfg help 2>&1 | grep -c archive) -eq 0"
URI="/smf/${ZONE}/svccfg/archive"
A_USER="archiver:plainpass"
HEADER=200
DIFF_CMD="zlogin $ZONE /usr/sbin/svccfg archive"
MIMETYPE="application/xml"

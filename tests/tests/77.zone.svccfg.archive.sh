# Run svccfg extract. Anyone can do this.

URI="/smf/${ZONE}/svccfg/archive"
A_USER="archiver:plainpass"
HEADER=200
DIFF_CMD="zlogin $ZONE /usr/sbin/svccfg archive"
MIMETYPE="application/xml"

# Run svccfg extract. Anyone can do this.

URI="/smf/${ZONE}/svccfg/extract"
A_USER="viewer:plainpass"
HEADER=200
DIFF_CMD="zlogin $ZONE /usr/sbin/svccfg extract"
MIMETYPE="application/xml"

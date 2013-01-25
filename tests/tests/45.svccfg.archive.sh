# Run svccfg archive as a user who can do that

URI="/smf/@/svccfg/archive"
A_USER="archiver:plainpass"
HEADER=200
DIFF_CMD="/usr/sbin/svccfg archive"
MIMETYPE="application/xml"

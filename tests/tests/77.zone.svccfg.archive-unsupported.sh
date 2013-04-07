# Run svccfg archive on a machine that doesn't support it. (S11)

SKIP_IF="svccfg archive a 2>&1 | egrep -s Syntax"
URI="/smf/${ZONE}/svccfg/archive"
A_USER="archiver:plainpass"
HEADER=404
MATCH="Unknown or incorrectly formed command: archive"
MIMETYPE="application/json"

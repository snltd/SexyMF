# Try to send a stupid command to svcccg

URI="/smf/${ZONE}/svccfg/nosuch"
A_USER="viewer:plainpass"
HEADER=404
MATCH="Unknown or incorrectly formed command: nosuch"
MIMETYPE="application/json"

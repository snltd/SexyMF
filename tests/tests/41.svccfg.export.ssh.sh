# Export the SSH service manifest

URI="/smf/@/svccfg/export?svc=ssh"
A_USER="viewer:plainpass"
HEADER=200
DIFF_CMD="/usr/sbin/svccfg export ssh"
MIMETYPE="application/xml"

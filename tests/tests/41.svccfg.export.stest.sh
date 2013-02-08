# Export the stest service manifest

URI="/smf/@/svccfg/export?svc=stest"
A_USER="viewer:plainpass"
HEADER=200
DIFF_CMD="/usr/sbin/svccfg export stest"
MIMETYPE="application/xml"

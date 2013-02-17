# List all services. In JSON we should get five times as many lines as we do
# from raw svcprop (3 properties { and }.)

URI="/smf/${ZONE}/svcs"
A_USER="viewer:plainpass"
HEADER=200
L_COUNT="$(print "5 * $(zlogin ${ZONE} svcs -Ha | wc -l ) + 2" | bc)"
MIMETYPE="application/json"

# Online services

URI="/smf/${ZONE}/svcs?state=online"
A_USER="viewer:plainpass"
HEADER=200
L_COUNT="$(print "5 * $(zlogin $ZONE svcs -Ha | grep -c ^online) + 2" | bc)"

MIMETYPE="application/json"

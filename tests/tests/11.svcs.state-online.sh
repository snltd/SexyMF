# Online services

URI="/smf/@/svcs?state=online" 
A_USER="viewer:plainpass"
HEADER=200
L_COUNT="$(print "5 * $(svcs -Ha | grep -c ^online) + 2" | bc)"

MIMETYPE="application/json"

# Get the state of the console-login service, which has multiple instances

_svc=console-login

URI="/smf/@/svcs?svc=$_svc"
A_USER="viewer:plainpass"
HEADER=200
L_COUNT=$(print 5 \* $(svcs -H $_svc | wc -l) + 2 | bc)

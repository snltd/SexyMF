# Get the start/exec property for the ssh service

_svc=ssh
_prop="start/exec"

URI="/smf/@/svcprop?svc=${_svc}&prop=$_prop" 
A_USER="viewer:plainpass"
HEADER=200
L_COUNT=5
MATCH=$(svcprop  -p $_prop $_svc | cut -d\\ -f1)

MIMETYPE="application/json"

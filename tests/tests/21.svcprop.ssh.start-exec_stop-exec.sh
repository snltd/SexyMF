# Test two properties from the SSH service

_svc=ssh
_prop="start/exec,stop/exec"

URI="/smf/@/svcprop?svc=${_svc}&prop=$_prop" 
A_USER="viewer:plainpass"
HEADER=200
L_COUNT=8
MATCH=":kill"

MIMETYPE="application/json"

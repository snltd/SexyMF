# Ask for a non-existent property from an existing service. Should send back
# an empty object

_svc=ssh
_prop="start/nosuch_property"

URI="/smf/@/svcprop?svc=${_svc}&prop=$_prop" 
A_USER="viewer:plainpass"
HEADER=200
MATCH="\{\}"

MIMETYPE="application/json"

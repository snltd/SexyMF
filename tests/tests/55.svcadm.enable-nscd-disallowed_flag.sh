# Pass a flag which svcadm understands, but we don't allow

URI="/smf/@/svcadm/enable"
DATA="svc=name-service-cache&flags=r"
A_USER="manager:plainpass"
HEADER=409
MATCH='"message":"flag not permitted: -r"'
MIMETYPE="application/json"

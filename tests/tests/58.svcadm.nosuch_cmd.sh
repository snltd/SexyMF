# Call svcadm with a nonsense command

URI="/smf/@/svcadm/nosuch"
DATA="svc=stest"
A_USER="manager:plainpass"
HEADER=409
MATCH="subcommand not permitted: nosuch"
MIMETYPE="application/json"

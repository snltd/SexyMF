# Put stest in maintenance mode

URI="/smf/@/svcadm/mark"
DATA="svc=stest&state=nosuch"
A_USER="manager:plainpass"
HEADER=404
MATCH="Unknown or incorrectly formed command"
MIMETYPE="application/json"

# Try to export a service which doesn't exist

URI="/smf/@/svccfg/export?svc=nosuch"
A_USER="viewer:plainpass"
HEADER=404
MATCH="Unknown service: nosuch"
MIMETYPE="application/json"

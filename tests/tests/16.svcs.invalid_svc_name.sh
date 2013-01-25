# Query a service with a name that isn't allowed. Should return a 409 error

URI='/smf/@/svcs?svc=no;\$(such)'
A_USER="viewer:plainpass"
HEADER=409
MATCH="Invalid value for service"
MIMETYPE="application/json"

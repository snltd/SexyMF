# Services in a state that isn't allowed. Should return an error

URI='/smf/@/svcprop?svc=ssh&prop=no;\$(such)'
A_USER="viewer:plainpass"
HEADER=409
MATCH="Invalid value for property"

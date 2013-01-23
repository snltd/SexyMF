# Try to get the state of a non-existent service

URI="/smf/@/svcs?svc=nosuch" 
A_USER="viewer:plainpass"
HEADER=404
MATCH="Unknown service"

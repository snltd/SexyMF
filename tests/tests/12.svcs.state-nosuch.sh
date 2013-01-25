# Services in a state that doesn't exist. Should return an empty object

URI="/smf/@/svcs?state=nosuch" 
A_USER="viewer:plainpass"
HEADER=200
MATCH='\[\]'
MIMETYPE="application/json"

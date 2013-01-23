# Services in a state that isn't allowed. Should return an error

URI='/smf/@/svcs?state=no;\$(such)'
A_USER="viewer:plainpass"
HEADER=409
MATCH="Invalid value for state"

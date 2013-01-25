# Ask for a number of lines that isn't even a number

URI="/smf/@/log?svc=ssh&lines=xyz"
A_USER="logviewer:plainpass"
HEADER=409
MATCH="Invalid value for number: xyz"
MIMETYPE="application/json"

# Get the last 5 lines of the SSH service log file and compare with what we
# know are the last 5

URI="/smf/@/log?svc=ssh&lines=5"
A_USER="logviewer:plainpass"
HEADER=200
DIFF_CMD="tail -5 /var/svc/log/network-ssh:default.log"
MIMETYPE="text/plain"

# Try to restart nscd as a user who can. The POST_CMD will fail if the
# minute ticks over at just the wrong time, but it's a small risk, and you
# can just run the test again, but it's a decent stab at seeing if a service
# was restarted

URI="/smf/@/svcadm/restart"
DATA="svc=fmd"
A_USER="manager:plainpass"
HEADER=200
MATCH="Command complete"
MIMETYPE="application/json"
PRE_CMD='svcs name-service-cache | egrep -s online'
POST_CMD='d=$(date "+%H:%M"); svcs | tail -1 | egrep -s "${d#0}.*fmd"'
# I know that's weird and ugly, but ksh isn't behaving on my OmniOS box.
# That's a workaround

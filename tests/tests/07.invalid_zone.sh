# A zone with a valid name, but which does not exist. You get a different
# error if you try this in an NGZ.

SKIP_IF='[[ $(zonename) != "global" ]]'
URI="/smf/nosuch/svcs"
A_USER="viewer:plainpass"
HEADER=404
MATCH="Unknown zone: nosuch"
MIMETYPE="application/json"

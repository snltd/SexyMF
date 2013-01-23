# Invalid zone name wth URI encoding. This gets caught by our middleware

URI="/smf/z%21ne/svcs"
A_USER="viewer:plainpass"
HEADER=409
MATCH="Invalid value for zone name"

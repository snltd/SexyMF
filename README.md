SexyMF
======

A web API to SunOS's Service Management Facility, written in Node.js.

This software will allow you to query and control SMF managed services
through an HTTP API.

It runs as a Node.js process, listening on port 9206 for requests,
which it passes on to SMF via calls to the normal userland commands like
svcs(1), svccfg(1M) and svcadm(1M). Responses are sent as JSON.

Where possible, the URIs used to access the API should mimic the SMF
commands with which the user is already familiar.

SexyMF should be compatible with any SunOS system running SMF. This includes
Sun Solaris 10, Oracle Solaris 11, and Illumos derivatives such as SmartOS
and OmniOS.

If you only want to query service properties, run the program as any
non-root user. If you wish to be able to stop, start, or modify properties,
you will need to use RBAC to grant the agent the necessary privileges.

If SexyMF is running in a global zone, it will be possible to operate on SMF
services in non-global zones (NGZs) provided the user has sufficient
privileges.

API
===

An HTTP server listens on port 9206. The root URI of the API is /smf,
followed by the zone you wish to query. 


Querying Service State
----------------------

This is usually done through the svcs(1) command. Though there are more
efficient ways to run svcs(1), imagine you are always running 'svcs -a' and
passing the output through grep. For example, to list online services:

 $ svcs -a 

 GET http://host:9206/smf/global/svcs HTTP/1.1

 $ svcs -a | grep ^online

 GET http://host:9206/smf/global/svcs?state=online HTTP/1.1

This returns an array of JSON objects, each containing 'fmri', 'state', and
'stime' fields, echoing the column headers in the output of svcs(1).

To list disabled services:

 $ svcs -a | grep ^disabled

 GET http://host:9206/smf/global/svcs?state=online HTTP/1.1

To list services in maintenance state

 $ svcs -a | grep ^maintenance

 GET http://host:9206/smf/global/svcs?state=maintenance HTTP/1.1

The final part of the URI is the state that will be returned, so should new
statuses appear in SMF, they will be automatically handled.

To get the status of a single service

 $ svcs -H system/system-log:default

 GET http://host:9206/smf/global/svcs?svc=system/system-log:default HTTP/1.1

The FMRI service name you pass through the API goes straight to svcprop(1).
No checking or parsing is done, so it's your responsiblity to use a correct,
unambiguous FMRI just as if you were using the standard CLI tools.

All services queried this way are returned as a JSON object of the following
form:

 {
    "fmri": "svc:/network/nis/domain:default",
    "state": "disabled",
    "stime": "Dec_27"
 }

Querying Service Properties
---------------------------

To get all of a service's properties

 $ svcprop svc:/system/system-log:default

 GET http://host:9206/smf/global/svcprop?svc=system/system-log:default HTTP/1.1

To get a single service property

 $ svcprop -p start/exec svc:/system/system-log:default

 GET http://host:9206/svcprop?svc=system/system-log:default&prop=start/exec HTTP/1.1

To get multiple service properties

 GET http://host:9206/svcprop?svc=system/system-log:default&prop=start/exec,stop/extec HTTP/1.1
 

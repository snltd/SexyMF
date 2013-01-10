SexyMF
======

A web API to SunOS's Service Management Facility, written in Node.js.

Introduction
------------

This software allows you to query and control SMF managed services through a
RESTful HTTP API.

It runs as a Node.js process, listening (by default on port 9206) for HTTP
requests, which it passes on to SMF via calls to the normal SMF userland
commands like `svcs(1)`, `svccfg(1M)` and `svcadm(1M)`. Responses are sent
as JSON.

Where possible, the URIs used to access the API try to mimic the SMF
commands with which the user should already be familiar.

If SexyMF is running in a host's global zone, and has sufficient operating
system privileges, it is possible to operate on SMF services in that host's
non-global zones (NGZs).

The SMF command-line tools are sophisticated, with many modes and options.
No attempt is made to provide a comprehensive web interface to them. This
software is written with cloud deployments in mind, where it will be
beneficial to be able to stop, restart and reconfigure running services on a
large number of hosts or zones in a simple way.

If you find the API does not expose a feature you wish that it did, either
fork the project and do it yourself, or raise an issue and I'll see what I
can do.


API
===

The root URI of the API is `/smf`, followed by the name of the zone you wish
to query, followed by the command you wish to access. Service names,
properties, flags and other values are passed as query string or form
variables, depending on the HTTP verb being used.

Service names are always passed as a `svc` variable, and property names as
`prop`.

A zone's name is what you would get from running `zoneadm(1m)` inside it.
Thus, a global zone will will be referred to as `global`. In an NGZ the zone
name will probably be the same as the hostname, but that can't be
guaranteed. (I've seen it. They know who they are.) 

You can use an `@` sign as a shorthand to always refer to the zone in which
SexyMF is running. (Hereafter referred to as "the local zone".)

In this interface, 'resources' are the SMF commands, rather than the
services on which they act. This may seem backwards, but we do it that way
because FMRIs and property names can contain slashes, which makes it
difficult to distinguish them from the API URI path. As it's possible to
refer to a service by many different parts of its FMRI, having the service
name as part of the URI would also lead to us having multiple paths to the
same resource, which is undesirable.  As such, we do not use the `PUT` or
`DELETE` verbs, which would suggest an attempt to remove an SMF tool, not a
service. All state modification is done by `POST`. You are, after all,
always updating a database. (The SMF repository.)

The FMRI service name you give to the API goes straight through to the
external commands. Input is sanity checked to screen out code injection and
plain nonsense, but it's your responsiblity to use a correct, unambiguous
FMRI just as if you were using the standard CLI tools. The same applies to
service states, property names and datatypes.


Querying Service State
----------------------

This is usually done through the `svcs(1)` command, so `svcs` is the first
part of the API call following the zone name. All these operations do not
change state on the server, so are accessed through the HTTP `GET` verb.

To list all installed services.

    $ svcs -a 
    GET http://host:9206/smf/@/svcs HTTP/1.1

Use of the `state` variable allows you to filter on service state. It's like
running `svcs -a` and passing the output through `grep`. 

    $ svcs -a | grep ^online
    GET http://host:9206/smf/@/svcs?state=online HTTP/1.1

This returns an array of JSON objects, each containing 'fmri', 'state', and
'stime' fields, echoing the column headers in the output of `svcs(1)`.

To list disabled services:

    $ svcs -a | grep ^disabled
    GET http://host:9206/smf/@/svcs?state=disabled HTTP/1.1

To list services in the maintenance state

    $ svcs -a | grep ^maintenance
    GET http://host:9206/smf/@/svcs?state=maintenance HTTP/1.1

The final part of the URI is the state that will be returned, so should new
statuses appear in SMF, they will be automatically handled. 

The above should always be valid requests, so any failure results in a 500
error. If you send a nonsense service state, the request will succeed, but
send back an empty object.

To get the status of a single service you still use the `svcs` path, but
specify the service FMRI using the `svc` variable.  For example:

    $ svcs -H system/system-log:default
    GET http://host:9206/smf/@/svcs?svc=system/system-log:default HTTP/1.1

If there are multiple instances of the service (for instance `console-login`
on systems with the virtual console driver), you will receive an array of
objects which describe each instance. 

Any other variables you may try to pass to the `svcs` command are ignored.

Sending an invalid service name results in a 404 error.

All services queried this way are returned as a JSON object of the following
form:

    {
     "fmri": "svc:/network/nis/domain:default",
     "state": "disabled",
     "stime": "Dec_27"
    }

Multiple services are an array of such objects.


Querying Service Properties
---------------------------

The CLI tool to query service properties is `svcprop`, so that is the final
part of the URI.  To get all of a service's properties

    $ svcprop svc:/system/system-log:default
    GET http://host:9206/smf/@/svcprop?svc=system/system-log:default HTTP/1.1

This discards the value datatype and returns the service properties as
hierarchical JSON object. Property groups are top-level objects, with
properties stored inside them as key/value pairs. This makes it easy for a
client application to parse tha properties.

    {
      property_group: {
	 	property_1: value,
	 	property_2: value,
      },
    }

If the service does not exist, a 404 error is sent.

To get a single service property

    $ svcprop -p start/exec svc:/system/system-log:default
    GET http://host:9206/smf/@/svcprop?svc=system/system-log:default&prop=start/exec HTTP/1.1

To get multiple service properties, pass them as a comma-separated list:

    GET http://host:9206/smf/@/svcprop?svc=system/system-log:default&prop=start/exec,stop/exec HTTP/1.1
 
Asking for a non-existent property will result in an empty object. Querying
a non-existent service is considered user error, so the API returns a 404.
Variables other than `svc` and `prop` are ignored.


Getting Log Files
-----------------

You can get the last 'n' lines of a service's log file by calling

    GET http://host:9206/smf/@/log?svc=system/ssh:default HTTP/1.1

If the log does not exist or cannot be read, an error is returned. By
default the last 100 lines of the file are sent to the client. This can be
changed by setting `loglines` in the configuration files, or by adding
`lines=n` to the URI. 

If a log file cannot be found, a 404 error is sent. The log is passed to the
client as a JSON object, in which the key is the path to the log file, and
the value is the log itself.

Managing Services
-----------------

This is normally done through the `svcadm(1m)` command, and requires
elevated operating system privileges. It changes server state, so is
accessed through the `POST` verb.

	 # svcadm restart system-log
     POST svc=system-log&cmd=restart http://host:9206/smf/@/svcadm HTTP/1.1

You can pass flags such as `-t` and `-s` by setting `flags=` to a list of
the flags you require. SexyMF does not check that the flags mean anything to
`svcadm(1m)`: it is the user's responsibility to send the right ones.
Sending invalid flags, an invalid service name, or an invalid command will
result in a 409 error and a JSON object which attempts to identify the bad
data.

Changing or Adding Service Properties
-------------------------------------

Service properties are changed with the `svcccg(1m)` command. This requires
elevated privileges (see below), and as changes system state, we do it as a
`POST` operation. Commands take the form:

	 # svccfg -s apache setprop start/project = astring: webproj
     POST svc=ssh&prop=start/project&type=astring&val=webproj http://host:9206/smf/@svccfg

If you are changing an existing property, the `type` variable is optional,
but if you are adding a new one, it is mandatory. This is how `svccfg`
behaves -- all the API is doing is feeding it parameters.

If the operation succeeds the user receives a 200 header and a JSON object
containing the string `command complete`.

Once a property is changed or added, you should issue a `svcadm refresh`
command to put the new value in the service's environment.

**
All the above is fully implemented and documented. Below is work in
progress. It probably doesn't even make sense.
**

Deleting Service Properties
---------------------------

Again, this is normally done by `svccfg(1m)`, but SexyMF does it with a
`DELETE` request.

    # svccfg -s network/ntp delprop start/project
    DELETE svc=apache&prop=start/project http://host:9206/smf/@svccfg


Operating System Configuration
==============================

Unless all you want to do is view the state and properties of services in
the local zone, SexyMF requires elevated privileges. (In fact, SMF can hide
properties with the `read_authorization` property type, and as a normal user,
SexyMF can't see those.) The allocation of these privileges can be done in many
ways, and is down to the sys-admin who installs the software.

The simplest way to make everything work is to run as the root user. Do this, and
you don't need to set up anything else. I wouldn't do it myself though.

Local Zone Privileges
---------------------

If you only want to query service properties in the local zone (i.e. the
zone SexyMF is running in), run the program as any non-root user. If you
wish to be able to stop, start, or modify properties, you will need to use
RBAC to grant the agent the necessary privileges.

```
svcprop: Could not connect to configuration repository: repository server
unavailable.
```


The discussion in this section refers to configuring SexyMF to operate on services
only belonging to the zone in which it runs. This may be a global or NGZ.

The best way to correctly grant SexyMF the privileges it needs to do the job you
want it to do is to read and understand the `smf_security(5)` manual page.

Chances are you will only want to use SexyMF to manage a small number of
services, and it may well be that you only want to restart or refresh those
services. You may, for instance, only wish to use it to be able to restart
Apache when a new vhost is deployed. If this is the case, grant the
relevant `solaris.smf.manage.` authorization to the user which SexyMF runs
as. For instance:

    # usermod -A solaris.smf.manage.apache smfuser

You can find a list of the authorizations in
`/etc/security/auth_attr.d/SUNWcs`, `/etc/security/auth_attr.d/core-os`, or
`/etc/security/auth_attr`, depending on your operating system, and you can
find out what authorization is needed to manage a service by querying the
service's `action_authorization` property. For example:

    $ svcprop -p general/action_authorization ssh
	solaris.smf.manage.ssh

If you want the SexyMF user to be able to restart _any_ service, you can do

    # usermod -A 'solaris.smf.manage.*' smfuser

or grant the user the `Service Operator` profile, which will also allow the
user to `enable` and `disable` services.

    # usermod -P 'Service Operator' smfuser

Or, if you trust the code and your users sufficiently to turn over complete
control of SMF to SexyMF

    # usermod -A 'solaris.smf.*' smfuser

This will grant _every_ SMF privilege to the user. It will be able to
enable, disable , restart and refresh services, and change properties via
`svccfg`. You can also do this, perhaps more succinctly, with the `Service
Management` profile:

    # usermod -A 'Service Management' smfuser

If you just want to be able to change properties, look at the service's
`value_authorization` property to find out which authorization to grant. If
a service doesn't have an `action_authorization` or `value_authorization`,
you can add it with a command of the form:

    # svccfg -s <fmri> setprop general/value_authorization = astring: \
	'solaris.smf.manage.fmri

where `fmri` is the service FMRI.


Managing Services in Other Zones
--------------------------------

If you are using Illumos, viewing services, logs, or properties in an NGZ
from the global zone only requires the `file_dac_read` privilege.


WHITELISTS AND BLACKLISTS
=========================

You can protect services and zones from being manipulated via the API using
blacklists and/or whitelists in the `config/user_config.json` file.
Currently you can only list entire zones, or services in all zones. This
will most !$likely become more granular in the .

Compatibility
-------------


SexyMF should be compatible with any SunOS system running SMF. This includes
Sun Solaris 10, Oracle Solaris 11, and Illumos derivatives such as SmartOS
and OmniOS. Some features dealing with non-global zones may be quicker to
appear for Illumos OSes, as they have a more complete interface to SMF,
making some things easier to implement. Currently, on Solaris 10 or 11, you
cannot query any zone other than the one you are in, but the final aim is to
provide the same level of service across all SunOS platforms.

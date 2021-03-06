# SexyMF

SexyMF is a RESTful API to the Service Management Facility found in
[Solaris](http://www.oracle.com/technetwork/articles/servers-storage-admin/adv-smf-admin-s11-1729196.html)
and
[Illumos](http://wiki.joyent.com/wiki/display/jpc2/Using+the+Service+Management+Facility).
It is written in Node.js.


## Introduction

This software allows you to query and control SMF managed services
through a RESTful HTTP API.

It runs as a Node.js process, listening (by default on port 9206) for
HTTP requests, which it passes on to SMF via calls to the normal
userland commands like
[`svcs(1)`](http://www.unix.com/man-page/OpenSolaris/1/svcs/),
[`svccfg(1M)`](http://www.unix.com/man-page/OpenSolaris/1/svccfg) and
[`svcadm(1M)`](http://www.unix.com/man-page/OpenSolaris/1/svcadm).
Responses are usually sent back to the client as JSON objects. When the
SMF commands naturally return XML, that XML is returned to the client
as-is.

As far as is possible, the URIs used to access the API try to mimic the
SMF commands with which the user should already be familiar.

If SexyMF is running in a host's global zone, and has sufficient operating
system privileges, it is possible to operate on services in that host's
non-global zones (NGZs).

The SMF command-line tools are sophisticated, with many modes and options.
No attempt is made to provide a comprehensive interface to them. This
software is written with cloud deployments in mind, where it will be
beneficial to be able to stop, restart and reconfigure running services
on a large number of hosts or zones in a simple way, and the API
reflects that.

If you find the API does not expose a feature you wish that it did,
either fork the project and do it yourself, or raise an issue and I'll
see what I can do.

It is called what it's called because it's SMF (clearly), and in early
2013, what's sexier than a RESTful web API on anything? And because I
like [Prince](http://en.wikipedia.org/wiki/Sexy_MF).


## Installation

You need a SunOS system with SMF. So, that's anything that says `SunOS
5.10` or `SunOS 5.11` when you run `uname -sr`. You also need Node.js
0.8 or later, and the `node` binary needs to be in the `PATH` of the
user as which you intend to run SexyMF.

If you are running Solaris 11 or an Illumos derivative such as
OmniOS or OpenIndiana, you can get node from [the official Node download
page](http://nodejs.org/download/). If you are running Solaris 10, [Peter
Tribble maintains an excellent
port](http://www.petertribble.co.uk/Solaris/node.html) which installs every
required file in a single SYSV package. 32- and 64-bit versions should both
be fine. If you are running SmartOS, `pkgin in node`, if your VM doesn't
alredy have it.

Once you have a suitable Node installation, a quick way to get up and
running is to clone the Github repository and ask `npm` to install the
required modules.

    $ git clone https://github.com/snltd/SexyMF.git
    $ cd SexyMF
    $ npm install --production

If you want to run the test suite, use

    $ npm install

instead, and `npm` will also satisfy the development dependencies.

There are a couple of potential snags: SexyMF is built on
[Restify](http://mcavage.github.com/node-restify), which incorporates
DTrace, which means compiling the Node DTrace module, which means GCC.
Sorry. Second, you may find that the Restify build fails with a `make` usage
error.  If that happens, it's using the Sun `make`, and it requires the GNU
version, so fiddle with your `PATH` until that's fixed.

## Invocation

To start the server, run `sexymf.js`. The following options are supported:

* `-d, --daemon`: run as a daemon. If this is not specified, SexyMF will run
  in the foreground, with information being written to standard out. With
  `-d`, the program will run silently, but will write logs.
* `-p, --port PORT_NUMBER`: specify the port number that the program should
  listen on. This can also be set via the `listen_port` value in the
  configuration file, but a value specified on the command line will take
  precedence. If you want to use a port below 1024, the SexyMF user must
  have the `net_privaddr` privilege.
* `-c, --config FILE`: specify the path to the configuration file SexyMF
  should use. By default it will use `config/config.json`, at the same level
  as the `sexymf.js` executable. If the configuration file cannot be found,
  the program notifies the user and exits 1.
* `-V, --version`: prints the version of SexyMF and exits 0.
* `-h, --help`: prints usage information and exits 0.


## API

The root URI of the API is `/smf`, followed by the name of the zone you wish
to query, followed by the command you wish to access. Service names,
properties, flags and other values are passed as query string or form
variables, depending on the HTTP verb being used. In
[Connect](http://www.senchalabs.org/connect/) terms:

    /smf/:zone/:command?variables

Service names are always passed as a `svc` variable, and property names as
`prop`.

A zone's name is what you would get from running `zoneadm(1m)` inside it.
Thus, a global zone will be referred to as `global`. In an NGZ the zone
name will probably be the same as the hostname, but that can't be
guaranteed. (I've seen it. They know who they are.)

You can use an `@` sign as a shorthand to always refer to the zone in which
SexyMF is running. (Hereafter referred to as "the local zone", even though
it may be the global zone. I hope that isn't confusing.)

In this interface, "resources" are the SMF commands, rather than the
services on which they act. This may seem backwards, but we do it that way
because FMRIs and property names can contain slashes, which makes it
difficult to distinguish them from the API URI path. As it's possible to
refer to a service by many different parts of its FMRI, having the service
name as part of the URI would also lead to us having multiple paths to the
same resource, which is undesirable.  As such, we do not use the `PUT` or
`DELETE` verbs, which would suggest an attempt to remove an SMF tool, not a
service. All state modification is done by `POST`. You are, after all,
always updating a database. (The SMF repository.) If this offends your
refined academic understanding of RESTfulness, go cry about it on
HackerNews, or fork the project and do it your way.

The FMRI service name you give to the API goes straight through to the
external commands. Input is sanity checked to screen out code injection and
plain nonsense, but it's your responsibility to use a correct, unambiguous
FMRI just as if you were using the standard CLI tools. The same applies to
service states, property names and datatypes.

### Partial Response

SexyMF has rudimentary support for partial response. Currently it allows
you to select unique fields that will be passed back to you when issuing
a `GET` request. This is done by specifying a comma-separated list of
the desired fields in the `fields` variable.

For instance, the default SexyMF `status` object has around forty
properties. If you only wanted to know the number of API calls the
server has handled, and the version of Node that is running it, you
would ask:

    GET /smf/status?fields=sexymf.api%20calls,node.node_versions.node" HTTP/1.1

and SexyMF would send back

```json
{
  "sexymf": {
    "api calls": 19
  },
  "node": {
    "node_versions": {
      "node": "0.10.15"
    }
  }
}

```

If you specify only non-existent fields, you will receive an empty
object and a 200 code.

Filtering on field values may be supported in the future.

### Querying Service State

This is usually done through the `svcs(1)` command, so `svcs` is the first
part of the API call following the zone name. All these operations do not
change state on the server, so are accessed through the HTTP `GET` verb.

To list all installed services.

    $ svcs -a
    GET /smf/@/svcs HTTP/1.1

Use of the `state` variable allows you to filter on service state. It's like
running `svcs -a` and passing the output through `grep`.

    $ svcs -a | grep ^online
    GET /smf/@/svcs?state=online HTTP/1.1

This returns an array of JSON objects, each containing 'fmri', 'state', and
'stime' fields, echoing the column headers in the output of `svcs(1)`.

To list disabled services:

    $ svcs -a | grep ^disabled
    GET /smf/@/svcs?state=disabled HTTP/1.1

To list services in the maintenance state

    $ svcs -a | grep ^maintenance
    GET /smf/@/svcs?state=maintenance HTTP/1.1

The final part of the URI is the state that will be returned, so should new
statuses appear in SMF, they will be automatically handled.

The above should always be valid requests, so any failure results in a 500
error. If you send a nonsense service state, the request will succeed, but
send back an empty object.

To get the status of a single service you still use the `svcs` path, but
specify the service FMRI using the `svc` variable.  For example:

    $ svcs -H system/system-log:default
    GET /smf/@/svcs?svc=system/system-log:default HTTP/1.1

If there are multiple instances of the service (for instance `console-login`
on systems with the virtual console driver), you will receive an array of
objects which describe each instance.

Any other variables you may try to pass to the `svcs` command are ignored.

Sending an invalid service name results in a 404 error.

All services queried this way are returned as a JSON object of the following
form:

```json

{
  "fmri": "svc:/network/nis/domain:default",
  "state": "disabled",
  "stime": "Dec_27"
}
```

Multiple services are an array of such objects.

You cannot currently pass any flags through to the `svcs` command.

If a zone is blocked via access lists (see below) you cannot query the
state of any services running in it. However, if a zone is not blocked,
you will always be able to view the state of all its services, even if
access to some or all of those services is denied.

### Querying Service Properties

The CLI tool to query service properties is `svcprop`, so that is also the
final part of the URI.  To get all of a service's properties

    $ svcprop svc:/system/system-log:default
    GET /smf/@/svcprop?svc=system/system-log:default HTTP/1.1

This discards the value datatype and returns the service properties as
hierarchical JSON object. Property groups are top-level objects, with
properties stored inside them as key/value pairs. This makes it easy for a
client application to parse the properties.

```
{
  property_group_1: {
    property_1: value,
    property_2: value
  },
  property_group_2: {
    ...
  }
}
```

If the service does not exist, a 404 error is sent. If you request a service
with multiple instances, but do not specify the instance, an "ambiguous
service" error is returned.

To get a single service property

    $ svcprop -p start/exec svc:/system/system-log:default
    GET /smf/@/svcprop?svc=system/system-log:default&prop=start/exec HTTP/1.1

To get multiple service properties, pass them as a comma-separated list:

    GET /smf/@/svcprop?svc=system/system-log:default&prop=start/exec,stop/exec HTTP/1.1

Asking for a non-existent property will result in an empty object. Querying
a non-existent service is considered user error, so the API returns a 404.
Variables other than `svc` and `prop` are ignored, and you cannot pass any
flags through to the command.

If a services is denied through a service ACL, you cannot query its
properties.


### Getting Log Files

You can get the last 'n' lines of a service's log file by calling

    GET /smf/@/log?svc=system/ssh:default HTTP/1.1

If the log does not exist or cannot be read, an error is returned. By
default the last 100 lines of the file are sent to the client. This can be
changed by setting `loglines` in the configuration files, or by adding
`lines=n` to the URI.

If a log file cannot be found, a 500 error is sent, as the code assumes
either it or Solaris has incorrectly supposed where the log file should be.
The supposed location of the file is sent to the user.

Logs are passed to the client as plain text. (`text/plain` mimetype.) I've
flip-flopped over this design decision, but as a user it makes more sense to
get a logfile as a logfile, rather than as a huge chunk of text as a value
in a JSON object.

To view logs, a user must have the `logview` authorization. If this is not
the case, requests will be refused with a 403 error.

### Importing a Service Manifest

You can upload raw XML service manifests to SexyMF, and it will import
them into the SMF repository.

    $ svccfg import manifest.xml
    POST file=@manifest.xml /smf/@/svccfg/import HTTP/1.1

If the file you upload is not a valid manifest, or it fails to import
for some other reason, you will get 409 error and the message `manifest
did not import`. Successfully importing a manifest returns `Command
complete`, and a 200 code.

SexyMF does no checks to see if it is overwriting an existing manifest,
and entirely trusts its input.

To import a manifest into an NGZ from the global zone, SexyMF copies the
uploaded file into the zone root, and runs `zlogin svccfg import` to
import it.  Directly manipulating the repository through `svccfg` does
not do the import, and manually importing the manifest after gives an
error of the form

    svccfg: Scope "localhost" changed unexpectedly (service "application/stest" added).
    svccfg: Could not refresh svc:/application/stest:default (deleted).


### Exporting a Service Manifest, Profile, or Archive

This is another `svccfg(1m)` job. It requires no elevated OS privileges, and
the `view` authorization.

    $ svccfg export network/ssh
    GET /smf/@/svccfg/export?svc=network/ssh HTTP/1.1

Specifying a non-existent service triggers a 404 error.

You can also extract the running SMF profile.

    $ svccfg extract
    GET /smf/@/svccfg/export?svc=network/ssh HTTP/1.1

On systems which support the `archive` command, you can use it to take an
XML archive of the running repository. This may be useful for backups.  It
requires the `archive` authorization.

    $ svccfg archive
    GET /smf/@/svccfg/archive HTTP/1.1

The information from all these commands is sent to the client as a
chunked stream of XML, encoding type `application/xml`. Although most
SexyMF output is JSON, manifests, profiles and archives have to be in
XML, so it seems sensible to transfer them that way.

Attempting to run `archive` on a host which does not support the command
(for instance Solaris 11) results in a 404 error.

### Managing Services

This is normally done through the `svcadm(1m)` command, and requires
elevated operating system privileges. It changes server state, so is
accessed through the `POST` verb. The command is the last part of the URI,
but for consistency with the `svcs` commands, the service name is still
passed in with the `svc` variable.

    # svcadm restart system-log
     POST svc=system-log /smf/@/svcadm/restart HTTP/1.1

You can pass flags such as `-t` and `-s` by setting `flags=` to a list of
the flags you require -- for instance `?flags=ts`. SexyMF has a look-up list
of allowable flags for each `svcadm` sub-command in the config file, and if
a user tries to set a flag which is not in the appropriate list, he will
receive an error.

The `mark` subcommand requires you pass a state with the `state` variable.
If you fail to do this, or specify a state `svcadm` does not understand, you
will get a 404 error and be told you have supplied an `Unknown or
incorrectly formed command`.

Sending an invalid service name or an invalid command will result in a 409
error and a JSON object which attempts to identify the bad data. A missing
command is a 404. Trying to manage a service which is blocked in a
service ACL is forbidden, hence a 403 header is sent.

If the SexyMF user doesn't have sufficient OS authorizations to run the
command, the user will get back a 500 error, with the standard error from
`svcadm` in the body.

#### Kicking Services

In response to [Illumos RFE #3596](https://www.illumos.org/issues/3596),
SexyMF allows you to "kick" a service. If the service is online, it will be
restarted; if it is disabled, it is enabled; if it is in maintenance mode,
it will be cleared. If the service is in any other state, SexyMF will not
know what to do, and return a 500 error.

    POST svc=system-log /smf/@/kick HTTP/1.1

Kick is a simple layer on top to the normal `svcadm` method. It therefore
requires the `manager` authorization and suitable OS privileges.

#### Deleting a Service

If a user has the `delete` authorization he can delete a service. Note
that this does not use the `DELETE` HTTP verb, for reasons discussed
earlier in this document.

    # svcccg delete myservice
    POST svc=myservice /smf/@/svccfg/delete HTTP/1.1

### Adding, Changing, or Deleting Service Properties

Service properties are changed with the `svcccg(1m)` command. This requires
elevated privileges (see below), and as changes system state, we do it as a
`POST` operation. As with `svcadm`, the sub-command is the final argument.
To change or Delete properties, a user requires the `alter` authorization.

To add or change a property, do something like:

    # svccfg -s apache setprop start/project = astring: webproj
     POST svc=apache&prop=start/project&type=astring&val=webproj /smf/@/svccfg/setprop HTTP/1.1

If you are changing an existing property, the `type` variable is optional,
but if you are adding a new one, it is mandatory. This is how `svccfg`
behaves -- all the API does is feed it parameters.

To delete a property

    # svccfg -s apache delprop start/project
    POST svc=apache&prop=start/project /smf/@/svccfg/delprop HTTP/1.1

If the operation succeeds the user receives a 200 header and a JSON object
of the form

```json
{
  "msg": "command complete"
}
```

Once a property is changed or added, you need to issue a `svcadm refresh`
command to put the new value in the service's environment. Again, this is in
line with standard SMF behaviour.

A missing or unsupported command results in a 404 error.

### Getting SexyMF Status

If you have `show_status` set to `true` in the config file, a request of the
form

    GET /smf/status HTTP/1.1

will return a JSON object containing information about SexyMF and its
environment.

#### Finding Out What `svccfg` Supports

`svccfg(1m)` supports different commands and subcommands across
different versions of SunOS. SexyMF will return a JSON-ified version of
the output of `svccfg help` if `show_status` is `true` and you issue a
request of the form

    GET /smf/supports/svccfg HTTP/1.1

You can use partial responses to get, for instance, a list of the
supported manifest commands to see whether `archive` will work.

    GET /smf/supports/svccfg?fields=Manifest%20commands HTTP/1.1


# Configuration and Security

SexyMF has many-layered security. You can have the application accept
connections only from certain IP addresses, assign different levels of SMF
access to different users and block or grant access to particular zones
and/or services. This, however, is all sticking plaster to the conscientious
admin, as the real security work configuring SexyMF is at the operating
system level. If you only grant it the privileges it needs, it will be
impossible to abuse even if the application's security is breached.


## Operating System Configuration

Unless all you want to do is view the state and properties of services in
the local zone, SexyMF requires elevated privileges. (In fact, SMF can hide
properties with the `read_authorization` property type, and as a normal
user, SexyMF can't see those.) The allocation of these privileges can be
done in many ways, and is down to the sys-admin who installs the software.

The simplest way to make everything work is to run as the root user. Do
this, and you don't need to set up anything else. You can control access to
everything, in all zones, via the SexyMF config files. I wouldn't do that
myself though, and I wrote it.

The best way to correctly grant SexyMF the privileges it needs to do the job
you want it to do is to read and understand the `smf_security(5)` manual
page, and develop a set of additional privileges suitable for your site.
Below are a few guidelines.

Chances are you will only want to use SexyMF to manage a small number of
services, and it may well be that you only want to restart or refresh those
services. You may, for instance, only wish to use it to be able to restart
an application server following a code release. If this is the case, grant
the relevant `solaris.smf.manage.` authorization to the user which SexyMF
runs as. That will be `smfuser`, in the following examples. For instance:

    # usermod -A solaris.smf.manage.apache smfuser

You can find a list of the authorizations in
`/etc/security/auth_attr.d/SUNWcs`, `/etc/security/auth_attr.d/core-os`, or
`/etc/security/auth_attr`, depending on your operating system, and on
relatively recent releases you can find out what authorization is needed to
manage a service by querying the service's `action_authorization` property.
For example:

    $ svcprop -p general/action_authorization ssh
    solaris.smf.manage.ssh

If you want the SexyMF user to be able to restart _any_ service, you can do

    # usermod -A 'solaris.smf.manage.*' smfuser

or grant the user the `Service Operator` profile, which will also allow the
user to `enable` and `disable` services.

    # usermod -P 'Service Operator' smfuser

If you trust the code and your users sufficiently to turn over complete
control of SMF to SexyMF, you could do

    # usermod -A 'solaris.smf.*' smfuser

This will grant _every_ SMF privilege to the user. It will be able to
enable, disable , restart and refresh services, and change properties via
`svccfg`. You can also do this, perhaps more succinctly, with the `Service
Management` profile:

    # usermod -P 'Service Management' smfuser

If you just want to be able to change properties, look at the service's
`value_authorization` property to find out which authorization to grant. If
a service doesn't have an `action_authorization` or `value_authorization`,
you can add it with a command of the form:

    # svccfg -s <fmri> setprop general/value_authorization = astring: \
    'solaris.smf.manage.fmri

where `fmri` is the service FMRI.

## Allowed Commands, Sub-Commands, and Flags

The config file contains a JSON object which describes allowable commands
sub-commands, and options. For example:

```json

"external_bins": {
  "/bin/ppriv": {},
  "/bin/zonename": {},
  "/bin/svcs": {},
  "/usr/sbin/svcadm": {
    "enable": {
      "flags": [ "-t" ]
    },
    "disable": {
      "flags": [ "-t", "-s" ]
    },
    "clear" : {}
  },
}
```

This means that SexyMF is free to execute `/bin/zonename`, but not
`/usr/sbin/svccfg`. A user may run `/usr/sbin/svcadm` to enable a
service, but not restart one. They may pass the `-t` or `-s` flags to
`svcadm disable`, whilst `svcadm enable` only accepts `-s`. This gives
you a fine-grained control over permitted operations. SexyMF will not
attempt to run any external program which is not in this list. The
allowed commands list is also respected in zones.


### Managing Services in the Local Zone

Again, by "local zone", I mean the zone in which the `sexymf.js` process is
running. This may be global or an NGZ.

To be able to manage all SMF services within the local zone, create a user
as follows:

    # useradd -u 9206 -g 10 -d / -s /bin/ksh -c "SexyMF user" \
      -P 'Service Management,Service Operator' smfuser

Then run `sexymf.js` as that user. The SMF manifest `support/sexymf.xml`
will do the job.

### Managing Services in Other Zones

As mentioned above, you must specify a zone when you make a SexyMF API call.
If the program is running in a global zone, you may specify a non-global
zone, and SexyMF will attempt to perform the requested operation in that
zone only. The mechanism by which it does this, and therefore the underlying
OS configuration required for it to work, differs between SunOS
implementations.

SexyMF can only operate on NGZs directly. It currently has no proxying
capabilities.

#### Solaris

On Solaris 10 and 11, commands to NGZs must be run through `zlogin(1)`. So,
you have to run SexyMF as a user with privileges to do that.

##### Solaris 10

I believe the best way to allow a non-root user access to NGZ's services is
to assign the `Zone Management` profile. Be aware that this allows a user
with access to that profile to run **any** command **as root** in **any**
NGZ, without having to specify a password! Assuming this is acceptable to
you, run the following command to create a user capable of managing any
service in any zone. No configuration of the NGZs is required.

    # useradd -u 9206 -g 10 -d / -s /bin/ksh -c "SexyMF user" \
    -P 'Zone Management,Service Management,Service Operator' smfuser


##### Solaris 11

Solaris 11 introduced the zone `admin` property, which lets you assign NGZ
management properties to a normal GZ user in a more granular way. This is done with `zonecfg(1m)`.

    # zonecfg -z myzone
    zonecfg:myzone> add admin
    zonecfg:myzone:admin> set user=smfuser
    zonecfg:myzone:admin> set auths=manage

Once this is done, you will need to tell SexyMF to "Simon Says" all its
`zlogin` commands by setting `zlogin_pfexec` to `true` in the configuration
file. Because any commmand run via `zlogin` is executed as root in the NGZ,
no configuration is required in the zone - the `smfuser` user doesn't even
need to exist.

Zone admin is a good way to allow SexyMF to manage NGZs, as rights can be
assigned on a per-zone basis.

#### Illumos Distributions

Illumos has the zone `admin` property, but some commands (`svcs`, `svcadm`,
`svcprop`) have also been extended with a `-z` flag, allowing you to query
or restart services in NGZs from the global zone. By default, SexyMF will
use this option to operate on NGZs if it is available.

To be able to view the states, properties, and log files of services in an
NGZ from the global using the `-z` flag, the SexyMF user requires the
`file_dac_read` and `file_dac_search` privileges. Don't enable these unless
you are fully aware of what they mean and accept any consequences. With
these privileges, the SexyMF user will be able to read ANY file on the host!
To enable them:

    # usermod -K defaultpriv=basic,file_dac_read,file_dac_search smfuser

Or, to create a user capable of running all supported API operations in an
NGZ, issue this command in the global zone:

    # useradd -u 9206 -g 10 -d / -s /bin/ksh -c "SexyMF user" \
      -P 'Service Management,Service Operator' \
      -K defaultpriv=basic,file_dac_read,file_dac_search smfuser

To manage services in an NGZ, the SexyMF user needs to exist in global and
local zones, and have appropriate SMF privileges granted through `usermod`,
in BOTH zones. To create such a user, log in to the local zone and run:

    # useradd -u 9206 -g 10 -d / -s /bin/ksh -c "SexyMF user" \
      -P 'Service Management,Service Operator' smfuser

If the NGZ user lacks privileges, `svcadm` will produce an error of the
form:

    svcadm: Unexpected libscf error on line 337: server has insufficient resources.

At the time of writing `svccfg` does not have the `-z` option, so on
Illumos, SexyMF performs its operations by opening the zone's
`/etc/svc/repository.db` file and manipulating it directly.  This, however,
is a problem. As an NGZ's repository file is owned by `root`, a global zone
user requires the `ALL` privilege to rewrite it, and granting that privilege
pretty much makes him root.

If you need to run `svccfg` commands in NGZs, I suggest running SexyMF with
`force_login` set to `true` in the configuration file, and setting up the OS
as you would for Solaris.  This means the Illumos extensions will be
ignored, and the `zlogin` method used for all NGZ operations.


If you come up with a better way to do any of this, please let me know!

## Access Control

If the `allowed_addr` property is set in the configuration file, SexyMF will
only accept connections from the IP addresses that property contains. It
must be defined as an array, even if it contains a single address. Remember,
IP addresses are not difficult to spoof.

## SSL

SexyMF comes with a dummy self-signed certificate in 'config/ssl' which will
get you up and running in SSL mode. To make the server use SSL, you need to
set `useSSL` to `true` in `config/user_config.json`. [There are plenty of
resources online](https://www.google.com/search?q=creating+ssl+certificates)
to help you make certificates of your own.

## User Authentication

Currently we only support HTTP Basic authorization. Users are stored in the
`user_config.json` file as objects. Here is a user called `myuser` as an
example:

```json
"myuser": {
  "password": "sha1$498e6519$1$9ec4ded71edb6d1b8c2b634df1901d1b18b2b979",
  "auths": [ "view", "manage" ]
}
```

Here, the password string is an SHA hash of the string `mypassword`. It was
generated by running `node_modules/.bin/nodepw mypassword`. If you really
don't care at all about security, you can use clear text passwords instead.
Authorizations are set with the `auths` property, and are explained in the
next section.

The config file is only read at startup, so if you add or change a user, you
have to restart SexyMF. This may change in the future.

## User Authorization

Authorizations are:

 * `view` - lets a user run any of the `GET` methods above, except for
   `svccfg archive` and log access.
 * `archive` - lets a user run `svccfg archive`, if the system supports it
 * `log` - lets a user access service log files
 * `manage` - lets a user run `enable`, `disable`, `refresh` etc. via
   `svcadm`
 * `alter` - required to set or delete service properties (alter the
   service)
 * `delete` - required to delete a service via `svccfg delete`
 * `import` - lets a user import an XML manifest for a service.

If a user tries to perform an action for which he does not have the correct
authorization, he will be sent a 405 code, with some JSON explaining that he
has 'insufficient privileges'. The command, along with the required
authorization will be written to the log.

If you prefer not to use authentication at all, set `use_auths` to `false`
in the config file, and seek professional help.

## Service Access Lists

You can protect services and zones from being manipulated via the API using
service access lists. These define a default policy for a zone (either
"allow" or "deny", then a list of "exceptions" to the default policy.
So, if you wished to only allow the `apache` service to be controlled by
SexyMF, you would deny by default, and exclude apache.

Service access lists should be seen as an _additional_ layer of security
-- your services should be protected first and foremost by well thought
out and correctly implemented RBAC privileges.

### `access_list.json`

`access_list.json` is a JSON file containing objects which refer to
zones.  Normally the key of the object will be the name of the zone, but
there is a special `default` object which is applied to all zones that
do not have their own object.

Each zone object is defined like this:

```json
"default": {
  "default_action": "allow",
  "exceptions": [
    "svc:/system/console-login:default",
    "svc:/system/filesystem/autofs:default"
  ]
}
```

`default_action` can be the self-explanatory `allow` or `deny`, or
`block`.  If `block` is used, the exception list will not be honoured,
and SexyMF will not perform any SMF operations in that zone. This makes
blocking access to a zone very quick and easy.

`exceptions` is an array of fully-qualified SMF service FMRIs.  Using
`console-login` or `filesystem/autofs` in the above example would not
block the services from being run.

If the default action is `allow` or `deny`, you will still be able to
view the state of services in the zone, and still be able to

Define the path to the `access_list.json` file with the `access_file`
property in the configuration file. If the file cannot be found, SexyMF
will not start. If the path is `undefined` or `false`, access lists will
not be checked, and SexyMF will assume you wish to grant API users
access to all SMF services that the OS will allow.

As with the main configuration and user file, Javascript style comments
are allowed. They are stripped out by the
[CJSON](https://github.com/kof/node-cjson) module.

If you change access lists, you must restart the SexyMF daemon so the
file is re-read.


# Logging and Debugging

SexyMF uses the [Bunyan](https://github.com/trentm/node-bunyan) framework
integrated in Restify. Bunyan writes structured logs in JSON format, which
makes them very easy to parse programatically. If you want to simply cast an
eye over the logs, there is a `bunyan` command-line tool at
`node_modules/restify/node_modules/.bin/bunyan`. Please refer to [the Bunyan
documentation](https://github.com/trentm/node-bunyan#cli-usage) for
information on how to use it.

You can set the log level through the `log_level` variable in the
config file. That value can be overriden with the `-l` or `--loglevel`
switch when starting SexyMF. If neither value is supplied, the log
level defaults to `info`.

SexyMF tries to record everything of any significance in its own field in
the Bunyan logs. So, for instance, if you always wanted to know what UID the
program started up as, you would simply have to parse the log files for the
`uid` field. This information is sometimes repeated in the `msg` field, but
don't depend on that being parseable. If you're trying to parse `msg`,
you're doing it wrong.

## Audit Logging

Restify provides an audit logging plugin, the output of which can be useful
when debugging SexyMF. This audit log contains detailed information about
any request which did not end with the client being sent a 200 code.

If you wish to enable it, set `log["audit_log"]` to a writable path in the
config file.

## DTrace

Because SexyMF uses the Restify framework, it contains DTrace probes. The
best way to learn how to take advantage of these is from [the Restify
documentation](http://mcavage.github.com/node-restify/#DTrace). The Bunyan
logging module also offers DTrace providers, which are [well
documented](https://github.com/trentm/node-bunyan#dtrace-examples).

# Compatibility

SexyMF should be compatible with any `i86pc` SunOS system running SMF.
This includes Sun Solaris 10, Oracle Solaris 11, and Illumos derivatives
such as SmartOS and OmniOS. Some features dealing with non-global zones
may be quicker to appear for Illumos OSes, as they have better
capabilities to query services in zones, making some things easier to
implement. Currently support is equal across all platforms, though
different OS configuration is required to achieve it.

SexyMF is developed and tested with Solaris 11 on x64 hardware, and with
OmniOS under VirtualBox. It is also frequently tested with various
Solaris 10 releases under VirtualBox and VMWare, and in a Joyent-hosted
SmartMachine.  There is no SPARC support, as V8, and therefore Node.js,
won't build on SPARC. (Which, IMO, is a great shame.)

SexyMF assumes that the operating system has zone support. If you don't have
the zone packages installed, the preflight checks will fail. I may remove
this dependency in the future, but it seems unlikely anyone will be
troubled by it.

## Operations Which are Not Supported

SMF is a very broad and sophisticated system, with a rich and complex
interface. SexyMF makes no attempt to provide an API to everything. The
following are obvious current omissions.

 * applying a service profile
 * anything to do with notifications
 * anything to do with snapshots
 * anything to do with customizations
 * service descriptions

Some of these are planned for the future, some of them aren't.

# Versioning

SexyMF uses [semantic
versioning](https://github.com/twitter/bootstrap#versioning).

## API versioning

SexyMF currently has only a single version of its API, `1.0.0`. This is
reported in the `Api-Version` header.

# Support

The software is provided as-is. If you find bugs, please [report them as
issues](https://github.com/snltd/SexyMF/issues) and I'll fix them ASAP. If
you want more features, request an enhancement through the Github issues
tracker, contact me directly, or feel free to fork the project.

If you use SexyMF and find it useful or useless, I'd love to know. My
email's in the `package.json` information.

I work freelance. If you want to pay me to do this kind of thing, let's
talk.

# Testing

SexyMF is BDD tested using [Mocha](http://mochajs.org/).
It used to use a custom harness written in shell, which got pretty
horrific pretty quickly. It's in the history if you want to see how not
to write tests.

There's more info in `test/README.md`.

# License

SexyMF is issued under a BSD license.


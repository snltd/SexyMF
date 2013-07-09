Things to help you use SexyMF.

# `sexymf.xml`

`sexymf.xml` is an SMF manifest which runs SexyMF as a daemon. You can
change the following service properties:

 * `base`: type `astring`, this points to the directory in which SexyMF
   is installed. Defaults to `/opt/SexyMF`.
 * `nodebin`: type `astring`, this points the the `node` executable
   which you wish to run SexyMF. Defaults to `/opt/local/bin/node`,
   which is the default location on SmartOS.

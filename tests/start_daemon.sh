#!/bin/ksh

# Start SexyMF using the right options

cd ${0%/*}
print $(pwd)/config/config.json
../sexymf.js -c $(pwd)/config/config.json

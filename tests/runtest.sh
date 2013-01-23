#!/bin/ksh

#=============================================================================
#
# runtest.sh
# ----------
#
# Test harness for SexyMF. Adapts itself to your system, but you will need
# properly set up users.
#
# R Fisher 2013
#
#=============================================================================

#-----------------------------------------------------------------------------
# VARIABLES

BASE="https://0:9206"
HFILE=$(mktemp)

ABORT_ON_ERROR=1
	# uncomment this to have the script exit if a test fails

TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

typeset -L40 LFIELD
typeset -R36 RFIELD

#-----------------------------------------------------------------------------
# FUNCTIONS

function do_exit
{
	print "\n$TESTS_RUN tests. $TESTS_PASSED passed, $TESTS_FAILED failed.\n"
	exit $TESTS_FAILED
}

function print_test
{
	LFIELD=$1
	print -n "  $LFIELD"
}

function print_result
{
	TESTS_RUN=$(( $TESTS_RUN + 1))
	RFIELD=$1

	if [[ $1 == "ok" ]]
	then
		col=2
		TESTS_PASSED=$(( $TESTS_PASSED + 1))
	else
		col=1
		TESTS_FAILED=$(( $TESTS_FAILED + 1))
	fi

	tput setaf $col
	print "$RFIELD"
	tput sgr0
}

function mk_cmd
{
	# $1 is the API path
	# $2 is any additional flags

	print -n "curl -sk -D $HFILE "

	[[ -n $DATA ]] && print -n -- "-d \"$DATA\" "
	[[ -n $A_USER ]] && print -n -- "-u $A_USER "
	[[ -n $FLAGS ]] && print -n -- "$FLAGS "

	print -- "\"${BASE}$1\""
}

function handle_result
{
	# $1 is the command we just ran
	# $2 is $? from the test

	if [[ $2 == 0 ]]
	then
		print_result ok
	else
		print_result FAILED
		cat <<-EOMSG
==============================================================================
Failed command:
$1
==============================================================================
		EOMSG

		[[ -n $ABORT_ON_ERROR ]] && do_exit
	fi

}

function match_test
{
	# Look for a string

	# $1 is the command
	# $2 is the string

	cmd=$(mk_cmd $1)

	print_test "match test ($2)"
	eval $cmd | egrep -s "$2"
	handle_result "$cmd" $?
}

function header_test
{
	# $1 is the expected header

	print_test "header test ($1)"

	if [[ -s $HFILE ]]
	then
		code=$(sed -n '1s/^[^ ]* \([0-9]*\) .*$/\1/p' $HFILE)

		if [[ $code == $1 ]]
		then
			print_result ok
		else
			print_result "FAILED (got $code)"
		fi

	else
		print "FAILED (no header file)"
	fi

}


function line_test_plain
{
	# see if a specified number of lines are output

	# $1 is the command
	# $2 is the number of lines

	print_test "plain text line count ($2)"

	cmd="$(mk_cmd "$1") | wc -l"

	(( $(eval $cmd) == $2 ))
	handle_result "$cmd" $?
}

function line_test
{
	# see if a specified number of JSON lines are output

	# $1 is the command
	# $2 is the number of lines

	print_test "JSON line count ($2)"

	cmd="$(mk_cmd "$1") | json | wc -l"

	(( $(eval $cmd) == $2 ))
	handle_result "$cmd" $?
}

function run_test
{
	# Run a test
	# $1 is the test to run

	print "${1##*/}"

	unset L_COUNT MATCH HEADER FLAGS

	. $1

	[[ -n $L_COUNT ]] && line_test $URI $L_COUNT
	[[ -n $L_COUNT_P ]] && line_test_plain $URI $L_COUNT_P
	[[ -n $MATCH ]] && match_test $URI "$MATCH"
	[[ -n $HEADER ]] && header_test $HEADER

	rm $HFILE
}

#-----------------------------------------------------------------------------
# SCRIPT STARTS HERE

if ! pgrep -f sexymf.js >/dev/null
then
	print -u2 "ERROR: sexymf.js is not running"
	exit 1
fi

if [[ -n $1 ]]
then
	testlist=$*
else
	testlist=${0%/*}/tests/[0-9]*
fi

for t in $testlist
do
	[[ -f $t ]] || t="${0%/*}/tests/$t"
	[[ -f $t ]] && run_test $t || print "can't find test: $t"
done


do_exit

#!/bin/ksh

#=============================================================================
#
# runtest.sh
# ----------
#
# Test harness for SexyMF. Roughly adapts itself to your system, but you
# will need properly set up users. This has grown very quickly, and very
# organically, and it shows.
#
# R Fisher 2013
#
#=============================================================================

#-----------------------------------------------------------------------------
# VARIABLES

MYROOT=$(cd ${0%/*}; pwd)

PATH=/usr/bin:/usr/local/node/bin:/usr/sbin
	# You might need to change this so it can find the 'json' executable.

BASE="https://0:9206"
HFILE=$(mktemp)
TEST_FILE=$(mktemp)
REF_FILE=$(mktemp)

ABORT_ON_ERROR=1
	# uncomment this to have the script exit if a test fails

TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

typeset -L60 LFIELD
typeset -R16 RFIELD

#-----------------------------------------------------------------------------
# FUNCTIONS

function do_exit
{
	# Exit cleanly and clear up temp files

	print "\n$TESTS_RUN tests. $TESTS_PASSED passed, $TESTS_FAILED failed.\n"
	rm -f $HFILE $TEST_FILE $REF_FILE
	exit $TESTS_FAILED
}

function mk_cmd
{
	# Build up a curl command which will be run by one of the test_
	# functions
	#
	# $1 is the API path
	# $2 is any additional flags

	print -n "curl -sk -D $HFILE "

	[[ -n $DATA ]] && print -n -- "-d \"$DATA\" "
	[[ -n $A_USER ]] && print -n -- "-u $A_USER "
	[[ -n $FLAGS ]] && print -n -- "$FLAGS "
	[[ -n $2 ]] && print -n -- "$2 "

	print -- "\"${BASE}$1\""
}

function handle_result
{
	# $1 is the command we just ran
	# $2 is $? from the test
	# $3 is an optional "got xx" string

	typeset pr

	if [[ $2 == 0 ]]
	then
		print_result ok
	else
		[[ -n $3 ]] && pr="FAILED (got $3)" || pr="FAILED"
		print_result "$pr"
		cat <<-EOMSG
==============================================================================
Failed command:
$1
$([[ -n $DIFF_CMD ]] && print "\ndiff command:\n$DIFF_CMD")
==============================================================================
		EOMSG

		[[ -n $ABORT_ON_ERROR ]] && do_exit
	fi

}

function match_test
{
	# Look for a string in output

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

		[[ $code == $1 ]]
		handle_result "$cmd" $? $code
	else
		print "FAILED (no header file)"
	fi

}

function mimetype_test
{
	# $1 is the expected mimetype

	print_test "mimetype test ($1)"

	if [[ -s $HFILE ]]
	then
		mtype=$(sed -n '/^Content-Type/s/^.*: \([a-z\/]*\).*$/\1/p' $HFILE)
		[[ $mtype == $1 ]]
		handle_result "$cmd" $? $mtype
	else
		print "FAILED (no header file)"
	fi
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

function diff_test
{
	# Compare the output of the command you are testing with the output of
	# another, predicatable, one

	# $1 is the command to run
	# $2 is the command to compare to

	cmd=$(mk_cmd "$1" "-o $TEST_FILE")

	print_test "diff test"

	eval $cmd
	$2 >$REF_FILE 2>&1

	cmp -s $TEST_FILE $REF_FILE
	handle_result "$cmd" $?
}

function pre_cmd_test
{
	# See if a command is successful
	# $1 is the command

	print_test "pre command test"

	eval $*
	handle_result "$*" $?
}

function post_cmd_test
{
	# See if a command is successful
	# $1 is the command

	print_test "post command test"

	eval $*
	handle_result "$*" $?
}

function run_test
{
	# Run a test
	# $1 is the test to run

	print "${1##*/}"

	unset POST_CMD PRE_CMD DIFF_CMD L_COUNT L_COUNT_P MATCH HEADER FLAGS \
		MIMETYPE SKIP_IF

	. $1

	if [[ -n $SKIP_IF ]]
	then
		print_test "skip test?"

		if $SKIP_IF
		then
			print_result SKIP
			return
		else
			print_result no
		fi


	fi

	[[ -n $PRE_CMD ]] && pre_cmd_test $PRE_CMD
	[[ -n $L_COUNT ]] && line_test "$URI" $L_COUNT
	[[ -n $L_COUNT_P ]] && line_test_plain "$URI" $L_COUNT_P
	[[ -n $MATCH ]] && match_test "$URI" "$MATCH"
	[[ -n $DIFF_CMD ]] && diff_test "$URI" "$DIFF_CMD"
	[[ -n $POST_CMD ]] && post_cmd_test $POST_CMD

	# Header and mimetype tests have to be last because the other tests dump
	# a header file which they use

	[[ -n $HEADER ]] && header_test $HEADER
	[[ -n $MIMETYPE ]] && mimetype_test $MIMETYPE
}

function print_test
{
	# Use typeset to do formatting of notifications. Goes hand-in-hand with
	# print_result

	LFIELD=$1
	print -n "  $LFIELD"
}

function print_result
{
	# Print and colour the test result

	TESTS_RUN=$(( $TESTS_RUN + 1))
	RFIELD=$1

	if [[ $1 == "ok" ]]
	then
		col=2
		TESTS_PASSED=$(( $TESTS_PASSED + 1))
	elif [[ $1 == "SKIP" || $1 == "no" ]]
	then
		col=4
	else
		col=1
		TESTS_FAILED=$(( $TESTS_FAILED + 1))
	fi

	tput setaf $col
	print "$RFIELD"
	tput sgr0
}

#-----------------------------------------------------------------------------
# SCRIPT STARTS HERE

if ! pgrep -f sexymf.js >/dev/null
then
	print -u2 "ERROR: sexymf.js is not running"
	exit 1
fi

# Load in the stest service

svcadm disable stest 2>/dev/null
svccfg delete stest 2>/dev/null
svccfg import ${MYROOT}/manifest/stest.xml

# If we don't have a list, run all tests

if [[ -n $1 ]]
then
	testlist=$*
else
	testlist=${0%/*}/tests/[0-9]*
fi

for t in $testlist
do
	t=${MYROOT}/tests/${t##*/}

	if [[ -f $t ]]
	then
		run_test $t
	else
		print "can't find test: $t"
	fi

done

do_exit

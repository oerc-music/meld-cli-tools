source ~/.nvm/nvm.sh
source ~/.nvm/bash_completion

[ -s ~/.meld_tool/solid_auth.sh ] && source ~/.meld_tool/solid_auth.sh

export SOLID_CERTS=~/solid-certs
export NODE_EXTRA_CA_CERTS=$SOLID_CERTS/localhost.crt
export NODE_TLS_REJECT_UNAUTHORIZED=0

export MELD_TOOL_DIR="$(pwd)/../"
export MELD_TOOL="${MELD_TOOL_DIR}meld_tool_cli.js"
export SOFA_TOOL="${MELD_TOOL_DIR}sofa_tool_cli.js"
export MELD_HOST_URL="https://localhost:8443"
export MELD_BASE_PATH="/public/"
export MELD_BASE_URL="${MELD_HOST_URL}${MELD_BASE_PATH}"
export TEST_BASE_PATH="${MELD_BASE_PATH}test/"
export TEST_BASE_URL="${MELD_HOST_URL}${TEST_BASE_PATH}"

if [[ "$MELD_USERNAME" == "" ]]; then
    echo "Environment variable MELD_USERNAME not defined"
    echo "(Tried using ~/.meld_tool/solid_auth.sh)"
    return 1
fi

if [[ "$MELD_PASSWORD" == "" ]]; then
    echo "Environment variable MELD_PASSWORD not defined"
    echo "(Tried using ~/.meld_tool/solid_auth.sh)"
    return 1
fi

if [[ "$MELD_IDPROVIDER" == "" ]]; then
    echo "Environment variable MELD_IDPROVIDER not defined"
    echo "(Tried using ~/.meld_tool/solid_auth.sh)"
    return 1
fi

function make_test_container {
    node $MELD_TOOL test-is-container ${TEST_BASE_PATH}
    EXITSTATUS=$?
    if [ $EXITSTATUS -ne 0 ]; then
        TEST_PATH=$(node $MELD_TOOL make-container $MELD_BASE_PATH test)
        test_sts $? "make-test-container" \
          && test_eq "${TEST_PATH}" "${TEST_BASE_PATH}" "make-test-container"
    else
        TEST_PATH="$TEST_BASE_PATH"
    fi
    return $EXITSTATUS
}

function test_sts {
    # Check for success exit status
    # $1 is status value
    # $2 is message
    EXITSTATUS=$1
    if [[ $1 == 0 ]]; then
        return 0
    fi
    echo "${2:-non-success exit status}: $1"
    return $1
}

function test_sts_eq {
    # Check for specific exit status
    # $1 is status value
    # $2 is expected status value
    # $3 is message
    EXITSTATUS=$1
    if [[ $1 == $2 ]]; then
        EXITSTATUS=0
        return 0
    fi
    echo "${3:-exit status}: status $1, expected: $2"
    return $1
}

function test_eq {
    # Compare $1 with $1, expect equality
    if [[ "$1" == "$2" ]]; then
        EXITSTATUS=0
        return 0
    fi
    echo "${3:-test_eq failed} '$1' != '$2'"
    EXITSTATUS=1
    return 1
}

function test_in {
    # test $2 contained in $1
    # $3 is message
    if echo "$1" | grep --quiet "\($2\)"; then
        EXITSTATUS=0
        return 0
    fi
    echo "${3:-test_in failed}: '$2' not found"
    EXITSTATUS=1
    return 1
}

function test_not_in {
    # test $2 not contained in $1
    # $3 is message
    if echo "$1" | grep --quiet "\($2\)"; then
        echo "${3:-test_not_in failed}: '$2' found"
        EXITSTATUS=1
        return 1
    fi
    EXITSTATUS=0
    return 0
}

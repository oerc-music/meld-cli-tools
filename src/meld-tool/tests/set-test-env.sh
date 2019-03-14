export MELD_TOOL_DIR="$(pwd)/../"
export MELD_TOOL="${MELD_TOOL_DIR}meld_tool.js"
export MELD_HOST_URL="https://localhost:8443"
export MELD_BASE_PATH="/public/"
export MELD_BASE_URL="${MELD_HOST_URL}${MELD_BASE_PATH}"

[ -s ~/.meld_tool/solid_auth.sh ] && source ~/.meld_tool/solid_auth.sh

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

function test_sts {
    # Check for success exit status
    # $1 is status value
    # $2 is message
    if [[ $1 == 0 ]]; then
        return 0
    fi
    echo "${2:-non-success exit status}: $1"
    return $1
}

function test_eq {
    # Compare $1 with $1, expect equality
    if [[ "$1" == "$2" ]]; then
        return 0
    fi
    echo "${3:-test_eq failed} '$1' != '$2'"
    return 1
}

function test_in {
    # test $2 contained in $1
    # $3 is message
    if echo "$1" | grep --quiet "\($2\)"; then
        return 0
    fi
    echo "${3:-test_in failed}: '$2' not found"
    return 1
}

function test_sts_eq {
    # $1 status
    # $2 value obtained
    # $3 value expected
    # $4 test label
    if test_sts $1 "$4 exit status"; then
        test_eq "$2" "$3" "$4 result" 
        return $?
    fi
    return $1
}

function test_sts_in {
    # $1 status
    # $2 value obtained
    # $3 value expected
    # $4 test label
    if test_sts $1 "$4 exit status"; then
        test_in "$2" "$3" "$4 content" 
        return $?
    fi
    return $1
}

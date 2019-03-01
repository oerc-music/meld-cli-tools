# Remove all contents in container
#
# $1 = URL of container
#
# This is an example of using meld_tool in a bash script.
#

if [[ "$1" == "" ]]; then
    echo "Missing container URL."
    echo ""
    echo "Usage: $0 <container-url>"
    return 1
fi

for ITEM in $(node meld_tool.js ls $1); do
    if node meld_tool.js test-text-resource $ITEM --literal "ldp:contains"
    then
        . recursive-remove-all.sh $ITEM
    fi
    node meld_tool.js rm $ITEM
done

# node meld_tool.js ls $1

# End.

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
    node meld_tool.js rm $ITEM
done

node meld_tool.js ls $1

# End.

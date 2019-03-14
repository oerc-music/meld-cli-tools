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
    exit 1
fi

for ITEM in $(node $MELD_TOOL ls $1); do
    # echo "Processing $ITEM in $1 from $2"
    . recursive-remove-all.sh $ITEM $1
    node $MELD_TOOL rm $ITEM
    # echo "Completed $ITEM"
done

ITEM="$1" # Reset ITEM to value prior to recursive call

# node $MELD_TOOL ls $1

# End.

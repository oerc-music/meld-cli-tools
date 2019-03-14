# Remove all contents in container
#
# $1 = path or URL of container (otherwise uses MELD_BASE_PATH)
#
# This is an example of using meld_tool in a bash script.
#

CONTAINER_PATH=$1
if [[ "$CONTAINER_PATH" == "" ]]; then
    CONTAINER_PATH=$MELD_BASE_PATH
fi

if [[ "$CONTAINER_PATH" == "" ]]; then
    echo "Missing container path or URL."
    echo ""
    echo "Usage: $0 <container-path-or-URL>"
    exit 1
fi

for ITEM in $(node $MELD_TOOL ls $CONTAINER_PATH); do
    # echo "Processing $ITEM in $CONTAINER_PATH from $2"
    . recursive-remove-all.sh $ITEM $CONTAINER_PATH
    node $MELD_TOOL rm $ITEM
    # echo "Completed $ITEM"
done

ITEM="$1" # Reset ITEM to value prior to recursive call

# node $MELD_TOOL ls $1

# End.

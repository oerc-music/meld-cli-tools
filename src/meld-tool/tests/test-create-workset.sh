EXITSTATUS=0

if [ $EXITSTATUS -eq 0 ]; then
    CONTAINER_PATH=$(node $MELD_TOOL create-workset $MELD_BASE_PATH test_workset)
    test_sts $? "create-workset" \
      && test_eq "$CONTAINER_PATH" "${MELD_BASE_PATH}test_workset/" "create-workset"
    EXITSTATUS=$?
fi

if [ $EXITSTATUS -eq 0 ]; then
    PUBLIC_CONTENT=$(node $MELD_TOOL list-container $MELD_BASE_PATH)
    test_sts $? "list-container" \
      && test_in "$PUBLIC_CONTENT" "$CONTAINER_PATH" "list-container"
    EXITSTATUS=$?
fi

if [ $EXITSTATUS -eq 0 ]; then
    node $MELD_TOOL test-is-container $CONTAINER_PATH
    test_sts $? "test-is-container"
    EXITSTATUS=$?
fi

if [ $EXITSTATUS -eq 0 ]; then
    CONTAINTER_CONTENT_TYPE=$(node $MELD_TOOL content-type $CONTAINER_PATH)
    test_sts $? "show-content-type" \
      && test_eq "$CONTAINTER_CONTENT_TYPE" "text/turtle"
    EXITSTATUS=$?
fi

if [ $EXITSTATUS -eq 0 ]; then
    node $MELD_TOOL remove-resource $CONTAINER_PATH
    test_sts $? "remove-resource exit status"
    EXITSTATUS=$?
fi

return $EXITSTATUS

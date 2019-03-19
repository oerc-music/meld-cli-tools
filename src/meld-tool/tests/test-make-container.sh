EXITSTATUS=0

if [ $EXITSTATUS -eq 0 ]; then
    CONTAINER_PATH=$(node $MELD_TOOL make-container $MELD_BASE_PATH test_container)
    test_sts $? "make-container" \
      && test_eq "$CONTAINER_PATH" "${MELD_BASE_PATH}test_container/" "make-workset"
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

# if [ $EXITSTATUS -eq 0 ]; then
#     node $MELD_TOOL show-resource-rdf $CONTAINER_PATH
#     test_sts $? "show-resource-rdf exit status"
#     EXITSTATUS=$?
# fi

cat >container-expect-content.tmp <<EOF
@prefix ldp: <http://www.w3.org/ns/ldp#>.
<$CONTAINER_PATH>
    a ldp:BasicContainer, ldp:Container;
    .
EOF

if [ $EXITSTATUS -eq 0 ]; then
    $(node $MELD_TOOL \
        --stdinurl=https://localhost:8443/public/ \
        test-rdf-resource $CONTAINER_PATH - \
        <container-expect-content.tmp  \
        )
    test_sts $? "container-content" \
      && test_eq "$CONTAINTER_CONTENT_TYPE" "text/turtle"
    EXITSTATUS=$?
fi

rm container-expect-content.tmp

if [ $EXITSTATUS -eq 0 ]; then
    node $MELD_TOOL remove-resource $CONTAINER_PATH
    test_sts $? "remove-resource exit status"
    EXITSTATUS=$?
fi

return $EXITSTATUS

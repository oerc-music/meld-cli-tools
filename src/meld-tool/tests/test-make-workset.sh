make_test_container

if [ $EXITSTATUS -eq 0 ]; then
    WORKSET_PATH=$(node $SOFA_TOOL make-workset $TEST_PATH test_workset)
    test_sts $? "make-workset" \
      && test_eq "$WORKSET_PATH" "${TEST_PATH}test_workset/" "make-workset"
fi

if [ $EXITSTATUS -eq 0 ]; then
    PUBLIC_CONTENT=$(node $MELD_TOOL list-container $TEST_PATH)
    test_sts $? "list-container" \
      && test_in "$PUBLIC_CONTENT" "$WORKSET_PATH" "list-container"
fi

if [ $EXITSTATUS -eq 0 ]; then
    node $MELD_TOOL test-is-container $WORKSET_PATH
    test_sts $? "test-is-container"
fi

if [ $EXITSTATUS -eq 0 ]; then
    CONTAINTER_CONTENT_TYPE=$(node $MELD_TOOL content-type $WORKSET_PATH)
    test_sts $? "show-content-type" \
      && test_eq "$CONTAINTER_CONTENT_TYPE" "text/turtle"
fi

# if [ $EXITSTATUS -eq 0 ]; then
#     node $MELD_TOOL show-resource-rdf $WORKSET_PATH
#     test_sts $? "show-resource-rdf exit status"
#     EXITSTATUS=$?
# fi

cat >container-expect-content.tmp <<EOF
@prefix ldp: <http://www.w3.org/ns/ldp#>.
@prefix nin: <http://remix.numbersintonotes.net/vocab#>.
<$WORKSET_PATH>
    a ldp:BasicContainer, ldp:Container, nin:WorkSet ;
    .
EOF

if [ $EXITSTATUS -eq 0 ]; then
    $(node $MELD_TOOL \
        --stdinurl=https://localhost:8443/public/ \
        test-rdf-resource $WORKSET_PATH - \
        <container-expect-content.tmp  \
        )
    test_sts $? "container-content" \
      && test_eq "$CONTAINTER_CONTENT_TYPE" "text/turtle"
fi

rm container-expect-content.tmp

# Add fragment to container

if [ $EXITSTATUS -eq 0 ]; then
    FRAGMENT_PATH=$(node $SOFA_TOOL add-fragment \
        "$WORKSET_PATH" "http://example.org/test-fragment" "test-fragment" \
        )
    test_sts $? "add-fragment" \
      && test_eq "$FRAGMENT_PATH" "${WORKSET_PATH}test-fragment.ttl" "add-fragment"
fi

# Remove workset container

if [ $EXITSTATUS -eq 0 ]; then
    node $MELD_TOOL remove-resource $FRAGMENT_PATH
    test_sts $? "remove-fragment exit status"
fi

if [ $EXITSTATUS -eq 0 ]; then
    node $MELD_TOOL remove-resource $WORKSET_PATH
    test_sts $? "remove-resource exit status"
fi

return $EXITSTATUS

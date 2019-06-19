make_test_container

# Set up test data

cat >test-make-resource.tmp <<EOF
test resource line 1
test resource line 2
 :
test resource last line
EOF

# Parent with contained resource
if [ $EXITSTATUS -eq 0 ]; then
    CONTAINER_PATH=$(node $MELD_TOOL make-container $TEST_PATH test_container)
    test_sts $? "make-container" \
      && test_eq "$CONTAINER_PATH" "${TEST_PATH}test_container/" "make-container"
    EXITSTATUS=$?
fi

if [ $EXITSTATUS -eq 0 ]; then
    RESOURCE_PATH=$(node $MELD_TOOL make-resource \
        "$CONTAINER_PATH" "test_resource_parent" "text/plain" - \
        <test-make-resource.tmp \
        )
    test_sts $? "make-resource" \
      && test_eq "$RESOURCE_PATH" "${CONTAINER_PATH}test_resource_parent.txt" "make-resource"
    EXITSTATUS=$?
fi

# Sub-container 1, with contained resource

if [ $EXITSTATUS -eq 0 ]; then
    SUB_CONTAINER_PATH_1=$(node $MELD_TOOL make-container $CONTAINER_PATH test_container_sub1)
    test_sts $? "make-container" \
      && test_eq "$SUB_CONTAINER_PATH_1" "${CONTAINER_PATH}test_container_sub1/" "make-sub-container-1"
    EXITSTATUS=$?
fi

if [ $EXITSTATUS -eq 0 ]; then
    SUB_RESOURCE_PATH_1=$(node $MELD_TOOL make-resource \
        "$SUB_CONTAINER_PATH_1" "test_resource_sub1" "text/plain" - \
        <test-make-resource.tmp \
        )
    test_sts $? "make-resource" \
      && test_eq "$SUB_RESOURCE_PATH_1" "${SUB_CONTAINER_PATH_1}test_resource_sub1.txt" "make-sub-resource-1"
    EXITSTATUS=$?
fi

# Sub-container 2, with contained resource

if [ $EXITSTATUS -eq 0 ]; then
    SUB_CONTAINER_PATH_2=$(node $MELD_TOOL make-container $CONTAINER_PATH test_container_sub2)
    test_sts $? "make-container" \
      && test_eq "$SUB_CONTAINER_PATH_2" "${CONTAINER_PATH}test_container_sub2/" "make-sub-container-2"
    EXITSTATUS=$?
fi

if [ $EXITSTATUS -eq 0 ]; then
    SUB_RESOURCE_PATH_2=$(node $MELD_TOOL make-resource \
        "$SUB_CONTAINER_PATH_2" "test_resource_sub2" "text/plain" - \
        <test-make-resource.tmp \
        )
    test_sts $? "make-resource" \
      && test_eq "$SUB_RESOURCE_PATH_2" "${SUB_CONTAINER_PATH_2}test_resource_sub2.txt" "make-sub-resource-2"
    EXITSTATUS=$?
fi

# Check contents

if [ $EXITSTATUS -eq 0 ]; then
    PUBLIC_CONTENT=$(node $MELD_TOOL list-container $TEST_PATH)
    test_sts $? "list-container" \
      && test_in "$PUBLIC_CONTENT" "$CONTAINER_PATH" "list-container (base)"
    EXITSTATUS=$?
fi

if [ $EXITSTATUS -eq 0 ]; then
    PARENT_CONTENT=$(node $MELD_TOOL list-container $CONTAINER_PATH)
    test_sts $? "list-container" \
      && test_in "$PARENT_CONTENT" "$RESOURCE_PATH"        "list-container (parent: resource)" \
      && test_in "$PARENT_CONTENT" "$SUB_CONTAINER_PATH_1" "list-container (parent: sub1)"     \
      && test_in "$PARENT_CONTENT" "$SUB_CONTAINER_PATH_2" "list-container (parent: sub2)"
    EXITSTATUS=$?
fi

if [ $EXITSTATUS -eq 0 ]; then
    SUB1_CONTENT=$(node $MELD_TOOL list-container $SUB_CONTAINER_PATH_1)
    test_sts $? "list-container" \
      && test_in "$SUB1_CONTENT" "$SUB_RESOURCE_PATH_1" "list-container (sub1: resource)"
    EXITSTATUS=$?
fi

if [ $EXITSTATUS -eq 0 ]; then
    SUB2_CONTENT=$(node $MELD_TOOL list-container $SUB_CONTAINER_PATH_2)
    test_sts $? "list-container" \
      && test_in "$SUB2_CONTENT" "$SUB_RESOURCE_PATH_2" "list-container (sub2: resource)"
    EXITSTATUS=$?
fi

# Remove parent container

if [ $EXITSTATUS -eq 0 ]; then
    node $MELD_TOOL remove-container $CONTAINER_PATH
    test_sts $? "remove-container exit status"
    EXITSTATUS=$?
fi

# Test container is removed

if [ $EXITSTATUS -eq 0 ]; then
    PUBLIC_CONTENT=$(node $MELD_TOOL list-container $TEST_PATH)
    test_sts $? "list-container" \
      && test_not_in "$PUBLIC_CONTENT" "$CONTAINER_PATH" "list-container (parent removed)"
    EXITSTATUS=$?
fi

# Tidy up and exit (all tests pass)

rm test-make-resource.tmp

return $EXITSTATUS

# Create a resource

cat >test-make-resource.tmp <<EOF
test resource line 1
test resource line 2
 :
test resource last line
EOF

RESOURCE_PATH=$(node $MELD_TOOL make-resource \
    "$MELD_BASE_PATH" "test_resource" "text/plain" - \
    <test-make-resource.tmp \
    )
test_sts $? "make-resource" \
  && test_eq "$RESOURCE_PATH" "${MELD_BASE_PATH}test_resource.txt" "make-resource"
EXITSTATUS=$?

# Show test resource and check output

if [ $EXITSTATUS -eq 0 ]; then
    RESOURCE_CONTENT_TYPE=$(node $MELD_TOOL content-type $RESOURCE_PATH)
    test_sts $? "show-content-type" \
      && test_eq "$RESOURCE_CONTENT_TYPE" "text/plain"
    EXITSTATUS=$?
fi

if [ $EXITSTATUS -eq 0 ]; then
    RESOURCE_CONTENT=$(node $MELD_TOOL show-resource $RESOURCE_PATH)
    test_sts $? "show-resource" \
      && test_in "$RESOURCE_CONTENT" "test resource line 1"    "show-resource" \
      && test_in "$RESOURCE_CONTENT" "test resource line 2"    "show-resource" \
      && test_in "$RESOURCE_CONTENT" "test resource last line" "show-resource"
    EXITSTATUS=$?
fi

# Test resource content using test command

#@@TODO

# Remove test resource and check content

if [ $EXITSTATUS -eq 0 ]; then
    node $MELD_TOOL remove-resource $RESOURCE_PATH
    test_sts $? "remove-resource exit status"
    EXITSTATUS=$?
fi

rm test-make-resource.tmp

return $EXITSTATUS

FULL_URL=$(node $MELD_TOOL full-url foo/bar)
test_sts $? "full-url exit status" \
  && test_eq  "$FULL_URL" "${MELD_HOST_URL}/foo/bar" "full-url unexpected result"

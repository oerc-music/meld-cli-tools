TOKEN=$(node $MELD_TOOL test-login)
test_sts $? "test-login" \
  && test_in  "$TOKEN" "Bearer " "test-login"

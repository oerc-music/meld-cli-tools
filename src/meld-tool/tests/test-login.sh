TOKEN=$(node $MELD_TOOL test-login)
test_sts $? "test-login exit status"
test_in  "$TOKEN" "Token " "expected token missing in test-login output"

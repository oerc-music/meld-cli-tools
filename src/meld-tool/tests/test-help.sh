HELP=$(node $MELD_TOOL --help)
test_sts $? "help exit status"
test_in  "$HELP" "help \[cmd\]" "expected value missing in help"
test_in  "$HELP" "full-url"     "expected value missing in help"
test_in  "$HELP" "--baseurl"    "expected value missing in help"

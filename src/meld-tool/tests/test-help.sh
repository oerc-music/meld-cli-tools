HELP=$(node $MELD_TOOL --help)
test_sts $? "help exit status" \
  && test_in  "$HELP" "help \[cmd\]" "--help" \
  && test_in  "$HELP" "full-url"     "--help" \
  && test_in  "$HELP" "--baseurl"    "--help"

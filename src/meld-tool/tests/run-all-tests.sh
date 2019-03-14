tests=$(ls test-*.sh)
source set-test-env.sh
for test in $tests; do
    echo "== $test.."
    source $test
    sts=$?
    if [ $sts -ne 0 ]; then
        echo "Test $test failed: exit status $sts"
        break
    fi
done

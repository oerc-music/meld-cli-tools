# Test suite for meld-tool.js

Alternative plans for test environment: 

- shell scripts or Javascript driver or Javascript-spawned commands
- shell scripts are easy to start, but could get harder to maintain
- Javascript driver needs way to capture stdout and exit status (note calls to exit())
    - https://github.com/BlueOtterSoftware/capture-stdout/blob/master/capture-stdout.js

Currently going with shell scripts running command line tool, and checking output and/or return status.


## Tests

To run tests, under bash:

1. Assumes node-solid-server is running locally (typically on https://localhost:8443), with public folder at `/public/`.

2. Assumes `set-test-env.sh` matches test setup, and solid-server is running.  (see notes/20190208-solid-server-install-run.md).

3. Assumes `~/.meld_tool/solid_auth.sh` supplies credentials appropriate to the `node-solid-server` setup.

        export MELD_USERNAME=@@username here@@
        export MELD_PASSWORD=@@password here@@
        export MELD_IDPROVIDER=https://localhost:8443

(Note that these credentials are kept outside the github repository.)

4. Issue these commands:

        source set-test-env.sh   # First time in terminal session
        source run-all-tests.sh

    Note that run-all-tests looks for individual test suite files in the current directory; these test suites may be run separately.


### Tests summary

- [x] Set up test environment
- [x] Test help
- [x] Test URL resolution
- [x] Test create workset
- [x] Test text resource content testing
- [x] Test RDF resource content testing
- [x] Test show workset resource
- [x] Test fragment creation, access and removal
- [x] Test annotation creation, access and removal
- [x] Test remove-container, which recursively removes contents


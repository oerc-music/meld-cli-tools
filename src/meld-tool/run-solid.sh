# Run solid server in test mode

pushd ~/solid

source ~/.nvm/nvm.sh
source ~/.nvm/bash_completion
DEBUG=solid:* ./node_modules/solid-server/bin/solid-test start

popd

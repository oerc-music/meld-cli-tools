# Set up envronment for running meld_tool.js under node.js

source ~/.nvm/nvm.sh
source ~/.nvm/bash_completion

export SOLID_CERTS=~/solid-certs
export NODE_EXTRA_CA_CERTS=$SOLID_CERTS/localhost.crt
export NODE_TLS_REJECT_UNAUTHORIZED=0
export ASD_TOOL_DIR="$(pwd)/"
export ASD_TOOL="${MELD_TOOL_DIR}asd_tool_cli.js"


[ -s ~/.meld_tool/solid_auth.sh ] && source ~/.meld_tool/solid_auth.sh

echo "Use 'node \$ASD_TOOL ...' to run Automatic Semantic Descriptor tool"

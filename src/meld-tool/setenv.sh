# Set up envronment for running meld_tool.js under node.js

source ~/.nvm/nvm.sh
source ~/.nvm/bash_completion

export SOLID_CERTS=~/solid-certs
export NODE_EXTRA_CA_CERTS=$SOLID_CERTS/localhost.crt
export NODE_TLS_REJECT_UNAUTHORIZED=0
export MELD_TOOL_DIR="$(pwd)/"
export MELD_TOOL="${MELD_TOOL_DIR}meld_tool_cli.js"
export SOFA_TOOL="${MELD_TOOL_DIR}sofa_tool_cli.js"
export WS_TOOL="${MELD_TOOL_DIR}ws_tool_cli.js"


[ -s ~/.meld_tool/solid_auth.sh ] && source ~/.meld_tool/solid_auth.sh

echo "Use 'node \$MELD_TOOL ...' to run MELD tool"
echo "    'node \$SOFA_TOOL ...' to run SOFA tool"

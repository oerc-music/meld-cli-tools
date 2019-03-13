## Install recent version of node.js

(See [20190208-solid-server-install-run.md](./20190208-solid-server-install-run.md).)


## Install meld_tool

Go to a suitable working directory.

Clone git repository:

    git clone git@github.com:oerc-music/meld-cli-tools.git

or, using HTTPS instread of SSH:

    git clone https://github.com/oerc-music/meld-cli-tools.git

Go to `meld_tool` directory:

    cd meld-cli-tools/src/meld_tool

Install dependencies:

    npm install commander
    npm install axios
    npm install rdflib
    npm install stream
    npm install @solid/cli

Run meld_tool:

    node meld_tool.js --help


## Check out meld_tool

With solid server in non-multi-user mode, the base container is at https://localhost:8443/public/

I found I also needed:

    export NODE_PATH=$HOME/.nvm/versions/node/v10.15.0/lib/node_modules/

This command tests authentication with the Solid server:

    node meld_tool.js test-login \
        --provider=https://localhost:8443 \
        --username=**** --password=****

For a list of available commands:

    node meld_tool.js --help

See [test-add-annotation.sh][../src/meld-tool/test-add-annotation.sh] for more examples of meld_tool command usage.

@@TODO: more examples and testing pointers


## meld_tool environment variables

```
export MELD_USERNAME=(login username)
export MELD_PASSWORD=(login password)
export MELD_IDPROVIDER=https://localhost:8443  # OpenID connect identity provider
```

These values can be provided on the command line:

```
  -u, --username <username>
        Username for authentication 
        (overrides MELD_USERNAME environment variable)
  -p, --password <password>
        Password for authentication 
        (overrides MELD_PASSWORD environment variable)
  -i, --provider <provider>
        Identity provider for authentication 
        (overrides MELD_IDPROVIDER environment variable)
```


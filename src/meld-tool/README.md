# Command line tool(s) for accessing MELD/LDP containers

## TODO

- [x] environment variables for credentials
- [x] finish off "create-workset" implementation
- [x] revisit "show-container" implementation
- [x] "list-container" implementation
    - [ ] Fix problem when attempting to do ls on simple text resource
      - 'ls' command triggers solid internal server error trying to convert RDF :

        solid:handlers GET -- Reading /Users/graham/solid/data/public/test_resource.txt +0ms
        solid:get error translating: /public/test_resource.txt text/plain -> text/turtle -- 500 Don't know how to parse text/plain yet +1ms
        solid:server Error page because of: { [HTTPError: Error translating between RDF formats]
        name: 'HTTPError',
        message: 'Error translating between RDF formats',
        status: 500 } +0ms


- [x] complete refactoring of "create-workset"/"add-fragment" common code
- [X] "add-resource" implentation
- [x] "show-resource" implementation
- [x] "remove-resource" implementation
- [x] "add-fragment" implementation

- [x] "test-text-resource" implementation
- [x] "test-rdf-resource" implementation
- [ ] "test-is-container" implemenation

- [ ] "create-annotation-container" implementation
- [ ] "show-annotation-container" implementation
- [ ] "delete-annotation-container" implementation
- [x] "create-annotation" implementation
- [ ] "show-annotation" implementation
- [ ] "delete-annotation" implementation

- [.] Test suite

- [ ] default for author when creating a workset/container/annotation (how?)
    - see environment $NAME (MacOS only?) / $USER
    - Linux: `getent passwd "$USER" | cut -d ':' -f 5 | cut -d ',' -f 1`

## Prerequisites

    npm install commander
    npm install axios
    npm install rdflib
    npm install @solid/cli

## Running `meld_tool.js`

Try:

    node meld_tool.js --help

### Basic usage

(The command help output has been lightly reformatted here.  Some of the descriptive text could be better.)

```
$ node meld_tool.js --help
Usage: meld_tool [options] <sub-command> [args]

Options:
  -V, --version                                                     
        output the version number
  -a, --author <author>                                             
        Author name of container or entry created
  -b, --baseurl <baseurl>                                           
        LDP server base URL
  -s, --stdinurl <stdinurl>                                         
        Standard input data base URL
  -u, --username <username>                                         
        Username for authentication (overrides MELD_USERNAME environment variable)
  -p, --password <password>                                         
        Password for authentication (overrides MELD_PASSWORD environment variable)
  -i, --provider <provider>                                         
        Identity provider for authentication (overrides MELD_IDPROVIDER environment variable)
  -l, --literal <data>                                              
        Provide data literal(s) as alternative to input (default: [])
  -d, --debug                                                       
        Generate additional progress or diagnostic output to stderr
  -v, --verbose                                                     
        Generate more verbose output to stdout
  -h, --help                                                        
        output usage information

Commands:
  help [cmd]
  full-url                                                          
        Write fully qualified URL to stdout.
  list-container|ls <container_url>                                 
        List contents of container to stdout.
  show-resource|sh <resource_url>                                   
        Write resource content to stdout.
  remove-resource|rm <resource_url>                                 
        Remove resource from container.
  create-workset|crws <container_url> <workset_name>                
        Create working set and write URI to stdout.
  add-fragment|adfr <workset_url> <fragment_url> <fragment_name>    
        Add fragment to working set and write fragment URI to stdout.
  add-annotation|adan <container_url> <target> <body> <motivation>  
        Add annotation to a container, and write allocated URI to stdout.
  test-login                                                        
        Test login credentials and return access token.
  test-text-resource <resource_url> [expect_ref]                    
        Test resource contains text in data (or --literal values).
  test-rdf-resource <resource_url> [expect_ref]                     
        Test resource contains RDF statements (or --literal values).
```

### Examples

In the MELD tools directory:

    export NODE_EXTRA_CA_CERTS=$SOLID_CERTS/localhost.crt
    export NODE_TLS_REJECT_UNAUTHORIZED=0

    node meld_tool.js test-login \
        --provider=https://localhost:8443 \
        --username=gklyne --password=****

    node meld_tool.js create-workset https://localhost:8443/ wstest

(Are any of the above exports necessary?  I think that, if they're needed, it's for running solid-server.  Maybe just the first is needed?)

See also:

- src/meld-tool/setenv.sh
- src/meld-tool/remove-all.sh
- src/meld-tool/recursive-remove-all.sh
- src/meld-tool/test-add-annotation.sh


## Other notes

### Getting syntax errors?

Try this:0

    . ~/.nvm/nvm.sh
    . ~/.nvm/bash_completion

Longer version:

These scripts require a more recent version of node than comes by default with MacOS El Capitan.  Use 'nvm' to work with alternative versions of node.

The following command installs `nvm`:

    curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash

To activate `nvm`, use:

    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

or just:

    . ~/.nvm/nvm.sh
    . ~/.nvm/bash_completion

To use `nvm` to install a recent version of node, use some combination of the following:

    nvm
    nvm install latest
    nvm ls-remote
    nvm install v10.15.0
    node -v


### Localhost certs

See: https://blog.filippo.io/mkcert-valid-https-certificates-for-localhost/

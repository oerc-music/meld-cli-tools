# Command line tool(s) for accessing MELD/LDP containers

## TODO

- [x] environment variables for credentials
- [x] finish off "make-workset" implementation
- [x] revisit "show-container" implementation
- [x] "list-container" implementation
- [x] complete refactoring of "make-workset"/"add-fragment" common code
- [x] "add-resource" implentation
- [x] "show-resource" implementation
- [x] "remove-resource" implementation
- [x] "add-fragment" implementation

- [x] "test-text-resource" implementation
- [x] "test-rdf-resource" implementation
- [x] "test-is-container" implemenation
- [x] "content-type" implementation
- [x] "make-container" (not workset) implementation

- [x] "make-annotation-container" implementation
- [x] "show-annotation-container" implementation
- [x] "remove-annotation-container" implementation
- [x] "make-annotation" implementation
- [x] "show-annotation" implementation
- [x] "remove-annotation" implementation

- [x] Complete test suite for above

- [ ] Look at more SOFA-specific capabilities (e.g. match services)
- [ ] Refactor to separate generic LDP, generic annotaton, generic MELD, and SOFA-spoecific options.
- [ ] Rationalize commands (?)

- [x] default for author when creating a workset/container/annotation? (how?)
    - see environment $NAME (MacOS only?) / $USER
    - Linux: `getent passwd "$USER" | cut -d ':' -f 5 | cut -d ',' -f 1`
    - Currently relying on environment variable set in `$HOME/.meld-tool/solid-auth.sh`

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
  -x, --body-inline
        Include annotation body content in annotation data.
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
  make-resource|mk <container_url> <resource_name> <content_type> [content_ref]  
        Create resource with specified type and content
  show-resource|sh <resource_url>                                                
        Write resource content to stdout.
  show-resource-rdf|shrdf <resource_url>                                         
        Write resource content interpreted as RDF to stdout.
  remove-resource|rm <resource_url>                                              
        Remove resource from container.
  content-type|ct <resource_url>                                                 
        Write resource content-type to stdout.
  make-container|mkco <parent_url> <container_name>                              
        Create empty container and write URI to stdout.
  make-workset|mkws <container_url> <workset_name>                               
        Create working set and write URI to stdout.
  add-fragment|adfr <workset_url> <fragment_url> <fragment_name>                 
        Add fragment to working set and write fragment URI to stdout.
  make-annotation-container|mkac <parent_url> <container_name>                   
        Create empty annotation container and write URI to stdout.
  show-annotation-container|lsan <container_url>                                 
        List contents of annotation container to stdout.
  add-annotation|adan <container_url> <target> <body> <motivation>               
        Add annotation to a container, and write allocated URI to stdout. (old command)
  make-annotation|mkan <container_url> <target> <body> <motivation>              
        Make annotation and add to a container, and write allocated URI to stdout.
  show-annotation|shan <annotation_url>                                          
        Show annotation (interpreted as RDF) to stdout.
  remove-annotation|rman <annotation_url>                                        
        Remove annotation from container.
  test-login                                                                     
        Test login credentials and return access token.
  test-text-resource <resource_url> [expect_ref]                                 
        Test resource contains text in data (or --literal values).
  test-rdf-resource <resource_url> [expect_ref]                                  
        Test resource contains RDF statements (or --literal values).
  test-is-container <resource_url>                                               
        Test resource is a container (non-zero exit status if not).
  test-is-annotation <resource_url>                                              
        Test resource is an annotation (non-zero exit status if not).
```

### Examples

In the MELD tools directory:

    export NODE_EXTRA_CA_CERTS=$SOLID_CERTS/localhost.crt
    export NODE_TLS_REJECT_UNAUTHORIZED=0

    node meld_tool.js test-login \
        --provider=https://localhost:8443 \
        --username=gklyne --password=****

    node meld_tool.js make-workset https://localhost:8443/ wstest

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

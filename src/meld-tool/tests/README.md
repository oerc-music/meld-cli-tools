# Test suite for meld-tool.js

Alternative plans for test environment: 

- shell scripts or Javascript driver or Javascript-spawned commands
- shell scripts are easy to start, but could get harder to maintain
- Javascript driver needs way to capture stdout and exit status (note calls to exit())
    - https://github.com/BlueOtterSoftware/capture-stdout/blob/master/capture-stdout.js

Currently going with shell scripts running command line tool, and checking output and/or return status

.
## Tests

@@@
  add-fragment|adfr <workset_url> <fragment_url> <fragment_name>    
        Add fragment to working set and write fragment URI to stdout.
  add-annotation|adan <container_url> <target> <body> <motivation>  
        Add annotation to a container, and write allocated URI to stdout.
  test-text-resource <resource_url> [expect_ref]                    
        Test resource contains text in data (or --literal values).
  test-rdf-resource <resource_url> [expect_ref]                     
        Test resource contains RDF statements (or --literal values).
@@@


- [x] Set up test environment
- [x] Test help
- [x] Test URL resolution
- [x] Test create workset
- [ ] Test text resource content testing
- [ ] Test RDF resource content testing
- [ ] Test show workset resource
- [ ] Test list empty container content
- [ ] Test fragment creation, access and removal
- [ ] Test annotation creation, access and removal

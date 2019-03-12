# Test suite for meld-tool.js

@@@ 
Need plan for test envirobnment: 
- shell scripts or Javascript driver or Javascript-spawned commands
- shell scripts are easy to start, but could get harder to maintain
- Javascript driver needs way toi capture srdout and exit status (note calls to exit())
    - https://github.com/BlueOtterSoftware/capture-stdout/blob/master/capture-stdout.js
    - 


## Tests

@@@
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
@@@


- [ ] Set up test environment
- [ ] Test URL resolution
- [ ] Test create workset
- [ ] Test show workset resource
- [ ] Test list empty container content
- [ ] 


#!/usr/bin/env node

'use strict';

/**
 *  Try this command:
 *      meld-tool --help
 */

/**
 *  Module dependencies.
 */

const axios       = require('axios');
const rdf         = require('rdflib');
const stream      = require('stream');
const websocket   = require('ws');
const LinkHeader  = require('http-link-header');

// See https://github.com/jeff-zucker/solid-file-client/blob/master/lib/solid-shell-client.js
const SolidClient     = require('@solid/cli/src/SolidClient');
const IdentityManager = require('@solid/cli/src/IdentityManager');

//  ===================================================================
//
//  Various constant values
//
//  ===================================================================

const   LDP_BASIC_CONTAINER = "http://www.w3.org/ns/ldp#BasicContainer";
exports.LDP_BASIC_CONTAINER = LDP_BASIC_CONTAINER

const   LDP_RESOURCE        = "http://www.w3.org/ns/ldp#Resource";
exports.LDP_RESOURCE        = LDP_RESOURCE

// https://stackoverflow.com/questions/1101957/are-there-any-standard-exit-status-codes-in-linux
const EXIT_STS =
    {
        SUCCESS:        0,      // Success
        GENERAL_FAIL:   1,      // Unspecified error
        COMMAND_ERR:    2,      // Command usage error
        NOT_FOUND:      3,      // HTTP 404, etc.
        PERMISSION:     4,      // No permission for operation
        REDIRECT:       5,      // Redirect
        NOT_CONTAINER:  6,      // Not a container
        NOT_ANNOTATION: 7,      // Not an annotation
        TIMEOUT:        8,      // Timed out waiting for response
        HTTP_ERR:       9,      // Other HTTP failure codes
        CONTENT:        10,     // No content match (test case failure)
    }
exports.EXIT_STS = EXIT_STS

var CONFIG =
    {
        debug:      false,
        verbose:    false,
        date:       new Date().toISOString(),
        author:     "(no username)",
        basepod:    "https://localhost:8443/",
        baseurl:    "https://localhost:8443/",
        stdinurl:   "http://currentprocess.localhost/stdin",
    }
exports.CONFIG = CONFIG

//  ===================================================================
//
//  Data for creating containers and other resources
//
//  ===================================================================

const prefixes = `
    @prefix ldp:   <http://www.w3.org/ns/ldp#> .
    @prefix rdf:   <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
    @prefix rdfs:  <http://www.w3.org/2000/01/rdf-schema#> .
    @prefix xsd:   <http://www.w3.org/2001/XMLSchema#> .
    @prefix dc:    <http://purl.org/dc/elements/> .
    @prefix dct:   <http://purl.org/dc/terms/> .
    @prefix oa:    <http://www.w3.org/ns/oa#> .
    @prefix as:    <http://www.w3.org/ns/activitystreams#> .
    @prefix mo:    <http://purl.org/ontology/mo/> .
    @prefix frbr:  <http://purl.org/vocab/frbr/core#> .
    @prefix nin:   <http://numbersintonotes.net/terms#> .
    @prefix ninre: <http://remix.numbersintonotes.net/vocab#> .
    `;

const co_template = `
    <> a ldp:BasicContainer, ldp:Container ;
        dc:author   "@AUTHOR" ;
        dct:created "@CREATED" .
    `;

const ws_template_unused_ = `
    <> a ldp:BasicContainer, ldp:Container , ninre:WorkSet ;
        dc:author   "@AUTHOR" ;
        dct:created "@CREATED" .
    `;

const fr_template_unused_ = `
    <> a ninre:FragmentRef , ldp:Resource ;
      ninre:fragment <@FRAGURI> ;
      dc:creator     "@AUTHOR" ;
      dct:created    "@CREATED" .
      `;

const an_template = `
    <> a oa:Annotation ;
      oa:hasTarget   <@TARGETURI> ;
      oa:hasBody     <@BODYURI> ;
      oa:motivatedBy <@MOTIVATION> .
      `;

// See: https://www.w3.org/TR/annotation-protocol/#container-representations
// AnnotationCollection -> as:OrderedCollection, per anno.jsonld context
const ac_template = `
    <> a ldp:BasicContainer, ldp:Container, as:OrderedCollection ;
      dc:creator     "@AUTHOR" ;
      dct:created    "@CREATED" ;
      dct:modified   "@CREATED" ;
      as:totalItems  "0"^^xsd:nonNegativeInteger ;
      rdfs:label     "Annotation container" .
      `;

const basic_container = `
    <> a ldp:BasicContainer, ldp:Container .
    `;

const basic_annotation = `
    <> a oa:Annotation ;
      oa:hasTarget   _:t ;
      oa:hasBody     _:b ;
      oa:motivatedBy _:m .
    `;

const TEMPLATES =
    {
        prefixes:           prefixes,
        co_template:        co_template,
        an_template:        an_template,
        ac_template:        ac_template,
        basic_container:    basic_container,
        basic_annotation:   basic_annotation,
    }
exports.TEMPLATES = TEMPLATES

//  ===================================================================
//
//  Command dispatch supporting functions
//
//  ===================================================================

exports.collect_multiple = collect_multiple
function collect_multiple(val, option_vals) {
    // Option function used to collect multiple options to list
    option_vals.push(val);
    return option_vals;
}

exports.process_exit = process_exit
function process_exit(exitstatus, exitmessage) {
    // Exit process with supplied status code (and diagnostic message)
    // This function isolates process exit handling, allowing command
    // functions to be called without possibly calling process.exit
    // (see "run_command" below).
    let err = new Error(exitmessage);
    err.name  = 'ExitStatus';
    err.value = exitstatus;
    throw err;
}

exports.process_exit_now = process_exit_now
function process_exit_now(exitstatus, exitmessage) {
        console_debug('ExitStatus: '+exitmessage+' ('+String(exitstatus)+')');
        process.exit(exitstatus);
}

exports.process_wait = process_wait
function process_wait(status, exitmessage) {
    return exitmessage;
}

exports.run_command = run_command
function run_command(do_command) {
    // Wrapper for executing a command function.
    // returns a function that is used by commander.js parser.
    function handle_exit(e) {
        if (e.name === 'ExitStatus') {
            process_exit_now(e.value, e.message)
        }
        throw e;        
    }
    function handle_error(e) {
        let sts = report_error(e);
        process.exit(e);
    }
    function do_cmd(...args) {
        let p = do_command(...args)
            .catch(e => handle_exit(e))
            .catch(e => handle_error(e))
            ;
    }
    return do_cmd;
}

exports.console_debug = console_debug
function console_debug(message, value) {
    // If debug mode selected, logs an error to the console using the 
    // supplied message and value.  Returns the value for the next handler.
    if (CONFIG.debug) {
        if (value === undefined) {
            value = "";
        }
        console.error(message, value);
    }
    return value;
}

exports.get_auth_token = get_auth_token
function get_auth_token(usr, pwd, idp) {
    // Returns a Promise that returns an authentication bearer token,
    // or null if no username is provided.
    //
    // usr      username with which to authenticate (or "-" to skip authentication)
    // pwd      password for given username
    // idp      URL of identity provider that undertakes authentication
    //
    // NOTE: when a bearer token is used with Solid, the audience of the provided 
    // token is checked and rejected if the token was issued for a different 
    // pod or service: this is the role of BASEPOD below.  This is to prevent tokens 
    // issued for access to one pod being stolen and used to access some different
    // pod or service.
    //
    // See:
    // https://github.com/solid/solid-cli/blob/master/bin/solid-bearer-token
    // https://github.com/solid/solid-cli/blob/master/src/SolidClient.js
    //
    // See also: 
    //      https://gitter.im/solid/node-solid-server?at=5c6443fb126af75deb9db87
    //      https://github.com/solid/node-solid-server/issues/1097
    //      https://github.com/solid/node-solid-server/issues/1082
    if (usr && usr !== "-") {
        let url    = CONFIG.basepod;
        let idmgr  = new IdentityManager({});
        let client = new SolidClient({ identityManager: idmgr });
        let ptoken = client.login(idp, {username: usr, password: pwd})
            .then(session => client.createToken(url, session))
            ;
        return ptoken
    } else {
        return Promise.resolve(null)
    }
}

//  ===================================================================
//
//  URL handling functions
//
//  ===================================================================

exports.get_data_url = get_data_url
function get_data_url(data_ref, base_url) {
    if ( !base_url ) {
        base_url = CONFIG.baseurl;
    }
    if (data_ref == "-") {
        return String(new URL(CONFIG.stdinurl, base_url));
    }
    return String(new URL(data_ref, base_url));
}

exports.get_container_url = get_container_url
function get_container_url(cont_ref, base_url) {
    let cont_url = get_data_url(cont_ref, base_url);
    if (!cont_url.endsWith('/')) {
        cont_url += '/';
    }
    return cont_url;
}

exports.url_slug = url_slug
function url_slug(url, default_val) {
    // Extract short identifier from a URI.
    // This is assumed to be in the final non-empty path segment.
    const pathsegs = new URL(url, CONFIG.baseurl).pathname.split('/');
    let filestem = "";
    while (filestem === "" && pathsegs !== []) {
            let filename = pathsegs.pop();
            filestem = filename.split(".")[0];
        }
    if (filestem === "") {
        filestem = default_val;
    }
    return filestem;
}

//  ===================================================================
//
//  RDF parsing and I/O functions
//
//  ===================================================================

exports.parse_rdf = parse_rdf
function parse_rdf(stream_data, content_type, base_url) {
    // Returns RDF graph for supplied data stream and content type
    let graph = rdf.graph()
    rdf.parse(stream_data, graph, base_url, content_type);
    return graph;
}

exports.get_node_URI = get_node_URI
function get_node_URI(node) {
    // Return URI from graph node value, or undefined if not a URI node
    if (node && node.termType === "NamedNode") {
        return node.value
    }
    return undefined
}

exports.get_stream_data = get_stream_data
function get_stream_data(data_stream) {
    // Return promise with all data from a stream
    //
    // See: https://stackoverflow.com/questions/51108976/
    return new Promise((f_resolve, f_reject) => {
        let chunks = [];
        data_stream.on('readable', 
            () => {
                let chunk = data_stream.read();
                // Note: now readable until `null` seen
                while (chunk !== null) {
                    chunks.push(chunk);
                    chunk = data_stream.read();
                } 
            });
        data_stream.on('end',
            () => {
                // All data seen: join and return concatenated chunks
                // (assuming more efficient to do concatenation all at once)
                f_resolve(Buffer.concat(chunks).toString());
            });
    })
}

exports.get_data_sequence = get_data_sequence
function get_data_sequence(literal, data_ref, content_type) {
    // Retrieve data refererenced by command line argument, and 
    // returns promise of data as byte or character sequence.
    //
    // "-" indicates data should be returned from stdin, otherwise is
    // URL for accessing required data.
    let stream_data = null;
    if (Array.isArray(literal) && (literal.length !== 0)) {
        let inputstream = new stream.Readable();
        literal.forEach(item => inputstream.push(item+"\n"));
        inputstream.push(null);  // No more data
        stream_data = get_stream_data(inputstream);
    } else if (data_ref === "-") {
        stream_data = get_stream_data(process.stdin);
    } else {
        // See: https://github.com/axios/axios#axios-api
        let data_url     = get_data_url(data_ref);
        let axios_config = {
            method:         'get',
            url:            data_url,
            responseType:   'stream'
        }
        if (content_type) {
            axios_config["headers"] = { "Accept": content_type };
        }
        stream_data = axios(axios_config)
            .then(response => get_stream_data(response.data))
            ;
    }
    return stream_data;
}

exports.get_data_graph = get_data_graph
function get_data_graph(literal, data_ref, content_type, data_url) {
    // Get RDF graph for resource referenced by command line argument 'data_ref'
    let p = get_data_sequence(literal, data_ref, content_type)
        .then(stream_data => parse_rdf(stream_data, content_type, data_url))
        ;
    return p;
}

exports.ldp_request = ldp_request
function ldp_request(token, add_headers={}) {
    // Returns an Axios instance which can be used to intiate asynchronous
    // HTTP requests, with default values supplied for accessing a Solid/LDP
    // service.
    //
    // token    if provided and non-null, is an authentication bearer token that
    //          is sent with the HTTP request.
    //
    // See: https://github.com/axios/axios#creating-an-instance
    let config = 
        { baseURL: CONFIG.baseurl
        , timeout: 2000
        , headers: add_headers
        };
    if (token) {
        config.headers["Authorization"] = "Bearer "+token;
    }
    return axios.create(config);
}

exports.ldp_request_rdf = ldp_request_rdf
function ldp_request_rdf(token) {
    // console.error("ldp_request_rdf: token ", token)
    // Returns Axios instance that negotiates for RDF data
    return ldp_request(token, {"Accept": "text/turtle"});
}

exports.get_container_content_urls = get_container_content_urls
function get_container_content_urls(response, container_ref) {
    // console.log(response.data);
    console_debug("get_container_content_urls: %s", container_ref);
    let container_uri   = get_container_url(container_ref);
    let container_graph = rdf.graph();
    rdf.parse(
        response.data, container_graph, container_uri, response.headers["content-type"]
        );
    let container_contents = container_graph.each(
        rdf.sym(container_uri),
        rdf.sym('http://www.w3.org/ns/ldp#contains'),
        undefined);
    var content_uris = container_contents.map(get_node_URI)
    return content_uris;
}

exports.create_resource = create_resource
function create_resource(container_url, headers, resource_data, auth_params) {
    // Create resource in specified container
    //
    // container_url    URL of container
    // headers          Object with headers to include in POST request.
    //                  Notably, specifies content-type, slug and type
    //                  link for new resource
    // resource_data    Data reprtesenting resource to be added.
    // 
    // Returns a promise for the location (URL) of the created resource
    //
    if (CONFIG.verbose) {
        console.log("post_data: headers:");
        console.log(headers);
        console.log("post_data: resource_data:");
        console.log(resource_data);
    }
    //  Post to supplied LDP container URI to create container
    let p = get_auth_token(...auth_params)
        .then(token    => ldp_request(token).post(
            container_url, resource_data, {"headers": headers}
            ))
        .then(response => show_response_status(response))
        .then(response => check_status(response))
        .then(response => extract_header(response, "location"))
        .then(location => console_debug("post_data: created %s", location))
        ;
    return p;
}

exports.update_resource = update_resource
function update_resource(resource_url, headers, resource_data, auth_params) {
    // Create resource in specified container
    //
    // resource_url     URL of resource
    // headers          Object with headers to include in POST request.
    //                  Notably, specifies content-type, slug and type
    //                  link for new resource
    // resource_data    Data reprtesenting resource to be added.
    // 
    // Returns a promise for the location (URL) of the created resource
    //
    if (CONFIG.verbose) {
        console.log("put_data: headers:");
        console.log(headers);
        console.log("put_data: resource_data:");
        console.log(resource_data);
    }
    //  Put to supplied resource URI to iupdate resource content
    let p = get_auth_token(...auth_params)
        .then(token    => ldp_request(token).put(
            resource_url, resource_data, {"headers": headers}
            ))
        .then(response => show_response_status(response))
        .then(response => check_status(response))
        .then(()       => console_debug("put_data: updated %s", resource_url))
        ;
    return p;
}

exports.make_empty_container = make_empty_container
function make_empty_container(parent_url, coname, template, auth_params) {
    let container_body = template
        .replace(/@AUTHOR/g,  CONFIG.author)
        .replace(/@CREATED/g, CONFIG.date)
        ;
    let container_data = TEMPLATES.prefixes + container_body;
    let header_data = {
        "content-type": 'text/turtle',
        "link":         `<${LDP_BASIC_CONTAINER}>; rel="type"`,
        "slug":         coname,
    }
    return create_resource(parent_url, header_data, container_data, auth_params);
}

exports.remove_container = remove_container
function remove_container(container_url, auth_params) {
    let ldp_axios = null;
    function recursive_remove(container_url) {
        console_debug("recursive_remove: %s", container_url);
        let p1 = ldp_axios.get(container_url)
            .then(response => get_container_content_urls(response, container_url))
            .then(urls     => Promise.all(urls.map( u => ldp_axios.head(u) // Be aware: https://github.com/solid/node-solid-server/issues/454
                // One promnise for each URL in container...            
                .then(response => 
                    ( response_has_link(response, "type", "http://www.w3.org/ns/ldp#Container") 
                        ? recursive_remove(u) 
                        : ldp_axios.delete(u)
                    ))
                ))
            )
            .then(ps       => ldp_axios.delete(container_url))
        return p1
        }
    console_debug("remove_container: %s", container_url);
    let p = get_auth_token(...auth_params)
        .then(token  => ldp_request_rdf(token))
        .then(axios  => { ldp_axios = axios })
        .then(()     => recursive_remove(container_url))
   return p;
}

//  ===================================================================
//
//  Result display and diagnostic functions
//
//  ===================================================================

exports.report_error = report_error
function report_error(error, exit_msg) {
    // Reports an error and triggers process exit with error
    let status = EXIT_STS.GENERAL_FAIL;
    if (error.response) {
        // Request errors:
        // Short summary for common cases
        console.error(error.response.status+": "+error.response.statusText);
        if ( error.response.status == 404 ) {
            status = EXIT_STS.NOT_FOUND;
        } else if ( [401,402,403].includes(error.response.status) ) {
            status = EXIT_STS.PERMISSION;
        } else if ( error.response.status === 409 ) {
            console.error("Attempt to remove non-empty container?");
        } else if ( [301,302,303,307].includes(error.response.status) ) {
            console.error("Redirect to %s", error.response.headers["location"]);
            status = EXIT_STS.REDIRECT;
        // Dump request/response headers for others
        } else {
            console.error("Request header:");
            console.error(error.request._header);
            console.error("Response header fields:");
            console.error(error.response.headers);
            }
        status = EXIT_STS.HTTP_ERR;
    } else {
        // General error: print name and message
        console.error(error.name+": "+error.message);
        // This might just be too much information...
        console_debug(error);
    }
    console_debug(error.stack);
    process_exit(status, exit_msg);
}

exports.show_response_status = show_response_status
function show_response_status(response){
    if (CONFIG.debug) {
        console.error(response.status+": "+response.statusText);
        if (response.headers["location"]) {
            console.error("Location: "+response.headers["location"]);
        }
        console.error("Request header:");
        console.error(response.request._header);
        console.error("Response header fields:");
        console.error(response.headers);
    }
    return response;
}

exports.show_response_data = show_response_data
function show_response_data(response) {
    console.log(response.data);
    return response;    
}

exports.show_response_data_rdf = show_response_data_rdf
function show_response_data_rdf(response, resource_url) {
    // let stream_data    = get_stream_data(response.data);
    let content_type   = response.headers["content-type"];
    let full_url       = get_data_url(resource_url);
    let resource_graph = parse_rdf(response.data, content_type, full_url);
    let resource_text  = rdf.serialize(undefined, resource_graph, resource_url, 'text/turtle');
    console.log(resource_text);
    return response;
}

exports.show_response_content_type = show_response_content_type
function show_response_content_type(response) {
    console.log(response.headers["content-type"]);
    return response;    
}

exports.show_container_contents = show_container_contents
function show_container_contents(response, container_ref) {
    // @@TODO: use get_container_content_urls
    // console.log(response.data);
    let container_uri   = get_container_url(container_ref);
    let container_graph = rdf.graph();
    rdf.parse(
        response.data, container_graph, container_uri, response.headers["content-type"]
        );
    let container_contents = container_graph.each(
        rdf.sym(container_uri),
        rdf.sym('http://www.w3.org/ns/ldp#contains'),
        undefined);
    var contents_uris = container_contents.map(get_node_URI)
    contents_uris.forEach(uri => {
        console.log(uri);
    })
    return response;    
}

//  ===================================================================
//
//  Response testing functions
//
//  ===================================================================

exports.check_status = check_status
function check_status(response) {
    // Check HTTP response status; return response or throw error
    let status = response.status;
    if ( (status < 200) || (status >= 300) )
    {
        throw new Error(`Error status ${status}`);
    }
    return response;
}

exports.check_type_turtle = check_type_turtle
function check_type_turtle(response) {
    // Throw error if response content-type is not Turtle
    if (response.headers["content-type"] != "text/turtle") {
        console_debug(response.status+": "+response.statusText);
        console_debug("Response headers: ");
        for (let h in response.headers) {
            console_debug("%s: %s", h, response.headers[h]);
        }
        show_response_status(response);
        throw new Error(`Content-type ${response.headers["content-type"]}`);
    }
    return response;
}

exports.extract_header = extract_header
function extract_header(response, name) {
    return response.headers[name];
}

exports.response_has_link = response_has_link
function response_has_link(response, rel, uri) {
    // Returns true if the supplied response has a link header with the indicated
    // relation and URI.
    //console.log(r.headers.link)
    if (response.headers.link) {
        let links = LinkHeader.parse(response.headers.link);
        //console.log(links)
        for (let link of links.rel(rel)) {
            if (link.uri == uri) {
                return true
            }
        }       
    }
    return false
}

exports.normalize_whitespace = normalize_whitespace
function normalize_whitespace(text) {
    return text.replace(/\s+/g," ").trim()
}

exports.test_data_contains_text = test_data_contains_text
function test_data_contains_text(data, text) {
    console_debug("Expect data:\n%s\n----", text);
    let actual_lines   = data.split(/[\r\n]+/g).map(normalize_whitespace);
    let expect_lines = text.split(/[\r\n]+/g).map(normalize_whitespace);
    let status = EXIT_STS.SUCCESS;
    for (var expect of expect_lines) {
        if (expect !== "") {
            if ( !actual_lines.includes(expect) ) {
                console.error("Line '%s' not found", expect);
                status = EXIT_STS.CONTENT;
            } else {
                console_debug("Line '%s' found", expect);
            }
        }
    }
    return status;
}

exports.test_response_data_text = test_response_data_text
function test_response_data_text(response, expect_lit, expect_ref) {
    // Test response includes specified data
    // Returns promise of exit status code
    console_debug("test_response_data_text %s", [expect_lit, expect_ref])
    let p = get_data_sequence(expect_lit, expect_ref, null)
        .then(text => test_data_contains_text(response.data, text))
        .then(status => { console.error("Exit status: "+status); return status; })
        ;
    return p; 
}

exports.test_data_contains_rdf = test_data_contains_rdf
function test_data_contains_rdf(data, data_url, content_type, expect_graph, expect_url, missing_cb) {
    //  Tests if each statement of `expect_graph` is present in `data`.
    //  Reports an error and returns a non-success status if any is not found.
    console_debug("---- Expect graph: url %s", expect_url);
    console_debug("\n%s\n----", 
        rdf.serialize(undefined, expect_graph, expect_url, 'text/turtle')
        );
    let status       = EXIT_STS.SUCCESS;
    let actual_graph = parse_rdf(data, content_type, data_url);
    console_debug("---- Actual graph: url %s", data_url);
    console_debug("\n%s\n----", 
        rdf.serialize(undefined, actual_graph, "http://data_url", 'text/turtle')
        );
    console_debug("----");
    for (var st of expect_graph.match()) {
        // Treat blank node subject/object as wildcard
        let subj_match = (st.subject.termType == rdf.BlankNode.termType ? null : st.subject);
        let obj_match  = (st.object.termType  == rdf.BlankNode.termType ? null : st.object);
        let st_found = actual_graph.match(subj_match, st.predicate, obj_match, undefined);
        if (!st_found.length) {
            missing_cb(st);
            console_debug("Statement '%s' not found", st.toString());
            status = EXIT_STS.CONTENT;
        } else {
            console_debug("Statement '%s' found", st.toString());
        }
    }
    return status;
}

exports.test_response_data_rdf = test_response_data_rdf
function test_response_data_rdf(response, resource_url, expect_lit, expect_ref) {
    // Test response includes specified RDF statements
    // Returns promise of exit status code
    console_debug("test_response_data_rdf %s", [expect_lit, expect_ref])
    let expect_url = get_data_url(expect_ref);
    let p = get_data_graph(expect_lit, expect_ref, "text/turtle", expect_url)
        .then(expect_graph  => test_data_contains_rdf(
                response.data, resource_url, response.headers["content-type"], 
                expect_graph, expect_url,
                (st => console.error("Statement '%s' not found", st.toString()))
            )
        )
        .then(status => { console.error("Exit status: "+status); return status; })
        ;
    return p; 
}

exports.test_response_is_container = test_response_is_container
function test_response_is_container(response, resource_url) {
    // Test response includes RDF statements characteristic of being a container
    // Returns promise of exit status code
    let expect_data = prefixes + basic_container
    let p = Promise.resolve(parse_rdf(expect_data, "text/turtle", resource_url))
        .then(expect_graph => test_data_contains_rdf(
                response.data, resource_url, response.headers["content-type"], 
                expect_graph, resource_url,
                (st => { return; })
            )
        )
        .then(status => { console.error("Exit status: "+status); return status; })
        ;
    return p; 
}

exports.test_response_is_annotation = test_response_is_annotation
function test_response_is_annotation(response, resource_url) {
    // Test response includes RDF statements characteristic of being an annotation
    // Returns promise of exit status code
    let expect_data = prefixes + basic_annotation;
    console_debug("---- expect_data:\n%s\n----", expect_data);
    let p = Promise.resolve(parse_rdf(expect_data, "text/turtle", resource_url))
        .then(expect_graph => { 
                console_debug("---- expect_graph %s", resource_url) ;
                console_debug("\n%s\n----", 
                    rdf.serialize(undefined, expect_graph, resource_url, 'text/turtle')
                    ) ;
                return expect_graph ; 
            }
        )
        .then(expect_graph => test_data_contains_rdf(
                response.data, resource_url, response.headers["content-type"], 
                expect_graph, resource_url,
                (st => { return; })
            )
        )
        .then(status => { console.error("Exit status: "+status); return status; })
        ;
    return p; 
}


exports.get_websocket_url = get_websocket_url
function get_websocket_url(response) {
    console_debug("response.status %s", response.status)
    console_debug("response.headers %s", String(response.headers) )

    let ws_url = response.headers["updates-via"]
    console_debug("Websocket URL %s", ws_url)
    if ( !ws_url ) {
        throw new Error("No 'Updates-Via' header field in 'OPTIONS' response")
    }
    return ws_url
}

exports.websocket_listen_once = websocket_listen_once
function websocket_listen_once(save_token, ws_url, resource_url) {
    function ws_cancel_wait(ws, listener) {
        ws.removeEventListener('message', listener)
        ws.close(3000+meld.EXIT_STS.TIMEOUT, "Timed out waiting for response message");
        meld.process_exit_now(meld.EXIT_STS.TIMEOUT, "Timed out waiting for response message");
    }
    function exec_notification_promise(resolve, reject) {
        // Callbacks called when event is triggered
        // 'this' is event ws
        // 'arguments' is any arguments supplied by 'emit'
        // e.g. 'data' for message event
        function cb_message(data) {
            console_debug("message: %s", data)
            if (data.startsWith("pub")) {
                resolve(data);
            }
        }
        function cb_error(error) {
            reject(error);
        }
        function cb_close(code, reason) {
            let msg = "websocket closed "+String(code)+": "+reason
            reject(new Error(msg))
        }
        // Called when promise is created
        ws.once('message', cb_message);
        ws.once('error',   cb_error);
        ws.once('close',   cb_close);
        /*let timer = setTimeout(ws_cancel_wait, timeout, ws, message_response);*/
    }
    let ws = new websocket(ws_url);
    ws.once('open',
        function open() {
            let msg_sub = "sub " + resource_url
            console_debug("Subscribe: ", msg_sub)
            ws.send(msg_sub)
        })
    return new Promise(exec_notification_promise);
}

// End.

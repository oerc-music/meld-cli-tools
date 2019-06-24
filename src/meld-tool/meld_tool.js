#!/usr/bin/env node

'use strict';

/**
 *  Try this command:
 *      meld-tool --help
 */

/**
 *  Module dependencies.
 */

const program     = require('commander');
const axios       = require('axios');
const rdf         = require('rdflib');
const stream      = require('stream');

const LinkHeader  = require('http-link-header');

// See https://github.com/jeff-zucker/solid-file-client/blob/master/lib/solid-shell-client.js
const SolidClient     = require('@solid/cli/src/SolidClient');
const IdentityManager = require('@solid/cli/src/IdentityManager');

//  ===================================================================
//
//  Various constant values
//
//  ===================================================================

const LDP_BASIC_CONTAINER = "http://www.w3.org/ns/ldp#BasicContainer";
const LDP_RESOURCE        = "http://www.w3.org/ns/ldp#Resource";

// https://stackoverflow.com/questions/1101957/are-there-any-standard-exit-status-codes-in-linux
const EXIT_SUCCESS        = 0;   // Success
const EXIT_GENERAL_FAIL   = 1;   // Unspecified error
const EXIT_COMMAND_ERR    = 2;   // Command usage error
const EXIT_NOT_FOUND      = 3;   // HTTP 404, etc.
const EXIT_PERMISSION     = 4;   // No permission for operation
const EXIT_REDIRECT       = 5;   // Redirect
const EXIT_NOT_CONTAINER  = 6;   // Not a container
const EXIT_NOT_ANNOTATION = 7;   // Not an annotation
                                 //
const EXIT_HTTP_ERR       = 9;   // Other HTTP failure codes
const EXIT_CONTENT        = 10;  // No content match (test case failure)

/*
 * Use process.env for environment variables.
 * Currently using MELD_USERNAME environment for username (see get_auth_params).
 * @@ See TODO notes in README for more thoughts
 *
 * The following are default values, and should normally be overriden.
 */

var DATE     = "(no current date)";
var AUTHOR   = "(no username)";
var BASEPOD  = "https://localhost:8443/";
var BASEURL  = "https://localhost:8443/";               // May be overriden from command line
var STDINURL = "http://currentprocess.localhost/stdin"  // May be overriden from command line

//  ===================================================================
//
//  Data for creating containers and other resources
//
//  ===================================================================

var prefixes = `
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

var co_template = `
    <> a ldp:BasicContainer, ldp:Container ;
        dc:author   "@AUTHOR" ;
        dct:created "@CREATED" .
    `;

var ws_template = `
    <> a ldp:BasicContainer, ldp:Container , ninre:WorkSet ;
        dc:author   "@AUTHOR" ;
        dct:created "@CREATED" .
    `;

var fr_template = `
    <> a ninre:FragmentRef , ldp:Resource ;
      ninre:fragment <@FRAGURI> ;
      dc:creator     "@AUTHOR" ;
      dct:created    "@CREATED" .
      `;

var an_template = `
    <> a oa:Annotation ;
      oa:hasTarget   <@TARGETURI> ;
      oa:hasBody     <@BODYURI> ;
      oa:motivatedBy <@MOTIVATION> .
      `;

// See: https://www.w3.org/TR/annotation-protocol/#container-representations
// AnnotationCollection -> as:OrderedCollection, per anno.jsonld context
var ac_template = `
    <> a ldp:BasicContainer, ldp:Container, as:OrderedCollection ;
      dc:creator     "@AUTHOR" ;
      dct:created    "@CREATED" ;
      dct:modified   "@CREATED" ;
      as:totalItems  "0"^^xsd:nonNegativeInteger ;
      rdfs:label     "Annotation container" .
      `;

var basic_container = `
    <> a ldp:BasicContainer, ldp:Container .
    `;

var basic_annotation = `
    <> a oa:Annotation ;
      oa:hasTarget   _:t ;
      oa:hasBody     _:b ;
      oa:motivatedBy _:m .
    `;

//  ===================================================================
//
//  Command line parse and dispatch specification
//
//  ===================================================================

program.version('0.1.0')
    .usage("[options] <sub-command> [args]")
    .option("-a, --author <author>",     "Author name of container or entry created")
    .option("-b, --baseurl <baseurl>",   "LDP server base URL")
    .option("-s, --stdinurl <stdinurl>", "Standard input data base URL (for URI reference resolution)")
    .option("-u, --username <username>", "Username for authentication (overrides MELD_USERNAME environment variable)")
    .option("-p, --password <password>", "Password for authentication (overrides MELD_PASSWORD environment variable)")
    .option("-i, --provider <provider>", "Identity provider for authentication (overrides MELD_IDPROVIDER environment variable)")
    .option("-l, --literal <data>",      
        "Provide data literal(s) as alternative to input",
        collect_multiple, []
        )
    .option("-x, --body-inline",         "Include annotation body content in annotation data")
    .option("-d, --debug",               "Generate additional progress or diagnostic output to stderr")
    .option("-v, --verbose",             "Generate more verbose output to stdout")
    // .option('-z, --baz [val]', 'baz [def]', 'def')
    ;

program.command("help [cmd]")
    .action(run_command(do_help))
    ;

program.command("full-url")
    .description("Write fully qualified URL to stdout.")
    .action(run_command(do_full_url))
    ;

program.command("list-container <container_url>")
    .alias("ls")
    .description("List contents of container to stdout.")
    .action(run_command(do_list_container))
    ;

program.command("make-resource <container_url> <resource_name> <content_type> [content_ref]")
    .alias("mk")
    .description("Create resource with specified type and content")
    .action(run_command(do_make_resource))
    ;

program.command("show-resource <resource_url>")
    .alias("sh")
    .description("Write resource content to stdout.")
    .action(run_command(do_show_resource))
    ;

program.command("show-resource-rdf <resource_url>")
    .alias("shrdf")
    .description("Write resource content interpreted as RDF to stdout.")
    .action(run_command(do_show_resource_rdf))
    ;

program.command("remove-resource <resource_url>")
    .alias("rm")
    .description("Remove resource from container.")
    .action(run_command(do_remove_resource))
    ;

program.command("content-type <resource_url>")
    .alias("ct")
    .description("Write resource content-type to stdout.")
    .action(run_command(do_show_content_type))
    ;

program.command("make-container <parent_url> <container_name>")
    .alias("mkco")
    .description("Create empty container and write URI to stdout.")
    .action(run_command(do_make_container))
    ;

program.command("remove-container <container_url>")
    .alias("rmco")
    .description("Remove container and all its contents.")
    .action(run_command(do_remove_container))
    ;

program.command("make-workset <container_url> <workset_name>")
    .alias("mkws")
    .description("Create working set and write URI to stdout.")
    .action(run_command(do_make_workset))
    ;

program.command("add-fragment <workset_url> <fragment_url> <fragment_name>")
    .alias("adfr")
    .description("Add fragment to working set and write fragment URI to stdout.")
    .action(run_command(do_add_fragment))
    ;

program.command("make-annotation-container <parent_url> <container_name>")
    .alias("mkac")
    .description("Create empty annotation container and write URI to stdout.")
    .action(run_command(do_make_annotation_container))
    ;

program.command("show-annotation-container <container_url>")
    .alias("lsan")
    .description("List contents of annotation container to stdout.")
    .action(run_command(do_show_annotation_container))
    ;

program.command("add-annotation <container_url> <target> <body> <motivation>")
    .alias("adan")
    .description("Add annotation to a container, and write allocated URI to stdout. (old command)")
    .action(run_command(do_add_annotation))
    ;

program.command("make-annotation <container_url> <target> <body> <motivation>")
    .alias("mkan")
    .description("Make annotation and add to a container, and write allocated URI to stdout.")
    .action(run_command(do_make_annotation))
    ;

// program.command("list-annotations <container_url>")
//     .alias("lsan")
//     .description("List annotations to stdout.")
//     .action(run_command(do_list_annotations))
//     ;

program.command("show-annotation <annotation_url>")
    .alias("shan")
    .description("Show annotation (interpreted as RDF) to stdout.")
    .action(run_command(do_show_annotation_rdf))
    ;

program.command("remove-annotation <annotation_url>")
    .alias("rman")
    .description("Remove annotation from container.")
    .action(run_command(do_remove_annotation))
    ;

program.command("test-login")
    .description("Test login credentials and return access token.")
    .action(run_command(do_test_login))
    ;

program.command("test-text-resource <resource_url> [expect_ref]")
    .description("Test resource contains text in data (or --literal values).")
    .action(run_command(do_test_text_resource))
    ;

program.command("test-rdf-resource <resource_url> [expect_ref]")
    .description("Test resource contains RDF statements (or --literal values).")
    .action(run_command(do_test_rdf_resource))
    ;

program.command("test-is-container <resource_url>")
    .description("Test resource is a container (non-zero exit status if not).")
    .action(run_command(do_test_is_container))
    ;

program.command("test-is-annotation <resource_url>")
    .description("Test resource is an annotation (non-zero exit status if not).")
    .action(run_command(do_test_is_annotation))
    ;

// program.command("*")
//     .action( (cmd, ...args) => {
//             console.log("Unrecognized command %s", cmd);
//             console.log("Args %s", args);
//         })
//     ;

// error on unknown commands
program.on('command:*', function () {
    console.error(
        'Invalid command: %s\nSee --help for a list of available commands.', 
        program.args.join(' ')
        );
    process.exit(EXIT_COMMAND_ERR);
    // return Promise.resolve(null)
    //     .then(() => process_exit(EXIT_COMMAND_ERR, "Invalid command"))
    //     .catch(errsts => ???)
    //     ;
});

function collect_multiple(val, option_vals) {
    // Option function used to collect multiple options to list
    option_vals.push(val);
    return option_vals;
}


//  ===================================================================
//
//  Various supporting functions
//
//  ===================================================================

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

function run_command(do_command) {
    // Wrapper for executing a command function.
    // returns a function that is used by commander.js parser.
    function handle_exit(e) {
        if (e.name === 'ExitStatus') {
            console_debug('ExitStatus: '+e.message+' ('+String(e.value)+')');
            process.exit(e.value);
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

function console_debug(message, value) {
    // If debug mode selected, logs an error to the console using the 
    // supplied message and value.  Returns the value for the next handler.
    if (program.debug) {
        if (value === undefined) {
            value = "";
        }
        console.error(message, value);
    }
    return value;
}

function get_config() {
    // This is a placeholder, obtaining values from command line options.
    // Subsequent developments may access a configuration file
    // and extract an initial default configuration from that.
    //
    // See also: https://nodejs.org/api/process.html#process_process_env
    DATE = new Date().toISOString();
    if (program.author) {
        AUTHOR   = program.author;
    } 
    if (program.baseurl) {
        BASEURL  = program.baseurl;
    }
    if (program.stdinurl) {
        STDINURL = program.stdinurl;
    }
}

function get_auth_params() {
    // Returns array [usr, pwd, idp] of authentication parameters
    let usr = program.username || process.env.MELD_USERNAME   || "";
    let pwd = program.password || process.env.MELD_PASSWORD   || "";
    let idp = program.provider || process.env.MELD_IDPROVIDER || BASEPOD;
    return [usr, pwd, idp];    
}

function parse_rdf(stream_data, content_type, base_url) {
    // Returns RDF graph for supplied data stream and content type
    let graph = rdf.graph()
    rdf.parse(stream_data, graph, base_url, content_type);
    return graph;
}

function get_stream_data(data_stream) {
    // Return promise with all data from stream
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

function get_data_url(data_ref, base_url) {
    if ( !base_url ) {
        base_url = BASEURL;
    }
    if (data_ref == "-") {
        return String(new URL(STDINURL, base_url));
    }
    return String(new URL(data_ref, base_url));
}

function get_container_url(cont_ref, base_url) {
    let cont_url = get_data_url(cont_ref, base_url);
    if (!cont_url.endsWith('/')) {
        cont_url += '/';
    }
    return cont_url;
}

function get_data_sequence(data_ref, content_type) {
    // Retrieve data refererenced by command line argument, and 
    // returns promise of data as byte or character sequence.
    //
    // "-" indicates data should be returned from stdin, otherwise is
    // URL for accessing required data.
    let stream_data = null;
    if (Array.isArray(program.literal) && (program.literal.length !== 0)) {
        let inputstream = new stream.Readable();
        program.literal.forEach(item => inputstream.push(item+"\n"));
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

function get_data_graph(data_ref, data_url, content_type) {
    let p = get_data_sequence(data_ref, content_type)
        .then(stream_data => parse_rdf(stream_data, content_type, data_url))
        ;
    return p;
}

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
        let url = BASEPOD;
        let idmgr  = new IdentityManager({});
        let client = new SolidClient({ identityManager: idmgr });
        let ptoken = client.login(idp, {username: usr, password: pwd})
            .then(session => client.createToken(url, session))
            ;
        // if (program.debug) {
        //     ptoken.then(token => console.error("Using token: %s", token))
        // }
        return ptoken
    } else {
        return Promise.resolve(null)
    }
}

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
        { baseURL: BASEURL
        , timeout: 2000
        , headers: add_headers
        };
    if (token) {
        config.headers["Authorization"] = "Bearer "+token;
    }
    return axios.create(config);
}

function ldp_request_rdf(token) {
    // console.error("ldp_request_rdf: token ", token)
    // Returns Axios instance that negotiates for RDF data
    return ldp_request(token, {"Accept": "text/turtle"});
}

function show_response_status(response){
    if (program.debug) {
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

function show_response_data(response) {
    console.log(response.data);
    return response;    
}

function show_response_data_rdf(response, resource_url) {
    // let stream_data    = get_stream_data(response.data);
    let content_type   = response.headers["content-type"];
    let full_url       = get_data_url(resource_url);
    let resource_graph = parse_rdf(response.data, content_type, full_url);
    let resource_text  = rdf.serialize(undefined, resource_graph, resource_url, 'text/turtle');
    console.log(resource_text);
    return response;
}

function show_response_content_type(response) {
    console.log(response.headers["content-type"]);
    return response;    
}

function get_node_URI(node) {
    // Return URI from graph node value, or undefined if not a URI node
    if (node && node.termType === "NamedNode") {
        return node.value
    }
    return undefined
}

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

function create_resource(container_url, headers, resource_data) {
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
    if (program.verbose) {
        console.log("post_data: headers:");
        console.log(headers);
        console.log("post_data: resource_data:");
        console.log(resource_data);
    }
    //  Post to supplied LDP container URI to create container
    let p = get_auth_token(...get_auth_params())
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

function remove_container(container_url) {
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
    let p = get_auth_token(...get_auth_params())
        .then(token  => ldp_request_rdf(token))
        .then(axios  => { ldp_axios = axios })
        .then(()     => recursive_remove(container_url))
   return p;
}

function report_error(error, exit_msg) {
    // Reports an error and triggers process exit with error
    let status = EXIT_GENERAL_FAIL;
    if (error.response) {
        // Request errors:
        // Short summary for common cases
        console.error(error.response.status+": "+error.response.statusText);
        if ( error.response.status == 404 ) {
            status = EXIT_NOT_FOUND;
        } else if ( [401,402,403].includes(error.response.status) ) {
            status = EXIT_PERMISSION;
        } else if ( error.response.status === 409 ) {
            console.error("Attempt to remove non-empty container?");
        } else if ( [301,302,303,307].includes(error.response.status) ) {
            console.error("Redirect to %s", error.response.headers["location"]);
            status = EXIT_REDIRECT;
        // Dump request/response headers for others
        } else {
            console.error("Request header:");
            console.error(error.request._header);
            console.error("Response header fields:");
            console.error(error.response.headers);
            }
        status = EXIT_HTTP_ERR;
    } else {
        // General error: print name and message
        console.error(error.name+": "+error.message);
        // This might just be too much information...
        console_debug(error);
    }
    console_debug(error.stack);
    process_exit(status, exit_msg);
}

function check_status(response) {
    // Check HTTP response status; return response or throw error
    let status = response.status;
    if ( (status < 200) || (status >= 300) )
    {
        throw new Error(`Error status ${status}`);
    }
    return response;
}

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

function extract_header(response, name) {
    return response.headers[name];
}

function url_slug(url, default_val) {
    // Extract short identifier from a URI.
    // This is assumed to be in the final non-empty path segment.
    const pathsegs = new URL(url, BASEURL).pathname.split('/');
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

function normalize_whitespace(text) {
    return text.replace(/\s+/g," ").trim()
}

function test_data_contains_text(data, text) {
    console_debug("Expect data:\n%s\n----", text);
    let actual_lines   = data.split(/[\r\n]+/g).map(normalize_whitespace);
    let expect_lines = text.split(/[\r\n]+/g).map(normalize_whitespace);
    let status = EXIT_SUCCESS;
    for (var expect of expect_lines) {
        if (expect !== "") {
            if ( !actual_lines.includes(expect) ) {
                console.error("Line '%s' not found", expect);
                status = EXIT_CONTENT;
            } else {
                console_debug("Line '%s' found", expect);
            }
        }
    }
    return status;
}

function test_response_data_text(response, data_ref) {
    // Test response includes specified data
    // Returns promise of exit status code
    let p = get_data_sequence(data_ref)
        .then(text => test_data_contains_text(response.data, text))
        .then(status => { console.error("Exit status: "+status); return status; })
        ;
    return p; 
}

function test_data_contains_rdf(data, data_url, content_type, expect_graph, expect_url, missing_cb) {
    //  Tests if each statement of `expect_graph` is present in `data`.
    //  Reports an error and returns a non-success status if any is not found.
    console_debug("---- Expect graph: url %s", expect_url);
    console_debug("\n%s\n----", 
        rdf.serialize(undefined, expect_graph, expect_url, 'text/turtle')
        );
    let status       = EXIT_SUCCESS;
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
            status = EXIT_CONTENT;
        } else {
            console_debug("Statement '%s' found", st.toString());
        }
    }
    return status;
}

function test_response_data_rdf(response, resource_url, expect_ref) {
    // Test response includes specified RDF statements
    // Returns promise of exit status code
    let expect_url = get_data_url(expect_ref);
    let p = get_data_graph(expect_ref, expect_url, "text/turtle")
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

//  ===================================================================
//
//  Command-dispatch functions
//
//  ===================================================================

function do_help(cmd) {
    let helptext = [
        "meld-tool make-workset <container_url> <workset_name>",
        "meld-tool add-fragment <workset_url> <fragment_url> <fragment_name>",
        // "",
        // "",
    ];
    helptext.forEach(
        (txt) => { console.log(txt); }
        );
    return Promise.resolve(null)
        .then(() => process_exit(EXIT_SUCCESS, "Help OK"))
        ;
}

function do_full_url(data_ref) {
    let full_url = get_data_url(data_ref);
    console.log(full_url);
    return Promise.resolve(null)
        .then(() => process_exit(EXIT_SUCCESS, "Full URL OK"))
        ;
}

function do_test_login() {
    let status = EXIT_SUCCESS;
    get_config();
    let [usr, pwd, idp] = get_auth_params();
    console.error('Test login via %s as %s', idp, usr);
    let p = get_auth_token(usr, pwd, idp)
        .then(token  => { console.log("Bearer %s", token); return token; })
        .catch(error => report_error(error,  "Authentication error"))
        .then(token  => process_exit(status, "Authenticated"))
        ;
    return p;
}

function do_list_container(container_uri) {
    let status = EXIT_SUCCESS;
    get_config();
    console.error('List container %s', container_uri);
    let p = get_auth_token(...get_auth_params())
        .then(token    => ldp_request_rdf(token).get(container_uri)) 
        .then(response => show_response_status(response))
        .then(response => check_status(response))
        .then(response => show_container_contents(response, container_uri))
        .catch(error   => report_error(error,  "List container error"))
        .then(response => process_exit(status, "List container OK"))
        ;
    return p;
}

function do_make_resource(parent_url, resource_name, content_type, content_ref) {
    let status = EXIT_SUCCESS;
    get_config();
    console.error('Create resource %s in container %s', resource_name, parent_url);
    let header_data = {
        "content-type": content_type,
        "slug":         resource_name
    }
    let p = get_data_sequence(content_ref, content_type)
        .then(data     => create_resource(parent_url, header_data, data))
        .then(location => { console.log(location); return location; })
        .catch(error   => report_error(error,  "Create resource error"))
        .then(location => process_exit(status, "Create resource OK"))
        ;
    return p;
}

function do_show_resource(resource_url) {
    let status = EXIT_SUCCESS;
    get_config();
    console.error('Show resource %s', resource_url);
    let p = get_auth_token(...get_auth_params())
        .then(token    => ldp_request(token).get(resource_url)) 
        .then(response => show_response_status(response))
        .then(response => check_status(response))
        .then(response => show_response_data(response))
        .catch(error   => report_error(error,  "Show resource error"))
        .then(response => process_exit(status, "Show resource OK"))
        ;
    return p;
}

function do_show_resource_rdf(resource_url) {
    let status = EXIT_SUCCESS;
    get_config();
    console.error('Show resource RDF %s', resource_url);
    let p = get_auth_token(...get_auth_params())
        .then(token    => ldp_request_rdf(token).get(resource_url)) 
        .then(response => show_response_status(response))
        .then(response => check_status(response))
        .then(response => show_response_data_rdf(response, resource_url))
        .catch(error   => report_error(error,  "Show resource RDF error"))
        .then(response => process_exit(status, "Show resource RDF OK"))
        ;
    return p;
}

function do_remove_resource(resource_uri) {
    let status = EXIT_SUCCESS;
    get_config();
    console.error('Remove resource %s', resource_uri);
    let p = get_auth_token(...get_auth_params())
        .then(token    => ldp_request(token).delete(resource_uri))
        .then(response => show_response_status(response))
        .then(response => check_status(response))
        .catch(error   => report_error(error,  "Remove resource error"))
        .then(response => process_exit(status, "Remove resource OK"))
        ;
    return p;
}

function do_show_content_type(resource_url) {
    let status = EXIT_SUCCESS;
    get_config();
    console.error('Show resource content type %s', resource_url);
    let p = get_auth_token(...get_auth_params())
        .then(token    => ldp_request(token).get(resource_url)) 
        .then(response => show_response_status(response))
        .then(response => check_status(response))
        .then(response => show_response_content_type(response))
        .catch(error   => report_error(error,  "Show resource content type error"))
        .then(response => process_exit(status, "Show resource content type OK"))
        ;
    return p;
}

function do_test_text_resource(resource_url, expect_ref) {
    // Tests that the indicated resource is retrievable as text,
    // and that it contains all the specified lines of text.
    //
    // resource_url     is URL of resource to be tested.
    // rdf_expect_ref     is URL of expected data in textual format, 
    //                  or "-" if expected data is read from stdin.
    //
    get_config();
    console.error('Test resource text %s', resource_url);
    let p = get_auth_token(...get_auth_params())
        .then(token    => ldp_request(token).get(resource_url)) 
        .then(response => show_response_status(response))
        .then(response => check_status(response))
        .then(response => test_response_data_text(response, expect_ref))
        .catch(error   => report_error(error,  "Test resource text error"))
        .then(status   => process_exit(status, "Test resource text"))
        ;
    return p;
}

function do_test_rdf_resource(resource_ref, expect_ref) {
    // Tests that the indicated resource is retrievable as RDF (Turtle)
    // and that the content contains all the specified triples
    //
    // resource_ref     is URL of resource to be tested.
    // expect_ref       is URL of expected RDF data in Turtle format, 
    //                  or "-" if expected data is read from stdin.
    //
    get_config();
    console.error('Test resource RDF %s', resource_ref);
    let resource_url = get_data_url(resource_ref);
    let p = get_auth_token(...get_auth_params())
        .then(token    => ldp_request_rdf(token).get(resource_url)) 
        .then(response => show_response_status(response))
        .then(response => check_status(response))
        .then(response => test_response_data_rdf(response, resource_url, expect_ref))
        .catch(error   => report_error(error,  "Test resource RDF error"))
        .then(status   => process_exit(status, "Test resource RDF"))
        ;
    return p;
}

function do_test_is_container(resource_ref) {
    // Tests that the indicated resource is a container
    //
    // resource_ref     is URL of resource to be tested.
    //
    get_config();
    console.error('Test resource is container %s', resource_ref);
    let resource_url = get_data_url(resource_ref);
    let request_rdf  = null;
    let request_any  = null;
    let save_token   = null;
    let p = get_auth_token(...get_auth_params())
        .then(token    => save_token = token )
        .then(()       => ldp_request(save_token).get(resource_url))
        .then(response => check_type_turtle(response))
        .catch(error   => process_exit(EXIT_NOT_CONTAINER, "Resource is not Turtle"))
        .then(()       => ldp_request_rdf(save_token).get(resource_url))
        .then(response => show_response_status(response))
        .then(response => check_status(response))
        .then(response => test_response_is_container(response, resource_url))
        .catch(error   => process_exit(EXIT_NOT_CONTAINER, "Resource is not a container"))
        .then(status   => process_exit(status, "Resource is container"))
        ;
    return p;
}

function make_empty_container(parent_url, coname, template) {
    let container_body = template
        .replace(/@AUTHOR/g,  AUTHOR)
        .replace(/@CREATED/g, DATE)
        ;
    let container_data = prefixes + container_body;
    let header_data = {
        "content-type": 'text/turtle',
        "link":         `<${LDP_BASIC_CONTAINER}>; rel="type"`,
        "slug":         coname,
    }
    return create_resource(parent_url, header_data, container_data);
}

function do_make_container(parent_url, coname) {
    let status = EXIT_SUCCESS;
    get_config();
    console.error('Create container %s in parent %s', coname, parent_url);
    let p = make_empty_container(parent_url, coname, co_template)
        .then(location => { console.log(location); return location; })
        .catch(error   => report_error(error,  "Make container error"))
        .then(location => process_exit(status, "Make container OK"))
        ;
    return p;
}

function do_remove_container(container_url) {
    let status = EXIT_SUCCESS;
    get_config();
    console.error('Remove container %s and contents', container_url);
    let p = remove_container(container_url)
        .catch(error   => report_error(error,  "Remove container error"))
        .then(()       => process_exit(status, "Remove container OK"))
        ;
    return p;
}

function do_make_workset(parent_url, wsname) {
    let status = EXIT_SUCCESS;
    get_config();
    console.error('Make workset %s in container %s', wsname, parent_url);
    // @@TODO: use make_empty_container
    //  Assemble workset container data
    let container_body = ws_template
        .replace(/@AUTHOR/g,  AUTHOR)
        .replace(/@CREATED/g, DATE)
        ;
    let container_data = prefixes + container_body;
    let header_data = {
        "content-type": 'text/turtle',
        "link":         `<${LDP_BASIC_CONTAINER}>; rel="type"`,
        "slug":         wsname,
    }
    let p = create_resource(parent_url, header_data, container_data)
        .then(location => { console.log(location); return location; })
        .catch(error   => report_error(error,  "Make workset error"))
        .then(location => process_exit(status, "Make workset OK"))
        ;
    return p;
}

function do_add_fragment(workset_url, fragment_ref, fragment_name) {
    let status = EXIT_SUCCESS;
    get_config();
    console.error(
        'Add fragment %s as %s in workset %s', 
        fragment_ref, fragment_name, workset_url
        );

    //  Assemble workset container data
    let fragment_uri  = get_data_url(fragment_ref);
    let fragment_body = fr_template
        .replace(/@FRAGURI/g, fragment_uri)
        .replace(/@AUTHOR/g,  AUTHOR)
        .replace(/@CREATED/g, DATE)
        ;
    let fragment_data = prefixes + fragment_body;
    let header_data = {
        "content-type": 'text/turtle',
        "link":         `<${LDP_RESOURCE}>; rel="type"`,
        "slug":         fragment_name,
    }
    let p = create_resource(workset_url, header_data, fragment_data)
        .then(location => { console.log(location); return location; })
        .catch(error   => report_error(error,  "Add fragment error"))
        .then(location => process_exit(status, "Add fragment OK"))
        ;
    return p;
}

function do_make_annotation_container(parent_url, acname) {
    let status = EXIT_SUCCESS;
    get_config();
    console.error('Create annotation container %s in parent %s', acname, parent_url);
    let p = make_empty_container(parent_url, acname, ac_template)
        .then(location => { console.log(location); return location; })
        .catch(error   => report_error(error,  "Make annotation container error"))
        .then(location => process_exit(status, "Make annotation container OK"))
        ;
    return p;
}

// Currently same as list_container, but may change in future
function do_show_annotation_container(container_uri) {
    let status = EXIT_SUCCESS;
    get_config();
    console.error('Show annotation container %s', container_uri);
    let p = get_auth_token(...get_auth_params())
        .then(token    => ldp_request_rdf(token).get(container_uri)) 
        .then(response => show_response_status(response))
        .then(response => check_status(response))
        .then(response => show_container_contents(response, container_uri))
        .catch(error   => report_error(error,  "Show annotation container error"))
        .then(response => process_exit(status, "Show annotation container OK"))
        ;
    return p;
}

function do_add_annotation(container_url, target_ref, body_ref, motivation_ref) {
    let status = EXIT_SUCCESS;
    get_config();
    let target_uri = target_ref;
    let body_uri   = body_ref;
    let motivation = motivation_ref;
    // let target_uri = get_data_url(target_ref, STDINURL);
    // let body_uri   = get_data_url(body_ref, STDINURL);
    // let motivation = get_data_url(motivation_ref, STDINURL);
    console.error(
        'Add %s annotation %s -> %s in container %s', 
        motivation, target_uri, body_uri, container_url
        );
    //  Assemble annotation data
    let annotation_ref  = 
        url_slug(target_uri, "@target")     + "." + 
        url_slug(motivation, "@motivation") + "." + 
        url_slug(body_uri,   "@body");
    let annotation_url  = get_data_url(annotation_ref);
    let annotation_body = an_template
        .replace("@TARGETURI",  target_uri)
        .replace("@BODYURI",    body_uri)
        .replace("@MOTIVATION", motivation)
        ;
    let annotation_data = prefixes + annotation_body;
    let header_data = {
        "content-type": 'text/turtle',
        "link":         `<${LDP_RESOURCE}>; rel="type"`,
        "slug":         annotation_ref,
    }
    let p = create_resource(container_url, header_data, annotation_data)
        .then(location => { console.log(location); return location; })
        .catch(error   => report_error(error,  "Add annotation error"))
        .then(location => process_exit(status, "Add annotation OK"))
        ;
    return p;
}

// `do_make_annotation`` is like `add_annotation`, except that the body_ref may
// be "-", in which case the annotation body is read from stdin, and may
// be included inline if `--body-inline` option is specified.
// @@TODO: replace `add_annotation` when new logic is settled.
function do_make_annotation(container_url, target_ref, body_ref, motivation_ref) {
    let status = EXIT_SUCCESS;
    get_config();
    let target_uri    = target_ref;
    // let body_uri      = body_ref;
    let motivation    = motivation_ref;
    let body_data_url = get_data_url(body_ref)
    console.error(
        'Add %s annotation %s -> %s(%s) in container %s', 
        motivation, target_uri, body_ref, body_data_url, container_url
        );
    //  Assemble annotation data
    let annotation_ref  = 
        url_slug(target_uri,    "@target")     + "." + 
        url_slug(motivation,    "@motivation") + "." + 
        url_slug(body_data_url, "@body");
    let annotation_body = an_template
        .replace("@TARGETURI",  target_uri)
        .replace("@BODYURI",    body_data_url)
        .replace("@MOTIVATION", motivation)
        ;
    // Create annotation
    let header_data = {
        "content-type": 'text/turtle',
        "link":         `<${LDP_RESOURCE}>; rel="type"`,
        "slug":         annotation_ref,
    }
    let body_data_promise ;
    if (program.bodyInline) {
        body_data_promise = get_data_sequence(body_ref)
            .then(data => "\n" + data)
            ;
    }
    else {
        body_data_promise = Promise.resolve("");
    }
    let p = body_data_promise
        .then(body_data => prefixes + annotation_body + body_data)
        .then(ann_data  => create_resource(container_url, header_data, ann_data))
        .then(location  => { console.log(location); return location; })
        .catch(error    => report_error(error,  "Make annotation error"))
        .then(location  => process_exit(status, "Make annotation OK"))
        ;
    return p;
}

function do_test_is_annotation(resource_ref) {
    // Tests that the indicated resource is an annotation
    //
    // resource_ref     is URL of resource to be tested.
    //
    get_config();
    console.error('Test resource is annotation %s', resource_ref);
    let resource_url = get_data_url(resource_ref);
    let request_rdf  = null;
    let request_any  = null;
    let save_token   = null;
    let p = get_auth_token(...get_auth_params())
        .then(token    => save_token = token )
        .then(()       => ldp_request(save_token).get(resource_url))
        .then(response => check_type_turtle(response))
        .catch(error   => process_exit(EXIT_NOT_ANNOTATION, "Resource is not Turtle"))
        .then(()       => ldp_request_rdf(save_token).get(resource_url))
        .then(response => show_response_status(response))
        .then(response => check_status(response))
        .then(response => test_response_is_annotation(response, resource_url))
        .catch(error   => process_exit(EXIT_NOT_ANNOTATION, "Resource is not a annotation"))
        .then(status   => process_exit(status, "Resource is annotation"))
        ;
    return p;
}

// Currently same as `show_resource_rdf`, but may change
function do_show_annotation_rdf(annotation_url) {
    let status = EXIT_SUCCESS;
    get_config();
    console.error('Show annotation RDF %s', annotation_url);
    let p = get_auth_token(...get_auth_params())
        .then(token    => ldp_request_rdf(token).get(annotation_url)) 
        .then(response => show_response_status(response))
        .then(response => check_status(response))
        .then(response => show_response_data_rdf(response, annotation_url))
        .catch(error   => report_error(error,  "Show annotation RDF error"))
        .then(response => process_exit(status, "Show annotation RDF OK"))
        ;
    return p;
}

// Currently same as `do_remove_resource`, but may change
function do_remove_annotation(annotation_uri) {
    let status = EXIT_SUCCESS;
    get_config();
    console.error('Remove annotation %s', annotation_uri);
    let p = get_auth_token(...get_auth_params())
        .then(token    => ldp_request(token).delete(annotation_uri))
        .then(response => show_response_status(response))
        .then(response => check_status(response))
        .catch(error   => report_error(error,  "Remove annotation error"))
        .then(response => process_exit(status, "Remove annotation OK"))
        ;
    return p;
}

//  ===================================================================
//
//  Main program: analyze and dispatch command line
//
//  ===================================================================

function runmain(argv) {
    program.parse(argv);
}

runmain(process.argv);


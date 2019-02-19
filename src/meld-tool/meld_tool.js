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
// const url         = require('url');

// See https://github.com/jeff-zucker/solid-file-client/blob/master/lib/solid-shell-client.js
const SolidClient     = require('@solid/cli/src/SolidClient');
const IdentityManager = require('@solid/cli/src/IdentityManager');

/*
 * Use process.env for environment variables.
 * Currently using MELD_USERNAME environment for username (see get_auth_params).
 * @@ See TODO notes in README for more thoughts
 *
 * The following are default values, and should normally be overriden.
 */

const LDP_BASIC_CONTAINER = "http://www.w3.org/ns/ldp#BasicContainer"


var DATE    = "(no current date)";
var AUTHOR  = "(no username)";
var BASEPOD = "https://localhost:8443/";
var BASEURL = "https://localhost:8443/";    // May be overriden from command line

/*
 *  Data for creating containers, etc.
 */

var prefixes = `
    @prefix ldp: <http://www.w3.org/ns/ldp#> .
    @prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
    @prefix mo: <http://purl.org/ontology/mo/> .
    @prefix frbr: <http://purl.org/vocab/frbr/core#> .
    @prefix dc: <http://purl.org/dc/elements/> .
    @prefix dct: <http://purl.org/dc/terms/> .
    @prefix nin: <http://numbersintonotes.net/terms#> .
    @prefix ninre: <http://remix.numbersintonotes.net/vocab#> .
    `;

var ws_template = `
    <> a ldp:BasicContainer, ldp:Container , ninre:WorkSet ;
        dc:author "@AUTHOR" ;
        dct:created "@CREATED" .
    `;

/*
 *  Command parsers
 */

program.version('0.1.0')
    .usage("[options] <sub-command> [args]")
    .option("-a, --author <author>",     "Author name of container or entry created")
    .option("-b, --baseurl <baseurl>",   "LDP server base URL")
    .option("-u, --username <username>", "Username for authentication (overrides MELD_USERNAME environment variable)")
    .option("-p, --password <password>", "Password for authentication (overrides MELD_PASSWORD environment variable)")
    .option("-i, --provider <provider>", "Identity provider for authentication (overrides MELD_IDPROVIDER environment variable)")
    .option("-d, --debug",               "Generate additional progress or diagnostic output to stderr")
    .option("-v, --verbose",             "Generate more verbose output to stdout")
    // .option('-z, --baz [val]', 'baz [def]', 'def')
    ;

program.command("help [cmd]")
    .action(do_help)
    ;

program.command("test-login")
    .action(do_test_login)
    ;

program.command("list-container <container-uri>")
    .alias("ls")
    .description("List contents of container to stdout.")
    .action(do_list_container)
    ;

program.command("show-resource <resource-uri>")
    .alias("sh")
    .description("Write resource content to stdout.")
    .action(do_show_resource)
    ;

program.command("remove-resource <resource-uri>")
    .alias("rm")
    .description("Remove resource from container.")
    .action(do_remove_resource)
    ;

program.command("create-workset <container-uri> <wsname>")
    .alias("crws")
    .description("Create working set and write URI to stdout.")
    .action(do_create_workset)
    ;

program.command("add-fragment <workset-uri> <wsname>")
    .alias("adfr")
    .description("Add fragment to working set and write fragment URI to stdout.")
    .action(do_add_fragment)
    ;

// error on unknown commands
program.on('command:*', function () {
    console.error(
        'Invalid command: %s\nSee --help for a list of available commands.', 
        program.args.join(' ')
        );
    process.exit(1);
});

/*
 *  Supporting functions
 */

function get_config() {
    // This is a placeholder, obtaining values from command line options.
    // Subsequent developments may access a configuration file
    // and extract an initial default configuration from that.
    //
    // See also: https://nodejs.org/api/process.html#process_process_env
    DATE = new Date().toISOString();
    if (program.author) {
        AUTHOR  = program.author;
    } 
    if (program.baseurl) {
        BASEURL  = program.baseurl;
    }
}

function get_auth_params() {
    // Returns array [usr, pwd, idp] of authentication parameters
    let usr = program.username || process.env.MELD_USERNAME   || "";
    let pwd = program.password || process.env.MELD_PASSWORD   || "";
    let idp = program.provider || process.env.MELD_IDPROVIDER || BASEPOD;
    return [usr, pwd, idp];    
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

function ldp_request(token) {
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
        , headers:
            { "Content-Type": "text/turtle"
            , "Accept":       "text/turtle"
            } 
        };
    if (token) {
        config.headers["Authorization"] = "Bearer "+token;
    }
    return axios.create(config);
}

function show_response_status(response){
    console.error(response.status+": "+response.statusText);
    if (response.headers["location"]) {
        console.error("Location: "+response.headers["location"]);
    }
    if (program.debug) {
        console.error("Request header:");
        console.error(response.request._header);
        console.error("Response header fields:");
        console.error(response.headers);
    }
    return response;
}

function show_response_data(response) {
    console.error(response.data);
    return response;    
}

function get_node_URI(node) {
    // Return URI from graph nopde value, or undefined if not a URI node
    if (node && node.termType === "NamedNode") {
        return node.value
    }
    return undefined
}

function show_container_contents(response, container_url) {
    // console.log(response.data);
    let container_uri   = new URL(container_url, BASEURL).toString();
    let container_graph = rdf.graph()
    rdf.parse(response.data, container_graph, container_uri, response.headers["content-type"])
    let container_contents = container_graph.each(
        rdf.sym(container_uri),
        rdf.sym('http://www.w3.org/ns/ldp#contains'),
        undefined);
    var contents_uris = container_contents.map(get_node_URI)
    contents_uris.forEach(uri => {
        console.log(uri)
    })
    return response;    
}

function console_debug(message, value) {
    // If debug mode selected, logs an errort to the console using the 
    // supplied message and promised value.  Then returns the value for 
    // the next asynchronous handler
    //
    // See also: 
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then
    if (program.debug) {
        console.error(message, value);
    }
    return value;
}

function report_error(error) {
    if (error.response) {
        // Request errors:
        // Short summary for common cases
        console.error(error.response.status+": "+error.response.statusText);
        if ( [401,402,403,404].includes(error.response.status) ) {
        } else if ( error.response.status === 409 ) {
            console.error("Attempt to remove non-empty container?");
        } else if ( [301,302,303,307].includes(error.response.status) ) {
            console.error("Redirect to %s", error.response.headers["location"]);
        // Dump request/response headets for others
        } else {
            console.error("Request header:");
            console.error(error.request._header);
            console.error("Response header fields:");
            console.error(error.response.headers);
            }
    } else {
        // General error: print namne and message
        console.error(error.name+": "+error.message);
        if (program.debug) {
            // This might just be too much information...
            console.error(error);
        }
    }
    if (program.debug) {
        console.error(error.stack);
    }
}

function check_status(response) {
    let status = response.status;
    if ( (status < 200) || (status >= 300) )
    {
        throw `Error status ${status}`;
    }
    return response;
}

function extract_header(response, name) {
    return response.headers[name];
}

// program.command("*")
//     .action( (cmd, ...args) => {
//             console.log("Unrecognized command %s", cmd);
//             console.log("Args %s", args);
//         })
//     ;

// console.log('program %s', program);
// if (program.foo) console.log('  --foo');
// if (program.bar) console.log('  --bar');
// console.log('  --baz %s', program.baz);

// program.args.forEach(
//     (val, index) => {
//         console.log(`${index}: ${val}`);
//         }
//     );

function do_help(cmd) {
    let helptext = [
        "meld-tool create-workset  <ldpurl> <wsname>",
        "meld-tool add-fragment <wsuri> <fruri>",
        // "",
        // "",
    ];
    helptext.forEach(
        (txt) => { console.log(txt); }
        );
}

function do_test_login() {
    get_config();
    let [usr, pwd, idp] = get_auth_params();
    console.error('Test login via %s as %s', idp, usr);
    get_auth_token(usr, pwd, idp)
        .then(token => {console.log("Token %s", token)})
        .catch(error => report_error(error.message))
        ;
}

function do_list_container(container_uri) {
    get_config();
    console.error('list container %s', container_uri);
    get_auth_token(...get_auth_params())
        .then(token    => ldp_request(token).get(container_uri)) 
        .then(response => show_response_status(response))
        .then(response => check_status(response))
        .then(response => show_container_contents(response, container_uri))
        .catch(error   => report_error(error))
        ;
}


function do_show_resource(container_uri) {
    get_config();
    console.error('show resource %s', container_uri);
    get_auth_token(...get_auth_params())
        .then(token    => ldp_request(token).get(container_uri)) 
        .then(response => show_response_status(response))
        .then(response => check_status(response))
        .then(response => show_response_data(response))
        .catch(error => report_error(error))
        ;
}

function do_remove_resource(resource_uri) {
    get_config();
    console.error('Remove resource %s', resource_uri);
    get_auth_token(...get_auth_params())
        .then(token    => ldp_request(token).delete(resource_uri))
        .then(response => show_response_status(response))
        .then(response => check_status(response))
        .catch(error => report_error(error))
        ;
}

function do_create_workset(parent_url, wsname) {
    get_config();
    console.error('Create workset %s in container %s', wsname, parent_url);
    //  Assemble workset container data
    let container_body = ws_template
        .replace("@AUTHOR",  AUTHOR)
        .replace("@CREATED", DATE)
        ;
    let container_data = prefixes + container_body;
    let header_data = {
        "link":         `<${LDP_BASIC_CONTAINER}>; rel="type"`,
        "content-type": 'text/turtle',
        "slug":         wsname,
    }
    if (program.verbose) {
        console.log("header_data:");
        console.log(header_data);
        console.log("container_data:");
        console.log(container_data);
    }
    //  Post to supplied LDP container URI to create container
    let p = get_auth_token(...get_auth_params())
        .then(token    => ldp_request(token).post(
            parent_url, container_data, {"headers": header_data}
            ))
        .then(response => show_response_status(response))
        .then(response => check_status(response))
        .then(response => extract_header(response, "location"))
        .then(location => console_debug("Created workset %s", location))
        .then(location => console.log(location))
        .catch(error => (error))
        ;
}

function do_add_fragment(wsuri, fruri) {
    get_config();
    console.error('Add fragment %s in workset %s', fruri, wsuri);
}

function runmain(argv) {
    program.parse(argv);
}

runmain(process.argv)


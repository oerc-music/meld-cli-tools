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

// See https://github.com/jeff-zucker/solid-file-client/blob/master/lib/solid-shell-client.js
const SolidClient     = require('@solid/cli/src/SolidClient');
const IdentityManager = require('@solid/cli/src/IdentityManager');

/*
 *  @@how to access environmental values; esp current user?
 */

var DATE    = "@@@@current date";
var AUTHOR  = "@@@@author name";
var BASEPOD = "https://localhost:8443";
var BASEURL = "https://localhost:8443/public/";

/*
 *  Data
 */

var ldp_request = axios.create(
    { baseURL: BASEURL
    , timeout: 2000
    , headers:
        { "Content-Type": "text/turtle"
        , "Accept":       "text/turtle"
        } 
    })

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
    .option("--author <author>",     "Author name of container or entry created")
    .option("--baseurl <baseurl>",   "LDP server base URL")
    .option("--username <username>", "Username for authentication (overrides MELD_USERNAME environment variable)")
    .option("--password <password>", "Password for authentication (overrides MELD_PASSWORD environment variable)")
    .option("--provider <provider>", "Identity provider for authentication (overrides MELD_IDPROVIDER environment variable)")
    // .option('-f, --foo', 'Foo')
    // .option('-b, --bar', 'Bar')
    // .option('-z, --baz [val]', 'baz [def]', 'def')
    ;

program.command("help [cmd]")
    .action(do_help)
    ;

program.command("test-login")
    .action(do_test_login)
    ;

program.command("show-container <container-uri>")
    .alias("sh")
    .description("Write container content to stdout.")
    .action(do_show_container)
    ;

program.command("create-workset <ldpurl> <wsname>")
    .alias("crws")
    .description("Create working set and write URI to stdout.")
    .action(do_create_workset)
    ;

program.command("add-fragment <ldpurl> <wsname>")
    .alias("adfr")
    .description("Add fragment to working set and write fragment URI to stdout.")
    .action(do_add_fragment)
    ;

//@@TODO:
// delete-fragment
// delete-workset
// ...

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
    if (program.author != "") {
        AUTHOR  = program.author;
    } 
    if (program.baseurl != "") {
        BASEURL  = program.baseurl;
    }
}

function get_auth_token(usr, pwd, idp) {
    // Returns a Promise that returns an authentication bearer token.
    //
    // See:
    // https://github.com/solid/solid-cli/blob/master/bin/solid-bearer-token
    // https://github.com/solid/solid-cli/blob/master/src/SolidClient.js
    let url = BASEPOD;
    let idmgr  = new IdentityManager({});
    let client = new SolidClient({ identityManager: idmgr });
    let token  = client.login(idp, {username: usr, password: pwd})
        .then(session => client.createToken(url, session))
        ;
    return token
}

function show_container_data(response_data) {
    console.log(response_data);
}

function report_error(error) {
    console.error(error);
}

function check_status(status) {
    if ( (status < 200) || (status >= 300) )
    {
        throw `Error status ${status}`;
    }
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
    let usr = program.username || process.env.MELD_USERNAME   || "";
    let pwd = program.password || process.env.MELD_PASSWORD   || "";
    let idp = program.provider || process.env.MELD_IDPROVIDER || BASEPOD;
    console.log('Test login via %s as %s', idp, usr);
    get_auth_token(usr, pwd, idp)
        .then(token => {console.log("Token %s", token)})
        .catch(error => "@@@"+report_error(error.message))
        ;
}

function do_show_container(container_uri) {
    console.log('show workset %s', container_uri);
    ldp_request.get(container_uri)
        .then(response => show_container_data(response.data))
        .catch(error => report_error(error))
        ;
}

function do_create_workset(ldpurl, wsname) {
    // OUT=`curl -i -X POST -H "Content-Type: text/turtle" -H "Slug: ${SLUG}" -H 'Link: <http://www.w3.org/ns/ldp#BasicContainer>; rel="type"' $BASEURI --data "@container-filled.ttl"`
    // CONTAINERURI=`echo "$OUT" | tr -d '\r' | grep '^Location: \W*' | cut -d" " -f2`
    console.log('  create workset %s in container %s', wsname, ldpurl);

    //  Assemble workset container data
    get_config();
    let container_body = ws_template
        .replace("@AUTHOR",  AUTHOR)
        .replace("@CREATED", DATE)
        ;

    let container_data = prefixes + container_body;
    let header_data = {
        "link":         '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"',
        "content-type": 'text/turtle'
    }

    //  Post to supplied LDP service URI to create container
    let p = ldp_request.post(ldpurl, container_data, header_data)
        .then(response => check_status(response.status)
        .then(response => extract_header(response, "location")))
        .catch(error => report_error(error))
        ;

    //   var containerTemplate = prefixes + `<> a ldp:BasicContainer, <${type}> . `
    //   var headers = {
    //       'Link': '<http://www.w3.org/ns/ldp#BasicContainer>; rel="type"',
    //       'Content-Type': 'text/turtle' }
    //   if (slug) headers['Slug'] = slug
    //   var p = axios.post(baseuri, containerTemplate, {
    //     headers: headers
    //   }).then(response => {
    //     console.log(response.status, response.headers.location)
    //     return Promise.resolve(response.headers.location)
    //   })

    // return p

}

function do_add_fragment(ldpurl, wsname) {
    get_config();
    console.log('  add fragment %s in workset %s', fruri, wsuri);
}

function runmain(argv) {
    program.parse(argv);
}

runmain(process.argv)


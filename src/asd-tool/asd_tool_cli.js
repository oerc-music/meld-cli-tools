#!/usr/bin/env node

'use strict';

/**
 *  Try these commands:
 *      node $ASD_TOOL --help
 *      node $ASD_TOOL --debug analyse audiocommons chords jamendo-tracks:214
 *      node $ASD_TOOL --debug analyse audiocommons global-key jamendo-tracks:214
 */

/**
 *  Module dependencies.
 */

const axios       = require('axios');
const program     = require('commander');
const meld        = require('../meld-tool/meld_tool_lib.js')

//  ===================================================================
//
//  Data for creating worksets, fragments, etc.
//
//  ===================================================================


//  ===================================================================
//
//  Local support functions
//
//  ===================================================================

function get_resource_ids(data) {
    // Extract resource identifiers from response string data
    let json = JSON.parse(data);
    return json.map(elem => elem["id"])


}



function get_config() {
    // This is a placeholder, obtaining values from command line options.
    // Subsequent developments may access a configuration file
    // and extract an initial default configuration from that.
    //
    // See also: https://nodejs.org/api/process.html#process_process_env
    if (program.debug) {
        meld.CONFIG.debug    = program.debug;
    } 
    if (program.verbose) {
        meld.CONFIG.verbose  = program.verbose;
    } 
    meld.CONFIG.service_url  = "http://audio-analysis.eecs.qmul.ac.uk/function/";
    if (program.service_url) {
        meld.CONFIG.service_url   = program.service_url;
    } 
    // if (program.author) {
    //     meld.CONFIG.author   = program.author;
    // } 
    // if (program.baseurl) {
    //     meld.CONFIG.baseurl  = program.baseurl;
    // }
    // if (program.stdinurl) {
    //     meld.CONFIG.stdinurl = program.stdinurl;
    // }
}

function get_auth_params() {
    // Returns array [usr, pwd, idp] of authentication parameters
    let usr = program.username || process.env.MELD_USERNAME   || "";
    let pwd = program.password || process.env.MELD_PASSWORD   || "";
    let idp = program.provider || process.env.MELD_IDPROVIDER || meld.CONFIG.basepod;
    meld.console_debug("Auth params: %s", [usr, pwd, idp])
    return [usr, pwd, idp];    
}

function create_resource(container_url, headers, resource_data) {
    return meld.create_resource(container_url, headers, resource_data, get_auth_params())
}

function make_empty_container(parent_url, coname, template) {
    return meld.make_empty_container(parent_url, coname, template, get_auth_params())
    }

function remove_container(container_url) {
    return meld.remove_container(container_url, get_auth_params())
}

//  ===================================================================
//
//  Command line parse and dispatch specification
//
//  ===================================================================

  // asd analyze <descriptor> <provider-id> <source-ids> ...   - sends JSON response to stdout with exit status 0, or error and exit status

  // asd find <provider-id> - sends Ids of matching items to stdout

  // --asd-service <uri>  (also ASD_SERVICE environment variable; default  'http://audio-analysis.eecs.qmul.ac.uk/function/ac-analysis/’ ,

program.version('0.1.0')
    .usage("[options] <sub-command> [args]")
    .option("-a, --asd-service <uri>",  "Base URI for Automatic Semantic Description (ASD) service")
    .option("-r, --max-results <max>",  "Maximum number of results to return for find command (default 10)", "10")
    .option("-d, --debug",              "Generate additional progress or diagnostic output to stderr")
    .option("-v, --verbose",            "Generate more verbose output to stdout")
    // .option('-z, --baz [val]', 'baz [def]', 'def')
    ;

program.command("help [cmd]")
    .action(meld.run_command(do_help))
    ;

program.command("analyse <collection> <feature> <id>")
    .alias("anal")
    .description("Perform analysis on audio file identified as <id> from collection <collection>.")
    .action(meld.run_command(do_analyze))
    ;

program.command("find <collection> <feature> <value>")
    .description("Find all analyzed audio IDs from collection <collection> with the given <value> for <feature>.")
    .action(meld.run_command(do_find))
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
    process.exit(meld.EXIT_STS.COMMAND_ERR);
});

//  ===================================================================
//
//  Command-dispatch functions
//
//  ===================================================================

function do_help(cmd) {
    let helptext = [
        "analyse <feature> <collection> <id>",
        "find <collection> <feature> <value>",
        // "",
        // "",
    ];
    helptext.forEach(
        (txt) => { console.log(txt); }
        );
    return Promise.resolve(null)
        .then(() => meld.process_exit(meld.EXIT_STS.SUCCESS, "Help OK"))
        ;
}

function do_analyze(collection, feature, id) {
    let status = meld.EXIT_STS.SUCCESS;
    get_config();
    meld.console_debug('Analyze %s in %s from collection %s', feature, id, collection);
    let req_url = meld.CONFIG.service_url + "analysis/" + collection + "/" + feature + "?id=" + id
    meld.console_debug('Request URL %s', req_url);
    let header_data = {
        "accept": 'application/json',
        // "accept": 'text/plain',
    }
    let axios_config = {
        method:         'get',
        url:            req_url,
        responseType:   'stream'
    }
    axios_config["headers"] = header_data;
    let p = axios(axios_config)
        .then(response => meld.show_response_status(response))
        .then(response => meld.check_status(response))
        .then(response => meld.get_stream_data(response.data))
        .then(data     => console.log(data))
        .catch(error   => meld.report_error(error, "Analyze audio data error"))
        ;
    return p;
}


// Test case:  node $ASD_TOOL --debug find audiocommons global-key Dminor

function do_find(collection, feature, value) {
    let status = meld.EXIT_STS.SUCCESS;
    let maxresults = program.maxResults
    get_config();
    meld.console_debug('Find analyzed audio in collection %s with feature %s value %s', collection, feature, value);
    meld.console_debug(program.opts())
    let req_url = meld.CONFIG.service_url + "search/" + collection + "/" + maxresults + "?" + feature + "=" + value
    meld.console_debug('Request URL %s', req_url);
    let header_data = {
        "accept": 'application/json',
        // "accept": 'text/plain',
    }
    let axios_config = {
        method:         'get',
        url:            req_url,
        responseType:   'stream'
    }
    axios_config["headers"] = header_data;
    let p = axios(axios_config)
        .then(response => meld.show_response_status(response))
        .then(response => meld.check_status(response))
        .then(response => meld.get_stream_data(response.data))
        .then(data     => get_resource_ids(data))
        .then(ids      => console.log(ids.join("\n")))
        // .then(data     => console.log(data))
        .catch(error   => meld.report_error(error, "Find audio data error"))
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



// Current URL format:
//
//   /function/analysis/audiocommons/chords/global-key?id=jamendo-tracks:214
//
// Alternative 1:
//
//   /function/analysis/audiocommons/chords:global-key?id=jamendo-tracks:214
//
// Alternative 2:
//
//   /function/analysis/audiocommons?id=jamendo-tracks:214&features=chords,global-key
//
// Alternative 3 (mayve not):
//
//   /function/analysis?id=jamendo-tracks:214&features=chords,global-key&collection=audiocommons
//

// Find API feedback

//  {"id": "jamendo-tracks:214", "global-key": {"label": "D minor", "value": "Dminor", "confidence": 0.613963484764}}


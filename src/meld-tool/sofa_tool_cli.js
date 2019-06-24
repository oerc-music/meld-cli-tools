#!/usr/bin/env node

'use strict';

/**
 *  Try this command:
 *      sofa-tool --help
 */

/**
 *  Module dependencies.
 */

const program     = require('commander');
const meld        = require('./meld_tool_lib.js')

//  ===================================================================
//
//  Data for creating worksets, fragments, etc.
//
//  ===================================================================

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

//  ===================================================================
//
//  Local suppoprt functions
//
//  ===================================================================

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
    if (program.author) {
        meld.CONFIG.author   = program.author;
    } 
    if (program.baseurl) {
        meld.CONFIG.baseurl  = program.baseurl;
    }
    if (program.stdinurl) {
        meld.CONFIG.stdinurl = program.stdinurl;
    }
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
        meld.collect_multiple, []
        )
    .option("-x, --body-inline",         "Include annotation body content in annotation data")
    .option("-d, --debug",               "Generate additional progress or diagnostic output to stderr")
    .option("-v, --verbose",             "Generate more verbose output to stdout")
    // .option('-z, --baz [val]', 'baz [def]', 'def')
    ;

program.command("help [cmd]")
    .action(meld.run_command(do_help))
    ;

program.command("make-workset <container_url> <workset_name>")
    .alias("mkws")
    .description("Create working set and write URI to stdout.")
    .action(meld.run_command(do_make_workset))
    ;

program.command("add-fragment <workset_url> <fragment_url> <fragment_name>")
    .alias("adfr")
    .description("Add fragment to working set and write fragment URI to stdout.")
    .action(meld.run_command(do_add_fragment))
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
        "sofa-tool make-workset <container_url> <workset_name>",
        "sofa-tool add-fragment <workset_url> <fragment_url> <fragment_name>",
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

function do_make_workset(parent_url, wsname) {
    let status = meld.EXIT_STS.SUCCESS;
    get_config();
    console.error('Make workset %s in container %s', wsname, parent_url);
    // @@TODO: use make_empty_container
    //  Assemble workset container data
    let container_body = ws_template
        .replace(/@AUTHOR/g,  meld.CONFIG.author)
        .replace(/@CREATED/g, meld.CONFIG.date)
        ;
    let container_data = meld.TEMPLATES.prefixes + container_body;
    let header_data = {
        "content-type": 'text/turtle',
        "link":         `<${meld.LDP_BASIC_CONTAINER}>; rel="type"`,
        "slug":         wsname,
    }
    let p = create_resource(parent_url, header_data, container_data)
        .then(location => { console.log(location); return location; })
        .catch(error   => meld.report_error(error,  "Make workset error"))
        .then(location => meld.process_exit(status, "Make workset OK"))
        ;
    return p;
}

function do_add_fragment(workset_url, fragment_ref, fragment_name) {
    let status = meld.EXIT_STS.SUCCESS;
    get_config();
    console.error(
        'Add fragment %s as %s in workset %s', 
        fragment_ref, fragment_name, workset_url
        );

    //  Assemble workset container data
    let fragment_uri  = meld.get_data_url(fragment_ref);
    let fragment_body = fr_template
        .replace(/@FRAGURI/g, fragment_uri)
        .replace(/@AUTHOR/g,  meld.CONFIG.author)
        .replace(/@CREATED/g, meld.CONFIG.date)
        ;
    let fragment_data = meld.TEMPLATES.prefixes + fragment_body;
    let header_data = {
        "content-type": 'text/turtle',
        "link":         `<${meld.LDP_RESOURCE}>; rel="type"`,
        "slug":         fragment_name,
    }
    let p = create_resource(workset_url, header_data, fragment_data)
        .then(location => { console.log(location); return location; })
        .catch(error   => meld.report_error(error,  "Add fragment error"))
        .then(location => meld.process_exit(status, "Add fragment OK"))
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


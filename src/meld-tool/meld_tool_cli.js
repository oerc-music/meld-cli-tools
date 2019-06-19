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
const meld        = require('./meld_tool_lib.js')

//  ===================================================================
//
//  Various constant values
//
//  ===================================================================

//  ===================================================================
//
//  Data for creating containers and other resources
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
        collect_multiple, []
        )
    .option("-x, --body-inline",         "Include annotation body content in annotation data")
    .option("-d, --debug",               "Generate additional progress or diagnostic output to stderr")
    .option("-v, --verbose",             "Generate more verbose output to stdout")
    // .option('-z, --baz [val]', 'baz [def]', 'def')
    ;

program.command("help [cmd]")
    .action(do_help)
    ;

program.command("full-url")
    .description("Write fully qualified URL to stdout.")
    .action(meld.run_command(do_full_url))
    ;

program.command("list-container <container_url>")
    .alias("ls")
    .description("List contents of container to stdout.")
    .action(meld.run_command(do_list_container))
    ;

program.command("make-resource <container_url> <resource_name> <content_type> [content_ref]")
    .alias("mk")
    .description("Create resource with specified type and content")
    .action(meld.run_command(do_make_resource))
    ;

program.command("show-resource <resource_url>")
    .alias("sh")
    .description("Write resource content to stdout.")
    .action(meld.run_command(do_show_resource))
    ;

program.command("show-resource-rdf <resource_url>")
    .alias("shrdf")
    .description("Write resource content interpreted as RDF to stdout.")
    .action(meld.run_command(do_show_resource_rdf))
    ;

program.command("remove-resource <resource_url>")
    .alias("rm")
    .description("Remove resource from container.")
    .action(meld.run_command(do_remove_resource))
    ;

program.command("content-type <resource_url>")
    .alias("ct")
    .description("Write resource content-type to stdout.")
    .action(meld.run_command(do_show_content_type))
    ;

program.command("make-container <parent_url> <container_name>")
    .alias("mkco")
    .description("Create empty container and write URI to stdout.")
    .action(meld.run_command(do_make_container))
    ;

program.command("remove-container <container_url>")
    .alias("rmco")
    .description("Remove container and all its contents.")
    .action(meld.run_command(do_remove_container))
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

program.command("make-annotation-container <parent_url> <container_name>")
    .alias("mkac")
    .description("Create empty annotation container and write URI to stdout.")
    .action(meld.run_command(do_make_annotation_container))
    ;

program.command("show-annotation-container <container_url>")
    .alias("lsan")
    .description("List contents of annotation container to stdout.")
    .action(meld.run_command(do_show_annotation_container))
    ;

program.command("add-annotation <container_url> <target> <body> <motivation>")
    .alias("adan")
    .description("Add annotation to a container, and write allocated URI to stdout. (old command)")
    .action(meld.run_command(do_add_annotation))
    ;

program.command("make-annotation <container_url> <target> <body> <motivation>")
    .alias("mkan")
    .description("Make annotation and add to a container, and write allocated URI to stdout.")
    .action(meld.run_command(do_make_annotation))
    ;

// program.command("list-annotations <container_url>")
//     .alias("lsan")
//     .description("List annotations to stdout.")
//     .action(meld.run_command(do_list_annotations))
//     ;

program.command("show-annotation <annotation_url>")
    .alias("shan")
    .description("Show annotation (interpreted as RDF) to stdout.")
    .action(meld.run_command(do_show_annotation_rdf))
    ;

program.command("remove-annotation <annotation_url>")
    .alias("rman")
    .description("Remove annotation from container.")
    .action(meld.run_command(do_remove_annotation))
    ;

program.command("test-login")
    .description("Test login credentials and return access token.")
    .action(meld.run_command(do_test_login))
    ;

program.command("test-text-resource <resource_url> [expect_ref]")
    .description("Test resource contains text in data (or --literal values).")
    .action(meld.run_command(do_test_text_resource))
    ;

program.command("test-rdf-resource <resource_url> [expect_ref]")
    .description("Test resource contains RDF statements (or --literal values).")
    .action(meld.run_command(do_test_rdf_resource))
    ;

program.command("test-is-container <resource_url>")
    .description("Test resource is a container (non-zero exit status if not).")
    .action(meld.run_command(do_test_is_container))
    ;

program.command("test-is-annotation <resource_url>")
    .description("Test resource is an annotation (non-zero exit status if not).")
    .action(meld.run_command(do_test_is_annotation))
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
    // return Promise.resolve(null)
    //     .then(() => meld.process_exit(meld.EXIT_STS.COMMAND_ERR, "Invalid command"))
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
        .then(() => meld.process_exit(meld.EXIT_STS.SUCCESS, "Help OK"))
        ;
}

function do_full_url(data_ref) {
    let full_url = meld.get_data_url(data_ref);
    console.log(full_url);
    return Promise.resolve(null)
        .then(() => meld.process_exit(meld.EXIT_STS.SUCCESS, "Full URL OK"))
        ;
}

function do_test_login() {
    let status = meld.EXIT_STS.SUCCESS;
    get_config();
    let [usr, pwd, idp] = get_auth_params();
    console.error('Test login via %s as %s', idp, usr);
    let p = meld.get_auth_token(usr, pwd, idp)
        .then(token  => { console.log("Bearer %s", token); return token; })
        .catch(error => meld.report_error(error,  "Authentication error"))
        .then(token  => meld.process_exit(status, "Authenticated"))
        ;
    return p;
}

function do_list_container(container_uri) {
    let status = meld.EXIT_STS.SUCCESS;
    get_config();
    console.error('List container %s', container_uri);
    let p = meld.get_auth_token(...get_auth_params())
        .then(token    => meld.ldp_request_rdf(token).get(container_uri)) 
        .then(response => meld.show_response_status(response))
        .then(response => meld.check_status(response))
        .then(response => meld.show_container_contents(response, container_uri))
        .catch(error   => meld.report_error(error,  "List container error"))
        .then(response => meld.process_exit(status, "List container OK"))
        ;
    return p;
}

function do_make_resource(parent_url, resource_name, content_type, content_ref) {
    let status = meld.EXIT_STS.SUCCESS;
    get_config();
    console.error('Create resource %s in container %s', resource_name, parent_url);
    let header_data = {
        "content-type": content_type,
        "slug":         resource_name
    }
    let p = meld.get_data_sequence(program.literal, content_ref, content_type)
        .then(data     => create_resource(parent_url, header_data, data))
        .then(location => { console.log(location); return location; })
        .catch(error   => meld.report_error(error,  "Create resource error"))
        .then(location => meld.process_exit(status, "Create resource OK"))
        ;
    return p;
}

function do_show_resource(resource_url) {
    let status = meld.EXIT_STS.SUCCESS;
    get_config();
    console.error('Show resource %s', resource_url);
    let p = meld.get_auth_token(...get_auth_params())
        .then(token    => meld.ldp_request(token).get(resource_url)) 
        .then(response => meld.show_response_status(response))
        .then(response => meld.check_status(response))
        .then(response => meld.show_response_data(response))
        .catch(error   => meld.report_error(error,  "Show resource error"))
        .then(response => meld.process_exit(status, "Show resource OK"))
        ;
    return p;
}

function do_show_resource_rdf(resource_url) {
    let status = meld.EXIT_STS.SUCCESS;
    get_config();
    console.error('Show resource RDF %s', resource_url);
    let p = meld.get_auth_token(...get_auth_params())
        .then(token    => meld.ldp_request_rdf(token).get(resource_url)) 
        .then(response => meld.show_response_status(response))
        .then(response => meld.check_status(response))
        .then(response => meld.show_response_data_rdf(response, resource_url))
        .catch(error   => meld.report_error(error,  "Show resource RDF error"))
        .then(response => meld.process_exit(status, "Show resource RDF OK"))
        ;
    return p;
}

function do_remove_resource(resource_uri) {
    let status = meld.EXIT_STS.SUCCESS;
    get_config();
    console.error('Remove resource %s', resource_uri);
    let p = meld.get_auth_token(...get_auth_params())
        .then(token    => meld.ldp_request(token).delete(resource_uri))
        .then(response => meld.show_response_status(response))
        .then(response => meld.check_status(response))
        .catch(error   => meld.report_error(error,  "Remove resource error"))
        .then(response => meld.process_exit(status, "Remove resource OK"))
        ;
    return p;
}

function do_show_content_type(resource_url) {
    let status = meld.EXIT_STS.SUCCESS;
    get_config();
    console.error('Show resource content type %s', resource_url);
    let p = meld.get_auth_token(...get_auth_params())
        .then(token    => meld.ldp_request(token).get(resource_url)) 
        .then(response => meld.show_response_status(response))
        .then(response => meld.check_status(response))
        .then(response => meld.show_response_content_type(response))
        .catch(error   => meld.report_error(error,  "Show resource content type error"))
        .then(response => meld.process_exit(status, "Show resource content type OK"))
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
    let p = meld.get_auth_token(...get_auth_params())
        .then(token    => meld.ldp_request(token).get(resource_url)) 
        .then(response => meld.show_response_status(response))
        .then(response => meld.check_status(response))
        .then(response => 
            meld.test_response_data_text(response, program.literal, expect_ref)
            )
        .catch(error   => meld.report_error(error,  "Test resource text error"))
        .then(status   => meld.process_exit(status, "Test resource text"))
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
    let resource_url = meld.get_data_url(resource_ref);
    let p = meld.get_auth_token(...get_auth_params())
        .then(token    => meld.ldp_request_rdf(token).get(resource_url)) 
        .then(response => meld.show_response_status(response))
        .then(response => meld.check_status(response))
        .then(response => 
            meld.test_response_data_rdf(response, resource_url, program.literal, expect_ref)
            )
        .catch(error   => meld.report_error(error,  "Test resource RDF error"))
        .then(status   => meld.process_exit(status, "Test resource RDF"))
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
    let resource_url = meld.get_data_url(resource_ref);
    let request_rdf  = null;
    let request_any  = null;
    let save_token   = null;
    let p = meld.get_auth_token(...get_auth_params())
        .then(token    => save_token = token )
        .then(()       => meld.ldp_request(save_token).get(resource_url))
        .then(response => meld.check_type_turtle(response))
        .catch(error   => meld.process_exit(meld.EXIT_STS.NOT_CONTAINER, "Resource is not Turtle"))
        .then(()       => meld.ldp_request_rdf(save_token).get(resource_url))
        .then(response => meld.show_response_status(response))
        .then(response => meld.check_status(response))
        .then(response => meld.test_response_is_container(response, resource_url))
        .catch(error   => meld.process_exit(meld.EXIT_STS.NOT_CONTAINER, "Resource is not a container"))
        .then(status   => meld.process_exit(status, "Resource is container"))
        ;
    return p;
}

function do_make_container(parent_url, coname) {
    let status = meld.EXIT_STS.SUCCESS;
    get_config();
    console.error('Create container %s in parent %s', coname, parent_url);
    let p = make_empty_container(parent_url, coname, meld.TEMPLATES.co_template)
        .then(location => { console.log(location); return location; })
        .catch(error   => meld.report_error(error,  "Make container error"))
        .then(location => meld.process_exit(status, "Make container OK"))
        ;
    return p;
}

function do_remove_container(container_url) {
    let status = meld.EXIT_STS.SUCCESS;
    get_config();
    console.error('Remove container %s and contents', container_url);
    let p = remove_container(container_url)
        .catch(error   => meld.report_error(error,  "Remove container error"))
        .then(()       => meld.process_exit(status, "Remove container OK"))
        ;
    return p;
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

function do_make_annotation_container(parent_url, acname) {
    let status = meld.EXIT_STS.SUCCESS;
    get_config();
    console.error('Create annotation container %s in parent %s', acname, parent_url);
    let p = make_empty_container(parent_url, acname, meld.TEMPLATES.ac_template)
        .then(location => { console.log(location); return location; })
        .catch(error   => meld.report_error(error,  "Make annotation container error"))
        .then(location => meld.process_exit(status, "Make annotation container OK"))
        ;
    return p;
}

// Currently same as list_container, but may change in future
function do_show_annotation_container(container_uri) {
    let status = meld.EXIT_STS.SUCCESS;
    get_config();
    console.error('Show annotation container %s', container_uri);
    let p = meld.get_auth_token(...get_auth_params())
        .then(token    => meld.ldp_request_rdf(token).get(container_uri)) 
        .then(response => meld.show_response_status(response))
        .then(response => meld.check_status(response))
        .then(response => meld.show_container_contents(response, container_uri))
        .catch(error   => meld.report_error(error,  "Show annotation container error"))
        .then(response => meld.process_exit(status, "Show annotation container OK"))
        ;
    return p;
}

function do_add_annotation(container_url, target_ref, body_ref, motivation_ref) {
    let status = meld.EXIT_STS.SUCCESS;
    get_config();
    let target_uri = target_ref;
    let body_uri   = body_ref;
    let motivation = motivation_ref;
    console.error(
        'Add %s annotation %s -> %s in container %s', 
        motivation, target_uri, body_uri, container_url
        );
    //  Assemble annotation data
    let annotation_ref  = 
        meld.url_slug(target_uri, "@target")     + "." + 
        meld.url_slug(motivation, "@motivation") + "." + 
        meld.url_slug(body_uri,   "@body");
    let annotation_url  = meld.get_data_url(annotation_ref);
    let annotation_body = an_template
        .replace("@TARGETURI",  target_uri)
        .replace("@BODYURI",    body_uri)
        .replace("@MOTIVATION", motivation)
        ;
    let annotation_data = meld.TEMPLATES.prefixes + annotation_body;
    let header_data = {
        "content-type": 'text/turtle',
        "link":         `<${meld.LDP_RESOURCE}>; rel="type"`,
        "slug":         annotation_ref,
    }
    let p = create_resource(container_url, header_data, annotation_data)
        .then(location => { console.log(location); return location; })
        .catch(error   => meld.report_error(error,  "Add annotation error"))
        .then(location => meld.process_exit(status, "Add annotation OK"))
        ;
    return p;
}

// `do_make_annotation`` is like `add_annotation`, except that the body_ref may
// be "-", in which case the annotation body is read from stdin, and may
// be included inline if `--body-inline` option is specified.
// @@TODO: replace `add_annotation` when new logic is settled.
function do_make_annotation(container_url, target_ref, body_ref, motivation_ref) {
    let status = meld.EXIT_STS.SUCCESS;
    get_config();
    let target_uri    = target_ref;
    // let body_uri      = body_ref;
    let motivation    = motivation_ref;
    let body_data_url = meld.get_data_url(body_ref)
    console.error(
        'Add %s annotation %s -> %s(%s) in container %s', 
        motivation, target_uri, body_ref, body_data_url, container_url
        );
    //  Assemble annotation data
    let annotation_ref  = 
        meld.url_slug(target_uri,    "@target")     + "." + 
        meld.url_slug(motivation,    "@motivation") + "." + 
        meld.url_slug(body_data_url, "@body");
    let annotation_body = meld.TEMPLATES.an_template
        .replace("@TARGETURI",  target_uri)
        .replace("@BODYURI",    body_data_url)
        .replace("@MOTIVATION", motivation)
        ;
    // Create annotation
    let header_data = {
        "content-type": 'text/turtle',
        "link":         `<${meld.LDP_RESOURCE}>; rel="type"`,
        "slug":         annotation_ref,
    }
    let body_data_promise ;
    if (program.bodyInline) {
        body_data_promise = meld.get_data_sequence(program.literal, body_ref, null)
            .then(data => "\n" + data)
            ;
    }
    else {
        body_data_promise = Promise.resolve("");
    }
    let p = body_data_promise
        .then(body_data => meld.TEMPLATES.prefixes + annotation_body + body_data)
        .then(ann_data  => create_resource(container_url, header_data, ann_data))
        .then(location  => { console.log(location); return location; })
        .catch(error    => meld.report_error(error,  "Make annotation error"))
        .then(location  => meld.process_exit(status, "Make annotation OK"))
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
    let resource_url = meld.get_data_url(resource_ref);
    let request_rdf  = null;
    let request_any  = null;
    let save_token   = null;
    let p = meld.get_auth_token(...get_auth_params())
        .then(token    => save_token = token )
        .then(()       => meld.ldp_request(save_token).get(resource_url))
        .then(response => meld.check_type_turtle(response))
        .catch(error   => meld.process_exit(meld.EXIT_STS.NOT_ANNOTATION, "Resource is not Turtle"))
        .then(()       => meld.ldp_request_rdf(save_token).get(resource_url))
        .then(response => meld.show_response_status(response))
        .then(response => meld.check_status(response))
        .then(response => meld.test_response_is_annotation(response, resource_url))
        .catch(error   => meld.process_exit(meld.EXIT_STS.NOT_ANNOTATION, "Resource is not a annotation"))
        .then(status   => meld.process_exit(status, "Resource is annotation"))
        ;
    return p;
}

// Currently same as `show_resource_rdf`, but may change
function do_show_annotation_rdf(annotation_url) {
    let status = meld.EXIT_STS.SUCCESS;
    get_config();
    console.error('Show annotation RDF %s', annotation_url);
    let p = meld.get_auth_token(...get_auth_params())
        .then(token    => meld.ldp_request_rdf(token).get(annotation_url)) 
        .then(response => meld.show_response_status(response))
        .then(response => meld.check_status(response))
        .then(response => meld.show_response_data_rdf(response, annotation_url))
        .catch(error   => meld.report_error(error,  "Show annotation RDF error"))
        .then(response => meld.process_exit(status, "Show annotation RDF OK"))
        ;
    return p;
}

// Currently same as `do_remove_resource`, but may change
function do_remove_annotation(annotation_uri) {
    let status = meld.EXIT_STS.SUCCESS;
    get_config();
    console.error('Remove annotation %s', annotation_uri);
    let p = meld.get_auth_token(...get_auth_params())
        .then(token    => meld.ldp_request(token).delete(annotation_uri))
        .then(response => meld.show_response_status(response))
        .then(response => meld.check_status(response))
        .catch(error   => meld.report_error(error,  "Remove annotation error"))
        .then(response => meld.process_exit(status, "Remove annotation OK"))
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


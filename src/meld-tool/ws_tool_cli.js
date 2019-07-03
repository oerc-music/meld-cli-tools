#!/usr/bin/env node

'use strict';

/**
 *  Try this command:
 *      ws-tool --help
 */

/**
 *  Module dependencies.
 */

const program     = require('commander')
const websocket   = require('ws')
const meld        = require('./meld_tool_lib.js')
const util        = require('util')

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
    if (program.timeout) {
        meld.CONFIG.timeout  = program.timeout;
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
    .option("-t, --timeout <timeout>",   "Timeout on waiting for message, in milliseconds")
    .option("-d, --debug",               "Generate additional progress or diagnostic output to stderr")
    .option("-v, --verbose",             "Generate more verbose output to stdout")
    // .option('-z, --baz [val]', 'baz [def]', 'def')
    ;

program.command("ws_server_show [port]")
    .alias("show")
    .description("Create websocket server on given port, and display any messages received.")
    .action(meld.run_command(do_ws_server_show))
    ;

program.command("ws_send_show <websocket_url> [data]")
    .alias("send")
    .description("Send data (or --literal values) to websocket URL, wait for response, then show response.")
    .action(meld.run_command(do_ws_send_show))
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
//  Command support functions
//
//  ===================================================================

// @@TODO: rework these functions to use promises?

function ws_message_promise(ws) {
    function exec_promise(resolve, reject) {
        // Callbacks called when event is triggered
        // 'this' is event ws
        // 'arguments' is any arguments supplied by 'emit'
        // e.g. 'data' for message event
        function cb_message(data) {
            resolve(data);
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
        }
    return new Promise(exec_promise);
    }

function ws_create_server(port, show_message) {
    function exec_promise(resolve, reject) {
        let wss = new websocket.Server({ port: port || 8080 })
        wss.on('connection',
            function connection(ws) {
                ws.on('message', show_message)
            })
        let loc = wss.address()
        resolve(loc.family + " " + loc.address + ":" + loc.port)
    }
    return new Promise(exec_promise);
}

function ws_server_message_echo(message) {
    message = message.trim()
    console.log(message)
    let ws = this
    ws.send("Echo: "+message)
    meld.process_exit_now(meld.EXIT_STS.SUCCESS, "Message received");
}

function ws_send_show_data(ws_url, send_data, timeout) {
    function ws_cancel_wait(ws, listener) {
        ws.removeEventListener('message', listener)
        ws.close(3000+meld.EXIT_STS.TIMEOUT, "Timed out waiting for response message");
        meld.process_exit_now(meld.EXIT_STS.TIMEOUT, "Timed out waiting for response message");
    }
    function message_response(message) {
        console.log("Resp: "+message)
        meld.process_exit_now(meld.EXIT_STS.SUCCESS, "Message response received")
    }
    let ws = new websocket(ws_url);
    ws.once('open',
        function open() {
            ws.send(send_data)
        })
    ws.once('message', message_response);
    let timer = setTimeout(ws_cancel_wait, timeout, ws, message_response);
}

//  ===================================================================
//
//  Command-dispatch functions
//
//  ===================================================================

function do_help(cmd) {
    let helptext = [
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

function do_ws_server_show(port) {
    let status = meld.EXIT_STS.SUCCESS;
    get_config();
    console.error('Websocket server on port %d', port);
    let p = ws_create_server(port, ws_server_message_echo)
        .then(location => { console.error(location); return location; })
        .catch(error   => meld.report_error(error,  "Make websocket server error"))
        .then(()       => meld.process_wait(status, "Make websocket server OK"))
        .then(message  => console.error(message))
        ;
    // Further actions are in response to incoming events
    return p;
}

function do_ws_send_show(ws_url, data_ref) {
    let status = meld.EXIT_STS.SUCCESS;
    get_config();
    console.error('Send data to %s', ws_url);
    let p = meld.get_data_sequence(program.literal, data_ref, null)
        .then(data   => ws_send_show_data(ws_url, data, program.timeout || 2000))
        .catch(error => meld.report_error(error,  "Send data error"))
        .then(()     => meld.process_wait(status, "Send data OK"))
        ;
    // Further actions are in response to incoming events
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


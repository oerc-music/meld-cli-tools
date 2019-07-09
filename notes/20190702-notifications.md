# Notes for Solid WebSockets notifications

See:
- https://github.com/solid/solid-spec/blob/master/api-websockets.md#subscribing
- https://github.com/websockets/ws#sending-and-receiving-text-data
- https://github.com/websockets/ws/blob/master/doc/ws.md
- https://nodejs.org/api/events.html#events_events

- https://node.readthedocs.io/en/latest/api/child_process/
- https://nodejs.org/api/child_process.html#child_process_child_process


# Basic operation

## Discovery

    C: OPTIONS /data/test HTTP/1.1
    C: Host: example.org

    S: HTTP/1.1 200 OK
    S: ...
    S: Updates-Via: wss://example.org/


## Subscribe

On a WebSockets connection:

    C: sub https://example.org/data/test

## Change notification

On the WebSockets connection:

    S: pub https://example.org/data/test

## Example code

(In browser):

    var socket = new WebSocket('wss://example.org/');
    socket.onopen = function() {
        this.send('sub https://example.org/data/test');
    };
    socket.onmessage = function(msg) {
        if (msg.data && msg.data.slice(0, 3) === 'pub') {
            // resource updated, refetch resource
        }
    };


# Node WebSockets library

See: https://github.com/websockets/ws

    const WebSocket = require('ws');

    const ws = new WebSocket('ws://www.host.com/path');

    ws.on('open', function open() {
      ws.send('something');
    });

    ws.on('message', function incoming(data) {
      console.log(data);
    });



# meld-tool enhancements

NOTE: The WebSocket cient/server options have been implemented in a new tool, `ws-tool-cli.js`.

## Websocket server

    meld-tool ws_server <port>

Creates a websocket server and logs any messages received.

Exits @@when?

## Websocket client

    meld-tool ws_send <uri> <data> [--timeout=ms]

Sends data to a listening WebSockets server at <uri>, and waits for `ms` milliseconds listening for a response.  Logs any response received to standard output, or exits with non-zero status.

## Resource listen once

    meld-tool resource_listen <uri>

Listen for changes to Solid resource `<uri>`.  When a change is detected, return the published messge to standard output, and exit.


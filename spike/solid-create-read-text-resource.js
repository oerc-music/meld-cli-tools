// Test code to reproduce 500 server error from node-solid-server when asking for RDF
// from a non-RDF resource.
//
// Set environment variable SOLID_BEARER_TOKEN (including the leading "Bearer ")
// e.g. per meld-tool.js test-login:
//   export SOLID_BEARER_TOKEN=$(node meld_tool.js test-login --usernamne=@@@ --password=@@@)
//
// Then run as:
//   node solid-create-read-text-resource.js

const axios = require('axios');

const BASEURL     = "https://localhost:8443";
const DEBUG       = false;
const TOKEN       = process.env["SOLID_BEARER_TOKEN"];

let resource_data = "test data";
let post_headers  = { "Content-Type": "text/plain", "slug": "test" };
let get_headers   = { "Accept":       "text/turtle" };

function ldp_request() {
    // Returns an Axios instance which can be used to intiate asynchronous
    // HTTP requests, with default values supplied for accessing a Solid/LDP
    // service.
    //
    // See: https://github.com/axios/axios#creating-an-instance
    let config = 
        { baseURL: BASEURL
        , timeout: 2000
        , headers:
            { "Accept":       "text/turtle"
            } 
        };
    if (TOKEN) {
        config.headers["Authorization"] = TOKEN;
    }
    return axios.create(config);
}

function show_response_headers(response){
    console.error(response.status+": "+response.statusText);
    for (header in response.headers) {
        console.error("%s: %s", header, response.headers[header]);
    }
    return response;
}

function show_response_status(response){
    console.error(response.status+": "+response.statusText);
    if (response.headers["location"]) {
        console.error("Location: "+response.headers["location"]);
    }
    if (DEBUG === true) {
        console.error("Request header:");
        console.error(response.request._header);
        console.error("Response header fields:");
        console.error(response.headers);
    }
    return response;
}

ldp_request().post("/public/", resource_data, {"headers": post_headers})
    .then(response => show_response_status(response))
    .then(response => ldp_request().get(response.headers["location"], {"headers": get_headers}))
    .then(response => show_response_status(response))
    .catch(err => show_response_headers(err.response))
    ;


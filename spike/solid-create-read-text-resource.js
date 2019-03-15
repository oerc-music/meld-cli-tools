const axios = require('axios');

const BASEURL     = "https://localhost:8443";
const DEBUG       = false;

const TOKEN       = "eyJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJkZGE0MWRkMmQ4YzI1NDc2MmMxNmQwZGZiZTExZDZhYSIsImF1ZCI6Imh0dHBzOi8vbG9jYWxob3N0Ojg0NDMiLCJleHAiOjE1NTI2NDcyNzcsImlhdCI6MTU1MjY0MzY3NywiaWRfdG9rZW4iOiJleUpoYkdjaU9pSlNVekkxTmlJc0ltdHBaQ0k2SW5KMVdHWjZhekpaYjA5WkluMC5leUpwYzNNaU9pSm9kSFJ3Y3pvdkwyeHZZMkZzYUc5emREbzRORFF6SWl3aWMzVmlJam9pYUhSMGNITTZMeTlzYjJOaGJHaHZjM1E2T0RRME15OXdjbTltYVd4bEwyTmhjbVFqYldVaUxDSmhkV1FpT2lKa1pHRTBNV1JrTW1RNFl6STFORGMyTW1NeE5tUXdaR1ppWlRFeFpEWmhZU0lzSW1WNGNDSTZNVFUxTXpnMU16STNOeXdpYVdGMElqb3hOVFV5TmpRek5qYzNMQ0pxZEdraU9pSTVOekZrTUdJMk5XTXhaV1E1TWprNUlpd2libTl1WTJVaU9pSkNkRU53WlVKd1pFMHpaVVJ0YjFKWk9WcFBaVjlSYmxGNFZXazVTemR1UTBkRGQyczFjakZYZFVKQklpd2lZWHB3SWpvaVpHUmhOREZrWkRKa09HTXlOVFEzTmpKak1UWmtNR1JtWW1VeE1XUTJZV0VpTENKamJtWWlPbnNpYW5kcklqcDdJbXQwZVNJNklsSlRRU0lzSW1Gc1p5STZJbEpUTWpVMklpd2liaUk2SW5oMldUSkJUazQwT1VwWlpUUmlXamxEUm5WUFFYaG1jV1pvYW1aZk9VNXlWek5OUVRGbmNVbDRibEpWY1dNeVgzQnNObUpwWm5wdlUzTTJMVFUyWm5Vd1NGTkVUR3hwYlhsUVRITk5jWFJRWmkxMldIcEZOR2RKT0ZOTmMzVTVhSFZ4ZURWeVoyVnNlVUZMZEhGWWJqbG1iblZ2VEZkRE1VZGtTVWx4TkVRd1duZzVZamw0V1hwSWRVVlRNbGRvTm5FMlRscERZVWRKT1cxZlducFlZMnRZY0d0RExXSnVlbVJWY21SQ2JuWnBibmxDWHpSSVZXSmpkVzVXYVVSWmVuVndPVlZZU0ZaR1VEVTFjM2h0VFdkcU4ySnRiVFZaYjBwc1NWVjZYME55T1VkRFdsZEZWemh4YkRaME1pMVpjbE41VWpWNlVUUmtOMVo1UVdWS01GTjFSR2szVTNKTFVVMVNPSFJPTjNaNlppMW1UbTVVYVRGSWVXbEZOMHh0Y201TFRYbHRVM1ZMYXpSUGVGOWpMV1IwVDBSelIxTlFkVm94VjI1Vk9FMDJiWEJRU3poQldFNVlVa1pQVmpOd1pFeDRYMjk1ZHlJc0ltVWlPaUpCVVVGQ0lpd2lhMlY1WDI5d2N5STZXeUoyWlhKcFpua2lYU3dpWlhoMElqcDBjblZsZlgwc0ltRjBYMmhoYzJnaU9pSmtVbXB0UkhST1NXSm1hV2d3TldONlpsWlhUbTVuSW4wLk8weDcwZ20wQUhKSkltRnJOckJhQ3llZ19tcWdpdF96VEdjOGJva2lSNkg3M2hZak85VHY1SG5adXh1dTFxM0hla0JqSy0zazJXSi13SWxYanVmaEcyalQwaVpyaUdBcVhXQi1pYWxfWUs1RzZOMVRRb2FaeGh6dURoWVJUTW5zU1Z2MDYzRzZQakJDVWtvX2dmemNpX1FDXzRuSzZJLVZCX2Fkc1ZQQkdXYmRNM3QyS1ktRFc4WXRxTzlPVHpYeV9HaEJOclMxWVROb2ZDLWV2WWtHN1lsU0ExRVNDX3dsNGx5Nk1WYVVvT0w5Uld5NUpQeXhhOV9YQVZUVUZ1eHN2NmN4NUZQMGdPeU5aeFlJUGZESjdUX3YySm5QZ3lVd1M4TmNBY3dLNWNaMUNqekxZVTF1bmQxV2xUZ1hfd1c5SDIzZTlQa19CUHJxTThrTk95WGMxZyIsInRva2VuX3R5cGUiOiJwb3AifQ.pI5MoqydDCSdPI9-6sGIDqakAHxliySSJcto9do1PcKnSLsRlHiHK3FqsTTbgwNjGDn4w657dCn_2-XrXDbUkkV84Q1M_mIWRQjOKosXIYpsV8Sj-WMK0gLQPoPjyRNrtOlFVyhMXZwELAbp-mbwlBcsE2T8wH8_gjCIzQYgIn4qpiUTl4WfsXVG-Kvd0y807NnCvXRglCmWSZ-OAZDtdklFRmI7yRqFD5kPJrPc1qV5QuGBN2KjcMciwVENBh116jbXikHcumYSyXslrKGURJCiNmJrbhlALggyNglY_n052YUONYXse1zyLqHY8KbQ-pJnezEsXFCCRDCou9QIoQ";

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
        config.headers["Authorization"] = "Bearer "+TOKEN;
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
    .then(response => show_response_headers(response))
    .then(response => ldp_request().get(response.headers["location"], {"headers": get_headers}))
    .then(response => show_response_status(response))
    .catch(err => console.error(err))
    ;


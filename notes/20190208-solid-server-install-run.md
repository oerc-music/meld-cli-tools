# Notes for installing and running Solid server

## Install NVM

ES6 is supported only by a more recent version of node.js than comes by default with MacOS El Capitan.  Use 'nvm' to work with alternative versions of node.js.

The following command installs `nvm` (to `$HOME/.nvm`?):

    $ curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash

To activate `nvm` in directory `$NVM_HOME`, use:

    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

## Install latest node.js

To use `nvm` to install a recent version of node, use some combination of the following:

    $ nvm ls-remote
    $ nvm install v10.15.1
    $ node -v

Status:

    $ npm list
    /Users/graham
    └── (empty)

    $ npm list -g
    /Users/graham/.nvm/versions/node/v10.15.1/lib
    └─┬ npm@6.4.1
      :

    $ which node
    /Users/graham/.nvm/versions/node/v10.15.1/bin/node

I'm taking this to be a clean new node environment.


## Activate latest node.js

This needs to be done for each new command shell or login.

    . ~/.nvm/nvm.sh
    . ~/.nvm/bash_completion

<!-- (saved from `history`)
    293  node nodejs_command_line.js foo bar
    294  node -v
    295  which node
    296  nvm
    297  curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash
    298  export NVM_DIR="$HOME/.nvm"
    299  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
    300  [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
    301  nvm
    302  ls -al
    303  nvm install latest
    304  nvm ls-remote
    305  nvm install v10.15.0
    306  node -v
    307  ls
    308  node nodejs_command_line.js
    309  node nodejs_command_line.js foo bar
    310  node nodejs_command_line.js foo bar
    311  npn install commander --save
    312  npm install commander --save
    313  npm audit
    314  npm audit fix
    315  npn audit fix --force
    316  npm audit fix --force
    317  npm audit
    318  node nodejs_command_line.js foo bar
    319  which node
    320  node commander-test.js foo bar
-->

## Install local Solid server

See also: https://solid.inrupt.com/docs/installing-running-nss

Create and change to working directory for server data (e.g. `$HOME/solid`).

    $ npm install solid-server
    npm WARN deprecated nodemailer@3.1.8: All versions below 4.0.1 of Nodemailer are deprecated. See https://nodemailer.com/status/
    npm WARN deprecated text-encoding@0.6.4: no longer maintained
    npm WARN deprecated node-uuid@1.4.8: Use uuid module instead
    npm WARN deprecated coffee-script@1.12.7: CoffeeScript on NPM has moved to "coffeescript" (no hyphen)

    > spawn-sync@1.0.15 postinstall /Users/graham/solid/node_modules/spawn-sync
    > node postinstall

    npm WARN saveError ENOENT: no such file or directory, open '/Users/graham/solid/package.json'
    npm notice created a lockfile as package-lock.json. You should commit this file.
    npm WARN enoent ENOENT: no such file or directory, open '/Users/graham/solid/package.json'
    npm WARN babel-preset-metalab@1.0.0 requires a peer of babel-core@^6.24.0 but none is installed. You must install peer dependencies yourself.
    npm WARN babel-literal-to-ast@1.0.0 requires a peer of babel-core@>=6.0.20 but none is installed. You must install peer dependencies yourself.
    npm WARN solid No description
    npm WARN solid No repository field.
    npm WARN solid No README data
    npm WARN solid No license field.

    + solid-server@5.0.0-beta.7
    added 658 packages from 407 contributors and audited 64504 packages in 36.611s
    found 0 vulnerabilities

Create and change to working directory for solid certificates data (e.g. `$HOME/solid-certs`).  Then:

    $ export SOLID_HOME=$(pwd)

Set up certificate (or see https://letsencrypt.org/docs/certificates-for-localhost/). For now, using a self-signed certificate:

    $ openssl req -x509 -out localhost.crt -keyout localhost.key \
      -newkey rsa:2048 -nodes -sha256 \
      -subj '/CN=localhost' -extensions EXT -config <( \
       printf "[dn]\nCN=localhost\n[req]\ndistinguished_name = dn\n[EXT]\nsubjectAltName=DNS:localhost\nkeyUsage=digitalSignature\nextendedKeyUsage=serverAuth")

Change back to solid directory:

    $ cd $SOLID_HOME

Initialize Solid (see https://github.com/solid/node-solid-server#run-a-single-user-server-beginner):

    $ nerthus:solid graham$ npx solid init
    ? Path to the folder you want to serve. Default is /Users/graham/solid/data
    ? SSL port to run on. Default is 8443
    ? Solid server uri (with protocol, hostname and port) https://localhost:8443
    ? Enable WebID authentication Yes
    ? Serve Solid on URL path /
    ? Path to the config directory (for example: /etc/solid-server) ./config
    ? Path to the config file (for example: ./config.json) ./config.json
    ? Path to the server metadata db directory (for users/apps etc) ./.db
    ? Path to the SSL private key in PEM format ../solid-certs/localhost.key
    ? Path to the SSL certificate key in PEM format ../solid-certs/localhost.crt
    ? Enable multi-user mode No
    ? Do you want to set up an email service? No
    ? A name for your server (not required, but will be presented on your server's frontpage) localhost
    ? A description of your server (not required)
    ? A logo that represents you, your brand, or your server (not required)
    config created on /Users/graham/solid/config.json

## Run solid server

Start Solid:

    $ npx solid start

For debug output, use:

    $ DEBUG=solid:* npx solid start

If using a self-signecd certificate (i.e., one not trusted by the host system certificate root), use one of the following commands instead:

    $ ./node_modules/solid-server/bin/solid start

or

    $ DEBUG=solid:* ./node_modules/solid-server/bin/solid start

(These commands suspend certificate checking by the solid server, and should not be used in production.  They are needed because it uses HTTP transactions internally for some operations.)


## Deploy "production" solid server with LetsEncrypt certificate

(Use Apache or Nginx to proxy incoming HTTP requests)

@@TODO


## Create basic structure for user data (LDP container)

How to get set up with an LDP container?

Browse to https://localhost:8443/.  Ignore/override security warnings.  I'm using Brave browser without plugins.

Click on "Register". Fill in details, click "register".

"Public homepage" is displayed.

Click on "WebID" link.  Page with name is displayed, but none of the data entered at registration.  Tried "back" button, but nothing happens.

Browse to https://localhost:8443/, "Public homepage" is displayed again.

Click "Login".  Enter username and password from registration.  Click "Log in".  Popup displays "Logged in", and home page button changes to "Log out".

Click on WebID link again, error is displayed:

    Outline.expand: Unable to fetch <https://localhost:8443/profile/card>: Failed to load  <https://localhost:8443/profile/card> Fetcher: <https://localhost:8443/profile/card> Internal Server Error status: 500

At this point, console log looks like this:

    nerthus:solid graham$ npx solid start
    Solid server () running on https://localhost:8443/
    Press <ctrl>+c to stop
      solid:get / on localhost +0ms
      solid:get / on localhost +2m
      solid:get /profile/card on localhost +35s
      solid:get    sending data browser file: /Users/graham/solid/node_modules/solid-server/static/databrowser.html +0ms
      solid:get /profile/card on localhost +335ms
      solid:get / on localhost +1m
      solid:get / on localhost +1m
      solid:get /profile/card on localhost +58s
      solid:get    sending data browser file: /Users/graham/solid/node_modules/solid-server/static/databrowser.html +1ms


## Other errors...


    $ curl -vk -H "accept: text/turtle" https://localhost:8443/
    *   Trying ::1...
    * Connected to localhost (::1) port 8443 (#0)
    * TLS 1.2 connection using TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
    * Server certificate: localhost
    > GET / HTTP/1.1
    > Host: localhost:8443
    > User-Agent: curl/7.43.0
    > accept: text/turtle
    >
    < HTTP/1.1 500 Internal Server Error
    < X-Powered-By: solid-server
    < Vary: Accept, Authorization, Origin
    < Access-Control-Allow-Credentials: true
    < Access-Control-Expose-Headers: Authorization, User, Location, Link, Vary, Last-Modified, ETag, Accept-Patch, Accept-Post, Updates-Via, Allow, WAC-Allow, Content-Length, WWW-Authenticate
    < Allow: OPTIONS, HEAD, GET, PATCH, POST, PUT, DELETE
    < Link: <.acl>; rel="acl", <.meta>; rel="describedBy", <http://www.w3.org/ns/ldp#Resource>; rel="type"
    < WAC-Allow: user="read",public="read"
    < MS-Author-Via: SPARQL
    < Updates-Via: wss://localhost:8443
    < Content-Type: text/plain; charset=utf-8
    < Content-Length: 38
    < ETag: W/"26-QBI7EYtDt6zJzGYxyvtGCQrnW5Q"
    < Date: Fri, 08 Feb 2019 12:08:42 GMT
    < Connection: keep-alive
    <
    Error translating between RDF formats
    * Connection #0 to host localhost left intact



    $ curl -vk -H "accept: text/turtle" https://localhost:8443/profile/card
    *   Trying ::1...
    * Connected to localhost (::1) port 8443 (#0)
    * TLS 1.2 connection using TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
    * Server certificate: localhost
    > GET /profile/card HTTP/1.1
    > Host: localhost:8443
    > User-Agent: curl/7.43.0
    > accept: text/turtle
    >
    < HTTP/1.1 200 OK
    < X-Powered-By: solid-server
    < Vary: Accept, Authorization, Origin
    < Access-Control-Allow-Credentials: true
    < Access-Control-Expose-Headers: Authorization, User, Location, Link, Vary, Last-Modified, ETag, Accept-Patch, Accept-Post, Updates-Via, Allow, WAC-Allow, Content-Length, WWW-Authenticate
    < Allow: OPTIONS, HEAD, GET, PATCH, POST, PUT, DELETE
    < Link: <card.acl>; rel="acl", <card.meta>; rel="describedBy", <http://www.w3.org/ns/ldp#Resource>; rel="type"
    < WAC-Allow: user="read",public="read"
    < MS-Author-Via: SPARQL
    < Updates-Via: wss://localhost:8443
    < Content-Type: text/turtle
    < Date: Fri, 08 Feb 2019 12:10:48 GMT
    < Connection: keep-alive
    < Transfer-Encoding: chunked
    <
    @prefix solid: <http://www.w3.org/ns/solid/terms#>.
    @prefix foaf: <http://xmlns.com/foaf/0.1/>.
    @prefix pim: <http://www.w3.org/ns/pim/space#>.
    @prefix schema: <http://schema.org/>.
    @prefix ldp: <http://www.w3.org/ns/ldp#>.

    <>
        a foaf:PersonalProfileDocument ;
        foaf:maker <https://localhost:8443/profile/card#me> ;
        foaf:primaryTopic <https://localhost:8443/profile/card#me> .

    <https://localhost:8443/profile/card#me>
        a foaf:Person ;
        a schema:Person ;

        foaf:name "Graham Klyne" ;

        solid:account </> ;  # link to the account uri
        pim:storage </> ;    # root storage

        ldp:inbox </inbox/> ;

        pim:preferencesFile </settings/prefs.ttl> ;  # private settings/preferences
        solid:publicTypeIndex </settings/publicTypeIndex.ttl> ;
        solid:privateTypeIndex </settings/privateTypeIndex.ttl> .
    * Connection #0 to host localhost left intact






## Check out meld-tool

@@@@@

Withj solid server in non-multi-user mode, the base container is at https://localhost:8443/public/

I found I also needed:

    export NODE_PATH=/Users/graham/.nvm/versions/node/v10.15.0/lib/node_modules/

    node meld_tool.js test-login \
        --provider=https://localhost:8443 \
        --username=gklyne --password=****

@@@@ add url to command line?




## WebID authentication


https://github.com/solid/solid/issues/146 (discussion)

https://github.com/njh/gen-webid-cert

https://github.com/linkeddata/node-webid/

https://github.com/jeff-zucker/solid-file-client (non-browser authentication)

https://github.com/jeff-zucker/solid-file-client/blob/master/lib/solid-shell-client.js

https://github.com/solid/solid-cli

https://github.com/solid/solid-cli/blob/master/src/SolidClient.js

https://github.com/solid/solid-cli/blob/master/bin/solid-bearer-token

https://nodejs.org/api/modules.html#modules_all_together

https://blog.filippo.io/mkcert-valid-https-certificates-for-localhost/


## Other stuff


I'm wondering if it’s possible to save a link to a gitter entry: I think   @melvincarvalho  ’s “And show how to get from A to B.” is rather important.

Ah, here it is: https://gitter.im/solid/chat?at=5c5d716028c89123cb93f683  Or  :point_up: [February 8, 2019 12:09 PM](https://gitter.im/solid/chat?at=5c5d716028c89123cb93f683)





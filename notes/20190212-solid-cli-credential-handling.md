# Credential handling for Solid command line tools

Are there any conventions for handling Solid credentials used with command line tools.  A solid server can provide a bearer token for subsequent access if presented with a username and password (e.g. see [meld-tool.js](/oerc-music/nin-remixer-public/blob/master/src/tools/meld_tool.js) `test-login` command).

A common(-ish) approach for command line tools is to provide options for supply a username and password as part of the command.  This has a disadvantage that credentials may end up appearing in shell scripts, and leaking.

Possible alternative strategies (could use a combination?):

1. Use a separate command to save credentials in a separate file outside any code repository; e.g. `~/.solid-cli/credentials.json`.  Set permissions to owner-only access.

2. Login and save authentication tokens that are tied to the current host.

3. Use environment variables.


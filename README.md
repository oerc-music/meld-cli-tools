# meld-cli-tools

MELD command line tooling for use with an LDP / Solid server.

This is intended to provide:

1. an easy way to experiment with LDP containers containing MELD annotations and SOFA match services.

2. a tool that for tesing MELD application interactions with LDP containers.

3. simple code examples for accessing and manipulating MELD data in LDP containers.

4. support for building SOFA annotation agents as simple shell scripts.

`meld_tool.js` is designed and tested with a Solid server running under node.js (https://github.com/solid/node-solid-server), but should work with other LDP servers.

The tooling currently consists of `src/meld-tool/meld_tool.js`, which is a work in progress.  See [TODO](./src/meld-tool/README.md) for status.

See also:

- [Solid server insrtallation notes](./notes/20190208-solid-server-install-run.md)
- [meld_tool installation notes](./notes/20190312-meld_tool-install-run.md)


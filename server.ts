/// <reference path="d.ts\DefinitelyTyped\node\node.d.ts" />

import http = require("http");

http.createServer(function (req, res) {
	res.end("MOTD: Autodeploy works");
}).listen(1337);
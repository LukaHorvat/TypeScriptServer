/// <reference path="d.ts\DefinitelyTyped\node\node.d.ts" />

import http = require("http");

http.createServer(function (req, res) {
	res.end("Hello");
}).listen(1337);
/// <reference path="node/node.d.ts" />
/// <reference path="socket.io/socket.io.d.ts" />
/// <reference path="express/express.d.ts" />
var io = require("socket.io");

var http = require("http");
var express = require("express");

var tick = function () {
    var startTime = Date.now();
    for (var key in players) {
        players[key].onUpdate();
    }
    var timeTaken = Date.now() - startTime;
    setTimeout(tick, 16 - timeTaken);
};
tick();

var app = express();
app.use(express.static(__dirname + "/local"));

app.get("/", function (request, response) {
    response.render("local/index.html");
});

var server = http.createServer(app);
server.listen(8442);

var Point = (function () {
    function Point(ax, ay) {
        this.x = ax;
        this.y = ay;
    }
    return Point;
})();

var Player = (function () {
    function Player() {
    }
    return Player;
})();

var players = {};

var manager = io.listen(server);

manager.set("log level", 1);
manager.sockets.on("connection", function (socket) {
    var socketName;
    var destination;
    var velocity;

    var onUpdate = function () {
        var player = players[socketName];
        var speed = magnitude(velocity);
        if (destination !== undefined) {
            var moveVector = sub(destination, player.position);
            velocity = add(velocity, mult(div(moveVector, magnitude(moveVector)), 0.3));

            if (distance(player.position, destination) < 3)
                destination = undefined;
            if (speed > 5) {
                velocity = sub(velocity, mult(div(velocity, speed), 0.4));
            }
        } else {
            if (speed > 0.5) {
                velocity = sub(velocity, mult(div(velocity, speed), 0.3));
            } else
                velocity = new Point(0, 0);
        }
        player.position = add(player.position, velocity);
        manager.sockets.emit("position", { name: socketName, position: player.position });
    };

    socket.on("hello", function (name) {
        if (typeof players[name] !== "undefined") {
            socket.emit("reject", { message: "Name already taken" });
            socket.disconnect();
            return;
        }
        socketName = name;
        for (var key in players) {
            socket.emit("new player", { name: key, color: players[key].color });
        }

        var player = new Player();
        player.position = new Point(Math.random() * 200 - 100 + 400, Math.random() * 200 - 100 + 250);
        player.onUpdate = onUpdate;
        player.color = nextColor();
        players[name] = player;
        velocity = new Point(0, 0);

        manager.sockets.emit("new player", { name: socketName, color: player.color });
        console.log("Player " + name + " joined");
    });

    socket.on("disconnect", function () {
        console.log("Disconnecting " + socketName);
        delete players[socketName];
    });

    socket.on("destination", function (point) {
        destination = point;
    });
});

var angle = 0;
function nextColor() {
    var color = HSVtoRGB(angle / 360, 0.6, 1);
    angle += 222.5;
    return (color.r << 16) + (color.g << 8) + color.b;
}

function HSVtoRGB(h, s, v) {
    var r, g, b, i, f, p, q, t;
    if (h && s === undefined && v === undefined) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0:
            r = v, g = t, b = p;
            break;
        case 1:
            r = q, g = v, b = p;
            break;
        case 2:
            r = p, g = v, b = t;
            break;
        case 3:
            r = p, g = q, b = v;
            break;
        case 4:
            r = t, g = p, b = v;
            break;
        case 5:
            r = v, g = p, b = q;
            break;
    }
    return {
        r: Math.floor(r * 255),
        g: Math.floor(g * 255),
        b: Math.floor(b * 255)
    };
}

function distance(a, b) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

function magnitude(vec) {
    return Math.sqrt(vec.x * vec.x + vec.y * vec.y);
}

function div(vec, x) {
    return new Point(vec.x / x, vec.y / x);
}

function mult(vec, x) {
    return new Point(vec.x * x, vec.y * x);
}

function sub(vec1, vec2) {
    return new Point(vec1.x - vec2.x, vec1.y - vec2.y);
}

function add(vec1, vec2) {
    return new Point(vec1.x + vec2.x, vec1.y + vec2.y);
}


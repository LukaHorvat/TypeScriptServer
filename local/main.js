/// <reference path="./references.ts" />
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
if (document.domain === "localhost" || document.domain === "127.0.0.1") {
    var socket = io.connect("http://127.0.0.1:8442");
} else {
    var socket = io.connect("http://luka.rtag.me:8442");
}
var name = prompt("Enter your name");
socket.emit("hello", name);
socket.on("reject", function (err) {
    disconnected = true;
});

socket.on("connect", function () {
    disconnected = false;
    requestAnimFrame(tick);
});

var disconnected = true;

var Point = (function () {
    function Point(ax, ay) {
        this.x = ax;
        this.y = ay;
    }
    return Point;
})();

var Player = (function () {
    function Player() {
        var _this = this;
        this.setPosition = function (pos) {
            _this.visual.position.x = pos.x;
            _this.visual.position.y = pos.y;
        };
    }
    return Player;
})();

var players = {};

var stage = new PIXI.Stage(0x000000, true);
var renderer = PIXI.autoDetectRenderer(window.innerWidth - 30, window.innerHeight - 30, null, false, true);
document.body.appendChild(renderer.view);

socket.on("new player", function (update) {
    console.log(update.name);
    var player = new Player();
    player.color = update.color;
    player.visual = new PIXI.Graphics();
    player.visual.beginFill(player.color);
    player.visual.drawCircle(0, 0, 10);
    player.visual.endFill();
    players[update.name] = player;

    stage.addChild(player.visual);
});

socket.on("position", function (update) {
    players[update.name].setPosition(update.position);
});

var mouse = new PIXI.InteractionManager(stage).mouse;

stage.click = function (data) {
    var pos = data.getLocalPosition(stage);
    if (data.originalEvent.button === 2) {
        socket.emit("destination", new Point(pos.x, pos.y));
    }
};

var startTime = Date.now();

function tick() {
    if (disconnected)
        return;
    requestAnimFrame(tick);

    // render the stage
    renderer.render(stage);
}

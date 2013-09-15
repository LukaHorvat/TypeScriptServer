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
        this.incrementPosition = function (pos) {
            _this.visual.position.x += pos.x;
            _this.visual.position.y += pos.y;
        };
    }
    return Player;
})();

var Fireball = (function () {
    function Fireball() {
        var _this = this;
        this.setPosition = function (pos) {
            _this.visual.position.x = pos.x;
            _this.visual.position.y = pos.y;
        };
    }
    return Fireball;
})();

var players = {};

var fireballs = {};

var originalGrid = [];
var workingGrid = [];

for (var i = 0; i < 20; ++i) {
    for (var j = 0; j < 20; ++j) {
        var pt = new Point(i * 50 - 500, j * 50 - 500);
        originalGrid.push(pt);
        workingGrid.push(pt);
    }
}

var stage = new PIXI.Stage(0x000000, true);
var world = new PIXI.DisplayObjectContainer();
stage.addChild(world);
var renderer = PIXI.autoDetectRenderer(window.innerWidth - 30, window.innerHeight - 30, null, false, true);
world.position.x = renderer.view.width / 2;
world.position.y = renderer.view.height / 2;
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

    world.addChild(player.visual);
});

socket.on("position", function (update) {
    players[update.name].setPosition(update.position);
});

socket.on("remove player", function (name) {
    world.removeChild(players[name].visual);
    delete players[name];
});

socket.on("new fireball", function (update) {
    var fireball = new Fireball();
    fireball.visual = new PIXI.Graphics();
    fireball.visual.beginFill(0xFFFF00);
    fireball.visual.drawCircle(0, 0, 10);
    fireball.visual.moveTo(0, -10);
    fireball.visual.lineTo(-20, 0);
    fireball.visual.lineTo(0, 10);
    fireball.visual.lineTo(0, -10);
    fireball.visual.endFill();
    fireball.visual.rotation = update.rotation;
    fireball.setPosition(update.position);
    fireballs[update.id] = fireball;

    world.addChild(fireball.visual);
});

socket.on("fireball position", function (update) {
    fireballs[update.id].setPosition(update.position);
});

socket.on("remove fireball", function (id) {
    world.removeChild(fireballs[id].visual);
    delete fireballs[id];
});

stage.click = function (data) {
    var pos = data.getLocalPosition(world);
    if (data.originalEvent.button === 2) {
        socket.emit("destination", new Point(pos.x, pos.y));
    } else if (data.originalEvent.button === 0) {
        socket.emit("fire", new Point(pos.x, pos.y));
    }
};

var startTime = Date.now();

var gridGraphics = new PIXI.Graphics();
world.addChild(gridGraphics);

function tick() {
    if (disconnected)
        return;

    for (var i = 0; i < 20 * 20; ++i) {
        workingGrid[i] = originalGrid[i];
    }

    for (var id in fireballs) {
        for (var i = 0; i < 20 * 20; ++i) {
            var fireball = new Point(fireballs[id].visual.position.x, fireballs[id].visual.position.y);
            var dist = distance(fireball, workingGrid[i]);
            if (dist > 200)
                continue;
            var move = sub(fireball, workingGrid[i]);
            workingGrid[i] = add(workingGrid[i], mult(div(move, 200), 200 - dist));
        }
    }

    gridGraphics.clear();
    gridGraphics.lineStyle(1, 0xAAAAAA, 0.3);
    for (var i = 0; i < 20; ++i) {
        for (var j = 1; j < 20; ++j) {
            gridGraphics.moveTo(workingGrid[i * 20 + j - 1].x, workingGrid[i * 20 + j - 1].y);
            gridGraphics.lineTo(workingGrid[i * 20 + j].x, workingGrid[i * 20 + j].y);
        }
    }
    for (var i = 0; i < 20; ++i) {
        for (var j = 1; j < 20; ++j) {
            gridGraphics.moveTo(workingGrid[i + j * 20 - 20].x, workingGrid[i + j * 20 - 20].y);
            gridGraphics.lineTo(workingGrid[i + j * 20].x, workingGrid[i + j * 20].y);
        }
    }

    requestAnimFrame(tick);

    // render the stage
    renderer.render(stage);
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

function normalize(vec) {
    return div(vec, magnitude(vec));
}

function dot(vec1, vec2) {
    return vec1.x * vec2.x + vec1.y * vec2.y;
}

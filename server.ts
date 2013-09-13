/// <reference path="node/node.d.ts" />
/// <reference path="socket.io/socket.io.d.ts" />
/// <reference path="express/express.d.ts" />

import io = require("socket.io");
import fs = require("fs");
import http = require("http");
import express = require("express");

var tick = function () {
	var startTime = Date.now();
	for (var key in players) {
		players[key].onUpdate();
	}
	for (var id in fireballs) {
		fireballs[id].onUpdate();
		if (magnitude(fireballs[id].position) > 2000) {
			manager.sockets.emit("remove fireball", id);
			delete fireballs[id];
			continue;
		}
		else {
			manager.sockets.emit("fireball position", { position: fireballs[id].position, id: id });
		}
		var distanceCache = [];
		var kill = false;
		for (var key in players) {
			var vec = sub(players[key].position, fireballs[id].position);
			var dist = magnitude(vec);
			if (dist < 20) {
				kill = true;
				distanceCache.push({ key: key, distance: 20, vector: normalize(vec) });
			}
			else if (dist < 100) distanceCache.push({ key: key, distance: dist, vector: normalize(vec) });
		}
		if (kill) {
			for (var i = 0; i < distanceCache.length; ++i) {
				var cache = distanceCache[i];
				players[cache.key].velocity = add(players[cache.key].velocity, mult(cache.vector, 500 / cache.distance));
			}
			manager.sockets.emit("remove fireball", id);
			delete fireballs[id];
		}
	}
	var timeTaken = Date.now() - startTime;
	setTimeout(tick, 16 - timeTaken);
}
tick();

var app = express();
app.use(express.static(__dirname + "/local"));

app.get("/", function (request, response) {
	response.render("local/index.html");
});

var server = http.createServer(app);
server.listen(8442);

class Point {
	x: number;
	y: number;

	constructor(ax: number, ay: number) {
		this.x = ax;
		this.y = ay;
	}
}

class Player {
	position: Point;
	velocity: Point;
	color: number;
	onUpdate: () => void;
}

class Fireball {
	position: Point;
	rotation: number;
	velocity: Point;
	onUpdate = () => {
		this.position = add(this.position, this.velocity);
	}
}

var players: {
	[name: string]: Player
} = {};
var dummy = new Player();
dummy.color = 0xFF0000;
dummy.position = new Point(0, 0);
dummy.velocity = new Point(0, 0);
dummy.onUpdate = function () {
	var player = players["dummy"];
	var velocity = player.velocity;
	var speed = magnitude(velocity);
	if (speed > 0.5) {
		velocity = sub(velocity, mult(div(velocity, speed), 0.3));
	} else velocity = new Point(0, 0);
	player.position = add(player.position, velocity);
	manager.sockets.emit("position", { name: "dummy", position: player.position });

	player.velocity = velocity;
}
players["dummy"] = dummy;

var fireballId = 0;
var fireballs: {
	[id: number]: Fireball
} = {};

var manager = io.listen(server);

manager.set("log level", 1);
manager.sockets.on("connection", function (socket) {
	var socketName: string;
	var destination: Point;

	var lastShot: number = 0;

	var onUpdate = function () {
		var player = players[socketName];
		var velocity = player.velocity;
		var speed = magnitude(velocity);
		if (destination !== undefined) {
			var moveVector = sub(destination, player.position);
			velocity = add(velocity, mult(normalize(moveVector), 0.3));

			if (distance(player.position, destination) < 10) destination = undefined;
			if (speed > 4) {
				velocity = sub(velocity, mult(div(velocity, speed), 0.4));
			}
		} else {
			if (speed > 0.5) {
				velocity = sub(velocity, mult(div(velocity, speed), 0.3));
			} else velocity = new Point(0, 0);
		}
		player.position = add(player.position, velocity);
		manager.sockets.emit("position", { name: socketName, position: player.position });

		player.velocity = velocity;
	}

	socket.on("hello", (name: string) => {
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
		player.position = new Point(Math.random() * 200 - 100, Math.random() * 200 - 100);
		player.onUpdate = onUpdate;
		player.color = nextColor();
		player.velocity = new Point(0, 0);
		players[name] = player;

		manager.sockets.emit("new player", { name: socketName, color: player.color });
		console.log("Player " + name + " joined");
	});

	socket.on("disconnect", function () {
		console.log("Disconnecting " + socketName);
		manager.sockets.emit("remove player", socketName);
		delete players[socketName];
	});

	socket.on("destination", function (point: Point) {
		destination = point;
	});

	socket.on("fire", function (point: Point) {
		if (Date.now() - lastShot > 1000) {
			var fireball = new Fireball();
			fireball.position = players[socketName].position;
			var moveVector = sub(point, players[socketName].position);
			fireball.velocity = mult(normalize(moveVector), 5);
			fireball.position = add(fireball.position, mult(fireball.velocity, 4));
			fireball.rotation = Math.atan2(fireball.velocity.y, fireball.velocity.x);

			fireballs[fireballId] = fireball;
			manager.sockets.emit("new fireball", { rotation: fireball.rotation, id: fireballId, position: fireball.position });

			fireballId++;

			lastShot = Date.now();
		}
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
		case 0: r = v, g = t, b = p; break;
		case 1: r = q, g = v, b = p; break;
		case 2: r = p, g = v, b = t; break;
		case 3: r = p, g = q, b = v; break;
		case 4: r = t, g = p, b = v; break;
		case 5: r = v, g = p, b = q; break;
	}
	return {
		r: Math.floor(r * 255),
		g: Math.floor(g * 255),
		b: Math.floor(b * 255)
	};
}

function distance(a: Point, b: Point): number {
	return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

function magnitude(vec: Point): number {
	return Math.sqrt(vec.x * vec.x + vec.y * vec.y);
}

function div(vec: Point, x: number): Point {
	return new Point(vec.x / x, vec.y / x);
}

function mult(vec: Point, x: number): Point {
	return new Point(vec.x * x, vec.y * x);
}

function sub(vec1: Point, vec2: Point): Point {
	return new Point(vec1.x - vec2.x, vec1.y - vec2.y);
}

function add(vec1: Point, vec2: Point): Point {
	return new Point(vec1.x + vec2.x, vec1.y + vec2.y);
}

function normalize(vec: Point): Point {
	return div(vec, magnitude(vec));
}
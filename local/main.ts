/// <reference path="./references.ts" />

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

class Point {
	x: number;
	y: number;

	constructor(ax: number, ay: number) {
		this.x = ax;
		this.y = ay;
	}
}

class Player {
	color: number;
	visual: PIXI.Graphics;
	setPosition = (pos: Point) => {
		this.visual.position.x = pos.x;
		this.visual.position.y = pos.y;
	}
	incrementPosition = (pos: Point) => {
		this.visual.position.x += pos.x;
		this.visual.position.y += pos.y;
	}
}

class Fireball {
	visual: PIXI.Graphics;
	setPosition = (pos: Point) => {
		this.visual.position.x = pos.x;
		this.visual.position.y = pos.y;
	}
}

var players: {
	[name: string]: Player
} = {};

var fireballs: {
	[id: number]: Fireball
} = {}

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

socket.on("position", function (update: { name: string; position: Point }) {
	players[update.name].setPosition(update.position);
});

socket.on("remove player", function (name: string) {
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

socket.on("fireball position", function (update: { id: number; position: Point }) {
	fireballs[update.id].setPosition(update.position);
});

socket.on("remove fireball", function (id: number) {
	world.removeChild(fireballs[id].visual);
	delete fireballs[id];
});

stage.click = function (data) {
	var pos = data.getLocalPosition(world);
	if (data.originalEvent.button === 2) {
		socket.emit("destination", new Point(pos.x, pos.y));
	}
	else if (data.originalEvent.button === 0) {
		socket.emit("fire", new Point(pos.x, pos.y));
	}
}

var startTime = Date.now();

function tick() {
	if (disconnected) return;
	requestAnimFrame(tick);
	// render the stage   
	renderer.render(stage);
}
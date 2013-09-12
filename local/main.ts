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
}

var players: {
	[name: string]: Player
} = {};

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

socket.on("position", function (update: { name: string; position: Point }) {
	
	players[update.name].setPosition(update.position);
});

var mouse = new PIXI.InteractionManager(stage).mouse;

stage.click = function (data) {
	var pos = data.getLocalPosition(stage);
	if (data.originalEvent.button === 2) {
		socket.emit("destination", new Point(pos.x, pos.y));
	}
}

var startTime = Date.now();

function tick() {
	if (disconnected) return;
	requestAnimFrame(tick);


	// render the stage   
	renderer.render(stage);
}
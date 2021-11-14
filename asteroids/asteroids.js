window.addEventListener('DOMContentLoaded', (event) => {
	var canvas = document.getElementById("asteroids");
	var context = canvas.getContext("2d");
	
	var radius = 40;
	var x = radius;
	var y = context.canvas.height * 0.25;
	var xspeed = 5;
	var yspeed = 0;
	var gravity = 0.01;
	var friction = 0.05;

	function frame() {
		context.clearRect(0, 0, context.canvas.width, context.canvas.height);
		draw(context);
		update();
	}

	function update() {
		x += xspeed;
		y += yspeed;
		yspeed += gravity;
		if(x >= context.canvas.height - radius || x < radius) {
			xspeed *= -1 + friction;
		}
		if(y >= context.canvas.height - radius || y < radius) {
			yspeed *= -1 + friction;
		}
	}

	function draw(context) {
		draw_grid(context);
		context.beginPath();
		context.arc(x, y, radius, 0, 2 * Math.PI);
		context.fill();
		context.stroke();
	}
	setInterval(frame, 1000.0/60.0);
});


function grayBox (canvas) {
	var context = canvas.getContext("2d");
	context.strokeStyle = 'dimgrey';
	context.lineWidth = 5;
	context.rect(75, 75, 250, 250);
	context.stroke();
}

function draw_grid (context, minor, major, stroke, fill) {
	minor = minor || 10;
	major = major || minor * 5;
	context.save;
	context.strokeStyle = stroke || "#00FF00";
	context.fillStyle = fill || "#009900";
	
	let width = context.canvas.width;
	let height = context.canvas.height;
	
	for(var x = 0; x < width; x += 10) {
		context.beginPath();
		context.moveTo(x, 0);
		context.lineTo(x, height);
		if(x % 50 == 0) {
			context.lineWidth = 0.5;
			context.fillText(x, x, 10);
		}
		else
		{
			context.lineWidth = 0.25;
		}
		context.stroke();
	}

	for(var y = 0; y < height; y += 10) {
		context.beginPath();
		context.moveTo(0, y);
		context.lineTo(height, y);
		if(y % 50 == 0) {
			context.lineWidth = 0.5;
			context.fillText(y, 0, y + 10);
		}
		else
		{
			context.lineWidth = 0.25;
		}
		context.stroke();
	}
	context.restore();
}

function draw_ship (context, radius, options) {
	context.save();
	
	// Default values
	options = options || {};
	let angle = (options.angle || 0.5 * Math.PI) / 2;
	let curveRear = options.curveRear || 0.5;
	let curveSide = options.curveSide || 0.75;
	
	// Create guide circle
	if(options.guide) {
		context.strokeStyle = "white";
		context.fillStyle= "rgba(0, 0, 0, 0.25)";
		context.lineWidth = 0.5;
		context.beginPath();
		context.arc(0, 0, radius, 0, 2 * Math.PI);
		context.stroke();
		context.fill();
	}
	
	context.lineWidth = options.lineWidth || 2;
	context.strokeStyle = options.stroke || "white";
	context.fillStyle = options.fill || "black";
	
	// Draw the ship
	context.beginPath();
	context.moveTo(radius, 0);
	context.quadraticCurveTo(
		Math.cos(angle) * radius * curveSide,
		Math.sin(angle) * radius * curveSide,
		Math.cos(Math.PI - angle) * radius,
		Math.sin(Math.PI - angle) * radius
	);
	context.quadraticCurveTo(
		radius * curveRear - radius,
		0,
		Math.cos(Math.PI + angle) * radius,
		Math.sin(Math.PI + angle) * radius
	);
	context.quadraticCurveTo(
		Math.cos(-angle) * radius * curveSide,
		Math.sin(-angle) * radius * curveSide,
		radius,
		0
	);
	context.fill();
	context.stroke();
	
	// Ship curve guide
	if(options.guide) {
		context.strokeStyle = "white";
		context.fillStyle = "white";
		context.lineWidth = 0.5;
		
		// Lines from center along curve centers
		context.beginPath();
		context.moveTo(
			Math.cos(-angle) * radius,
			Math.sin(-angle) * radius
		);
		context.lineTo(0, 0);
		context.lineTo(
			Math.cos(angle) * radius,
			Math.sin(angle) * radius
		);
		context.moveTo(-radius, 0);
		context.lineTo(0, 0);
		context.stroke();
		
		// Curve intensity guide balls
		context.beginPath();
		context.arc(
			Math.cos(angle) * radius * curveSide,
			Math.sin(angle) * radius * curveSide,
			radius/40, 0, 2 * Math.PI
		);
		context.fill();
		context.beginPath();
		context.arc(
			Math.cos(-angle) * radius * curveSide,
			Math.sin(-angle) * radius * curveSide,
			radius/40, 0, 2 * Math.PI
		);
		context.fill();
		context.beginPath();
		context.arc(
			radius * curveRear - radius, 0,
			radius/40, 0, 2 * Math.PI
		);
		context.fill();
	}
	
	context.restore();
}

function shape_asteroid (segments) {
	segments = segments || 8;
	let shape = [segments];
	for(let i = 0; i < segments; i++) {
		shape[i] = Math.random() - 0.5;
	}
	return shape;
}

function draw_asteroid (context, radius, shape, options) {
	context.save();
	options = options || {};
	radius = radius || 50;
	let noise = options.noise || 0.5
	
	// Create guide circle
	if(options.guide) {
		context.strokeStyle = "white";
		context.fillStyle= "rgba(0, 0, 0, 0.25)";
		context.lineWidth = 0.5;
		context.beginPath();
		context.arc(0, 0, radius, 0, 2 * Math.PI);
		context.stroke();
		context.fill();
	}
	
	context.lineWidth = options.lineWidth || 2;
	context.strokeStyle = options.stroke || "white";
	context.fillStyle = options.fill || "black";
	
	context.beginPath();
	context.moveTo(radius * (1 + shape[0] * noise), 0);
	// Draw asteroid
	for(let i = 1; i < shape.length; i++) {
		let length = radius * (1 + shape[i] * noise);
		context.lineTo(
			Math.cos(Math.PI * i * 2 / shape.length) * length,
			Math.sin(Math.PI * i * 2 / shape.length) * length
		);
	}
	context.closePath();
	context.stroke();
	context.fill();
	
	context.restore();
}
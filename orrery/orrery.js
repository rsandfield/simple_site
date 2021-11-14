$(document).ready(function() {
    canvas = document.getElementById("canvas");
    context = canvas.getContext("2d");
    
    orrery = new Orrery();

    document.addEventListener('wheel', orrery.scroll.bind(orrery));
    document.addEventListener('keydown', orrery.keydown.bind(orrery));
});

const bigG = 6.673 * Math.pow(10, -11);
const StefanBoltzman = 5.670373 * Math.pow(10, -8);

function newtonsApproximation (meanAnomaly, eccentricity, prior = null) {
    if(prior === null || isNaN(prior)) {
        return meanAnomaly;
    }
    return prior -
        (prior - eccentricity * Math.sin(prior) - meanAnomaly) /
        (1 - eccentricity * Math.cos(prior));
}

function approximateEccentricAnomaly (meanAnomaly, eccentricity, maxIterations = 20) {
    let last = meanAnomaly;
    for(let i = 0; i < maxIterations; i++) {
        let next = newtonsApproximation(meanAnomaly, eccentricity, last);
        if(next == last) break;
        last = next;
    }
    return last;
}

class Vector {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
	
	add(vector) {
		return new Vector(
			this.x + vector.x,
			this.y + vector.y
		);
	}
	
	subtract(vector) {
		return new Vector(
			this.x - vector.x,
			this.y - vector.y
		);
	}
	
	multiply(scalar) {
		return new Vector(
			this.x * scalar,
			this.y * scalar
		);
	}
	
	divide(scalar) {
		return new Vector(
			this.x / scalar,
			this.y / scalar
		);
    }
    
    average(vector) {
        return this.add(vector).divide(2);
    }
	
	rotate(radians) {
		let magnitude = this.magnitude();
		let angle = this.angle();
		return new Vector(
			magnitude * Math.cos(angle + radians),
			magnitude * Math.sin(angle + radians)
		);
	}
	
	angle(vector = new Vector(0, 0)) {
		return Math.atan2(this.y - vector.y, this.x - vector.x);
	}
	
	magnitudeSquared() {
		return Math.pow(this.x, 2) + Math.pow(this.y, 2);
	}
	
	magnitude() {
		return Math.pow(this.magnitudeSquared(), 0.5);
	}
	
	normalized() {
		let magnitude = this.magnitude();
		return new Vector(
			this.x / magnitude,
			this.y / magnitude
		);
	}
	
	dotProduct(vector) {
		return this.x * vector.x + this.y * vector.y;
	}
	
	crossProduct(vector) {
		return this.x * vector.y - this.y * vector.x;
	}
	
	toString() {
		return shortString(this.x, 5) + ", " + shortString(this.y, 5);
	}
}

class Orbit {
    static displayModes = {none: 0, hard: 1, faint: 2, trail: 3, sectors: 4};

    constructor (
        primary,
        eccentricity = 0, semimajor = 149.6,
        inclination = 0, ascendingNode = 0,
        periapsis = 0, meanAnomaly = 0,
        settings = {}
    ) {
        this.eccentricity = eccentricity;
        this.semimajor = semimajor;
        this.semiminor = this.semimajor * Math.sqrt(1 - Math.pow(this.eccentricity, 2));
        this.linearEccentricity = Math.sqrt(Math.pow(this.semimajor, 2) - Math.pow(this.semiminor, 2));

        this.inclination = inclination;
        this.ascendingNode = ascendingNode;
        this.periapsis = periapsis;
        this.meanAnomalyOffset = meanAnomaly;

        this.primary = primary;
        if(this.primary instanceof Body) {
            this.mu = primary.mass * bigG;
        } else {
            this.mu = 1;
        }
        this.period = Math.sqrt(Math.pow(this.semimajor, 3) / this.mu) * 2 * Math.PI;
        this.position = this.positionAt(0);

        this.display = settings.display || Orbit.displayModes.segments;
        this.segments = settings.segments || 12;
        this.pathColor = settings.pathColor || "black";
    }

    positionAt(epoch) {
        if(this.period <= 0) {
            return this.primary;
        }

        //Find mean anomaly given epoch within period
        let meanAnomaly = this.meanAnomalyOffset + (epoch % this.period) / this.period * 2 * Math.PI;
        //Correct if offset places mean anomaly outside unit circle
        if(meanAnomaly > 2 * Math.PI) {
            meanAnomaly -= 2 * Math.PI;
        }

        //Use Newton's approxmiation to recursively converge on eccentric anomaly
        let eccentricAnomaly = approximateEccentricAnomaly(meanAnomaly, this.eccentricity);

        //Find x and y positions on 2d plane of orbit from eccentric anomaly and axial lengths
        let position = new Vector(
            Math.cos(eccentricAnomaly) * this.semimajor - this.linearEccentricity,
            Math.sin(eccentricAnomaly) * this.semiminor
        ).rotate(this.periapsis);
        
        if(this.primary instanceof Body) {
            position = position.add(this.primary.positionAt(epoch));
        } else {
            position.add(this.primary);
        }

        //fin
        return position;
    }

    drawPath (scale = 1) {
        context.save();

        context.strokeStyle = this.pathColor;
        context.fillStyle = this.pathColor;

        context.beginPath();
        context.ellipse(
            -this.linearEccentricity * scale, 0,
            this.semimajor * scale, this.semiminor * scale,
            0,
            0, 2 * Math.PI
        );
        context.stroke();
        
        context.restore();
    }

    drawSegments(scale = 1) {
        if(this.semimajor * scale < orrery.minimumDraw) return;

        context.save();

        context.strokeStyle = this.pathColor;
        context.fillStyle = this.pathColor;
        
        for(let i = 0; i < this.segments; i++) {
            context.globalAlpha = 0.05 * (i%2+1);
            
            context.beginPath();
            let lead = approximateEccentricAnomaly(i / this.segments * Math.PI * 2, this.eccentricity);
            let trail = approximateEccentricAnomaly((i+1) / this.segments * Math.PI * 2, this.eccentricity);
            let delta = 3;
            if(this.semiminor * scale < delta) {
                delta = this.semiminor * 0.1 * scale;
            }
            context.ellipse(
                -this.linearEccentricity * scale, 0,
                this.semimajor * scale + delta, this.semiminor * scale + delta,
                0,
                lead,
                trail
            );
            context.ellipse(
                -this.linearEccentricity * scale, 0,
                this.semimajor * scale - delta, this.semiminor * scale - delta,
                0,
                trail,
                lead,
                true
            );
            context.closePath();
            context.fill();
        }

        context.restore();
    }

    draw(scale = 1) {
        context.save();
        context.rotate(this.periapsis)
        let transform = this.primary instanceof Body ? this.primary.position : this.primary;
        context.translate(transform.x * scale, transform.y * scale);

        switch(this.display) {
            case Orbit.displayModes.segments:
                this.drawSegments(scale);
                break;

            case Orbit.displayModes.faint:
                context.globalAlpha = 0.2;
                this.drawPath(scale);
                break;

            case Orbit.displayModes.hard:
                this.drawPath(scale);
                break;

            case Orbit.displayModes.trail:
                for(let i = 0; i < this.segments; i++) {
                    context.beginPath();
                    context.ellipse(
                        -this.linearEccentricity * scale, 0,
                        this.semimajor * scale, this.semiminor * scale,
                        0,
                        this.eccentricAnomaly,
                        this.eccentricAnomaly - i / this.segments
                    );
                    context.stroke();
                }
        }

        context.restore();
    }    
}

class Body {
    static displayModes = {none: 0, outline: 1, fill: 2};
    constructor (name, orbit, mass, settings) {
        this.name = name;
        this.mass = mass;

        mass /= 0.005972;

        if(mass < 2.04) {
            this.radius = 1.008 * Math.pow(mass, 0.279) * 0.005972;
        }
        else if(mass > 132) {
            this.radius = 17.745 * Math.pow(mass, -0.044) * 0.005972;
        }
        else {
            this.radius = 0.808 * Math.pow(mass, 0.589) * 0.005972
        }

        this.orbit = orbit;
        if(orbit instanceof Orbit) {
            this.hillSphere = this.orbit.semimajor * (1 - this.orbit.eccentricity) * Math.pow(this.mass / (3 * this.orbit.primary.mass), 1/3);
        }

        this.outlineColor = settings.outline || "black";
        this.fillColor = settings.fill || "blue";
    }

    positionAt(epoch) {
        if(this.orbit instanceof Orbit) {
            return(this.orbit.positionAt(epoch));
        }
        else {
            return this.orbit;
        }
    }

    drawOutline (scale = 1) {
        context.save();

        context.strokeStyle = this.outlineColor;
        context.fillStyle = this.outlineColor;

        textArc(this.position.x * scale, this.position.y * scale, orrery.minimumDraw, this.name);

        context.beginPath();
        context.arc(this.position.x * scale, this.position.y * scale, orrery.minimumDraw / 8, 0, 2 * Math.PI);
        context.fill();

        context.restore();
    }

    drawFilled(scale = 1) {
        context.save();

        context.strokeStyle = this.outlineColor;
        context.fillStyle = this.fillColor;

        context.beginPath();
        context.arc(
            this.position.x * scale, this.position.y * scale,
            this.radius * scale,
            0, 2 * Math.PI
        );
        context.fill();

        context.restore();
    }

    drawHillSphere(scale) {
        if(this.hillSphere && this.hillSphere * scale >= orrery.minimumDraw) {
            context.save();
    
            context.strokeStyle = this.outlineColor;
            context.fillStyle = this.outlineColor;

            textArc(this.position.x * scale, this.position.y * scale, this.hillSphere * scale, this.name, "SOI");

            context.restore();
        }
    }

    draw (scale = 1) {
        if(this.orbit.semimajor * scale < orrery.minimumDraw) return;
        
        if(this.hillSphere * scale < orrery.minimumDraw) {
            this.drawOutline(scale);
        } else {
            this.drawHillSphere(scale);
            
            switch(this.display) {
                case Body.displayModes.fill:
                    this.drawFilled(scale);           
                    break;
                case Body.displayModes.outline:
                    this.drawOutline(scale);
                    break;
            }
        }
    }
}

class Star extends Body {
    constructor (name, orbit, mass, temperature, settings) {
        super(name, orbit, mass, settings);
        this.radius = 0.696340;       //km
        this.temperature = temperature;
        this.luminosity = 4 * Math.PI * Math.pow(this.radius, 2) * Math.pow(this.temperature, 4) * StefanBoltzman;
    }

    irradianceAtDistance(radius) {
        return this.luminosity / (4 * Math.PI * Math.pow(radius, 2));
    }

    distanceOfIrradiance(irradiance) {
        return Math.sqrt(this.luminosity / (4 * Math.PI * irradiance));
    }

    blackbodyEqualibrium(radius, albedo = 0) {
        return Math.pow((1 - albedo) * this.irradianceAtDistance(radius) / (4 * StefanBoltzman), 1/4);
    }

    drawIrradiance (scale = 1) {
        context.save();
        context.strokeStyle = "black";

        for(let i = 1; i < 15; i++) {
            let distance = Math.pow(2, i);
            if(distance > this.radius && distance * scale >= orrery.minimumDraw) {
                let temperature = Math.round(this.blackbodyEqualibrium(distance) * 10) / 10 + "K";
                textArc(this.position.x * scale, this.position.y * scale, distance * scale, temperature);
            }
        }

        context.restore();
    }

    draw (scale = 1) {
        context.save();

        this.drawIrradiance(scale);

        context.strokeStyle = this.outlineColor;
        context.fillStyle = this.fillColor;

        context.beginPath();
        context.arc(
            this.position.x * scale, this.position.y * scale,
            (Math.log(this.radius)+6) * scale, 0, 2 * Math.PI
        );
        context.stroke();
        context.fill();

        context.restore();
    }
}

class Planet extends Body {
    constructor (name, orbit, mass, settings = {}) {
        super(name, orbit, mass, settings);

        this.display = settings.display || Body.displayModes.fill;
    }
}

class Lambert {
    constructor(start, destination, time = 1000) {
        this.start = start;
        this.destination = destination;
        this.time = time;

        if(start.orbit.primary == destination.orbit.primary) {
            this.primary = start.orbit.primary;
        } else {
            //TODO
        }
    }

    draw (scale = 1) {
        context.save();

        let future = this.destination.positionAt(orrery.epochStart + orrery.epoch + this.time);

        let angle = this.start.position.angle(future);
        let center = this.start.position.average(future);

        let restart = this.start.position.subtract(center).rotate(-angle);
        let redest = this.destination.position.subtract(center).rotate(-angle);
        let reprime = this.primary.position.subtract(center).rotate(-angle);
        
        context.strokeStyle = "blue";

        context.beginPath();
        context.moveTo(restart.x * scale, restart.y * scale);
        context.lineTo(redest.x * scale, redest.y * scale);
        context.lineTo(reprime.x * scale, reprime.y * scale);
        context.lineTo(restart.x * scale, restart.y * scale);
        context.stroke();
        
        context.strokeStyle = "red";

        context.beginPath();
        context.moveTo(-500, 0);
        context.lineTo(500, 0);
        context.stroke();

        context.font = "30px arial";
        context.fillText("🜨", restart.x * scale - 7.5, restart.y * scale + 7.5);
        context.fillText("♂", redest.x * scale - 7.5, redest.y * scale + 5);
        context.fillText("☉", reprime.x * scale - 12.5, reprime.y * scale + 9);
        

        let c = restart.subtract(redest).magnitude();
        let r1 = this.start.position.subtract(this.primary.position).magnitude();
        let r2 = future.subtract(this.primary.position).magnitude();

        let d = Math.sqrt(r1**2 + r2**2 - 2 * r1 * r2 * Math.cos(angle)) / 2;
        let A = (r2 - r1) / 2;
        let E = d / A;
        let sign = Math.sign(A);
        let B = Math.abs(A) * Math.sqrt(E**2 - 1);

        context.beginPath();
        context.moveTo(-A, -B);
        context.lineTo(A, -B);
        context.lineTo(A, B);
        context.lineTo(-A, B);
        context.closePath();
        context.stroke();

        context.beginPath();
        context.moveTo(A * 5, B * 5);
        context.lineTo(-A * 5, -B * 5);
        context.stroke();

        context.beginPath();
        context.moveTo(-A * 5, B * 5);
        context.lineTo(A * 5, -B * 5);
        context.stroke();

        context.strokeStyle = "blue";

        let steps = 20;
        let step = 10;
        let points = [];
        for(let i = 0; i < steps; i++) {
            points.push(new Vector(B / Math.sqrt((i*step/A)**2 - 1) / 2, i * step));
        }
        

        let horn0 = [];
        let horn1 = [];

        for(let i = steps - 1; i > 0; i--) {
            horn0.push(new Vector(points[i].x, -points[i].y))//.rotate(angle).add(center));
            horn1.push(new Vector(-points[i].x, -points[i].y))//.rotate(angle).add(center));
        }
        for(let i = 0; i < steps; i++) {
            horn0.push(new Vector(points[i].x, points[i].y))//.rotate(angle).add(center));
            horn1.push(new Vector(-points[i].x, points[i].y))//.rotate(angle).add(center));
        }

        context.beginPath();
        context.moveTo(horn0[0].x * scale, horn0[0].y * scale);
        for(let i = 1; i < horn0.length; i++) {
            context.lineTo(horn0[i].x * scale, horn0[i].y * scale);
        }
        context.stroke();

        context.beginPath();
        context.moveTo(horn1[0].x * scale, horn1[0].y * scale);
        for(let i = 1; i < horn1.length; i++) {
            context.lineTo(horn1[i].x * scale, horn1[i].y * scale);
        }
        context.stroke();

        context.restore();
    }
}

class Orrery {
    static states = {initializing: 0, ready: 1};
    static viewModes = {orbits: 0, lambert: 1};
    constructor(bodies) {
        this.state = Orrery.states.initializing;
        this.epoch = 0;
        this.last = Date.now();
        this.speed = 1000;
        this.scale = 1.5;
        this.scaleMax = 10000;
        this.scaleMin = 0.04;
        this.minimumDraw = 15;
        this.viewMode = Orrery.viewModes.orbits;

        this.targetIndex = 0;
        this.bodies = [];
        let filename = "./solarsystem.txt";
        this.parseFile(filename);
    }

    parseFile(filename) {
        let http = new XMLHttpRequest();
        http.open('get', filename);
        http.addEventListener('load', function () {
            let lines = http.responseText.split('\n');
            //Extrats the epoch reference frame and converts it into a Date object for storage
            let d = lines[parseInt(lines[1])].split(' ');
            for(let i = d.length; i < 7; i++) {
                d[i] = 0;
            }
            this.epochStart = Date.UTC(d[0], d[1], d[2], d[3], d[4], d[5], d[6]);

            this.parseSubsystem(lines, new Vector(0, 0), parseInt(lines[1]) + 1, 1);
            this.target = this.bodies[this.targetIndex];//new Vector(0, 0);
            this.state = Orrery.states.ready;

            this.lambert = new Lambert(this.bodies[3], this.bodies[5]);

            setInterval(this.update.bind(this), 1000.0/60.0);
        }.bind(this));
        http.send();
    }

    parseSubsystem(lines, primary, start, count) {
        let offset = 1;
        for(let i = 0; i < count; i++) {
            let sats = this.parseLineToBody(lines[start + i + offset], primary);
            if(sats > 0) {
                offset += this.parseSubsystem(lines, this.bodies[this.bodies.length-1], start + i + offset, sats);
            }
        }
        return offset;
    }

    parseLineToBody(line, primary) {
        line = line.split(" ").filter(element => element.length > 0);
        for(let i = 2; i < 10; i++) {
            line[i] = parseFloat(line[i]);
        }
        let orbit = new Orbit(primary, line[7], line[6], degToRad(line[4]), degToRad(line[3]), degToRad(line[5]), degToRad(line[8]));
        let body;
        switch(line[0]) {
            case "Star":
                body = (new Star(line[1], orbit, line[9], 5778, {fill:line[10]}));
                break;
            case "Planet":
                body = (new Planet(line[1], orbit, line[9], {fill:line[10]}));
                break;
        }
        this.bodies.push(body);
        return line[2];
    }

    setViewMode (mode) {
        switch(mode) {
            case 'orbits':
                this.viewMode = Orrery.viewModes.orbits;
                this.target = this.bodies[this.targetIndex];
                break;
            case 'lambert':
                this.viewMode = Orrery.viewModes.lambert;
                this.target = this.bodies[0];
                break;
        }
    }

    update () {
        let now = Date.now();
        this.epoch += (now - this.last) * this.speed;
        this.last = now;

        this.bodies.forEach(body => {
            body.position = body.positionAt(this.epochStart + this.epoch);
        });

        this.draw();
    }
    
    zoom(delta) {
        this.scale = clamp(this.scale * delta, this.scaleMin, this.scaleMax);
    }

    scroll(event) {
        this.zoom((Math.pow(2, -(event.deltaY * 0.01)) + 1) / 2);
    }

    keydown(event) {
        switch(event.code) {
            case 'Equal':
            case 'NumpadAdd':
                this.speed *= 1.5;
                break;
            case 'Minus':
            case 'NumpadSubtract':
                this.speed *= 0.75;
                break;
            case 'ArrowUp':
                this.zoom(1.5);
                break;
            case 'ArrowDown':
                this.zoom(0.75);
                break;
            case 'ArrowRight':
                this.targetIndex += 1;
                if(this.targetIndex >= this.bodies.length) this.targetIndex = 0;
                break;
            case 'ArrowLeft':
                this.targetIndex -= 1;
                if(this.targetIndex < 0) this.targetIndex = this.bodies.length - 1;
                break;
        }
        this.target = this.bodies[this.targetIndex];
    }

    draw () {
        context.clearRect(0, 0, canvas.width, canvas.height);

        let zero = new Date(this.epochStart + this.epoch * 1000);

        context.save();

        let transform = this.target instanceof Body ? this.target.position : this.target;
        context.translate(canvas.width/2 - transform.x * this.scale, canvas.height/2 - transform.y * this.scale);

        switch(this.viewMode) {
            case Orrery.viewModes.orbits:
                this.bodies.forEach(body => {
                    if(body.orbit instanceof Orbit) {
                        body.orbit.draw(this.scale);
                    }
                });
        
                this.bodies.forEach(body => {
                    body.draw(this.scale);
                });
                break;
            case Orrery.viewModes.lambert:
                this.lambert.draw(this.scale);
                break;
        }

        context.translate(-(canvas.width/2 - transform.x * this.scale), -(canvas.height/2 - transform.y * this.scale));
        
        context.font = "12px arial";

        let dateString = zero.getDay() + " " + zero.toLocaleString('default', {month:'long'}) + " " + zero.getFullYear();

        context.fillStyle = "gray";
        context.globalAlpha = 0.5;

        context.beginPath();
        context.rect(5, 5, context.measureText(dateString).width + 10, 22);
        context.fill();

        context.beginPath();
        context.rect(5, canvas.height - 67, context.measureText("Change planet: Left / Right arrow").width + 10, 62);
        context.fill();

        context.globalAlpha = 1;
        context.fillStyle = "black";

        context.fillText(dateString, 10, 20);

        context.fillText("Change planet: Left / Right arrow", 10, canvas.height - 50);
        context.fillText("Change zoom: Up / Down arrow", 10, canvas.height - 30);
        context.fillText("Change speed: + / -", 10, canvas.height - 10);

        context.restore();
    }
}

function degToRad(degrees) {
    return degrees / 180 * Math.PI;
}

function clamp(a,b,c) {
	return Math.max(b,Math.min(c,a));
}

function textArc(x, y, r, top = null, bottom = null, settings = {}) {
    context.save();

    let fontSize = settings.fontSize || 12;
    let font = settings.font || "arial";
    context.font = fontSize + "px " + font;
    
    let topAngle, bottomAngle = 0;
    if(top !== null) {
        topAngle = (context.measureText(top).width + 10) / (2 * r);
    }
    if(bottom !== null) {
        bottomAngle = (context.measureText(bottom).width + 10) / (2 * r);
    }

    context.beginPath();
    context.arc(x, y, r, Math.PI * 0.5 + bottomAngle, Math.PI * 1.5 - topAngle);
    context.stroke();
    
    context.beginPath();
    context.arc(x, y, r, Math.PI * 1.5 + topAngle, Math.PI * 0.5 - bottomAngle)
    context.stroke();

    if(top !== null) context.fillText(top, x - context.measureText(top).width/2, y - r + 5);
    if(bottom !== null) context.fillText(bottom, x - context.measureText(bottom).width/2, y + r + 5);

    context.restore();
}
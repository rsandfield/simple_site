/* jshint esversion: 7 */

var game;       //Game object global variable
var map = [];   //Map of active key presses

/**
 * Wait for the page to be loaded to access HTML elements
 */
window.addEventListener("DOMContentLoaded", (event) => {
    landing = document.getElementById("landing");
    canvas = document.getElementById("canvas");
    context = canvas.getContext("2d");

    //Start animation loop
    setInterval(frame, 1000.0/60.0);

    startGame();
});

/**
 * Start a new Debris game
 */
function startGame() {
    //Toggle displayed elements
    canvas.style.display = "block";
    landing.style.display = "none";

    //Initialize the game
    canvas.focus();
    game = new DebrisGame();

    //Add input event listeners
    canvas.addEventListener("mousemove", event => {game.trackMouse(event);});
    canvas.addEventListener("mousedown", event => {game.click(event);});
    canvas.addEventListener("keydown", event => {game.trackKeys(event);});
    canvas.addEventListener("keyup", event => {game.trackKeys(event);});

    //Start game logic
    game.start();
}

/**
 * Return player to landing page
 */
function endGame() {
    canvas.style.display = "none";
    landing.style.display = "block";
}

/**
 * Animation loop, simply calls game draw function
 */
function frame() {
    game.update();
    game.draw();
}

/**
 * The DebrisGame class creates an object which handles all game logic
 */
class DebrisGame {
    static states = {paused:0, running:1, over:2}

    constructor() {
        this.ship = new Ship();
        this.projectiles = [];
        this.asteroids = [];
        this.ufo = new UFO();

        this.score = 0;
        this.stage = 1;
        this.lives = 3;
        this.maxLives = 6;
        this.pulse = 0;
        this.state = DebrisGame.states.paused;
    }

    /**
     * Convert mouse position on page to position on canvas
     * @param {Event} event 
     * @returns {Object} x, y position relative to canvas 0, 0
     */
    canvasPosition(event) {
        let rect = canvas.getBoundingClientRect();
        let x = clamp(event.clientX - rect.left, 0, canvas.width);
        let y = clamp(event.clientY - rect.top, 0, canvas.height);
        return {x: x, y: y};
    }

    /**
     * Check the mouse position vs all buttons to see if it is over them
     * @param {Event} event 
     */
    trackMouse(event) {
        let position = this.canvasPosition(event);
    }

    /**
     * Check the mouse position vs all buttons to see if it has clicked them
     * @param {Event} event 
     */
    click(event) {
        let position = this.canvasPosition(event);
        if(this.state == DebrisGame.states.over) {
            endGame();
        }
    }

    /**
     * Maps the key code of the event triggering key to a boolean based on if
     * it is being pressed or released
     * @param {Event} event 
     */
    trackKeys(event) {
        map[event.keyCode] = event.type == "keydown";
    }

    /**
     * Start a game; or: generate stage 1
     */
    start() {
        this.generateStage();
    }

    /**
     * Generates a stage. Total asteroid mass increases with each level, which
     * is distributed to new astroids until depleted. The ship is returned to
     * facing up at screen center and the UFO spawn timer is reset. The game is
     * paused until the player hits resume.
     */
    generateStage() {
        //Reset the ship position
        this.ship.position = new Vector(canvas.width/2, canvas.height/2);
        this.ship.velocity = new Vector(0, 0);
        this.ship.rotation = Math.PI;
        this.ship.refresh = 0;

        //Generate the asteroids
        let totalSize = this.stage * 5;
        while(totalSize > 0) {
            this.generateAsteroid(Math.min(5, Math.log2(totalSize)), 3);
            totalSize -= 2 ** this.asteroids[this.asteroids.length - 1].size;
        }

        //Reset the UFO
        this.ufo.state = UFO.states.dead;
        this.ufo.spawnTimer = 0;
        
        //Set the game to paused
        this.state = DebrisGame.states.paused;
        this.pulse = 0;
    }

    /**
     * Generates an asteroid between the given sizes and speeds. Position is
     * checked against the ship position and regenerated until far enough away
     * to not unfairly hit it out of nowhere.
     * @param {Number} maxSize 
     * @param {Number} maxSpeed 
     * @param {Number} minSize 
     * @param {Number} minSpeed 
     */
    generateAsteroid(maxSize, maxSpeed, minSize = 2, minSpeed = 0) {
        //Reset the minimums if under zero
        if(minSize < 0) minSize = 0;
        if(minSpeed < 0) minSpeed = 0;

        //Generate size and speed based off of min and max range
        let size = Math.round(minSize + Math.random() * (maxSize - minSize));
        let speed = minSpeed + Math.random() * (maxSpeed - minSpeed);

        //Generate positions until one is made outside of unfair range
        let tooClose = true;
        let position;
        while(tooClose) {
            position = new Vector(
                Math.random() * canvas.width,
                Math.random() * canvas.height
            );
            tooClose = position.subtract(this.ship.position).magnitude() < 100;
        }

        //Add the generated astroid to the game
        this.addAsteroid(new Asteroid(
            position,
            (new Vector(0, 1)).rotate(Math.random() * 2 * Math.PI).multiply(speed),
            (Math.random() - 1) / 5,
            size
        ));
    }

    /**
     * Add a fully formed asteroid to the game 
     * @param {Asteroid} asteroid 
     */
    addAsteroid(asteroid) {
        if(this.asteroids.length > 0) {
            asteroid.id = this.asteroids[this.asteroids.length-1].id + 1;
        }
        this.asteroids.push(asteroid);
    }

    /**
     * Handles a collision between a projectile and asteroid, deleting both and
     * generating a pair of smaller asteroids if the hit asteroid is large enough
     * @param {Projectile} projectile 
     * @param {Asteroid} asteroid 
     */
    hitAsteroid(projectile, asteroid) {
        //Give player points if projectile was made by player ship
        if(!projectile.hostile) {
            this.score += 10;
        }

        //Check if asteroid is large enough to calve
        if(asteroid.size > 1) {
            /**
             * Projectile velocity is used to impart momentum to the child asteroids and to
             * displace them relative to the original asteroid instead of spawning overlapped
             */
            let splitAxis = projectile.velocity;
            this.addAsteroid(new Asteroid(
                asteroid.position.add(splitAxis.normalized().rotate(Math.PI/2).multiply(asteroid.size)),
                asteroid.velocity.add(splitAxis.rotate(Math.PI/8).divide(asteroid.size**2)),
                asteroid.rotational,
                asteroid.size - 1
            ));
            this.addAsteroid(new Asteroid(
                asteroid.position.add(splitAxis.normalized().rotate(-Math.PI/2).multiply(asteroid.size)),
                asteroid.velocity.add(splitAxis.rotate(-Math.PI/8).divide(asteroid.size**2)),
                asteroid.rotational,
                asteroid.size - 1
            ));
        }
        
        //Remove the projectile and asteroid from the game
        this.removeProjectile(projectile);
        this.removeAsteroid(asteroid);
    }

    /**
     * Removes an asteroid from the game
     */
    removeAsteroid(asteroid) {
        for(let i = 0; i < this.asteroids.length; i++) {
            if(this.asteroids[i].id == asteroid.id) {
                this.asteroids.splice(i, 1);
                break;
            }
        }
    }

    /**
     * Add a fully formed projectile to the game
     * @param {Projectile} projectile 
     */
    addProjectile(projectile) {
        if(this.projectiles.length > 0) {
            projectile.id = this.projectiles[this.projectiles.length-1].id + 1;
        }

        this.projectiles.push(projectile);
    }

    /**
     * Removes a projectile from the game
     * @param {Projectile} projectile 
     */
    removeProjectile(projectile) {
        for(let i = 0; i < this.projectiles.length; i++) {
            if(this.projectiles[i].id == projectile.id) {
                this.projectiles.splice(i, 1);
                break;
            }
        }
    }

    /**
     * Handle the ship being hit and taking damage
     */
    hitShip() {
        this.ship.refresh = 0;
        this.lives -= 1;
        if(this.lives < 0) {
            this.state = DebrisGame.states.over;
        }
    }

    /**
     * Handle the UFO being hit and taking damage
     */
    hitUFO() {
        console.log(this.ufo.state)
        if(this.ufo.state == UFO.states.live) {
            this.ufo.die();
            this.points += 100;
            this.lives += 1;
        }
    }

    /**
     * Set the game state to running
     */
    resume() {
        this.state = DebrisGame.states.running;
    }

    /**
     * Progress the game depending on state
     */
    update() {
        switch(this.state) {
            //Game over
            case DebrisGame.states.over:
                return;
            //Game running
            case DebrisGame.states.running:
                if(map[38] || map[87]) {    //W or Up
                    this.ship.thrust();
                }
                if(map[37] || map[65]) {    //A or Left
                    this.ship.turn(-1);
                }
                if(map[39] || map[68]) {    //D or Right
                    this.ship.turn(1);
                }
                if(map[40] || map[83]) {    //S or Down
                    //Nothing
                }
                if(map[32]) {               //Space
                    this.ship.pew();
                }
                break;
            //Game paused
            case DebrisGame.states.paused:
                if(map[32] && this.pulse > 0.5) { //Space, check for delay in case space was held down to fire
                    this.resume();
                }
                return;
        }

        //Call on ship and UFO to move
        this.ship.update();
        this.ufo.update();
        
        //Call on each projectile to move
        this.projectiles.forEach(projectile => {
            projectile.update();
        });

        //Call on each asteroid to move
        this.asteroids.forEach(asteroid => {
            asteroid.update();
        });

        //Check for any projectile collisions
        this.projectiles.forEach(projectile => {
            //Check if any hostile projectile has hit the player ship
            if(projectile.hostile) {
                if(projectile.checkCollision(this.ship)) {
                    this.hitShip()
                    this.removeProjectile(projectile);
                }
            }
            //Check if any player projectile has hit an asteroid or the UFO
            else {
                this.asteroids.forEach(asteroid => {
                    if(projectile.checkCollision(asteroid)) {
                        this.hitAsteroid(projectile, asteroid);
                    }    
                });
                
                if(projectile.checkCollision(this.ufo)) {
                    this.hitUFO(projectile);   
                }
            }
        });

        //Check if any asteroid has hit the player ship
        this.asteroids.forEach(asteroid => {
            if(this.ship.checkCollision(asteroid)) {
                this.hitShip();
            }
        });

        //Check if all asteroids have been destroyed, starting the next stage if so
        if(this.asteroids.length == 0) {
            this.stage += 1;
            this.generateStage();
        }
    }

    //Draw the GUI and all game objects
    draw() {
        context.save();

        //Fill the background color
        context.beginPath();
        context.rect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#222222";
        context.fill();

        //Set the stroke color and thickness for all game objects
        context.strokeStyle = "green";
        context.lineWidth = 2;

        //Draw the ship and UFO
        this.ship.draw();
        this.ufo.draw();

        //Draw each projectile
        this.projectiles.forEach(projectile => {
            projectile.draw();
        });

        //Draw each asteroid
        this.asteroids.forEach(asteroid => {
            asteroid.draw();
        });

        //Draw the GUI top bar
        context.beginPath();
        context.moveTo(-2, 40);
        context.lineTo(130, 40);
        context.lineTo(150, 20);
        context.lineTo(canvas.width/2 - 30, 20);
        context.lineTo(canvas.width/2 - 20, 40);
        context.lineTo(canvas.width/2 + 20, 40);
        context.lineTo(canvas.width/2 + 30, 20);
        context.lineTo(canvas.width - 150, 20);
        context.lineTo(canvas.width - 130, 40);
        context.lineTo(canvas.width + 2, 40);
        context.lineTo(canvas.width + 2, -2);
        context.lineTo(-2, -2);
        context.closePath();
        context.stroke();
        
        //Fill GUI top bar so that game objects show through
        context.globalAlpha = 0.6;
        context.fill();
        context.globalAlpha = 1;

        //Paused box
        if(this.state == DebrisGame.states.paused) {
            this.drawTextBox("PRESS 'SPACE' TO CONTINUE", 0.9 - Math.abs((this.pulse % 1 - 0.5)));
         
        }
        //Game over box
        else if(this.state == DebrisGame.states.over) {
            this.drawTextBox('GAME OVER', 0.9 - Math.abs((this.pulse % 1 - 0.5)));
        }
        this.pulse += 0.008;

        context.font = "bold 16pt Courier New";
        context.fillStyle = "green";

        let scoreSize = context.measureText(this.score.toString());
        context.fillText(this.score.toString(), 120 - scoreSize.width, 30);

        let stageSize = context.measureText(this.stage);
        context.fillText(this.stage, (canvas.width - stageSize.width) / 2, 30);

        for(let i = 0; i < this.lives; i++) {
            let offset = i * 20;

            context.beginPath();
            context.moveTo(canvas.width - 20 - offset, 15);
            context.lineTo(canvas.width - 15 - offset, 30);
            context.lineTo(canvas.width - 25 - offset, 30);
            context.closePath();
            context.stroke();
        }
        
        context.restore();
    }

    drawTextBox(text, backgroundAlpha) {
        context.save();

        context.font = "bold 16pt Courier New";
        let textSize = context.measureText(text);
        
        context.beginPath();
        context.rect((canvas.width - textSize.width) / 2 - 10, canvas.height / 2 - 20, textSize.width + 20, 40);

        context.fillStyle = "#222222";
        context.globalAlpha = backgroundAlpha;
        context.fill();

        context.globalAlpha = 1;
        context.stroke();

        context.fillStyle = "green";

        context.fillText(text, (canvas.width - textSize.width) / 2, canvas.height / 2 + 8);

        context.restore();
    }
}

class GameObject {
    constructor(position, velocity, radius) {
        this.position = position;
        this.velocity = velocity;
        this.rotation = 0;
        this.rotational = 0.1;
        this.radius = radius;
    }

    move() {
        this.position = this.position.add(this.velocity);

        if(this.position.x < 0) this.position.x += canvas.width;
        if(this.position.x > canvas.width) this.position.x -= canvas.width;
        if(this.position.y < 0) this.position.y += canvas.height;
        if(this.position.y > canvas.height) this.position.y -= canvas.height;
    }

    turn(direction) {
        this.rotation += direction * this.rotational;
        if(this.rotation < 0) this.rotation += Math.PI * 2;
        if(this.rotation >= Math.PI * 2) this.rotation -= Math.PI * 2;
    }

    update() {
        this.move();
    }

    checkCollision(otherObject) {
        let magnitudeSquared = this.position.subtract(otherObject.position).magnitudeSquared();
        let radiiSumSquared = (this.radius + otherObject.radius) ** 2;
        if(magnitudeSquared < radiiSumSquared) return true;
        return false;
    }

    draw() {

    }
}

class Ship extends GameObject {
    constructor() {
        super(
            new Vector(canvas.width / 2, canvas.height / 2),//Position
            new Vector(0, 0),                               //Velocity
            10 * Math.sqrt(2)                               //Radius
        );
        this.rotation = Math.PI;
        this.fireFrequency = 10;
        this.cooldown = 0;
        this.refresh = 0;
        this.iframes = 100;
        this.thrusting = false;
    }

    thrust() {
        this.velocity = this.velocity.add(new Vector(0, 1 / 20).rotate(this.rotation));
        this.thrusting = true;
    }

    pew() {
        if(this.cooldown > this.fireFrequency) {
            this.velocity = this.velocity.subtract(new Vector(0, 1 / 30).rotate(this.rotation));
            game.addProjectile(
                new Projectile(
                    this.position.add((new Vector(0, 20)).rotate(this.rotation)),
                    this.velocity.add((new Vector(0, 5)).rotate(this.rotation))
                )
            );
            this.cooldown = 0;
        }
    }

    checkCollision(otherObject) {
        if(this.refresh < this.iframes) return false;
        return super.checkCollision(otherObject);
    }

    update() {
        this.move();
        this.cooldown += 1;
        this.refresh += 1;
    }

    draw() {
        context.save();

        context.translate(this.position.x, this.position.y);
        context.rotate(this.rotation);

        context.beginPath();
        context.moveTo(0, this.radius);
        context.lineTo(10, -10);
        context.lineTo(-10, -10);
        context.closePath();

        context.stroke();

        if(this.refresh < this.iframes) {
            context.beginPath();
            context.arc(0, 0, this.radius, 0, 2 * Math.PI);
            context.stroke();
        }

        if(this.thrusting) {
            context.beginPath();
            context.moveTo(-8, -16);
            context.lineTo(8, -16);
            context.moveTo(-6, -22);
            context.lineTo(6, -22);
            context.moveTo(-4, -28);
            context.lineTo(4, -28);
            context.stroke();
            this.thrusting = false;
        }

        context.restore();
    }
}

class Projectile extends GameObject {
    constructor(position, velocity, hostile) {
        super(position, velocity, 5);

        this.id = 0;
        this.age = 0;
        this.maxAge = 100;
        this.hostile = hostile;
    }

    update() {
        this.move();
        this.age += 1;
        if(this.age >= this.maxAge) {
            game.removeProjectile(this);
        }
        this.turn(1);
    }

    draw() {
        context.save();
        context.translate(this.position.x, this.position.y);
        context.rotate(this.rotation);

        context.beginPath();

        if(this.hostile) {
            let sin = 1.1 * this.radius * Math.sin(Math.PI / 3);
            let cos = 2.2 * this.radius * Math.cos(Math.PI / 3);
            context.moveTo(0, this.radius);
            context.lineTo(cos, -sin);
            context.lineTo(-cos, -sin);
            context.closePath();
        } else {
            context.arc(0, 0, this.radius, 0, 2 * Math.PI);
        }
        
        context.stroke();

        context.restore();
    }
}

class Asteroid extends GameObject {
    constructor(position, velocity, rotational, size) {
        super(position, velocity, 5 * (size+1));
        this.rotational = rotational;
        this.size = size;
        this.id = 0;

        this.corners = [];
        for(let i = 0; i < (size + 2) * 2; i++) {
            this.corners[i] = this.radius * (0.9 + Math.random() / 5);
        }
    }

    update() {
        this.move();
        this.turn(1);
    }

    draw() {
        context.save();

        context.translate(this.position.x, this.position.y);
        context.rotate(this.rotation);

        let cornerCount = this.corners.length;
        let corner = new Vector(0, this.corners[0]);
        context.moveTo(corner.x, corner.y);

        for(let i = 1; i < cornerCount; i++) {
            corner = new Vector(0, this.corners[i]).rotate(Math.PI * 2 * i / cornerCount);
            context.lineTo(corner.x, corner.y);
        }

        context.closePath();
        context.stroke();

        context.restore();
    }
}

class UFO extends GameObject {
    static states = {dead: 0, live: 1};

    constructor() {
        super(new Vector(0, 0), new Vector(0, 0), 10 * Math.sqrt(2));
        this.state = UFO.states.dead;

        this.maneuverTimer = 0;
        this.maneuverFrequency = 50;
        this.spawnTimer = 0;
        this.spawnFrequency = 1000;
        this.cooldown = 0;
        this.fireFrequency = 73;
    }

    die() {
        this.state = UFO.states.dead;
        this.spawnTimer = 0;
    }

    spawn() {
        this.state = UFO.states.live;
        this.maneuver();
        let edge = Math.floor(Math.random() * 4);
        switch(edge) {
            case 0:
                this.position = new Vector(Math.random() * canvas.width, 0);
                break;
            case 1:
                this.position = new Vector(Math.random() * canvas.width, canvas.height);
                break;
            case 2:
                this.position = new Vector(0, Math.random() * canvas.height);
                break;
            case 3:
                this.position = new Vector(canvas.width, Math.random() * canvas.height);
                break;
        }
    }

    maneuver() {
        this.velocity = (new Vector(Math.random() - 0.5, Math.random() - 0.5)).normalized().multiply(5);
        this.maneuverTimer = 0;
    }

    update() {
        if(this.state == UFO.states.live) {
            super.update();
            this.maneuverTimer += 1;
            this.cooldown += 1;
            if(this.maneuverTimer > this.maneuverFrequency) {
                this.maneuver();
            }
            if(this.cooldown > this.fireFrequency) {
                this.pew();
                this.cooldown = 0;
            }
        }
        if(this.state == UFO.states.dead) {
            this.spawnTimer += 1;
            if(this.spawnTimer > this.spawnFrequency) {
                this.spawn();
            }
        }
    }

    pew() {
        let target = game.ship.position;
        if(target.x - this.position.x < -canvas.width / 2) target.x -= canvas.width;
        if(target.x - this.position.x > canvas.width / 2) target.x += canvas.width;
        if(target.y - this.position.y < -canvas.height / 2) target.y -= canvas.height;
        if(target.y - this.position.y > canvas.height / 2) target.y += canvas.height;
        target = target.subtract(this.position).normalized();
        game.addProjectile(
            new Projectile(
                this.position.add(target.multiply(15)),
                target.multiply(3),
                true
            )
        );
    }

    draw() {
        if(this.state == UFO.states.dead) return;

        context.save();

        context.translate(this.position.x, this.position.y);
        context.rotate(this.rotation);

        context.beginPath();
        context.ellipse(-5, -3, 24, 12, 0, -Math.PI * 1.5, -Math.PI * 1.15);
        context.ellipse(-5, 7, 24, 12, 0, Math.PI * 1.15, Math.PI * 1.5);
        context.ellipse(5, 7, 24, 12, 0, Math.PI * 1.5, Math.PI * 1.85);
        context.ellipse(5, -3, 24, 12, 0, -Math.PI * 1.85, -Math.PI * 1.5);
        context.closePath();
        context.moveTo(-24, 2);
        context.lineTo(24, 2);
        context.moveTo(-6, -5);
        context.arc(0, -5, 12, Math.PI, 2 * Math.PI);
        context.stroke();

        context.restore();
    }
}


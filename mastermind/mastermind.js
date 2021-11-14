
/**
 * Load the relevant DOM elements into usable global variables
 */
window.addEventListener("DOMContentLoaded", (event) => {
    landing = document.getElementById("landing");
    game = document.getElementById("game");
    select = document.getElementById("select");
    text = document.getElementById("text");
    canvas = document.getElementById("canvas");
    context = canvas.getContext("2d");
});

/**
 * Make the dropdown go away when clicked outside of
 */
document.addEventListener('mousedown', (event) => {
    if(select.style.display == "block" && !select.contains(event.target)) {
        select.style.display = "none";
    }
});

//Global variable to store active game object
var theGame;

//Global variable to store array of possible colors
const colors = ["blue", "red", "yellow", "green", "orange", "purple", "pink", "brown"];

/**
 * Function external to Game class to extract DOM data and call the constructor
 */
function startGame() {
    //Hide the settings div and expose the game div
    landing.style.display = "none";
    game.style.display = "block";

    //Extract the settings form data from the landing div
    let settings = document.getElementById("settings");
    theGame = new Game(settings['pegs'].value, settings['colors'].value, settings['turns'].value,
                        settings['codemaker'].value == "computer", settings['codebreaker'].value == "computer");

    //Start the animation loop
    setInterval(frame, 1000.0/60.0);

    //Begin play
    theGame.makeCode();
}

/**
 * Clear the canvas and call on the game object to redraw
 */
function frame() {
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    theGame.draw();
}

class Guess {
    /**
     * Construct the guess object for display
     * @param {String} prefix   Characters to print in front of guess display
     * @param {Number} height   Pixels from top of canvas to display guess
     * @param {Number} pegs     How many pegs are in guess
     * @param {Number} colors   How many possible colors there are in game
     */
    constructor(prefix, height, pegs, colors) {
        //Set display variables
        this.prefix = prefix;
        this.height = height;
        this.display = false;

        //Initialize code array
        this.pegs = [];
        this.pegs.length = pegs;

        //Initialize key results
        this.whites = 0;
        this.blacks = 0;

        //Initialize color count array
        this.colors = [];
        for(let i = 0; i < colors; i++) {
            this.colors[i] = 0;
        }
    }

    /**
     * Set the color value of a single peg
     * @param {Number} index Index of peg
     * @param {Number} color Index of color
     */
    setPeg(index, color) {
        //Remove old color at index from colors count
        this.colors[this.pegs[index]] -= 1;
        if(this.colors[this.pegs[index]] < 0) {
            this.colors[this.pegs[index]] = 0;
        }
        //Set peg
        this.pegs[index] = color;
        //Add new color to colors count
        this.colors[color] += 1;
    }

    /**
     * Set the entire code
     * @param {Array} code Array of peg color code values 
     */
    setPegs(code) {
        //Reset colors counts
        for(let i = 0; i < theGame.colors; i++) {
            this.colors[i] = 0;
        }
        //Set pegs
        this.pegs = code;
        //Add color of each peg to count
        for(let i = 0; i < this.pegs.length; i++) {
            this.colors[this.pegs[i]] += 1;
            if(isNaN(this.colors[this.pegs[i]])) {
                console.log(this.colors.length);
            }
        }
    }

    /**
     * Checks the pegs of the guess against another code
     * @param {Guess} guess To compare code aginst
     * @return {Array}      Counts of black and white key pegs
     */
    check(guess) {
        let blacks = 0;         //Correct colors in correct places
        for(let i = 0; i < this.pegs.length; i++) {
            if(this.pegs[i] == guess.pegs[i]) {
                blacks += 1;    //Peg is correct color in correct place
            }
        }

        let whites = 0;         //Correct colors total, to be subtracted from
        for(let i = 0; i < this.colors.length; i++) {
            //Maximimized when color has correct number of pegs in guess
            whites += Math.min(this.colors[i], guess.colors[i]);
        }

        //Returned whites is total count of correct colors minus blacks
        return [blacks, whites - blacks];
    }

    /**
     * Create a randomized code for the guess
     * @param {Number} colors Count of possible colors
     */
    randomize(colors) {
        for(let i = 0; i < this.pegs.length; i++) {
            this.setPeg(i, Math.floor(Math.random() * colors));
        }
    }

    /**
     * Draw the guess
     */
    draw() {
        context.save();

        //Header
        context.fillStyle = "white";
        context.font = "20pt Ariel";
        context.fillText(this.prefix, 10, this.height + 8);

        //Code display pegs
        for(let i = 0; i < this.pegs.length; i++) {
            context.strokeStyle = "white";
            context.lineWidth = "2px";
            if(this.display) {
                context.fillStyle = colors[this.pegs[i]];
            } else {
                context.fillStyle = "gray";
            }
            context.beginPath();
            context.arc((i+1) * 25 + 30, this.height, 10, 0, 2 * Math.PI);
            context.fill();
            context.stroke();
        }
        //White key pegs
        for(let i = 0; i < this.whites; i++) {
            context.fillStyle = "white";
            context.strokeStyle = "black";
            context.lineWidth = "1px";
            context.beginPath();
            context.arc(this.pegs.length * 25 + 50 + i * 14, this.height - 7, 5, 0, 2 * Math.PI);
            context.fill();
            context.stroke();
        }
        //Black key pegs
        for(let i = 0; i < this.blacks; i++) {
            context.fillStyle = "black";
            context.strokeStyle = "white";
            context.lineWidth = "1px";
            context.beginPath();
            context.arc(this.pegs.length * 25 + 50 + i * 14, this.height + 7, 5, 0, 2 * Math.PI);
            context.fill();
            context.stroke();
        }

        context.restore();
    }
}

//Global variable for game state enum
const gameState = {'makeCode':0, 'play':1, 'codeBroken':2, 'codeSecure':3}

class Game {
    /**
     * Construct the game from input parameters
     * @param {Number} pegs             Number of pegs in code
     * @param {Number} colorCount       Number of possible colors in code
     * @param {Number} turns            Turns game can go
     * @param {Boolean} computerMaker   Whether code will be made by computer or human
     * @param {Boolean} computerBreaker Whether code will be broken by computer or human
     */
    constructor(pegs, colorCount, turns, computerMaker, computerBreaker) {
        //Configure canvas to fit the game
        canvas.height = turns * 30 + 50;
        canvas.width = pegs * 39 + 60;

        //store the game parameters
        this.colors = colorCount;
        this.turns = parseInt(turns);
        this.turn = 0;
        this.state = gameState.makeCode;
        this.computerMaker = computerMaker;
        this.computerBreaker = computerBreaker;

        //Initialize the master code and hide it
        this.code = new Guess("C", 20, pegs, colorCount);

        //Initialize the solver in case it is needed for computerized code breaking
        this.solver = new Solver(pegs, colorCount);

        //Initizlize the list of guesses
        this.guesses = [];
        for(let i = 0; i < this.turns; i++) {
            this.guesses[i] = new Guess(i+1, (i+2) * 30, pegs, colorCount);
        }

        //Initialize the game inputs
        this.inputs = [];
        for(let i = 0; i < 6; i++) {
            //Store reference to input DOM element
            this.inputs[i] = document.getElementById("input" + i);
            //Initialize the peg with the lowest-index color displayed
            if(i < pegs) {
                this.inputs[i].style['background-color'] = colors[0];
                this.inputs[i].color = 0;
                this.inputs[i].style.display = "block";
            }
            //Peg is out of range for this game's needed inputs
            else {
                this.inputs[i].style.display = "none";
            }
        }

        //Initialize color selection dots for the input selection popup
        this.dots = [];
        for(let i = 0; i < colors.length; i++) {
            this.dots[i] = document.getElementById("dot" + i);
            if(i < this.colors) {
                this.dots[i].style['background-color'] = colors[i];
                this.dots[i].style.display = "block";
            }
            //Dot is out of rante for this game's needed colors
            else {
                this.dots[i].style.display = "none";
            }
        }

        //Initialize the fireworks
        this.fireworks = [];
        for(let i = 0; i < 20; i++) {
            this.fireworks[i] = new Firework();
        }
    }

    /**
     * Will randomly generate a code if codemaker is computer player, or turn control over to human
     * @param {bool} isComputer If player is computer or human
     */
    makeCode() {
        if(this.computerMaker) {
            this.code.randomize(this.colors);
            this.play();
        } else {
            text.innerHTML = "Codemaker, make your code:";
            this.state = gameState.makeCode;
        }
    }

    /**
     * Will algorithmically solve the code if codebreaker is computer player, or turn control over to human
     * @param {bool} isComputer If player is computer or human
     */
    play() {
        if(this.computerBreaker) {
            this.code.display = true;
            text.innerHTML = "Stand back, I've got this:";
            this.inputs.forEach(input => {
                input.onclick = null;
            });
            this.solver.state = solverState.think;
        } else {
            text.innerHTML = "Codebreaker, make your guess:";
        }
        this.state = gameState.play;
    }

    /**
     * Calls the color select dropdown menu to the input
     * @param {Event} event 
     */
    callDropdown(event) {
        this.selected = event.srcElement;
        select.style.left = event.clientX;
        select.style.top = event.clientY;
        select.style.display = 'block';
    }

    /**
     * Sets the color of the selected input element per button clicked in dropdown
     * @param {Event} event 
     */
    selectColor(event) {
        let color = event.srcElement.id.substring(3);           //Color index is after 'dot' in element id
        this.selected.style['background-color'] = colors[color];
        this.selected.color = color;
        select.style.display = 'none';                          //Hide the dropd down
    }

    /**
     * End the game, close out input, and display the end state
     * @param {Boolean} broken Whether the game has ended from the code being broken
     */
    endGame(broken) {
        this.code.display = true;
        this.inputs.forEach(input => {
            input.onclick = null;
        });
        if(broken) {
            this.state = gameState.codeBroken;
        } else {
            this.state = gameState.codeSecure;
        }
    }
    
    /**
     * Reads the input dot array for data, compares the collected guess against
     * the code, and updates the turn.
     */
    submit() {
        //Game over
        if(this.state == gameState.codeBroken || this.state == gameState.codeSecure) {
            return;
        }

        //Maximum turns exceeded
        if(this.turn >= this.turns) {
            this.endGame(false);
            return;
        }

        //Extract input data
        let code = [];
        for(let i = 0; i < this.code.pegs.length; i++) {
            let color = this.inputs[i].color;
            code[i] = color;
            this.guesses[this.turn].setPeg(i, color);
            if(this.state == gameState.makeCode) {
                this.inputs[i].color = 0;
                this.inputs[i].style['background-color'] = colors[0];
            }
        }

        //Human codemaker at game start
        if(this.state == gameState.makeCode) {
            this.code.setPegs(code);
            this.play();
            return;
        }

        //Game on
        if(this.state == gameState.play) {
            let key = this.code.check(this.guesses[this.turn]); //Check guess
            this.guesses[this.turn].blacks = key[0];            //Save blacks
            this.guesses[this.turn].whites = key[1];            //Save whites
            this.guesses[this.turn].display = true;             //Show guess
            this.turn += 1;                                     //Progress turn counter

            //Code broken
            if(key[0] == this.code.pegs.length) {
                this.endGame(true);
            }
        }
    }

    /**
     * Draw the game and call the solver
     */
    draw() {
        //If a human player is solving, will return after state check
        this.solver.update();
        
        //Clear the old frame
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.save();

        //Draw victory state background
        if(this.state == gameState.codeBroken) {
            context.fillStyle = "green";
            context.rect(0, 0, canvas.width, canvas.height);
            context.fill();
        }

        //Draw loss state background
        if(this.state == gameState.codeSecure) {
            context.fillStyle = "red";
            context.rect(0, 0, canvas.width, canvas.height);
            context.fill();
        }

        //Draw master code and all turns' guesses
        this.code.draw();
        this.guesses.forEach(guess => {
            guess.draw();
        });

        //Draw fireworks
        if(this.state == gameState.codeBroken) {
            this.fireworks.forEach(firework => {
                if(firework.state == fireworkState.done) {
                    firework.pew();
                }
                firework.draw();
            });
        }

        context.restore();
    }
}

//Global variable for firework state enum
const fireworkState = {move: 0, boom: 1, done: 2}
class Firework {
    /**
     * Construct a dead firework
     */
    constructor() {
        this.origin = [0, 0];
        this.destination = [0, 0];
        this.travel = 0
        this.speed = 0
        this.age = 0;
        this.state = fireworkState.done;
        this.color = colors[0];
    }

    /**
     * Fire off a firework from an origin to a destination
     * @param {Array} origin        [x, y] coordinates of origin
     * @param {Array} destination   [x, y] coordinates of destination
     * @param {Number} speed        Speed of travel
     */
    pew(
        origin = [canvas.width/2, canvas.height],
        destination = [Math.random() * canvas.width/2 + canvas.width/4, Math.random() * canvas.height/2  + canvas.height/4],
        speed = Math.random() * 0.5 + 0.5
    ) {
        this.origin = origin;
        this.destination = destination;
        //Distance to be travelled
        this.travel = Math.sqrt(
            Math.pow(this.origin[0] - this.destination[0], 2) +
            Math.pow(this.origin[1] - this.destination[1], 2)
        );
        this.speed = speed;
        this.age = 0;
        this.state = fireworkState.move;
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    /**
     * Find the endpoints of the firework in flight
     * @returns [x, y] coordinates of stat and end points for firework line
     */
    endpoints() {
        let progress = (this.age * this.speed) / this.travel;
        return([[
            this.origin[0] - (this.origin[0] - this.destination[0]) * progress,
            this.origin[1] - (this.origin[1] - this.destination[1]) * progress
        ], [
            this.origin[0] - (this.origin[0] - this.destination[0]) * (progress - 0.05),
            this.origin[1] - (this.origin[1] - this.destination[1]) * (progress - 0.05)
        ]]);
    }

    /**
     * Draw the firewrok
     */
    draw() {
        //Le ded
        if(this.state == fireworkState.done) return;

        context.save();
        context.strokeStyle = this.color;
        context.lineWidth = 2;
        this.age += 1;

        //Firework is in process of exploding
        if(this.state == fireworkState.boom) {
            context.globalAlpha = (251 - this.age) / 250; 
            context.beginPath();
            context.arc(this.destination[0], this.destination[1], this.age * 0.5, 0, 2 * Math.PI);
            context.stroke();
            if(this.age > 250) {
                this.state = fireworkState.done;
                this.age = 0;
            }
        }
        //Firework is moving to destination
        else {
            //Oooh
            if(this.age * this.speed < this.travel) {
                let ends = this.endpoints();
                context.beginPath();
                context.moveTo(ends[0][0], ends[0][1]);
                context.lineTo(ends[1][0], ends[1][1]);
                context.stroke();
            }
            //Aaah
            else {
                this.state = fireworkState.boom;
                this.age = 0;
            }
        }

        context.restore();
    }
}

//Global variable for solver state enum
const solverState = {sleep: 0, think: 1, input: 2, submit: 3, over: 4};
class Solver {
    /**
     * Constructs the solver with the number of pegs and colors to consider
     * @param {Number} pegs 
     * @param {Number} count 
     */
    constructor(pegs, count) {
        this.guess = [];
        this.state = solverState.sleep;
        this.index = 0;
        this.clock = 0;
        let arr = [];
        //Becaue everything is terrible, I present spaghetti:
        for(let i =0; i < count; i++) {
            arr[i] = i;
        }
        this.guesses = this.permutePossibleGuesses(pegs, arr);
    }

    /**
     * Recursively assemble all possible codes
     * @param {Number} pegs     Number of pegs not already assigned
     * @param {Array} colors    Array of color indecies
     */
    permutePossibleGuesses (pegs, colors) {
        if(pegs <= 1) {
            return colors;
        }
        let suffixes = this.permutePossibleGuesses(pegs - 1, colors);
        let outcart = [];
        colors.forEach(color => {
            suffixes.forEach(suffix => {
                outcart.push([color].concat(suffix));
            });
        });
        return outcart;
    }

    /**
     * Take actions based on clock cycle and game state.
     * Nothing if sleeping or done
     * Wait if action taken recently
     * Make a guess from the remaining possible codes
     * Perform input actions based on active guess
     */
    update () {
        //Do nothing
        if(this.state == solverState.done || this.state == solverState.sleep) {
            return;
        }

        //Wait
        if(this.clock < 20) {
            this.clock += 1;
            return;
        }

        //Game over
        if(theGame.state == gameState.codeBroken || theGame.state == gameState.codeSecure) {
            this.state = solverState.done;
            return;
        }
        
        //Reset clock
        this.clock = 0;

        switch(this.state) {
            //Make a new guess
            case solverState.think:
                this.makeGuess();
                this.state = solverState.input;
                break;
            //Make input based on guess
            case solverState.input:
                this.updateInput();
                break;
            //Submit inputted guess
            case solverState.submit:
                theGame.submit();
                this.state = solverState.think;
                break;
        }
    }

    /**
     * Alter game input elements based on guess
     */
    updateInput () {
        //Move on when all inputs are set
        if(this.index >= this.guess.length) {
            this.index = 0;
            this.state = solverState.submit;
            return;
        }

        //Progress if peg at input index is already correct color
        if(theGame.inputs[this.index].style['background-color'] == colors[this.guess[this.index]]) {
            this.index += 1;
            this.updateInput();
            return;
        }

        //Set input values
        theGame.inputs[this.index].style['background-color'] = colors[this.guess[this.index]];
        theGame.inputs[this.index].color = this.guess[this.index]; 
        this.index += 1;
    }

    /**
     * Slice the first index off the array of remaining possible guesses, test
     * it against the code, and then test all remaining guesses agaisnt it. Any
     * Guess which is not different from the latest guess by the same amount as
     * it is from the code is discarded.
     */
    makeGuess () {
        //Prevent solver being overtaken with second guess request before finishing first
        this.state = solverState.sleep;
        
        //Solver gives up, all guesses disposed of
        if(this.guesses.length == 0) {
            return;
        }

        //Default first guess, half color 0 and half color 1
        if(theGame.turn == 0) {
            this.guess = [];
            //Set left half to color 0
            for(let i = 0; i < this.guesses[0].length / 2; i++) {
                this.guess[i] = 0;
            }
            //Set right half to color 1
            for(let i = this.guesses[0].length / 2; i < this.guesses[0].length; i++) {
                this.guess[i] = 1;
            }
        }
        //All turns after first
        else {
            //Create guess object to make proper use of compare code function
            let check = new Guess("", 0, this.guesses[0].length, theGame.colorCount);
            
            //Only the last guess needs to be considered, all others already have been
            let previous = theGame.guesses[theGame.turn-1];
            
            //Filter the array of possible codes based of what could give the same response key
            this.guesses = this.guesses.filter(code => {
                check.setPegs(code);
                let keys = check.check(previous);
                //True if possible code creates same key when compared to guess as guess did with master code
                return (keys[0] == previous.blacks && keys[1] == previous.whites);
            });
            
            //Guess is first possible remaining code
            this.guess = this.guesses[0];

            //Remove the guess from the possiblity matrix to prevent looping
            this.guesses = this.guesses.slice(1, this.guesses.length);
        }

        //Allow state machine to progress
        this.state = solverState.input;
    }
}
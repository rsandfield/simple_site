window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();

    // Watch for browser/canvas resize events
    window.addEventListener("resize", function () {
        engine.resize();
    });
});

class GameObject {
    constructor(name, mesh, game, settings = {}) {
        this.name = name;
        this.game = game;
        this.mesh = mesh;
        this.mesh.metadata = this;
        this.mesh.outlineWidth = 0.1;
        this.mesh.outlineColor = new BABYLON.Color3(1, 1, 1);
        this.rotation = settings.rotation || 0;

        this.selected = false;
    }

    destroy() {
        this.mesh.dispose();
    }

    select() {
        this.selected = true;
        this.mesh.renderOutline = true;
        //this.game.scene.getHighlightLayerByName("highlight").addMesh(this.mesh, BABYLON.Color3.Red);
    }

    deselect() {
        if(this.selected) {
            this.selected = false;
            this.mesh.renderOutline = false;
            //this.game.scene.getHighlightLayerByName("highlight").removeMesh(this.mesh);
        }
    }
}

class GroundTile extends GameObject {
    constructor(position, game) {
        let name = 'ground[' + position.x + "," + position.z + ']';
        let mesh = BABYLON.MeshBuilder.CreateGround(name, {width:1, height:1});
        super(name, mesh, game);
        this.mesh.position = position;
        this.mesh.material = new BABYLON.StandardMaterial('mat', game.scene);
        this.mesh.material.diffuseColor = new BABYLON.Color3(0.5, 0.3, 0.1);
        this.mesh.material.specularColor = new BABYLON.Color3(0, 0, 0);
        this.mesh.material.alpha = 1;
    }
}

class Structure extends GameObject {
    constructor(position, size, mesh, game) {
        super("structure", mesh, game);
        this.size = size;
        this.tiles = new Array();
        this.move(position);
    }

    move(position) {
        this.position = position;
        this.tiles.forEach(tile => {
            tile.mesh.metadata = tile;
        });
        for(let y = 0; y < this.size.z; y++) {
            for(let x = 0; x < this.size.x; x++) {
                let tile = this.game.ground[this.position.z + y][this.position.x + x];
                tile.mesh.metadata = this;
                tile.deselect();
                this.tiles.push(tile);
            }
        }
        this.mesh.position = new BABYLON.Vector3(position.x + 0.5, 0, position.z + 0.5);
    }

    destroy () {
        super.destroy();
        this.tiles.forEach(tile => {
            tile.mesh.metadata = tile;
        });
    }
}

class Ghost extends GameObject{
    constructor(name, mesh, size, game) {
        super(name, mesh, game);
        this.position = new BABYLON.Vector3(0, 0, 0);
        this.mesh.position = new BABYLON.Vector3(0.5, 0, 0.5);
        this.size = size;
        this.mesh.material = new BABYLON.StandardMaterial('mat', game.scene);
        this.mesh.material.diffuseColor = new BABYLON.Color3(1, 1, 1);
        this.mesh.material.specularColor = new BABYLON.Color3(0, 0, 0);
        this.mesh.material.alpha = 0.5;
        this.game = game;

        this.observer = this.game.scene.onPointerObservable.add(function (pointerInfo) {      		
            switch (pointerInfo.type) {
                case BABYLON.PointerEventTypes.POINTERDOWN:
                    if(pointerInfo.pickInfo.hit){
                        if(this.ghost.checkPlacement()) {
                            if(this.house) this.house.destroy();
                            this.house = this.ghost.attemptPlacement();
                            this.house.material = new BABYLON.StandardMaterial('mat', this.scene);
                            this.house.material.diffuseColor = new BABYLON.Color3(0, 0, 1);
                            this.ghost = null;
                            console.log(this.house)
                            console.log(this.barp);
                        }
                    }
                    break;
                case BABYLON.PointerEventTypes.POINTERMOVE:
                    let pickinfo = game.scene.pick(game.scene.pointerX, game.scene.pointerY, function (mesh) { return mesh.metadata instanceof GroundTile; });
                    if (pickinfo.hit) {
                        let picked = pickinfo.pickedMesh;
                        if(picked.position.z <= game.ground.length - this.ghost.size.z) {
                            if(picked.position.x <= game.ground[0].length - this.ghost.size.x) {
                                this.ghost.position = picked.position;
                                this.ghost.mesh.position = picked.position.add(new BABYLON.Vector3(0.5, 0, 0.5));
                                this.ghost.checkPlacement();
                            }
                        }
                    }
                    break;
            }
        }.bind(this.game));
    }

    destroy() {
        super.destroy();
        this.game.scene.onPointerObservable.remove(this.observer)
    }

    spin(direction) {
        this.rotation += direction;
        if(this.rotation < 0) this.rotation += 4;
        if(this.rotation >= 4) this.rotation -= 4;

        this.mesh.rotation.y = this.rotation * Math.PI / 2;
    }

    checkPlacement() {
        let good = true;
        for(let z = 0; z < this.size.z; z++) {
            for(let x = 0; x < this.size.x; x++) {
                let tile = this.game.ground[z + this.position.z][x + this.position.x];
                if(tile.mesh.metadata != tile) {
                    good = false;
                }
            }
        }
        if(good) {
            this.mesh.material.diffuseColor = new BABYLON.Color3(0, 1, 0);
        } else {
            this.mesh.material.diffuseColor = new BABYLON.Color3(1, 0, 0);
        }
        return good;
    }

    attemptPlacement() {
        if(this.checkPlacement) {
            console.log(this.mesh);
            let structure = new Structure(this.position, this.size, this.game.meshes.getMesh("hap", "house"), this.game);
            this.destroy();
            return structure;
        }
        else {
            return null;
        }
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById("canvas");
        this.engine = new BABYLON.Engine(canvas, true, {stencil:true});
        this.meshes = new MeshHandler();
        this.createScene(this.engine);
        this.createCamera(this.scene);
        this.createGUI ();
        
        this.ground = this.generateGround();
        this.barp = new Structure(new BABYLON.Vector3(1, 0, 1), new BABYLON.Vector3(2, 0, 2), this.meshes.getMesh("hap", "house"), this);
        this.barp.mesh.material = new BABYLON.StandardMaterial('mat', this.scene);
        this.barp.mesh.material.diffuseColor = new BABYLON.Color3(0, 0, 1);

        this.barp.move(new BABYLON.Vector3(4, 0, 4));

        this.engine.runRenderLoop(function () {
            this.scene.render();
        }.bind(this));
    }

    createScene (engine) {
        this.scene = new BABYLON.Scene(engine);
    
        const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 10, 0));
        
        let highlight = new BABYLON.HighlightLayer("highlight", this.scene);
        
        this.selected = null;
        
        this.scene.onPointerObservable.add(function (pointerInfo) {      		
            switch (pointerInfo.type) {
                case BABYLON.PointerEventTypes.POINTERDOWN:
                    if(pointerInfo.pickInfo.hit){
                        if(this.selected) this.selected.deselect();
                        pointerInfo.pickInfo.pickedMesh.metadata.select();
                        this.selected = pointerInfo.pickInfo.pickedMesh.metadata;
                    }
                    break;
                case BABYLON.PointerEventTypes.POINTERUP:
                    break;
                case BABYLON.PointerEventTypes.POINTERMOVE:
                    break;
            }
        }.bind(this));
        
        //Keyboard input
        this.keymap = {};
        this.scene.actionManager = new BABYLON.ActionManager(this.scene);
        
        this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, function (event) {								
            this.keymap[event.sourceEvent.key] = event.sourceEvent.type == "keydown";
        }.bind(this)));
            
        this.scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, function (event) {								
            this.keymap[event.sourceEvent.key] = event.sourceEvent.type == "keydown";
        }.bind(this)));
    }

    createGUI () {
        const guiManager = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
        const topbar = new BABYLON.GUI.StackPanel("topbar");
        topbar.isVertical = false;
        topbar.width = "100%";
        topbar.height = "50px";
        topbar.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        topbar.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        guiManager.addControl(topbar);

        const buttons = [
            createButton(
                "ghost", "Ghost",
                function() {this.ghost = new Ghost("house", this.meshes.getMesh("hap", "house"), new BABYLON.Vector3(2, 0, 2), this);},
                this, {container: topbar}
            ),
            createButton(
                "clock", "Clock",
                function(event) {this.ghost.spin(1);},
                this, {container: topbar}
            ),
            createButton(
                "counter", "Counter",
                function(event) {this.ghost.spin(-1);},
                this, {container: topbar}
            )
        ]
        /*
        const clock = BABYLON.GUI.Button.CreateSimpleButton("stack", "Clock");
        clock.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        clock.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
        clock.width = "100px";
        clock.height = "40px";
        clock.left = "120px";
        clock.color = "white";
        clock.background = "black";
        clock.onPointerClickObservable.add(function(event) {
            this.ghost.spin(1);
        }.bind(this));
        topbar.addControl(clock);
        */
    }


    createCamera () {
        //Create and activate camera
        const camera = new BABYLON.ArcRotateCamera("Camera", Math.PI * 1.5, Math.PI * 0.25, 20, new BABYLON.Vector3(5, 0, 5), this.scene);
        this.scene.activeCamera = camera;
        camera.attachControl(canvas, true, true);
    
        //Restrict camera movement to prevent looking under world
        camera.lowerRadiusLimit = 2;
        camera.upperBetaLimit = Math.PI * 0.4;
        
        //Configure keyboard rotation input
        let keyboard = camera.inputs.attached.keyboard;
        keyboard.angularSpeed = 0.0025;
    
        //Camera truck object because default camera doesn't have it native
        const cameraTruck = new BABYLON.Mesh("truck", this.scene);
        cameraTruck.position = new BABYLON.Vector3(5, 0, 5);
        cameraTruck.speed = 0.1;
        camera.setTarget(cameraTruck);
    
        //Camera truck controls
        this.scene.registerAfterRender(function() {
            let displacement = new BABYLON.Vector3(0,0,0);
            if(this.keymap['a'] || this.keymap['A']) {
                displacement.x += cameraTruck.speed;
            }
            if(this.keymap['d'] || this.keymap['D']) {
                displacement.x -= cameraTruck.speed;
            }
            if(this.keymap['s'] || this.keymap['S']) {
                displacement.z += cameraTruck.speed;
            }
            if(this.keymap['w'] || this.keymap['W']) {
                displacement.z -= cameraTruck.speed;
            }
            if(this.scene.activeCamera) {
                let angle = this.scene.activeCamera.alpha - Math.PI / 2;
                let x = Math.cos(angle) * displacement.x - Math.sin(angle) * displacement.z;
                let z = Math.sin(angle) * displacement.x + Math.cos(angle) * displacement.z;
                cameraTruck.position = cameraTruck.position.add(new BABYLON.Vector3(
                    x,
                    0,
                    z
                ));
            }
        }.bind(this));
    
        return camera;
    }
    
    generateGround() {
        let gridLength = 10;
        const ground = new Array();
        for(let y = 0; y < gridLength; y++) {
            ground[y] = new Array();
            for(let x = 0; x < gridLength; x++) {
                let tile = new GroundTile(new BABYLON.Vector3(x, 0, y), this);
                ground[y][x] = tile;
            }
        }
    
        return ground;
    }
}

function createButton(name, text, onClick, game, settings = {}) {
    let button = BABYLON.GUI.Button.CreateSimpleButton(name, text);
    button.horizontalAlignment = settings.horizontalAlignment || BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    button.verticalAlignment = settings.verticalAlignment || BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    button.width = settings.width || "100px";
    button.height = settings.height || "40px";
    button.left = settings.left || "0px";
    button.color = settings.color || "white";
    button.background = settings.background || "black";
    button.onPointerClickObservable.add(onClick.bind(game));
    if(settings.container) settings.container.addControl(button);
    return button;
}



class MeshHandler {
    names = {};
    
    constructor() {
        this.addMesh("house", generateBox());
    }

    addMesh(name, mesh) {
        names[name] = this.meshes.length;
        this.meshes.push(mesh);
    }

    getMesh(name, meshName) {
        return this.meshes[this.names[meshName]].createInstance(name);
    }
}

function generateBox() {
    return BABYLON.MeshBuilder.CreateBox("Box", {width:1, height:1, depth:1});
}

function generateHouse() {
    let foundation = BABYLON.MeshBuilder.CreateBox("foundation", {width: 1.5, height: 0.125, depth: 1.5});
    foundation.position = new BABYLON.Vector3(0, 0.125, 0);
    let sideBox = BABYLON.MeshBuilder.CreateBox("sideBox", {width: 0.5, height: 0.5, depth: 1.25});
    sideBox.position = new BABYLON.Vector3(0.375, 0.375, 0);
    let sideRoof = BABYLON.MeshBuilder.CreateCylinder("roof", {diameter: 0.75, height: 1, tessellation: 3});
    sideRoof.scaling.x = 0.75;
    sideRoof.rotation = new BABYLON.Vector3(0, Math.PI / 2,  Math.PI / 2);
    sideRoof.position = new BABYLON.Vector3(0.375, Math.sin(Math.PI / 3) * 0.5625 + 0.25, -0.25);
    let backBox = BABYLON.MeshBuilder.CreateBox("sideBox", {width: 1.25, height: 0.5, depth: 0.75});
    backBox.position = new BABYLON.Vector3(0, 0.375, 0.25);
    let backRoof = BABYLON.MeshBuilder.CreateCylinder("roof", {diameter: 1.25, height: 1.5, tessellation: 3});
    backRoof.scaling.x = 0.75;
    backRoof.rotation = new BABYLON.Vector3(0, 0,  Math.PI / 2);
    backRoof.position = new BABYLON.Vector3(0.0, Math.sin(Math.PI / 3) * 0.75 + 0.25, 0.25);
    let mesh = BABYLON.Mesh.MergeMeshes([foundation, sideBox, sideRoof, backBox, backRoof], true, false, null, false, true);
    mesh.name = "house";
    mesh.position = new BABYLON.Vector3(0.25, 0, 0.25);
    mesh.isPickable = false;
    return mesh;
}
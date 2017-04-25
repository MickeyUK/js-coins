/* global THREE, dat */

'use strict';

/**
 * Coins.js
 * 
 * @author Michael Dearman <http://github.com/mickeyuk>
 */

// three.js
var container, renderer, scene, camera, loader, audioLoader, listener;

// Postprocessing
var postProcessing, composer;

// Delta time
var deltaTime, clock = new THREE.Clock();

// Helpers
var stats, showStats, showGUI, gui = null;

// Coins.js
var cabinet, shelf;
var pusher, pusherStep = 0, pusherIn = false;
var coinSFX,sfxEnabled=false;

// Resize game to fit browser window
window.addEventListener('resize', onWindowResize, false);

// Key press
document.addEventListener('keydown',onKeyDown,false);

// Start game
window.onload = init();

/**
 * Initializes the renderer.
 * 
 * @returns {void}
 */
function init() {
    
    // Settings
    postProcessing = true; // Enable post processing
    container = 'viewport'; // The ID of element to project game
    showStats = true; // Show performance statistics
    showGUI = false; // Show GUI controls
    
    // Renderer
    renderer = new THREE.WebGLRenderer({antialias: false});
    renderer.setClearColor(0x000000);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Shadows
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
    
    // Append to 'viewport' div
    document.getElementById( container ).appendChild( renderer.domElement );
    
    // Loaders
    audioLoader = new THREE.AudioLoader();
    
    // Stats
    if (showStats) {
        stats = new Stats();
        document.getElementById( container ).appendChild( stats.dom );
    }
    
    // GUI
    if (showGUI) {
        gui = new dat.GUI;
    }
    
    // Initialize scene
    initScene();
    
    // Post processing
    if (postProcessing) {
        initPostProcessing();
    }

    // Request frame
    requestAnimationFrame(render);

}

/**
 * Initializes the camera.
 * 
 * @param {number} camX The x position.
 * @param {number} camY The Y position.
 * @param {number} camZ The Z position.
 * @param {number} rotX The X axis.
 * @param {number} rotY The Y axis.
 * @param {number} rotZ The Z axis.
 * 
 * @returns {void}
 */
function initCamera(camX=0, camY=0, camZ=0, rotX=0, rotY=0, rotZ=0) {
    
    // Settings
    var fov = 35;
    var ratio = window.innerWidth / window.innerHeight;
    var clipNear = 1;
    var clipFar = 1000;
    
    // Create camera
    camera = new THREE.PerspectiveCamera(fov, ratio, clipNear, clipFar);
    
    // Audio listener
    listener = new THREE.AudioListener();
    camera.add( listener );
    
    // Position & orientation
    camera.lookAt(new THREE.Vector3(0,0,0));
    camera.position.set( camX, camY, camZ );
    camera.rotation.set(rotX, rotY, rotZ);
    
    // Add camera to scene
    scene.add(camera);
    
}

/**
 * Initializes the effects composer and adds shader passes.
 * 
 * @returns {void}
 */
function initPostProcessing() {
    
    // New effects composer
    composer = new THREE.EffectComposer( renderer );
    composer.addPass( new THREE.RenderPass( scene, camera ) );
    
    // SMAA
    var pass = new THREE.SMAAPass( window.innerWidth, window.innerHeight );
    pass.renderToScreen = true;
    composer.addPass( pass );
   
}

/**
 * Renders the scene.
 * 
 * @returns {void}
 */
function render() {
    
    // Delta time
    deltaTime = clock.getDelta();
    
    // Game loop
    animate();
    
    // Physics
    scene.simulate(deltaTime, 1);
    
    // Render scene
    if (postProcessing) {
        composer.render();
    } else {
        renderer.render(scene, camera);
    }
    
    // Request next frame
    requestAnimationFrame(render);
    
    if (showStats) {
        stats.update();
    }
    
}

/**
 * Resizes game to fit browser window.
 * 
 * @returns {void}
 */
function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);

}

/**
 * Converts degrees to radians.
 * 
 * @param {number} val The degrees to convert.
 * @returns {number}
 */
function degRad(val) {
    return val * Math.PI / 180;
}

/**
 * Random integer between range.
 * 
 * @param {int} min Min number.
 * @param {int} max Max number.
 * 
 * @returns {Number}
 */
function randomRange(min,max) {
    return Math.floor(Math.random()*(max-min+1)+min);
}

/**
 * Initializes the game scene.
 * 
 * @returns {void}
 */
function initScene() {
    
    // New physics scene
    scene = new Physijs.Scene;
    
    // Scene settings
    scene.setGravity(new THREE.Vector3( 0, -200, 0 ));
    
    // New camera
    initCamera(0, 180, 260, degRad(-30));
    
    // JSON Loader
    loader = new THREE.JSONLoader();
    loader.setTexturePath('textures/');
    
    // Panorama background
    initPanorama('/textures/arcade.jpg');
    
    // Initialize coin cabinet
    initCabinet();
    
    // Lights
    initLights();
    
    // Arcade ambience
    var arcadeAmb = new THREE.Audio( listener );
    audioLoader.load( 'sfx/arcade.mp3', function( buffer ) {
        arcadeAmb.setBuffer( buffer );
	arcadeAmb.setLoop(true);
	arcadeAmb.setVolume(0.5);
	arcadeAmb.play();
    });
    
    // Coin sounds
    coinSFX = [
        'sfx/coinClash1.wav',
        'sfx/coinClash2.wav',
        'sfx/coinClash3.wav'
    ];
    
    // Populate with coins
    for ( var i = 0; i < 50; i++ ) {
        
        createCoin(randomRange(-40,40),randomRange(0,50),randomRange(20,50));
        
    }
    
    // Delay for sound effects
    setTimeout(function(){
        sfxEnabled = true;
    },3000);
    
}

/**
 * The main animation loop.
 * 
 * @returns {void}
 */
function animate() {
    
    // Move pusher back and forth
    movePusher();
    
}

/**
 * On key press.
 * 
 * @returns {void}
 */
function onKeyDown() {
    
    createCoin(randomRange(-40,40),randomRange(80,100),randomRange(-20,-100));
    
}

/**
 * Initializes the panorama background.
 * 
 * @param {string} imagePath Path to the image.
 * @returns {void}
 */
function initPanorama(imagePath) {
    
    // Sphere
    var geo = new THREE.SphereGeometry(500, 60, 40);
    geo.scale(-1, 1, 1);

    // Load texture
    var mat = new THREE.MeshBasicMaterial({
        map: new THREE.TextureLoader().load(imagePath)
    });

    // Add to scene
    var mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    
}

/**
 * Initializes the coin machine cabinet.
 * 
 * @returns {void}
 */
function initCabinet() {
    
    // Cabinet model
    loader.load('models/cabinet.json', function (geometry, materials) {
        
        // Create mesh for model
        var material = new THREE.MultiMaterial(materials);
        cabinet = new THREE.Mesh(geometry, material, 0);

        // Position and scale
        cabinet.scale.set(10, 10, 10);
        cabinet.position.set(0, 0, 0);
        
        // Shadow
        cabinet.castShadow = true;
        cabinet.receiveShadow = true;

        // Add to scene
        scene.add(cabinet);

    });
    
    // Shelf
    var geo = new THREE.BoxBufferGeometry(104,200,188);
    var mat = new THREE.MeshPhongMaterial({ 
        color: 0xc1c1c1,
        specular: 0x111111,
        shininess: 10
    });
    
    shelf = new Physijs.BoxMesh(geo, mat, 0);
    shelf.position.set(0,-100,-18.5);
    
    scene.add(shelf);
    
    // Pusher
    var geo = new THREE.BoxBufferGeometry(103,50,160);
    var mat = new THREE.MeshPhongMaterial({ 
        color: 0xd8c497,
        specular: 0x111111,
        shininess: 10
    });
    
    pusher = new Physijs.BoxMesh(geo, mat, 0);
    pusher.position.set(0,4,-192);
    
    scene.add(pusher);
    
}

/**
 * Initializes the lighting for the scene.
 * 
 * @returns {void}
 */
function initLights() {
    
    // Ambient light
    var ambientLight = new THREE.AmbientLight(0xFFFFFF, .1);
    scene.add(ambientLight);
    
    // Point light
    var pointLight = new THREE.PointLight(0xFFFFFF);
    pointLight.position.set(-320,890,560);
    scene.add(pointLight);
    
}

/**
 * Instantiates a new coin.
 * 
 * @param {number} posX
 * @param {number} posY
 * @param {number} posZ
 * 
 * @returns {void}
 */
function createCoin(posX=0,posY=0,posZ=0) {
    
    loader.load('models/coin.json', function (geometry, materials) {

        var mass = 1;
        var friction = 0.2; // high friction
        var restitution = 0.3; // low restitution

        // Create mesh for model
        var material = Physijs.createMaterial( 
                new THREE.MultiMaterial(materials),
                friction, restitution);
        var coin = new Physijs.CylinderMesh(geometry, material, mass);

        // Position and scale
        coin.scale.set(10, 10, 10);
        coin.position.set(posX, posY, posZ);
        
        // Shadow
        coin.castShadow = true;
        coin.receiveShadow = true;

        // Add to scene
        scene.add(coin);
        
        // Collisions
        coin.addEventListener( 'collision', function(object, rel_vol){
            
            if (sfxEnabled) {
            
                var volx = Math.abs(rel_vol.x);
                var voly = Math.abs(rel_vol.y);
                var volz = Math.abs(rel_vol.z);

                if (volx > 10 || voly > 10 || volz > 10) {

                    var coinSound = new THREE.PositionalAudio( listener );
                    audioLoader.load( coinSFX[Math.floor(coinSFX.length * Math.random())], function( buffer ) {
                            coinSound.setBuffer( buffer );
                            coinSound.setRefDistance( 20 );
                            coinSound.play();
                    });
                    coin.add( coinSound );

                }
                
            }

        });

    });
    
}

/**
 * Moves the pusher back and forth.
 * 
 * @returns {void}
 */
function movePusher() {
    
    var speed = 1.5;
    var delay = 150;
    
    // Inwards
    if (pusherIn && pusher.position.z < -70) {
        pusher.position.z += speed;
    }

    // Outwards
    if (!pusherIn && pusher.position.z > -192) {
        pusher.position.z -= speed;
    }

    pusher.__dirtyPosition = true;
    
    pusherStep ++;
    
    if (pusherStep > delay) {
        
        pusherIn = !pusherIn;
        pusherStep = 0;
        
    }
    
}
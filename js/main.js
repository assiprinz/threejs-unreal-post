function App () {
    this.params = {
        projection: 'normal',
        background: false,
        exposure: 1.0,
        bloomStrength: 1.5,
        bloomThreshold: 0.85,
        bloomRadius: 0.4,
        rotation: true
    };
    this.standardMaterial = new THREE.MeshStandardMaterial({
        map: null,
        color: 0xffffff,
        metalness: 1.0,
        shading: THREE.SmoothShading
    });
    this.objects = [];
    this.init();
}
App.prototype.init = function () {
    console.time('init complete');
    if ( ! Detector.webgl ) Detector.addGetWebGLMessage();
    console.time('loading threejs');
    this.loadTHREE();
    console.timeEnd('loading threejs');
    console.time('loading object');
    this.loadObject();
    console.timeEnd('loading object');
    console.time('loading lights');
    this.loadLights();
    console.timeEnd('loading lights');
    console.time('setting up renderer');
    this.setupRendering();
    console.timeEnd('setting up renderer');
    console.time('loading stats module');
    this.loadStats();
    console.timeEnd('loading stats module');
    console.time('loading controls');
    this.loadControls();
    console.timeEnd('loading controls');
    console.time('loading gui');
    this.loadGUI();
    console.timeEnd('loading gui');
    console.time('starting render cycle');
    this.animate();
    console.timeEnd('starting render cycle');
    console.time('attaching events');
    window.addEventListener('resize', this.onWindowResize.bind(this), false);
    console.timeEnd('init complete');
};

App.prototype.loadTHREE = function () {
    this.container = document.createElement('div');
    document.body.appendChild(this.container);
    this.camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 1, 2000 );
    this.camera.position.set( 0.0, 35, 35 * 3.5 );
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({antialias: false});
    this.renderer.setClearColor(new THREE.Color(0x111111));
    this.renderer.toneMapping = THREE.LinearToneMapping;
};

App.prototype.setupRendering = function () {
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);
    // Render Pass
    this.renderScene = new THREE.RenderPass(this.scene, this.camera);
    this.effectFXAA = new THREE.ShaderPass(THREE.FXAAShader);
    this.effectFXAA.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight );
    this.copyShader = new THREE.ShaderPass(THREE.CopyShader);
    this.copyShader.renderToScreen = true;
    this.bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);//1.0, 9, 0.5, 512);
    this.composer = new THREE.EffectComposer(this.renderer);
    this.composer.setSize(window.innerWidth, window.innerHeight);
    this.composer.addPass(this.renderScene);
    this.composer.addPass(this.effectFXAA);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.copyShader);
    //renderer.toneMapping = THREE.ReinhardToneMapping;
    this.renderer.gammaInput = true;
    this.renderer.gammaOutput = true;
    var rgbmUrls = this.genCubeUrls( "./textures/cube/pisaRGBM16/", ".png" );
    new THREE.CubeTextureLoader().load(rgbmUrls, function ( rgbmCubeMap ) {
        rgbmCubeMap.encoding = THREE.RGBM16Encoding;
        var pmremGenerator = new THREE.PMREMGenerator( rgbmCubeMap );
        pmremGenerator.update(this.renderer);
        var pmremCubeUVPacker = new THREE.PMREMCubeUVPacker(pmremGenerator.cubeLods);
        pmremCubeUVPacker.update(this.renderer);
        this.hdrCubeRenderTarget = pmremCubeUVPacker.CubeUVRenderTarget;
    }.bind(this));
};

App.prototype.loadStats = function () {
    this.stats = new Stats();
    this.container.appendChild( this.stats.dom );
};

App.prototype.loadControls = function () {
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set( 0, 0, 0 );
    this.controls.update();
};

App.prototype.loadObject = function () {
    // var geometry = new THREE.TorusKnotGeometry(18, 8, 2048, 512);
    var geometry = new THREE.TorusKnotGeometry(18, 8, 256, 64);
    var torusMesh1 = new THREE.Mesh(geometry, this.standardMaterial);
    torusMesh1.position.x = 0.0;
    torusMesh1.castShadow = true;
    torusMesh1.receiveShadow = true;
    this.scene.add(torusMesh1);
    this.objects.push(torusMesh1);
    this.textureLoader = new THREE.TextureLoader();
    this.textureLoader.load("./textures/roughness_map_2.jpg", function(map) {
        map.wrapS = THREE.RepeatWrapping;
        map.wrapT = THREE.RepeatWrapping;
        map.anisotropy = 4;
        map.repeat.set( 48, 6 );
        this.standardMaterial.roughnessMap = map;
        this.standardMaterial.bumpMap = map;
        this.standardMaterial.needsUpdate = true;
    }.bind(this));
};

App.prototype.loadGUI = function () {
    this.gui = new dat.GUI();
    this.gui.add( this.params, 'exposure', 0.1, 2 );
    this.gui.add( this.params, 'bloomThreshold', 0.0, 1.0 ).onChange( function(value) {
        this.bloomPass.threshold = Number(value);
    }.bind(this));
    this.gui.add( this.params, 'bloomStrength', 0.0, 3.0 ).onChange( function(value) {
        this.bloomPass.strength = Number(value);
    }.bind(this));
    this.gui.add( this.params, 'bloomRadius', 0.0, 1.0 ).onChange( function(value) {
        this.bloomPass.radius = Number(value);
    }.bind(this));
    this.gui.add( this.params, 'rotation');
    this.gui.open();
};

App.prototype.loadLights = function () {
    this.scene.add( new THREE.AmbientLight( 0x222222 ) );
    var spotLight = new THREE.SpotLight( 0xffffff );
    spotLight.position.set( 50, 100, 50 );
    spotLight.angle = Math.PI / 7;
    spotLight.penumbra = 0.8;
    spotLight.castShadow = true;
    this.scene.add( spotLight );
};

App.prototype.genCubeUrls = function (prefix, suffix) {
    return [
    prefix + 'px' + suffix, prefix + 'nx' + suffix,
    prefix + 'py' + suffix, prefix + 'ny' + suffix,
    prefix + 'pz' + suffix, prefix + 'nz' + suffix
    ];
};

App.prototype.animate = function () {
    requestAnimationFrame(this.animate.bind(this));
    this.stats.begin();
    this.render();
    this.stats.end();
};

App.prototype.render = function () {
    if ( this.standardMaterial !== undefined ) {
        this.standardMaterial.roughness = 1.0;
        this.standardMaterial.bumpScale = - 0.05;
        var newEnvMap = this.standardMaterial.envMap;
        if ( this.hdrCubeRenderTarget ) newEnvMap = this.hdrCubeRenderTarget.texture;
        if ( newEnvMap !== this.standardMaterial.envMap ) {
            this.standardMaterial.envMap = newEnvMap;
            this.standardMaterial.needsUpdate = true;
        }
    }
    this.renderer.toneMappingExposure = Math.pow(this.params.exposure, 4.0);
    this.timer = Date.now() * 0.00025;
    this.camera.lookAt(this.scene.position);
    if (this.params.rotation) {
        for (var i = 0, l = this.objects.length; i < l; i++) {
            var object = this.objects[i];
            object.rotation.y += 0.005;
        }
    }
    this.composer.render();
};

App.prototype.onWindowResize = function () {
    var width = window.innerWidth;
    var height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize( width, height );
    this.composer.setSize( width, height );
    this.effectFXAA.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight );
};
window.app = new App();

import './style.css';
import * as THREE from 'three';

// --- Configuration ---
const config = {
    colors: ['#f2f0eb', '#064e3b', '#047857', '#059669'], // Paper, Dark Green, Emerald, Bright Mint
    bgColor: '#f2f0eb',
    mouseForce: 40,  // Reduced from 20
    cursorSize: 50,  // Reduced from 80
    isViscous: false,
    viscous: 30,
    iterationsViscous: 32,
    iterationsPoisson: 32,
    dt: 0.01,       // Slower, smoother flow (was 0.014)
    BFECC: true,
    resolution: 0.5
};

// --- Shaders (GLSL) ---
const face_vert = `
  attribute vec3 position;
  uniform vec2 px;
  uniform vec2 boundarySpace;
  varying vec2 uv;
  precision highp float;
  void main(){
  vec3 pos = position;
  vec2 scale = 1.0 - boundarySpace * 2.0;
  pos.xy = pos.xy * scale;
  uv = vec2(0.5)+(pos.xy)*0.5;
  gl_Position = vec4(pos, 1.0);
}
`;

const line_vert = `
  attribute vec3 position;
  uniform vec2 px;
  precision highp float;
  varying vec2 uv;
  void main(){
  vec3 pos = position;
  uv = 0.5 + pos.xy * 0.5;
  vec2 n = sign(pos.xy);
  pos.xy = abs(pos.xy) - px * 1.0;
  pos.xy *= n;
  gl_Position = vec4(pos, 1.0);
}
`;

const mouse_vert = `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;
    uniform vec2 center;
    uniform vec2 scale;
    uniform vec2 px;
    varying vec2 vUv;
    void main(){
    vec2 pos = position.xy * scale * 2.0 * px + center;
    vUv = uv;
    gl_Position = vec4(pos, 0.0, 1.0);
}
`;

const advection_frag = `
    precision highp float;
    uniform sampler2D velocity;
    uniform float dt;
    uniform bool isBFECC;
    uniform vec2 fboSize;
    uniform vec2 px;
    varying vec2 uv;
    void main(){
    vec2 ratio = max(fboSize.x, fboSize.y) / fboSize;
    if(isBFECC == false){
        vec2 vel = texture2D(velocity, uv).xy;
        vec2 uv2 = uv - vel * dt * ratio;
        vec2 newVel = texture2D(velocity, uv2).xy;
        gl_FragColor = vec4(newVel, 0.0, 0.0);
    } else {
        vec2 spot_new = uv;
        vec2 vel_old = texture2D(velocity, uv).xy;
        vec2 spot_old = spot_new - vel_old * dt * ratio;
        vec2 vel_new1 = texture2D(velocity, spot_old).xy;
        vec2 spot_new2 = spot_old + vel_new1 * dt * ratio;
        vec2 error = spot_new2 - spot_new;
        vec2 spot_new3 = spot_new - error / 2.0;
        vec2 vel_2 = texture2D(velocity, spot_new3).xy;
        vec2 spot_old2 = spot_new3 - vel_2 * dt * ratio;
        vec2 newVel2 = texture2D(velocity, spot_old2).xy; 
        gl_FragColor = vec4(newVel2, 0.0, 0.0);
    }
}
`;

const color_frag = `
    precision highp float;
    uniform sampler2D velocity;
    uniform sampler2D palette;
    uniform vec4 bgColor;
    varying vec2 uv;
    void main(){
    vec2 vel = texture2D(velocity, uv).xy;
    float lenv = clamp(length(vel), 0.0, 1.0);
    vec3 c = texture2D(palette, vec2(lenv, 0.5)).rgb;
    vec3 outRGB = mix(bgColor.rgb, c, lenv);
    float outA = mix(bgColor.a, 1.0, lenv);
    gl_FragColor = vec4(outRGB, outA);
}
`;

const divergence_frag = `
    precision highp float;
    uniform sampler2D velocity;
    uniform float dt;
    uniform vec2 px;
    varying vec2 uv;
    void main(){
    float x0 = texture2D(velocity, uv-vec2(px.x, 0.0)).x;
    float x1 = texture2D(velocity, uv+vec2(px.x, 0.0)).x;
    float y0 = texture2D(velocity, uv-vec2(0.0, px.y)).y;
    float y1 = texture2D(velocity, uv+vec2(0.0, px.y)).y;
    float divergence = (x1 - x0 + y1 - y0) / 2.0;
    gl_FragColor = vec4(divergence / dt);
}
`;

const externalForce_frag = `
    precision highp float;
    uniform vec2 force;
    uniform vec2 center;
    uniform vec2 scale;
    uniform vec2 px;
    varying vec2 vUv;
    void main(){
    vec2 circle = (vUv - 0.5) * 2.0;
    float d = 1.0 - min(length(circle), 1.0);
    d *= d;
    gl_FragColor = vec4(force * d, 0.0, 1.0);
}
`;

const poisson_frag = `
    precision highp float;
    uniform sampler2D pressure;
    uniform sampler2D divergence;
    uniform vec2 px;
    varying vec2 uv;
    void main(){
    float p0 = texture2D(pressure, uv + vec2(px.x * 2.0, 0.0)).r;
    float p1 = texture2D(pressure, uv - vec2(px.x * 2.0, 0.0)).r;
    float p2 = texture2D(pressure, uv + vec2(0.0, px.y * 2.0)).r;
    float p3 = texture2D(pressure, uv - vec2(0.0, px.y * 2.0)).r;
    float div = texture2D(divergence, uv).r;
    float newP = (p0 + p1 + p2 + p3) / 4.0 - div;
    gl_FragColor = vec4(newP);
}
`;

const pressure_frag = `
    precision highp float;
    uniform sampler2D pressure;
    uniform sampler2D velocity;
    uniform vec2 px;
    uniform float dt;
    varying vec2 uv;
    void main(){
    float step = 1.0;
    float p0 = texture2D(pressure, uv + vec2(px.x * step, 0.0)).r;
    float p1 = texture2D(pressure, uv - vec2(px.x * step, 0.0)).r;
    float p2 = texture2D(pressure, uv + vec2(0.0, px.y * step)).r;
    float p3 = texture2D(pressure, uv - vec2(0.0, px.y * step)).r;
    vec2 v = texture2D(velocity, uv).xy;
    vec2 gradP = vec2(p0 - p1, p2 - p3) * 0.5;
    v = v - gradP * dt;
    gl_FragColor = vec4(v, 0.0, 1.0);
}
`;

const viscous_frag = `
    precision highp float;
    uniform sampler2D velocity;
    uniform sampler2D velocity_new;
    uniform float v;
    uniform vec2 px;
    uniform float dt;
    varying vec2 uv;
    void main(){
    vec2 old = texture2D(velocity, uv).xy;
    vec2 new0 = texture2D(velocity_new, uv + vec2(px.x * 2.0, 0.0)).xy;
    vec2 new1 = texture2D(velocity_new, uv - vec2(px.x * 2.0, 0.0)).xy;
    vec2 new2 = texture2D(velocity_new, uv + vec2(0.0, px.y * 2.0)).xy;
    vec2 new3 = texture2D(velocity_new, uv - vec2(0.0, px.y * 2.0)).xy;
    vec2 newv = 4.0 * old + v * dt * (new0 + new1 + new2 + new3);
    newv /= 4.0 * (1.0 + v * dt);
    gl_FragColor = vec4(newv, 0.0, 0.0);
}
`;

// --- Utility Classes ---
const Common = {
    width: 0,
    height: 0,
    aspect: 1,
    pixelRatio: 1,
    container: null,
    renderer: null,
    clock: null,
    time: 0,
    delta: 0,

    init(container) {
        this.container = container;
        this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        this.resize();

        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
        this.renderer.autoClear = false;
        this.renderer.setClearColor(new THREE.Color(config.bgColor), 0);
        this.renderer.setPixelRatio(this.pixelRatio);
        this.renderer.setSize(this.width, this.height);

        container.appendChild(this.renderer.domElement);

        this.clock = new THREE.Clock();
        this.clock.start();
    },

    resize() {
        if (!this.container) return;
        const rect = this.container.getBoundingClientRect();
        this.width = Math.floor(rect.width);
        this.height = Math.floor(rect.height);
        if (this.width < 1) this.width = 1;
        if (this.height < 1) this.height = 1;
        this.aspect = this.width / this.height;
        if (this.renderer) this.renderer.setSize(this.width, this.height);
    },

    update() {
        this.delta = this.clock.getDelta();
        this.time += this.delta;
    }
};

const Mouse = {
    coords: new THREE.Vector2(),
    coords_old: new THREE.Vector2(),
    diff: new THREE.Vector2(),
    timer: null,
    mouseMoved: false,

    init() {
        this.onMouseMoveBound = this.onMouseMove.bind(this);
        this.onTouchStartBound = this.onTouchStart.bind(this);
        this.onTouchMoveBound = this.onTouchMove.bind(this);
        window.addEventListener('mousemove', this.onMouseMoveBound);
        window.addEventListener('touchstart', this.onTouchStartBound, { passive: true });
        window.addEventListener('touchmove', this.onTouchMoveBound, { passive: true });
    },
    destroy() {
        if (this.onMouseMoveBound) window.removeEventListener('mousemove', this.onMouseMoveBound);
        if (this.onTouchStartBound) window.removeEventListener('touchstart', this.onTouchStartBound);
        if (this.onTouchMoveBound) window.removeEventListener('touchmove', this.onTouchMoveBound);
        this.onMouseMoveBound = null;
        this.onTouchStartBound = null;
        this.onTouchMoveBound = null;
    },

    setCoords(x, y) {
        if (!Common.container) return;
        const rect = Common.container.getBoundingClientRect();
        const nx = (x - rect.left) / rect.width;
        const ny = (y - rect.top) / rect.height;
        this.coords.set(nx * 2 - 1, -(ny * 2 - 1));
        this.mouseMoved = true;

        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => {
            this.mouseMoved = false;
        }, 100);
    },

    onMouseMove(e) {
        this.setCoords(e.clientX, e.clientY);
    },

    onTouchStart(e) {
        if (e.touches.length > 0) {
            this.setCoords(e.touches[0].clientX, e.touches[0].clientY);
        }
    },

    onTouchMove(e) {
        if (e.touches.length > 0) {
            this.setCoords(e.touches[0].clientX, e.touches[0].clientY);
        }
    },

    update() {
        this.diff.subVectors(this.coords, this.coords_old);
        this.coords_old.copy(this.coords);
        if (this.coords_old.x === 0 && this.coords_old.y === 0) this.diff.set(0, 0);
    },

    cleanup() {
        // No-op for now, simplified
    }
};

class ShaderPass {
    constructor(props) {
        this.props = props || {};
        this.uniforms = this.props.material?.uniforms;
        this.scene = new THREE.Scene();
        this.camera = new THREE.Camera();
        if (this.uniforms) {
            this.material = new THREE.RawShaderMaterial(this.props.material);
            this.geometry = new THREE.PlaneGeometry(2.0, 2.0);
            this.plane = new THREE.Mesh(this.geometry, this.material);
            this.scene.add(this.plane);
        }
    }
    update() {
        Common.renderer.setRenderTarget(this.props.output || null);
        Common.renderer.render(this.scene, this.camera);
        Common.renderer.setRenderTarget(null);
    }
}

// --- Simulation Pipeline Stages ---

class ExternalForce extends ShaderPass {
    constructor(simProps) {
        super({ output: simProps.dst });
        const mouseG = new THREE.PlaneGeometry(1, 1);
        const mouseM = new THREE.RawShaderMaterial({
            vertexShader: mouse_vert,
            fragmentShader: externalForce_frag,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            uniforms: {
                px: { value: simProps.cellScale },
                force: { value: new THREE.Vector2(0, 0) },
                center: { value: new THREE.Vector2(0, 0) },
                scale: { value: new THREE.Vector2(config.cursorSize, config.cursorSize) }
            }
        });
        this.mouse = new THREE.Mesh(mouseG, mouseM);
        this.scene.add(this.mouse);
    }
    update(props) {
        const forceX = (Mouse.diff.x / 2) * config.mouseForce;
        const forceY = (Mouse.diff.y / 2) * config.mouseForce;
        const cursorSizeX = config.cursorSize * props.cellScale.x;
        const cursorSizeY = config.cursorSize * props.cellScale.y;
        const centerX = Math.min(Math.max(Mouse.coords.x, -1 + cursorSizeX + props.cellScale.x * 2), 1 - cursorSizeX - props.cellScale.x * 2);
        const centerY = Math.min(Math.max(Mouse.coords.y, -1 + cursorSizeY + props.cellScale.y * 2), 1 - cursorSizeY - props.cellScale.y * 2);

        this.mouse.material.uniforms.force.value.set(forceX, forceY);
        this.mouse.material.uniforms.center.value.set(centerX, centerY);
        this.mouse.material.uniforms.scale.value.set(config.cursorSize, config.cursorSize);
        super.update();
    }
}

class Advection extends ShaderPass {
    constructor(simProps) {
        super({
            material: {
                vertexShader: face_vert, fragmentShader: advection_frag,
                uniforms: {
                    boundarySpace: { value: simProps.cellScale },
                    px: { value: simProps.cellScale },
                    fboSize: { value: simProps.fboSize },
                    velocity: { value: simProps.src.texture },
                    dt: { value: config.dt },
                    isBFECC: { value: config.BFECC }
                }
            },
            output: simProps.dst
        });
        /* Boundary Lines - Simplification: Skipped for now to reduce complexity, keeping core fluid */
    }
}

class Divergence extends ShaderPass {
    constructor(simProps) {
        super({
            material: {
                vertexShader: face_vert, fragmentShader: divergence_frag,
                uniforms: {
                    velocity: { value: simProps.src.texture },
                    px: { value: simProps.cellScale },
                    dt: { value: config.dt }
                }
            },
            output: simProps.dst
        });
    }
    update({ vel }) {
        this.uniforms.velocity.value = vel.texture;
        super.update();
    }
}

class Poisson extends ShaderPass {
    constructor(simProps) {
        super({
            material: {
                vertexShader: face_vert, fragmentShader: poisson_frag,
                uniforms: {
                    pressure: { value: simProps.dst_.texture },
                    divergence: { value: simProps.src.texture },
                    px: { value: simProps.cellScale }
                }
            },
            output: simProps.dst,
            output0: simProps.dst_,
            output1: simProps.dst
        });
    }
    update() {
        let p_in, p_out;
        for (let i = 0; i < config.iterationsPoisson; i++) {
            if (i % 2 === 0) { p_in = this.props.output0; p_out = this.props.output1; }
            else { p_in = this.props.output1; p_out = this.props.output0; }
            this.uniforms.pressure.value = p_in.texture;
            this.props.output = p_out;
            super.update();
        }
        return p_out;
    }
}

class Pressure extends ShaderPass {
    constructor(simProps) {
        super({
            material: {
                vertexShader: face_vert, fragmentShader: pressure_frag,
                uniforms: {
                    pressure: { value: simProps.src_p.texture },
                    velocity: { value: simProps.src_v.texture },
                    px: { value: simProps.cellScale },
                    dt: { value: config.dt }
                }
            },
            output: simProps.dst
        });
    }
    update({ vel, pressure }) {
        this.uniforms.velocity.value = vel.texture;
        this.uniforms.pressure.value = pressure.texture;
        super.update();
    }
}

// --- Main Simulation Controller ---
class FluidSimulation {
    constructor() {
        this.fbos = {
            vel_0: null, vel_1: null,
            div: null,
            pressure_0: null, pressure_1: null
        };
        this.fboSize = new THREE.Vector2();
        this.cellScale = new THREE.Vector2();

        this.resize();
        this.createShaderPassed();
        this.createOutputMesh();
    }

    resize() {
        const simRes = config.resolution;
        this.fboSize.x = Math.floor(Common.width * simRes);
        this.fboSize.y = Math.floor(Common.height * simRes);
        this.cellScale.set(1 / this.fboSize.x, 1 / this.fboSize.y);
        this.initFBOs();
    }

    initFBOs() {
        // iOS requires HalfFloatType for render targets
        const isIOS = /(iPad|iPhone|iPod)/i.test(navigator.userAgent);
        const type = isIOS ? THREE.HalfFloatType : THREE.FloatType;

        const opts = {
            type, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
            wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping,
            depthBuffer: false, stencilBuffer: false
        };
        for (let key in this.fbos) {
            this.fbos[key] = new THREE.WebGLRenderTarget(this.fboSize.x, this.fboSize.y, opts);
        }
    }

    createOutputMesh() {
        const palette = this.makePaletteTexture(config.colors);
        const material = new THREE.RawShaderMaterial({
            vertexShader: face_vert,
            fragmentShader: color_frag,
            uniforms: {
                velocity: { value: this.fbos.vel_0.texture },
                palette: { value: palette },
                bgColor: { value: new THREE.Color(config.bgColor) }
            },
            transparent: true
        });
        this.outputMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
        this.outputScene = new THREE.Scene();
        this.outputScene.add(this.outputMesh);
    }

    makePaletteTexture(stops) {
        const w = stops.length;
        const data = new Uint8Array(w * 4);
        for (let i = 0; i < w; i++) {
            const c = new THREE.Color(stops[i]);
            data[i * 4 + 0] = Math.round(c.r * 255);
            data[i * 4 + 1] = Math.round(c.g * 255);
            data[i * 4 + 2] = Math.round(c.b * 255);
            data[i * 4 + 3] = 255;
        }
        const tex = new THREE.DataTexture(data, w, 1, THREE.RGBAFormat);
        tex.magFilter = THREE.LinearFilter;
        tex.minFilter = THREE.LinearFilter;
        tex.needsUpdate = true;
        return tex;
    }

    createShaderPassed() {
        const simProps = {
            cellScale: this.cellScale, fboSize: this.fboSize, dt: config.dt
        };

        this.externalForce = new ExternalForce({ ...simProps, dst: this.fbos.vel_1 });
        this.advection = new Advection({ ...simProps, src: this.fbos.vel_0, dst: this.fbos.vel_1 });
        this.divergence = new Divergence({ ...simProps, src: this.fbos.vel_1, dst: this.fbos.div });
        this.poisson = new Poisson({ ...simProps, src: this.fbos.div, dst: this.fbos.pressure_1, dst_: this.fbos.pressure_0 });
        this.pressure = new Pressure({ ...simProps, src_p: this.fbos.pressure_1, src_v: this.fbos.vel_1, dst: this.fbos.vel_0 });
    }

    step() {
        // 1. Advection
        this.advection.uniforms.velocity.value = this.fbos.vel_0.texture;
        this.advection.update({}); // output to vel_1

        // 2. External Forces
        this.externalForce.update({ cellScale: this.cellScale }); // adds to vel_1

        // 3. Divergence
        this.divergence.update({ vel: this.fbos.vel_1 }); // output to div

        // 4. Poisson (Pressure Solve)
        const p_out = this.poisson.update(); // output to pressure_1 or 0

        // 5. Pressure Gradient Subtraction
        this.pressure.update({ vel: this.fbos.vel_1, pressure: p_out }); // output to vel_0

        // 6. Render
        this.outputMesh.material.uniforms.velocity.value = this.fbos.vel_0.texture;
        Common.renderer.setRenderTarget(null);
        Common.renderer.render(this.outputScene, new THREE.Camera());
    }
}


// --- App Entry & HMR ---
let simulation;
let rafId;
let handleResize;

function init() {
    const container = document.getElementById('fluid-canvas');
    if (!container) {
        document.body.style.opacity = '1';
        return;
    }

    // Fade in body
    document.body.style.opacity = '1';

    Common.init(container);
    Mouse.init();

    simulation = new FluidSimulation();

    // Update Github Stars
    updateGithubStars();

    function loop() {
        Common.update();
        Mouse.update();
        simulation.step();
        rafId = requestAnimationFrame(loop);
    }
    loop();

    handleResize = () => {
        Common.resize();
        simulation.resize();
    };
    window.addEventListener('resize', handleResize);
}

// Cleanup for HMR
if (window.__weMDApp) window.__weMDApp.cleanup();

window.__weMDApp = {
    cleanup: () => {
        if (rafId) cancelAnimationFrame(rafId);
        if (handleResize) window.removeEventListener('resize', handleResize);
        Mouse.destroy();
    }
};

async function updateGithubStars() {
    try {
        const response = await fetch('https://api.github.com/repos/tenngoxars/WeMD');
        const data = await response.json();
        const starCount = document.getElementById('star-count');
        if (starCount && data.stargazers_count !== undefined) {
            starCount.textContent = `· ${data.stargazers_count} Stars`;
        }
    } catch (e) { }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
    init();
}

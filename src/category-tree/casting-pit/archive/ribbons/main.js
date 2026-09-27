import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const sceneElement = document.querySelector( '#scene' );

const scene = new THREE.Scene();
scene.background = new THREE.Color( 0x050607 );

const camera = new THREE.PerspectiveCamera( 48, 1, 0.1, 80 );

const renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setPixelRatio( Math.min( window.devicePixelRatio, 2 ) );
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
sceneElement.appendChild( renderer.domElement );

const orbitControls = new OrbitControls( camera, renderer.domElement );
orbitControls.enableDamping = true;
orbitControls.dampingFactor = 0.07;
orbitControls.minDistance = 3;
orbitControls.maxDistance = 34;
orbitControls.maxPolarAngle = Math.PI * 0.495;

const parameters = {
    depth: 5.5,
    width: 3.8,
    flowSpeed: 0.7,
    lavaIntensity: 1.2,
    flowWidth: 0.18
};

function membraneHeight( x, z )
{
    const radius = Math.hypot( x, z );
    const normalizedRadius = radius / parameters.width;
    return -parameters.depth * Math.exp( -normalizedRadius * normalizedRadius );
}

function createMembraneGeometry( segments )
{
    const geometry = new THREE.PlaneGeometry( 24, 24, segments, segments );
    geometry.rotateX( -Math.PI / 2 );

    const positions = geometry.attributes.position;
    geometry.userData.materialPositions = Float32Array.from( positions.array );
    return geometry;
}

function deformMembrane( geometry )
{
    const positions = geometry.attributes.position;
    const materialPositions = geometry.userData.materialPositions;

    for ( let index = 0; index < positions.count; index += 1 )
    {
        const offset = index * 3;
        const x = materialPositions[offset];
        const z = materialPositions[offset + 2];
        positions.setXYZ( index, x, membraneHeight( x, z ), z );
    }

    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
}

const membraneGeometry = createMembraneGeometry( 180 );
const membraneMaterial = new THREE.MeshStandardMaterial( {
    color: 0x25282a,
    metalness: 0.28,
    roughness: 0.68,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1
} );
const membrane = new THREE.Mesh( membraneGeometry, membraneMaterial );
scene.add( membrane );

const diagnosticGeometry = createMembraneGeometry( 32 );
const diagnosticMaterial = new THREE.MeshBasicMaterial( {
    color: 0xc48a58,
    transparent: true,
    opacity: 0.48,
    wireframe: true,
    depthWrite: false
} );
const diagnostic = new THREE.Mesh( diagnosticGeometry, diagnosticMaterial );
diagnostic.visible = false;
diagnostic.renderOrder = 1;
scene.add( diagnostic );

const flowVertexShader = `
    attribute float flowProgress;
    attribute float sidePosition;

    varying float vProgress;
    varying float vSide;

    void main()
    {
        vProgress = flowProgress;
        vSide = sidePosition;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
`;

const flowFragmentShader = `
    uniform float time;
    uniform float speed;
    uniform float intensity;
    uniform float phase;
    uniform vec3 lavaColor;

    varying float vProgress;
    varying float vSide;

    void main()
    {
        const float tau = 6.28318530718;
        float movingWave = sin( ( vProgress * 4.0 - time * speed + phase ) * tau );
        float pulse = pow( max( movingWave, 0.0 ), 7.0 );
        float core = 1.0 - smoothstep( 0.08, 0.95, abs( vSide ) );
        float convergence = mix( 0.72, 1.45, smoothstep( 0.35, 0.95, vProgress ) );
        float disappearance = 1.0 - smoothstep( 0.955, 1.0, vProgress );
        float heat = ( 0.34 + pulse * 1.35 ) * convergence * intensity;

        vec3 hotCore = mix( lavaColor, vec3( 1.0, 0.82, 0.38 ), core * ( 0.5 + pulse * 0.5 ) );
        float alpha = ( 0.45 + core * 0.55 ) * disappearance;
        gl_FragColor = vec4( hotCore * heat, alpha );
    }
`;

const flowDefinitions = [
    { angle: 0.12, radius: 11.6, bend1: 3.10, bend2: -1.05, width: 0.90, phase: 0.12, color: 0xff6a18 },
    { angle: 0.62, radius: 10.8, bend1: -2.65, bend2: 1.25, width: 1.20, phase: 0.63, color: 0xff8b24 },
    { angle: 1.72, radius: 11.3, bend1: 3.45, bend2: 1.40, width: 0.75, phase: 0.31, color: 0xff5414 },
    { angle: 2.18, radius: 10.5, bend1: -3.20, bend2: -0.95, width: 1.05, phase: 0.84, color: 0xffa02c },
    { angle: 3.48, radius: 11.7, bend1: 2.85, bend2: 1.15, width: 0.82, phase: 0.46, color: 0xff6f16 },
    { angle: 4.42, radius: 10.9, bend1: -3.60, bend2: 1.55, width: 1.12, phase: 0.04, color: 0xff8a20 },
    { angle: 5.05, radius: 11.4, bend1: 2.95, bend2: -1.45, width: 0.95, phase: 0.72, color: 0xff5c12 }
];

function bezierPoint( start, control1, control2, end, t )
{
    const inverse = 1 - t;
    return new THREE.Vector2(
        inverse ** 3 * start.x + 3 * inverse ** 2 * t * control1.x + 3 * inverse * t ** 2 * control2.x + t ** 3 * end.x,
        inverse ** 3 * start.y + 3 * inverse ** 2 * t * control1.y + 3 * inverse * t ** 2 * control2.y + t ** 3 * end.y
    );
}

function flowPoint( definition, progress )
{
    const radial = new THREE.Vector2( Math.cos( definition.angle ), Math.sin( definition.angle ) );
    const tangent = new THREE.Vector2( -radial.y, radial.x );
    const start = radial.clone().multiplyScalar( definition.radius );
    const control1 = radial.clone().multiplyScalar( definition.radius * 0.68 ).addScaledVector( tangent, definition.bend1 );
    const control2 = radial.clone().multiplyScalar( 2.15 ).addScaledVector( tangent, definition.bend2 );
    return bezierPoint( start, control1, control2, new THREE.Vector2(), progress );
}

function createFlowGeometry( definition )
{
    const segmentCount = 150;
    const positions = new Float32Array( ( segmentCount + 1 ) * 2 * 3 );
    const progressValues = new Float32Array( ( segmentCount + 1 ) * 2 );
    const sideValues = new Float32Array( ( segmentCount + 1 ) * 2 );
    const indices = [];

    for ( let segment = 0; segment <= segmentCount; segment += 1 )
    {
        const progress = segment / segmentCount;
        const point = flowPoint( definition, progress );
        const before = flowPoint( definition, Math.max( progress - 0.002, 0 ) );
        const after = flowPoint( definition, Math.min( progress + 0.002, 1 ) );
        const direction = after.sub( before ).normalize();
        const side = new THREE.Vector2( -direction.y, direction.x );
        const narrowing = THREE.MathUtils.lerp( 1, 0.48, progress );
        const halfWidth = parameters.flowWidth * definition.width * narrowing;

        for ( let edge = 0; edge < 2; edge += 1 )
        {
            const sideSign = edge === 0 ? -1 : 1;
            const x = point.x + side.x * halfWidth * sideSign;
            const z = point.y + side.y * halfWidth * sideSign;
            const vertex = ( segment * 2 + edge ) * 3;

            positions[vertex] = x;
            positions[vertex + 1] = membraneHeight( x, z ) + 0.035;
            positions[vertex + 2] = z;
            progressValues[segment * 2 + edge] = progress;
            sideValues[segment * 2 + edge] = sideSign;
        }

        if ( segment < segmentCount )
        {
            const vertex = segment * 2;
            indices.push( vertex, vertex + 2, vertex + 1, vertex + 2, vertex + 3, vertex + 1 );
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
    geometry.setAttribute( 'flowProgress', new THREE.BufferAttribute( progressValues, 1 ) );
    geometry.setAttribute( 'sidePosition', new THREE.BufferAttribute( sideValues, 1 ) );
    geometry.setIndex( indices );
    geometry.computeBoundingSphere();
    return geometry;
}

const flows = flowDefinitions.map( ( definition ) => {
    const material = new THREE.ShaderMaterial( {
        uniforms: {
            time: { value: 0 },
            speed: { value: parameters.flowSpeed },
            intensity: { value: parameters.lavaIntensity },
            phase: { value: definition.phase },
            lavaColor: { value: new THREE.Color( definition.color ) }
        },
        vertexShader: flowVertexShader,
        fragmentShader: flowFragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false
    } );
    const mesh = new THREE.Mesh( createFlowGeometry( definition ), material );
    mesh.renderOrder = 2;
    scene.add( mesh );
    return { definition, mesh };
} );

const receiverMaterial = new THREE.MeshBasicMaterial( { color: 0x080302, side: THREE.DoubleSide } );
const receiver = new THREE.Mesh( new THREE.CircleGeometry( 0.34, 48 ), receiverMaterial );
receiver.geometry.rotateX( -Math.PI / 2 );
receiver.renderOrder = 3;
scene.add( receiver );

const receiverGlowMaterial = new THREE.MeshBasicMaterial( {
    color: 0xff6a18,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false
} );
const receiverGlow = new THREE.Mesh( new THREE.RingGeometry( 0.29, 0.39, 48 ), receiverGlowMaterial );
receiverGlow.geometry.rotateX( -Math.PI / 2 );
receiverGlow.renderOrder = 4;
scene.add( receiverGlow );

const hemisphereLight = new THREE.HemisphereLight( 0x8795a1, 0x17110d, 1.25 );
scene.add( hemisphereLight );

const keyLight = new THREE.DirectionalLight( 0xffd3aa, 4 );
keyLight.position.set( -5, 9, 6 );
scene.add( keyLight );

const rimLight = new THREE.DirectionalLight( 0x6688aa, 1.5 );
rimLight.position.set( 7, 3, -6 );
scene.add( rimLight );

const lavaLight = new THREE.PointLight( 0xff5a16, 26, 9, 2 );
scene.add( lavaLight );

const slopeLights = flowDefinitions.slice( 0, 3 ).map( ( definition ) => {
    const light = new THREE.PointLight( definition.color, 4.5, 3.5, 2 );
    light.userData.definition = definition;
    scene.add( light );
    return light;
} );

function updateFlows()
{
    flows.forEach( ( flow ) => {
        flow.mesh.geometry.dispose();
        flow.mesh.geometry = createFlowGeometry( flow.definition );
    } );

    const centreHeight = membraneHeight( 0, 0 );
    receiver.position.set( 0, centreHeight + 0.045, 0 );
    receiverGlow.position.set( 0, centreHeight + 0.055, 0 );
    lavaLight.position.set( 0, centreHeight + 0.65, 0 );

    slopeLights.forEach( ( light ) => {
        const point = flowPoint( light.userData.definition, 0.72 );
        light.position.set( point.x, membraneHeight( point.x, point.y ) + 0.4, point.y );
    } );
}

function updateSurface()
{
    deformMembrane( membraneGeometry );
    deformMembrane( diagnosticGeometry );
    updateFlows();
}

function connectSlider( inputId, outputId, onInput )
{
    const input = document.querySelector( `#${inputId}` );
    const output = document.querySelector( `#${outputId}` );

    input.addEventListener( 'input', () => {
        const value = Number( input.value );
        output.value = value.toFixed( 2 );
        onInput( value );
    } );
}

connectSlider( 'depth', 'depth-value', ( value ) => {
    parameters.depth = value;
    updateSurface();
} );

connectSlider( 'width', 'width-value', ( value ) => {
    parameters.width = value;
    updateSurface();
} );

connectSlider( 'key-light', 'key-light-value', ( value ) => {
    keyLight.intensity = value;
} );

connectSlider( 'exposure', 'exposure-value', ( value ) => {
    renderer.toneMappingExposure = value;
} );

connectSlider( 'flow-speed', 'flow-speed-value', ( value ) => {
    parameters.flowSpeed = value;
    flows.forEach( ( flow ) => { flow.mesh.material.uniforms.speed.value = value; } );
} );

connectSlider( 'lava-intensity', 'lava-intensity-value', ( value ) => {
    parameters.lavaIntensity = value;
    flows.forEach( ( flow ) => { flow.mesh.material.uniforms.intensity.value = value; } );
    receiverGlowMaterial.opacity = Math.min( 0.9, value * 0.6 );
    lavaLight.intensity = value * 22;
    slopeLights.forEach( ( light ) => { light.intensity = value * 3.75; } );
} );

connectSlider( 'flow-width', 'flow-width-value', ( value ) => {
    parameters.flowWidth = value;
    updateFlows();
} );

document.querySelector( '#diagnostic' ).addEventListener( 'change', ( event ) => {
    diagnostic.visible = event.currentTarget.checked;
} );

const cameraViews = {
    monumental: {
        position: new THREE.Vector3( 7.5, 4.5, 14 ),
        target: new THREE.Vector3( 0, -1.6, 0 )
    },
    elevated: {
        position: new THREE.Vector3( 10.5, 10, 12.5 ),
        target: new THREE.Vector3( 0, -1.65, 0 )
    }
};

function setCameraView( name )
{
    const view = cameraViews[name];
    camera.position.copy( view.position );
    orbitControls.target.copy( view.target );
    orbitControls.update();
}

document.querySelectorAll( '[data-view]' ).forEach( ( button ) => {
    button.addEventListener( 'click', () => setCameraView( button.dataset.view ) );
} );

function resize()
{
    const width = sceneElement.clientWidth;
    const height = sceneElement.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio( Math.min( window.devicePixelRatio, 2 ) );
    renderer.setSize( width, height, false );
}

window.addEventListener( 'resize', resize );

function animate( time )
{
    const elapsed = time / 1000;
    flows.forEach( ( flow ) => { flow.mesh.material.uniforms.time.value = elapsed; } );
    receiverGlowMaterial.opacity = Math.min( 0.9, parameters.lavaIntensity * ( 0.55 + Math.sin( elapsed * 4 ) * 0.05 ) );
    orbitControls.update();
    renderer.render( scene, camera );
}

updateSurface();
setCameraView( 'monumental' );
resize();
renderer.setAnimationLoop( animate );

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const sceneElement = document.querySelector( '#scene' );
const parcelCountElement = document.querySelector( '#parcel-count' );
const interactionCountElement = document.querySelector( '#interaction-count' );
const crossSourceCountElement = document.querySelector( '#cross-source-count' );
const interceptorCountElement = document.querySelector( '#interceptor-count' );
const simulationTimeElement = document.querySelector( '#simulation-time' );

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
    emissionRate: 48,
    gravity: 3.2,
    drag: 0.32,
    interaction: 1.4,
    populationView: 'all'
};

const simulation = {
    fixedStep: 1 / 60,
    accumulator: 0,
    previousTime: 0,
    maximumParcels: 500,
    interactionRadius: 0.78,
    separationRadius: 0.16,
    receiverRadius: 0.34,
    parcels: [],
    lastStepMilliseconds: 0,
    lastInteractionCount: 0,
    lastCrossSourceInteractionCount: 0,
    lastInterceptorInteractionCount: 0,
    randomState: 0x2f6e2b1,
    statisticsElapsed: 0
};

function random()
{
    simulation.randomState ^= simulation.randomState << 13;
    simulation.randomState ^= simulation.randomState >>> 17;
    simulation.randomState ^= simulation.randomState << 5;
    return ( simulation.randomState >>> 0 ) / 4294967296;
}

function membraneHeight( x, z )
{
    const radiusSquared = x * x + z * z;
    return -parameters.depth * Math.exp( -radiusSquared / ( parameters.width * parameters.width ) );
}

function membraneGradient( x, z )
{
    const widthSquared = parameters.width * parameters.width;
    const factor = 2 * parameters.depth * Math.exp( -( x * x + z * z ) / widthSquared ) / widthSquared;
    return { x: factor * x, z: factor * z };
}

function createMembraneGeometry( segments )
{
    const geometry = new THREE.PlaneGeometry( 24, 24, segments, segments );
    geometry.rotateX( -Math.PI / 2 );
    geometry.userData.materialPositions = Float32Array.from( geometry.attributes.position.array );
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
    color: 0x313538,
    metalness: 0.2,
    roughness: 0.72,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1
} );
scene.add( new THREE.Mesh( membraneGeometry, membraneMaterial ) );

const diagnosticGeometry = createMembraneGeometry( 32 );
const diagnosticMaterial = new THREE.MeshBasicMaterial( {
    color: 0x83949b,
    transparent: true,
    opacity: 0.36,
    wireframe: true,
    depthWrite: false
} );
const diagnostic = new THREE.Mesh( diagnosticGeometry, diagnosticMaterial );
diagnostic.visible = false;
diagnostic.renderOrder = 1;
scene.add( diagnostic );

scene.add( new THREE.HemisphereLight( 0x8795a1, 0x17110d, 1.25 ) );

const keyLight = new THREE.DirectionalLight( 0xffd3aa, 4 );
keyLight.position.set( -5, 9, 6 );
scene.add( keyLight );

const rimLight = new THREE.DirectionalLight( 0x6688aa, 1.5 );
rimLight.position.set( 7, 3, -6 );
scene.add( rimLight );

const receiver = new THREE.Mesh(
    new THREE.CircleGeometry( simulation.receiverRadius, 48 ).rotateX( -Math.PI / 2 ),
    new THREE.MeshBasicMaterial( { color: 0x020303, side: THREE.DoubleSide } )
);
scene.add( receiver );

const sourceDefinitions = [
    { label: 'Radial control', position: [ -10.5, 0.0 ], velocity: [ 1.60, 0.00 ], cadence: 1.08, mass: 1.00, color: 0xe06767 },
    { label: 'Tangential capture', position: [ 0.0, 7.0 ], velocity: [ 1.60, 0.00 ], cadence: 0.92, mass: 1.00, color: 0x68a8e0 },
    { label: 'Interceptor A', position: [ -3.0, 3.0 ], velocity: [ 1.40, 0.00 ], cadence: 1.02, mass: 1.10, color: 0xe0bf67 },
    { label: 'Interceptor B', position: [ 3.0, -3.0 ], velocity: [ 0.00, 1.40 ], cadence: 0.98, mass: 0.90, color: 0x78cf8a },
    { label: 'High momentum', position: [ 7.0, -1.0 ], velocity: [ -0.35, 3.20 ], cadence: 0.86, mass: 1.55, color: 0xc47cdf },
    { label: 'Outward challenge', position: [ -5.0, -4.0 ], velocity: [ -0.75, -0.55 ], cadence: 1.14, mass: 0.85, color: 0x73d1c7 }
];

sourceDefinitions.forEach( ( source, sourceIndex ) => {
    source.emissionAccumulator = random();
    source.colorObject = new THREE.Color( source.color );
    source.captured = 0;
    source.lost = 0;
    source.resultElement = document.querySelector( `#source-result-${sourceIndex}` );
} );

const parcelPositions = new Float32Array( simulation.maximumParcels * 3 );
const parcelColors = new Float32Array( simulation.maximumParcels * 3 );
const parcelGeometry = new THREE.BufferGeometry();
parcelGeometry.setAttribute( 'position', new THREE.BufferAttribute( parcelPositions, 3 ).setUsage( THREE.DynamicDrawUsage ) );
parcelGeometry.setAttribute( 'color', new THREE.BufferAttribute( parcelColors, 3 ).setUsage( THREE.DynamicDrawUsage ) );
parcelGeometry.setDrawRange( 0, 0 );

const parcelMaterial = new THREE.PointsMaterial( {
    size: 0.14,
    sizeAttenuation: true,
    vertexColors: true,
    depthWrite: true
} );
const parcelPoints = new THREE.Points( parcelGeometry, parcelMaterial );
parcelPoints.renderOrder = 2;
scene.add( parcelPoints );

const vectorPositions = new Float32Array( simulation.maximumParcels * 2 * 3 );
const vectorColors = new Float32Array( simulation.maximumParcels * 2 * 3 );
const vectorGeometry = new THREE.BufferGeometry();
vectorGeometry.setAttribute( 'position', new THREE.BufferAttribute( vectorPositions, 3 ).setUsage( THREE.DynamicDrawUsage ) );
vectorGeometry.setAttribute( 'color', new THREE.BufferAttribute( vectorColors, 3 ).setUsage( THREE.DynamicDrawUsage ) );
vectorGeometry.setDrawRange( 0, 0 );
const velocityVectors = new THREE.LineSegments(
    vectorGeometry,
    new THREE.LineBasicMaterial( { vertexColors: true, transparent: true, opacity: 0.72, depthWrite: false } )
);
velocityVectors.visible = false;
velocityVectors.renderOrder = 3;
scene.add( velocityVectors );

function spawnParcel( source, sourceIndex )
{
    if ( simulation.parcels.length >= simulation.maximumParcels )
    {
        return;
    }

    const velocityLength = Math.hypot( source.velocity[0], source.velocity[1] );
    const perpendicularX = -source.velocity[1] / velocityLength;
    const perpendicularZ = source.velocity[0] / velocityLength;
    const positionJitter = ( random() - 0.5 ) * 0.5;
    const velocityJitter = ( random() - 0.5 ) * 0.34;

    simulation.parcels.push( {
        x: source.position[0] + perpendicularX * positionJitter,
        z: source.position[1] + perpendicularZ * positionJitter,
        vx: source.velocity[0] + perpendicularX * velocityJitter,
        vz: source.velocity[1] + perpendicularZ * velocityJitter,
        mass: source.mass * THREE.MathUtils.lerp( 0.82, 1.18, random() ),
        temperature: THREE.MathUtils.lerp( 0.85, 1, random() ),
        age: 0,
        lifetime: THREE.MathUtils.lerp( 18, 24, random() ),
        sourceIndex,
        ax: 0,
        az: 0
    } );
}

function emitParcels( timeStep )
{
    sourceDefinitions.forEach( ( source, sourceIndex ) => {
        if ( parameters.populationView === 'interceptors' && sourceIndex !== 2 && sourceIndex !== 3 )
        {
            return;
        }

        source.emissionAccumulator += parameters.emissionRate * source.cadence * timeStep / sourceDefinitions.length;

        while ( source.emissionAccumulator >= 1 )
        {
            spawnParcel( source, sourceIndex );
            source.emissionAccumulator -= 1;
        }
    } );
}

function hashKey( x, z )
{
    const size = simulation.interactionRadius;
    return `${Math.floor( x / size )},${Math.floor( z / size )}`;
}

function buildSpatialHash()
{
    const hash = new Map();

    simulation.parcels.forEach( ( parcel, index ) => {
        const key = hashKey( parcel.x, parcel.z );
        if ( !hash.has( key ) )
        {
            hash.set( key, [] );
        }
        hash.get( key ).push( index );
    } );

    return hash;
}

function applySurfaceForces()
{
    simulation.parcels.forEach( ( parcel ) => {
        const gradient = membraneGradient( parcel.x, parcel.z );
        const gradientSquared = gradient.x * gradient.x + gradient.z * gradient.z;
        parcel.ax = -parameters.gravity * gradient.x / ( 1 + gradientSquared );
        parcel.az = -parameters.gravity * gradient.z / ( 1 + gradientSquared );
    } );
}

function applyPairInteraction( first, second )
{
    const dx = second.x - first.x;
    const dz = second.z - first.z;
    const distanceSquared = dx * dx + dz * dz;
    const radius = simulation.interactionRadius;

    if ( distanceSquared <= 0.000001 || distanceSquared >= radius * radius )
    {
        return;
    }

    const distance = Math.sqrt( distanceSquared );
    const nx = dx / distance;
    const nz = dz / distance;
    const proximity = 1 - distance / radius;
    const strength = parameters.interaction;
    simulation.lastInteractionCount += 1;
    if ( first.sourceIndex !== second.sourceIndex )
    {
        simulation.lastCrossSourceInteractionCount += 1;
    }
    if ( ( first.sourceIndex === 2 && second.sourceIndex === 3 )
        || ( first.sourceIndex === 3 && second.sourceIndex === 2 ) )
    {
        simulation.lastInterceptorInteractionCount += 1;
    }

    const relativeVx = second.vx - first.vx;
    const relativeVz = second.vz - first.vz;
    const viscosity = strength * proximity * 1.8;
    first.ax += relativeVx * viscosity / first.mass;
    first.az += relativeVz * viscosity / first.mass;
    second.ax -= relativeVx * viscosity / second.mass;
    second.az -= relativeVz * viscosity / second.mass;

    const sharedRestDistance = simulation.separationRadius * Math.sqrt( ( first.mass + second.mass ) * 0.5 );
    let radialForce;

    if ( distance < sharedRestDistance )
    {
        radialForce = -strength * 11 * ( sharedRestDistance - distance ) / sharedRestDistance;
    }
    else
    {
        radialForce = strength * 0.5 * proximity * proximity;
    }

    first.ax += nx * radialForce / first.mass;
    first.az += nz * radialForce / first.mass;
    second.ax -= nx * radialForce / second.mass;
    second.az -= nz * radialForce / second.mass;
}

function applyNeighbourForces( spatialHash )
{
    const cellSize = simulation.interactionRadius;

    simulation.parcels.forEach( ( parcel, parcelIndex ) => {
        const cellX = Math.floor( parcel.x / cellSize );
        const cellZ = Math.floor( parcel.z / cellSize );

        for ( let offsetX = -1; offsetX <= 1; offsetX += 1 )
        {
            for ( let offsetZ = -1; offsetZ <= 1; offsetZ += 1 )
            {
                const neighbours = spatialHash.get( `${cellX + offsetX},${cellZ + offsetZ}` );
                if ( !neighbours )
                {
                    continue;
                }

                neighbours.forEach( ( neighbourIndex ) => {
                    if ( neighbourIndex > parcelIndex )
                    {
                        applyPairInteraction( parcel, simulation.parcels[neighbourIndex] );
                    }
                } );
            }
        }
    } );
}

function integrateParcels( timeStep )
{
    const dragFactor = Math.exp( -parameters.drag * timeStep );

    simulation.parcels.forEach( ( parcel ) => {
        parcel.vx = ( parcel.vx + parcel.ax * timeStep ) * dragFactor;
        parcel.vz = ( parcel.vz + parcel.az * timeStep ) * dragFactor;

        const speed = Math.hypot( parcel.vx, parcel.vz );
        if ( speed > 4.5 )
        {
            parcel.vx *= 4.5 / speed;
            parcel.vz *= 4.5 / speed;
        }

        parcel.x += parcel.vx * timeStep;
        parcel.z += parcel.vz * timeStep;
        parcel.temperature = Math.max( 0, parcel.temperature - timeStep * 0.012 );
        parcel.age += timeStep;
    } );

    simulation.parcels = simulation.parcels.filter( ( parcel ) => {
        const radius = Math.hypot( parcel.x, parcel.z );
        const source = sourceDefinitions[parcel.sourceIndex];

        if ( radius <= simulation.receiverRadius )
        {
            source.captured += 1;
            return false;
        }

        if ( radius >= 17 || parcel.age >= parcel.lifetime || parcel.temperature <= 0.1 )
        {
            source.lost += 1;
            return false;
        }

        return true;
    } );
}

function stepSimulation( timeStep )
{
    const start = performance.now();
    simulation.lastInteractionCount = 0;
    simulation.lastCrossSourceInteractionCount = 0;
    simulation.lastInterceptorInteractionCount = 0;
    emitParcels( timeStep );
    applySurfaceForces();
    applyNeighbourForces( buildSpatialHash() );
    integrateParcels( timeStep );
    simulation.lastStepMilliseconds = performance.now() - start;
}

function updateDiagnosticGeometry()
{
    simulation.parcels.forEach( ( parcel, index ) => {
        const sourceColor = sourceDefinitions[parcel.sourceIndex].colorObject;
        const height = membraneHeight( parcel.x, parcel.z ) + 0.08;
        const positionOffset = index * 3;

        parcelPositions[positionOffset] = parcel.x;
        parcelPositions[positionOffset + 1] = height;
        parcelPositions[positionOffset + 2] = parcel.z;
        parcelColors[positionOffset] = sourceColor.r;
        parcelColors[positionOffset + 1] = sourceColor.g;
        parcelColors[positionOffset + 2] = sourceColor.b;

        const vectorOffset = index * 6;
        const vectorEndX = parcel.x + parcel.vx * 0.16;
        const vectorEndZ = parcel.z + parcel.vz * 0.16;
        vectorPositions[vectorOffset] = parcel.x;
        vectorPositions[vectorOffset + 1] = height + 0.02;
        vectorPositions[vectorOffset + 2] = parcel.z;
        vectorPositions[vectorOffset + 3] = vectorEndX;
        vectorPositions[vectorOffset + 4] = membraneHeight( vectorEndX, vectorEndZ ) + 0.1;
        vectorPositions[vectorOffset + 5] = vectorEndZ;

        for ( let component = 0; component < 2; component += 1 )
        {
            const colorOffset = vectorOffset + component * 3;
            vectorColors[colorOffset] = sourceColor.r;
            vectorColors[colorOffset + 1] = sourceColor.g;
            vectorColors[colorOffset + 2] = sourceColor.b;
        }
    } );

    parcelGeometry.attributes.position.needsUpdate = true;
    parcelGeometry.attributes.color.needsUpdate = true;
    parcelGeometry.setDrawRange( 0, simulation.parcels.length );
    vectorGeometry.attributes.position.needsUpdate = true;
    vectorGeometry.attributes.color.needsUpdate = true;
    vectorGeometry.setDrawRange( 0, simulation.parcels.length * 2 );
}

function resetParcels()
{
    simulation.parcels = [];
    simulation.accumulator = 0;
    simulation.randomState = 0x2f6e2b1;
    sourceDefinitions.forEach( ( source ) => {
        source.emissionAccumulator = random();
        source.captured = 0;
        source.lost = 0;
        source.resultElement.value = '0 / 0';
    } );
    updateDiagnosticGeometry();
}

function updateSurface()
{
    deformMembrane( membraneGeometry );
    deformMembrane( diagnosticGeometry );
    receiver.position.y = membraneHeight( 0, 0 ) + 0.04;
    updateDiagnosticGeometry();
}

function connectSlider( inputId, outputId, onInput, decimals = 2 )
{
    const input = document.querySelector( `#${inputId}` );
    const output = document.querySelector( `#${outputId}` );

    input.addEventListener( 'input', () => {
        const value = Number( input.value );
        output.value = value.toFixed( decimals );
        onInput( value );
    } );
}

connectSlider( 'depth', 'depth-value', ( value ) => { parameters.depth = value; updateSurface(); } );
connectSlider( 'width', 'width-value', ( value ) => { parameters.width = value; updateSurface(); } );
connectSlider( 'key-light', 'key-light-value', ( value ) => { keyLight.intensity = value; } );
connectSlider( 'exposure', 'exposure-value', ( value ) => { renderer.toneMappingExposure = value; } );
connectSlider( 'emission-rate', 'emission-rate-value', ( value ) => { parameters.emissionRate = value; }, 0 );
connectSlider( 'gravity', 'gravity-value', ( value ) => { parameters.gravity = value; } );
connectSlider( 'drag', 'drag-value', ( value ) => { parameters.drag = value; } );
connectSlider( 'interaction', 'interaction-value', ( value ) => { parameters.interaction = value; } );

document.querySelector( '#diagnostic' ).addEventListener( 'change', ( event ) => {
    diagnostic.visible = event.currentTarget.checked;
} );

document.querySelector( '#velocity-vectors' ).addEventListener( 'change', ( event ) => {
    velocityVectors.visible = event.currentTarget.checked;
} );

document.querySelector( '#reset' ).addEventListener( 'click', resetParcels );

document.querySelectorAll( '[data-population]' ).forEach( ( button ) => {
    button.addEventListener( 'click', () => {
        parameters.populationView = button.dataset.population;
        resetParcels();
    } );
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
    if ( simulation.previousTime === 0 )
    {
        simulation.previousTime = time;
    }

    const frameTime = Math.min( ( time - simulation.previousTime ) / 1000, 0.05 );
    simulation.previousTime = time;
    simulation.accumulator += frameTime;

    let steps = 0;
    while ( simulation.accumulator >= simulation.fixedStep && steps < 3 )
    {
        stepSimulation( simulation.fixedStep );
        simulation.accumulator -= simulation.fixedStep;
        steps += 1;
    }

    if ( steps === 3 )
    {
        simulation.accumulator = 0;
    }

    updateDiagnosticGeometry();
    simulation.statisticsElapsed += frameTime;
    if ( simulation.statisticsElapsed >= 0.25 )
    {
        parcelCountElement.textContent = `${simulation.parcels.length} / ${simulation.maximumParcels}`;
        interactionCountElement.textContent = simulation.lastInteractionCount.toString();
        crossSourceCountElement.textContent = simulation.lastCrossSourceInteractionCount.toString();
        interceptorCountElement.textContent = simulation.lastInterceptorInteractionCount.toString();
        sourceDefinitions.forEach( ( source ) => {
            source.resultElement.value = `${source.captured} / ${source.lost}`;
        } );
        simulationTimeElement.textContent = `${simulation.lastStepMilliseconds.toFixed( 2 )} ms`;
        simulation.statisticsElapsed = 0;
    }

    orbitControls.update();
    renderer.render( scene, camera );
}

updateSurface();
setCameraView( 'elevated' );
resize();
renderer.setAnimationLoop( animate );

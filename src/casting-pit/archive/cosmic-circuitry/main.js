import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const sceneElement = document.querySelector( '#scene' );
const scene = new THREE.Scene();
scene.background = new THREE.Color( 0x030405 );

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
    intensity: 0.55,
    complexity: 0.58,
    circuitryScale: 1,
    surfaceBinding: 0.82,
    signalDensity: 70,
    signalSpeed: 4,
    signalBrightness: 0.3,
    seed: 1
};

function membraneHeight( x, z )
{
    return -parameters.depth * Math.exp( -( x * x + z * z ) / ( parameters.width * parameters.width ) );
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
    color: 0x17191a,
    metalness: 0.34,
    roughness: 0.82,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1
} );
scene.add( new THREE.Mesh( membraneGeometry, membraneMaterial ) );

const diagnosticGeometry = createMembraneGeometry( 32 );
const diagnostic = new THREE.Mesh( diagnosticGeometry, new THREE.MeshBasicMaterial( {
    color: 0x7d8b90,
    transparent: true,
    opacity: 0.3,
    wireframe: true,
    depthWrite: false
} ) );
diagnostic.visible = false;
diagnostic.renderOrder = 4;
scene.add( diagnostic );

scene.add( new THREE.HemisphereLight( 0x697580, 0x100d09, 0.8 ) );
const keyLight = new THREE.DirectionalLight( 0xffd5a2, 3.2 );
keyLight.position.set( -5, 9, 6 );
scene.add( keyLight );
const rimLight = new THREE.DirectionalLight( 0x506477, 1.1 );
rimLight.position.set( 7, 3, -6 );
scene.add( rimLight );

const receiver = new THREE.Mesh(
    new THREE.CircleGeometry( 0.34, 48 ).rotateX( -Math.PI / 2 ),
    new THREE.MeshBasicMaterial( { color: 0x010202, side: THREE.DoubleSide } )
);
scene.add( receiver );

function seededGenerator( seed )
{
    let state = seed >>> 0 || 1;
    return () => {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        return ( state >>> 0 ) / 4294967296;
    };
}

const network = { nodes: [], edges: [], adjacency: [], routes: [] };
const grooveGeometry = new THREE.BufferGeometry();
const grooveMaterial = new THREE.MeshBasicMaterial( {
    color: 0xffffff,
    vertexColors: true,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide,
    depthWrite: false
} );
const grooves = new THREE.Mesh( grooveGeometry, grooveMaterial );
grooves.renderOrder = 1;
scene.add( grooves );

const emberGeometry = new THREE.BufferGeometry();
const emberMaterial = new THREE.MeshBasicMaterial( {
    color: 0xffffff,
    vertexColors: true,
    transparent: true,
    opacity: parameters.intensity,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
} );
const embers = new THREE.Mesh( emberGeometry, emberMaterial );
embers.renderOrder = 2;
scene.add( embers );

const circuitGeometry = new THREE.BufferGeometry();
const circuitMaterial = new THREE.LineBasicMaterial( {
    color: 0xffffff,
    vertexColors: true,
    transparent: true,
    opacity: parameters.intensity,
    blending: THREE.AdditiveBlending,
    depthWrite: false
} );
const circuits = new THREE.LineSegments( circuitGeometry, circuitMaterial );
circuits.renderOrder = 2;
scene.add( circuits );

const junctionGeometry = new THREE.BufferGeometry();
const junctionMaterial = new THREE.PointsMaterial( {
    color: 0xe0bd68,
    size: 0.035,
    sizeAttenuation: true,
    transparent: true,
    opacity: parameters.intensity * 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false
} );
const junctions = new THREE.Points( junctionGeometry, junctionMaterial );
junctions.renderOrder = 2;
scene.add( junctions );

const maximumSignals = 140;
const signalTrailSegments = 6;
const signalVertexCount = maximumSignals * signalTrailSegments * 2;
const signalPositions = new Float32Array( signalVertexCount * 3 );
const signalColors = new Float32Array( signalVertexCount * 3 );
const signalGeometry = new THREE.BufferGeometry();
signalGeometry.setAttribute( 'position', new THREE.BufferAttribute( signalPositions, 3 ).setUsage( THREE.DynamicDrawUsage ) );
signalGeometry.setAttribute( 'color', new THREE.BufferAttribute( signalColors, 3 ).setUsage( THREE.DynamicDrawUsage ) );
const signalMaterial = new THREE.LineBasicMaterial( {
    color: 0xfff2bf,
    vertexColors: true,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false
} );
const signals = new THREE.LineSegments( signalGeometry, signalMaterial );
signals.renderOrder = 3;
scene.add( signals );

function projectedCoordinates( x, z, lift = 0.045 )
{
    x *= parameters.circuitryScale;
    z *= parameters.circuitryScale;
    const flatHeight = 0.055;
    const surfaceHeight = membraneHeight( x, z ) + lift;
    return new THREE.Vector3( x, THREE.MathUtils.lerp( flatHeight, surfaceHeight, parameters.surfaceBinding ), z );
}

function projectedPoint( node, lift )
{
    return projectedCoordinates( node.x, node.z, lift );
}

function addEdge( first, second, random, probability = 1, tier = 2, visibility = 1 )
{
    if ( first === second || random() > probability ) return;
    if ( network.edges.some( ( edge ) => ( edge.a === first && edge.b === second ) || ( edge.a === second && edge.b === first ) ) ) return;
    const edgeIndex = network.edges.length;
    network.edges.push( { a: first, b: second, tier, visibility } );
    network.adjacency[first].push( { node: second, edge: edgeIndex } );
    network.adjacency[second].push( { node: first, edge: edgeIndex } );
}

function angleDistanceForNetwork( first, second )
{
    return Math.abs( Math.atan2( Math.sin( first - second ), Math.cos( first - second ) ) );
}

function generateNetwork()
{
    network.nodes = [];
    network.edges = [];
    network.adjacency = [];
    network.routes = [];
    const random = seededGenerator( 0xa341316c ^ parameters.seed );
    const ringCount = Math.round( THREE.MathUtils.lerp( 8, 17, parameters.complexity ) );
    const rings = [];
    const networkPhase = random() * Math.PI * 2;

    for ( let ringIndex = 0; ringIndex < ringCount; ringIndex += 1 )
    {
        const radius = 0.8 + ringIndex * ( 15.5 / ( ringCount - 1 ) );
        const count = Math.round( THREE.MathUtils.lerp( 18, 52, parameters.complexity ) + ringIndex * 1.7 );
        const phase = networkPhase + ( random() - 0.5 ) * ( Math.PI * 2 / count );
        const ring = [];
        for ( let index = 0; index < count; index += 1 )
        {
            const angle = phase + index / count * Math.PI * 2 + ( random() - 0.5 ) * 0.045;
            const localRadius = radius + ( random() - 0.5 ) * ( 0.12 + ringIndex * 0.018 );
            ring.push( network.nodes.length );
            network.nodes.push( { x: Math.cos( angle ) * localRadius, z: Math.sin( angle ) * localRadius, angle, ring: ringIndex } );
            network.adjacency.push( [] );
        }
        rings.push( ring );
    }

    rings.forEach( ( ring, ringIndex ) => {
        ring.forEach( ( nodeIndex, index ) => {
            const node = network.nodes[nodeIndex];
            const districtField = Math.sin( node.angle * 2.7 + parameters.seed * 1.3 )
                + 0.55 * Math.sin( node.angle * 7.1 - ringIndex * 0.8 );
            const districtVisibility = THREE.MathUtils.clamp( 0.18 + districtField * 0.28 + parameters.complexity * 0.38, 0.04, 1 );
            const gapChance = THREE.MathUtils.lerp( 0.4, 0.12, parameters.complexity );
            const tier = index % 11 === 0 ? 1 : 2;
            addEdge( nodeIndex, ring[( index + 1 ) % ring.length], random, 1 - gapChance, tier, districtVisibility );
            if ( ringIndex > 0 )
            {
                const inner = rings[ringIndex - 1];
                const mapped = Math.round( index / ring.length * inner.length ) % inner.length;
                if ( index % 5 === ringIndex % 5 )
                {
                    addEdge( nodeIndex, inner[mapped], random, 0.22 + parameters.complexity * 0.32, 1, districtVisibility * 0.8 );
                }
            }
            if ( index % 9 === 0 ) addEdge( nodeIndex, ring[( index + 2 + Math.floor( random() * 3 ) ) % ring.length], random, parameters.complexity * 0.24, 2, districtVisibility * 0.55 );
        } );
    } );

    const trunkCount = Math.round( THREE.MathUtils.lerp( 6, 13, parameters.complexity ) );
    for ( let trunkIndex = 0; trunkIndex < trunkCount; trunkIndex += 1 )
    {
        const trunkAngle = networkPhase + trunkIndex / trunkCount * Math.PI * 2 + THREE.MathUtils.lerp( -0.18, 0.18, random() );
        let previousNode = null;
        rings.forEach( ( ring, ringIndex ) => {
            const nearest = ring.reduce( ( selected, nodeIndex ) => (
                angleDistanceForNetwork( network.nodes[nodeIndex].angle, trunkAngle )
                    < angleDistanceForNetwork( network.nodes[selected].angle, trunkAngle ) ? nodeIndex : selected
            ), ring[0] );
            if ( previousNode !== null )
            {
                const fade = 0.58 + 0.42 * Math.sin( trunkIndex * 2.1 + ringIndex * 0.63 ) ** 2;
                addEdge( previousNode, nearest, random, 0.9, 0, fade );
            }
            previousNode = nearest;
        } );
    }

    network.edges.forEach( ( edge ) => {
        const a = network.nodes[edge.a];
        const b = network.nodes[edge.b];
        edge.length = Math.hypot( b.x - a.x, b.z - a.z );
    } );
    rebuildRoutes( random );
    updateNetworkGeometry();
    resetSignals();
    document.querySelector( '#node-count' ).textContent = network.nodes.length.toString();
    document.querySelector( '#edge-count' ).textContent = network.edges.length.toString();
    document.querySelector( '#seed-value' ).value = parameters.seed.toString();
}

function rebuildRoutes( random )
{
    for ( let routeIndex = 0; routeIndex < maximumSignals; routeIndex += 1 )
    {
        let current = Math.floor( random() * network.nodes.length );
        let previous = -1;
        const nodes = [ current ];
        const targetSteps = 4 + Math.floor( random() * 13 );
        for ( let step = 0; step < targetSteps; step += 1 )
        {
            const choices = network.adjacency[current].filter( ( entry ) => entry.node !== previous );
            if ( choices.length === 0 ) break;
            const choice = choices[Math.floor( random() * choices.length )];
            previous = current;
            current = choice.node;
            nodes.push( current );
        }
        const cumulative = [ 0 ];
        for ( let index = 1; index < nodes.length; index += 1 )
        {
            const a = network.nodes[nodes[index - 1]];
            const b = network.nodes[nodes[index]];
            cumulative.push( cumulative[index - 1] + Math.hypot( b.x - a.x, b.z - a.z ) );
        }
        network.routes.push( { nodes, cumulative, length: cumulative[cumulative.length - 1] || 1 } );
    }
}

function updateNetworkGeometry()
{
    const linePositions = [];
    const lineColors = [];
    const groovePositions = [];
    const grooveColors = [];
    const emberPositions = [];
    const emberColors = [];
    network.edges.forEach( ( edge, edgeIndex ) => {
        const firstNode = network.nodes[edge.a];
        const secondNode = network.nodes[edge.b];
        const dx = secondNode.x - firstNode.x;
        const dz = secondNode.z - firstNode.z;
        const length = Math.max( Math.hypot( dx, dz ), 0.0001 );
        const perpendicularX = -dz / length;
        const perpendicularZ = dx / length;
        const subdivisions = 3;
        const roughPoints = [];

        for ( let pointIndex = 0; pointIndex <= subdivisions; pointIndex += 1 )
        {
            const amount = pointIndex / subdivisions;
            const interior = Math.sin( amount * Math.PI );
            const roughness = Math.sin( edgeIndex * 12.9898 + pointIndex * 78.233 + parameters.seed * 4.17 ) * 0.035 * interior;
            roughPoints.push( {
                x: THREE.MathUtils.lerp( firstNode.x, secondNode.x, amount ) + perpendicularX * roughness,
                z: THREE.MathUtils.lerp( firstNode.z, secondNode.z, amount ) + perpendicularZ * roughness
            } );
        }

        for ( let segment = 0; segment < subdivisions; segment += 1 )
        {
            const start = roughPoints[segment];
            const end = roughPoints[segment + 1];
            const segmentDx = end.x - start.x;
            const segmentDz = end.z - start.z;
            const segmentLength = Math.max( Math.hypot( segmentDx, segmentDz ), 0.0001 );
            const normalX = -segmentDz / segmentLength;
            const normalZ = segmentDx / segmentLength;
            const tierWidth = [ 0.17, 0.105, 0.052 ][edge.tier];
            const widthStart = tierWidth * ( 0.72 + ( Math.sin( edgeIndex * 3.31 + segment * 5.7 ) * 0.5 + 0.5 ) * 0.56 );
            const widthEnd = tierWidth * ( 0.72 + ( Math.sin( edgeIndex * 5.19 + segment * 2.9 ) * 0.5 + 0.5 ) * 0.56 );
            const traceStart = projectedCoordinates( start.x, start.z );
            const traceEnd = projectedCoordinates( end.x, end.z );
            linePositions.push( traceStart.x, traceStart.y, traceStart.z, traceEnd.x, traceEnd.y, traceEnd.z );
            const tierStrength = [ 1, 0.58, 0.24 ][edge.tier] * edge.visibility;
            for ( let vertex = 0; vertex < 2; vertex += 1 ) lineColors.push( 0.78 * tierStrength, 0.54 * tierStrength, 0.2 * tierStrength );

            const leftStart = projectedCoordinates( start.x + normalX * widthStart, start.z + normalZ * widthStart, 0.026 );
            const rightStart = projectedCoordinates( start.x - normalX * widthStart, start.z - normalZ * widthStart, 0.026 );
            const leftEnd = projectedCoordinates( end.x + normalX * widthEnd, end.z + normalZ * widthEnd, 0.026 );
            const rightEnd = projectedCoordinates( end.x - normalX * widthEnd, end.z - normalZ * widthEnd, 0.026 );
            groovePositions.push(
                leftStart.x, leftStart.y, leftStart.z,
                rightStart.x, rightStart.y, rightStart.z,
                leftEnd.x, leftEnd.y, leftEnd.z,
                rightStart.x, rightStart.y, rightStart.z,
                rightEnd.x, rightEnd.y, rightEnd.z,
                leftEnd.x, leftEnd.y, leftEnd.z
            );
            const grooveStrength = ( 0.42 + edge.tier * 0.12 ) * edge.visibility;
            for ( let vertex = 0; vertex < 6; vertex += 1 ) grooveColors.push( 0.055 * grooveStrength, 0.038 * grooveStrength, 0.018 * grooveStrength );

            const emberWidthStart = widthStart * ( 0.46 + 0.08 * Math.sin( edgeIndex * 1.7 + segment ) );
            const emberWidthEnd = widthEnd * ( 0.46 + 0.08 * Math.sin( edgeIndex * 2.3 + segment + 1.4 ) );
            const emberLeftStart = projectedCoordinates( start.x + normalX * emberWidthStart, start.z + normalZ * emberWidthStart, 0.04 );
            const emberRightStart = projectedCoordinates( start.x - normalX * emberWidthStart, start.z - normalZ * emberWidthStart, 0.04 );
            const emberLeftEnd = projectedCoordinates( end.x + normalX * emberWidthEnd, end.z + normalZ * emberWidthEnd, 0.04 );
            const emberRightEnd = projectedCoordinates( end.x - normalX * emberWidthEnd, end.z - normalZ * emberWidthEnd, 0.04 );
            emberPositions.push(
                emberLeftStart.x, emberLeftStart.y, emberLeftStart.z,
                emberRightStart.x, emberRightStart.y, emberRightStart.z,
                emberLeftEnd.x, emberLeftEnd.y, emberLeftEnd.z,
                emberRightStart.x, emberRightStart.y, emberRightStart.z,
                emberRightEnd.x, emberRightEnd.y, emberRightEnd.z,
                emberLeftEnd.x, emberLeftEnd.y, emberLeftEnd.z
            );
            const tierEmber = [ 1, 0.64, 0.3 ][edge.tier] * edge.visibility;
            const startHeat = tierEmber * ( 0.68 + 0.28 * ( Math.sin( edgeIndex * 4.7 + segment * 2.1 ) * 0.5 + 0.5 ) );
            const endHeat = tierEmber * ( 0.68 + 0.28 * ( Math.sin( edgeIndex * 3.9 + segment * 2.8 + 1.2 ) * 0.5 + 0.5 ) );
            const pushEmberColor = ( heat ) => emberColors.push( 1.0 * heat, 0.27 * heat, 0.025 * heat );
            pushEmberColor( startHeat ); pushEmberColor( startHeat ); pushEmberColor( endHeat );
            pushEmberColor( startHeat ); pushEmberColor( endHeat ); pushEmberColor( endHeat );
        }
    } );
    circuitGeometry.setAttribute( 'position', new THREE.Float32BufferAttribute( linePositions, 3 ) );
    circuitGeometry.setAttribute( 'color', new THREE.Float32BufferAttribute( lineColors, 3 ) );
    grooveGeometry.setAttribute( 'position', new THREE.Float32BufferAttribute( groovePositions, 3 ) );
    grooveGeometry.setAttribute( 'color', new THREE.Float32BufferAttribute( grooveColors, 3 ) );
    emberGeometry.setAttribute( 'position', new THREE.Float32BufferAttribute( emberPositions, 3 ) );
    emberGeometry.setAttribute( 'color', new THREE.Float32BufferAttribute( emberColors, 3 ) );

    const junctionPositions = [];
    network.nodes.forEach( ( node, index ) => {
        if ( network.adjacency[index].length < 3 ) return;
        const point = projectedPoint( node );
        junctionPositions.push( point.x, point.y + 0.008, point.z );
    } );
    junctionGeometry.setAttribute( 'position', new THREE.Float32BufferAttribute( junctionPositions, 3 ) );
}

const signalState = Array.from( { length: maximumSignals }, ( _, index ) => ( {
    routeIndex: index,
    distance: 0,
    speedFactor: 1,
    delay: 0
} ) );

function resetSignals()
{
    const random = seededGenerator( 0xc8013ea4 ^ parameters.seed );
    signalState.forEach( ( signal, index ) => {
        signal.routeIndex = index;
        signal.distance = random() * network.routes[index].length;
        signal.speedFactor = THREE.MathUtils.lerp( 0.65, 1.45, random() );
        signal.delay = random() < 0.18 ? random() * 4 : 0;
    } );
}

function pointOnRoute( route, distance )
{
    let segment = 0;
    while ( segment < route.cumulative.length - 2 && route.cumulative[segment + 1] < distance ) segment += 1;
    const startDistance = route.cumulative[segment];
    const endDistance = route.cumulative[segment + 1] ?? route.length;
    const amount = ( distance - startDistance ) / Math.max( endDistance - startDistance, 0.0001 );
    const first = projectedPoint( network.nodes[route.nodes[segment]] );
    const second = projectedPoint( network.nodes[route.nodes[segment + 1] ?? route.nodes[segment]] );
    return first.lerp( second, amount );
}

function updateSignals( timeStep )
{
    const count = parameters.signalDensity;
    for ( let index = 0; index < count; index += 1 )
    {
        const signal = signalState[index];
        const route = network.routes[signal.routeIndex];
        if ( signal.delay > 0 )
        {
            signal.delay -= timeStep;
            for ( let vertex = 0; vertex < signalTrailSegments * 2; vertex += 1 )
            {
                signalPositions[( index * signalTrailSegments * 2 + vertex ) * 3 + 1] = -100;
            }
            continue;
        }
        signal.distance = ( signal.distance + parameters.signalSpeed * signal.speedFactor * timeStep ) % route.length;
        const trailLength = 0.48 + parameters.signalSpeed * 0.045;
        for ( let trail = 0; trail < signalTrailSegments; trail += 1 )
        {
            const headDistance = signal.distance - trail / signalTrailSegments * trailLength;
            const tailDistance = signal.distance - ( trail + 1 ) / signalTrailSegments * trailLength;
            const baseVertex = ( index * signalTrailSegments + trail ) * 2;
            const brightness = 1 - trail / signalTrailSegments;

            if ( tailDistance < 0 )
            {
                signalPositions[baseVertex * 3 + 1] = -100;
                signalPositions[( baseVertex + 1 ) * 3 + 1] = -100;
                continue;
            }

            const head = pointOnRoute( route, Math.min( headDistance, route.length ) );
            const tail = pointOnRoute( route, tailDistance );
            head.y += 0.045;
            tail.y += 0.045;
            signalPositions.set( [ head.x, head.y, head.z, tail.x, tail.y, tail.z ], baseVertex * 3 );
            const green = 0.88 + brightness * 0.12;
            const blue = 0.48 + brightness * 0.52;
            const tailStrength = Math.max( brightness - 0.14, 0.08 );
            signalColors.set( [ 1, green, blue, tailStrength, green * tailStrength, blue * tailStrength ], baseVertex * 3 );
        }
    }
    signalGeometry.attributes.position.needsUpdate = true;
    signalGeometry.attributes.color.needsUpdate = true;
    signalGeometry.setDrawRange( 0, count * signalTrailSegments * 2 );
    signalMaterial.opacity = Math.min( parameters.signalBrightness * ( 0.78 + Math.sin( performance.now() * 0.024 ) * 0.12 ), 1 );
    document.querySelector( '#pulse-count' ).textContent = count.toString();
}

function updateSurface()
{
    deformMembrane( membraneGeometry );
    deformMembrane( diagnosticGeometry );
    receiver.position.y = membraneHeight( 0, 0 ) + 0.04;
    updateNetworkGeometry();
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
connectSlider( 'intensity', 'intensity-value', ( value ) => {
    parameters.intensity = value;
    circuitMaterial.opacity = value;
    emberMaterial.opacity = value;
    junctionMaterial.opacity = Math.min( value * 0.8, 1 );
} );
connectSlider( 'complexity', 'complexity-value', ( value ) => { parameters.complexity = value; generateNetwork(); } );
connectSlider( 'scale', 'scale-value', ( value ) => { parameters.circuitryScale = value; updateNetworkGeometry(); } );
connectSlider( 'surface-binding', 'surface-binding-value', ( value ) => { parameters.surfaceBinding = value; updateNetworkGeometry(); } );
connectSlider( 'signal-density', 'signal-density-value', ( value ) => { parameters.signalDensity = value; }, 0 );
connectSlider( 'signal-speed', 'signal-speed-value', ( value ) => { parameters.signalSpeed = value; } );
connectSlider( 'signal-brightness', 'signal-brightness-value', ( value ) => { parameters.signalBrightness = value; } );

document.querySelector( '#diagnostic' ).addEventListener( 'change', ( event ) => { diagnostic.visible = event.currentTarget.checked; } );
document.querySelector( '#reset' ).addEventListener( 'click', resetSignals );
document.querySelector( '#reseed' ).addEventListener( 'click', () => { parameters.seed += 1; generateNetwork(); } );

const cameraViews = {
    monumental: { position: new THREE.Vector3( 7.5, 4.5, 14 ), target: new THREE.Vector3( 0, -1.6, 0 ) },
    elevated: { position: new THREE.Vector3( 10.5, 10, 12.5 ), target: new THREE.Vector3( 0, -1.65, 0 ) }
};
function setCameraView( name )
{
    camera.position.copy( cameraViews[name].position );
    orbitControls.target.copy( cameraViews[name].target );
    orbitControls.update();
}
document.querySelectorAll( '[data-view]' ).forEach( ( button ) => button.addEventListener( 'click', () => setCameraView( button.dataset.view ) ) );

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

let previousTime = 0;
function animate( time )
{
    const timeStep = previousTime === 0 ? 0 : Math.min( ( time - previousTime ) / 1000, 0.05 );
    previousTime = time;
    emberMaterial.opacity = parameters.intensity * ( 0.84 + Math.sin( time * 0.0017 ) * 0.08 + Math.sin( time * 0.0043 ) * 0.04 );
    updateSignals( timeStep );
    orbitControls.update();
    renderer.render( scene, camera );
}

generateNetwork();
updateSurface();
setCameraView( 'elevated' );
resize();
renderer.setAnimationLoop( animate );

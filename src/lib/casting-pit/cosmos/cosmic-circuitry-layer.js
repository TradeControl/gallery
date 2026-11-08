import * as THREE from 'three';
import { informationPalette } from '../../information-palette.js';
import { bindRangeControl } from '../controls.js';
import { seededGenerator } from '../random.js';

export const cosmicCircuitryDefaults = {
    depth: 7.1,
    width: 3.7,
    intensity: 0.2,
    arterialConnectivity: 1,
    districtDensity: 0.6,
    intricacy: 7,
    districtFootprint: 1.87,
    territoryX: 0,
    territoryZ: 4,
    surfaceBinding: 1,
    signalDensity: 136,
    signalSpeed: 3.75,
    signalBrightness: 0.25,
    seed: 2
};

export function createCosmicCircuitryLayer( {
    world,
    membrane,
    parameters,
    root = document,
    includeEnvironment = true,
    bindEnvironmentControls = true,
    controlPrefix = '',
    manifestationLiftScale = 1
} )
{
const { scene, renderer } = world;
const ownerDocument = root.ownerDocument ?? root;
const controlId = ( id ) => `${controlPrefix}${id}`;
const control = ( id ) => root.querySelector( `#${controlId( id )}` );
const membraneHeight = membrane.height;
const createMembraneGeometry = membrane.createGeometry;
const deformMembrane = membrane.deform;

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
const membraneSurface = new THREE.Mesh( membraneGeometry, membraneMaterial );
if ( includeEnvironment ) scene.add( membraneSurface );

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
if ( includeEnvironment ) scene.add( diagnostic );

const hemisphereLight = new THREE.HemisphereLight( 0x697580, 0x100d09, 0.8 );
if ( includeEnvironment ) scene.add( hemisphereLight );
const keyLight = new THREE.DirectionalLight( 0xffd5a2, 3.2 );
keyLight.position.set( -5, 9, 6 );
if ( includeEnvironment ) scene.add( keyLight );
const rimLight = new THREE.DirectionalLight( 0x506477, 1.1 );
rimLight.position.set( 7, 3, -6 );
if ( includeEnvironment ) scene.add( rimLight );

const receiver = new THREE.Mesh(
    new THREE.CircleGeometry( 0.34, 48 ).rotateX( -Math.PI / 2 ),
    new THREE.MeshBasicMaterial( { color: 0x010202, side: THREE.DoubleSide } )
);
if ( includeEnvironment ) scene.add( receiver );

const network = { nodes: [], edges: [], adjacency: [], routes: [] };
const networkGold = new THREE.Color( informationPalette.networkGold );
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
    color: informationPalette.networkGold,
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
    color: informationPalette.transientSignalTrail,
    vertexColors: true,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false
} );
const signals = new THREE.LineSegments( signalGeometry, signalMaterial );
signals.renderOrder = 3;
scene.add( signals );

const signalHeadPositions = new Float32Array( maximumSignals * 3 );
const signalHeadGeometry = new THREE.BufferGeometry();
signalHeadGeometry.setAttribute( 'position', new THREE.BufferAttribute( signalHeadPositions, 3 ).setUsage( THREE.DynamicDrawUsage ) );

function createDropletTexture()
{
    const canvas = ownerDocument.createElement( 'canvas' );
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext( '2d' );
    const gradient = context.createRadialGradient( 32, 32, 0, 32, 32, 31 );
    gradient.addColorStop( 0, 'rgba(255, 255, 255, 1)' );
    gradient.addColorStop( 0.18, 'rgba(255, 247, 202, 1)' );
    gradient.addColorStop( 0.46, 'rgba(255, 184, 55, 0.72)' );
    gradient.addColorStop( 1, 'rgba(255, 105, 0, 0)' );
    context.fillStyle = gradient;
    context.fillRect( 0, 0, 64, 64 );
    const texture = new THREE.CanvasTexture( canvas );
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

const dropletTexture = createDropletTexture();
const signalHaloMaterial = new THREE.PointsMaterial( {
    color: informationPalette.transientSignalHalo,
    map: dropletTexture,
    size: 0.52,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false
} );
const signalCoreMaterial = new THREE.PointsMaterial( {
    color: informationPalette.transientSignalCore,
    map: dropletTexture,
    size: 0.23,
    sizeAttenuation: true,
    transparent: true,
    opacity: 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false
} );
const signalHalos = new THREE.Points( signalHeadGeometry, signalHaloMaterial );
const signalCores = new THREE.Points( signalHeadGeometry, signalCoreMaterial );
signalHalos.renderOrder = 3;
signalCores.renderOrder = 4;
scene.add( signalHalos, signalCores );

function projectedCoordinates( x, z, lift = 0.045 )
{
    x += parameters.territoryX;
    z += parameters.territoryZ;
    const flatHeight = 0.055 * manifestationLiftScale;
    const surfaceHeight = membraneHeight( x, z ) + lift * manifestationLiftScale;
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

function generateNetwork()
{
    network.nodes = [];
    network.edges = [];
    network.adjacency = [];
    network.routes = [];
    const random = seededGenerator( 0xa341316c ^ parameters.seed );
    const logicalExtent = 17;
    const districtNodes = [];
    const hubConnections = new Set();

    const addNode = ( x, z, role ) => {
        const index = network.nodes.length;
        network.nodes.push( { x, z, role } );
        network.adjacency.push( [] );
        return index;
    };

    const connectConduit = ( firstIndex, secondIndex, tier, visibility, bendAmount = 0.16, conduitRandom = random ) => {
        const first = network.nodes[firstIndex];
        const second = network.nodes[secondIndex];
        const dx = second.x - first.x;
        const dz = second.z - first.z;
        const length = Math.max( Math.hypot( dx, dz ), 0.001 );
        const normalX = -dz / length;
        const normalZ = dx / length;
        const segments = Math.max( 2, Math.ceil( length / ( tier === 0 ? 2.4 : 1.35 ) ) );
        const bend = ( conduitRandom() - 0.5 ) * length * bendAmount;
        let previous = firstIndex;
        for ( let segment = 1; segment < segments; segment += 1 )
        {
            const amount = segment / segments;
            const envelope = Math.sin( amount * Math.PI );
            const localBend = bend * envelope + ( conduitRandom() - 0.5 ) * ( tier === 0 ? 0.18 : 0.11 );
            const node = addNode(
                THREE.MathUtils.lerp( first.x, second.x, amount ) + normalX * localBend,
                THREE.MathUtils.lerp( first.z, second.z, amount ) + normalZ * localBend,
                tier === 0 ? 'artery' : 'distribution'
            );
            addEdge( previous, node, conduitRandom, 1, tier, visibility );
            previous = node;
        }
        addEdge( previous, secondIndex, conduitRandom, 1, tier, visibility );
    };

    const hubConnectionKey = ( first, second ) => first < second ? `${first}:${second}` : `${second}:${first}`;
    const connectHubs = ( first, second, visibility, bendAmount = 0.16, conduitRandom = random ) => {
        hubConnections.add( hubConnectionKey( first, second ) );
        connectConduit( first, second, 0, visibility, bendAmount, conduitRandom );
    };

    const hubCount = Math.round( THREE.MathUtils.lerp( 8, 25, parameters.districtDensity ) );
    const hubs = [];
    const districtExtent = 14;
    const gridSize = 5;
    const cellSize = districtExtent * 2 / gridSize;
    const candidates = [];
    for ( let row = 0; row < gridSize; row += 1 )
    {
        for ( let column = 0; column < gridSize; column += 1 )
        {
            candidates.push( {
                x: -districtExtent + ( column + 0.5 ) * cellSize + ( random() - 0.5 ) * cellSize * 0.58,
                z: -districtExtent + ( row + 0.5 ) * cellSize + ( random() - 0.5 ) * cellSize * 0.58,
                priority: random()
            } );
        }
    }

    const selectedCandidates = [ candidates.splice( Math.floor( random() * candidates.length ), 1 )[0] ];
    while ( selectedCandidates.length < hubCount )
    {
        let selectedIndex = 0;
        let selectedScore = -Infinity;
        candidates.forEach( ( candidate, index ) => {
            const separation = Math.min( ...selectedCandidates.map( ( selected ) => Math.hypot( candidate.x - selected.x, candidate.z - selected.z ) ) );
            const score = separation + candidate.priority * cellSize * 0.24;
            if ( score > selectedScore )
            {
                selectedScore = score;
                selectedIndex = index;
            }
        } );
        selectedCandidates.push( candidates.splice( selectedIndex, 1 )[0] );
    }
    selectedCandidates.forEach( ( candidate ) => hubs.push( addNode( candidate.x, candidate.z, 'district' ) ) );

    // A minimum spanning structure guarantees one coherent metropolitan system.
    const connected = new Set( [ hubs[0] ] );
    while ( connected.size < hubs.length )
    {
        let best = null;
        connected.forEach( ( firstIndex ) => {
            hubs.forEach( ( secondIndex ) => {
                if ( connected.has( secondIndex ) ) return;
                const first = network.nodes[firstIndex];
                const second = network.nodes[secondIndex];
                const distance = Math.hypot( second.x - first.x, second.z - first.z );
                if ( best === null || distance < best.distance ) best = { firstIndex, secondIndex, distance };
            } );
        } );
        connectHubs( best.firstIndex, best.secondIndex, THREE.MathUtils.lerp( 0.72, 1, random() ) );
        connected.add( best.secondIndex );
    }

    // Cross-links and off-screen continuations make the view a sample, not a bounded diagram.
    const arterialRandom = seededGenerator( 0x6c8e9cf5 ^ parameters.seed );
    const arterialLinks = Math.round( THREE.MathUtils.lerp( 2, 14, parameters.arterialConnectivity ) );
    for ( let link = 0; link < arterialLinks; link += 1 )
    {
        const first = hubs[Math.floor( arterialRandom() * hubs.length )];
        const firstNode = network.nodes[first];
        const candidates = hubs
            .filter( ( second ) => second !== first && !hubConnections.has( hubConnectionKey( first, second ) ) )
            .sort( ( a, b ) => Math.hypot( network.nodes[a].x - firstNode.x, network.nodes[a].z - firstNode.z ) - Math.hypot( network.nodes[b].x - firstNode.x, network.nodes[b].z - firstNode.z ) );
        if ( candidates.length === 0 ) continue;
        const second = candidates[Math.floor( arterialRandom() * Math.min( 3, candidates.length ) )];
        connectHubs( first, second, THREE.MathUtils.lerp( 0.58, 0.92, arterialRandom() ), 0.2, arterialRandom );
    }

    const boundaryRandom = seededGenerator( 0xb5297a4d ^ parameters.seed );
    const boundaryCount = Math.round( THREE.MathUtils.lerp( 4, 12, parameters.arterialConnectivity ) );
    for ( let boundaryIndex = 0; boundaryIndex < boundaryCount; boundaryIndex += 1 )
    {
        const side = Math.floor( boundaryRandom() * 4 );
        const along = THREE.MathUtils.lerp( -logicalExtent, logicalExtent, boundaryRandom() );
        const x = side < 2 ? ( side === 0 ? -logicalExtent : logicalExtent ) : along;
        const z = side >= 2 ? ( side === 2 ? -logicalExtent : logicalExtent ) : along;
        const boundary = addNode( x, z, 'continuation' );
        const nearest = hubs.reduce( ( selected, hubIndex ) => {
            const hub = network.nodes[hubIndex];
            const chosen = network.nodes[selected];
            return Math.hypot( hub.x - x, hub.z - z ) < Math.hypot( chosen.x - x, chosen.z - z ) ? hubIndex : selected;
        }, hubs[0] );
        connectConduit( boundary, nearest, 0, THREE.MathUtils.lerp( 0.62, 0.94, boundaryRandom() ), 0.2, boundaryRandom );
    }

    const growBranch = ( districtIndex, parentIndex, heading, length, depth, visibility, districtRandom ) => {
        const parent = network.nodes[parentIndex];
        const end = addNode(
            parent.x + Math.cos( heading ) * length,
            parent.z + Math.sin( heading ) * length,
            depth > 1 ? 'distribution' : 'local'
        );
        districtNodes[districtIndex].push( end );
        addEdge( parentIndex, end, districtRandom, 1, depth > 1 ? 1 : 2, visibility );
        if ( depth <= 0 ) return;
        const childCount = districtRandom() < 0.56 ? 2 : 1;
        for ( let child = 0; child < childCount; child += 1 )
        {
            const lateralDirection = districtRandom() < 0.5 ? -1 : 1;
            const spread = childCount === 1
                ? ( districtRandom() - 0.5 ) * 0.18
                : child === 0
                    ? ( districtRandom() - 0.5 ) * 0.12
                    : lateralDirection * THREE.MathUtils.lerp( 1.22, 1.5, districtRandom() );
            growBranch( districtIndex, end, heading + spread, length * THREE.MathUtils.lerp( 0.52, 0.72, districtRandom() ), depth - 1, visibility * THREE.MathUtils.lerp( 0.78, 0.96, districtRandom() ), districtRandom );
        }
    };

    const districtDescriptors = [];
    hubs.forEach( ( hub, districtIndex ) => {
        const districtRandom = seededGenerator( 0x1b56c4e9 ^ parameters.seed ^ Math.imul( districtIndex + 1, 0x9e3779b1 ) );
        districtNodes[districtIndex] = [ hub ];
        const districtActivity = THREE.MathUtils.lerp( 0.3, 1, districtRandom() ** 0.7 );
        const branchCount = Math.round( THREE.MathUtils.lerp( 3, 4, districtActivity ) );
        const districtPhase = districtRandom() * Math.PI * 2;
        districtDescriptors.push( { districtActivity, districtPhase } );
        for ( let branch = 0; branch < branchCount; branch += 1 )
        {
            const heading = districtPhase
                + ( branch === 0 ? 0 : branch === 1 ? Math.PI : ( branch === 2 ? Math.PI * 0.5 : -Math.PI * 0.5 ) )
                + ( districtRandom() - 0.5 ) * 0.14;
            const length = THREE.MathUtils.lerp( 1.45, 3.35, districtRandom() ) * ( 0.72 + districtActivity * 0.48 ) * parameters.districtFootprint;
            growBranch( districtIndex, hub, heading, length, parameters.intricacy - 1, THREE.MathUtils.lerp( 0.5, 1, districtActivity ), districtRandom );
        }
    } );

    districtNodes.forEach( ( locals, districtIndex ) => {
        const closureRandom = seededGenerator( 0x94d049bb ^ parameters.seed ^ Math.imul( districtIndex + 1, 0x85ebca6b ) );
        const { districtActivity, districtPhase } = districtDescriptors[districtIndex];
        const loopAttempts = Math.round( locals.length * 0.7 );
        for ( let attempt = 0; attempt < loopAttempts; attempt += 1 )
        {
            const first = locals[Math.floor( closureRandom() * locals.length )];
            const firstNode = network.nodes[first];
            const candidates = locals.filter( ( index ) => {
                if ( index === first ) return false;
                const dx = network.nodes[index].x - firstNode.x;
                const dz = network.nodes[index].z - firstNode.z;
                const localAngle = Math.atan2( dz, dx ) - districtPhase;
                const axisDeviation = Math.min( Math.abs( Math.sin( localAngle ) ), Math.abs( Math.cos( localAngle ) ) );
                return Math.hypot( dx, dz ) < 2.35 * parameters.districtFootprint && axisDeviation < 0.2;
            } );
            if ( candidates.length > 0 ) addEdge( first, candidates[Math.floor( closureRandom() * candidates.length )], closureRandom, 0.74, 2, districtActivity * 0.78 );
        }
    } );

    network.edges.forEach( ( edge ) => {
        const a = network.nodes[edge.a];
        const b = network.nodes[edge.b];
        edge.length = Math.hypot( b.x - a.x, b.z - a.z );
    } );
    rebuildRoutes( seededGenerator( 0xd1b54a35 ^ parameters.seed ) );
    updateNetworkGeometry();
    resetSignals();
    control( 'node-count' ).textContent = network.nodes.length.toString();
    control( 'edge-count' ).textContent = network.edges.length.toString();
    control( 'seed-value' ).value = parameters.seed.toString();
}

function rebuildRoutes( random )
{
    for ( let routeIndex = 0; routeIndex < maximumSignals; routeIndex += 1 )
    {
        let current = Math.floor( random() * network.nodes.length );
        let previous = -1;
        const nodes = [ current ];
        const edges = [];
        const targetSteps = 7 + Math.floor( random() * 18 );
        for ( let step = 0; step < targetSteps; step += 1 )
        {
            const choices = network.adjacency[current].filter( ( entry ) => entry.node !== previous );
            if ( choices.length === 0 ) break;
            const choice = choices[Math.floor( random() * choices.length )];
            previous = current;
            current = choice.node;
            nodes.push( current );
            edges.push( choice.edge );
        }
        const cumulative = [ 0 ];
        for ( let index = 1; index < nodes.length; index += 1 )
        {
            const a = network.nodes[nodes[index - 1]];
            const b = network.nodes[nodes[index]];
            cumulative.push( cumulative[index - 1] + Math.hypot( b.x - a.x, b.z - a.z ) );
        }
        network.routes.push( {
            nodes,
            edges,
            logicalCumulative: cumulative,
            logicalLength: cumulative[cumulative.length - 1] || 1,
            manifestedPoints: [],
            manifestedCumulative: [],
            manifestedLength: 1
        } );
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

        edge.manifestedPoints = roughPoints.map( ( point ) => projectedCoordinates( point.x, point.z ) );

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
            const tierStrength = [ 1, 0.68, 0.42 ][edge.tier] * edge.visibility;
            for ( let vertex = 0; vertex < 2; vertex += 1 )
            {
                lineColors.push(
                    networkGold.r * tierStrength,
                    networkGold.g * tierStrength,
                    networkGold.b * tierStrength
                );
            }

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
            const tierEmber = [ 1, 0.72, 0.5 ][edge.tier] * edge.visibility;
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
    updateManifestedRouteMetrics();
}

const signalState = Array.from( { length: maximumSignals }, ( _, index ) => ( {
    routeIndex: index,
    distance: 0,
    speedFactor: 1,
    delay: 0
} ) );

function updateManifestedRouteMetrics()
{
    const previousLengths = network.routes.map( ( route ) => route.manifestedLength || 0 );

    network.routes.forEach( ( route ) => {
        const points = [];
        route.edges.forEach( ( edgeIndex, routeEdgeIndex ) => {
            const edge = network.edges[edgeIndex];
            const forward = edge.a === route.nodes[routeEdgeIndex];
            const edgePoints = forward ? edge.manifestedPoints : [ ...edge.manifestedPoints ].reverse();
            points.push( ...( routeEdgeIndex === 0 ? edgePoints : edgePoints.slice( 1 ) ) );
        } );

        if ( points.length < 2 )
        {
            const fallback = projectedPoint( network.nodes[route.nodes[0]] );
            points.push( fallback, fallback.clone() );
        }

        const cumulative = [ 0 ];
        for ( let index = 1; index < points.length; index += 1 )
        {
            cumulative.push( cumulative[index - 1] + points[index - 1].distanceTo( points[index] ) );
        }
        route.manifestedPoints = points;
        route.manifestedCumulative = cumulative;
        route.manifestedLength = cumulative[cumulative.length - 1] || 1;
    } );

    signalState.forEach( ( signal ) => {
        const previousLength = previousLengths[signal.routeIndex];
        const route = network.routes[signal.routeIndex];
        if ( previousLength > 0 && route ) signal.distance = signal.distance / previousLength * route.manifestedLength;
    } );
}

function resetSignals()
{
    const random = seededGenerator( 0xc8013ea4 ^ parameters.seed );
    signalState.forEach( ( signal, index ) => {
        signal.routeIndex = index;
        signal.distance = random() * network.routes[index].manifestedLength;
        signal.speedFactor = 1;
        signal.delay = random() < 0.18 ? random() * 4 : 0;
    } );
}

function pointOnRoute( route, distance )
{
    let segment = 0;
    while ( segment < route.manifestedCumulative.length - 2 && route.manifestedCumulative[segment + 1] < distance ) segment += 1;
    const startDistance = route.manifestedCumulative[segment];
    const endDistance = route.manifestedCumulative[segment + 1] ?? route.manifestedLength;
    const amount = ( distance - startDistance ) / Math.max( endDistance - startDistance, 0.0001 );
    return route.manifestedPoints[segment].clone().lerp( route.manifestedPoints[segment + 1], amount );
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
            signalHeadPositions[index * 3 + 1] = -100;
            for ( let vertex = 0; vertex < signalTrailSegments * 2; vertex += 1 )
            {
                signalPositions[( index * signalTrailSegments * 2 + vertex ) * 3 + 1] = -100;
            }
            continue;
        }
        signal.distance = ( signal.distance + parameters.signalSpeed * signal.speedFactor * timeStep ) % route.manifestedLength;
        const droplet = pointOnRoute( route, signal.distance );
        droplet.y += 0.052 * manifestationLiftScale;
        signalHeadPositions.set( [ droplet.x, droplet.y, droplet.z ], index * 3 );
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

            const head = pointOnRoute( route, Math.min( headDistance, route.manifestedLength ) );
            const tail = pointOnRoute( route, tailDistance );
            head.y += 0.045 * manifestationLiftScale;
            tail.y += 0.045 * manifestationLiftScale;
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
    signalHeadGeometry.attributes.position.needsUpdate = true;
    signalHeadGeometry.setDrawRange( 0, count );
    const signalFlicker = 0.9 + Math.sin( performance.now() * 0.024 ) * 0.08;
    signalMaterial.opacity = Math.min( parameters.signalBrightness * 0.82 * signalFlicker, 1 );
    signalHaloMaterial.opacity = Math.min( parameters.signalBrightness * 0.7 * signalFlicker, 0.95 );
    signalCoreMaterial.opacity = Math.min( parameters.signalBrightness * signalFlicker, 1 );
    control( 'pulse-count' ).textContent = count.toString();
}

function updateSurface()
{
    deformMembrane( membraneGeometry );
    deformMembrane( diagnosticGeometry );
    receiver.position.y = membraneHeight( 0, 0 ) + 0.04;
    updateNetworkGeometry();
}

const connectSlider = ( inputId, outputId, onInput, decimals = 2 ) => bindRangeControl(
    root,
    controlId( inputId ),
    controlId( outputId ),
    onInput,
    decimals
);

if ( bindEnvironmentControls )
{
    connectSlider( 'depth', 'depth-value', ( value ) => { parameters.depth = value; updateSurface(); } );
    connectSlider( 'width', 'width-value', ( value ) => { parameters.width = value; updateSurface(); } );
    connectSlider( 'key-light', 'key-light-value', ( value ) => { keyLight.intensity = value; } );
    connectSlider( 'exposure', 'exposure-value', ( value ) => { renderer.toneMappingExposure = value; } );
    control( 'diagnostic' ).addEventListener( 'change', ( event ) => { diagnostic.visible = event.currentTarget.checked; } );
}
connectSlider( 'intensity', 'intensity-value', ( value ) => {
    parameters.intensity = value;
    circuitMaterial.opacity = value;
    emberMaterial.opacity = value;
    junctionMaterial.opacity = Math.min( value * 0.8, 1 );
} );
connectSlider( 'arterial-connectivity', 'arterial-connectivity-value', ( value ) => { parameters.arterialConnectivity = value; generateNetwork(); } );
connectSlider( 'district-density', 'district-density-value', ( value ) => { parameters.districtDensity = value; generateNetwork(); } );
connectSlider( 'intricacy', 'intricacy-value', ( value ) => { parameters.intricacy = value; generateNetwork(); }, 0 );
connectSlider( 'district-footprint', 'district-footprint-value', ( value ) => { parameters.districtFootprint = value; generateNetwork(); } );
connectSlider( 'territory-x', 'territory-x-value', ( value ) => { parameters.territoryX = value; updateNetworkGeometry(); } );
connectSlider( 'territory-z', 'territory-z-value', ( value ) => { parameters.territoryZ = value; updateNetworkGeometry(); } );
connectSlider( 'surface-binding', 'surface-binding-value', ( value ) => { parameters.surfaceBinding = value; updateNetworkGeometry(); } );
connectSlider( 'signal-density', 'signal-density-value', ( value ) => { parameters.signalDensity = value; }, 0 );
connectSlider( 'signal-speed', 'signal-speed-value', ( value ) => { parameters.signalSpeed = value; } );
connectSlider( 'signal-brightness', 'signal-brightness-value', ( value ) => { parameters.signalBrightness = value; } );

control( 'reset' ).addEventListener( 'click', resetSignals );
control( 'reseed' ).addEventListener( 'click', () => { parameters.seed += 1; generateNetwork(); } );

let previousTime = 0;
function animate( time )
{
    const timeStep = previousTime === 0 ? 0 : Math.min( ( time - previousTime ) / 1000, 0.05 );
    previousTime = time;
    emberMaterial.opacity = parameters.intensity * ( 0.84 + Math.sin( time * 0.0017 ) * 0.08 + Math.sin( time * 0.0043 ) * 0.04 );
    updateSignals( timeStep );
}

generateNetwork();
updateSurface();
world.addFrameCallback( animate );

return {
    parameters,
    network,
    environment: { membraneSurface, diagnostic, hemisphereLight, keyLight, rimLight, receiver },
    updateSurface,
    setVisible( visible ) {
        grooves.visible = visible;
        embers.visible = visible;
        circuits.visible = visible;
        junctions.visible = visible;
        signals.visible = visible;
        signalHalos.visible = visible;
        signalCores.visible = visible;
    },
    resetSignals,
    regenerate: generateNetwork
};
}

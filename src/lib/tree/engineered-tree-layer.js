import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createBranchCurve, createTaperedTubeGeometry, getConduitRadii } from './tree-layer.js';
import {
    createTrunkRuneGranuleGeometry,
    createTrunkRuneGeometry,
    createTrunkRuneMaterial,
    defaultTrunkRuneCandidateId,
    getTrunkRuneRouteDistances,
    setTrunkRuneGeometryTraversals,
    trunkRuneCandidateIds,
    trunkRuneSites,
    trunkRuneTransducerSite
} from './trunk-rune-layer.js';
import {
    createInternalRouterTreeDescriptor,
    createInternalRouterTreeGeometry,
    internalRouterTierRange
} from './internal-router-tree.js';
import {
    createInternalRouterJunctionLedger,
    internalRouterJunctionCandidateId,
    resolveInternalRouterJunctionBoundary
} from './internal-router-junction.js';
import {
    createInternalRouterJunctionFormGeometry,
    internalRouterJunctionFormCandidateId,
    internalRouterJunctionFormCircumferenceRange,
    internalRouterJunctionFormStyle,
    normaliseInternalRouterJunctionFormCircumference,
    setInternalRouterJunctionFormManifestations
} from './internal-router-junction-form.js';
import {
    createInternalRouterRouteEpoch,
    createInternalRouterTransport,
    internalRouterTransportCandidateId
} from './internal-router-transport.js';
import {
    createRootedMotionUniforms,
    registerRootedMotionMaterial,
    rootedMotionShaderApplication,
    rootedMotionShaderDeclarations
} from './rooted-motion.js';

const routedTerminalId = 'process-readiness-state';
const defaultInformationSpeed = 1.55;
const defaultInformationFrequency = 0.2;
export const informationPacketVisualProfile = Object.freeze( {
    coreRadius: 0.032,
    headWidth: 0.46,
    trailLength: 2.2,
    wakeAmplitude: 0.42,
    wakeDecay: 0.42,
    discardThreshold: 0.004,
    alpha: 0.95,
    sourceColour: Object.freeze( [ 0.02, 0.48, 1.45 ] ),
    outputColour: 0xfff2bf,
    outputIntensity: 1.35,
    internalTransmissionCompensation: 3.2,
    internalMaximumSegmentLength: 0.08
} );
const informationTrailLength = informationPacketVisualProfile.trailLength;
const informationCoreRadius = informationPacketVisualProfile.coreRadius;
const informationTrafficSamples = 64;
const trunkRuneAuditCapacity = 4096;
const internalRouterJunctionIngressDistance = 1.1;
const internalRouterJunctionTraceSamples = 17;
const internalRouterTransportInitialCapacity = 128;
export const internalRouterPresentationCandidateId =
    'c4d-d4-route-local-subsurface-trails-v2';
function normaliseInternalRouterTiers( value )
{
    const numeric = Number( value );
    const requested = Number.isFinite( numeric )
        ? Math.round( numeric )
        : internalRouterTierRange.default;
    return THREE.MathUtils.clamp(
        requested,
        internalRouterTierRange.min,
        internalRouterTierRange.max
    );
}

function canonicalEventNumber( value )
{
    // Audit timestamps retain 10 ns precision. Motion anchors below make the
    // underlying boundary calculation independent of render cadence; this
    // canonical form only removes insignificant arithmetic residue.
    return Number( Number( value ).toFixed( 8 ) );
}

export const trunkVisibilityModes = Object.freeze( [
    'off',
    'isolated',
    'aperture',
    'attenuation',
    'stencil'
] );

const trunkVisibilityRegion = Object.freeze( {
    parentId: 'exchange',
    childId: 'meaning',
    longitudinalCellOffset: 3,
    longitudinalCellCount: 3,
    angularCellCount: 2
} );

function createMaterial( colour, roughness, metalness )
{
    const material = new THREE.MeshPhysicalMaterial( {
        color: colour,
        roughness,
        metalness,
        clearcoat: 0.32,
        clearcoatRoughness: 0.4
    } );
    const uniforms = {
        ...createRootedMotionUniforms(),
        relief: { value: 0.1 },
    };
    material.onBeforeCompile = ( shader ) => {
        shader.uniforms.treeTime = uniforms.time;
        shader.uniforms.treeRelief = uniforms.relief;
        shader.uniforms.treeResponse = uniforms.response;
        shader.uniforms.treeGustMix = uniforms.gustMix;
        shader.uniforms.treeGustIntervalBase = uniforms.intervalBase;
        shader.vertexShader = `
            ${rootedMotionShaderDeclarations}
            uniform float treeRelief;
        ` + shader.vertexShader.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
            float brushed = sin( position.y * 23.0 + position.x * 7.0 + position.z * 5.0 );
            transformed += normalize( objectNormal ) * brushed * treeRelief * 0.004;
            ${rootedMotionShaderApplication( 'position' )}`
        );
        material.userData.shader = shader;
    };
    material.customProgramCacheKey = () =>
        `engineered-tree-rooted-motion-v4-${colour}`;
    registerRootedMotionMaterial( material, uniforms, 'structural-surface' );
    return { material, uniforms };
}

function createInformationCoreMaterial()
{
    const uniforms = {
        ...createRootedMotionUniforms(),
        trafficTexture: { value: null },
        sourceColour: {
            value: new THREE.Vector3().fromArray(
                informationPacketVisualProfile.sourceColour
            )
        },
        outputColour: {
            value: new THREE.Color(
                informationPacketVisualProfile.outputColour
            ).multiplyScalar(
                informationPacketVisualProfile.outputIntensity
            )
        }
    };
    const material = new THREE.ShaderMaterial( {
        uniforms: {
            treeTime: uniforms.time,
            treeResponse: uniforms.response,
            treeGustMix: uniforms.gustMix,
            treeGustIntervalBase: uniforms.intervalBase,
            trafficTexture: uniforms.trafficTexture,
            sourceColour: uniforms.sourceColour,
            outputColour: uniforms.outputColour
        },
        vertexShader: `
            ${rootedMotionShaderDeclarations}
            attribute vec2 trafficUv;
            varying vec2 routedTrafficUv;

            void main()
            {
                routedTrafficUv = trafficUv;
                vec3 transformed = position;
                ${rootedMotionShaderApplication( 'position' )}
                gl_Position = projectionMatrix * modelViewMatrix * vec4( transformed, 1.0 );
            }
        `,
        fragmentShader: `
            uniform sampler2D trafficTexture;
            uniform vec3 sourceColour;
            uniform vec3 outputColour;
            varying vec2 routedTrafficUv;

            void main()
            {
                vec2 routedSignals = texture2D(
                    trafficTexture,
                    routedTrafficUv
                ).rg;
                float routedSignal = max( routedSignals.r, routedSignals.g );
                if ( routedSignal < 0.004 ) discard;
                vec3 colour = sourceColour * routedSignals.r
                    + outputColour * routedSignals.g;
                gl_FragColor = vec4( colour, routedSignal * 0.95 );
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: true,
        depthFunc: THREE.GreaterDepth,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false
    } );
    registerRootedMotionMaterial( material, uniforms, 'routed-information' );
    return { material, uniforms };
}

function createInteriorSkeletonMaterial()
{
    const uniforms = {
        ...createRootedMotionUniforms(),
        relief: { value: 0 },
    };
    const material = new THREE.MeshPhysicalMaterial( {
        color: 0xc6cbc8,
        roughness: 0.78,
        metalness: 0.08,
        clearcoat: 0,
        emissive: 0x000000
    } );
    material.onBeforeCompile = ( shader ) => {
        shader.uniforms.treeTime = uniforms.time;
        shader.uniforms.treeResponse = uniforms.response;
        shader.uniforms.treeGustMix = uniforms.gustMix;
        shader.uniforms.treeGustIntervalBase = uniforms.intervalBase;
        shader.vertexShader = `
            ${rootedMotionShaderDeclarations}
            attribute float carrierVisibility;
            varying float trunkCarrierVisibility;
        ` + shader.vertexShader.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
            trunkCarrierVisibility = carrierVisibility;
            ${rootedMotionShaderApplication( 'position' )}`
        );
        shader.fragmentShader = `
            varying float trunkCarrierVisibility;
        ` + shader.fragmentShader.replace(
            '#include <clipping_planes_fragment>',
            `#include <clipping_planes_fragment>
            if ( trunkCarrierVisibility < 0.5 ) discard;`
        );
    };
    material.customProgramCacheKey = () =>
        'engineered-tree-interior-skeleton-c1-rooted-motion-v4';
    registerRootedMotionMaterial( material, uniforms, 'trunk-interior' );
    return { material, uniforms };
}

function createInternalRouterTransportMaterial( colour, opacity, instanced )
{
    const uniforms = {
        ...createRootedMotionUniforms(),
        offset: { value: new THREE.Vector3() },
        colour: { value: new THREE.Color( colour ) },
        opacity: { value: opacity }
    };
    const instanceTransform = instanced
        ? `#ifdef USE_INSTANCING
                transformed = ( instanceMatrix * vec4( transformed, 1.0 ) ).xyz;
            #endif`
        : '';
    const material = new THREE.ShaderMaterial( {
        uniforms: {
            treeTime: uniforms.time,
            treeResponse: uniforms.response,
            treeGustMix: uniforms.gustMix,
            treeGustIntervalBase: uniforms.intervalBase,
            diagnosticOffset: uniforms.offset,
            diagnosticColour: uniforms.colour,
            diagnosticOpacity: uniforms.opacity
        },
        vertexShader: `
            ${rootedMotionShaderDeclarations}
            uniform vec3 diagnosticOffset;

            void main()
            {
                vec3 transformed = position;
                ${instanceTransform}
                transformed += diagnosticOffset;
                ${rootedMotionShaderApplication( 'transformed' )}
                gl_Position = projectionMatrix * modelViewMatrix
                    * vec4( transformed, 1.0 );
            }
        `,
        fragmentShader: `
            uniform vec3 diagnosticColour;
            uniform float diagnosticOpacity;

            void main()
            {
                gl_FragColor = vec4( diagnosticColour, diagnosticOpacity );
            }
        `,
        transparent: true,
        depthTest: true,
        depthWrite: instanced,
        toneMapped: false
    } );
    registerRootedMotionMaterial( material, uniforms, 'router-manifestation' );
    return { material, uniforms };
}

export function createInformationRoute(
    hierarchy,
    positions,
    terminalId = routedTerminalId,
    asymmetry = 0.55
)
{
    const terminal = hierarchy.byId.get( terminalId );
    if ( !terminal || terminal.kind !== 'terminal' )
    {
        throw new Error( `Routed information terminal '${terminalId}' is not an authored terminal.` );
    }

    const nodes = [];
    let cursor = terminal;
    while ( cursor )
    {
        nodes.push( cursor );
        cursor = cursor.parentId ? hierarchy.byId.get( cursor.parentId ) : null;
    }

    const edgesByChildId = new Map( hierarchy.edges.map( ( edge ) => [ edge.child.id, edge ] ) );
    const segments = [];
    const byChildId = new Map();
    let childDistance = 0;
    for ( let index = 0; index < nodes.length - 1; index += 1 )
    {
        const child = nodes[index];
        const parent = nodes[index + 1];
        const edge = edgesByChildId.get( child.id );
        if ( !edge || edge.parent.id !== parent.id )
        {
            throw new Error( `Routed information edge '${child.id}' is not an authored parent relationship.` );
        }
        const startData = positions.get( parent.id );
        const endData = positions.get( child.id );
        const curve = createBranchCurve(
            new THREE.Vector3( startData.x, startData.y, startData.z ),
            new THREE.Vector3( endData.x, endData.y, endData.z ),
            edge,
            asymmetry
        );
        const length = curve.getLength();
        const segment = {
            edge,
            childId: child.id,
            parentId: parent.id,
            childDistance,
            parentDistance: childDistance + length,
            length,
            curve
        };
        segments.push( segment );
        byChildId.set( child.id, segment );
        childDistance = segment.parentDistance;
    }

    return {
        terminal,
        terminalId,
        nodes,
        nodeIds: nodes.map( ( node ) => node.id ),
        segments,
        byChildId,
        totalDistance: childDistance
    };
}

export function selectInformationTerminalForTier( hierarchy, requestedTier = 1 )
{
    const tier = Math.max( 1, Math.round( Number( requestedTier ) || 1 ) );
    const authoredCandidates = hierarchy.terminals.filter( ( node ) =>
        node.supportTier === true && node.growthTier === tier
    );
    if ( authoredCandidates.length === 0 )
    {
        throw new Error( `Growth tier '${tier}' has no authored information terminal.` );
    }

    const firstState = ( candidates ) => candidates.find( ( node ) =>
        node.id.endsWith( '-state' )
    ) ?? candidates[0];
    const eligibleCandidates = authoredCandidates.filter( ( node ) =>
        node.growthEligible !== false
    );
    return firstState( eligibleCandidates.length > 0
        ? eligibleCandidates
        : authoredCandidates );
}

function stableInformationHash( value )
{
    let hash = 2166136261;
    for ( let index = 0; index < value.length; index += 1 )
    {
        hash ^= value.charCodeAt( index );
        hash = Math.imul( hash, 16777619 );
    }
    return hash >>> 0;
}

export function selectInformationTrafficTerminals( hierarchy )
{
    return hierarchy.terminals
        .filter( ( node ) => node.growthEligible !== false )
        .slice()
        .sort( ( left, right ) => {
            const hashDifference = stableInformationHash( left.id )
                - stableInformationHash( right.id );
            return hashDifference || left.id.localeCompare( right.id );
        } );
}

export function createInformationCoreGeometry(
    informationRoute,
    conduitWeight = 1.34
)
{
    const path = new THREE.CurvePath();
    for ( const segment of informationRoute.segments )
    {
        const curve = segment.curve;
        path.add( new THREE.CubicBezierCurve3(
            curve.v3.clone(),
            curve.v2.clone(),
            curve.v1.clone(),
            curve.v0.clone()
        ) );
    }

    const tubularSegments = Math.max(
        96,
        Math.ceil( informationRoute.totalDistance * 20 )
    );
    const radialSegments = 8;
    const radius = getInformationPacketRadius( conduitWeight );
    const geometry = new THREE.TubeGeometry(
        path,
        tubularSegments,
        radius,
        radialSegments,
        false
    );
    const ringSize = radialSegments + 1;
    const distances = new Float32Array( geometry.getAttribute( 'position' ).count );
    for ( let index = 0; index < distances.length; index += 1 )
    {
        const ring = Math.floor( index / ringSize );
        distances[index] = ring / tubularSegments * informationRoute.totalDistance;
    }
    geometry.setAttribute(
        'informationDistance',
        new THREE.Float32BufferAttribute( distances, 1 )
    );
    geometry.userData.informationCore = {
        radius,
        radialSegments,
        tubularSegments,
        terminal: path.getPoint( 0 ).clone(),
        root: path.getPoint( 1 ).clone(),
        totalDistance: informationRoute.totalDistance
    };
    return geometry;
}

export function createInformationTrafficGeometry(
    informationRoutes,
    conduitWeight = 1.34,
    samplesPerEdge = 64
)
{
    const segmentsByChildId = new Map();
    for ( const route of informationRoutes )
    {
        for ( const segment of route.segments )
        {
            if ( !segmentsByChildId.has( segment.childId ) )
            {
                segmentsByChildId.set( segment.childId, segment );
            }
        }
    }
    const trafficEdges = Array.from( segmentsByChildId.values() )
        .sort( ( left, right ) => left.childId.localeCompare( right.childId ) );
    const radialSegments = 8;
    const radius = getInformationPacketRadius( conduitWeight );
    const geometries = trafficEdges.map( ( segment, row ) => {
        const curve = segment.curve;
        const path = new THREE.CubicBezierCurve3(
            curve.v3.clone(),
            curve.v2.clone(),
            curve.v1.clone(),
            curve.v0.clone()
        );
        const tubularSegments = Math.max( 12, Math.ceil( segment.length * 20 ) );
        const geometry = new THREE.TubeGeometry(
            path,
            tubularSegments,
            radius,
            radialSegments,
            false
        );
        const ringSize = radialSegments + 1;
        const trafficUvs = new Float32Array(
            geometry.getAttribute( 'position' ).count * 2
        );
        for ( let index = 0; index < trafficUvs.length / 2; index += 1 )
        {
            const ring = Math.floor( index / ringSize );
            trafficUvs[index * 2] = ring / tubularSegments;
            trafficUvs[index * 2 + 1] = ( row + 0.5 ) / trafficEdges.length;
        }
        geometry.setAttribute(
            'trafficUv',
            new THREE.Float32BufferAttribute( trafficUvs, 2 )
        );
        return geometry;
    } );
    const geometry = mergeGeometries( geometries, false );
    geometries.forEach( ( source ) => source.dispose() );
    if ( !geometry )
    {
        throw new Error( 'Information traffic core requires at least one routed edge.' );
    }
    geometry.computeBoundingSphere();
    geometry.userData.informationTraffic = {
        radius,
        radialSegments,
        samplesPerEdge,
        trafficEdges: trafficEdges.map( ( segment, row ) => ( {
            childId: segment.childId,
            parentId: segment.parentId,
            length: segment.length,
            row,
            segment
        } ) )
    };
    return geometry;
}

export function getInformationPacketRadius( conduitWeight = 1.34 )
{
    return THREE.MathUtils.clamp(
        informationCoreRadius * conduitWeight / 1.34,
        0.014,
        0.04
    );
}

function createInformationTrafficTexture( width, height )
{
    const data = new Uint8Array( width * height * 4 );
    const texture = new THREE.DataTexture(
        data,
        width,
        height,
        THREE.RGBAFormat,
        THREE.UnsignedByteType
    );
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return { data, texture, width, height };
}

export function getInformationSignal( routeDistance, headDistance )
{
    const profile = informationPacketVisualProfile;
    const delta = headDistance - routeDistance;
    const head = Math.exp( -Math.pow(
        ( routeDistance - headDistance ) / profile.headWidth,
        2
    ) );
    const wake = delta >= 0
        ? ( 1 - THREE.MathUtils.smoothstep(
            delta,
            0,
            profile.trailLength
        ) ) * Math.exp( -delta * profile.wakeDecay )
        : 0;
    return THREE.MathUtils.clamp(
        head + wake * profile.wakeAmplitude,
        0,
        1
    );
}

function applyInformationRouteAttributes( geometry, segment )
{
    const progress = geometry.getAttribute( 'branchProgress' );
    const distances = new Float32Array( progress.count );
    const masks = new Float32Array( progress.count );
    for ( let index = 0; index < progress.count; index += 1 )
    {
        distances[index] = THREE.MathUtils.lerp(
            segment.parentDistance,
            segment.childDistance,
            progress.getX( index )
        );
        masks[index] = 1;
    }
    geometry.setAttribute( 'informationDistance', new THREE.Float32BufferAttribute( distances, 1 ) );
    geometry.setAttribute( 'informationRoute', new THREE.Float32BufferAttribute( masks, 1 ) );
}

function isTrunkEdge( edge )
{
    return ( edge.parent.kind === 'root' || edge.parent.kind === 'trunk' )
        && edge.child.kind === 'trunk';
}

function getActiveTrunkNodes( hierarchy )
{
    const nodes = [ hierarchy.root ];
    let cursor = hierarchy.root;
    while ( cursor )
    {
        const child = cursor.children.find( ( candidate ) => candidate.kind === 'trunk' );
        if ( !child || child.growthEligible === false ) break;
        nodes.push( child );
        cursor = child;
    }
    return nodes;
}

function getCrownLoadDirection( hierarchy, positions )
{
    const crownCentre = new THREE.Vector3();
    let terminalCount = 0;
    for ( const node of hierarchy.terminals )
    {
        if ( node.growthEligible === false ) continue;
        const position = positions.get( node.id );
        crownCentre.x += position.x;
        crownCentre.z += position.z;
        terminalCount += 1;
    }

    if ( terminalCount > 0 ) crownCentre.multiplyScalar( 1 / terminalCount );
    crownCentre.y = 0;
    if ( crownCentre.lengthSq() < 0.0001 ) crownCentre.set( 1, 0, 0.25 );
    return crownCentre.normalize();
}

function getMonumentalRadii( trunkNodes, conduitWeight )
{
    const referenceWeight = 1.34;
    const weightScale = conduitWeight / referenceWeight;
    const meaningIndex = Math.max( 1, trunkNodes.findIndex( ( node ) => node.id === 'meaning' ) );

    return trunkNodes.map( ( node, index ) => {
        if ( index <= meaningIndex )
        {
            const progress = index / meaningIndex;
            return THREE.MathUtils.lerp( 1.42, 0.84, Math.pow( progress, 0.86 ) )
                * weightScale;
        }

        const stage = index - meaningIndex;
        const deliberateTaper = 0.84 * Math.pow( 0.8, stage ) * weightScale;
        const structuralMinimum = ( node.supportRadius ?? 0.2 ) * conduitWeight;
        return Math.max( deliberateTaper, structuralMinimum );
    } );
}

const interiorCarrierSamplesPerSpan = 10;
const interiorCarrierRadialSegments = 6;
const interiorCarrierWallScale = 0.58;

function countAuthoredTerminalDescendants( node )
{
    if ( node.children.length === 0 ) return node.kind === 'terminal' ? 1 : 0;
    return node.children.reduce(
        ( total, child ) => total + countAuthoredTerminalDescendants( child ),
        0
    );
}

function getSignedStep( index )
{
    if ( index === 0 ) return 0;
    const magnitude = Math.ceil( index / 2 );
    return index % 2 === 1 ? magnitude : -magnitude;
}

function chooseInteriorCarrierPlacement( attachment, placed )
{
    const loadScale = THREE.MathUtils.clamp(
        Math.sqrt( attachment.descendantLoad ) / 10,
        0,
        1
    );
    const loadDepth = THREE.MathUtils.lerp( 0.34, 0.10, loadScale );
    // Entry direction remains the principal placement constraint. Its continuous
    // asymmetry also prevents equal-load owners from collapsing onto an ornamental
    // radial band before collision relief is considered.
    const targetRadius = THREE.MathUtils.clamp(
        loadDepth + Math.sin( attachment.entryAngle * 2 ) * 0.018,
        0.08,
        0.36
    );
    const candidates = [];
    for ( let angularIndex = 0; angularIndex < 33; angularIndex += 1 )
    {
        const angularStep = getSignedStep( angularIndex );
        for ( let radialIndex = 0; radialIndex < 17; radialIndex += 1 )
        {
            const radialStep = getSignedStep( radialIndex );
            const radius = THREE.MathUtils.clamp(
                targetRadius + radialStep * 0.027,
                0.065,
                0.38
            );
            const angle = attachment.entryAngle + angularStep * 0.105;
            candidates.push( {
                angle,
                radius,
                x: Math.cos( angle ) * radius,
                y: Math.sin( angle ) * radius,
                score: Math.abs( angularStep ) * 0.105
                    + Math.abs( radius - targetRadius ) * 2.4,
                candidateIndex: angularIndex * 17 + radialIndex
            } );
        }
    }
    candidates.sort( ( left, right ) => left.score - right.score
        || left.candidateIndex - right.candidateIndex );
    const minimumSeparation = 0.10;
    const selected = candidates.find( ( candidate ) => placed.every( ( previous ) =>
        Math.hypot( candidate.x - previous.x, candidate.y - previous.y )
            >= minimumSeparation
    ) );
    if ( !selected )
    {
        throw new Error(
            `No collision-free C1 carrier placement remains for '${attachment.ownerId}'.`
        );
    }
    return {
        angle: selected.angle,
        radius: selected.radius,
        x: selected.x,
        y: selected.y,
        angularRelief: selected.angle - attachment.entryAngle,
        radialRelief: selected.radius - targetRadius,
        targetRadius
    };
}

function createInteriorTrunkStations(
    trunkNodes,
    positions,
    asymmetry,
    conduitWeight,
    samplesPerSpan
)
{
    const points = [];
    const stationDescriptors = [];
    for ( let span = 0; span < trunkNodes.length - 1; span += 1 )
    {
        const parent = trunkNodes[span];
        const child = trunkNodes[span + 1];
        const startData = positions.get( parent.id );
        const endData = positions.get( child.id );
        const curve = createBranchCurve(
            new THREE.Vector3( startData.x, startData.y, startData.z ),
            new THREE.Vector3( endData.x, endData.y, endData.z ),
            { parent, child },
            asymmetry
        );
        for ( let step = span === 0 ? 0 : 1; step <= samplesPerSpan; step += 1 )
        {
            const localProgress = step / samplesPerSpan;
            points.push( curve.getPoint( localProgress ) );
            stationDescriptors.push( { span, localProgress } );
        }
    }

    const radii = getMonumentalRadii( trunkNodes, conduitWeight );
    // Carrier placement uses a fixed object-space reference rather than the
    // active crown centroid. Adding a later growth tier can therefore append
    // owners without rotating or reassigning the accepted carriers below it.
    const placementAxis = new THREE.Vector3( 1, 0, 0.25 ).normalize();
    const previousMajor = new THREE.Vector3();
    const stations = points.map( ( centre, index ) => {
        const previous = points[Math.max( 0, index - 1 )];
        const next = points[Math.min( points.length - 1, index + 1 )];
        const stationDescriptor = stationDescriptors[index];
        // At a completed authored node retain the incoming rootward-span frame.
        // Appending another tier must not rotate an existing owner's slot.
        const tangent = ( stationDescriptor.localProgress >= 1 - 1e-9
            ? centre.clone().sub( previous )
            : next.clone().sub( previous ) ).normalize();
        const major = placementAxis.clone().addScaledVector(
            tangent,
            -placementAxis.dot( tangent )
        );
        if ( major.lengthSq() < 0.0001 ) major.set( 1, 0, 0 );
        major.normalize();
        const minor = new THREE.Vector3().crossVectors( tangent, major ).normalize();
        if ( index > 0 && major.dot( previousMajor ) < 0 )
        {
            major.negate();
            minor.negate();
        }
        previousMajor.copy( major );

        const descriptor = stationDescriptor;
        const blend = descriptor.localProgress * descriptor.localProgress
            * ( 3 - 2 * descriptor.localProgress );
        return {
            ...descriptor,
            centre,
            tangent,
            major,
            minor,
            radius: THREE.MathUtils.lerp(
                radii[descriptor.span],
                radii[descriptor.span + 1],
                blend
            )
        };
    } );
    return { stations, radii };
}

export function createTrunkEnvelopeDescriptor(
    hierarchy,
    positions,
    {
        asymmetry = 0.55,
        conduitWeight = 1,
        samplesPerSpan = interiorCarrierSamplesPerSpan
    } = {}
)
{
    const trunkNodes = getActiveTrunkNodes( hierarchy );
    const { stations } = createInteriorTrunkStations(
        trunkNodes,
        positions,
        asymmetry,
        conduitWeight,
        samplesPerSpan
    );
    const ellipseMinor = 0.92;
    const loadReinforcement = 0.035 + asymmetry * 0.035;
    return {
        trunkNodeIds: trunkNodes.map( ( node ) => node.id ),
        samplesPerSpan,
        wallClearanceScale: interiorCarrierWallScale,
        stations: stations.map( ( station, stationIndex ) => ( {
            stationIndex,
            span: station.span,
            localProgress: station.localProgress,
            longitudinalStation: station.span * samplesPerSpan
                + station.localProgress * samplesPerSpan,
            centre: station.centre.clone(),
            tangent: station.tangent.clone(),
            major: station.major.clone(),
            minor: station.minor.clone(),
            conservativeShellRadius: station.radius * ellipseMinor
                * ( 1 - loadReinforcement )
        } ) )
    };
}

export function createTrunkInteriorDescriptor(
    hierarchy,
    positions,
    {
        asymmetry = 0.55,
        conduitWeight = 1,
        loadDirection = getCrownLoadDirection( hierarchy, positions ),
        samplesPerSpan = interiorCarrierSamplesPerSpan
    } = {}
)
{
    const trunkNodes = getActiveTrunkNodes( hierarchy );
    const { stations } = createInteriorTrunkStations(
        trunkNodes,
        positions,
        asymmetry,
        conduitWeight,
        samplesPerSpan
    );
    const ellipseMajor = 1.06 + asymmetry * 0.035;
    const ellipseMinor = 0.92;
    const loadReinforcement = 0.035 + asymmetry * 0.035;
    const attachments = [];

    for ( let trunkIndex = 0; trunkIndex < trunkNodes.length; trunkIndex += 1 )
    {
        const trunkNode = trunkNodes[trunkIndex];
        const entryStation = stations[trunkIndex * samplesPerSpan];
        for ( const child of trunkNode.children )
        {
            if ( child.kind === 'trunk' || child.growthEligible === false ) continue;
            const childPosition = positions.get( child.id );
            const direction = new THREE.Vector3(
                childPosition.x - entryStation.centre.x,
                childPosition.y - entryStation.centre.y,
                childPosition.z - entryStation.centre.z
            );
            const projectedMajor = direction.dot( entryStation.major );
            const projectedMinor = direction.dot( entryStation.minor );
            const entryAngle = Math.abs( projectedMajor ) + Math.abs( projectedMinor ) > 1e-8
                ? Math.atan2( projectedMinor, projectedMajor )
                : stableInformationHash( child.id ) / 0xffffffff * Math.PI * 2;
            const descendantLoad = countAuthoredTerminalDescendants( child );
            attachments.push( {
                ownerId: child.id,
                entryTrunkNodeId: trunkNode.id,
                entryTrunkIndex: trunkIndex,
                entryAngle,
                descendantLoad
            } );
        }
    }

    const placementOrder = attachments.slice().sort( ( left, right ) =>
        left.entryTrunkIndex - right.entryTrunkIndex
        || right.descendantLoad - left.descendantLoad
        || left.ownerId.localeCompare( right.ownerId )
    );
    const placed = [];
    for ( const attachment of placementOrder )
    {
        const loadScale = THREE.MathUtils.clamp(
            Math.sqrt( attachment.descendantLoad ) / 10,
            0,
            1
        );
        attachment.slot = chooseInteriorCarrierPlacement( attachment, placed );
        attachment.radius = ( 0.017 + loadScale * 0.011 )
            * conduitWeight / 1.34;
        placed.push( attachment.slot );
    }

    const carriers = attachments
        .sort( ( left, right ) => left.entryTrunkIndex - right.entryTrunkIndex
            || left.ownerId.localeCompare( right.ownerId ) )
        .map( ( attachment, carrierIndex ) => {
            const entryStationIndex = attachment.entryTrunkIndex * samplesPerSpan;
            const carrierStations = stations.slice( 0, entryStationIndex + 1 );
            const centreline = [];
            const trunkCentreline = [];
            const conservativeShellRadii = [];
            let minimumWallClearance = Number.POSITIVE_INFINITY;
            let minimumGrowthWallClearance = Number.POSITIVE_INFINITY;
            for ( const station of carrierStations )
            {
                const reinforcement = 1 + Math.cos( attachment.slot.angle )
                    * loadReinforcement;
                const point = station.centre.clone()
                    .addScaledVector(
                        station.major,
                        attachment.slot.x * station.radius * ellipseMajor * reinforcement
                    )
                    .addScaledVector(
                        station.minor,
                        attachment.slot.y * station.radius * ellipseMinor * reinforcement
                    );
                centreline.push( point.x, point.y, point.z );
                trunkCentreline.push(
                    station.centre.x,
                    station.centre.y,
                    station.centre.z
                );
                const conservativeShellRadius = station.radius * ellipseMinor
                    * ( 1 - loadReinforcement );
                conservativeShellRadii.push( conservativeShellRadius );
                const centreOffset = point.distanceTo( station.centre );
                minimumWallClearance = Math.min(
                    minimumWallClearance,
                    conservativeShellRadius - centreOffset - attachment.radius
                );
                minimumGrowthWallClearance = Math.min(
                    minimumGrowthWallClearance,
                    conservativeShellRadius * interiorCarrierWallScale
                        - centreOffset - attachment.radius
                );
            }
            return {
                carrierIndex,
                ownerId: attachment.ownerId,
                attachmentNodeId: attachment.ownerId,
                entryTrunkNodeId: attachment.entryTrunkNodeId,
                entryTrunkIndex: attachment.entryTrunkIndex,
                supportingTrunkNodeIds: trunkNodes
                    .slice( 0, attachment.entryTrunkIndex + 1 )
                    .map( ( node ) => node.id ),
                descendantLoad: attachment.descendantLoad,
                authoredDescendantLoad: attachment.descendantLoad,
                entryAngle: attachment.entryAngle,
                placementAngle: attachment.slot.angle,
                slotX: attachment.slot.x,
                slotY: attachment.slot.y,
                slotRadius: attachment.slot.radius,
                targetRadius: attachment.slot.targetRadius,
                angularRelief: attachment.slot.angularRelief,
                radialRelief: attachment.slot.radialRelief,
                radius: attachment.radius,
                minimumWallClearance,
                minimumGrowthWallClearance,
                centreline: new Float32Array( centreline ),
                trunkCentreline: new Float32Array( trunkCentreline ),
                conservativeShellRadii: new Float32Array( conservativeShellRadii )
            };
        } );

    const spans = [];
    for ( let spanIndex = 0; spanIndex < trunkNodes.length - 1; spanIndex += 1 )
    {
        const carrierOwnerIds = carriers
            .filter( ( carrier ) => carrier.entryTrunkIndex >= spanIndex + 1 )
            .map( ( carrier ) => carrier.ownerId );
        spans.push( {
            spanIndex,
            parentId: trunkNodes[spanIndex].id,
            childId: trunkNodes[spanIndex + 1].id,
            carrierCount: carrierOwnerIds.length,
            carrierOwnerIds
        } );
    }
    const rootwardGroups = [];
    for ( const span of spans.slice().reverse() )
    {
        const previous = rootwardGroups.at( -1 );
        if ( previous && previous.carrierCount === span.carrierCount )
        {
            previous.spanIds.push( `${span.childId} -> ${span.parentId}` );
            continue;
        }
        rootwardGroups.push( {
            carrierCount: span.carrierCount,
            carrierOwnerIds: span.carrierOwnerIds.slice(),
            spanIds: [ `${span.childId} -> ${span.parentId}` ]
        } );
    }

    const placementData = new Float32Array( carriers.flatMap( ( carrier ) => [
        carrier.entryTrunkIndex,
        carrier.descendantLoad,
        carrier.entryAngle,
        carrier.placementAngle,
        carrier.slotX,
        carrier.slotY,
        carrier.targetRadius,
        carrier.angularRelief,
        carrier.radialRelief,
        carrier.radius,
        carrier.minimumWallClearance,
        carrier.minimumGrowthWallClearance,
        ...carrier.centreline,
        ...carrier.trunkCentreline,
        ...carrier.conservativeShellRadii
    ] ) );
    let minimumCarrierClearance = Number.POSITIVE_INFINITY;
    let closestCarrierPair = null;
    let closestCarrierStation = null;
    const maximumStationCount = Math.max(
        ...carriers.map( ( carrier ) => carrier.centreline.length / 3 )
    );
    for ( let stationIndex = 0;
        stationIndex < maximumStationCount;
        stationIndex += 1 )
    {
        const present = carriers.filter( ( carrier ) =>
            carrier.centreline.length / 3 > stationIndex
        );
        const coordinate = stationIndex * 3;
        for ( let leftIndex = 0; leftIndex < present.length; leftIndex += 1 )
        {
            for ( let rightIndex = leftIndex + 1;
                rightIndex < present.length;
                rightIndex += 1 )
            {
                const left = present[leftIndex];
                const right = present[rightIndex];
                const clearance = Math.hypot(
                    left.centreline[coordinate] - right.centreline[coordinate],
                    left.centreline[coordinate + 1] - right.centreline[coordinate + 1],
                    left.centreline[coordinate + 2] - right.centreline[coordinate + 2]
                ) - left.radius - right.radius;
                if ( clearance >= minimumCarrierClearance ) continue;
                minimumCarrierClearance = clearance;
                closestCarrierPair = [ left.ownerId, right.ownerId ];
                closestCarrierStation = stationIndex;
            }
        }
    }
    return {
        trunkNodeIds: trunkNodes.map( ( node ) => node.id ),
        samplesPerSpan,
        wallClearanceScale: interiorCarrierWallScale,
        loadDirection: new Float32Array( [
            loadDirection.x,
            loadDirection.y,
            loadDirection.z
        ] ),
        carriers,
        spans,
        rootwardGroups,
        placementData,
        separation: {
            minimumCarrierClearance,
            closestCarrierPair,
            closestCarrierStation
        }
    };
}

export function createTrunkInteriorSkeletonGeometry( descriptor )
{
    const sources = [];
    const carrierRanges = [];
    let vertexOffset = 0;
    let indexOffset = 0;
    let minimumVertexWallClearance = Number.POSITIVE_INFINITY;
    let minimumGrowthVertexWallClearance = Number.POSITIVE_INFINITY;
    for ( const carrier of descriptor.carriers )
    {
        const points = [];
        const trunkCentres = [];
        for ( let index = 0; index < carrier.centreline.length; index += 3 )
        {
            points.push( new THREE.Vector3(
                carrier.centreline[index],
                carrier.centreline[index + 1],
                carrier.centreline[index + 2]
            ) );
            trunkCentres.push( new THREE.Vector3(
                carrier.trunkCentreline[index],
                carrier.trunkCentreline[index + 1],
                carrier.trunkCentreline[index + 2]
            ) );
        }
        if ( points.length < 2 ) continue;
        const vertices = [];
        const indices = [];
        const previousNormal = new THREE.Vector3();
        let carrierMinimumClearance = Number.POSITIVE_INFINITY;
        let carrierMinimumGrowthClearance = Number.POSITIVE_INFINITY;
        for ( let ring = 0; ring < points.length; ring += 1 )
        {
            const previous = points[Math.max( 0, ring - 1 )];
            const next = points[Math.min( points.length - 1, ring + 1 )];
            const tangent = next.clone().sub( previous ).normalize();
            const reference = Math.abs( tangent.y ) < 0.9
                ? new THREE.Vector3( 0, 1, 0 )
                : new THREE.Vector3( 1, 0, 0 );
            const normal = new THREE.Vector3()
                .crossVectors( tangent, reference )
                .normalize();
            const binormal = new THREE.Vector3()
                .crossVectors( tangent, normal )
                .normalize();
            if ( ring > 0 && normal.dot( previousNormal ) < 0 )
            {
                normal.negate();
                binormal.negate();
            }
            previousNormal.copy( normal );
            for ( let side = 0; side < interiorCarrierRadialSegments; side += 1 )
            {
                const angle = side / interiorCarrierRadialSegments * Math.PI * 2;
                const vertex = points[ring].clone()
                    .addScaledVector( normal, Math.cos( angle ) * carrier.radius )
                    .addScaledVector( binormal, Math.sin( angle ) * carrier.radius );
                vertices.push( vertex.x, vertex.y, vertex.z );
                const actualRadialDistance = vertex.distanceTo( trunkCentres[ring] );
                const shellRadius = carrier.conservativeShellRadii[ring];
                carrierMinimumClearance = Math.min(
                    carrierMinimumClearance,
                    shellRadius - actualRadialDistance
                );
                carrierMinimumGrowthClearance = Math.min(
                    carrierMinimumGrowthClearance,
                    shellRadius * descriptor.wallClearanceScale
                        - actualRadialDistance
                );
            }
        }
        for ( let ring = 0; ring < points.length - 1; ring += 1 )
        {
            for ( let side = 0; side < interiorCarrierRadialSegments; side += 1 )
            {
                const nextSide = ( side + 1 ) % interiorCarrierRadialSegments;
                const a = ring * interiorCarrierRadialSegments + side;
                const b = ( ring + 1 ) * interiorCarrierRadialSegments + side;
                const c = ( ring + 1 ) * interiorCarrierRadialSegments + nextSide;
                const d = ring * interiorCarrierRadialSegments + nextSide;
                indices.push( a, d, b, b, d, c );
            }
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute( vertices, 3 )
        );
        geometry.setIndex( indices );
        geometry.computeVertexNormals();
        const vertexCount = geometry.getAttribute( 'position' ).count;
        const indexCount = geometry.index.count;
        geometry.setAttribute(
            'carrierVisibility',
            new THREE.Float32BufferAttribute( new Float32Array( vertexCount ), 1 )
        );
        geometry.setAttribute(
            'carrierIndex',
            new THREE.Float32BufferAttribute(
                new Float32Array( vertexCount ).fill( carrier.carrierIndex ),
                1
            )
        );
        const spanRanges = [];
        const indicesPerSpan = descriptor.samplesPerSpan
            * interiorCarrierRadialSegments * 6;
        for ( let spanIndex = 0;
            spanIndex < carrier.entryTrunkIndex;
            spanIndex += 1 )
        {
            spanRanges.push( {
                spanIndex,
                indexStart: indexOffset + spanIndex * indicesPerSpan,
                indexCount: indicesPerSpan
            } );
        }
        carrierRanges.push( {
            carrierIndex: carrier.carrierIndex,
            ownerId: carrier.ownerId,
            entryTrunkNodeId: carrier.entryTrunkNodeId,
            vertexStart: vertexOffset,
            vertexCount,
            indexStart: indexOffset,
            indexCount,
            minimumVertexWallClearance: carrierMinimumClearance,
            minimumGrowthVertexWallClearance: carrierMinimumGrowthClearance,
            spanRanges
        } );
        minimumVertexWallClearance = Math.min(
            minimumVertexWallClearance,
            carrierMinimumClearance
        );
        minimumGrowthVertexWallClearance = Math.min(
            minimumGrowthVertexWallClearance,
            carrierMinimumGrowthClearance
        );
        vertexOffset += vertexCount;
        indexOffset += indexCount;
        sources.push( geometry );
    }
    if ( sources.length === 0 )
    {
        throw new Error( 'The C1 trunk-interior skeleton requires at least one authored attachment.' );
    }
    const geometry = mergeGeometries( sources, false );
    sources.forEach( ( source ) => source.dispose() );
    if ( !geometry )
    {
        throw new Error( 'The C1 trunk-interior carrier geometries could not be merged.' );
    }
    geometry.getAttribute( 'carrierVisibility' ).setUsage( THREE.DynamicDrawUsage );
    geometry.computeBoundingSphere();
    const spanDrawRanges = descriptor.spans.map( ( span ) => {
        const ranges = carrierRanges.flatMap( ( carrier ) =>
            carrier.spanRanges.filter( ( range ) => range.spanIndex === span.spanIndex )
                .map( ( range ) => ( {
                    ownerId: carrier.ownerId,
                    indexStart: range.indexStart,
                    indexCount: range.indexCount
                } ) )
        );
        return {
            spanIndex: span.spanIndex,
            parentId: span.parentId,
            childId: span.childId,
            carrierCount: ranges.length,
            totalIndexCount: ranges.reduce( ( total, range ) =>
                total + range.indexCount, 0 ),
            ranges
        };
    } );
    geometry.userData.trunkInterior = {
        descriptor,
        carrierRanges,
        spanDrawRanges,
        carrierCount: descriptor.carriers.length,
        vertexCount: geometry.getAttribute( 'position' ).count,
        triangleCount: geometry.index.count / 3,
        radialSegments: interiorCarrierRadialSegments,
        minimumWallClearance: Math.min(
            ...descriptor.carriers.map( ( carrier ) => carrier.minimumWallClearance )
        ),
        minimumGrowthWallClearance: Math.min(
            ...descriptor.carriers.map( ( carrier ) => carrier.minimumGrowthWallClearance )
        ),
        minimumVertexWallClearance,
        minimumGrowthVertexWallClearance
    };
    return geometry;
}

export function createMonumentalTrunkGeometry(
    trunkNodes,
    positions,
    {
        asymmetry = 0.55,
        conduitWeight = 1,
        loadDirection = new THREE.Vector3( 1, 0, 0 ),
        informationRoute = null,
        nodeScales = trunkNodes.map( () => 1 ),
        samplesPerSpan = 10,
        radialSegments = 18
    } = {}
)
{
    const points = [];
    const stations = [];
    for ( let span = 0; span < trunkNodes.length - 1; span += 1 )
    {
        const parent = trunkNodes[span];
        const child = trunkNodes[span + 1];
        const startData = positions.get( parent.id );
        const endData = positions.get( child.id );
        const curve = createBranchCurve(
            new THREE.Vector3( startData.x, startData.y, startData.z ),
            new THREE.Vector3( endData.x, endData.y, endData.z ),
            { parent, child },
            asymmetry
        );

        for ( let step = span === 0 ? 0 : 1; step <= samplesPerSpan; step += 1 )
        {
            const localProgress = step / samplesPerSpan;
            points.push( curve.getPoint( localProgress ) );
            stations.push( { span, localProgress } );
        }
    }

    // Continue the same volume below the planting datum so the temporary study
    // reads as embedded mass rather than an exposed pipe end or a pair of roots.
    const plantedBase = points[0].clone();
    plantedBase.y -= 0.18;
    points.unshift( plantedBase );
    stations.unshift( { span: 0, localProgress: 0 } );

    const radii = getMonumentalRadii( trunkNodes, conduitWeight );
    const vertices = [];
    const informationDistances = [];
    const informationMasks = [];
    const bodyIndices = [];
    const previousMajor = new THREE.Vector3();
    const loadAxis = loadDirection.clone().setY( 0 ).normalize();
    const ellipseMajor = 1.06 + asymmetry * 0.035;
    const ellipseMinor = 0.92;
    const loadReinforcement = 0.035 + asymmetry * 0.035;

    for ( let ring = 0; ring < points.length; ring += 1 )
    {
        const previous = points[Math.max( 0, ring - 1 )];
        const next = points[Math.min( points.length - 1, ring + 1 )];
        const tangent = next.clone().sub( previous ).normalize();
        const major = loadAxis.clone().addScaledVector( tangent, -loadAxis.dot( tangent ) );
        if ( major.lengthSq() < 0.0001 ) major.set( 1, 0, 0 );
        major.normalize();
        const minor = new THREE.Vector3().crossVectors( tangent, major ).normalize();
        if ( ring > 0 && major.dot( previousMajor ) < 0 )
        {
            major.negate();
            minor.negate();
        }
        previousMajor.copy( major );

        const station = stations[ring];
        const routeSegment = informationRoute?.byChildId.get(
            trunkNodes[station.span + 1].id
        );
        const routeDistance = routeSegment
            ? THREE.MathUtils.lerp(
                routeSegment.parentDistance,
                routeSegment.childDistance,
                station.localProgress
            )
            : 0;
        const routeMask = routeSegment ? 1 : 0;
        const blend = station.localProgress * station.localProgress
            * ( 3 - 2 * station.localProgress );
        const radius = THREE.MathUtils.lerp(
            radii[station.span],
            radii[station.span + 1],
            blend
        ) * THREE.MathUtils.lerp(
            nodeScales[station.span],
            nodeScales[station.span + 1],
            blend
        );

        for ( let side = 0; side < radialSegments; side += 1 )
        {
            const angle = side / radialSegments * Math.PI * 2;
            const reinforcement = 1 + Math.cos( angle ) * loadReinforcement;
            const offset = major.clone().multiplyScalar(
                Math.cos( angle ) * radius * ellipseMajor * reinforcement
            ).addScaledVector(
                minor,
                Math.sin( angle ) * radius * ellipseMinor * reinforcement
            );
            vertices.push(
                points[ring].x + offset.x,
                points[ring].y + offset.y,
                points[ring].z + offset.z
            );
            informationDistances.push( routeDistance );
            informationMasks.push( routeMask );
        }
    }

    for ( let ring = 0; ring < points.length - 1; ring += 1 )
    {
        for ( let side = 0; side < radialSegments; side += 1 )
        {
            const nextSide = ( side + 1 ) % radialSegments;
            const a = ring * radialSegments + side;
            const b = ( ring + 1 ) * radialSegments + side;
            const c = ( ring + 1 ) * radialSegments + nextSide;
            const d = ring * radialSegments + nextSide;
            bodyIndices.push( a, d, b, b, d, c );
        }
    }

    const firstRingDistances = informationDistances.slice( 0, radialSegments );
    const firstRingMasks = informationMasks.slice( 0, radialSegments );
    const lastRingStart = ( points.length - 1 ) * radialSegments;
    const lastRingDistances = informationDistances.slice(
        lastRingStart, lastRingStart + radialSegments
    );
    const lastRingMasks = informationMasks.slice(
        lastRingStart, lastRingStart + radialSegments
    );

    const baseCentre = vertices.length / 3;
    vertices.push( points[0].x, points[0].y, points[0].z );
    informationDistances.push( firstRingDistances[0] );
    informationMasks.push( firstRingMasks[0] );
    const baseRing = vertices.length / 3;
    vertices.push( ...vertices.slice( 0, radialSegments * 3 ) );
    informationDistances.push( ...firstRingDistances );
    informationMasks.push( ...firstRingMasks );
    const topCentre = vertices.length / 3;
    const topPoint = points.at( -1 );
    vertices.push( topPoint.x, topPoint.y, topPoint.z );
    informationDistances.push( lastRingDistances[0] );
    informationMasks.push( lastRingMasks[0] );
    const topRing = vertices.length / 3;
    vertices.push( ...vertices.slice(
        ( points.length - 1 ) * radialSegments * 3,
        points.length * radialSegments * 3
    ) );
    informationDistances.push( ...lastRingDistances );
    informationMasks.push( ...lastRingMasks );

    const baseIndices = [];
    const topIndices = [];
    for ( let side = 0; side < radialSegments; side += 1 )
    {
        const nextSide = ( side + 1 ) % radialSegments;
        // The study is viewed from above its temporary planting plane. Face the
        // buried closure upward so it cannot read as an exposed hollow pipe.
        baseIndices.push( baseCentre, baseRing + side, baseRing + nextSide );
        topIndices.push( topCentre, topRing + side, topRing + nextSide );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
    geometry.setAttribute(
        'informationDistance',
        new THREE.Float32BufferAttribute( informationDistances, 1 )
    );
    geometry.setAttribute(
        'informationRoute',
        new THREE.Float32BufferAttribute( informationMasks, 1 )
    );
    geometry.setIndex( [ ...baseIndices, ...bodyIndices, ...topIndices ] );
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    geometry.userData.monumentalTrunk = {
        baseIndexCount: baseIndices.length,
        bodyIndexCount: bodyIndices.length,
        topIndexCount: topIndices.length,
        bodySegmentCount: points.length - 1,
        sideVertexCount: points.length * radialSegments,
        plantingSegmentCount: 1,
        radialSegments,
        samplesPerSpan,
        nodeRadii: radii
    };
    return geometry;
}

function getRingCentre( position, ring, radialSegments )
{
    const centre = new THREE.Vector3();
    for ( let side = 0; side < radialSegments; side += 1 )
    {
        centre.x += position.getX( ring * radialSegments + side );
        centre.y += position.getY( ring * radialSegments + side );
        centre.z += position.getZ( ring * radialSegments + side );
    }
    return centre.multiplyScalar( 1 / radialSegments );
}

function getTrunkVisibilityRegion( sourceGeometry, trunkNodes )
{
    const metadata = sourceGeometry.userData.monumentalTrunk;
    if ( !metadata )
    {
        throw new Error( 'C2 visibility candidates require monumental trunk metadata.' );
    }
    const authoredSpanIndex = trunkNodes.findIndex( ( node, index ) =>
        node.id === trunkVisibilityRegion.parentId
        && trunkNodes[index + 1]?.id === trunkVisibilityRegion.childId
    );
    // Small synthetic test hierarchies do not carry the named production
    // stations. They receive the same bounded construction on their middle
    // span; the authored Tree always resolves exchange -> meaning exactly.
    const spanIndex = authoredSpanIndex >= 0
        ? authoredSpanIndex
        : Math.max( 0, Math.floor( ( trunkNodes.length - 2 ) / 2 ) );

    const { radialSegments, samplesPerSpan, sideVertexCount } = metadata;
    const sideRingCount = sideVertexCount / radialSegments;
    // Ring zero is the planted extension. Authored trunk node n is therefore
    // ring 1 + n * samplesPerSpan.
    const spanStartRing = 1 + spanIndex * samplesPerSpan;
    const longitudinalStartRing = spanStartRing
        + trunkVisibilityRegion.longitudinalCellOffset;
    const longitudinalEndRing = longitudinalStartRing
        + trunkVisibilityRegion.longitudinalCellCount;
    if ( longitudinalEndRing >= sideRingCount )
    {
        throw new Error( 'C2 visibility region exceeds the current trunk shell.' );
    }

    // This direction is an authored object-space choice, not a camera query.
    // It makes every method expose exactly the same patch while the viewer orbits.
    const authoredDirection = new THREE.Vector3( 0.72, 0, 0.69 ).normalize();
    const position = sourceGeometry.getAttribute( 'position' );
    const middleRing = Math.floor(
        ( longitudinalStartRing + longitudinalEndRing ) / 2
    );
    const middleCentre = getRingCentre( position, middleRing, radialSegments );
    let angularStartSide = 0;
    let bestFacing = Number.NEGATIVE_INFINITY;
    // Avoid crossing the index seam so the two-cell window remains auditable.
    for ( let side = 0;
        side < radialSegments - trunkVisibilityRegion.angularCellCount;
        side += 1 )
    {
        const a = new THREE.Vector3().fromBufferAttribute(
            position,
            middleRing * radialSegments + side
        );
        const b = new THREE.Vector3().fromBufferAttribute(
            position,
            middleRing * radialSegments
                + side + trunkVisibilityRegion.angularCellCount
        );
        const facing = a.add( b ).multiplyScalar( 0.5 )
            .sub( middleCentre ).normalize().dot( authoredDirection );
        if ( facing <= bestFacing ) continue;
        bestFacing = facing;
        angularStartSide = side;
    }

    return {
        parentId: trunkNodes[spanIndex].id,
        childId: trunkNodes[spanIndex + 1].id,
        preferredRegionAvailable: authoredSpanIndex >= 0,
        spanIndex,
        spanStartRing,
        longitudinalStartRing,
        longitudinalEndRing,
        longitudinalCellCount: trunkVisibilityRegion.longitudinalCellCount,
        angularStartSide,
        angularEndSide: angularStartSide + trunkVisibilityRegion.angularCellCount,
        angularCellCount: trunkVisibilityRegion.angularCellCount,
        radialSegments,
        sideRingCount,
        baseIndexCount: metadata.baseIndexCount
    };
}

export function createTrunkApertureCandidateGeometry( sourceGeometry, trunkNodes )
{
    const region = getTrunkVisibilityRegion( sourceGeometry, trunkNodes );
    const omittedIndexOffsets = [];
    for ( let ring = region.longitudinalStartRing;
        ring < region.longitudinalEndRing;
        ring += 1 )
    {
        for ( let side = region.angularStartSide;
            side < region.angularEndSide;
            side += 1 )
        {
            omittedIndexOffsets.push(
                region.baseIndexCount
                    + ( ring * region.radialSegments + side ) * 6
            );
        }
    }
    const omitted = new Set( omittedIndexOffsets );
    const sourceIndices = sourceGeometry.index.array;
    const candidateIndices = [];
    for ( let offset = 0; offset < sourceIndices.length; offset += 6 )
    {
        if ( omitted.has( offset ) ) continue;
        for ( let index = 0; index < 6 && offset + index < sourceIndices.length; index += 1 )
        {
            candidateIndices.push( sourceIndices[offset + index] );
        }
    }

    // BufferGeometry.clone preserves the source attribute values. Only the
    // index is replaced, so the C2 candidate cannot silently reshape C1.
    const candidate = sourceGeometry.clone();
    candidate.setIndex( candidateIndices );
    candidate.computeBoundingSphere();
    candidate.userData.monumentalTrunk = {
        ...sourceGeometry.userData.monumentalTrunk
    };
    candidate.userData.trunkVisibilityAperture = {
        ...region,
        omittedCellCount: omittedIndexOffsets.length,
        omittedTriangleCount: omittedIndexOffsets.length * 2,
        omittedIndexOffsets,
        sourceIndexCount: sourceIndices.length,
        candidateIndexCount: candidate.index.count,
        sourcePositionByteLength: sourceGeometry.getAttribute( 'position' ).array.byteLength,
        candidatePositionByteLength: candidate.getAttribute( 'position' ).array.byteLength
    };
    return candidate;
}

export function createTrunkVisibilityOwnershipPatchGeometry(
    sourceGeometry,
    trunkNodes
)
{
    const region = getTrunkVisibilityRegion( sourceGeometry, trunkNodes );
    const sourceIndices = sourceGeometry.index.array;
    const patchIndices = [];
    for ( let ring = region.longitudinalStartRing;
        ring < region.longitudinalEndRing;
        ring += 1 )
    {
        for ( let side = region.angularStartSide;
            side < region.angularEndSide;
            side += 1 )
        {
            const sourceOffset = region.baseIndexCount
                + ( ring * region.radialSegments + side ) * 6;
            for ( let index = 0; index < 6; index += 1 )
            {
                patchIndices.push( sourceIndices[sourceOffset + index] );
            }
        }
    }
    // Retain all source attributes byte-for-byte. This is the exact positive
    // counterpart of the aperture's omitted index cells and therefore passes
    // EqualDepth only where that same fixed shell patch owns the visible pixel.
    const patch = sourceGeometry.clone();
    patch.setIndex( patchIndices );
    patch.computeBoundingSphere();
    const position = sourceGeometry.getAttribute( 'position' );
    const startCentre = getRingCentre(
        position,
        region.longitudinalStartRing,
        region.radialSegments
    );
    const endCentre = getRingCentre(
        position,
        region.longitudinalEndRing,
        region.radialSegments
    );
    const axis = endCentre.clone().sub( startCentre );
    patch.userData.trunkVisibilityOwnershipPatch = {
        ...region,
        cellCount: region.longitudinalCellCount * region.angularCellCount,
        triangleCount: patchIndices.length / 3,
        sourcePositionByteLength: position.array.byteLength,
        patchPositionByteLength: patch.getAttribute( 'position' ).array.byteLength,
        startCentre: startCentre.toArray(),
        endCentre: endCentre.toArray(),
        axis: axis.clone().normalize().toArray(),
        axisLength: axis.length()
    };
    return patch;
}

export function mapApertureCandidateDrawCount( candidateGeometry, sourceDrawCount )
{
    const aperture = candidateGeometry.userData.trunkVisibilityAperture;
    if ( !aperture ) return sourceDrawCount;
    const removedBeforeDrawEnd = aperture.omittedIndexOffsets.reduce(
        ( total, offset ) => total + ( offset < sourceDrawCount ? 6 : 0 ),
        0
    );
    return Math.min(
        candidateGeometry.index.count,
        Math.max( 0, sourceDrawCount - removedBeforeDrawEnd )
    );
}

export function createTrunkApertureLinerGeometry( sourceGeometry, trunkNodes )
{
    const region = getTrunkVisibilityRegion( sourceGeometry, trunkNodes );
    const sourcePosition = sourceGeometry.getAttribute( 'position' );
    const boundary = [];
    for ( let side = region.angularStartSide;
        side <= region.angularEndSide;
        side += 1 )
    {
        boundary.push( [ region.longitudinalStartRing, side ] );
    }
    for ( let ring = region.longitudinalStartRing + 1;
        ring <= region.longitudinalEndRing;
        ring += 1 )
    {
        boundary.push( [ ring, region.angularEndSide ] );
    }
    for ( let side = region.angularEndSide - 1;
        side >= region.angularStartSide;
        side -= 1 )
    {
        boundary.push( [ region.longitudinalEndRing, side ] );
    }
    for ( let ring = region.longitudinalEndRing - 1;
        ring > region.longitudinalStartRing;
        ring -= 1 )
    {
        boundary.push( [ ring, region.angularStartSide ] );
    }

    const vertices = [];
    const indices = [];
    const recessFraction = 0.19;
    for ( let edge = 0; edge < boundary.length; edge += 1 )
    {
        const [ ringA, sideA ] = boundary[edge];
        const [ ringB, sideB ] = boundary[( edge + 1 ) % boundary.length];
        const outerA = new THREE.Vector3().fromBufferAttribute(
            sourcePosition,
            ringA * region.radialSegments + sideA
        );
        const outerB = new THREE.Vector3().fromBufferAttribute(
            sourcePosition,
            ringB * region.radialSegments + sideB
        );
        const innerA = outerA.clone().lerp(
            getRingCentre( sourcePosition, ringA, region.radialSegments ),
            recessFraction
        );
        const innerB = outerB.clone().lerp(
            getRingCentre( sourcePosition, ringB, region.radialSegments ),
            recessFraction
        );
        const offset = vertices.length / 3;
        for ( const vertex of [ outerA, outerB, innerA, innerB ] )
        {
            vertices.push( vertex.x, vertex.y, vertex.z );
        }
        indices.push( offset, offset + 2, offset + 1 );
        indices.push( offset + 1, offset + 2, offset + 3 );
    }
    const liner = new THREE.BufferGeometry();
    liner.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
    liner.setIndex( indices );
    liner.computeVertexNormals();
    liner.computeBoundingSphere();
    liner.userData.trunkVisibilityLiner = {
        ...region,
        boundarySegmentCount: boundary.length,
        triangleCount: indices.length / 3,
        recessFraction,
        openBack: true
    };
    return liner;
}

export function createLocalTrunkVisibilityProxyGeometry( sourceGeometry, trunkNodes )
{
    const region = getTrunkVisibilityRegion( sourceGeometry, trunkNodes );
    const sourcePosition = sourceGeometry.getAttribute( 'position' );
    const sourceNormal = sourceGeometry.getAttribute( 'normal' );
    const startRing = Math.max( 1, region.longitudinalStartRing - 2 );
    const endRing = Math.min(
        region.sideRingCount - 1,
        region.longitudinalEndRing + 2
    );
    const vertices = [];
    const normals = [];
    const indices = [];
    for ( let ring = startRing; ring <= endRing; ring += 1 )
    {
        for ( let side = 0; side < region.radialSegments; side += 1 )
        {
            const sourceIndex = ring * region.radialSegments + side;
            vertices.push(
                sourcePosition.getX( sourceIndex ),
                sourcePosition.getY( sourceIndex ),
                sourcePosition.getZ( sourceIndex )
            );
            normals.push(
                sourceNormal.getX( sourceIndex ),
                sourceNormal.getY( sourceIndex ),
                sourceNormal.getZ( sourceIndex )
            );
        }
    }
    const localRingCount = endRing - startRing + 1;
    for ( let ring = 0; ring < localRingCount - 1; ring += 1 )
    {
        for ( let side = 0; side < region.radialSegments; side += 1 )
        {
            const nextSide = ( side + 1 ) % region.radialSegments;
            const a = ring * region.radialSegments + side;
            const b = ( ring + 1 ) * region.radialSegments + side;
            const c = ( ring + 1 ) * region.radialSegments + nextSide;
            const d = ring * region.radialSegments + nextSide;
            indices.push( a, d, b, b, d, c );
        }
    }
    const startCentre = getRingCentre( sourcePosition, startRing, region.radialSegments );
    const endCentre = getRingCentre( sourcePosition, endRing, region.radialSegments );
    const startCentreIndex = vertices.length / 3;
    vertices.push( startCentre.x, startCentre.y, startCentre.z );
    const endCentreIndex = vertices.length / 3;
    vertices.push( endCentre.x, endCentre.y, endCentre.z );
    const capAxis = endCentre.clone().sub( startCentre ).normalize();
    normals.push( -capAxis.x, -capAxis.y, -capAxis.z );
    normals.push( capAxis.x, capAxis.y, capAxis.z );
    const lastRingStart = ( localRingCount - 1 ) * region.radialSegments;
    for ( let side = 0; side < region.radialSegments; side += 1 )
    {
        const nextSide = ( side + 1 ) % region.radialSegments;
        indices.push( startCentreIndex, nextSide, side );
        indices.push(
            endCentreIndex,
            lastRingStart + side,
            lastRingStart + nextSide
        );
    }
    const proxy = new THREE.BufferGeometry();
    proxy.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
    proxy.setAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );
    proxy.setIndex( indices );
    proxy.computeBoundingSphere();
    const axis = endCentre.clone().sub( startCentre );
    proxy.userData.trunkVisibilityProxy = {
        ...region,
        sourceRingStart: startRing,
        sourceRingEnd: endRing,
        longitudinalCellCount: endRing - startRing,
        closed: true,
        triangleCount: indices.length / 3,
        startCentre: startCentre.toArray(),
        endCentre: endCentre.toArray(),
        axis: axis.clone().normalize().toArray(),
        axisLength: axis.length()
    };
    return proxy;
}

function getInternalRootVisibilityRange( sourceGeometry, trunkNodes )
{
    const metadata = sourceGeometry.userData.monumentalTrunk;
    const entrySpanIndex = trunkNodes.findIndex( ( node, index ) =>
        node.id === 'exchange' && trunkNodes[index + 1]?.id === 'meaning'
    );
    const exitSpanIndex = trunkNodes.findIndex( ( node, index ) =>
        node.id === 'planting-root' && trunkNodes[index + 1]?.id === 'uptake'
    );
    if ( !metadata || entrySpanIndex < 0 || exitSpanIndex < 0 )
    {
        throw new Error(
            'Internal-root visibility requires the authored lower trunk spans.'
        );
    }
    return {
        entrySpanIndex,
        exitSpanIndex,
        startRing: 1 + exitSpanIndex * metadata.samplesPerSpan,
        endRing: 1 + ( entrySpanIndex + 1 ) * metadata.samplesPerSpan,
        radialSegments: metadata.radialSegments,
        baseIndexCount: metadata.baseIndexCount
    };
}

export function createInternalRootVisibilityProxyGeometry(
    sourceGeometry,
    trunkNodes
)
{
    const range = getInternalRootVisibilityRange( sourceGeometry, trunkNodes );
    const sourcePosition = sourceGeometry.getAttribute( 'position' );
    const sourceNormal = sourceGeometry.getAttribute( 'normal' );
    const vertices = [];
    const normals = [];
    const indices = [];
    for ( let ring = range.startRing; ring <= range.endRing; ring += 1 )
    {
        for ( let side = 0; side < range.radialSegments; side += 1 )
        {
            const sourceIndex = ring * range.radialSegments + side;
            vertices.push(
                sourcePosition.getX( sourceIndex ),
                sourcePosition.getY( sourceIndex ),
                sourcePosition.getZ( sourceIndex )
            );
            normals.push(
                sourceNormal.getX( sourceIndex ),
                sourceNormal.getY( sourceIndex ),
                sourceNormal.getZ( sourceIndex )
            );
        }
    }
    const ringCount = range.endRing - range.startRing + 1;
    for ( let ring = 0; ring < ringCount - 1; ring += 1 )
    {
        for ( let side = 0; side < range.radialSegments; side += 1 )
        {
            const nextSide = ( side + 1 ) % range.radialSegments;
            const a = ring * range.radialSegments + side;
            const b = ( ring + 1 ) * range.radialSegments + side;
            const c = ( ring + 1 ) * range.radialSegments + nextSide;
            const d = ring * range.radialSegments + nextSide;
            indices.push( a, d, b, b, d, c );
        }
    }
    const startCentre = getRingCentre(
        sourcePosition,
        range.startRing,
        range.radialSegments
    );
    const endCentre = getRingCentre(
        sourcePosition,
        range.endRing,
        range.radialSegments
    );
    const startCentreIndex = vertices.length / 3;
    vertices.push( ...startCentre.toArray() );
    const endCentreIndex = vertices.length / 3;
    vertices.push( ...endCentre.toArray() );
    const capAxis = endCentre.clone().sub( startCentre ).normalize();
    normals.push( -capAxis.x, -capAxis.y, -capAxis.z );
    normals.push( capAxis.x, capAxis.y, capAxis.z );
    const lastRingStart = ( ringCount - 1 ) * range.radialSegments;
    for ( let side = 0; side < range.radialSegments; side += 1 )
    {
        const nextSide = ( side + 1 ) % range.radialSegments;
        indices.push( startCentreIndex, nextSide, side );
        indices.push(
            endCentreIndex,
            lastRingStart + side,
            lastRingStart + nextSide
        );
    }
    const proxy = new THREE.BufferGeometry();
    proxy.setAttribute(
        'position',
        new THREE.Float32BufferAttribute( vertices, 3 )
    );
    proxy.setAttribute(
        'normal',
        new THREE.Float32BufferAttribute( normals, 3 )
    );
    proxy.setIndex( indices );
    proxy.computeBoundingSphere();
    proxy.userData.internalRootVisibilityProxy = {
        ...range,
        closed: true,
        ringCount,
        triangleCount: indices.length / 3
    };
    return proxy;
}

export function createInternalRootVisibilityOwnershipGeometry(
    sourceGeometry,
    trunkNodes
)
{
    const range = getInternalRootVisibilityRange( sourceGeometry, trunkNodes );
    const sourceIndices = sourceGeometry.index.array;
    const indices = [];
    for ( let ring = range.startRing; ring < range.endRing; ring += 1 )
    {
        for ( let side = 0; side < range.radialSegments; side += 1 )
        {
            const offset = range.baseIndexCount
                + ( ring * range.radialSegments + side ) * 6;
            for ( let index = 0; index < 6; index += 1 )
            {
                indices.push( sourceIndices[offset + index] );
            }
        }
    }
    const ownership = sourceGeometry.clone();
    ownership.setIndex( indices );
    ownership.computeBoundingSphere();
    ownership.userData.internalRootVisibilityOwnership = {
        ...range,
        fullCircumference: true,
        cellCount: ( range.endRing - range.startRing )
            * range.radialSegments,
        triangleCount: indices.length / 3
    };
    return ownership;
}

export function createEngineeredTreeLayer( hierarchy, initialPositions, initialParameters = {} )
{
    const group = new THREE.Group();
    group.name = 'engineered-tree-body';
    const internalRouterJunctionEnabled =
        initialParameters.internalRouterJunctionEnabled === true;
    const internalRouterTransportEnabled = internalRouterJunctionEnabled
        && initialParameters.internalRouterTransportEnabled === true;
    let internalRouterPresentationEnabled = internalRouterTransportEnabled
        && initialParameters.internalRouterPresentationEnabled === true;
    let internalRouterJunctionFormEnabled = internalRouterTransportEnabled
        && initialParameters.internalRouterJunctionFormEnabled === true;
    let internalRouterJunctionFormCircumference =
        normaliseInternalRouterJunctionFormCircumference(
            initialParameters.internalRouterJunctionFormCircumference
        );
    const trunkRuneCandidateId = initialParameters.trunkRuneCandidateId
        ?? defaultTrunkRuneCandidateId;
    const trunk = createMaterial( 0x160f0c, 0.38, 0.62 );
    const limb = createMaterial( 0x121517, 0.34, 0.68 );
    const terminal = createMaterial( 0x1b1e1e, 0.3, 0.61 );
    const informationCore = createInformationCoreMaterial();
    const interiorSkeleton = createInteriorSkeletonMaterial();
    const internalRouterDiagnostic = createMaterial( 0xd8dfdc, 0.76, 0.08 );
    internalRouterDiagnostic.material.name = 'D1 internal router neutral diagnostic';
    const internalRouterJunctionIngress = createInternalRouterTransportMaterial(
        0x00c9ff,
        0.92,
        false
    );
    const internalRouterJunctionIngressMaterial =
        internalRouterJunctionIngress.material;
    internalRouterJunctionIngressMaterial.name = 'D2 cyan ingress diagnostic';
    const internalRouterJunctionTrace = createInternalRouterTransportMaterial(
        0x00c9ff,
        0.5,
        false
    );
    const internalRouterJunctionTraceMaterial =
        internalRouterJunctionTrace.material;
    internalRouterJunctionTraceMaterial.name = 'D2 cyan ingress trace diagnostic';
    const internalRouterJunctionOutput = createInternalRouterTransportMaterial(
        0xffd36b,
        0.94,
        false
    );
    const internalRouterJunctionOutputMaterial =
        internalRouterJunctionOutput.material;
    internalRouterJunctionOutputMaterial.name = 'D2 parked gold output diagnostic';
    const internalRouterTransportPacket = createInternalRouterTransportMaterial(
        0xffd36b,
        0.96,
        true
    );
    internalRouterTransportPacket.material.name =
        'D3 gold transport packet diagnostic';
    const internalRouterTransportGuide = createInternalRouterTransportMaterial(
        0x9aa7a5,
        0.27,
        false
    );
    internalRouterTransportGuide.material.name =
        'D3 internal router centreline guide';
    const trunkRuneMaterial = createTrunkRuneMaterial(
        trunk.uniforms,
        trunkRuneCandidateId
    );
    const apertureLiner = createMaterial( 0x080a0a, 0.82, 0.18 );
    apertureLiner.material.side = THREE.DoubleSide;
    apertureLiner.material.name = 'C2 recessed aperture liner';
    const materialEntries = [
        trunk,
        limb,
        terminal,
        interiorSkeleton,
        internalRouterDiagnostic,
        apertureLiner
    ];
    let latestMotionParameters = initialParameters;

    function updateRootedMotionUniforms( entry, elapsed, parameters )
    {
        entry.uniforms.time.value = elapsed;
        entry.uniforms.response.value = parameters.motionFrozen
            ? 0
            : ( parameters.structuralResponse ?? 0.22 );
        entry.uniforms.gustMix.value = parameters.canopyGustCandidate === true
            ? 1
            : 0;
        entry.uniforms.intervalBase.value = parameters.gustIntervalBase ?? 0;
    }
    for ( const entry of materialEntries )
    {
        updateRootedMotionUniforms( entry, 0, initialParameters );
    }
    updateRootedMotionUniforms( informationCore, 0, initialParameters );
    let growthProgress = new Map();
    let surfaceVisible = true;
    let interiorDiagnosticVisible = false;
    let internalRouterDiagnosticVisible = false;
    let internalRouterJunctionDiagnosticVisible = false;
    let internalRouterTransportDiagnosticVisible = false;
    let trunkVisibilityMode = 'off';
    let trunkMesh = null;
    let apertureTrunkMesh = null;
    let apertureLinerMesh = null;
    let trunkVisibilityProxyGeometry = null;
    let trunkVisibilityOwnershipGeometry = null;
    let trunkRuneVisibilityProxyGeometry = null;
    let trunkRuneVisibilityOwnershipGeometry = null;
    let trunkVisibilityResourceRevision = 0;
    let interiorSkeletonMesh = null;
    let internalRouterMesh = null;
    let internalRouterResourceRevision = 0;
    let internalRouterMaximumTier = normaliseInternalRouterTiers(
        initialParameters.internalRouterTiers
    );
    let internalRouterConstruction = null;
    let internalRouterJunctionDiagnosticGroup = null;
    let internalRouterJunctionIngressMesh = null;
    let internalRouterJunctionIngressTrace = null;
    let internalRouterJunctionOutputMesh = null;
    let internalRouterJunctionResourceRevision = 0;
    let internalRouterJunctionLastEventAt = null;
    const internalRouterJunctionLedger = createInternalRouterJunctionLedger();
    const internalRouterTransport = createInternalRouterTransport();
    let internalRouterTransportDiagnosticGroup = null;
    let internalRouterTransportGuideLine = null;
    let internalRouterTransportPacketMesh = null;
    let internalRouterTransportPacketCapacity = 0;
    let internalRouterTransportResourceRevision = 0;
    let internalRouterJunctionFormGeometry = null;
    let internalRouterJunctionFormResourceRevision = 0;
    let internalRouterJunctionFormState = Object.freeze( {
        active: false,
        maximumSignal: 0,
        activeManifestationCount: 0,
        activeManifestationIds: Object.freeze( [] )
    } );
    let internalRouterJunctionFormManifestations = Object.freeze( [] );
    let internalRouterJunctionFormManifestationOverflowCount = 0;
    let informationRoute = null;
    let informationRoutes = [];
    let informationTraffic = null;
    let informationPacketRadius = informationCoreRadius;
    let trafficEdges = [];
    let trafficEdgeByChildId = new Map();
    let emitters = [];
    let activePackets = [];
    let routeManifestedAt = new Map();
    let informationLastElapsed = null;
    let informationLastFrequency = null;
    let emittedPacketCount = 0;
    let trunkRunesVisible = initialParameters.trunkRunesVisible ?? true;
    let trunkRuneMesh = null;
    let trunkRuneGranuleMesh = null;
    let trunkRuneResourceRevision = 0;
    let trunkRunePathLength = 0;
    let trunkRunePathProfile = null;
    let trunkRunePathProfiles = new Map();
    let trunkRuneDepartureRecords = [];
    let trunkRuneTransductionRecords = [];
    let trunkRuneResumeRecords = [];
    let trunkRuneDepartureCount = 0;
    let trunkRuneConsumptionCount = 0;
    let trunkRuneOutputCount = 0;
    let trunkRuneResumeCount = 0;
    let inRunePackets = [];

    function replaceInternalRouterTree( requestedMaximumTier )
    {
        const maximumTier = normaliseInternalRouterTiers(
            requestedMaximumTier
        );
        internalRouterMaximumTier = maximumTier;
        if ( !internalRouterConstruction ) return false;

        const currentDescriptor = internalRouterMesh?.geometry.userData
            .internalRouterTree?.descriptor;
        if ( currentDescriptor?.maximumTier === maximumTier ) return false;

        const constructionStarted = performance.now();
        const descriptor = createInternalRouterTreeDescriptor( {
            ...internalRouterConstruction,
            maximumTier
        } );
        const geometry = createInternalRouterTreeGeometry( descriptor );
        geometry.userData.internalRouterTree.constructionTimeMs =
            performance.now() - constructionStarted;
        if ( internalRouterMesh )
        {
            const previousGeometry = internalRouterMesh.geometry;
            internalRouterMesh.geometry = geometry;
            previousGeometry.dispose();
        }
        else
        {
            internalRouterMesh = new THREE.Mesh(
                geometry,
                internalRouterDiagnostic.material
            );
            internalRouterMesh.name = 'D1 inverted internal router diagnostic';
            internalRouterMesh.userData.internalRouterTree = true;
            group.add( internalRouterMesh );
        }
        internalRouterMesh.visible = internalRouterDiagnosticVisible
            && !internalRouterTransportDiagnosticVisible;
        internalRouterResourceRevision += 1;
        replaceInternalRouterTransportGuide( descriptor );
        if ( informationTraffic ) replaceInternalRouterJunctionFormGeometry();
        updateInternalRouterTransportMetadata();
        updateInternalRouterJunctionMetadata();
        return true;
    }

    function getInternalRouterDescriptor()
    {
        return internalRouterMesh?.geometry.userData.internalRouterTree
            ?.descriptor ?? null;
    }

    function replaceInternalRouterJunctionFormGeometry()
    {
        internalRouterJunctionFormGeometry?.dispose();
        internalRouterJunctionFormGeometry = null;
        internalRouterJunctionFormManifestations = Object.freeze( [] );
        internalRouterJunctionFormManifestationOverflowCount = 0;
        internalRouterJunctionFormState = Object.freeze( {
            active: false,
            maximumSignal: 0,
            activeManifestationCount: 0,
            activeManifestationIds: Object.freeze( [] )
        } );
        if ( !internalRouterTransportEnabled ) return;
        const descriptor = getInternalRouterDescriptor();
        if ( !descriptor ) return;
        internalRouterJunctionFormGeometry =
            createInternalRouterJunctionFormGeometry(
                descriptor,
                informationPacketRadius,
                internalRouterJunctionFormCircumference,
                internalRouterConstruction?.envelope ?? null
            );
        internalRouterJunctionFormResourceRevision += 1;
    }

    function createInternalRouterJunctionDiagnostic()
    {
        internalRouterJunctionDiagnosticGroup = null;
        internalRouterJunctionIngressMesh = null;
        internalRouterJunctionIngressTrace = null;
        internalRouterJunctionOutputMesh = null;
        if ( !internalRouterJunctionEnabled ) return;

        const descriptor = getInternalRouterDescriptor();
        if ( !descriptor ) return;
        const rootPoint = new THREE.Vector3().fromArray( descriptor.seedPoint );
        const diagnostic = new THREE.Group();
        diagnostic.name = 'D2 internal router junction diagnostic';
        diagnostic.userData.internalRouterJunctionDiagnostic = true;

        const ingress = new THREE.Mesh(
            new THREE.SphereGeometry( 0.055, 14, 10 ),
            internalRouterJunctionIngressMaterial
        );
        ingress.name = 'D2 cyan ingress packet';
        ingress.userData.internalRouterJunctionIngress = true;
        internalRouterJunctionIngress.uniforms.offset.value.copy( rootPoint );
        ingress.visible = false;
        diagnostic.add( ingress );

        const traceGeometry = new THREE.BufferGeometry();
        const tracePosition = new THREE.Float32BufferAttribute(
            new Float32Array( internalRouterJunctionTraceSamples * 3 ),
            3
        );
        tracePosition.setUsage( THREE.DynamicDrawUsage );
        traceGeometry.setAttribute( 'position', tracePosition );
        traceGeometry.setDrawRange( 0, 0 );
        const trace = new THREE.Line(
            traceGeometry,
            internalRouterJunctionTraceMaterial
        );
        trace.name = 'D2 cyan ingress continuity trace';
        trace.userData.internalRouterJunctionIngressTrace = true;
        trace.visible = false;
        diagnostic.add( trace );

        const output = new THREE.Mesh(
            new THREE.SphereGeometry( 0.032, 14, 10 ),
            internalRouterJunctionOutputMaterial
        );
        output.name = 'D2 gold output parked at router root';
        output.userData.internalRouterJunctionOutput = true;
        internalRouterJunctionOutput.uniforms.offset.value.copy( rootPoint );
        output.visible = false;
        diagnostic.add( output );

        diagnostic.visible = false;
        group.add( diagnostic );
        internalRouterJunctionDiagnosticGroup = diagnostic;
        internalRouterJunctionIngressMesh = ingress;
        internalRouterJunctionIngressTrace = trace;
        internalRouterJunctionOutputMesh = output;
        internalRouterJunctionResourceRevision += 1;
    }

    function createInternalRouterTransportGuideGeometry( descriptor )
    {
        const positions = [];
        for ( const edge of descriptor.edges )
        {
            const points = edge.audit.centrelinePoints;
            for ( let index = 0; index < edge.audit.sampleCount - 1; index += 1 )
            {
                const left = index * 3;
                const right = ( index + 1 ) * 3;
                positions.push(
                    points[left],
                    points[left + 1],
                    points[left + 2],
                    points[right],
                    points[right + 1],
                    points[right + 2]
                );
            }
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute( positions, 3 )
        );
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        geometry.userData.internalRouterTransportGuide = {
            candidateId: internalRouterTransportCandidateId,
            maximumTier: descriptor.maximumTier,
            edgeCount: descriptor.edgeCount,
            segmentCount: positions.length / 6,
            objectSpace: true,
            cameraFacing: false
        };
        return geometry;
    }

    function replaceInternalRouterTransportGuide( descriptor )
    {
        if ( !internalRouterTransportGuideLine ) return;
        const previous = internalRouterTransportGuideLine.geometry;
        internalRouterTransportGuideLine.geometry =
            createInternalRouterTransportGuideGeometry( descriptor );
        previous.dispose();
    }

    function ensureInternalRouterTransportPacketCapacity( required )
    {
        if ( !internalRouterTransportDiagnosticGroup ) return;
        if ( internalRouterTransportPacketMesh
            && internalRouterTransportPacketCapacity >= required )
        {
            return;
        }
        let nextCapacity = Math.max(
            internalRouterTransportInitialCapacity,
            internalRouterTransportPacketCapacity
        );
        while ( nextCapacity < required ) nextCapacity *= 2;

        const replacement = new THREE.InstancedMesh(
            new THREE.SphereGeometry( 0.028, 12, 8 ),
            internalRouterTransportPacket.material,
            nextCapacity
        );
        replacement.name = 'D3 independent gold router packets';
        replacement.userData.internalRouterTransportPackets = true;
        replacement.instanceMatrix.setUsage( THREE.DynamicDrawUsage );
        replacement.count = 0;
        replacement.frustumCulled = false;
        replacement.visible = internalRouterTransportDiagnosticVisible;
        if ( internalRouterTransportPacketMesh )
        {
            internalRouterTransportDiagnosticGroup.remove(
                internalRouterTransportPacketMesh
            );
            internalRouterTransportPacketMesh.dispose();
            internalRouterTransportPacketMesh.geometry.dispose();
        }
        internalRouterTransportDiagnosticGroup.add( replacement );
        internalRouterTransportPacketMesh = replacement;
        internalRouterTransportPacketCapacity = nextCapacity;
        internalRouterTransportResourceRevision += 1;
    }

    function createInternalRouterTransportDiagnostic()
    {
        internalRouterTransportDiagnosticGroup = null;
        internalRouterTransportGuideLine = null;
        internalRouterTransportPacketMesh = null;
        internalRouterTransportPacketCapacity = 0;
        if ( !internalRouterTransportEnabled ) return;

        const descriptor = getInternalRouterDescriptor();
        if ( !descriptor ) return;
        const diagnostic = new THREE.Group();
        diagnostic.name = 'D3 internal router transport diagnostic';
        diagnostic.userData.internalRouterTransportDiagnostic = true;

        const guide = new THREE.LineSegments(
            createInternalRouterTransportGuideGeometry( descriptor ),
            internalRouterTransportGuide.material
        );
        guide.name = 'D3 internal router centreline guide';
        guide.userData.internalRouterTransportGuide = true;
        guide.visible = false;
        diagnostic.add( guide );

        diagnostic.visible = false;
        group.add( diagnostic );
        internalRouterTransportDiagnosticGroup = diagnostic;
        internalRouterTransportGuideLine = guide;
        ensureInternalRouterTransportPacketCapacity(
            internalRouterTransportInitialCapacity
        );
        internalRouterTransportResourceRevision += 1;
    }

    function updateInternalRouterTransportMetadata()
    {
        if ( !internalRouterTransportEnabled )
        {
            delete group.userData.internalRouterTransport;
            return;
        }
        const descriptor = getInternalRouterDescriptor();
        const junction = internalRouterJunctionLedger.snapshot();
        const transport = internalRouterTransport.snapshot();
        const pendingAtRootCount = junction.outputCount
            - transport.dispatchCount;
        const currentRouteEpoch = descriptor
            ? createInternalRouterRouteEpoch( descriptor )
            : null;
        const staleEpochActiveCount = transport.activePackets.filter(
            ( packet ) => packet.routeAssignment.routeEpoch !== currentRouteEpoch
        ).length;
        const currentEpochRoutes = transport.routeDispatchCounts.filter(
            ( route ) => route.routeEpoch === currentRouteEpoch
        );
        const visualPacketCount = internalRouterTransportPacketMesh?.count ?? 0;
        group.userData.internalRouterTransport = {
            ...transport,
            enabled: true,
            diagnosticOnly: true,
            diagnosticVisible: internalRouterTransportDiagnosticVisible,
            productionVisible: false,
            packetConnected: true,
            junctionImplemented: true,
            transportImplemented: true,
            presentationImplemented: true,
            presentationCandidateId: internalRouterPresentationCandidateId,
            currentRouterEpoch: currentRouteEpoch,
            currentMaximumTier: descriptor?.maximumTier ?? null,
            currentRouteCapacity: descriptor?.routeCount ?? 0,
            currentSelectedRouteCount: currentEpochRoutes.length,
            currentSharedRouteCount: currentEpochRoutes.filter( ( route ) =>
                route.count > 1
            ).length,
            producedOutputCount: junction.outputCount,
            pendingAtRootCount,
            arrivalCount: transport.completionCount,
            staleEpochActiveCount,
            routeEpochPolicy: 'in-flight-snapshots-finish;new-packets-use-current',
            conservation: Object.freeze( {
                produced: junction.outputCount,
                dispatched: transport.dispatchCount,
                pendingAtRoot: pendingAtRootCount,
                active: transport.activePacketCount,
                arrived: transport.completionCount,
                handoffBalance: junction.outputCount
                    - transport.dispatchCount - pendingAtRootCount,
                lifecycleBalance: transport.dispatchCount
                    - transport.activePacketCount - transport.completionCount,
                retainedOutputIdsUnique:
                    transport.conservation.retainedOutputIdsUnique
            } ),
            visualPacketCapacity: internalRouterTransportPacketCapacity,
            visualPacketCount,
            visualOverflowCount: Math.max(
                0,
                transport.activePacketCount - internalRouterTransportPacketCapacity
            ),
            meshCount: 2,
            maximumDrawCalls: 2,
            activeDrawCalls: internalRouterTransportDiagnosticVisible
                ? 1 + ( transport.activePacketCount > 0 ? 1 : 0 )
                : 0,
            resourceRevision: internalRouterTransportResourceRevision
        };
        updateInternalRouterPresentationMetadata();
    }

    function updateInternalRouterPresentationMetadata()
    {
        if ( !internalRouterTransportEnabled )
        {
            delete group.userData.internalRouterPresentation;
            return;
        }
        const transport = internalRouterTransport.snapshot();
        const activePacketIds = Object.freeze(
            transport.activePackets.map( ( packet ) => packet.id )
        );
        const rendererEligible = Boolean(
            trunkMesh
            && trunkRuneVisibilityProxyGeometry
        );
        const presentationVisible = internalRouterPresentationEnabled
            && surfaceVisible
            && trunkVisibilityMode === 'off'
            && rendererEligible
            && transport.activePacketCount > 0;
        group.userData.internalRouterPresentation = {
            candidateId: internalRouterPresentationCandidateId,
            reviewStatus: 'bounded-d4-presentation-experiment-awaiting-human-review',
            enabled: internalRouterPresentationEnabled,
            presentationOnly: true,
            eventDriven: true,
            packetConnected: true,
            transportImplemented: true,
            aggregation: false,
            semanticClaim: 'packet-passage-not-aggregation',
            colourBoundary: 'cyan-input-to-cosmos-gold-output-at-rune',
            morphology: 'canopy-equivalent-head-and-wake',
            productionVisible: presentationVisible,
            packetOnlyDisclosure: true,
            persistentDisclosure: false,
            fullRouterInventoryVisible: false,
            guideVisible: false,
            objectSpace: true,
            cameraFacing: false,
            greaterDepth: false,
            rendererEligible,
            occlusionModel: 'lower-trunk-front-and-back-depth-envelope',
            activePacketCount: transport.activePacketCount,
            submittedTrailCount: presentationVisible
                ? transport.activePacketCount
                : 0,
            activePacketIds,
            sourceTransportCandidateId: transport.candidateId,
            sourceTransportResourceRevision:
                internalRouterTransportResourceRevision,
            rendererActive: false,
            activeDrawCalls: 0
        };
    }

    function collectInternalRouterJunctionFormManifestations()
    {
        internalRouterJunctionFormManifestationOverflowCount = 0;
        const effectiveEnabled = internalRouterJunctionFormEnabled
            && internalRouterPresentationEnabled;
        const descriptor = getInternalRouterDescriptor();
        if ( !effectiveEnabled || !descriptor ) return Object.freeze( [] );
        const manifestations = [];
        const site = descriptor.seedSite;
        for ( const packet of activePackets )
        {
            if ( packet.kind !== 'source' ) continue;
            const segment = packet.route.byChildId.get( site.childId );
            if ( !segment || segment.parentId !== site.parentId ) continue;
            const boundaryDistance = THREE.MathUtils.lerp(
                segment.parentDistance,
                segment.childDistance,
                site.localProgress
            );
            const remaining = boundaryDistance - packet.headDistance;
            if ( remaining < -1e-9
                || remaining > internalRouterJunctionFormStyle.approachDistance
                || packet.headDistance + 1e-9 < segment.childDistance )
            {
                continue;
            }
            manifestations.push( Object.freeze( {
                id: `${packet.id}::junction-form-approach`,
                kind: 'cyan-approach',
                sourcePacketId: packet.id,
                outputPacketId: null,
                terminalId: packet.terminalId,
                occurredAt: null,
                remainingDistance: remaining,
                headPhase: 0.5 * ( 1 - remaining
                    / internalRouterJunctionFormStyle.approachDistance )
            } ) );
        }

        const transport = internalRouterTransport.snapshot();
        const recordByOutputId = new Map(
            internalRouterJunctionLedger.snapshot().transductionRecords.map(
                ( record ) => [ record.outputPacketId, record ]
            )
        );
        for ( const packet of transport.activePackets )
        {
            const headPhase = 0.5 + 0.5 * packet.headDistance
                / internalRouterJunctionFormStyle.departureDistance;
            if ( headPhase > 1 + internalRouterJunctionFormStyle.wakeLength )
            {
                continue;
            }
            const record = recordByOutputId.get( packet.outputPacketId );
            if ( !record ) continue;
            manifestations.push( Object.freeze( {
                id: `${record.id}::junction-form-departure`,
                kind: 'gold-departure',
                sourcePacketId: record.sourcePacketId,
                outputPacketId: record.outputPacketId,
                terminalId: record.terminalId,
                occurredAt: record.outputAt,
                remainingDistance: null,
                headPhase
            } ) );
        }
        internalRouterJunctionFormManifestationOverflowCount = Math.max(
            0,
            manifestations.length
                - internalRouterJunctionFormStyle.maximumManifestations
        );
        return Object.freeze( manifestations.slice(
            0,
            internalRouterJunctionFormStyle.maximumManifestations
        ) );
    }

    function updateInternalRouterJunctionFormMetadata()
    {
        if ( !internalRouterTransportEnabled
            || !internalRouterJunctionFormGeometry )
        {
            delete group.userData.internalRouterJunctionForm;
            return;
        }
        const geometry = internalRouterJunctionFormGeometry.userData
            .internalRouterJunctionForm;
        const effectiveEnabled = internalRouterJunctionFormEnabled
            && internalRouterPresentationEnabled;
        group.userData.internalRouterJunctionForm = {
            ...geometry,
            enabled: internalRouterJunctionFormEnabled,
            effectiveEnabled,
            presentationOnly: true,
            eventDriven: true,
            packetConnected: true,
            transportImplemented: true,
            semanticClaim: 'one-to-one-transduction-presentation',
            aggregation: false,
            sourceColour: informationPacketVisualProfile.sourceColour,
            outputColour: informationPacketVisualProfile.outputColour,
            productionVisible: effectiveEnabled
                && internalRouterJunctionFormState.active
                && surfaceVisible
                && trunkVisibilityMode === 'off',
            activeManifestationCount:
                internalRouterJunctionFormState.activeManifestationCount,
            activeManifestationIds:
                internalRouterJunctionFormState.activeManifestationIds,
            activeManifestations: internalRouterJunctionFormManifestations,
            maximumSignal: internalRouterJunctionFormState.maximumSignal,
            maximumManifestations:
                internalRouterJunctionFormStyle.maximumManifestations,
            manifestationOverflowCount:
                internalRouterJunctionFormManifestationOverflowCount,
            rendererActive: false,
            activeDrawCalls: 0,
            resourceRevision: internalRouterJunctionFormResourceRevision
        };
    }

    function refreshInternalRouterJunctionForm()
    {
        if ( !internalRouterJunctionFormGeometry )
        {
            updateInternalRouterJunctionFormMetadata();
            return;
        }
        internalRouterJunctionFormManifestations =
            collectInternalRouterJunctionFormManifestations();
        internalRouterJunctionFormState =
            setInternalRouterJunctionFormManifestations(
                internalRouterJunctionFormGeometry,
                internalRouterJunctionFormManifestations
            );
        updateInternalRouterJunctionFormMetadata();
    }

    function refreshInternalRouterTransportDiagnostic(
        elapsed = 0,
        parameters = latestMotionParameters
    )
    {
        if ( !internalRouterTransportDiagnosticGroup )
        {
            updateInternalRouterTransportMetadata();
            return;
        }
        const transport = internalRouterTransport.snapshot();
        ensureInternalRouterTransportPacketCapacity(
            transport.activePacketCount
        );
        const transform = new THREE.Matrix4();
        for ( let index = 0; index < transport.activePackets.length; index += 1 )
        {
            transform.makeTranslation( ...transport.activePackets[index].position );
            internalRouterTransportPacketMesh.setMatrixAt( index, transform );
        }
        internalRouterTransportPacketMesh.count = transport.activePacketCount;
        internalRouterTransportPacketMesh.instanceMatrix.needsUpdate = true;

        for ( const entry of [
            internalRouterTransportPacket,
            internalRouterTransportGuide
        ] )
        {
            updateRootedMotionUniforms( entry, elapsed, parameters );
        }
        internalRouterTransportGuideLine.visible =
            internalRouterTransportDiagnosticVisible;
        internalRouterTransportPacketMesh.visible =
            internalRouterTransportDiagnosticVisible
            && transport.activePacketCount > 0;
        internalRouterTransportDiagnosticGroup.visible =
            internalRouterTransportDiagnosticVisible;
        updateInternalRouterTransportMetadata();
        updateInternalRouterJunctionMetadata();
    }

    function updateInternalRouterJunctionMetadata()
    {
        if ( !internalRouterJunctionEnabled )
        {
            delete group.userData.internalRouterJunction;
            return;
        }
        const descriptor = getInternalRouterDescriptor();
        const ledger = internalRouterJunctionLedger.snapshot();
        const transport = internalRouterTransport.snapshot();
        const releasedOutputCount = internalRouterTransportEnabled
            ? transport.dispatchCount
            : 0;
        const parkedOutputCount = ledger.outputCount - releasedOutputCount;
        const routerRootPoint = descriptor
            ? Object.freeze( Array.from( descriptor.seedPoint, Number ) )
            : null;
        group.userData.internalRouterJunction = {
            candidateId: internalRouterJunctionCandidateId,
            reviewStatus: 'bounded-d2-junction-experiment-awaiting-human-review',
            enabled: true,
            packetConnected: true,
            junctionImplemented: true,
            transportImplemented: internalRouterTransportEnabled,
            semanticClaim: 'transduction',
            mode: 'one-to-one',
            aggregation: false,
            spatialConvergenceClaim: false,
            coordinateContinuous: ledger.maximumCoordinateSeparation <= 2e-6,
            maximumCoordinateSeparation: ledger.maximumCoordinateSeparation,
            siteId: descriptor?.seedSite.id ?? null,
            parentId: descriptor?.seedSite.parentId ?? null,
            childId: descriptor?.seedSite.childId ?? null,
            boundaryLocalProgress: descriptor?.seedSite.localProgress ?? null,
            routerRootNodeId: descriptor?.nodes.find( ( node ) =>
                node.parentId === null
            )?.id ?? null,
            routerRootPoint,
            outputState: internalRouterTransportEnabled
                ? 'created-at-root-then-dispatched'
                : 'parked-at-router-root',
            assignedRouteCount: releasedOutputCount,
            selectedRouterRouteIds: internalRouterTransportEnabled
                ? transport.selectedRouterRouteIds
                : Object.freeze( [] ),
            entryCount: ledger.entryCount,
            consumptionCount: ledger.consumptionCount,
            outputCount: ledger.outputCount,
            parkedOutputCount,
            createdAtRouterRootCount: ledger.outputCount,
            releasedOutputCount,
            activeRouterPacketCount: internalRouterTransportEnabled
                ? transport.activePacketCount
                : 0,
            arrivedRouterPacketCount: internalRouterTransportEnabled
                ? transport.completionCount
                : 0,
            retainedEntryRecordCount: ledger.retainedEntryRecordCount,
            retainedTransductionRecordCount:
                ledger.retainedTransductionRecordCount,
            retainedParkedOutputCount: ledger.retainedParkedOutputCount,
            entryRecords: ledger.entryRecords,
            transductionRecords: ledger.transductionRecords,
            parkedOutputs: ledger.parkedOutputs,
            provenanceCardinality: 1,
            auditCapacity: ledger.auditCapacity,
            auditTruncated: ledger.auditTruncated,
            conservation: internalRouterTransportEnabled
                ? Object.freeze( {
                    entered: ledger.entryCount,
                    consumed: ledger.consumptionCount,
                    produced: ledger.outputCount,
                    parked: parkedOutputCount,
                    released: transport.dispatchCount,
                    active: transport.activePacketCount,
                    arrived: transport.completionCount,
                    sourceBalance: ledger.entryCount
                        - ledger.consumptionCount,
                    handoffBalance: ledger.outputCount
                        - parkedOutputCount - transport.dispatchCount,
                    transportBalance: transport.dispatchCount
                        - transport.activePacketCount
                        - transport.completionCount,
                    retainedSourceIdsUnique:
                        ledger.conservation.retainedSourceIdsUnique,
                    retainedOutputIdsUnique:
                        transport.conservation.retainedOutputIdsUnique
                } )
                : ledger.conservation,
            diagnosticVisible: internalRouterJunctionDiagnosticVisible,
            productionVisible: false,
            meshCount: 3,
            maximumDrawCalls: 3,
            activeDrawCalls: [
                internalRouterJunctionIngressMesh,
                internalRouterJunctionIngressTrace,
                internalRouterJunctionOutputMesh
            ].filter( ( mesh ) => mesh?.visible ).length,
            resourceRevision: internalRouterJunctionResourceRevision
        };
        updateInternalRouterTreeRuntimeMetadata();
    }

    function updateInternalRouterTreeRuntimeMetadata()
    {
        if ( !internalRouterMesh ) return;
        const metadata = internalRouterMesh.geometry.userData.internalRouterTree;
        const junction = group.userData.internalRouterJunction ?? null;
        group.userData.internalRouterTree = {
            ...metadata,
            diagnosticVisible: internalRouterDiagnosticVisible,
            productionVisible: false,
            packetConnected: internalRouterJunctionEnabled,
            junctionImplemented: internalRouterJunctionEnabled,
            transportImplemented: internalRouterTransportEnabled,
            junctionCandidateId: junction?.candidateId ?? null,
            junctionEventCount: junction?.outputCount ?? 0,
            parkedOutputCount: junction?.parkedOutputCount ?? 0,
            activeTransportPacketCount:
                group.userData.internalRouterTransport?.activePacketCount ?? 0,
            meshCount: 1,
            maximumDrawCalls: 1,
            activeDrawCalls: internalRouterDiagnosticVisible ? 1 : 0,
            resourceRevision: internalRouterResourceRevision
        };
    }

    function refreshInternalRouterJunctionDiagnostic(
        elapsed = 0,
        parameters = latestMotionParameters
    )
    {
        if ( !internalRouterJunctionDiagnosticGroup )
        {
            updateInternalRouterJunctionMetadata();
            return;
        }
        const descriptor = getInternalRouterDescriptor();
        const site = descriptor?.seedSite;
        for ( const entry of [
            internalRouterJunctionIngress,
            internalRouterJunctionTrace,
            internalRouterJunctionOutput
        ] )
        {
            updateRootedMotionUniforms( entry, elapsed, parameters );
        }
        if ( descriptor )
        {
            internalRouterJunctionOutput.uniforms.offset.value.fromArray(
                descriptor.seedPoint
            );
        }
        let ingressSample = null;
        if ( site )
        {
            for ( const packet of activePackets )
            {
                if ( packet.kind !== 'source' ) continue;
                const segment = packet.route.byChildId.get( site.childId );
                if ( !segment || segment.parentId !== site.parentId ) continue;
                const boundaryDistance = THREE.MathUtils.lerp(
                    segment.parentDistance,
                    segment.childDistance,
                    site.localProgress
                );
                const remaining = boundaryDistance - packet.headDistance;
                if ( remaining < -1e-9
                    || remaining > internalRouterJunctionIngressDistance
                    || packet.headDistance + 1e-9 < segment.childDistance )
                {
                    continue;
                }
                const reviewDistance = internalRouterJunctionIngressDistance * 0.45;
                const reviewScore = Math.abs( remaining - reviewDistance );
                if ( ingressSample && reviewScore >= ingressSample.reviewScore )
                {
                    continue;
                }
                const distanceSpan = segment.childDistance - segment.parentDistance;
                const localProgress = Math.abs( distanceSpan ) > 1e-9
                    ? THREE.MathUtils.clamp(
                        ( packet.headDistance - segment.parentDistance )
                            / distanceSpan,
                        site.localProgress,
                        1
                    )
                    : site.localProgress;
                ingressSample = {
                    remaining,
                    reviewScore,
                    segment,
                    localProgress,
                    point: segment.curve.getPointAt( localProgress )
                };
            }
        }
        const ledger = internalRouterJunctionLedger.snapshot();
        const eventAge = internalRouterJunctionLastEventAt === null
            ? Number.POSITIVE_INFINITY
            : Math.max( 0, elapsed - internalRouterJunctionLastEventAt );
        const ingressActive = ingressSample !== null;
        const outputActive = internalRouterTransportEnabled
            ? eventAge <= 0.42
            : ledger.parkedOutputCount > 0;
        if ( ingressSample )
        {
            internalRouterJunctionIngress.uniforms.offset.value.copy(
                ingressSample.point
            );
            const tracePosition = internalRouterJunctionIngressTrace.geometry
                .getAttribute( 'position' );
            for ( let index = 0; index < internalRouterJunctionTraceSamples; index += 1 )
            {
                const progress = THREE.MathUtils.lerp(
                    ingressSample.localProgress,
                    site.localProgress,
                    index / ( internalRouterJunctionTraceSamples - 1 )
                );
                const point = ingressSample.segment.curve.getPointAt( progress );
                tracePosition.setXYZ( index, point.x, point.y, point.z );
            }
            tracePosition.needsUpdate = true;
            internalRouterJunctionIngressTrace.geometry.setDrawRange(
                0,
                internalRouterJunctionTraceSamples
            );
        }
        else internalRouterJunctionIngressTrace.geometry.setDrawRange( 0, 0 );
        internalRouterJunctionIngressMesh.visible =
            internalRouterJunctionDiagnosticVisible && ingressActive;
        internalRouterJunctionIngressTrace.visible =
            internalRouterJunctionDiagnosticVisible && ingressActive;
        internalRouterJunctionOutputMesh.visible =
            internalRouterJunctionDiagnosticVisible && outputActive;
        internalRouterJunctionDiagnosticGroup.visible =
            internalRouterJunctionDiagnosticVisible
            && ( ingressActive || outputActive );
        const eventPulse = Number.isFinite( eventAge )
            ? Math.exp( -eventAge * 7.5 )
            : 0;
        const ingressScale = ingressSample
            ? 1 + ( 1 - ingressSample.remaining
                / internalRouterJunctionIngressDistance ) * 0.32
            : 1;
        internalRouterJunctionIngressMesh.scale.setScalar( ingressScale );
        internalRouterJunctionOutputMesh.scale.setScalar( 1 + eventPulse * 0.35 );
        updateInternalRouterJunctionMetadata();
    }

    function updateTrunkRuneMetadata()
    {
        const geometry = trunkRuneMesh?.geometry.userData.trunkRunes;
        const geometryClaim = ( key, fallback ) => geometry
            && Object.prototype.hasOwnProperty.call( geometry, key )
            ? geometry[key]
            : fallback;
        const activeTraversals = inRunePackets.map( ( traversal ) =>
            Object.freeze( {
                id: traversal.id,
                sourcePacketId: traversal.sourcePacketId,
                outputPacketId: traversal.outputPacketId ?? null,
                terminalId: traversal.terminalId,
                kind: traversal.transformed
                    ? 'transduced-output'
                    : 'source',
                phase: traversal.transformed
                    ? 'internal-output'
                    : 'internal-source',
                enteredAt: traversal.enteredAt,
                transformedAt: traversal.transformedAt ?? null,
                entryRouteDistance: traversal.entryRouteDistance,
                exitRouteDistance: traversal.exitRouteDistance,
                distance: traversal.distance,
                pathLength: traversal.pathLength,
                internalTransformationDistance:
                    traversal.internalTransformationDistance,
                pathIndex: traversal.pathIndex ?? null,
                pathOwnerId: traversal.pathOwnerId ?? null,
                progress: THREE.MathUtils.clamp(
                    traversal.distance / traversal.pathLength,
                    0,
                    1
                )
            } )
        );
        group.userData.trunkRunes = {
            candidateId: geometry?.candidateId ?? trunkRuneCandidateId,
            reviewStatus: geometry?.reviewStatus ?? null,
            placementModel: geometry?.placementModel ?? null,
            spatialConvergenceClaim: false,
            semanticClaim: 'transduction',
            mode: 'one-to-one',
            aggregation: false,
            enabled: trunkRunesVisible,
            visualEnabled: trunkRunesVisible,
            transductionAlwaysActive: !internalRouterJunctionEnabled,
            causalProfileActive: !internalRouterJunctionEnabled,
            preservedEvidenceProfile: true,
            supersededBy: internalRouterJunctionEnabled
                ? internalRouterJunctionCandidateId
                : null,
            visible: trunkRuneMesh?.visible ?? false,
            rendererEligible: geometry?.rendering
                    === 'depth-aware-packet-gated-subsurface-transmission'
                && trunkRunesVisible
                && surfaceVisible
                && trunkVisibilityMode === 'off'
                && activeTraversals.length > 0,
            exteriorVisible: surfaceVisible,
            visibilityMode: trunkVisibilityMode,
            siteCount: trunkRuneSites.length,
            sites: trunkRuneSites,
            transducerId: trunkRuneTransducerSite.transducerId,
            activeSiteCount: activeTraversals.length > 0 ? 1 : 0,
            activeTraversalCount: activeTraversals.length,
            activeEventIds: activeTraversals.map( ( record ) => record.id ),
            activeCausalPacketIds: activeTraversals.map(
                ( record ) => record.sourcePacketId
            ),
            activeTraversals,
            entryCount: trunkRuneDepartureCount,
            consumptionCount: trunkRuneConsumptionCount,
            outputCount: trunkRuneOutputCount,
            centreResumeCount: trunkRuneResumeCount,
            entryRecords: trunkRuneDepartureRecords,
            transductionRecords: trunkRuneTransductionRecords,
            centreResumeRecords: trunkRuneResumeRecords,
            retainedEntryRecordCount: trunkRuneDepartureRecords.length,
            retainedTransductionRecordCount: trunkRuneTransductionRecords.length,
            retainedCentreResumeRecordCount: trunkRuneResumeRecords.length,
            auditCapacity: trunkRuneAuditCapacity,
            auditTruncated:
                trunkRuneDepartureCount > trunkRuneDepartureRecords.length
                || trunkRuneOutputCount > trunkRuneTransductionRecords.length
                || trunkRuneResumeCount > trunkRuneResumeRecords.length,
            provenanceCardinality: 1,
            conservation: {
                entered: trunkRuneDepartureCount,
                inTraversal: inRunePackets.length,
                consumed: trunkRuneConsumptionCount,
                produced: trunkRuneOutputCount,
                resumed: trunkRuneResumeCount,
                internalSource: inRunePackets.filter( ( traversal ) =>
                    !traversal.transformed
                ).length,
                internalOutput: inRunePackets.filter( ( traversal ) =>
                    traversal.transformed === true
                ).length,
                sourceBalance: trunkRuneDepartureCount
                    - inRunePackets.filter( ( traversal ) =>
                        !traversal.transformed
                    ).length
                    - trunkRuneConsumptionCount,
                outputBalance: trunkRuneOutputCount
                    - inRunePackets.filter( ( traversal ) =>
                        traversal.transformed === true
                    ).length
                    - trunkRuneResumeCount,
                retainedSourceIdsUnique: new Set(
                    trunkRuneTransductionRecords.map(
                        ( record ) => record.sourcePacketId
                    )
                ).size === trunkRuneTransductionRecords.length,
                retainedOutputIdsUnique: new Set(
                    trunkRuneTransductionRecords.map(
                        ( record ) => record.outputPacketId
                    )
                ).size === trunkRuneTransductionRecords.length
            },
            visualSampling: {
                strategy: 'none',
                everyEntryTraverses: true,
                affectsTransport: false,
                packetLoss: false,
                aggregation: false
            },
            pathLength: trunkRunePathLength,
            pathCount: geometry?.pathCount ?? 1,
            pathOwnerIds: geometry?.pathOwnerIds ?? [],
            minimumPathLength: geometry?.minimumPathLength
                ?? trunkRunePathLength,
            maximumPathLength: geometry?.maximumPathLength
                ?? trunkRunePathLength,
            centreEntryDistance: geometry?.centreEntryDistance ?? 0,
            internalTransformationDistance:
                geometry?.internalTransformationDistance ?? 0,
            centreResumeDistance:
                geometry?.centreResumeDistance ?? 0,
            internalTransformationPhase:
                geometry?.internalTransformationPhase ?? 1,
            internal3d: geometry?.internal3d ?? false,
            surfaceExcursion: geometryClaim( 'surfaceExcursion', false ),
            artisticForm: geometry?.artisticForm ?? null,
            visibleArtifact: geometry?.visibleArtifact ?? false,
            persistentStructure: geometry?.persistentStructure ?? false,
            idleLuminosity: geometry?.idleLuminosity ?? 0,
            shellRelationship: geometry?.shellRelationship ?? null,
            packetOnlyDisclosure: geometry?.packetOnlyDisclosure ?? false,
            colourTransition: geometry?.colourTransition ?? null,
            colourTransitionContinuous:
                geometry?.colourTransitionContinuous ?? false,
            colourTransitionDirection:
                geometry?.colourTransitionDirection ?? null,
            routeEntryParentId: geometry?.routeEntryParentId ?? null,
            routeEntryChildId: geometry?.routeEntryChildId ?? null,
            routeExitParentId: geometry?.routeExitParentId ?? null,
            routeExitChildId: geometry?.routeExitChildId ?? null,
            coveredTrunkSpans: geometry?.coveredTrunkSpans ?? [],
            coveredTrunkSpanCount: geometry?.coveredTrunkSpanCount ?? 0,
            spiralTurns: geometry?.spiralTurns ?? 0,
            taperFollowing: geometry?.taperFollowing ?? false,
            transformationArtifact:
                geometry?.transformationArtifact ?? false,
            motionModel: geometry?.motionModel ?? null,
            straddlesShell: geometryClaim( 'straddlesShell', false ),
            buriedSampleCount: geometryClaim( 'buriedSampleCount', 0 ),
            shellCrossingSampleCount:
                geometryClaim( 'shellCrossingSampleCount', 0 ),
            exteriorSampleCount: geometryClaim( 'exteriorSampleCount', 0 ),
            insideOpaqueShell: geometryClaim( 'insideOpaqueShell', false ),
            continuousShellContainmentVerified: geometryClaim(
                'continuousShellContainmentVerified',
                null
            ),
            containmentEvidence: geometry?.containmentEvidence ?? null,
            carrierCollisionFree:
                geometryClaim( 'carrierCollisionFree', false ),
            carrierClearanceModel: geometry?.carrierClearanceModel ?? null,
            minimumPathToShellClearance: geometryClaim(
                'minimumPathToShellClearance',
                null
            ),
            minimumInheritedCarrierToShellClearance:
                geometry?.minimumInheritedCarrierToShellClearance ?? null,
            minimumPathToCarrierClearance: geometryClaim(
                'minimumPathToCarrierClearance',
                null
            ),
            rendering: geometry?.rendering ?? 'inactive',
            resourceRevision: trunkRuneResourceRevision,
            meshCount: geometry?.meshCount ?? 0,
            vertexCount: geometry?.vertexCount ?? 0,
            triangleCount: geometry?.triangleCount ?? 0,
            maximumDrawCalls: geometry?.maximumDrawCalls ?? 0,
            activeDrawCalls: trunkRuneMesh?.visible
                ? ( geometry?.maximumDrawCalls ?? 0 )
                : 0,
            objectSpace: geometry?.objectSpace ?? true,
            cameraFacing: geometry?.cameraFacing ?? false,
            sourceGeometryUuid: geometry?.sourceGeometryUuid ?? null,
            packetStateMutated: true
        };
    }

    function applyTrunkRuneVisibility()
    {
        if ( !trunkRuneMesh ) return;
        const rendererOwned = trunkRuneMesh.geometry.userData.trunkRunes
            ?.rendering === 'depth-aware-packet-gated-subsurface-transmission';
        // Internal roots are never drawn as exposed geometry. Their causal
        // signal is composited through the graphite by the depth-aware renderer.
        trunkRuneMesh.visible = !rendererOwned && trunkRunesVisible
            && surfaceVisible
            && trunkVisibilityMode === 'off';
        updateTrunkRuneMetadata();
    }

    function replaceTrunkRuneGeometry( sourceGeometry, trunkNodes )
    {
        const authoredSitesAvailable = trunkNodes.some( ( node, index ) =>
            node.id === trunkRuneTransducerSite.parentId
            && trunkNodes[index + 1]?.id === trunkRuneTransducerSite.childId
        );
        const internalExitAvailable = trunkRuneCandidateId
            !== trunkRuneCandidateIds.internalArborescence
            || trunkNodes.some( ( node, index ) =>
                node.id === 'planting-root'
                && trunkNodes[index + 1]?.id === 'uptake'
            );
        if ( !authoredSitesAvailable || !internalExitAvailable )
        {
            if ( trunkRuneMesh )
            {
                if ( trunkRuneMesh.parent === group ) group.remove( trunkRuneMesh );
                trunkRuneGranuleMesh?.geometry.dispose();
                trunkRuneMesh.geometry.dispose();
                trunkRuneMesh = null;
                trunkRuneGranuleMesh = null;
            }
            trunkRunePathLength = 0;
            trunkRunePathProfile = null;
            trunkRunePathProfiles = new Map();
            updateTrunkRuneMetadata();
            return;
        }
        const geometry = createTrunkRuneGeometry(
            sourceGeometry,
            trunkNodes,
            informationRoute,
            interiorSkeletonMesh?.geometry.userData.trunkInterior.descriptor,
            trunkRuneCandidateId
        );
        const granuleGeometry = createTrunkRuneGranuleGeometry( geometry );
        const runeGeometry = geometry.userData.trunkRunes;
        trunkRunePathLength = runeGeometry.pathLength;
        trunkRunePathProfile = Object.freeze( {
            pathLength: runeGeometry.pathLength,
            internalTransformationDistance:
                runeGeometry.internalTransformationDistance,
            centreEntryPoint: Object.freeze(
                runeGeometry.centreEntryPoint.slice()
            ),
            internalTransformationPoint: Object.freeze(
                runeGeometry.internalTransformationPoint.slice()
            ),
            centreResumePoint: Object.freeze(
                runeGeometry.centreResumePoint.slice()
            )
        } );
        trunkRunePathProfiles = new Map(
            ( runeGeometry.pathProfiles ?? [] ).map( ( path ) => [
                path.ownerId,
                path
            ] )
        );
        if ( trunkRuneMesh )
        {
            trunkRuneGranuleMesh?.geometry.dispose();
            trunkRuneMesh.geometry.dispose();
            trunkRuneMesh.geometry = geometry;
            trunkRuneGranuleMesh = granuleGeometry
                ? new THREE.Mesh( granuleGeometry, trunkRuneMaterial )
                : null;
            if ( trunkRuneGranuleMesh )
            {
                trunkRuneGranuleMesh.name =
                    'gold filigree transformation granule';
                trunkRuneGranuleMesh.userData.trunkRuneGranule = true;
            }
            trunkRuneMesh.clear();
            if ( trunkRuneGranuleMesh )
            {
                trunkRuneMesh.add( trunkRuneGranuleMesh );
            }
        }
        else
        {
            trunkRuneMesh = new THREE.Mesh( geometry, trunkRuneMaterial );
            if ( geometry.userData.trunkRunes.candidateId
                === 'c4a-exterior-brooch-v1' )
            {
                trunkRuneMesh.name =
                    'visible functional gold filigree droplet';
            }
            else if ( geometry.userData.trunkRunes.candidateId
                === 'c4a-longitudinal-placement-v1' )
            {
                trunkRuneMesh.name =
                    'longitudinal gold transducer placement study';
            }
            else
            {
                trunkRuneMesh.name = geometry.userData.trunkRunes.candidateId
                    === trunkRuneCandidateIds.internalArborescence
                    ? 'event-revealed internal information arborescence'
                    : 'packet-lit exterior optical fibre spiral';
            }
            trunkRuneMesh.userData.trunkRunes = true;
            trunkRuneGranuleMesh = granuleGeometry
                ? new THREE.Mesh( granuleGeometry, trunkRuneMaterial )
                : null;
            if ( trunkRuneGranuleMesh )
            {
                trunkRuneGranuleMesh.name =
                    'gold filigree transformation granule';
                trunkRuneGranuleMesh.userData.trunkRuneGranule = true;
                trunkRuneMesh.add( trunkRuneGranuleMesh );
            }
            trunkRuneMesh.visible = true;
            group.add( trunkRuneMesh );
        }
        trunkRuneResourceRevision += 1;
        updateTrunkRuneTraversals();
    }

    function appendBoundedRuneRecord( records, record )
    {
        records.push( record );
        if ( records.length > trunkRuneAuditCapacity )
        {
            records.splice( 0, Math.min( 512, records.length ) );
        }
    }

    function selectTrunkRunePathProfile( packet )
    {
        if ( trunkRunePathProfiles.size === 0 ) return trunkRunePathProfile;
        const matches = packet.route.nodeIds.filter( ( nodeId ) =>
            trunkRunePathProfiles.has( nodeId )
        );
        if ( matches.length !== 1 )
        {
            throw new Error(
                `Packet '${packet.id}' maps to ${matches.length} internal root paths.`
            );
        }
        return trunkRunePathProfiles.get( matches[0] );
    }

    function beginTrunkRuneTraversal(
        packet,
        enteredAt,
        entryRouteDistance,
        exitRouteDistance,
        packetSpeed
    )
    {
        const pathProfile = selectTrunkRunePathProfile( packet );
        if ( !pathProfile )
        {
            throw new Error( 'Functional rune path profile is unavailable.' );
        }
        const routeNodeIds = Object.freeze( packet.route.nodeIds.slice() );
        const entry = Object.freeze( {
            id: `${packet.id}::${trunkRuneTransducerSite.id}::internal-entry`,
            recordType: 'internal-entry',
            transducerId: trunkRuneTransducerSite.transducerId,
            siteId: trunkRuneTransducerSite.id,
            sourcePacketId: packet.id,
            terminalId: packet.terminalId,
            sourceEmittedAt: packet.emittedAt,
            routeNodeIds,
            boundaryDistance: entryRouteDistance,
            entryRouteDistance,
            exitRouteDistance,
            enteredAt,
            centreEntryPoint: pathProfile.centreEntryPoint,
            pathIndex: pathProfile.pathIndex ?? null,
            pathOwnerId: pathProfile.ownerId ?? null,
            semanticClaim: 'transduction',
            mode: 'one-to-one',
            aggregation: false,
            sourcePacketCount: 1
        } );
        trunkRuneDepartureCount += 1;
        appendBoundedRuneRecord( trunkRuneDepartureRecords, entry );
        return {
            id: `${packet.id}::${trunkRuneTransducerSite.id}::traversal`,
            sourcePacketId: packet.id,
            terminalId: packet.terminalId,
            sourceEmittedAt: packet.emittedAt,
            route: packet.route,
            routeNodeIds,
            enteredAt,
            entryRouteDistance,
            exitRouteDistance,
            distance: 0,
            pathIndex: pathProfile.pathIndex ?? null,
            pathOwnerId: pathProfile.ownerId ?? null,
            pathLength: pathProfile.pathLength,
            internalTransformationDistance:
                pathProfile.internalTransformationDistance,
            centreEntryPoint: pathProfile.centreEntryPoint,
            internalTransformationPoint:
                pathProfile.internalTransformationPoint,
            centreResumePoint: pathProfile.centreResumePoint,
            motionAnchorTime: enteredAt,
            motionAnchorDistance: 0,
            motionSpeed: packetSpeed,
            entry,
            transformed: false,
            resumed: false
        };
    }

    function transformTrunkRuneSource( traversal, transformedAt )
    {
        if ( traversal.transformed === true ) return traversal.transduction;
        const outputPacketId = `${traversal.sourcePacketId}`
            + `::${trunkRuneTransducerSite.transducerId}::output`;
        const provenanceEntry = Object.freeze( {
            sourcePacketId: traversal.sourcePacketId,
            sourceTerminalId: traversal.terminalId,
            sourceEmittedAt: traversal.sourceEmittedAt,
            routeNodeIds: traversal.routeNodeIds,
            transducerId: trunkRuneTransducerSite.transducerId,
            siteId: trunkRuneTransducerSite.id,
            enteredAt: traversal.enteredAt,
            consumedAt: transformedAt,
            entryRouteDistance: traversal.entryRouteDistance,
            exitRouteDistance: traversal.exitRouteDistance,
            internalTransformationPoint:
                traversal.internalTransformationPoint,
            pathIndex: traversal.pathIndex ?? null,
            pathOwnerId: traversal.pathOwnerId ?? null
        } );
        const provenance = Object.freeze( [ provenanceEntry ] );
        const record = Object.freeze( {
            id: `${traversal.sourcePacketId}`
                + `::${trunkRuneTransducerSite.transducerId}::transduction`,
            recordType: 'transduction',
            transducerId: trunkRuneTransducerSite.transducerId,
            siteId: trunkRuneTransducerSite.id,
            sourcePacketId: traversal.sourcePacketId,
            outputPacketId,
            terminalId: traversal.terminalId,
            enteredAt: traversal.enteredAt,
            consumedAt: transformedAt,
            outputAt: transformedAt,
            boundaryDistance: traversal.internalTransformationDistance,
            pathBoundaryDistance: traversal.internalTransformationDistance,
            entryRouteDistance: traversal.entryRouteDistance,
            exitRouteDistance: traversal.exitRouteDistance,
            internalTransformationDistance:
                traversal.internalTransformationDistance,
            pathIndex: traversal.pathIndex ?? null,
            pathOwnerId: traversal.pathOwnerId ?? null,
            pathLength: traversal.pathLength,
            centreEntryPoint: traversal.centreEntryPoint,
            internalTransformationPoint:
                traversal.internalTransformationPoint,
            provenance,
            provenanceCardinality: provenance.length,
            sourcePacketCount: 1,
            outputPacketCount: 1,
            semanticClaim: 'transduction',
            mode: 'one-to-one',
            aggregation: false
        } );
        traversal.transformed = true;
        traversal.transformedAt = transformedAt;
        traversal.outputPacketId = outputPacketId;
        traversal.provenance = provenance;
        traversal.transduction = record;
        trunkRuneConsumptionCount += 1;
        trunkRuneOutputCount += 1;
        appendBoundedRuneRecord( trunkRuneTransductionRecords, record );
        return record;
    }

    function resumeTrunkRuneOutput(
        traversal,
        resumedAt,
        overshootDistance,
        packetSpeed
    )
    {
        if ( !traversal.transformed )
        {
            throw new Error(
                `Source packet '${traversal.sourcePacketId}' cannot resume before transformation.`
            );
        }
        if ( traversal.resumed === true )
        {
            throw new Error(
                `Output packet '${traversal.outputPacketId}' resumed twice.`
            );
        }
        const resume = Object.freeze( {
            id: `${traversal.outputPacketId}::centre-resume`,
            recordType: 'centre-resume',
            transducerId: trunkRuneTransducerSite.transducerId,
            siteId: trunkRuneTransducerSite.id,
            sourcePacketId: traversal.sourcePacketId,
            outputPacketId: traversal.outputPacketId,
            terminalId: traversal.terminalId,
            transformedAt: traversal.transformedAt,
            resumedAt,
            exitRouteDistance: traversal.exitRouteDistance,
            internalTransformationPoint:
                traversal.internalTransformationPoint,
            centreResumePoint: traversal.centreResumePoint,
            pathIndex: traversal.pathIndex ?? null,
            pathOwnerId: traversal.pathOwnerId ?? null,
            semanticClaim: 'transduction',
            mode: 'one-to-one',
            aggregation: false
        } );
        traversal.resumed = true;
        trunkRuneResumeCount += 1;
        appendBoundedRuneRecord( trunkRuneResumeRecords, resume );
        return {
            id: traversal.outputPacketId,
            kind: 'transduced-output',
            signalClass: 'output',
            route: traversal.route,
            terminalId: traversal.terminalId,
            emittedAt: traversal.transformedAt,
            sourceEmittedAt: traversal.sourceEmittedAt,
            transformedAt: traversal.transformedAt,
            resumedAt,
            sourcePacketId: traversal.sourcePacketId,
            provenance: traversal.provenance,
            headDistance: traversal.exitRouteDistance + overshootDistance,
            routeStartDistance: traversal.exitRouteDistance,
            motionAnchorTime: resumedAt,
            motionAnchorDistance: traversal.exitRouteDistance,
            motionSpeed: packetSpeed
        };
    }

    function traversalEventTime( traversal, distance, packetSpeed )
    {
        return canonicalEventNumber(
            traversal.motionAnchorTime
                + ( distance - traversal.motionAnchorDistance ) / packetSpeed
        );
    }

    function advanceTrunkRuneTraversal(
        traversal,
        nextDistance,
        intervalEnd,
        packetSpeed
    )
    {
        if ( !traversal.transformed
            && nextDistance + 1e-9
                >= traversal.internalTransformationDistance )
        {
            transformTrunkRuneSource(
                traversal,
                traversalEventTime(
                    traversal,
                    traversal.internalTransformationDistance,
                    packetSpeed
                )
            );
        }
        if ( nextDistance + 1e-9 < traversal.pathLength )
        {
            traversal.distance = nextDistance;
            return { traversal, output: null };
        }
        const resumedAt = traversalEventTime(
            traversal,
            traversal.pathLength,
            packetSpeed
        );
        const output = resumeTrunkRuneOutput(
            traversal,
            resumedAt,
            Math.max( 0, intervalEnd - resumedAt ) * packetSpeed,
            packetSpeed
        );
        return { traversal: null, output };
    }

    function transferSourcePacketToInternalRouterJunction(
        packet,
        fromDistance,
        toDistance,
        intervalStart,
        intervalEnd,
        packetSpeed
    )
    {
        const descriptor = getInternalRouterDescriptor();
        if ( !descriptor )
        {
            throw new Error( 'D2 source transport requires the D1 router descriptor.' );
        }
        const boundary = resolveInternalRouterJunctionBoundary(
            packet.route,
            descriptor
        );
        if ( toDistance + 1e-9 < boundary.routeDistance )
        {
            packet.headDistance = toDistance;
            return {
                packet,
                traversal: null,
                output: null,
                parkedOutput: null
            };
        }
        if ( fromDistance > boundary.routeDistance + 1e-9 )
        {
            throw new Error(
                `Untransduced source '${packet.id}' advanced beyond the D2 boundary.`
            );
        }

        const distanceSpan = Math.max( toDistance - fromDistance, 0 );
        const intervalProgress = distanceSpan > 1e-9
            ? THREE.MathUtils.clamp(
                ( boundary.routeDistance - fromDistance ) / distanceSpan,
                0,
                1
            )
            : 1;
        const hasAnalyticMotionAnchor = packet.motionSpeed === packetSpeed
            && Number.isFinite( packet.motionAnchorTime )
            && Number.isFinite( packet.motionAnchorDistance );
        const occurredAt = canonicalEventNumber( hasAnalyticMotionAnchor
            ? packet.motionAnchorTime
                + ( boundary.routeDistance - packet.motionAnchorDistance )
                    / packetSpeed
            : THREE.MathUtils.lerp(
                intervalStart,
                intervalEnd,
                intervalProgress
            ) );
        const event = internalRouterJunctionLedger.consume(
            packet,
            boundary,
            occurredAt
        );
        if ( internalRouterTransportEnabled )
        {
            internalRouterTransport.dispatch(
                event.output,
                descriptor,
                occurredAt,
                packetSpeed,
                internalRouterResourceRevision
            );
            updateInternalRouterTransportMetadata();
        }
        internalRouterJunctionLastEventAt = occurredAt;
        updateInternalRouterJunctionMetadata();
        return {
            packet: null,
            traversal: null,
            output: null,
            parkedOutput: event.output
        };
    }

    function transferSourcePacket(
        packet,
        fromDistance,
        toDistance,
        intervalStart,
        intervalEnd,
        packetSpeed
    )
    {
        if ( internalRouterJunctionEnabled )
        {
            return transferSourcePacketToInternalRouterJunction(
                packet,
                fromDistance,
                toDistance,
                intervalStart,
                intervalEnd,
                packetSpeed
            );
        }
        const routeDistances = getTrunkRuneRouteDistances(
            packet.route,
            trunkRuneTransducerSite,
            trunkRuneCandidateId
        );
        if ( routeDistances === null
            || toDistance + 1e-9 < routeDistances.entryDistance )
        {
            packet.headDistance = toDistance;
            return { packet, traversal: null, output: null };
        }
        const { entryDistance, exitDistance } = routeDistances;
        if ( fromDistance > entryDistance + 1e-9 )
        {
            throw new Error(
                `Untransduced source '${packet.id}' advanced beyond the rune boundary.`
            );
        }
        const distanceSpan = Math.max( toDistance - fromDistance, 0 );
        const intervalProgress = distanceSpan > 1e-9
            ? THREE.MathUtils.clamp(
                ( entryDistance - fromDistance ) / distanceSpan,
                0,
                1
            )
            : 1;
        const hasAnalyticMotionAnchor = packet.motionSpeed === packetSpeed
            && Number.isFinite( packet.motionAnchorTime )
            && Number.isFinite( packet.motionAnchorDistance );
        const enteredAt = canonicalEventNumber( hasAnalyticMotionAnchor
            ? packet.motionAnchorTime
                + ( entryDistance - packet.motionAnchorDistance ) / packetSpeed
            : THREE.MathUtils.lerp(
                intervalStart,
                intervalEnd,
                intervalProgress
            ) );
        const runeDistance = Math.max( 0, toDistance - entryDistance );
        const traversal = beginTrunkRuneTraversal(
            packet,
            enteredAt,
            entryDistance,
            exitDistance,
            packetSpeed
        );
        const advanced = advanceTrunkRuneTraversal(
            traversal,
            runeDistance,
            intervalEnd,
            packetSpeed
        );
        return { packet: null, ...advanced };
    }

    function updateTrunkRuneTraversals()
    {
        if ( trunkRuneMesh )
        {
            const traversals = inRunePackets.map( ( traversal ) => ( {
                    progress: traversal.distance / traversal.pathLength,
                    pathIndex: traversal.pathIndex,
                    transformed: traversal.transformed,
                    transformationPhase:
                        traversal.internalTransformationDistance
                            / traversal.pathLength
                } ) );
            setTrunkRuneGeometryTraversals( trunkRuneMesh.geometry, traversals );
            if ( trunkRuneGranuleMesh )
            {
                setTrunkRuneGeometryTraversals(
                    trunkRuneGranuleMesh.geometry,
                    traversals
                );
            }
        }
        applyTrunkRuneVisibility();
    }

    function replaceTrunkVisibilityGeometry( sourceGeometry, trunkNodes )
    {
        const apertureGeometry = createTrunkApertureCandidateGeometry(
            sourceGeometry,
            trunkNodes
        );
        const linerGeometry = createTrunkApertureLinerGeometry(
            sourceGeometry,
            trunkNodes
        );
        const proxyGeometry = createLocalTrunkVisibilityProxyGeometry(
            sourceGeometry,
            trunkNodes
        );
        const ownershipGeometry = createTrunkVisibilityOwnershipPatchGeometry(
            sourceGeometry,
            trunkNodes
        );
        const internalRootSpansAvailable = trunkNodes.some( ( node, index ) =>
                node.id === 'exchange'
                && trunkNodes[index + 1]?.id === 'meaning'
            )
            && trunkNodes.some( ( node, index ) =>
                node.id === 'planting-root'
                && trunkNodes[index + 1]?.id === 'uptake'
            );
        const internalRootProxyGeometry = internalRootSpansAvailable
            ? createInternalRootVisibilityProxyGeometry(
                sourceGeometry,
                trunkNodes
            )
            : null;
        const internalRootOwnershipGeometry = internalRootSpansAvailable
            ? createInternalRootVisibilityOwnershipGeometry(
                sourceGeometry,
                trunkNodes
            )
            : null;
        if ( apertureTrunkMesh )
        {
            apertureTrunkMesh.geometry.dispose();
            apertureTrunkMesh.geometry = apertureGeometry;
        }
        else
        {
            apertureTrunkMesh = new THREE.Mesh( apertureGeometry, trunk.material );
            apertureTrunkMesh.name = 'C2 physical-aperture trunk candidate';
            apertureTrunkMesh.userData.trunkVisibilityAperture = true;
            apertureTrunkMesh.visible = false;
        }
        if ( apertureLinerMesh )
        {
            apertureLinerMesh.geometry.dispose();
            apertureLinerMesh.geometry = linerGeometry;
        }
        else
        {
            apertureLinerMesh = new THREE.Mesh(
                linerGeometry,
                apertureLiner.material
            );
            apertureLinerMesh.name = 'C2 recessed open aperture liner';
            apertureLinerMesh.userData.trunkVisibilityLiner = true;
            apertureLinerMesh.visible = false;
        }
        trunkVisibilityProxyGeometry?.dispose();
        trunkVisibilityProxyGeometry = proxyGeometry;
        trunkVisibilityOwnershipGeometry?.dispose();
        trunkVisibilityOwnershipGeometry = ownershipGeometry;
        trunkRuneVisibilityProxyGeometry?.dispose();
        trunkRuneVisibilityProxyGeometry = internalRootProxyGeometry;
        trunkRuneVisibilityOwnershipGeometry?.dispose();
        trunkRuneVisibilityOwnershipGeometry =
            internalRootOwnershipGeometry;
        trunkVisibilityResourceRevision += 1;
        replaceTrunkRuneGeometry( sourceGeometry, trunkNodes );
    }

    function attachApertureCandidates( attached )
    {
        for ( const mesh of [ apertureTrunkMesh, apertureLinerMesh ] )
        {
            if ( !mesh ) continue;
            if ( attached && mesh.parent !== group ) group.add( mesh );
            else if ( !attached && mesh.parent === group ) group.remove( mesh );
        }
    }

    function updateTrunkVisibilityMetadata()
    {
        if ( !trunkMesh || !interiorSkeletonMesh ) return;
        const aperture = apertureTrunkMesh?.geometry.userData
            .trunkVisibilityAperture;
        const liner = apertureLinerMesh?.geometry.userData
            .trunkVisibilityLiner;
        const proxy = trunkVisibilityProxyGeometry?.userData
            .trunkVisibilityProxy;
        const ownership = trunkVisibilityOwnershipGeometry?.userData
            .trunkVisibilityOwnershipPatch;
        group.userData.trunkVisibility = {
            mode: trunkVisibilityMode,
            modes: trunkVisibilityModes.slice(),
            candidateRegion: {
                parentId: trunkVisibilityRegion.parentId,
                childId: trunkVisibilityRegion.childId,
                longitudinalCellCount: trunkVisibilityRegion.longitudinalCellCount,
                angularCellCount: trunkVisibilityRegion.angularCellCount
            },
            sourceGeometryUuid: trunkMesh.geometry.uuid,
            skeletonGeometryUuid: interiorSkeletonMesh.geometry.uuid,
            apertureGeometryUuid: apertureTrunkMesh?.geometry.uuid ?? null,
            sourcePositionByteLength: trunkMesh.geometry.getAttribute( 'position' )
                .array.byteLength,
            aperturePositionByteLength: aperture?.candidatePositionByteLength ?? 0,
            omittedCellCount: aperture?.omittedCellCount ?? 0,
            linerTriangleCount: liner?.triangleCount ?? 0,
            proxyTriangleCount: proxy?.triangleCount ?? 0,
            proxyClosed: proxy?.closed ?? false,
            ownershipPatchTriangleCount: ownership?.triangleCount ?? 0,
            ownershipPatchCellCount: ownership?.cellCount ?? 0,
            resourceRevision: trunkVisibilityResourceRevision,
            transportSimulationActive: true,
            exteriorMaterialSharedByAperture: apertureTrunkMesh?.material
                === trunkMesh.material
        };
    }

    function carrierIsManifested( carrier )
    {
        const owner = hierarchy.byId.get( carrier.ownerId );
        const nodeIsManifested = ( node ) => node.growthEligible !== false
            && ( !node.latent || ( growthProgress.get( node.id ) ?? 0 ) >= 0.999 );
        return nodeIsManifested( owner )
            && carrier.supportingTrunkNodeIds.every( ( nodeId ) =>
                nodeIsManifested( hierarchy.byId.get( nodeId ) )
            );
    }

    function updateInteriorCarrierVisibility()
    {
        if ( !interiorSkeletonMesh ) return 0;
        const metadata = interiorSkeletonMesh.geometry.userData.trunkInterior;
        const visibility = interiorSkeletonMesh.geometry.getAttribute( 'carrierVisibility' );
        let changed = false;
        let visibleCarrierCount = 0;
        for ( const range of metadata.carrierRanges )
        {
            const carrier = metadata.descriptor.carriers[range.carrierIndex];
            const value = carrierIsManifested( carrier ) ? 1 : 0;
            visibleCarrierCount += value;
            for ( let index = range.vertexStart;
                index < range.vertexStart + range.vertexCount;
                index += 1 )
            {
                if ( visibility.getX( index ) === value ) continue;
                visibility.setX( index, value );
                changed = true;
            }
        }
        if ( changed ) visibility.needsUpdate = true;
        metadata.visibleCarrierCount = visibleCarrierCount;
        interiorSkeletonMesh.visible = (
            trunkVisibilityMode === 'isolated'
            || trunkVisibilityMode === 'aperture'
        ) && visibleCarrierCount > 0;
        group.userData.trunkInterior = {
            ...metadata,
            diagnosticVisible: interiorDiagnosticVisible,
            exteriorVisible: surfaceVisible,
            meshCount: 1,
            visibilityMode: trunkVisibilityMode
        };
        updateTrunkVisibilityMetadata();
        return visibleCarrierCount;
    }

    function routeIsManifested( route )
    {
        return route.nodes.every( ( node ) =>
            node.growthEligible !== false
            && ( !node.latent || ( growthProgress.get( node.id ) ?? 0 ) >= 0.999 )
        );
    }

    function refreshRouteManifestationTimes( elapsed )
    {
        for ( const route of informationRoutes )
        {
            if ( routeIsManifested( route ) )
            {
                if ( !routeManifestedAt.has( route.terminalId ) )
                {
                    routeManifestedAt.set( route.terminalId, elapsed );
                }
            }
            else
            {
                routeManifestedAt.delete( route.terminalId );
            }
        }
    }

    function initialiseEmitters( elapsed, packetFrequency )
    {
        const period = informationRoutes.length / packetFrequency;
        emitters = informationRoutes.map( ( route, rank ) => ( {
            route,
            rank,
            phase: rank / informationRoutes.length,
            period,
            nextEmissionAt: elapsed + rank / packetFrequency
        } ) );
        informationLastFrequency = packetFrequency;
    }

    function rephaseEmitters( elapsed, packetFrequency )
    {
        if ( informationLastFrequency === null || emitters.length === 0 )
        {
            initialiseEmitters( elapsed, packetFrequency );
            return;
        }

        const period = informationRoutes.length / packetFrequency;
        const waitScale = informationLastFrequency / packetFrequency;
        for ( const emitter of emitters )
        {
            const remaining = Math.max( 0, emitter.nextEmissionAt - elapsed );
            emitter.nextEmissionAt = elapsed + remaining * waitScale;
            emitter.period = period;
        }
        informationLastFrequency = packetFrequency;
    }

    function emitDuePackets( elapsed, packetSpeed, packetFrequency )
    {
        for ( const emitter of emitters )
        {
            let safety = 0;
            while ( emitter.nextEmissionAt <= elapsed + 1e-9 && safety < 2048 )
            {
                const emittedAt = emitter.nextEmissionAt;
                emitter.nextEmissionAt += emitter.period;
                safety += 1;
                const manifestedAt = routeManifestedAt.get( emitter.route.terminalId );
                if ( manifestedAt === undefined || emittedAt + 1e-9 < manifestedAt )
                {
                    continue;
                }
                const headDistance = Math.max( 0, elapsed - emittedAt ) * packetSpeed;
                emittedPacketCount += 1;
                const packet = {
                    id: `${emitter.route.terminalId}@${emittedAt.toFixed( 6 )}`,
                    kind: 'source',
                    signalClass: 'source',
                    route: emitter.route,
                    terminalId: emitter.route.terminalId,
                    emittedAt,
                    headDistance: 0,
                    routeStartDistance: 0,
                    motionAnchorTime: emittedAt,
                    motionAnchorDistance: 0,
                    motionSpeed: packetSpeed
                };
                const transferred = transferSourcePacket(
                    packet,
                    0,
                    headDistance,
                    emittedAt,
                    elapsed,
                    packetSpeed
                );
                if ( transferred.traversal )
                {
                    inRunePackets.push( transferred.traversal );
                }
                for ( const candidate of [ transferred.packet, transferred.output ] )
                {
                    if ( !candidate
                        || candidate.headDistance
                            > candidate.route.totalDistance + informationTrailLength )
                    {
                        continue;
                    }
                    activePackets.push( candidate );
                }
            }
        }
    }

    function stampInformationTraffic()
    {
        if ( !informationTraffic ) return { occupiedEdgeCount: 0, illuminatedSampleRatio: 0 };
        const { data, width, height, texture } = informationTraffic;
        data.fill( 0 );
        const occupiedRows = new Set();
        const sourceOccupiedRows = new Set();
        const outputOccupiedRows = new Set();

        function stampPacket( packet, strength = 1, maximumDistance = null )
        {
            const channel = packet.signalClass === 'output' ? 1 : 0;
            for ( const segment of packet.route.segments )
            {
                const edge = trafficEdgeByChildId.get( segment.childId );
                if ( !edge ) continue;
                let segmentOccupied = false;
                for ( let sample = 0; sample < width; sample += 1 )
                {
                    const edgeProgress = sample / ( width - 1 );
                    const routeDistance = segment.childDistance
                        + edgeProgress * segment.length;
                    if ( routeDistance + 1e-9
                        < ( packet.routeStartDistance ?? 0 ) )
                    {
                        continue;
                    }
                    if ( maximumDistance !== null
                        && routeDistance > maximumDistance + 1e-9 )
                    {
                        continue;
                    }
                    const signal = getInformationSignal(
                        routeDistance,
                        packet.headDistance
                    ) * strength;
                    const byte = Math.round( signal * 255 );
                    if ( byte < 2 ) continue;
                    const index = ( edge.row * width + sample ) * 4;
                    if ( byte > data[index + channel] )
                    {
                        data[index + channel] = byte;
                        data[index + 3] = 255;
                    }
                    segmentOccupied = true;
                }
                if ( !segmentOccupied ) continue;
                occupiedRows.add( edge.row );
                if ( channel === 0 ) sourceOccupiedRows.add( edge.row );
                else outputOccupiedRows.add( edge.row );
            }
        }

        for ( const packet of activePackets ) stampPacket( packet );
        for ( const traversal of inRunePackets )
        {
            if ( traversal.transformed ) continue;
            const progress = THREE.MathUtils.clamp(
                traversal.distance / traversal.pathLength,
                0,
                1
            );
            stampPacket( {
                signalClass: 'source',
                route: traversal.route,
                routeStartDistance: 0,
                headDistance: traversal.entryRouteDistance
            }, Math.max( 0.12, 1 - progress ), traversal.entryRouteDistance );
        }

        let illuminatedSamples = 0;
        for ( let index = 0; index < data.length; index += 4 )
        {
            if ( data[index] >= 2 || data[index + 1] >= 2 ) illuminatedSamples += 1;
        }
        texture.needsUpdate = true;
        return {
            occupiedEdgeCount: occupiedRows.size,
            sourceOccupiedEdgeCount: sourceOccupiedRows.size,
            outputOccupiedEdgeCount: outputOccupiedRows.size,
            illuminatedSampleRatio: illuminatedSamples / ( width * height )
        };
    }

    function rebuild( positions, parameters = {} )
    {
        latestMotionParameters = parameters;
        const motionElapsed = informationLastElapsed ?? 0;
        for ( const entry of materialEntries )
        {
            updateRootedMotionUniforms( entry, motionElapsed, parameters );
        }
        updateRootedMotionUniforms(
            informationCore,
            motionElapsed,
            parameters
        );
        if ( informationTraffic ) informationTraffic.texture.dispose();
        informationTraffic = null;
        informationCore.uniforms.trafficTexture.value = null;
        trunkVisibilityProxyGeometry?.dispose();
        trunkVisibilityProxyGeometry = null;
        trunkVisibilityOwnershipGeometry?.dispose();
        trunkVisibilityOwnershipGeometry = null;
        trunkRuneVisibilityProxyGeometry?.dispose();
        trunkRuneVisibilityProxyGeometry = null;
        trunkRuneVisibilityOwnershipGeometry?.dispose();
        trunkRuneVisibilityOwnershipGeometry = null;
        internalRouterJunctionFormGeometry?.dispose();
        internalRouterJunctionFormGeometry = null;
        internalRouterJunctionFormManifestations = Object.freeze( [] );
        internalRouterJunctionFormManifestationOverflowCount = 0;
        internalRouterJunctionFormState = Object.freeze( {
            active: false,
            maximumSignal: 0,
            activeManifestationCount: 0,
            activeManifestationIds: Object.freeze( [] )
        } );
        trunkRuneGranuleMesh?.geometry.dispose();
        for ( const candidate of [ apertureTrunkMesh, apertureLinerMesh ] )
        {
            if ( !candidate ) continue;
            if ( candidate.parent === group ) group.remove( candidate );
            candidate.geometry.dispose();
        }
        while ( group.children.length > 0 )
        {
            const child = group.children.at( -1 );
            group.remove( child );
            child.traverse( ( descendant ) => {
                if ( descendant.isInstancedMesh ) descendant.dispose();
                descendant.geometry?.dispose();
            } );
        }
        trunkRuneMesh = null;
        trunkRuneGranuleMesh = null;
        trunkRunePathLength = 0;
        trunkRunePathProfile = null;
        trunkRunePathProfiles = new Map();
        trunkRuneDepartureRecords = [];
        trunkRuneTransductionRecords = [];
        trunkRuneResumeRecords = [];
        trunkRuneDepartureCount = 0;
        trunkRuneConsumptionCount = 0;
        trunkRuneOutputCount = 0;
        trunkRuneResumeCount = 0;
        inRunePackets = [];
        internalRouterJunctionLedger.reset();
        internalRouterTransport.reset();
        internalRouterJunctionLastEventAt = null;
        internalRouterJunctionDiagnosticGroup = null;
        internalRouterJunctionIngressMesh = null;
        internalRouterJunctionIngressTrace = null;
        internalRouterJunctionOutputMesh = null;
        internalRouterTransportDiagnosticGroup = null;
        internalRouterTransportGuideLine = null;
        internalRouterTransportPacketMesh = null;
        internalRouterTransportPacketCapacity = 0;
        delete group.userData.internalRouterJunction;
        delete group.userData.internalRouterTree;
        delete group.userData.internalRouterPresentation;
        delete group.userData.internalRouterJunctionForm;

        const asymmetry = parameters.asymmetry ?? 0.55;
        const selectedTerminalId = parameters.informationTerminalId
            ?? routedTerminalId;
        informationRoute = createInformationRoute(
            hierarchy,
            positions,
            selectedTerminalId,
            asymmetry
        );
        const trafficTerminals = selectInformationTrafficTerminals( hierarchy );
        informationRoutes = trafficTerminals.map( ( node ) => createInformationRoute(
            hierarchy,
            positions,
            node.id,
            asymmetry
        ) );
        const establishedIndex = informationRoutes.findIndex( ( route ) =>
            route.nodes.every( ( node ) => !node.latent )
        );
        if ( establishedIndex > 0 )
        {
            informationRoutes = [
                ...informationRoutes.slice( establishedIndex ),
                ...informationRoutes.slice( 0, establishedIndex )
            ];
        }
        emitters = [];
        activePackets = [];
        routeManifestedAt = new Map();
        informationLastElapsed = null;
        informationLastFrequency = null;
        emittedPacketCount = 0;
        trunkMesh = null;
        apertureTrunkMesh = null;
        apertureLinerMesh = null;
        interiorSkeletonMesh = null;
        internalRouterMesh = null;
        internalRouterConstruction = null;
        internalRouterMaximumTier = normaliseInternalRouterTiers(
            parameters.internalRouterTiers ?? internalRouterMaximumTier
        );
        internalRouterJunctionFormCircumference =
            normaliseInternalRouterJunctionFormCircumference(
                parameters.internalRouterJunctionFormCircumference
                    ?? internalRouterJunctionFormCircumference
            );
        const trunkNodes = getActiveTrunkNodes( hierarchy );
        const loadDirection = getCrownLoadDirection( hierarchy, positions );
        const trunkGeometry = createMonumentalTrunkGeometry( trunkNodes, positions, {
            asymmetry,
            conduitWeight: parameters.conduitWeight ?? 1,
            loadDirection,
            informationRoute
        } );
        trunkMesh = new THREE.Mesh( trunkGeometry, trunk.material );
        trunkMesh.name = 'monumental trunk';
        trunkMesh.userData.monumentalTrunk = {
            nodes: trunkNodes,
            positions,
            asymmetry,
            conduitWeight: parameters.conduitWeight ?? 1,
            loadDirection,
            informationRoute,
            growthSignature: null
        };
        group.add( trunkMesh );

        const carrierConstructionStarted = performance.now();
        const interiorDescriptor = createTrunkInteriorDescriptor(
            hierarchy,
            positions,
            {
                asymmetry,
                conduitWeight: parameters.conduitWeight ?? 1,
                loadDirection
            }
        );
        const interiorGeometry = createTrunkInteriorSkeletonGeometry(
            interiorDescriptor
        );
        interiorGeometry.userData.trunkInterior.constructionTimeMs =
            performance.now() - carrierConstructionStarted;
        interiorSkeletonMesh = new THREE.Mesh(
            interiorGeometry,
            interiorSkeleton.material
        );
        interiorSkeletonMesh.name = 'trunk interior carrier skeleton';
        interiorSkeletonMesh.userData.trunkInteriorSkeleton = true;
        interiorSkeletonMesh.visible = false;
        group.add( interiorSkeletonMesh );

        const trunkEnvelope = createTrunkEnvelopeDescriptor(
            hierarchy,
            positions,
            {
                asymmetry,
                conduitWeight: parameters.conduitWeight ?? 1
            }
        );
        const routerSeedSegment = informationRoute.byChildId.get(
            trunkRuneTransducerSite.childId
        );
        const routerSeedSpan = trunkNodes.findIndex( ( node, index ) =>
            node.id === trunkRuneTransducerSite.parentId
            && trunkNodes[index + 1]?.id === trunkRuneTransducerSite.childId
        );
        if ( routerSeedSegment && routerSeedSpan >= 0 )
        {
            const routerSeedCurveParameter = routerSeedSegment.curve.getUtoTmapping(
                trunkRuneTransducerSite.localProgress
            );
            internalRouterConstruction = {
                envelope: trunkEnvelope,
                seedPoint: routerSeedSegment.curve.getPointAt(
                    trunkRuneTransducerSite.localProgress
                ),
                seedLongitudinalStation: (
                    routerSeedSpan + routerSeedCurveParameter
                ) * trunkEnvelope.samplesPerSpan,
                seedSite: trunkRuneTransducerSite
            };
            replaceInternalRouterTree( internalRouterMaximumTier );
        }
        createInternalRouterJunctionDiagnostic();
        createInternalRouterTransportDiagnostic();
        refreshInternalRouterJunctionDiagnostic( 0 );
        refreshInternalRouterTransportDiagnostic( 0, parameters );
        replaceTrunkVisibilityGeometry( trunkGeometry, trunkNodes );
        attachApertureCandidates( trunkVisibilityMode === 'aperture' );

        for ( const edge of hierarchy.edges )
        {
            if ( isTrunkEdge( edge ) ) continue;
            const startData = positions.get( edge.parent.id );
            const endData = positions.get( edge.child.id );
            const start = new THREE.Vector3( startData.x, startData.y, startData.z );
            const end = new THREE.Vector3( endData.x, endData.y, endData.z );
            const curve = createBranchCurve( start, end, edge, asymmetry );
            const radii = getConduitRadii( edge, parameters.conduitWeight ?? 1 );
            const routeSegment = informationRoute.byChildId.get( edge.child.id );
            const entry = edge.child.kind === 'terminal' ? terminal : limb;
            const geometry = createTaperedTubeGeometry(
                curve,
                radii.start,
                Math.max( radii.end, 0.045 ),
                28,
                14
            );
            if ( routeSegment ) applyInformationRouteAttributes( geometry, routeSegment );
            const mesh = new THREE.Mesh( geometry, entry.material );
            mesh.name = `${edge.parent.id} -> ${edge.child.id}`;
            mesh.userData.node = edge.child;
            if ( routeSegment ) mesh.userData.informationRoute = routeSegment;
            group.add( mesh );
        }

        const coreGeometry = createInformationTrafficGeometry(
            informationRoutes,
            parameters.conduitWeight ?? 1.34,
            informationTrafficSamples
        );
        informationPacketRadius =
            coreGeometry.userData.informationTraffic.radius;
        replaceInternalRouterJunctionFormGeometry();
        trafficEdges = coreGeometry.userData.informationTraffic.trafficEdges;
        trafficEdgeByChildId = new Map( trafficEdges.map( ( edge ) => [
            edge.childId,
            edge
        ] ) );
        informationTraffic = createInformationTrafficTexture(
            informationTrafficSamples,
            trafficEdges.length
        );
        informationCore.uniforms.trafficTexture.value = informationTraffic.texture;
        const coreMesh = new THREE.Mesh( coreGeometry, informationCore.material );
        coreMesh.name = 'routed information core';
        coreMesh.renderOrder = 3;
        coreMesh.userData.informationCore = {
            routeCount: informationRoutes.length,
            uniqueEdgeCount: trafficEdges.length
        };
        coreMesh.userData.informationTraffic = coreGeometry.userData.informationTraffic;
        group.add( coreMesh );
        refreshInternalRouterJunctionForm();
        applyGrowthProgress();
    }

    function applyGrowthProgress()
    {
        const eligibleLatent = hierarchy.nodes.filter( ( node ) => node.latent && node.growthEligible !== false );
        const crownProgress = eligibleLatent.length > 0
            ? eligibleLatent.reduce( ( sum, node ) => sum + ( growthProgress.get( node.id ) ?? 0 ), 0 ) / eligibleLatent.length
            : 1;
        const isolated = trunkVisibilityMode === 'isolated';
        const apertureActive = trunkVisibilityMode === 'aperture';
        for ( const mesh of group.children )
        {
            if ( mesh.userData.internalRouterTransportDiagnostic )
            {
                refreshInternalRouterTransportDiagnostic(
                    informationLastElapsed ?? 0
                );
                continue;
            }
            if ( mesh.userData.internalRouterJunctionDiagnostic )
            {
                refreshInternalRouterJunctionDiagnostic(
                    informationLastElapsed ?? 0
                );
                continue;
            }
            if ( mesh.userData.internalRouterTree )
            {
                mesh.visible = internalRouterDiagnosticVisible
                    && !internalRouterTransportDiagnosticVisible;
                continue;
            }
            if ( mesh.userData.trunkInteriorSkeleton )
            {
                updateInteriorCarrierVisibility();
                continue;
            }
            if ( mesh.userData.trunkVisibilityAperture
                || mesh.userData.trunkVisibilityLiner )
            {
                // Draw ranges and visibility are synchronised by the source
                // trunk immediately before these candidates are visited.
                continue;
            }
            if ( mesh.userData.trunkRunes )
            {
                applyTrunkRuneVisibility();
                continue;
            }
            if ( mesh.userData.informationCore )
            {
                mesh.visible = surfaceVisible && !isolated;
                continue;
            }
            const monumentalTrunk = mesh.userData.monumentalTrunk;
            if ( monumentalTrunk )
            {
                const crownStep = Math.round( crownProgress * 28 ) / 28;
                const nodeSteps = monumentalTrunk.nodes.map( ( node ) => node.latent
                    ? Math.round( ( growthProgress.get( node.id ) ?? 0 ) * 28 ) / 28
                    : crownStep );
                const signature = nodeSteps.join( ':' );
                if ( signature !== monumentalTrunk.growthSignature )
                {
                    monumentalTrunk.growthSignature = signature;
                    const nodeScales = monumentalTrunk.nodes.map( ( node, index ) => node.latent
                        ? 0.48 + nodeSteps[index] * 0.52
                        : 0.58 + crownStep * 0.42 );
                    mesh.geometry.dispose();
                    mesh.geometry = createMonumentalTrunkGeometry(
                        monumentalTrunk.nodes,
                        monumentalTrunk.positions,
                        {
                            asymmetry: monumentalTrunk.asymmetry,
                            conduitWeight: monumentalTrunk.conduitWeight,
                            loadDirection: monumentalTrunk.loadDirection,
                            informationRoute: monumentalTrunk.informationRoute,
                            nodeScales
                        }
                    );
                    replaceTrunkVisibilityGeometry(
                        mesh.geometry,
                        monumentalTrunk.nodes
                    );
                }

                const metadata = mesh.geometry.userData.monumentalTrunk;
                const firstLatentIndex = monumentalTrunk.nodes.findIndex( ( node ) => node.latent );
                let visibleSegments = metadata.plantingSegmentCount + ( firstLatentIndex < 0
                    ? monumentalTrunk.nodes.length - 1
                    : firstLatentIndex - 1 ) * metadata.samplesPerSpan;
                let complete = firstLatentIndex < 0;
                if ( firstLatentIndex >= 0 )
                {
                    complete = true;
                    for ( let index = firstLatentIndex; index < monumentalTrunk.nodes.length; index += 1 )
                    {
                        const progress = growthProgress.get( monumentalTrunk.nodes[index].id ) ?? 0;
                        const spanSegments = Math.floor( progress * metadata.samplesPerSpan );
                        visibleSegments += spanSegments;
                        if ( spanSegments < metadata.samplesPerSpan )
                        {
                            complete = false;
                            break;
                        }
                    }
                }
                const indexCount = metadata.baseIndexCount
                    + visibleSegments * metadata.radialSegments * 6
                    + ( complete ? metadata.topIndexCount : 0 );
                const sourceDrawCount = Math.min(
                    mesh.geometry.index.count,
                    indexCount
                );
                mesh.geometry.setDrawRange( 0, sourceDrawCount );
                mesh.visible = surfaceVisible && !isolated && !apertureActive;
                if ( apertureTrunkMesh )
                {
                    apertureTrunkMesh.geometry.setDrawRange(
                        0,
                        mapApertureCandidateDrawCount(
                            apertureTrunkMesh.geometry,
                            sourceDrawCount
                        )
                    );
                    apertureTrunkMesh.visible = surfaceVisible && apertureActive;
                }
                if ( apertureLinerMesh )
                {
                    const aperture = apertureTrunkMesh.geometry.userData
                        .trunkVisibilityAperture;
                    const apertureSupported = aperture.omittedIndexOffsets.every(
                        ( offset ) => sourceDrawCount >= offset + 6
                    );
                    apertureLinerMesh.visible = surfaceVisible
                        && apertureActive
                        && apertureSupported;
                }
                updateTrunkVisibilityMetadata();
                continue;
            }

            const node = mesh.userData.node;
            const progress = node.growthEligible === false
                ? 0
                : node.latent ? ( growthProgress.get( node.id ) ?? 0 ) : 1;
            const indexCount = mesh.geometry.index.count;
            const segmentSize = 14 * 6;
            const visibleCount = Math.floor( indexCount * progress / segmentSize ) * segmentSize;
            mesh.geometry.setDrawRange( 0, Math.min( indexCount, visibleCount ) );
            mesh.visible = surfaceVisible && !isolated && progress > 0;
        }
        group.visible = surfaceVisible
            || trunkVisibilityMode !== 'off'
            || internalRouterDiagnosticVisible
            || internalRouterJunctionDiagnosticVisible
            || internalRouterTransportDiagnosticVisible;
        if ( internalRouterMesh )
        {
            updateInternalRouterTreeRuntimeMetadata();
        }
    }

    rebuild( initialPositions, initialParameters );
    return {
        group,
        rebuild,
        update( elapsed, parameters = {} ) {
            latestMotionParameters = parameters;
            const packetSpeed = Math.max(
                0.05,
                parameters.packetSpeed ?? defaultInformationSpeed
            );
            const packetFrequency = Math.max(
                0.01,
                parameters.packetFrequency ?? defaultInformationFrequency
            );
            const delta = informationLastElapsed === null
                ? 0
                : Math.max( 0, elapsed - informationLastElapsed );
            informationLastElapsed = elapsed;

            const intervalStart = elapsed - delta;
            const nextActivePackets = [];
            const retainActivePacket = ( packet ) => {
                if ( packet
                    && ( packet.kind === 'transduced-output'
                        || routeIsManifested( packet.route ) )
                    && packet.headDistance
                        <= packet.route.totalDistance + informationTrailLength )
                {
                    nextActivePackets.push( packet );
                }
            };

            const nextInRunePackets = [];
            for ( const traversal of inRunePackets )
            {
                const previousDistance = traversal.distance;
                if ( traversal.motionSpeed !== packetSpeed )
                {
                    traversal.motionAnchorTime = intervalStart;
                    traversal.motionAnchorDistance = previousDistance;
                    traversal.motionSpeed = packetSpeed;
                }
                const nextDistance = traversal.motionAnchorDistance
                    + Math.max( 0, elapsed - traversal.motionAnchorTime )
                        * packetSpeed;
                const advanced = advanceTrunkRuneTraversal(
                    traversal,
                    nextDistance,
                    elapsed,
                    packetSpeed
                );
                if ( advanced.traversal )
                {
                    nextInRunePackets.push( advanced.traversal );
                }
                retainActivePacket( advanced.output );
            }
            inRunePackets = nextInRunePackets;

            for ( const packet of activePackets )
            {
                if ( packet.kind === 'source'
                    && !routeIsManifested( packet.route ) )
                {
                    continue;
                }
                const previousHeadDistance = packet.headDistance;
                if ( packet.motionSpeed !== packetSpeed )
                {
                    packet.motionAnchorTime = intervalStart;
                    packet.motionAnchorDistance = previousHeadDistance;
                    packet.motionSpeed = packetSpeed;
                }
                const nextHeadDistance = packet.motionAnchorDistance
                    + Math.max( 0, elapsed - packet.motionAnchorTime )
                        * packetSpeed;
                if ( packet.kind === 'source' )
                {
                    const transferred = transferSourcePacket(
                        packet,
                        previousHeadDistance,
                        nextHeadDistance,
                        intervalStart,
                        elapsed,
                        packetSpeed
                    );
                    if ( transferred.traversal )
                    {
                        inRunePackets.push( transferred.traversal );
                    }
                    retainActivePacket( transferred.packet );
                    retainActivePacket( transferred.output );
                    continue;
                }
                packet.headDistance = nextHeadDistance;
                retainActivePacket( packet );
            }
            activePackets = nextActivePackets;
            refreshRouteManifestationTimes( elapsed );

            if ( emitters.length === 0 ) initialiseEmitters( elapsed, packetFrequency );
            else if ( informationLastFrequency !== packetFrequency )
            {
                // Settle the old distributed schedule before compressing or
                // expanding its remaining waits. This avoids collapsing any
                // overdue emitters into one slider-change flash.
                emitDuePackets(
                    elapsed,
                    packetSpeed,
                    informationLastFrequency ?? packetFrequency
                );
                rephaseEmitters( elapsed, packetFrequency );
            }
            emitDuePackets( elapsed, packetSpeed, packetFrequency );
            if ( internalRouterTransportEnabled )
            {
                internalRouterTransport.advance(
                    intervalStart,
                    elapsed,
                    packetSpeed
                );
            }

            for ( const entry of materialEntries )
            {
                entry.uniforms.relief.value = parameters.surfaceRelief ?? 0.1;
                updateRootedMotionUniforms( entry, elapsed, parameters );
            }
            updateRootedMotionUniforms(
                informationCore,
                elapsed,
                parameters
            );
            const trafficState = stampInformationTraffic();
            updateTrunkRuneTraversals();
            refreshInternalRouterJunctionDiagnostic( elapsed, parameters );
            if ( internalRouterTransportEnabled )
            {
                refreshInternalRouterTransportDiagnostic(
                    elapsed,
                    parameters
                );
            }
            refreshInternalRouterJunctionForm();
            const manifestedRoutes = informationRoutes.filter( routeIsManifested );
            const routerTransportState = internalRouterTransport.snapshot();
            const packetDiagnostics = activePackets.map( ( packet ) => {
                const activeSegment = packet.route.segments.find( ( segment ) =>
                    packet.headDistance >= segment.childDistance
                    && packet.headDistance <= segment.parentDistance
                );
                return {
                    id: packet.id,
                    kind: packet.kind,
                    signalClass: packet.signalClass,
                    terminalId: packet.terminalId,
                    emittedAt: packet.emittedAt,
                    sourceEmittedAt: packet.sourceEmittedAt ?? packet.emittedAt,
                    transformedAt: packet.transformedAt ?? null,
                    resumedAt: packet.resumedAt ?? null,
                    sourcePacketId: packet.sourcePacketId ?? null,
                    provenance: packet.provenance ?? null,
                    headDistance: packet.headDistance,
                    routeStartDistance: packet.routeStartDistance ?? 0,
                    totalDistance: packet.route.totalDistance,
                    routeNodeIds: packet.route.nodeIds,
                    activeSegment: activeSegment
                        ? `${activeSegment.childId} -> ${activeSegment.parentId}`
                        : packet.headDistance > packet.route.totalDistance ? 'root fade' : null
                };
            } );
            group.userData.routedLight = {
                eligibleTerminalIds: informationRoutes.map( ( route ) => route.terminalId ),
                eligibleEmitterCount: informationRoutes.length,
                manifestedEmitterCount: manifestedRoutes.length,
                packetCount: activePackets.length,
                activeTransportPacketCount: activePackets.length,
                inRunePacketCount: inRunePackets.length,
                activeEventCount: activePackets.length + inRunePackets.length
                    + routerTransportState.activePacketCount,
                emittedPacketCount,
                sourcePacketCount: activePackets.filter( ( packet ) =>
                    packet.kind === 'source'
                ).length,
                transducedOutputPacketCount: activePackets.filter( ( packet ) =>
                    packet.kind === 'transduced-output'
                ).length + routerTransportState.activePacketCount,
                internalRouterPacketCount: routerTransportState.activePacketCount,
                internalRouterPackets: routerTransportState.activePackets,
                activePackets: packetDiagnostics,
                packetSpeed,
                packetFrequency,
                coreMeshCount: group.children.filter( ( mesh ) =>
                    mesh.userData.informationCore
                ).length,
                uniqueEdgeCount: trafficEdges.length,
                occupiedEdgeCount: trafficState.occupiedEdgeCount,
                sourceOccupiedEdgeCount: trafficState.sourceOccupiedEdgeCount,
                outputOccupiedEdgeCount: trafficState.outputOccupiedEdgeCount,
                illuminatedSampleRatio: trafficState.illuminatedSampleRatio,
                emissionSchedule: emitters.map( ( emitter ) => ( {
                    terminalId: emitter.route.terminalId,
                    phase: emitter.phase,
                    nextEmissionAt: emitter.nextEmissionAt
                } ) )
            };
        },
        setVisible( visible ) {
            surfaceVisible = visible;
            applyGrowthProgress();
        },
        setInteriorDiagnosticVisible( visible ) {
            interiorDiagnosticVisible = visible;
            trunkVisibilityMode = visible ? 'isolated' : 'off';
            attachApertureCandidates( false );
            applyGrowthProgress();
        },
        setTrunkVisibilityMode( mode ) {
            if ( !trunkVisibilityModes.includes( mode ) )
            {
                throw new Error( `Unknown trunk visibility mode '${mode}'.` );
            }
            trunkVisibilityMode = mode;
            interiorDiagnosticVisible = mode === 'isolated';
            attachApertureCandidates( mode === 'aperture' );
            applyGrowthProgress();
        },
        getTrunkVisibilityMode() {
            return trunkVisibilityMode;
        },
        getTrunkVisibilityResources() {
            return {
                mode: trunkVisibilityMode,
                revision: trunkVisibilityResourceRevision,
                trunkMesh,
                apertureTrunkMesh,
                apertureLinerMesh,
                skeletonMesh: interiorSkeletonMesh,
                proxyGeometry: trunkVisibilityProxyGeometry,
                ownershipGeometry: trunkVisibilityOwnershipGeometry,
                deformationUniforms: trunk.uniforms,
                diagnostics: group.userData.trunkVisibility
            };
        },
        setInternalRouterTiers( tiers ) {
            const nextMaximumTier = normaliseInternalRouterTiers( tiers );
            if ( nextMaximumTier === internalRouterMaximumTier
                && internalRouterMesh )
            {
                return internalRouterMaximumTier;
            }
            const replaced = replaceInternalRouterTree( nextMaximumTier );
            if ( replaced ) applyGrowthProgress();
            return internalRouterMaximumTier;
        },
        setInternalRouterDiagnosticVisible( visible ) {
            internalRouterDiagnosticVisible = Boolean( visible );
            applyGrowthProgress();
        },
        getInternalRouterTreeResources() {
            return {
                enabled: internalRouterDiagnosticVisible,
                revision: internalRouterResourceRevision,
                mesh: internalRouterMesh,
                geometry: internalRouterMesh?.geometry ?? null,
                material: internalRouterDiagnostic.material,
                descriptor: internalRouterMesh?.geometry.userData
                    .internalRouterTree?.descriptor ?? null,
                maximumTier: internalRouterMaximumTier,
                diagnostics: group.userData.internalRouterTree
            };
        },
        setInternalRouterJunctionDiagnosticVisible( visible ) {
            internalRouterJunctionDiagnosticVisible =
                internalRouterJunctionEnabled && Boolean( visible );
            applyGrowthProgress();
            return internalRouterJunctionDiagnosticVisible;
        },
        getInternalRouterJunctionResources() {
            const ledger = internalRouterJunctionLedger.snapshot();
            return {
                enabled: internalRouterJunctionEnabled,
                diagnosticVisible: internalRouterJunctionDiagnosticVisible,
                revision: internalRouterJunctionResourceRevision,
                group: internalRouterJunctionDiagnosticGroup,
                ingressMesh: internalRouterJunctionIngressMesh,
                ingressTrace: internalRouterJunctionIngressTrace,
                outputMesh: internalRouterJunctionOutputMesh,
                materials: [
                    internalRouterJunctionIngressMaterial,
                    internalRouterJunctionTraceMaterial,
                    internalRouterJunctionOutputMaterial
                ],
                ledger,
                entryRecords: ledger.entryRecords,
                transductionRecords: ledger.transductionRecords,
                parkedOutputs: ledger.parkedOutputs,
                diagnostics: group.userData.internalRouterJunction ?? null
            };
        },
        setInternalRouterTransportDiagnosticVisible( visible ) {
            internalRouterTransportDiagnosticVisible =
                internalRouterTransportEnabled && Boolean( visible );
            applyGrowthProgress();
            return internalRouterTransportDiagnosticVisible;
        },
        setInternalRouterPresentationEnabled( enabled ) {
            internalRouterPresentationEnabled = internalRouterTransportEnabled
                && Boolean( enabled );
            updateInternalRouterPresentationMetadata();
            refreshInternalRouterJunctionForm();
            return internalRouterPresentationEnabled;
        },
        getInternalRouterPresentationResources() {
            const rendererEligible = Boolean(
                trunkMesh && trunkRuneVisibilityProxyGeometry
            );
            const presentationActive = internalRouterPresentationEnabled
                && surfaceVisible
                && trunkVisibilityMode === 'off'
                && rendererEligible
                && ( group.userData.internalRouterPresentation
                    ?.activePacketCount ?? 0 ) > 0;
            const transport = presentationActive
                ? internalRouterTransport.snapshot()
                : null;
            const packetTrails = presentationActive
                ? internalRouterTransport.samplePresentationTrails( {
                    trailLength: informationPacketVisualProfile.trailLength,
                    maximumSegmentLength:
                        informationPacketVisualProfile
                            .internalMaximumSegmentLength
                } )
                : Object.freeze( [] );
            return {
                enabled: internalRouterPresentationEnabled,
                candidateId: internalRouterPresentationCandidateId,
                revision: internalRouterTransportResourceRevision,
                trunkRevision: trunkVisibilityResourceRevision,
                trunkMesh,
                proxyGeometry: trunkRuneVisibilityProxyGeometry,
                packetTrails,
                trailSegmentCount: packetTrails.reduce(
                    ( total, trail ) => total + trail.segmentCount,
                    0
                ),
                trailSampleCount: packetTrails.reduce(
                    ( total, trail ) => total + trail.samples.length,
                    0
                ),
                packetVisualProfile: informationPacketVisualProfile,
                packetRadius: informationPacketRadius,
                deformationUniforms: trunk.uniforms,
                activePackets: transport?.activePackets ?? Object.freeze( [] ),
                activePacketIds: ( transport?.activePackets ?? [] ).map(
                    ( packet ) => packet.id
                ),
                diagnostics: group.userData.internalRouterPresentation ?? null
            };
        },
        setInternalRouterJunctionFormEnabled( enabled ) {
            internalRouterJunctionFormEnabled = internalRouterTransportEnabled
                && Boolean( enabled );
            refreshInternalRouterJunctionForm();
            return internalRouterJunctionFormEnabled;
        },
        setInternalRouterJunctionFormCircumference( value ) {
            const next = normaliseInternalRouterJunctionFormCircumference(
                value
            );
            if ( next === internalRouterJunctionFormCircumference ) return next;
            internalRouterJunctionFormCircumference = next;
            replaceInternalRouterJunctionFormGeometry();
            refreshInternalRouterJunctionForm();
            return internalRouterJunctionFormCircumference;
        },
        getInternalRouterJunctionFormResources() {
            return {
                enabled: internalRouterJunctionFormEnabled,
                effectiveEnabled: internalRouterJunctionFormEnabled
                    && internalRouterPresentationEnabled,
                candidateId: internalRouterJunctionFormCandidateId,
                circumference: internalRouterJunctionFormCircumference,
                circumferenceRange:
                    internalRouterJunctionFormCircumferenceRange,
                revision: internalRouterJunctionFormResourceRevision,
                geometry: internalRouterJunctionFormGeometry,
                manifestations: internalRouterJunctionFormManifestations,
                active: internalRouterJunctionFormState.active,
                maximumSignal: internalRouterJunctionFormState.maximumSignal,
                diagnostics: group.userData.internalRouterJunctionForm ?? null
            };
        },
        getInternalRouterTransportResources() {
            const transport = internalRouterTransport.snapshot();
            return {
                enabled: internalRouterTransportEnabled,
                diagnosticVisible: internalRouterTransportDiagnosticVisible,
                revision: internalRouterTransportResourceRevision,
                group: internalRouterTransportDiagnosticGroup,
                guide: internalRouterTransportGuideLine,
                packetMesh: internalRouterTransportPacketMesh,
                packetCapacity: internalRouterTransportPacketCapacity,
                materials: [
                    internalRouterTransportGuide.material,
                    internalRouterTransportPacket.material
                ],
                transport,
                activePackets: transport.activePackets,
                dispatchRecords: transport.dispatchRecords,
                completionRecords: transport.completionRecords,
                diagnostics: group.userData.internalRouterTransport ?? null
            };
        },
        setTrunkRunesVisible( visible ) {
            trunkRunesVisible = Boolean( visible );
            applyTrunkRuneVisibility();
        },
        getTrunkRuneResources() {
            const internalArborescence = trunkRuneCandidateId
                === trunkRuneCandidateIds.internalArborescence;
            return {
                enabled: trunkRunesVisible,
                candidateId: trunkRuneCandidateId,
                revision: trunkRuneResourceRevision,
                mesh: trunkRuneMesh,
                geometry: trunkRuneMesh?.geometry ?? null,
                material: trunkRuneMaterial,
                materials: trunkRuneMesh ? [ trunkRuneMesh.material ] : [
                    trunkRuneMaterial
                ],
                granuleMesh: trunkRuneGranuleMesh,
                granuleGeometry: trunkRuneGranuleMesh?.geometry ?? null,
                ownershipGeometry: internalArborescence
                    ? trunkRuneVisibilityOwnershipGeometry
                    : null,
                proxyGeometry: internalArborescence
                    ? trunkRuneVisibilityProxyGeometry
                    : trunkVisibilityProxyGeometry,
                trunkMesh,
                deformationUniforms: trunk.uniforms,
                sites: trunkRuneSites,
                transducerSite: trunkRuneTransducerSite,
                activeTraversals: inRunePackets,
                entryRecords: trunkRuneDepartureRecords,
                transductionRecords: trunkRuneTransductionRecords,
                centreResumeRecords: trunkRuneResumeRecords,
                diagnostics: group.userData.trunkRunes
            };
        },
        setGrowthProgress( progress ) {
            growthProgress = progress;
            applyGrowthProgress();
        }
    };
}

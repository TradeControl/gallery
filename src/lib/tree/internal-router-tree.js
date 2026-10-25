import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createTaperedTubeGeometry } from './tree-layer.js';

export const internalRouterCandidateId = 'd1-inverted-internal-router-v1';

export const internalRouterSeedSite = Object.freeze( {
    id: 'meaning-passage',
    parentId: 'exchange',
    childId: 'meaning',
    localProgress: 0.58
} );

export const internalRouterTierRange = Object.freeze( {
    min: 3,
    max: 6,
    default: 3
} );

function createTopology( maximumTier )
{
    const terminalCount = 3 * 2 ** ( maximumTier - 1 );
    const nodeCount = 1 + 3 * ( 2 ** maximumTier - 1 );
    return Object.freeze( {
        levelCount: maximumTier + 1,
        maximumTier,
        firstSplitCount: 3,
        recursiveSplitCount: 2,
        nodeCount,
        edgeCount: nodeCount - 1,
        terminalCount
    } );
}

export const internalRouterTopology = createTopology(
    internalRouterTierRange.default
);

function resolveMaximumTier( requestedMaximumTier )
{
    const requested = requestedMaximumTier
        ?? internalRouterTierRange.default;
    if ( !Number.isInteger( requested )
        || requested < internalRouterTierRange.min
        || requested > internalRouterTierRange.max )
    {
        throw new Error(
            `Internal router maximumTier must be an integer from ${internalRouterTierRange.min} to ${internalRouterTierRange.max}.`
        );
    }
    return {
        requestedMaximumTier: requested,
        appliedMaximumTier: requested,
        topology: requested === internalRouterTopology.maximumTier
            ? internalRouterTopology
            : createTopology( requested )
    };
}

/*
 * The exported default topology remains the accepted D1 baseline. Runtime
 * descriptors carry their own derived topology when the review control asks
 * for additional recursive tiers.
 */
export const internalRouterGrowthWallScale = 0.58;

const defaultTubeRadius = 0.025;
const defaultTerminalTubeRadius = 0.011;
const defaultWallMargin = 0.014;
const routerTubularSegments = 32;
const routerRadialSegments = 6;
const routerAuditSamples = routerTubularSegments + 1;
const containmentTolerance = 1e-6;

function stableHash( value )
{
    let hash = 2166136261;
    for ( let index = 0; index < value.length; index += 1 )
    {
        hash ^= value.charCodeAt( index );
        hash = Math.imul( hash, 16777619 );
    }
    return hash >>> 0;
}

function stableSignedUnit( value )
{
    return stableHash( value ) / 0xffffffff * 2 - 1;
}

function wrapAngle( angle )
{
    const fullTurn = Math.PI * 2;
    return ( angle % fullTurn + fullTurn ) % fullTurn;
}

function vectorFrom( value, label )
{
    if ( value?.isVector3 ) return value.clone();
    if ( Array.isArray( value ) || ArrayBuffer.isView( value ) )
    {
        if ( value.length >= 3 ) return new THREE.Vector3().fromArray( value );
    }
    throw new Error( `Internal router ${label} must be a three-dimensional vector.` );
}

function normaliseFrame( tangent, major, preferredMinor )
{
    tangent.normalize();
    major.addScaledVector( tangent, -major.dot( tangent ) );
    if ( major.lengthSq() < 1e-10 )
    {
        const reference = Math.abs( tangent.y ) < 0.9
            ? new THREE.Vector3( 0, 1, 0 )
            : new THREE.Vector3( 1, 0, 0 );
        major.crossVectors( tangent, reference );
    }
    major.normalize();
    const minor = new THREE.Vector3().crossVectors( tangent, major ).normalize();
    if ( preferredMinor && minor.dot( preferredMinor ) < 0 )
    {
        major.negate();
        minor.negate();
    }
    return { tangent, major, minor };
}

function validateEnvelope( envelope )
{
    if ( !envelope || !Array.isArray( envelope.stations )
        || envelope.stations.length < 2 )
    {
        throw new Error( 'The internal router requires at least two trunk-envelope stations.' );
    }
    if ( !Array.isArray( envelope.trunkNodeIds )
        || envelope.trunkNodeIds.length < 2 )
    {
        throw new Error( 'The internal router requires ordered trunk node identifiers.' );
    }
    const samplesPerSpan = Number( envelope.samplesPerSpan );
    if ( !Number.isInteger( samplesPerSpan ) || samplesPerSpan < 1 )
    {
        throw new Error( 'The internal router envelope requires a positive samplesPerSpan.' );
    }
    const stations = envelope.stations.map( ( source, index ) => {
        const longitudinalStation = Number(
            source.longitudinalStation ?? source.stationIndex ?? index
        );
        const conservativeShellRadius = Number( source.conservativeShellRadius );
        if ( !Number.isFinite( longitudinalStation )
            || !Number.isFinite( conservativeShellRadius )
            || conservativeShellRadius <= 0 )
        {
            throw new Error( `Invalid internal router envelope station ${index}.` );
        }
        const centre = vectorFrom( source.centre, `station ${index} centre` );
        const tangent = vectorFrom( source.tangent, `station ${index} tangent` );
        const major = vectorFrom( source.major, `station ${index} major` );
        const preferredMinor = vectorFrom( source.minor, `station ${index} minor` );
        const frame = normaliseFrame( tangent, major, preferredMinor );
        return Object.freeze( {
            stationIndex: source.stationIndex ?? index,
            span: source.span ?? source.spanIndex ?? null,
            localProgress: source.localProgress ?? null,
            longitudinalStation,
            centre,
            tangent: frame.tangent,
            major: frame.major,
            minor: frame.minor,
            conservativeShellRadius
        } );
    } ).sort( ( left, right ) =>
        left.longitudinalStation - right.longitudinalStation
    );
    for ( let index = 1; index < stations.length; index += 1 )
    {
        if ( stations[index].longitudinalStation
            <= stations[index - 1].longitudinalStation )
        {
            throw new Error( 'Internal router envelope stations must be strictly ordered.' );
        }
    }
    return {
        trunkNodeIds: envelope.trunkNodeIds.slice(),
        samplesPerSpan,
        suppliedWallClearanceScale: Number.isFinite( envelope.wallClearanceScale )
            ? Number( envelope.wallClearanceScale )
            : internalRouterGrowthWallScale,
        stations
    };
}

function createEnvelopeSampler( validatedEnvelope )
{
    const stations = validatedEnvelope.stations;
    const minimumStation = stations[0].longitudinalStation;
    const maximumStation = stations.at( -1 ).longitudinalStation;

    return function sampleEnvelope( requestedStation )
    {
        const longitudinalStation = THREE.MathUtils.clamp(
            requestedStation,
            minimumStation,
            maximumStation
        );
        let rightIndex = 1;
        while ( rightIndex < stations.length
            && stations[rightIndex].longitudinalStation < longitudinalStation )
        {
            rightIndex += 1;
        }
        rightIndex = Math.min( stations.length - 1, rightIndex );
        const left = stations[rightIndex - 1];
        const right = stations[rightIndex];
        const span = Math.max(
            right.longitudinalStation - left.longitudinalStation,
            Number.EPSILON
        );
        const amount = THREE.MathUtils.clamp(
            ( longitudinalStation - left.longitudinalStation ) / span,
            0,
            1
        );
        const centre = left.centre.clone().lerp( right.centre, amount );
        const tangent = left.tangent.clone().lerp( right.tangent, amount );
        const major = left.major.clone().lerp( right.major, amount );
        const preferredMinor = left.minor.clone().lerp( right.minor, amount );
        const frame = normaliseFrame( tangent, major, preferredMinor );
        return {
            longitudinalStation,
            centre,
            tangent: frame.tangent,
            major: frame.major,
            minor: frame.minor,
            conservativeShellRadius: THREE.MathUtils.lerp(
                left.conservativeShellRadius,
                right.conservativeShellRadius,
                amount
            )
        };
    };
}

function resolveSeed( request, envelope )
{
    const site = request.seedSite ?? internalRouterSeedSite;
    const routeSegment = request.routeSegment
        ?? request.informationRoute?.byChildId?.get( site.childId );
    if ( routeSegment && routeSegment.parentId !== site.parentId )
    {
        throw new Error( 'The internal router seed route does not match its authored site.' );
    }
    const seedPoint = request.seedPoint !== undefined
        ? vectorFrom( request.seedPoint, 'seed point' )
        : routeSegment?.curve?.getPointAt( site.localProgress );
    if ( !seedPoint )
    {
        throw new Error( 'The internal router requires an exact seed point or route segment.' );
    }
    let seedLongitudinalStation = Number( request.seedLongitudinalStation );
    if ( !Number.isFinite( seedLongitudinalStation ) )
    {
        const span = envelope.trunkNodeIds.findIndex( ( nodeId, index ) =>
            nodeId === site.parentId
            && envelope.trunkNodeIds[index + 1] === site.childId
        );
        if ( span < 0 )
        {
            throw new Error( 'The internal router envelope does not contain its seed span.' );
        }
        seedLongitudinalStation = ( span + site.localProgress )
            * envelope.samplesPerSpan;
    }
    const minimumStation = envelope.stations[0].longitudinalStation;
    const maximumStation = envelope.stations.at( -1 ).longitudinalStation;
    if ( seedLongitudinalStation <= minimumStation
        || seedLongitudinalStation > maximumStation )
    {
        throw new Error( 'The internal router seed station lies outside the trunk envelope.' );
    }
    return {
        site: Object.freeze( {
            id: site.id,
            parentId: site.parentId,
            childId: site.childId,
            localProgress: site.localProgress
        } ),
        point: seedPoint,
        longitudinalStation: seedLongitudinalStation
    };
}

function clampOffset( requestedU, requestedV, availableRadius )
{
    const requestedRadius = Math.hypot( requestedU, requestedV );
    if ( requestedRadius <= availableRadius )
    {
        return {
            u: requestedU,
            v: requestedV,
            requestedRadius,
            actualRadius: requestedRadius,
            constrained: false
        };
    }
    const scale = availableRadius / Math.max( requestedRadius, Number.EPSILON );
    return {
        u: requestedU * scale,
        v: requestedV * scale,
        requestedRadius,
        actualRadius: availableRadius,
        constrained: true
    };
}

function tierRadius( tier, maximumTier, rootRadius, terminalRadius )
{
    return THREE.MathUtils.lerp(
        rootRadius,
        terminalRadius,
        tier / maximumTier
    );
}

const defaultTierRadiusFractions = Object.freeze( [ 0, 0.28, 0.68, 1.12 ] );

function tierRadiusFraction( tier, maximumTier )
{
    if ( maximumTier === internalRouterTopology.maximumTier )
    {
        return defaultTierRadiusFractions[tier];
    }
    if ( tier === 0 ) return 0;
    return THREE.MathUtils.lerp(
        defaultTierRadiusFractions[1],
        defaultTierRadiusFractions.at( -1 ),
        ( tier - 1 ) / ( maximumTier - 1 )
    );
}

class EnvelopeConstrainedRouterCurve extends THREE.Curve
{
    constructor( {
        parent,
        child,
        sampleEnvelope,
        growthWallScale,
        wallMargin,
        startRadius,
        endRadius,
        bendAngle,
        bendAmplitude
    } )
    {
        super();
        this.parentNode = parent;
        this.childNode = child;
        this.sampleEnvelope = sampleEnvelope;
        this.growthWallScale = growthWallScale;
        this.wallMargin = wallMargin;
        this.startRadius = startRadius;
        this.endRadius = endRadius;
        this.bendAngle = bendAngle;
        this.bendAmplitude = bendAmplitude;
        this.arcLengthDivisions = 160;
    }

    getPoint( input, target = new THREE.Vector3() )
    {
        const t = THREE.MathUtils.clamp( input, 0, 1 );
        if ( t <= 1e-12 ) return target.copy( this.parentNode.point );
        if ( t >= 1 - 1e-12 ) return target.copy( this.childNode.point );

        const smooth = t * t * ( 3 - 2 * t );
        const station = THREE.MathUtils.lerp(
            this.parentNode.longitudinalStation,
            this.childNode.longitudinalStation,
            smooth
        );
        const frame = this.sampleEnvelope( station );
        const bend = Math.sin( Math.PI * t ) * this.bendAmplitude;
        const requestedU = THREE.MathUtils.lerp(
            this.parentNode.offsetU,
            this.childNode.offsetU,
            smooth
        ) + Math.cos( this.bendAngle ) * bend;
        const requestedV = THREE.MathUtils.lerp(
            this.parentNode.offsetV,
            this.childNode.offsetV,
            smooth
        ) + Math.sin( this.bendAngle ) * bend;
        const tubeRadius = THREE.MathUtils.lerp(
            this.startRadius,
            this.endRadius,
            smooth
        );
        const availableRadius = Math.max(
            0,
            frame.conservativeShellRadius * this.growthWallScale
                - tubeRadius - this.wallMargin
        );
        const offset = clampOffset( requestedU, requestedV, availableRadius );
        return target.copy( frame.centre )
            .addScaledVector( frame.major, offset.u )
            .addScaledVector( frame.minor, offset.v );
    }
}

function createNode( {
    id,
    parentId,
    tier,
    ordinal,
    longitudinalStation,
    angle,
    requestedRadiusFraction,
    sampleEnvelope,
    growthWallScale,
    tubeRadius,
    wallMargin
} )
{
    const frame = sampleEnvelope( longitudinalStation );
    const growthRadius = frame.conservativeShellRadius * growthWallScale;
    const requestedRadius = growthRadius * requestedRadiusFraction;
    const offset = clampOffset(
        Math.cos( angle ) * requestedRadius,
        Math.sin( angle ) * requestedRadius,
        Math.max( 0, growthRadius - tubeRadius - wallMargin )
    );
    const point = frame.centre.clone()
        .addScaledVector( frame.major, offset.u )
        .addScaledVector( frame.minor, offset.v );
    return {
        id,
        parentId,
        tier,
        ordinal,
        longitudinalStation,
        angle,
        requestedRadiusFraction,
        requestedRadius: offset.requestedRadius,
        actualRadius: offset.actualRadius,
        wallConstrained: offset.constrained,
        growthEnvelopeRadius: growthRadius,
        tubeRadius,
        offsetU: offset.u,
        offsetV: offset.v,
        point
    };
}

function auditEdge( edge, sampleEnvelope, growthWallScale, wallMargin )
{
    const centrelinePoints = new Float32Array( routerAuditSamples * 3 );
    const envelopeCentres = new Float32Array( routerAuditSamples * 3 );
    const envelopeRadii = new Float32Array( routerAuditSamples );
    const longitudinalStations = new Float32Array( routerAuditSamples );
    const tubeRadii = new Float32Array( routerAuditSamples );
    const growthWallClearances = new Float32Array( routerAuditSamples );
    const constraintClearances = new Float32Array( routerAuditSamples );
    let minimumGrowthWallClearance = Number.POSITIVE_INFINITY;
    let minimumConstraintClearance = Number.POSITIVE_INFINITY;
    let breachCount = 0;

    for ( let index = 0; index < routerAuditSamples; index += 1 )
    {
        const arcProgress = index / ( routerAuditSamples - 1 );
        const parameter = edge.curve.getUtoTmapping( arcProgress );
        const smooth = parameter * parameter * ( 3 - 2 * parameter );
        const longitudinalStation = THREE.MathUtils.lerp(
            edge.parent.longitudinalStation,
            edge.child.longitudinalStation,
            smooth
        );
        const frame = sampleEnvelope( longitudinalStation );
        const point = edge.curve.getPointAt( arcProgress );
        const tubeRadius = THREE.MathUtils.lerp(
            edge.startRadius,
            edge.endRadius,
            smooth
        );
        const radialDistance = point.distanceTo( frame.centre );
        const growthRadius = frame.conservativeShellRadius * growthWallScale;
        const growthWallClearance = growthRadius - radialDistance - tubeRadius;
        const constraintClearance = growthWallClearance - wallMargin;

        point.toArray( centrelinePoints, index * 3 );
        frame.centre.toArray( envelopeCentres, index * 3 );
        envelopeRadii[index] = growthRadius;
        longitudinalStations[index] = longitudinalStation;
        tubeRadii[index] = tubeRadius;
        growthWallClearances[index] = growthWallClearance;
        constraintClearances[index] = constraintClearance;
        minimumGrowthWallClearance = Math.min(
            minimumGrowthWallClearance,
            growthWallClearance
        );
        minimumConstraintClearance = Math.min(
            minimumConstraintClearance,
            constraintClearance
        );
        if ( constraintClearance < -containmentTolerance ) breachCount += 1;
    }
    return {
        centrelinePoints,
        envelopeCentres,
        envelopeRadii,
        longitudinalStations,
        tubeRadii,
        growthWallClearances,
        constraintClearances,
        minimumGrowthWallClearance,
        minimumConstraintClearance,
        breachCount,
        sampleCount: routerAuditSamples
    };
}

function createTerminalRoutes( nodes, edges, maximumTier )
{
    const nodeById = new Map( nodes.map( ( node ) => [ node.id, node ] ) );
    const edgeByChildId = new Map( edges.map( ( edge ) => [ edge.childId, edge ] ) );
    return nodes.filter( ( node ) => node.tier === maximumTier )
        .map( ( terminal, routeIndex ) => {
            const reversedNodes = [];
            const reversedEdges = [];
            let cursor = terminal;
            while ( cursor )
            {
                reversedNodes.push( cursor.id );
                const edge = edgeByChildId.get( cursor.id );
                if ( !edge ) break;
                reversedEdges.push( edge.id );
                cursor = nodeById.get( edge.parentId );
            }
            const nodeIds = reversedNodes.reverse();
            const edgeIds = reversedEdges.reverse();
            const totalLength = edgeIds.reduce( ( total, edgeId ) =>
                total + edges.find( ( edge ) => edge.id === edgeId ).pathLength,
            0 );
            return Object.freeze( {
                routeIndex,
                terminalNodeId: terminal.id,
                nodeIds: Object.freeze( nodeIds ),
                edgeIds: Object.freeze( edgeIds ),
                totalLength
            } );
        } );
}

function measureNonJunctionSeparation( edges )
{
    let minimum = Number.POSITIVE_INFINITY;
    let closestEdgeIds = null;
    for ( let leftIndex = 0; leftIndex < edges.length; leftIndex += 1 )
    {
        const left = edges[leftIndex];
        for ( let rightIndex = leftIndex + 1; rightIndex < edges.length; rightIndex += 1 )
        {
            const right = edges[rightIndex];
            if ( left.parentId === right.parentId
                || left.parentId === right.childId
                || left.childId === right.parentId
                || left.childId === right.childId )
            {
                continue;
            }
            const leftPoints = left.audit.centrelinePoints;
            const rightPoints = right.audit.centrelinePoints;
            const leftRadii = left.audit.tubeRadii;
            const rightRadii = right.audit.tubeRadii;
            for ( let leftSample = 0; leftSample < routerAuditSamples; leftSample += 1 )
            {
                const leftOffset = leftSample * 3;
                const leftX = leftPoints[leftOffset];
                const leftY = leftPoints[leftOffset + 1];
                const leftZ = leftPoints[leftOffset + 2];
                for ( let rightSample = 0;
                    rightSample < routerAuditSamples;
                    rightSample += 1 )
                {
                    const rightOffset = rightSample * 3;
                    const deltaX = leftX - rightPoints[rightOffset];
                    const deltaY = leftY - rightPoints[rightOffset + 1];
                    const deltaZ = leftZ - rightPoints[rightOffset + 2];
                    const clearance = Math.sqrt(
                        deltaX * deltaX
                            + deltaY * deltaY
                            + deltaZ * deltaZ
                    ) - leftRadii[leftSample] - rightRadii[rightSample];
                    if ( clearance >= minimum ) continue;
                    minimum = clearance;
                    closestEdgeIds = [ left.id, right.id ];
                }
            }
        }
    }
    return Object.freeze( {
        minimumNonJunctionSeparation: minimum,
        closestEdgeIds: closestEdgeIds
            ? Object.freeze( closestEdgeIds )
            : null,
        hardGate: false
    } );
}

export function createInternalRouterTreeDescriptor( request = {} )
{
    const tierRequest = resolveMaximumTier( request.maximumTier );
    const topology = tierRequest.topology;
    const envelope = validateEnvelope( request.envelope );
    const sampleEnvelope = createEnvelopeSampler( envelope );
    const seed = resolveSeed( request, envelope );
    const tubeRadius = Number( request.tubeRadius ?? defaultTubeRadius );
    const terminalTubeRadius = Number(
        request.terminalTubeRadius ?? defaultTerminalTubeRadius
    );
    const wallMargin = Number( request.wallMargin ?? defaultWallMargin );
    if ( !Number.isFinite( tubeRadius ) || tubeRadius <= 0
        || !Number.isFinite( terminalTubeRadius ) || terminalTubeRadius <= 0
        || terminalTubeRadius > tubeRadius
        || !Number.isFinite( wallMargin ) || wallMargin < 0 )
    {
        throw new Error( 'Invalid internal router tube or wall-margin dimensions.' );
    }
    const growthWallScale = Math.min(
        internalRouterGrowthWallScale,
        envelope.suppliedWallClearanceScale
    );
    if ( !Number.isFinite( growthWallScale ) || growthWallScale <= 0 )
    {
        throw new Error( 'Invalid internal router growth-wall scale.' );
    }

    const minimumEnvelopeStation = envelope.stations[0].longitudinalStation;
    const rootwardReserve = Math.max(
        envelope.samplesPerSpan * 0.08,
        ( seed.longitudinalStation - minimumEnvelopeStation ) * 0.05
    );
    const terminalStation = minimumEnvelopeStation + rootwardReserve;
    if ( terminalStation >= seed.longitudinalStation )
    {
        throw new Error(
            `The internal router envelope is too short for ${topology.maximumTier} growth tiers.`
        );
    }
    const tierStations = Array.from(
        { length: topology.maximumTier + 1 },
        ( _, tier ) => THREE.MathUtils.lerp(
            seed.longitudinalStation,
            terminalStation,
            tier / topology.maximumTier
        )
    );

    const seedFrame = sampleEnvelope( seed.longitudinalStation );
    const seedOffset = seed.point.clone().sub( seedFrame.centre );
    const seedGrowthRadius = seedFrame.conservativeShellRadius * growthWallScale;
    const seedNode = {
        id: 'd1-router-seed',
        parentId: null,
        tier: 0,
        ordinal: 0,
        longitudinalStation: seed.longitudinalStation,
        angle: 0,
        requestedRadiusFraction: 0,
        requestedRadius: seedOffset.length(),
        actualRadius: seedOffset.length(),
        wallConstrained: false,
        growthEnvelopeRadius: seedGrowthRadius,
        tubeRadius,
        offsetU: seedOffset.dot( seedFrame.major ),
        offsetV: seedOffset.dot( seedFrame.minor ),
        point: seed.point.clone()
    };
    if ( seedOffset.length() + tubeRadius + wallMargin
        > seedGrowthRadius + containmentTolerance )
    {
        throw new Error( 'The exact internal router seed does not fit its growth envelope.' );
    }

    const nodes = [ seedNode ];
    const edges = [];
    let parents = [ seedNode ];
    const firstRotation = stableSignedUnit( internalRouterCandidateId ) * 0.34;
    // A fixed sixteenth-turn phase keeps the globally slotted deeper tiers
    // clear of the inherited tier-three fan without changing the accepted
    // three-tier construction.
    const deeperTierRotation = firstRotation - Math.PI / 8;
    // The last tier deliberately asks for more radial reach than the minimum
    // growth envelope permits. Its endpoints are therefore shortened by the
    // physical wall constraint instead of being art-directed to fit in advance.

    for ( let tier = 1; tier <= topology.maximumTier; tier += 1 )
    {
        const nextParents = [];
        let ordinal = 0;
        const angularRankByParentId = tier >= 4
            ? new Map( parents
                .map( ( parent, sourceIndex ) => ( {
                    parent,
                    sourceIndex,
                    wrappedAngle: wrapAngle( parent.angle - deeperTierRotation )
                } ) )
                .sort( ( left, right ) =>
                    left.wrappedAngle - right.wrappedAngle
                        || left.sourceIndex - right.sourceIndex
                )
                .map( ( entry, rank ) => [ entry.parent.id, rank ] ) )
            : null;
        for ( const parent of parents )
        {
            const childCount = tier === 1
                ? topology.firstSplitCount
                : topology.recursiveSplitCount;
            for ( let childIndex = 0; childIndex < childCount; childIndex += 1 )
            {
                const id = `d1-router-t${tier}-n${ordinal + 1}`;
                let angle;
                if ( tier === 1 )
                {
                    angle = firstRotation
                        + childIndex * Math.PI * 2 / childCount;
                }
                else if ( tier < 4 )
                {
                    const sign = childIndex === 0 ? -1 : 1;
                    const spread = tier === 2 ? 0.43 : 0.29;
                    angle = parent.angle + sign * spread
                        + stableSignedUnit( `${id}-angle` ) * 0.045;
                }
                else
                {
                    const angularSlotCount = parents.length * childCount;
                    const parentRank = angularRankByParentId.get( parent.id );
                    angle = deeperTierRotation
                        + ( parentRank * childCount + childIndex + 0.5 )
                            * Math.PI * 2 / angularSlotCount;
                }
                const childTubeRadius = tierRadius(
                    tier,
                    topology.maximumTier,
                    tubeRadius,
                    terminalTubeRadius
                );
                const child = createNode( {
                    id,
                    parentId: parent.id,
                    tier,
                    ordinal,
                    longitudinalStation: tierStations[tier],
                    angle,
                    requestedRadiusFraction: tierRadiusFraction(
                        tier,
                        topology.maximumTier
                    ),
                    sampleEnvelope,
                    growthWallScale,
                    tubeRadius: childTubeRadius,
                    wallMargin
                } );
                nodes.push( child );
                nextParents.push( child );

                const edgeId = `${parent.id}->${child.id}`;
                const startRadius = parent.tubeRadius;
                const endRadius = child.tubeRadius;
                // Deep globally slotted edges bow radially, rather than
                // sweeping sideways into their ordered neighbours. The
                // baseline tier-one to tier-three bend rule remains exact.
                const bendAngle = tier >= 4
                    ? angle
                    : angle + Math.PI * 0.5
                        + stableSignedUnit( `${edgeId}-bend-angle` ) * 0.32;
                const authoredBendAmplitude = Math.min(
                    child.growthEnvelopeRadius * ( 0.055 + tier * 0.008 ),
                    0.065
                ) * ( 0.78 + Math.abs( stableSignedUnit( `${edgeId}-bend` ) ) * 0.22 );
                const bendAmplitude = tier >= 4
                    ? authoredBendAmplitude * 0.5
                    : authoredBendAmplitude;
                const curve = new EnvelopeConstrainedRouterCurve( {
                    parent,
                    child,
                    sampleEnvelope,
                    growthWallScale,
                    wallMargin,
                    startRadius,
                    endRadius,
                    bendAngle,
                    bendAmplitude
                } );
                const edge = {
                    id: edgeId,
                    edgeIndex: edges.length,
                    parentId: parent.id,
                    childId: child.id,
                    tier,
                    parent,
                    child,
                    startRadius,
                    endRadius,
                    bendAngle,
                    bendAmplitude,
                    curve
                };
                edge.pathLength = curve.getLength();
                edge.audit = auditEdge(
                    edge,
                    sampleEnvelope,
                    growthWallScale,
                    wallMargin
                );
                edges.push( edge );
                ordinal += 1;
            }
        }
        parents = nextParents;
    }

    if ( nodes.length !== topology.nodeCount
        || edges.length !== topology.edgeCount )
    {
        throw new Error( 'The internal router did not produce its fixed bounded topology.' );
    }
    const terminalRoutes = createTerminalRoutes(
        nodes,
        edges,
        topology.maximumTier
    );
    if ( terminalRoutes.length !== topology.terminalCount )
    {
        throw new Error( 'The internal router did not produce its fixed terminal routes.' );
    }

    const minimumGrowthWallClearance = Math.min(
        seedGrowthRadius - seedOffset.length() - tubeRadius,
        ...edges.map( ( edge ) => edge.audit.minimumGrowthWallClearance )
    );
    const minimumConstraintClearance = Math.min(
        minimumGrowthWallClearance - wallMargin,
        ...edges.map( ( edge ) => edge.audit.minimumConstraintClearance )
    );
    const breachCount = edges.reduce(
        ( total, edge ) => total + edge.audit.breachCount,
        0
    );
    if ( breachCount > 0 || minimumConstraintClearance < -containmentTolerance )
    {
        throw new Error( 'The internal router breached its conservative growth envelope.' );
    }

    const topologyData = new Float32Array( nodes.flatMap( ( node ) => [
        node.tier,
        node.ordinal,
        node.longitudinalStation,
        node.point.x,
        node.point.y,
        node.point.z,
        node.requestedRadius,
        node.actualRadius,
        node.wallConstrained ? 1 : 0,
        node.tubeRadius
    ] ) );
    const edgeData = new Float32Array( edges.flatMap( ( edge ) => [
        edge.edgeIndex,
        edge.tier,
        nodes.findIndex( ( node ) => node.id === edge.parentId ),
        nodes.findIndex( ( node ) => node.id === edge.childId ),
        edge.pathLength,
        edge.startRadius,
        edge.endRadius,
        edge.audit.minimumGrowthWallClearance,
        edge.audit.minimumConstraintClearance,
        edge.audit.breachCount
    ] ) );
    const separation = measureNonJunctionSeparation( edges );

    return {
        candidateId: internalRouterCandidateId,
        reviewStatus: 'bounded-d1-topology-experiment-awaiting-human-review',
        role: 'transparent-internal-packet-router',
        diagnosticOnly: true,
        productionVisible: false,
        packetConnected: false,
        junctionBehaviour: false,
        transductionBehaviour: false,
        seedSite: seed.site,
        seedPoint: new Float32Array( seed.point.toArray() ),
        seedLongitudinalStation: seed.longitudinalStation,
        tierStations: new Float32Array( tierStations ),
        requestedMaximumTier: tierRequest.requestedMaximumTier,
        appliedMaximumTier: tierRequest.appliedMaximumTier,
        levelCount: topology.levelCount,
        maximumTier: topology.maximumTier,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        terminalCount: terminalRoutes.length,
        routeCount: terminalRoutes.length,
        topology,
        topologyData,
        edgeData,
        topologyStride: 10,
        edgeDataStride: 10,
        nodes,
        edges,
        terminalRoutes: Object.freeze( terminalRoutes ),
        envelope: {
            trunkNodeIds: Object.freeze( envelope.trunkNodeIds.slice() ),
            samplesPerSpan: envelope.samplesPerSpan,
            stationCount: envelope.stations.length,
            suppliedWallClearanceScale: envelope.suppliedWallClearanceScale,
            appliedWallClearanceScale: growthWallScale
        },
        dimensions: {
            tubeRadius,
            terminalTubeRadius,
            wallMargin,
            tubularSegments: routerTubularSegments,
            radialSegments: routerRadialSegments
        },
        containment: Object.freeze( {
            model: 'tube-inclusive-conservative-growth-envelope',
            verified: true,
            breachCount,
            sampleCount: 1 + edges.length * routerAuditSamples,
            minimumGrowthWallClearance,
            minimumConstraintClearance,
            wallClearanceScale: growthWallScale,
            includesTubeRadius: true,
            includesWallMargin: true
        } ),
        separation
    };
}

function auditGeometryVertices( geometry, descriptor, edgeRanges )
{
    const position = geometry.getAttribute( 'position' );
    const edgeAttribute = geometry.getAttribute( 'routerEdge' );
    let minimumGrowthWallClearance = Number.POSITIVE_INFINITY;
    let breachCount = 0;
    for ( let index = 0; index < position.count; index += 1 )
    {
        const edgeIndex = Math.round( edgeAttribute.getX( index ) );
        const edge = descriptor.edges[edgeIndex];
        const range = edgeRanges[edgeIndex];
        const localIndex = index - range.vertexStart;
        const ring = Math.floor( localIndex / routerRadialSegments );
        const arcProgress = THREE.MathUtils.clamp(
            ring / routerTubularSegments,
            0,
            1
        );
        const parameter = edge.curve.getUtoTmapping( arcProgress );
        const smooth = parameter * parameter * ( 3 - 2 * parameter );
        const station = THREE.MathUtils.lerp(
            edge.parent.longitudinalStation,
            edge.child.longitudinalStation,
            smooth
        );
        const audit = edge.audit;
        const auditIndex = Math.min(
            routerAuditSamples - 1,
            Math.round( arcProgress * ( routerAuditSamples - 1 ) )
        );
        const envelopeCentre = new THREE.Vector3().fromArray(
            audit.envelopeCentres,
            auditIndex * 3
        );
        const growthRadius = audit.envelopeRadii[auditIndex];
        const vertex = new THREE.Vector3(
            position.getX( index ),
            position.getY( index ),
            position.getZ( index )
        );
        // Station is recomputed above to audit the same longitudinal ownership
        // used by the curve. The sampled envelope centre is retained as evidence.
        void station;
        const clearance = growthRadius - vertex.distanceTo( envelopeCentre );
        minimumGrowthWallClearance = Math.min(
            minimumGrowthWallClearance,
            clearance
        );
        if ( clearance < -containmentTolerance ) breachCount += 1;
    }
    return Object.freeze( {
        verified: breachCount === 0,
        breachCount,
        vertexCount: position.count,
        minimumGrowthWallClearance
    } );
}

export function createInternalRouterTreeGeometry( descriptor )
{
    if ( descriptor?.candidateId !== internalRouterCandidateId
        || !Number.isInteger( descriptor.maximumTier )
        || descriptor.maximumTier < internalRouterTierRange.min
        || descriptor.maximumTier > internalRouterTierRange.max
        || descriptor.nodeCount !== descriptor.topology?.nodeCount
        || descriptor.edgeCount !== descriptor.topology?.edgeCount
        || descriptor.terminalCount !== descriptor.topology?.terminalCount )
    {
        throw new Error( 'Invalid D1 internal router descriptor.' );
    }
    const sources = [];
    const edgeRanges = [];
    let vertexStart = 0;
    let indexStart = 0;
    for ( const edge of descriptor.edges )
    {
        const geometry = createTaperedTubeGeometry(
            edge.curve,
            edge.startRadius,
            edge.endRadius,
            routerTubularSegments,
            routerRadialSegments
        );
        const vertexCount = geometry.getAttribute( 'position' ).count;
        const indexCount = geometry.index.count;
        geometry.setAttribute(
            'routerEdge',
            new THREE.Float32BufferAttribute(
                new Float32Array( vertexCount ).fill( edge.edgeIndex ),
                1
            )
        );
        geometry.setAttribute(
            'routerTier',
            new THREE.Float32BufferAttribute(
                new Float32Array( vertexCount ).fill( edge.tier ),
                1
            )
        );
        // This keeps the diagnostic compatible with the existing object-space
        // trunk-interior deformation material without making it a C1 carrier.
        geometry.setAttribute(
            'carrierVisibility',
            new THREE.Float32BufferAttribute(
                new Float32Array( vertexCount ).fill( 1 ),
                1
            )
        );
        edgeRanges.push( Object.freeze( {
            edgeIndex: edge.edgeIndex,
            edgeId: edge.id,
            parentId: edge.parentId,
            childId: edge.childId,
            tier: edge.tier,
            vertexStart,
            vertexCount,
            indexStart,
            indexCount
        } ) );
        vertexStart += vertexCount;
        indexStart += indexCount;
        sources.push( geometry );
    }
    const geometry = mergeGeometries( sources, false );
    sources.forEach( ( source ) => source.dispose() );
    if ( !geometry )
    {
        throw new Error( 'The D1 internal router geometries could not be merged.' );
    }
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const vertexContainment = auditGeometryVertices(
        geometry,
        descriptor,
        edgeRanges
    );
    if ( !vertexContainment.verified )
    {
        geometry.dispose();
        throw new Error( 'The D1 internal router mesh breached its growth envelope.' );
    }
    geometry.userData.internalRouterTree = {
        descriptor,
        candidateId: descriptor.candidateId,
        reviewStatus: descriptor.reviewStatus,
        role: descriptor.role,
        diagnosticOnly: true,
        productionVisible: false,
        packetConnected: false,
        junctionBehaviour: false,
        transductionBehaviour: false,
        persistentArtwork: false,
        seedSite: descriptor.seedSite,
        seedPoint: descriptor.seedPoint,
        seedLongitudinalStation: descriptor.seedLongitudinalStation,
        tierStations: descriptor.tierStations,
        topology: descriptor.topology,
        topologyData: descriptor.topologyData,
        edgeData: descriptor.edgeData,
        topologyStride: descriptor.topologyStride,
        edgeDataStride: descriptor.edgeDataStride,
        requestedMaximumTier: descriptor.requestedMaximumTier,
        appliedMaximumTier: descriptor.appliedMaximumTier,
        levelCount: descriptor.levelCount,
        maximumTier: descriptor.maximumTier,
        nodeCount: descriptor.nodeCount,
        edgeCount: descriptor.edgeCount,
        terminalCount: descriptor.terminalCount,
        routeCount: descriptor.routeCount,
        nodes: descriptor.nodes,
        edges: descriptor.edges,
        terminalRoutes: descriptor.terminalRoutes,
        edgeRanges: Object.freeze( edgeRanges ),
        envelope: descriptor.envelope,
        dimensions: descriptor.dimensions,
        containment: descriptor.containment,
        vertexContainment,
        separation: descriptor.separation,
        objectSpace: true,
        cameraFacing: false,
        transparentRouter: true,
        meshCount: 1,
        maximumDrawCalls: 1,
        vertexCount: geometry.getAttribute( 'position' ).count,
        triangleCount: geometry.index.count / 3
    };
    return geometry;
}

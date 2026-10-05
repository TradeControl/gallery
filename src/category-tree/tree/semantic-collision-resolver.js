const DEFAULTS = Object.freeze( {
    clearance: 0.004,
    clearanceScale: 1.04,
    collisionEpsilon: 1e-6,
    junctionAllowance: 0.015,
    junctionRadiusFactor: 2.75,
    siblingJunctionAllowance: 0.006,
    siblingJunctionRadiusFactor: 0.9,
    ancestorJunctionAllowance: null,
    ancestorJunctionRadiusFactor: null,
    maxAncestorJunctionHops: 2,
    maxIterations: 28,
    stepScale: 0.62,
    maxStepRadiusFactor: 0.8,
    maxDisplacement: 0.9,
    maxDisplacementRadiusFactor: 12,
    influenceRadiusFactor: 4.5,
    influenceSegmentFactor: 2.25,
    influenceRadius: null,
    relaxSharedNodes: false,
    fixedRoot: true,
    fixedNodeIds: Object.freeze( [] ),
    nodeEndpointRadiusFactor: 1.8,
    nodeStepScale: 0.72,
    nodeInfluenceRadius: null,
    nodeInfluenceRadiusFactor: 4.5,
    maxNodeDisplacement: null,
    maxNodeDisplacementRadiusFactor: 12,
    smoothing: 0.18,
    maxContactsPerEdgePair: 12,
    contactSuppressionSegments: 1,
    silhouetteBias: 0.72,
    silhouetteAxis: Object.freeze( { x: 0, y: 0, z: 1 } ),
    cellSize: null
} );

const EPSILON = 1e-10;

function add( a, b )
{
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function subtract( a, b )
{
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function multiply( value, scalar )
{
    return { x: value.x * scalar, y: value.y * scalar, z: value.z * scalar };
}

function dot( a, b )
{
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross( a, b )
{
    return {
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x
    };
}

function lengthSquared( value )
{
    return dot( value, value );
}

function length( value )
{
    return Math.sqrt( lengthSquared( value ) );
}

function normalise( value, fallback = { x: 0, y: 0, z: 0 } )
{
    const magnitude = length( value );
    return magnitude > EPSILON ? multiply( value, 1 / magnitude ) : { ...fallback };
}

function clamp( value, minimum, maximum )
{
    return Math.max( minimum, Math.min( maximum, value ) );
}

function lerp( a, b, amount )
{
    return a + ( b - a ) * amount;
}

function lerpPoint( a, b, amount )
{
    return {
        x: lerp( a.x, b.x, amount ),
        y: lerp( a.y, b.y, amount ),
        z: lerp( a.z, b.z, amount )
    };
}

function finiteNumber( value )
{
    return typeof value === 'number' && Number.isFinite( value );
}

function validateEdges( edges )
{
    if ( !Array.isArray( edges ) )
    {
        throw new TypeError( 'resolveSemanticCollisions expects an array of edges.' );
    }

    const ids = new Set();
    edges.forEach( ( edge, edgeIndex ) => {
        if ( !edge || typeof edge !== 'object' )
        {
            throw new TypeError( `Edge ${edgeIndex} is not an object.` );
        }
        if ( edge.id == null || ids.has( String( edge.id ) ) )
        {
            throw new TypeError( `Edge ${edgeIndex} needs a unique id.` );
        }
        ids.add( String( edge.id ) );
        if ( !Array.isArray( edge.points ) || edge.points.length < 2 )
        {
            throw new TypeError( `Edge ${edge.id} needs at least two sampled points.` );
        }
        edge.points.forEach( ( point, pointIndex ) => {
            if ( !point || !finiteNumber( point.x ) || !finiteNumber( point.y ) ||
                !finiteNumber( point.z ) || !finiteNumber( point.radius ) || point.radius <= 0 )
            {
                throw new TypeError( `Edge ${edge.id} point ${pointIndex} must have finite x/y/z and a positive radius.` );
            }
        } );
    } );
}

function cloneEdges( edges )
{
    return edges.map( ( edge ) => ( {
        ...edge,
        ancestry: Array.isArray( edge.ancestry ) ? [ ...edge.ancestry ] : edge.ancestry,
        points: edge.points.map( ( point ) => ( { ...point } ) )
    } ) );
}

function makeOptions( options )
{
    const result = { ...DEFAULTS, ...options };
    result.silhouetteAxis = normalise( options.silhouetteAxis ?? DEFAULTS.silhouetteAxis, DEFAULTS.silhouetteAxis );

    const nonNegative = [ 'clearance', 'junctionAllowance', 'junctionRadiusFactor', 'maxDisplacement',
        'maxDisplacementRadiusFactor', 'influenceRadiusFactor', 'influenceSegmentFactor', 'smoothing',
        'nodeEndpointRadiusFactor', 'nodeInfluenceRadiusFactor', 'maxNodeDisplacementRadiusFactor',
        'siblingJunctionAllowance', 'siblingJunctionRadiusFactor',
        'silhouetteBias', 'collisionEpsilon' ];
    for ( const name of nonNegative )
    {
        if ( !finiteNumber( result[ name ] ) || result[ name ] < 0 )
        {
            throw new TypeError( `${name} must be a finite non-negative number.` );
        }
    }
    const positive = [ 'clearanceScale', 'stepScale', 'maxStepRadiusFactor', 'nodeStepScale' ];
    for ( const name of positive )
    {
        if ( !finiteNumber( result[ name ] ) || result[ name ] <= 0 )
        {
            throw new TypeError( `${name} must be a finite positive number.` );
        }
    }
    if ( !Number.isInteger( result.maxIterations ) || result.maxIterations < 0 ||
        !Number.isInteger( result.maxContactsPerEdgePair ) || result.maxContactsPerEdgePair < 1 ||
        !Number.isInteger( result.contactSuppressionSegments ) || result.contactSuppressionSegments < 0 ||
        !Number.isInteger( result.maxAncestorJunctionHops ) || result.maxAncestorJunctionHops < 0 )
    {
        throw new TypeError( 'Iteration/contact limits must be non-negative integers.' );
    }
    if ( result.cellSize != null && ( !finiteNumber( result.cellSize ) || result.cellSize <= 0 ) )
    {
        throw new TypeError( 'cellSize must be null or a finite positive number.' );
    }
    if ( result.influenceRadius != null && ( !finiteNumber( result.influenceRadius ) || result.influenceRadius <= 0 ) )
    {
        throw new TypeError( 'influenceRadius must be null or a finite positive number.' );
    }
    if ( result.nodeInfluenceRadius != null && ( !finiteNumber( result.nodeInfluenceRadius ) || result.nodeInfluenceRadius <= 0 ) )
    {
        throw new TypeError( 'nodeInfluenceRadius must be null or a finite positive number.' );
    }
    if ( result.maxNodeDisplacement != null && ( !finiteNumber( result.maxNodeDisplacement ) || result.maxNodeDisplacement < 0 ) )
    {
        throw new TypeError( 'maxNodeDisplacement must be null or a finite non-negative number.' );
    }
    if ( result.ancestorJunctionAllowance != null &&
        ( !finiteNumber( result.ancestorJunctionAllowance ) || result.ancestorJunctionAllowance < 0 ) )
    {
        throw new TypeError( 'ancestorJunctionAllowance must be null or a finite non-negative number.' );
    }
    if ( result.ancestorJunctionRadiusFactor != null &&
        ( !finiteNumber( result.ancestorJunctionRadiusFactor ) || result.ancestorJunctionRadiusFactor < 0 ) )
    {
        throw new TypeError( 'ancestorJunctionRadiusFactor must be null or a finite non-negative number.' );
    }
    if ( !Array.isArray( result.fixedNodeIds ) && !( result.fixedNodeIds instanceof Set ) )
    {
        throw new TypeError( 'fixedNodeIds must be an array or Set.' );
    }
    result.fixedNodeIds = new Set( result.fixedNodeIds );
    result.smoothing = clamp( result.smoothing, 0, 0.49 );
    result.silhouetteBias = clamp( result.silhouetteBias, 0, 1 );
    return result;
}

function percentile( values, amount )
{
    if ( values.length === 0 ) return 0;
    const sorted = [ ...values ].sort( ( a, b ) => a - b );
    return sorted[ Math.floor( ( sorted.length - 1 ) * amount ) ];
}

function buildSegments( edges, options )
{
    const segments = [];
    const segmentLengths = [];
    const radii = [];
    const edgeMetrics = [];

    edges.forEach( ( edge, edgeIndex ) => {
        const lengths = [];
        let totalLength = 0;
        for ( let pointIndex = 0; pointIndex < edge.points.length - 1; pointIndex++ )
        {
            const segmentLength = length( subtract( edge.points[ pointIndex + 1 ], edge.points[ pointIndex ] ) );
            lengths.push( segmentLength );
            totalLength += segmentLength;
            if ( segmentLength > EPSILON ) segmentLengths.push( segmentLength );
        }
        edgeMetrics.push( { lengths, totalLength } );

        let startDistance = 0;
        lengths.forEach( ( segmentLength, pointIndex ) => {
            const pointA = edge.points[ pointIndex ];
            const pointB = edge.points[ pointIndex + 1 ];
            radii.push( pointA.radius, pointB.radius );
            const expansion = Math.max( pointA.radius, pointB.radius ) * options.clearanceScale + options.clearance;
            segments.push( {
                index: segments.length,
                edgeIndex,
                pointIndex,
                pointA,
                pointB,
                radiusA: pointA.radius,
                radiusB: pointB.radius,
                startDistance,
                segmentLength,
                totalLength,
                min: {
                    x: Math.min( pointA.x, pointB.x ) - expansion,
                    y: Math.min( pointA.y, pointB.y ) - expansion,
                    z: Math.min( pointA.z, pointB.z ) - expansion
                },
                max: {
                    x: Math.max( pointA.x, pointB.x ) + expansion,
                    y: Math.max( pointA.y, pointB.y ) + expansion,
                    z: Math.max( pointA.z, pointB.z ) + expansion
                }
            } );
            startDistance += segmentLength;
        } );
    } );

    const automaticCellSize = Math.max( 0.025, percentile( segmentLengths, 0.5 ) * 1.5,
        percentile( radii, 0.5 ) * options.clearanceScale * 4 );
    return { segments, edgeMetrics, cellSize: options.cellSize ?? automaticCellSize };
}

// Closest points on two finite segments, adapted from the standard two-line
// clamped minimisation. Returning both parameters lets radius and semantic
// junction distance be evaluated at the actual contact rather than at a sample.
function closestPointsOnSegments( segmentA, segmentB )
{
    const directionA = subtract( segmentA.pointB, segmentA.pointA );
    const directionB = subtract( segmentB.pointB, segmentB.pointA );
    const betweenStarts = subtract( segmentA.pointA, segmentB.pointA );
    const aa = dot( directionA, directionA );
    const bb = dot( directionA, directionB );
    const cc = dot( directionB, directionB );
    const dd = dot( directionA, betweenStarts );
    const ee = dot( directionB, betweenStarts );
    const denominator = aa * cc - bb * bb;
    let parameterA = 0;
    let parameterB = 0;

    if ( aa <= EPSILON && cc <= EPSILON )
    {
        parameterA = 0;
        parameterB = 0;
    }
    else if ( aa <= EPSILON )
    {
        parameterB = clamp( ee / cc, 0, 1 );
    }
    else if ( cc <= EPSILON )
    {
        parameterA = clamp( -dd / aa, 0, 1 );
    }
    else
    {
        parameterA = denominator > EPSILON ? clamp( ( bb * ee - cc * dd ) / denominator, 0, 1 ) : 0;
        parameterB = ( bb * parameterA + ee ) / cc;
        if ( parameterB < 0 )
        {
            parameterB = 0;
            parameterA = clamp( -dd / aa, 0, 1 );
        }
        else if ( parameterB > 1 )
        {
            parameterB = 1;
            parameterA = clamp( ( bb - dd ) / aa, 0, 1 );
        }
    }

    const pointA = lerpPoint( segmentA.pointA, segmentA.pointB, parameterA );
    const pointB = lerpPoint( segmentB.pointA, segmentB.pointB, parameterB );
    return {
        parameterA,
        parameterB,
        pointA,
        pointB,
        delta: subtract( pointA, pointB ),
        distance: length( subtract( pointA, pointB ) )
    };
}

function commonEndpoint( edgeA, edgeB )
{
    if ( edgeA.parentId != null && ( edgeA.parentId === edgeB.parentId || edgeA.parentId === edgeB.childId ) )
    {
        return edgeA.parentId;
    }
    if ( edgeA.childId != null && ( edgeA.childId === edgeB.parentId || edgeA.childId === edgeB.childId ) )
    {
        return edgeA.childId;
    }
    return null;
}

function distanceFromNode( edge, nodeId, distanceAlongEdge, totalLength )
{
    if ( nodeId === edge.parentId ) return distanceAlongEdge;
    if ( nodeId === edge.childId ) return totalLength - distanceAlongEdge;
    return Infinity;
}

function ancestryContains( edge, nodeId )
{
    return ( Array.isArray( edge.ancestry ) && edge.ancestry.includes( nodeId ) ) ||
        ( Array.isArray( edge.parentRoute ) && edge.parentRoute.includes( nodeId ) ) ||
        ( Array.isArray( edge.childRoute ) && edge.childRoute.includes( nodeId ) );
}

function semanticRelation( edgeA, edgeB )
{
    const sharedNode = commonEndpoint( edgeA, edgeB );
    if ( sharedNode != null )
    {
        const continuation = edgeA.childId === edgeB.parentId || edgeB.childId === edgeA.parentId;
        const sibling = edgeA.parentId === edgeB.parentId;
        return {
            type: 'incident',
            sharedNode,
            incidentType: continuation ? 'continuation' : sibling ? 'sibling' : 'merge'
        };
    }
    if ( ancestryContains( edgeA, edgeB.childId ) || ancestryContains( edgeA, edgeB.parentId ) ||
        ancestryContains( edgeB, edgeA.childId ) || ancestryContains( edgeB, edgeA.parentId ) )
    {
        return { type: 'ancestor', sharedNode: null, incidentType: null };
    }
    return { type: 'unrelated', sharedNode: null, incidentType: null };
}

function buildSemanticRouteIndex( edges, edgeMetrics )
{
    const incomingByChild = new Map();
    edges.forEach( ( edge, edgeIndex ) => {
        if ( edge.parentId == null || edge.childId == null ) return;
        // A valid hierarchy has one incoming edge per node. Keeping the first is
        // deterministic and prevents malformed cyclic/multi-parent data from
        // silently licensing a contact.
        if ( !incomingByChild.has( edge.childId ) )
        {
            incomingByChild.set( edge.childId, {
                parentId: edge.parentId,
                length: edgeMetrics[ edgeIndex ].totalLength
            } );
        }
    } );
    return incomingByChild;
}

function directedAncestorPath( ancestorId, descendantId, routeIndex, maximumHops )
{
    if ( ancestorId == null || descendantId == null || ancestorId === descendantId ) return null;
    let cursor = descendantId;
    let pathLength = 0;
    let hops = 0;
    const visited = new Set();
    while ( hops < maximumHops && !visited.has( cursor ) )
    {
        visited.add( cursor );
        const incoming = routeIndex.get( cursor );
        if ( !incoming ) return null;
        pathLength += incoming.length;
        hops++;
        cursor = incoming.parentId;
        if ( cursor === ancestorId ) return { pathLength, hops };
    }
    return null;
}

function ancestorEndpointConnection( edgeA, edgeB, distanceA, distanceB, totalA, totalB, routeIndex, options )
{
    if ( options.maxAncestorJunctionHops === 0 ) return null;
    const endpointsA = [
        { nodeId: edgeA.parentId, contactDistance: distanceA, endpoint: 'parent' },
        { nodeId: edgeA.childId, contactDistance: totalA - distanceA, endpoint: 'child' }
    ];
    const endpointsB = [
        { nodeId: edgeB.parentId, contactDistance: distanceB, endpoint: 'parent' },
        { nodeId: edgeB.childId, contactDistance: totalB - distanceB, endpoint: 'child' }
    ];
    let best = null;
    for ( const endpointA of endpointsA )
    {
        for ( const endpointB of endpointsB )
        {
            const forward = directedAncestorPath( endpointA.nodeId, endpointB.nodeId,
                routeIndex, options.maxAncestorJunctionHops );
            const reverse = directedAncestorPath( endpointB.nodeId, endpointA.nodeId,
                routeIndex, options.maxAncestorJunctionHops );
            const route = forward ?? reverse;
            if ( !route ) continue;
            const semanticDistance = endpointA.contactDistance + route.pathLength + endpointB.contactDistance;
            if ( !best || semanticDistance < best.semanticDistance )
            {
                best = {
                    semanticDistance,
                    pathLength: route.pathLength,
                    hops: route.hops,
                    endpointA: endpointA.endpoint,
                    endpointB: endpointB.endpoint,
                    ancestorId: forward ? endpointA.nodeId : endpointB.nodeId,
                    descendantId: forward ? endpointB.nodeId : endpointA.nodeId
                };
            }
        }
    }
    return best;
}

function integerCellRange( minimum, maximum, cellSize )
{
    return [ Math.floor( minimum / cellSize ), Math.floor( maximum / cellSize ) ];
}

function candidateSegmentPairs( segments, cellSize )
{
    const cells = new Map();
    for ( const segment of segments )
    {
        const [ minX, maxX ] = integerCellRange( segment.min.x, segment.max.x, cellSize );
        const [ minY, maxY ] = integerCellRange( segment.min.y, segment.max.y, cellSize );
        const [ minZ, maxZ ] = integerCellRange( segment.min.z, segment.max.z, cellSize );
        for ( let x = minX; x <= maxX; x++ )
        {
            for ( let y = minY; y <= maxY; y++ )
            {
                for ( let z = minZ; z <= maxZ; z++ )
                {
                    const key = `${x},${y},${z}`;
                    const values = cells.get( key );
                    if ( values ) values.push( segment.index );
                    else cells.set( key, [ segment.index ] );
                }
            }
        }
    }

    const pairKeys = new Set();
    const segmentCount = segments.length;
    for ( const values of cells.values() )
    {
        for ( let left = 0; left < values.length; left++ )
        {
            for ( let right = left + 1; right < values.length; right++ )
            {
                const a = Math.min( values[ left ], values[ right ] );
                const b = Math.max( values[ left ], values[ right ] );
                if ( segments[ a ].edgeIndex === segments[ b ].edgeIndex ) continue;
                pairKeys.add( a * segmentCount + b );
            }
        }
    }

    return [ ...pairKeys ].sort( ( a, b ) => a - b ).map( ( key ) => [
        Math.floor( key / segmentCount ), key % segmentCount
    ] );
}

function contactSort( left, right )
{
    return right.penetration - left.penetration ||
        left.edgeAId.localeCompare( right.edgeAId ) || left.edgeBId.localeCompare( right.edgeBId ) ||
        left.segmentA - right.segmentA || left.segmentB - right.segmentB;
}

function condenseContacts( contacts, options )
{
    const byPair = new Map();
    for ( const contact of contacts )
    {
        const values = byPair.get( contact.pairId );
        if ( values ) values.push( contact );
        else byPair.set( contact.pairId, [ contact ] );
    }

    const selected = [];
    for ( const pairId of [ ...byPair.keys() ].sort() )
    {
        const accepted = [];
        const values = byPair.get( pairId ).sort( contactSort );
        for ( const contact of values )
        {
            if ( accepted.length >= options.maxContactsPerEdgePair ) break;
            const duplicateNeighbourhood = accepted.some( ( other ) =>
                Math.abs( contact.segmentA - other.segmentA ) <= options.contactSuppressionSegments &&
                Math.abs( contact.segmentB - other.segmentB ) <= options.contactSuppressionSegments );
            if ( !duplicateNeighbourhood ) accepted.push( contact );
        }
        selected.push( ...accepted );
    }
    return selected.sort( contactSort );
}

function detectCollisions( edges, options )
{
    const built = buildSegments( edges, options );
    const rawContacts = [];
    const allowedContacts = [];
    const pairs = candidateSegmentPairs( built.segments, built.cellSize );
    const routeIndex = buildSemanticRouteIndex( edges, built.edgeMetrics );

    for ( const [ segmentAIndex, segmentBIndex ] of pairs )
    {
        let segmentA = built.segments[ segmentAIndex ];
        let segmentB = built.segments[ segmentBIndex ];
        let edgeA = edges[ segmentA.edgeIndex ];
        let edgeB = edges[ segmentB.edgeIndex ];

        // Canonical semantic ordering is essential: otherwise spatial hash order
        // could change which branch is displaced to which side.
        if ( String( edgeA.id ).localeCompare( String( edgeB.id ) ) > 0 )
        {
            [ segmentA, segmentB ] = [ segmentB, segmentA ];
            [ edgeA, edgeB ] = [ edgeB, edgeA ];
        }

        const closest = closestPointsOnSegments( segmentA, segmentB );
        const radiusA = lerp( segmentA.radiusA, segmentA.radiusB, closest.parameterA );
        const radiusB = lerp( segmentB.radiusA, segmentB.radiusB, closest.parameterB );
        const surfaceDistance = radiusA + radiusB;
        const requiredDistance = ( radiusA + radiusB ) * options.clearanceScale + options.clearance;
        if ( closest.distance + options.collisionEpsilon >= requiredDistance ) continue;

        const distanceA = segmentA.startDistance + closest.parameterA * segmentA.segmentLength;
        const distanceB = segmentB.startDistance + closest.parameterB * segmentB.segmentLength;
        const directRelation = semanticRelation( edgeA, edgeB );
        const routeConnection = directRelation.sharedNode == null
            ? ancestorEndpointConnection(
                edgeA, edgeB, distanceA, distanceB, segmentA.totalLength, segmentB.totalLength,
                routeIndex, options
            )
            : null;
        const relation = routeConnection
            ? { type: 'ancestor', sharedNode: null, incidentType: null }
            : directRelation;
        const junctionReach = relation.incidentType === 'sibling'
            ? options.siblingJunctionAllowance + options.siblingJunctionRadiusFactor * requiredDistance
            : options.junctionAllowance + options.junctionRadiusFactor * requiredDistance;
        const allowedAtJunction = relation.sharedNode != null &&
            distanceFromNode( edgeA, relation.sharedNode, distanceA, segmentA.totalLength ) <= junctionReach &&
            distanceFromNode( edgeB, relation.sharedNode, distanceB, segmentB.totalLength ) <= junctionReach;
        const ancestorReach = ( options.ancestorJunctionAllowance ?? options.junctionAllowance ) +
            ( options.ancestorJunctionRadiusFactor ?? options.junctionRadiusFactor ) * requiredDistance;
        const allowedOnAncestorRoute = routeConnection != null &&
            routeConnection.semanticDistance <= ancestorReach;
        const pairId = `${edgeA.id}|${edgeB.id}`;
        const contact = {
            pairId,
            edgeAIndex: segmentA.edgeIndex,
            edgeBIndex: segmentB.edgeIndex,
            edgeAId: String( edgeA.id ),
            edgeBId: String( edgeB.id ),
            segmentA: segmentA.pointIndex,
            segmentB: segmentB.pointIndex,
            parameterA: closest.parameterA,
            parameterB: closest.parameterB,
            distanceA,
            distanceB,
            pointA: closest.pointA,
            pointB: closest.pointB,
            delta: closest.delta,
            distance: closest.distance,
            requiredDistance,
            penetration: requiredDistance - closest.distance,
            surfacePenetration: Math.max( 0, surfaceDistance - closest.distance ),
            isSurfaceOverlap: closest.distance + options.collisionEpsilon < surfaceDistance,
            radiusA,
            radiusB,
            relation: relation.type,
            incidentType: relation.incidentType,
            sharedNode: relation.sharedNode,
            allowedReason: allowedAtJunction ? 'declared-junction'
                : allowedOnAncestorRoute ? 'ancestor-junction-route' : null,
            semanticPathLength: routeConnection?.pathLength ?? null,
            semanticPathHops: routeConnection?.hops ?? null,
            semanticContactDistance: routeConnection?.semanticDistance ?? null
        };
        if ( allowedAtJunction || allowedOnAncestorRoute ) allowedContacts.push( contact );
        else rawContacts.push( contact );
    }

    const contacts = condenseContacts( rawContacts, options );
    return {
        contacts,
        rawContactCount: rawContacts.length,
        edgePairCount: new Set( contacts.map( ( contact ) => contact.pairId ) ).size,
        allowedJunctionContactCount: allowedContacts.length,
        allowedAncestorJunctionContactCount: allowedContacts.filter(
            ( contact ) => contact.allowedReason === 'ancestor-junction-route'
        ).length,
        allowedContinuationContactCount: allowedContacts.filter(
            ( contact ) => contact.incidentType === 'continuation'
        ).length,
        allowedSiblingContactCount: allowedContacts.filter(
            ( contact ) => contact.incidentType === 'sibling'
        ).length,
        candidateSegmentPairCount: pairs.length,
        edgeMetrics: built.edgeMetrics,
        cellSize: built.cellSize
    };
}

function hashDirection( text )
{
    let hash = 2166136261;
    for ( let index = 0; index < text.length; index++ )
    {
        hash ^= text.charCodeAt( index );
        hash = Math.imul( hash, 16777619 );
    }
    const x = ( ( hash & 1023 ) / 511.5 ) - 1;
    const y = ( ( ( hash >>> 10 ) & 1023 ) / 511.5 ) - 1;
    const z = ( ( ( hash >>> 20 ) & 1023 ) / 511.5 ) - 1;
    return normalise( { x, y, z }, { x: 1, y: 0, z: 0 } );
}

function perpendicularPreference( tangent, axis, pairId )
{
    let projected = subtract( axis, multiply( tangent, dot( axis, tangent ) ) );
    if ( lengthSquared( projected ) <= EPSILON )
    {
        const hashed = hashDirection( pairId );
        projected = subtract( hashed, multiply( tangent, dot( hashed, tangent ) ) );
    }
    if ( lengthSquared( projected ) <= EPSILON )
    {
        projected = cross( tangent, Math.abs( tangent.x ) < 0.8 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 } );
    }
    projected = normalise( projected, { x: 0, y: 0, z: 1 } );
    // Stable sign: changing point order or iteration must never flip the chosen side.
    return ( hashDirection( pairId ).x < 0 ? multiply( projected, -1 ) : projected );
}

function separationDirection( contact, edges, options )
{
    const segmentA = edges[ contact.edgeAIndex ].points;
    const segmentB = edges[ contact.edgeBIndex ].points;
    const tangentA = normalise( subtract( segmentA[ contact.segmentA + 1 ], segmentA[ contact.segmentA ] ) );
    const tangentB = normalise( subtract( segmentB[ contact.segmentB + 1 ], segmentB[ contact.segmentB ] ) );
    let tangent = normalise( add( tangentA, tangentB ), tangentA );
    if ( lengthSquared( tangent ) <= EPSILON ) tangent = normalise( subtract( tangentA, tangentB ), { x: 0, y: 1, z: 0 } );

    const preferred = perpendicularPreference( tangent, options.silhouetteAxis, contact.pairId );
    if ( contact.distance <= options.collisionEpsilon ) return preferred;

    const direct = normalise( contact.delta, preferred );
    const coincidence = clamp( 1 - contact.distance / Math.max( contact.requiredDistance * 0.35, EPSILON ), 0, 1 );
    const bias = coincidence * options.silhouetteBias;
    let preferredSigned = preferred;
    if ( dot( direct, preferredSigned ) < 0 ) preferredSigned = multiply( preferredSigned, -1 );
    return normalise( add( multiply( direct, 1 - bias ), multiply( preferredSigned, bias ) ), direct );
}

function edgeMobility( edge )
{
    if ( edge.locked === true ) return 0;
    return finiteNumber( edge.mobility ) ? Math.max( 0, edge.mobility ) : 1;
}

function makeDeltaArrays( edges )
{
    return edges.map( ( edge ) => edge.points.map( () => ( { x: 0, y: 0, z: 0 } ) ) );
}

function synchroniseSharedEndpoints( edges )
{
    const endpoints = new Map();
    for ( let edgeIndex = 0; edgeIndex < edges.length; edgeIndex++ )
    {
        const edge = edges[ edgeIndex ];
        const descriptors = [
            [ edge.parentId, 0 ],
            [ edge.childId, edge.points.length - 1 ]
        ];
        for ( const [ nodeId, pointIndex ] of descriptors )
        {
            if ( nodeId == null ) continue;
            const values = endpoints.get( nodeId );
            const binding = { edgeIndex, pointIndex };
            if ( values ) values.push( binding );
            else endpoints.set( nodeId, [ binding ] );
        }
    }

    let maximumMismatch = 0;
    let synchronisedEndpointCount = 0;
    for ( const bindings of endpoints.values() )
    {
        if ( bindings.length < 2 ) continue;
        let centre = { x: 0, y: 0, z: 0 };
        for ( const binding of bindings )
        {
            centre = add( centre, edges[ binding.edgeIndex ].points[ binding.pointIndex ] );
        }
        centre = multiply( centre, 1 / bindings.length );
        for ( const binding of bindings )
        {
            const point = edges[ binding.edgeIndex ].points[ binding.pointIndex ];
            const mismatch = length( subtract( point, centre ) );
            maximumMismatch = Math.max( maximumMismatch, mismatch );
            if ( mismatch > 1e-12 ) synchronisedEndpointCount++;
            point.x = centre.x;
            point.y = centre.y;
            point.z = centre.z;
        }
    }
    return { maximumMismatch, synchronisedEndpointCount };
}

function createNodeSystem( edges, baselines, options )
{
    const nodes = new Map();
    const childIds = new Set();
    for ( let edgeIndex = 0; edgeIndex < edges.length; edgeIndex++ )
    {
        const edge = edges[ edgeIndex ];
        if ( edge.childId != null ) childIds.add( edge.childId );
        const descriptors = [
            [ edge.parentId, 0, true ],
            [ edge.childId, edge.points.length - 1, false ]
        ];
        for ( const [ nodeId, pointIndex, atStart ] of descriptors )
        {
            if ( nodeId == null ) continue;
            let node = nodes.get( nodeId );
            if ( !node )
            {
                const baseline = baselines[ edgeIndex ][ pointIndex ];
                node = {
                    id: nodeId,
                    baseline: { ...baseline },
                    bindings: [],
                    maximumRadius: 0,
                    fixed: false
                };
                nodes.set( nodeId, node );
            }
            node.maximumRadius = Math.max( node.maximumRadius, edge.points[ pointIndex ].radius );
            node.bindings.push( { edgeIndex, pointIndex, atStart } );
        }
    }

    const rootIds = new Set();
    for ( const edge of edges )
    {
        if ( edge.parentId != null && !childIds.has( edge.parentId ) ) rootIds.add( edge.parentId );
    }
    for ( const node of nodes.values() )
    {
        node.fixed = options.fixedNodeIds.has( node.id ) || ( options.fixedRoot && rootIds.has( node.id ) );
    }
    return { nodes, rootIds };
}

function currentNodePosition( node, edges )
{
    const binding = node.bindings[0];
    const point = edges[ binding.edgeIndex ].points[ binding.pointIndex ];
    return { x: point.x, y: point.y, z: point.z };
}

function nearestNodeAtContact( edge, distanceAlongEdge, totalLength, requiredDistance, nodeSystem, options )
{
    if ( !options.relaxSharedNodes ) return null;
    const fromParent = distanceAlongEdge;
    const fromChild = totalLength - distanceAlongEdge;
    const threshold = requiredDistance * options.nodeEndpointRadiusFactor;
    let nodeId = null;
    let endpointDistance = Infinity;
    if ( fromParent <= threshold )
    {
        nodeId = edge.parentId;
        endpointDistance = fromParent;
    }
    if ( fromChild < endpointDistance && fromChild <= threshold )
    {
        nodeId = edge.childId;
        endpointDistance = fromChild;
    }
    if ( nodeId == null ) return null;
    const node = nodeSystem.nodes.get( nodeId );
    return node && !node.fixed ? { node, endpointDistance } : null;
}

function accumulateNodeDelta( accumulators, node, delta )
{
    let accumulator = accumulators.get( node.id );
    if ( !accumulator )
    {
        accumulator = { node, sum: { x: 0, y: 0, z: 0 }, count: 0 };
        accumulators.set( node.id, accumulator );
    }
    accumulator.sum = add( accumulator.sum, delta );
    accumulator.count++;
}

function addContactDelta( deltas, edge, edgeIndex, metrics, contactDistance, direction, magnitude, influence )
{
    if ( magnitude <= 0 || edge.points.length <= 2 ) return;
    let distanceAlong = 0;
    for ( let pointIndex = 1; pointIndex < edge.points.length - 1; pointIndex++ )
    {
        distanceAlong += metrics.lengths[ pointIndex - 1 ];
        const offset = ( distanceAlong - contactDistance ) / Math.max( influence, EPSILON );
        const weight = Math.exp( -0.5 * offset * offset );
        deltas[ edgeIndex ][ pointIndex ] = add( deltas[ edgeIndex ][ pointIndex ], multiply( direction, magnitude * weight ) );
    }
}

function resolveIteration( edges, baselines, detection, nodeSystem, options )
{
    const deltas = makeDeltaArrays( edges );
    const nodeDeltas = new Map();
    for ( const contact of detection.contacts )
    {
        const edgeA = edges[ contact.edgeAIndex ];
        const edgeB = edges[ contact.edgeBIndex ];
        const mobilityA = edgeMobility( edgeA );
        const mobilityB = edgeMobility( edgeB );
        const mobilityTotal = mobilityA + mobilityB;
        if ( mobilityTotal <= EPSILON ) continue;

        const direction = separationDirection( contact, edges, options );
        const correction = contact.penetration * options.stepScale;
        const influenceA = options.influenceRadius ?? Math.max( contact.requiredDistance * options.influenceRadiusFactor,
            percentile( detection.edgeMetrics[ contact.edgeAIndex ].lengths, 0.5 ) * options.influenceSegmentFactor );
        const influenceB = options.influenceRadius ?? Math.max( contact.requiredDistance * options.influenceRadiusFactor,
            percentile( detection.edgeMetrics[ contact.edgeBIndex ].lengths, 0.5 ) * options.influenceSegmentFactor );

        let nodeA = nearestNodeAtContact( edgeA, contact.distanceA,
            detection.edgeMetrics[ contact.edgeAIndex ].totalLength, contact.requiredDistance, nodeSystem, options );
        let nodeB = nearestNodeAtContact( edgeB, contact.distanceB,
            detection.edgeMetrics[ contact.edgeBIndex ].totalLength, contact.requiredDistance, nodeSystem, options );

        // Translating a sibling pair's shared release node cannot separate the
        // branches; equal and opposite requests merely cancel while suppressing
        // the useful interior correction. Keep the port welded and fan the paths.
        if ( nodeA?.node.id === nodeB?.node.id )
        {
            nodeA = null;
            nodeB = null;
        }

        if ( nodeA )
        {
            accumulateNodeDelta( nodeDeltas, nodeA.node,
                multiply( direction, correction * options.nodeStepScale * mobilityA / mobilityTotal ) );
        }
        if ( nodeB )
        {
            accumulateNodeDelta( nodeDeltas, nodeB.node,
                multiply( direction, -correction * options.nodeStepScale * mobilityB / mobilityTotal ) );
        }

        addContactDelta( deltas, edgeA, contact.edgeAIndex, detection.edgeMetrics[ contact.edgeAIndex ],
            contact.distanceA, direction, correction * mobilityA / mobilityTotal * ( nodeA ? 0.3 : 1 ), influenceA );
        addContactDelta( deltas, edgeB, contact.edgeBIndex, detection.edgeMetrics[ contact.edgeBIndex ],
            contact.distanceB, multiply( direction, -1 ), correction * mobilityB / mobilityTotal * ( nodeB ? 0.3 : 1 ), influenceB );
    }

    const nodeTargets = new Map();
    for ( const accumulator of nodeDeltas.values() )
    {
        const { node } = accumulator;
        let increment = multiply( accumulator.sum, 1 / accumulator.count );
        const maximumStep = Math.max( node.maximumRadius * options.maxStepRadiusFactor, options.clearance );
        const incrementLength = length( increment );
        if ( incrementLength > maximumStep ) increment = multiply( increment, maximumStep / incrementLength );

        const current = currentNodePosition( node, edges );
        let nextOffset = add( subtract( current, node.baseline ), increment );
        const displacementLimit = Math.min( options.maxNodeDisplacement ?? options.maxDisplacement,
            node.maximumRadius * options.maxNodeDisplacementRadiusFactor );
        const offsetLength = length( nextOffset );
        if ( offsetLength > displacementLimit ) nextOffset = multiply( nextOffset, displacementLimit / offsetLength );
        const target = add( node.baseline, nextOffset );
        const actualIncrement = subtract( target, current );
        if ( lengthSquared( actualIncrement ) <= EPSILON * EPSILON ) continue;
        nodeTargets.set( node.id, target );

        const influence = options.nodeInfluenceRadius ?? Math.max(
            node.maximumRadius * options.nodeInfluenceRadiusFactor,
            ...node.bindings.map( ( binding ) =>
                percentile( detection.edgeMetrics[ binding.edgeIndex ].lengths, 0.5 ) * options.influenceSegmentFactor )
        );
        for ( const binding of node.bindings )
        {
            const edge = edges[ binding.edgeIndex ];
            const metrics = detection.edgeMetrics[ binding.edgeIndex ];
            let distanceFromStart = 0;
            for ( let pointIndex = 1; pointIndex < edge.points.length - 1; pointIndex++ )
            {
                distanceFromStart += metrics.lengths[ pointIndex - 1 ];
                const distanceFromNode = binding.atStart
                    ? distanceFromStart
                    : metrics.totalLength - distanceFromStart;
                const scaled = distanceFromNode / Math.max( influence, EPSILON );
                const weight = Math.exp( -0.5 * scaled * scaled );
                deltas[ binding.edgeIndex ][ pointIndex ] = add(
                    deltas[ binding.edgeIndex ][ pointIndex ],
                    multiply( actualIncrement, weight )
                );
            }
        }
    }

    let movedPointCount = 0;
    edges.forEach( ( edge, edgeIndex ) => {
        const originalDeltas = deltas[ edgeIndex ].map( ( value ) => ( { ...value } ) );
        if ( options.smoothing > 0 )
        {
            for ( let pointIndex = 1; pointIndex < edge.points.length - 1; pointIndex++ )
            {
                deltas[ edgeIndex ][ pointIndex ] = add(
                    multiply( originalDeltas[ pointIndex ], 1 - 2 * options.smoothing ),
                    multiply( add( originalDeltas[ pointIndex - 1 ], originalDeltas[ pointIndex + 1 ] ), options.smoothing )
                );
            }
        }

        for ( let pointIndex = 1; pointIndex < edge.points.length - 1; pointIndex++ )
        {
            const point = edge.points[ pointIndex ];
            const baseline = baselines[ edgeIndex ][ pointIndex ];
            let delta = deltas[ edgeIndex ][ pointIndex ];
            const maxStep = Math.max( point.radius * options.maxStepRadiusFactor, options.clearance );
            const deltaLength = length( delta );
            if ( deltaLength > maxStep ) delta = multiply( delta, maxStep / deltaLength );

            let nextOffset = add( subtract( point, baseline ), delta );
            const displacementLimit = Math.min( options.maxDisplacement,
                point.radius * options.maxDisplacementRadiusFactor );
            const offsetLength = length( nextOffset );
            if ( offsetLength > displacementLimit ) nextOffset = multiply( nextOffset, displacementLimit / offsetLength );
            if ( lengthSquared( subtract( add( baseline, nextOffset ), point ) ) > EPSILON * EPSILON ) movedPointCount++;
            point.x = baseline.x + nextOffset.x;
            point.y = baseline.y + nextOffset.y;
            point.z = baseline.z + nextOffset.z;
        }
    } );

    // Install each semantic node once into every incident edge. This final write
    // is deliberate: no per-edge smoothing or clamping may crack the shared port.
    for ( const [ nodeId, target ] of nodeTargets )
    {
        const node = nodeSystem.nodes.get( nodeId );
        for ( const binding of node.bindings )
        {
            const point = edges[ binding.edgeIndex ].points[ binding.pointIndex ];
            point.x = target.x;
            point.y = target.y;
            point.z = target.z;
        }
    }
    return { movedPointCount, movedNodeCount: nodeTargets.size };
}

function publicContact( contact )
{
    return {
        pairId: contact.pairId,
        edgeAId: contact.edgeAId,
        edgeBId: contact.edgeBId,
        segmentA: contact.segmentA,
        segmentB: contact.segmentB,
        distance: contact.distance,
        requiredDistance: contact.requiredDistance,
        penetration: contact.penetration,
        surfacePenetration: contact.surfacePenetration,
        isSurfaceOverlap: contact.isSurfaceOverlap,
        relation: contact.relation,
        incidentType: contact.incidentType,
        sharedNode: contact.sharedNode,
        semanticPathLength: contact.semanticPathLength,
        semanticPathHops: contact.semanticPathHops,
        pointA: { ...contact.pointA },
        pointB: { ...contact.pointB }
    };
}

function displacementStatistics( edges, baselines )
{
    let displacedPointCount = 0;
    let maximum = 0;
    let sumSquared = 0;
    edges.forEach( ( edge, edgeIndex ) => {
        edge.points.forEach( ( point, pointIndex ) => {
            const displacement = length( subtract( point, baselines[ edgeIndex ][ pointIndex ] ) );
            if ( displacement > 1e-9 ) displacedPointCount++;
            maximum = Math.max( maximum, displacement );
            sumSquared += displacement * displacement;
        } );
    } );
    return {
        displacedPointCount,
        maxDisplacement: maximum,
        rmsDisplacement: Math.sqrt( sumSquared / Math.max( 1, edges.reduce( ( sum, edge ) => sum + edge.points.length, 0 ) ) )
    };
}

function nodeDisplacementStatistics( edges, nodeSystem )
{
    let movedNodeCount = 0;
    let maxNodeDisplacement = 0;
    for ( const node of nodeSystem.nodes.values() )
    {
        const displacement = length( subtract( currentNodePosition( node, edges ), node.baseline ) );
        if ( displacement > 1e-9 ) movedNodeCount++;
        maxNodeDisplacement = Math.max( maxNodeDisplacement, displacement );
    }
    return { movedNodeCount, maxNodeDisplacement };
}

/**
 * Separates sampled semantic branches without changing their endpoints.
 *
 * A collision is a surface overlap between two non-identical edge sweeps. Directly
 * incident edges may overlap only inside a radius-scaled neighbourhood of their
 * declared shared node; ancestry alone never licenses a remote overlap. The solver
 * applies deterministic, smooth lateral offsets to interior samples and reports any
 * contact it cannot remove within the configured displacement/iteration bounds.
 *
 * @param {Array<object>} inputEdges edge descriptors with sampled `{x,y,z,radius}` points
 * @param {object} [options] collision and bounded-relaxation options
 * @returns {{edges: Array<object>, report: object}}
 */
export function resolveSemanticCollisions( inputEdges, options = {} )
{
    validateEdges( inputEdges );
    const settings = makeOptions( options );
    const edges = cloneEdges( inputEdges );
    const endpointSynchronisation = settings.relaxSharedNodes
        ? synchroniseSharedEndpoints( edges )
        : { maximumMismatch: 0, synchronisedEndpointCount: 0 };
    const baselines = edges.map( ( edge ) => edge.points.map( ( point ) => ( { x: point.x, y: point.y, z: point.z } ) ) );
    const nodeSystem = createNodeSystem( edges, baselines, settings );
    const initial = detectCollisions( edges, settings );
    let current = initial;
    let iterations = 0;
    let totalMovedPointUpdates = 0;
    let totalMovedNodeUpdates = 0;

    while ( current.contacts.length > 0 && iterations < settings.maxIterations )
    {
        const moved = resolveIteration( edges, baselines, current, nodeSystem, settings );
        totalMovedPointUpdates += moved.movedPointCount;
        totalMovedNodeUpdates += moved.movedNodeCount;
        iterations++;
        if ( moved.movedPointCount === 0 && moved.movedNodeCount === 0 ) break;
        current = detectCollisions( edges, settings );
    }

    const finalDetection = iterations === 0 ? current : detectCollisions( edges, settings );
    const initialPairs = new Set( initial.contacts.map( ( contact ) => contact.pairId ) );
    const finalPairs = new Set( finalDetection.contacts.map( ( contact ) => contact.pairId ) );
    const initialSurfacePairs = new Set( initial.contacts
        .filter( ( contact ) => contact.isSurfaceOverlap )
        .map( ( contact ) => contact.pairId ) );
    const finalSurfaceContacts = finalDetection.contacts.filter( ( contact ) => contact.isSurfaceOverlap );
    const finalSurfacePairs = new Set( finalSurfaceContacts.map( ( contact ) => contact.pairId ) );
    const displacement = displacementStatistics( edges, baselines );
    const nodeDisplacement = nodeDisplacementStatistics( edges, nodeSystem );

    return {
        edges,
        report: {
            converged: finalDetection.contacts.length === 0,
            fusionFree: finalSurfaceContacts.length === 0,
            iterations,
            initialContactCount: initial.contacts.length,
            initialRawContactCount: initial.rawContactCount,
            initialEdgePairCount: initialPairs.size,
            finalContactCount: finalDetection.contacts.length,
            finalRawContactCount: finalDetection.rawContactCount,
            finalEdgePairCount: finalPairs.size,
            initialSurfaceOverlapCount: initial.contacts.filter( ( contact ) => contact.isSurfaceOverlap ).length,
            initialSurfaceOverlapPairCount: initialSurfacePairs.size,
            finalSurfaceOverlapCount: finalSurfaceContacts.length,
            finalSurfaceOverlapPairCount: finalSurfacePairs.size,
            resolvedEdgePairCount: [ ...initialPairs ].filter( ( pairId ) => !finalPairs.has( pairId ) ).length,
            introducedEdgePairCount: [ ...finalPairs ].filter( ( pairId ) => !initialPairs.has( pairId ) ).length,
            allowedJunctionContactCount: finalDetection.allowedJunctionContactCount,
            allowedAncestorJunctionContactCount: finalDetection.allowedAncestorJunctionContactCount,
            allowedContinuationContactCount: finalDetection.allowedContinuationContactCount,
            allowedSiblingContactCount: finalDetection.allowedSiblingContactCount,
            candidateSegmentPairCount: finalDetection.candidateSegmentPairCount,
            cellSize: finalDetection.cellSize,
            totalMovedPointUpdates,
            totalMovedNodeUpdates,
            sharedNodeRelaxationEnabled: settings.relaxSharedNodes,
            fixedRootNodeIds: [ ...nodeSystem.rootIds ].filter( ( nodeId ) => nodeSystem.nodes.get( nodeId )?.fixed ),
            maximumInitialSharedEndpointMismatch: endpointSynchronisation.maximumMismatch,
            synchronisedEndpointCount: endpointSynchronisation.synchronisedEndpointCount,
            ...displacement,
            ...nodeDisplacement,
            unresolved: finalDetection.contacts.map( publicContact )
        }
    };
}


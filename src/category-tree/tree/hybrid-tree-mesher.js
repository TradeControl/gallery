import {
    buildSparseUnionMesh,
    SPARSE_UNION_FIELD_MODES
} from './sparse-union-mesher.js';

const EPSILON = 1e-9;
const TAU = Math.PI * 2;

function clamp( value, minimum, maximum )
{
    return Math.max( minimum, Math.min( maximum, value ) );
}

function point( value )
{
    return {
        x: Number( value.x ),
        y: Number( value.y ),
        z: Number( value.z ),
        radius: Number( value.radius )
    };
}

function float32Point( value )
{
    return {
        x: Math.fround( value.x ),
        y: Math.fround( value.y ),
        z: Math.fround( value.z )
    };
}

function add( a, b )
{
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function subtract( a, b )
{
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function scale( value, factor )
{
    return { x: value.x * factor, y: value.y * factor, z: value.z * factor };
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

function normalize( value, fallback = { x: 0, y: 1, z: 0 } )
{
    const magnitude = length( value );
    return magnitude > EPSILON ? scale( value, 1 / magnitude ) : { ...fallback };
}

// Surface faces are allowed to be much smaller than the general geometric
// epsilon (the final audit threshold can be as low as 1e-18 in double-area).
// Using normalize() for a face cross product therefore replaces valid
// microscopic face directions with its fallback vector. Keep this operation
// scale-free so the normal solver and its certificate see the same direction
// as the mesh audit.
function unitTriangleNormal( a, b, c, fallback = { x: 0, y: 1, z: 0 } )
{
    const value = cross( subtract( b, a ), subtract( c, a ) );
    const magnitude = length( value );
    return Number.isFinite( magnitude ) && magnitude > 0
        ? scale( value, 1 / magnitude )
        : { ...fallback };
}

function lerp( a, b, fraction )
{
    return a + ( b - a ) * fraction;
}

function lerpPoint( a, b, fraction )
{
    return {
        x: lerp( a.x, b.x, fraction ),
        y: lerp( a.y, b.y, fraction ),
        z: lerp( a.z, b.z, fraction ),
        radius: lerp( a.radius, b.radius, fraction )
    };
}

function finiteSample( sample )
{
    return sample
        && Number.isFinite( sample.x )
        && Number.isFinite( sample.y )
        && Number.isFinite( sample.z )
        && Number.isFinite( sample.radius )
        && sample.radius > 0;
}

class UnionFind
{
    constructor( values )
    {
        this.parent = new Map();
        this.rank = new Map();
        for ( const value of values )
        {
            this.parent.set( value, value );
            this.rank.set( value, 0 );
        }
    }

    find( value )
    {
        let root = value;
        while ( this.parent.get( root ) !== root ) root = this.parent.get( root );
        while ( this.parent.get( value ) !== value )
        {
            const next = this.parent.get( value );
            this.parent.set( value, root );
            value = next;
        }
        return root;
    }

    union( first, second )
    {
        let firstRoot = this.find( first );
        let secondRoot = this.find( second );
        if ( firstRoot === secondRoot ) return firstRoot;
        const firstRank = this.rank.get( firstRoot );
        const secondRank = this.rank.get( secondRoot );
        if ( firstRank < secondRank ) [ firstRoot, secondRoot ] = [ secondRoot, firstRoot ];
        this.parent.set( secondRoot, firstRoot );
        if ( firstRank === secondRank ) this.rank.set( firstRoot, firstRank + 1 );
        return firstRoot;
    }
}

function cumulativeLengths( points )
{
    const values = new Float64Array( points.length );
    for ( let index = 1; index < points.length; index += 1 )
    {
        values[ index ] = values[ index - 1 ] + length( subtract( points[ index ], points[ index - 1 ] ) );
    }
    return values;
}

function sampleAtDistance( edge, distance )
{
    const bounded = clamp( distance, 0, edge.length );
    let low = 0;
    let high = edge.points.length - 1;
    while ( low + 1 < high )
    {
        const middle = Math.floor( ( low + high ) / 2 );
        if ( edge.distances[ middle ] <= bounded ) low = middle;
        else high = middle;
    }
    const span = edge.distances[ high ] - edge.distances[ low ];
    const fraction = span > EPSILON ? ( bounded - edge.distances[ low ] ) / span : 0;
    return lerpPoint( edge.points[ low ], edge.points[ high ], fraction );
}

function tangentAtDistance( edge, distance, direction = 1 )
{
    const delta = Math.max( edge.length * 1e-5, 1e-5 );
    const before = sampleAtDistance( edge, clamp( distance - delta, 0, edge.length ) );
    const after = sampleAtDistance( edge, clamp( distance + delta, 0, edge.length ) );
    const tangent = normalize( subtract( after, before ) );
    return direction >= 0 ? tangent : scale( tangent, -1 );
}

function slicePolyline( edge, fromDistance, toDistance )
{
    let from = clamp( fromDistance, 0, edge.length );
    let to = clamp( toDistance, 0, edge.length );
    const reverse = from > to;
    if ( reverse ) [ from, to ] = [ to, from ];
    const values = [ sampleAtDistance( edge, from ) ];
    for ( let index = 1; index < edge.points.length - 1; index += 1 )
    {
        if ( edge.distances[ index ] > from + EPSILON && edge.distances[ index ] < to - EPSILON )
        {
            values.push( { ...edge.points[ index ] } );
        }
    }
    values.push( sampleAtDistance( edge, to ) );
    if ( reverse ) values.reverse();
    return values;
}

function sampleClearanceFromEdge( sample, edge )
{
    let best = { distance: Number.POSITIVE_INFINITY, radius: 0 };
    for ( let index = 0; index < edge.points.length - 1; index += 1 )
    {
        const a = edge.points[ index ];
        const b = edge.points[ index + 1 ];
        const direction = subtract( b, a );
        const denominator = lengthSquared( direction );
        const fraction = denominator > EPSILON
            ? clamp( dot( subtract( sample, a ), direction ) / denominator, 0, 1 )
            : 0;
        const centre = add( a, scale( direction, fraction ) );
        const distance = length( subtract( sample, centre ) );
        if ( distance < best.distance )
        {
            best = { distance, radius: lerp( a.radius, b.radius, fraction ) };
        }
    }
    return best;
}

function normalizeEdges( sourceEdges )
{
    if ( !Array.isArray( sourceEdges ) ) throw new TypeError( 'sampledEdges must be an array' );
    const edges = [];
    for ( let sourceIndex = 0; sourceIndex < sourceEdges.length; sourceIndex += 1 )
    {
        const source = sourceEdges[ sourceIndex ];
        if ( !source || source.parentId === undefined || source.childId === undefined ) continue;
        const points = [];
        for ( const sourcePoint of source.points ?? [] )
        {
            if ( !finiteSample( sourcePoint ) ) continue;
            const next = point( sourcePoint );
            if ( points.length > 0 && lengthSquared( subtract( next, points.at( -1 ) ) ) < 1e-16 )
            {
                points.at( -1 ).radius = Math.max( points.at( -1 ).radius, next.radius );
            }
            else points.push( next );
        }
        if ( points.length < 2 ) continue;
        const distances = cumulativeLengths( points );
        const edgeLength = distances.at( -1 );
        if ( edgeLength <= EPSILON ) continue;
        edges.push( {
            localIndex: edges.length,
            id: source.id ?? `${source.parentId} -> ${source.childId}`,
            edgeIndex: source.edgeIndex ?? sourceIndex,
            parentId: source.parentId,
            childId: source.childId,
            points,
            distances,
            length: edgeLength,
            source
        } );
    }
    return edges;
}

function expandedTreeScale( edges, radiusFactor = 1 )
{
    const minimum = { x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY, z: Number.POSITIVE_INFINITY };
    const maximum = { x: Number.NEGATIVE_INFINITY, y: Number.NEGATIVE_INFINITY, z: Number.NEGATIVE_INFINITY };
    for ( const edge of edges )
    {
        for ( const sample of edge.points )
        {
            const radius = sample.radius * radiusFactor;
            minimum.x = Math.min( minimum.x, sample.x - radius );
            minimum.y = Math.min( minimum.y, sample.y - radius );
            minimum.z = Math.min( minimum.z, sample.z - radius );
            maximum.x = Math.max( maximum.x, sample.x + radius );
            maximum.y = Math.max( maximum.y, sample.y + radius );
            maximum.z = Math.max( maximum.z, sample.z + radius );
        }
    }
    return Math.hypot(
        maximum.x - minimum.x,
        maximum.y - minimum.y,
        maximum.z - minimum.z
    ) || 1;
}

function positionBufferScale( positions )
{
    if ( positions.length === 0 ) return 1;
    const minimum = [ Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY ];
    const maximum = [ Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY ];
    for ( let offset = 0; offset < positions.length; offset += 3 )
    {
        for ( let axis = 0; axis < 3; axis += 1 )
        {
            minimum[ axis ] = Math.min( minimum[ axis ], positions[ offset + axis ] );
            maximum[ axis ] = Math.max( maximum[ axis ], positions[ offset + axis ] );
        }
    }
    return Math.hypot(
        maximum[ 0 ] - minimum[ 0 ],
        maximum[ 1 ] - minimum[ 1 ],
        maximum[ 2 ] - minimum[ 2 ]
    ) || 1;
}

function buildIncidence( edges )
{
    const incidence = new Map();
    function include( nodeId, value )
    {
        if ( !incidence.has( nodeId ) ) incidence.set( nodeId, [] );
        incidence.get( nodeId ).push( value );
    }
    edges.forEach( ( edge, edgeIndex ) => {
        include( edge.parentId, { edgeIndex, side: 'start' } );
        include( edge.childId, { edgeIndex, side: 'end' } );
    } );
    return incidence;
}

function endpointRadius( edge, side )
{
    return side === 'start' ? edge.points[ 0 ].radius : edge.points.at( -1 ).radius;
}

function endpointDirection( edge, side )
{
    return side === 'start'
        ? tangentAtDistance( edge, 0, 1 )
        : tangentAtDistance( edge, edge.length, -1 );
}

function otherNodeId( edge, side )
{
    return side === 'start' ? edge.childId : edge.parentId;
}

function endpointKey( edgeIndex, side )
{
    return `${edgeIndex}:${side}`;
}

function computeEndpointPortDepths( edges, incidence, nodeScales, options )
{
    const cellSize = options.cellSize ?? 0.04;
    const portRadiusFactor = options.portRadiusFactor ?? 2.35;
    const depths = new Map();
    const unresolved = [];
    function portState( item )
    {
        const edge = edges[ item.edgeIndex ];
        const depth = depths.get( endpointKey( item.edgeIndex, item.side ) );
        const distance = item.side === 'start' ? depth : edge.length - depth;
        return {
            edge,
            depth,
            distance,
            sample: sampleAtDistance( edge, distance ),
            outward: tangentAtDistance( edge, distance, item.side === 'start' ? 1 : -1 )
        };
    }
    function isolation( firstState, secondState )
    {
        const separation = length( subtract( firstState.sample, secondState.sample ) );
        const required = ( options.portIsolationFactor ?? 1.28 )
            * ( firstState.sample.radius + secondState.sample.radius ) + cellSize * 0.7;
        return { separation, required };
    }
    for ( const [ nodeId, incident ] of incidence )
    {
        const nodeScale = nodeScales.get( nodeId );
        for ( const item of incident )
        {
            const edge = edges[ item.edgeIndex ];
            depths.set( endpointKey( item.edgeIndex, item.side ), Math.min(
                edge.length * 0.72,
                Math.max(
                    portRadiusFactor * nodeScale,
                    endpointRadius( edge, item.side ) * 1.6,
                    cellSize * 2.2
                )
            ) );
        }

        // A field port is valid only after its swept cross-section is disjoint
        // from every sibling outlet. Follow the authored curves until that is
        // true instead of inferring isolation from the initial tangent alone.
        for ( let iteration = 0; iteration < 80; iteration += 1 )
        {
            let changed = false;
            for ( let firstIndex = 0; firstIndex < incident.length; firstIndex += 1 )
            {
                const first = incident[ firstIndex ];
                const firstKey = endpointKey( first.edgeIndex, first.side );
                const firstState = portState( first );
                for ( let secondIndex = firstIndex + 1; secondIndex < incident.length; secondIndex += 1 )
                {
                    const second = incident[ secondIndex ];
                    const secondKey = endpointKey( second.edgeIndex, second.side );
                    const secondState = portState( second );
                    const state = isolation( firstState, secondState );
                    if ( state.separation >= state.required ) continue;
                    const separationIncrement = state.separation < state.required
                        ? Math.max( cellSize * 0.45, ( state.required - state.separation ) * 0.62 )
                        : 0;
                    const firstIncrement = separationIncrement;
                    const secondIncrement = separationIncrement;
                    const firstMaximum = firstState.edge.length * 0.82;
                    const secondMaximum = secondState.edge.length * 0.82;
                    const nextFirst = Math.min( firstMaximum, firstState.depth + Math.max( 0, firstIncrement ) );
                    const nextSecond = Math.min( secondMaximum, secondState.depth + Math.max( 0, secondIncrement ) );
                    if ( nextFirst > firstState.depth + EPSILON )
                    {
                        depths.set( firstKey, nextFirst );
                        changed = true;
                    }
                    if ( nextSecond > secondState.depth + EPSILON )
                    {
                        depths.set( secondKey, nextSecond );
                        changed = true;
                    }
                }
            }
            if ( !changed ) break;
        }
        // A planar cap can still be split by the middle of a sibling curve even
        // when the two candidate port centres are separated. Validate each cap
        // against every complete sibling sweep and advance it independently.
        for ( let itemIndex = 0; itemIndex < incident.length; itemIndex += 1 )
        {
            const item = incident[ itemIndex ];
            const key = endpointKey( item.edgeIndex, item.side );
            let blockingItem = null;
            for ( let iteration = 0; iteration < 120; iteration += 1 )
            {
                const state = portState( item );
                let worstViolation = 0;
                blockingItem = null;
                for ( let otherIndex = 0; otherIndex < incident.length; otherIndex += 1 )
                {
                    if ( otherIndex === itemIndex ) continue;
                    const other = incident[ otherIndex ];
                    const clearance = sampleClearanceFromEdge( state.sample, edges[ other.edgeIndex ] );
                    const required = state.sample.radius + clearance.radius
                        + cellSize * ( options.portClearanceCells ?? 1.15 );
                    const violation = required - clearance.distance;
                    if ( violation > worstViolation )
                    {
                        worstViolation = violation;
                        blockingItem = other;
                    }
                }
                if ( worstViolation <= 0 ) break;
                const maximum = state.edge.length * 0.86;
                const next = Math.min( maximum,
                    state.depth + Math.max( cellSize * 0.45, worstViolation * 0.72 ) );
                if ( next <= state.depth + EPSILON ) break;
                depths.set( key, next );
            }
            if ( blockingItem )
            {
                const state = portState( item );
                const clearance = sampleClearanceFromEdge( state.sample, edges[ blockingItem.edgeIndex ] );
                const required = state.sample.radius + clearance.radius
                    + cellSize * ( options.portClearanceCells ?? 1.15 );
                if ( clearance.distance < required )
                {
                    unresolved.push( { nodeId, first: item, second: blockingItem } );
                }
            }
        }
        for ( let firstIndex = 0; firstIndex < incident.length; firstIndex += 1 )
        {
            for ( let secondIndex = firstIndex + 1; secondIndex < incident.length; secondIndex += 1 )
            {
                const first = incident[ firstIndex ];
                const second = incident[ secondIndex ];
                const state = isolation( portState( first ), portState( second ) );
                if ( state.separation < state.required )
                {
                    unresolved.push( { nodeId, first, second } );
                }
            }
        }
    }
    return { depths, unresolved };
}

function makeClusters( edges, incidence, options, forcedMergeEdges = new Set() )
{
    const nodeIds = [ ...incidence.keys() ];
    const union = new UnionFind( nodeIds );
    const nodeScales = new Map();
    for ( const [ nodeId, incident ] of incidence )
    {
        nodeScales.set( nodeId, Math.max( ...incident.map(
            ( item ) => endpointRadius( edges[ item.edgeIndex ], item.side )
        ) ) );
    }
    const endpointPortData = computeEndpointPortDepths( edges, incidence, nodeScales, options );
    const endpointDepths = endpointPortData.depths;
    const shortEdgeFactor = options.shortEdgeFactor ?? 1.08;
    for ( let edgeIndex = 0; edgeIndex < edges.length; edgeIndex += 1 )
    {
        const edge = edges[ edgeIndex ];
        const required = endpointDepths.get( endpointKey( edgeIndex, 'start' ) )
            + endpointDepths.get( endpointKey( edgeIndex, 'end' ) )
            + Math.max( ( options.cellSize ?? 0.04 ) * 1.5,
                Math.min( edge.points[ 0 ].radius, edge.points.at( -1 ).radius ) * 0.65 );
        if ( edge.length <= required * shortEdgeFactor ) union.union( edge.parentId, edge.childId );
    }
    for ( const unresolved of endpointPortData.unresolved )
    {
        union.union( unresolved.nodeId, otherNodeId( edges[ unresolved.first.edgeIndex ], unresolved.first.side ) );
        union.union( unresolved.nodeId, otherNodeId( edges[ unresolved.second.edgeIndex ], unresolved.second.side ) );
    }
    for ( const edgeIndex of forcedMergeEdges )
    {
        const edge = edges[ edgeIndex ];
        union.union( edge.parentId, edge.childId );
    }

    const grouped = new Map();
    for ( const nodeId of nodeIds )
    {
        const root = union.find( nodeId );
        if ( !grouped.has( root ) ) grouped.set( root, [] );
        grouped.get( root ).push( nodeId );
    }
    const clusters = [ ...grouped.values() ]
        .map( ( nodes, index ) => ( { index, id: `junction-${index}`, nodeIds: nodes.sort() } ) );
    const clusterForNode = new Map();
    for ( const cluster of clusters )
    {
        for ( const nodeId of cluster.nodeIds ) clusterForNode.set( nodeId, cluster.index );
    }
    return { clusters, clusterForNode, nodeScales, endpointDepths };
}

function makePorts( edges, incidence, clusters, clusterForNode, nodeScales, endpointDepths, options )
{
    const cellSize = options.cellSize ?? 0.04;
    const portRadiusFactor = options.portRadiusFactor ?? 2.35;
    const ports = [];
    const spanEdges = [];
    const portsByCluster = new Map( clusters.map( ( cluster ) => [ cluster.index, [] ] ) );
    const internalEdgesByCluster = new Map( clusters.map( ( cluster ) => [ cluster.index, [] ] ) );
    const depthConflicts = [];

    for ( let edgeLocalIndex = 0; edgeLocalIndex < edges.length; edgeLocalIndex += 1 )
    {
        const edge = edges[ edgeLocalIndex ];
        const startCluster = clusterForNode.get( edge.parentId );
        const endCluster = clusterForNode.get( edge.childId );
        if ( startCluster === endCluster )
        {
            internalEdgesByCluster.get( startCluster ).push( edgeLocalIndex );
            continue;
        }
        let startDistance = endpointDepths.get( endpointKey( edgeLocalIndex, 'start' ) );
        let endDistance = endpointDepths.get( endpointKey( edgeLocalIndex, 'end' ) );
        const edgeKey = `${typeof edge.id}:${String( edge.id )}|${typeof edge.edgeIndex}:${String( edge.edgeIndex )}`;
        startDistance += options._portDepthOffsets?.[ `${edgeKey}|start` ] ?? 0;
        endDistance += options._portDepthOffsets?.[ `${edgeKey}|end` ] ?? 0;
        const reserved = Math.max( cellSize * 1.5, Math.min(
            endpointRadius( edge, 'start' ), endpointRadius( edge, 'end' )
        ) * 0.65 );
        const maximumDepth = Math.max( edge.length - reserved, edge.length * 0.1 );
        if ( startDistance + endDistance > maximumDepth )
        {
            depthConflicts.push( edgeLocalIndex );
            continue;
        }
        const startSample = sampleAtDistance( edge, startDistance );
        const endSample = sampleAtDistance( edge, edge.length - endDistance );
        const startPort = {
            id: `${startCluster}:${edge.id}:start`,
            clusterIndex: startCluster,
            edgeLocalIndex,
            edgeId: edge.id,
            edgeIndex: edge.edgeIndex,
            side: 'start',
            distance: startDistance,
            center: point( startSample ),
            radius: startSample.radius,
            outward: tangentAtDistance( edge, startDistance, 1 )
        };
        const endPort = {
            id: `${endCluster}:${edge.id}:end`,
            clusterIndex: endCluster,
            edgeLocalIndex,
            edgeId: edge.id,
            edgeIndex: edge.edgeIndex,
            side: 'end',
            distance: edge.length - endDistance,
            center: point( endSample ),
            radius: endSample.radius,
            outward: tangentAtDistance( edge, edge.length - endDistance, -1 )
        };
        startPort.opposite = endPort;
        endPort.opposite = startPort;
        ports.push( startPort, endPort );
        portsByCluster.get( startCluster ).push( startPort );
        portsByCluster.get( endCluster ).push( endPort );
        spanEdges.push( { edgeLocalIndex, startPort, endPort } );
    }
    return { ports, spanEdges, portsByCluster, internalEdgesByCluster, depthConflicts };
}

function isolateClusterPorts( edges, clusters, portData, options )
{
    const cellSize = options.cellSize ?? 0.04;
    let adjustedPorts = 0;
    const failures = [];
    for ( const cluster of clusters )
    {
        const ports = portData.portsByCluster.get( cluster.index );
        if ( ports.length === 0 ) continue;
        const patchEdgeIndices = new Set( portData.internalEdgesByCluster.get( cluster.index ) );
        for ( const port of ports ) patchEdgeIndices.add( port.edgeLocalIndex );
        for ( let pass = 0; pass < 8; pass += 1 )
        {
            let changed = false;
            for ( const port of ports )
            {
                const edge = edges[ port.edgeLocalIndex ];
                let worstViolation = 0;
                for ( const otherEdgeIndex of patchEdgeIndices )
                {
                    if ( otherEdgeIndex === port.edgeLocalIndex ) continue;
                    const clearance = sampleClearanceFromEdge( port.center, edges[ otherEdgeIndex ] );
                    const required = port.radius + clearance.radius
                        + cellSize * ( options.portClearanceCells ?? 1.15 );
                    worstViolation = Math.max( worstViolation, required - clearance.distance );
                }
                if ( worstViolation <= 0 ) continue;
                const reserve = Math.max( cellSize * 2.5,
                    Math.min( port.radius, port.opposite.radius ) * 1.15 );
                const oldDistance = port.distance;
                port.distance = port.side === 'start'
                    ? Math.min( port.opposite.distance - reserve,
                        port.distance + Math.max( cellSize * 0.5, worstViolation * 0.8 ) )
                    : Math.max( port.opposite.distance + reserve,
                        port.distance - Math.max( cellSize * 0.5, worstViolation * 0.8 ) );
                if ( Math.abs( port.distance - oldDistance ) <= EPSILON ) continue;
                const sample = sampleAtDistance( edge, port.distance );
                port.center = point( sample );
                port.radius = sample.radius;
                port.outward = tangentAtDistance(
                    edge, port.distance, port.side === 'start' ? 1 : -1
                );
                adjustedPorts++;
                changed = true;
            }
            if ( !changed ) break;
        }
        for ( const port of ports )
        {
            for ( const otherEdgeIndex of patchEdgeIndices )
            {
                if ( otherEdgeIndex === port.edgeLocalIndex ) continue;
                const clearance = sampleClearanceFromEdge( port.center, edges[ otherEdgeIndex ] );
                const required = port.radius + clearance.radius
                    + cellSize * ( options.portClearanceCells ?? 1.15 );
                if ( clearance.distance + EPSILON < required )
                {
                    failures.push( { clusterId: cluster.id, port } );
                    break;
                }
            }
        }
    }
    return { adjustedPorts, failures };
}

function pointsToSegments( values, edge, clipPlane = null )
{
    const segments = [];
    for ( let index = 0; index < values.length - 1; index += 1 )
    {
        const a = values[ index ];
        const b = values[ index + 1 ];
        if ( lengthSquared( subtract( b, a ) ) <= 1e-16 ) continue;
        const segment = {
            a, b,
            radiusA: a.radius,
            radiusB: b.radius,
            ownerId: edge.id,
            edgeIndex: edge.edgeIndex
        };
        if ( clipPlane ) segment.clipPlane = clipPlane;
        segments.push( segment );
    }
    return segments;
}

function buildPatchSource( cluster, edges, ports, internalEdgeIndices, options )
{
    const segments = [];
    for ( const edgeIndex of internalEdgeIndices )
    {
        const edge = edges[ edgeIndex ];
        segments.push( ...pointsToSegments( edge.points, edge ) );
    }
    for ( const port of ports )
    {
        const edge = edges[ port.edgeLocalIndex ];
        const extension = Math.max(
            port.radius * ( options.patchExtensionFactor ?? 1.7 ),
            ( options.cellSize ?? 0.04 ) * 2.5
        );
        const values = port.side === 'start'
            ? slicePolyline( edge, 0, Math.min( edge.length, port.distance + extension ) )
            : slicePolyline( edge, Math.max( 0, port.distance - extension ), edge.length );
        segments.push( ...pointsToSegments( values, edge, {
            center: port.center,
            normal: port.outward
        } ) );
    }
    if ( segments.length === 0 )
    {
        throw new Error( `semantic cluster ${cluster.id} has no incident primitives` );
    }
    return segments;
}

function buildStarPatchSource( cluster, edges, ports, internalEdgeIndices, options )
{
    const nodeSamples = [];
    for ( const edgeIndex of internalEdgeIndices )
    {
        const edge = edges[ edgeIndex ];
        nodeSamples.push( edge.points[ 0 ], edge.points.at( -1 ) );
    }
    for ( const port of ports )
    {
        const edge = edges[ port.edgeLocalIndex ];
        nodeSamples.push( port.side === 'start' ? edge.points[ 0 ] : edge.points.at( -1 ) );
    }
    if ( nodeSamples.length === 0 )
    {
        throw new Error( `semantic cluster ${cluster.id} has no star anchor samples` );
    }
    const anchor = nodeSamples.reduce( ( sum, value ) => ( {
        x: sum.x + value.x,
        y: sum.y + value.y,
        z: sum.z + value.z
    } ), { x: 0, y: 0, z: 0 } );
    anchor.x /= nodeSamples.length;
    anchor.y /= nodeSamples.length;
    anchor.z /= nodeSamples.length;
    anchor.radius = Math.max( ...nodeSamples.map( ( value ) => value.radius ) )
        * ( options.fallbackHubRadiusFactor ?? 2.35 );
    // Keep the common hub behind every outlet plane. This is a convex
    // projection onto the retained half-spaces and makes each fallback ray
    // cross its cap plane exactly once.
    for ( let iteration = 0; iteration < 80; iteration += 1 )
    {
        let maximumCorrection = 0;
        for ( const port of ports )
        {
            const desiredInset = Math.max(
                anchor.radius + ( options.cellSize ?? 0.04 ) * 1.8,
                port.radius * 1.2
            );
            const signed = dot( subtract( anchor, port.center ), port.outward );
            const correction = signed + desiredInset;
            if ( correction <= 0 ) continue;
            anchor.x -= port.outward.x * correction;
            anchor.y -= port.outward.y * correction;
            anchor.z -= port.outward.z * correction;
            maximumCorrection = Math.max( maximumCorrection, correction );
        }
        if ( maximumCorrection < 1e-6 ) break;
    }

    const internalOwners = internalEdgeIndices.map( ( edgeIndex ) => edges[ edgeIndex ] );
    if ( ports.length === 0 )
    {
        // A completely absorbed connected tree has no external seam. Preserve
        // each semantic owner on one monotonic ray from the common anchor.
        return internalOwners.map( ( edge, index ) => {
            const sourceTarget = edge.points.at( -1 );
            let direction = normalize( subtract( sourceTarget, anchor ), {
                x: Math.cos( TAU * index / Math.max( 1, internalOwners.length ) ),
                y: 0.35,
                z: Math.sin( TAU * index / Math.max( 1, internalOwners.length ) )
            } );
            if ( lengthSquared( subtract( sourceTarget, anchor ) ) < 1e-6 )
            {
                direction = normalize( {
                    x: Math.cos( TAU * index / Math.max( 1, internalOwners.length ) ),
                    y: 0.35,
                    z: Math.sin( TAU * index / Math.max( 1, internalOwners.length ) )
                } );
            }
            const reach = Math.max( edge.length * 0.45, anchor.radius * 2.2 );
            const target = add( anchor, scale( direction, reach ) );
            return {
                a: anchor,
                b: { ...target, radius: Math.max( edge.points.at( -1 ).radius, anchor.radius * 0.34 ) },
                radiusA: anchor.radius,
                radiusB: Math.max( edge.points.at( -1 ).radius, anchor.radius * 0.34 ),
                ownerId: edge.id,
                edgeIndex: edge.edgeIndex,
                fallbackHub: true
            };
        } );
    }

    const assignedOwners = Array.from( { length: ports.length }, () => [] );
    // Longest rays receive owners first, leaving more exposed surface per owner.
    const portOrder = ports.map( ( port, index ) => ( {
        index,
        length: length( subtract( port.center, anchor ) )
    } ) ).sort( ( a, b ) => b.length - a.length );
    internalOwners.forEach( ( edge, index ) => {
        assignedOwners[ portOrder[ index % portOrder.length ].index ].push( edge );
    } );

    const segments = [];
    segments.ownershipRays = [];
    for ( let portIndex = 0; portIndex < ports.length; portIndex += 1 )
    {
        const port = ports[ portIndex ];
        const boundaryEdge = edges[ port.edgeLocalIndex ];
        const extension = Math.max(
            port.radius * ( options.patchExtensionFactor ?? 1.7 ),
            ( options.cellSize ?? 0.04 ) * 2.5
        );
        const anchorToPort = subtract( port.center, anchor );
        const lead = Math.max(
            port.radius * 1.75,
            ( options.cellSize ?? 0.04 ) * 2.6
        );
        const prePort = {
            ...subtract( port.center, scale( port.outward, lead ) ),
            radius: port.radius * 1.035
        };
        const targetPosition = add( port.center, scale( port.outward, extension ) );
        const target = { ...targetPosition, radius: port.radius };
        segments.push( {
            a: { ...anchor },
            b: prePort,
            radiusA: anchor.radius,
            radiusB: prePort.radius,
            ownerId: boundaryEdge.id,
            edgeIndex: boundaryEdge.edgeIndex,
            fallbackHub: true
        } );
        segments.push( {
            a: prePort,
            b: target,
            radiusA: prePort.radius,
            radiusB: target.radius,
            ownerId: boundaryEdge.id,
            edgeIndex: boundaryEdge.edgeIndex,
            clipPlane: { center: port.center, normal: port.outward }
        } );
        segments.ownershipRays.push( {
            boundaryOwner: boundaryEdge,
            internalOwners: assignedOwners[ portIndex ],
            anchor: { ...anchor },
            portCenter: { ...port.center }
        } );
    }
    return segments;
}

function signedDistanceToPlane( position, plane )
{
    return dot( subtract( position, plane.center ), plane.normal );
}

function readPosition( positions, index )
{
    const offset = index * 3;
    return { x: positions[ offset ], y: positions[ offset + 1 ], z: positions[ offset + 2 ] };
}

function pushPosition( positions, value )
{
    const index = positions.length / 3;
    positions.push( value.x, value.y, value.z );
    return index;
}

function findDistalOutletVertices( mesh, plane, ownerIndex, tolerance )
{
    const vertexCount = mesh.positions.length / 3;
    const distances = new Float64Array( vertexCount );
    const positive = new Uint8Array( vertexCount );
    const adjacency = Array.from( { length: vertexCount }, () => [] );
    for ( let vertex = 0; vertex < vertexCount; vertex += 1 )
    {
        distances[ vertex ] = signedDistanceToPlane( readPosition( mesh.positions, vertex ), plane );
        if ( distances[ vertex ] > tolerance ) positive[ vertex ] = 1;
    }
    function connect( first, second )
    {
        if ( !positive[ first ] || !positive[ second ] ) return;
        adjacency[ first ].push( second );
        adjacency[ second ].push( first );
    }
    for ( let index = 0; index < mesh.indices.length; index += 3 )
    {
        connect( mesh.indices[ index ], mesh.indices[ index + 1 ] );
        connect( mesh.indices[ index + 1 ], mesh.indices[ index + 2 ] );
        connect( mesh.indices[ index + 2 ], mesh.indices[ index ] );
    }
    const visited = new Uint8Array( vertexCount );
    let best = [];
    let bestOwnerCount = -1;
    let bestDistance = -Infinity;
    for ( let seed = 0; seed < vertexCount; seed += 1 )
    {
        if ( !positive[ seed ] || visited[ seed ] ) continue;
        const component = [];
        const queue = [ seed ];
        visited[ seed ] = 1;
        let ownerCount = 0;
        let maximumDistance = -Infinity;
        while ( queue.length > 0 )
        {
            const vertex = queue.pop();
            component.push( vertex );
            if ( mesh.vertexOwners[ vertex ] === ownerIndex ) ownerCount++;
            maximumDistance = Math.max( maximumDistance, distances[ vertex ] );
            for ( const neighbour of adjacency[ vertex ] )
            {
                if ( visited[ neighbour ] ) continue;
                visited[ neighbour ] = 1;
                queue.push( neighbour );
            }
        }
        if ( ownerCount > bestOwnerCount
            || ( ownerCount === bestOwnerCount && maximumDistance > bestDistance ) )
        {
            best = component;
            bestOwnerCount = ownerCount;
            bestDistance = maximumDistance;
        }
    }
    if ( bestOwnerCount <= 0 )
    {
        throw new Error( `port ${plane.id ?? ''} has no distal surface component for its semantic owner` );
    }
    return new Set( best );
}

function clipMeshAgainstPlane( mesh, plane, tolerance )
{
    const positions = Array.from( mesh.positions );
    const vertexOwners = Array.from( mesh.vertexOwners );
    const vertexEdges = Array.from( mesh.vertexEdges );
    const indices = [];
    const faceOwners = [];
    const faceEdges = [];
    const intersections = new Map();
    function distanceToGatePath( position )
    {
        if ( !Array.isArray( plane.gatePoints ) || plane.gatePoints.length < 2 )
        {
            const delta = subtract( position, plane.center );
            const axial = dot( delta, plane.normal );
            return Math.sqrt( Math.max( 0, lengthSquared( delta ) - axial * axial ) );
        }
        let minimumSquared = Number.POSITIVE_INFINITY;
        for ( let index = 0; index < plane.gatePoints.length - 1; index += 1 )
        {
            const a = plane.gatePoints[ index ];
            const b = plane.gatePoints[ index + 1 ];
            const direction = subtract( b, a );
            const denominator = lengthSquared( direction );
            const fraction = denominator > EPSILON
                ? clamp( dot( subtract( position, a ), direction ) / denominator, 0, 1 )
                : 0;
            minimumSquared = Math.min( minimumSquared,
                lengthSquared( subtract( position, add( a, scale( direction, fraction ) ) ) ) );
        }
        return Math.sqrt( minimumSquared );
    }
    function clipValue( position, vertexIndex )
    {
        const planeDistance = signedDistanceToPlane( position, plane );
        if ( plane.outsideVertices instanceof Set )
        {
            return plane.outsideVertices.has( vertexIndex )
                ? planeDistance
                : -Math.max( tolerance, Math.abs( planeDistance ) );
        }
        if ( Number.isInteger( plane.ownerIndex )
            && mesh.vertexOwners[ vertexIndex ] !== plane.ownerIndex )
        {
            // The sparse field records the closest declared primitive. Limiting
            // the cut to the outlet's provenance gives the per-primitive
            // `max(field, plane)` operation before the local hard union: a
            // sibling in front of this plane is therefore never amputated.
            return -Math.max( tolerance, Math.abs( planeDistance ) );
        }
        if ( !Number.isFinite( plane.gateRadius ) ) return planeDistance;
        // Only the outlet inside this finite gate is removed. Other limbs can
        // legitimately lie in front of the infinite plane and remain intact.
        // Curve-following port isolation guarantees the gate does not meet a
        // sibling surface, so the realised boundary is the planar port loop.
        return Math.min( planeDistance, plane.gateRadius - distanceToGatePath( position ) );
    }

    function intersection( firstIndex, secondIndex, firstDistance, secondDistance )
    {
        const low = Math.min( firstIndex, secondIndex );
        const high = Math.max( firstIndex, secondIndex );
        const key = `${low},${high}`;
        if ( intersections.has( key ) ) return intersections.get( key );
        const first = readPosition( positions, firstIndex );
        const second = readPosition( positions, secondIndex );
        const denominator = firstDistance - secondDistance;
        const fraction = Math.abs( denominator ) > EPSILON
            ? clamp( firstDistance / denominator, 0, 1 )
            : 0.5;
        const value = lerpPoint( { ...first, radius: 0 }, { ...second, radius: 0 }, fraction );
        // Projection removes accumulated floating point drift and makes port-loop
        // detection deterministic after several successive clips.
        const drift = signedDistanceToPlane( value, plane );
        const projected = subtract( value, scale( plane.normal, drift ) );
        const result = pushPosition( positions, projected );
        vertexOwners.push( fraction <= 0.5 ? vertexOwners[ firstIndex ] : vertexOwners[ secondIndex ] );
        vertexEdges.push( fraction <= 0.5 ? vertexEdges[ firstIndex ] : vertexEdges[ secondIndex ] );
        intersections.set( key, result );
        return result;
    }

    for ( let faceIndex = 0; faceIndex < mesh.indices.length / 3; faceIndex += 1 )
    {
        const polygon = [];
        const triangle = [
            mesh.indices[ faceIndex * 3 ],
            mesh.indices[ faceIndex * 3 + 1 ],
            mesh.indices[ faceIndex * 3 + 2 ]
        ];
        for ( let side = 0; side < 3; side += 1 )
        {
            const current = triangle[ side ];
            const next = triangle[ ( side + 1 ) % 3 ];
            const currentPosition = readPosition( positions, current );
            const nextPosition = readPosition( positions, next );
            const currentDistance = clipValue( currentPosition, current );
            const nextDistance = clipValue( nextPosition, next );
            const currentInside = currentDistance <= tolerance;
            const nextInside = nextDistance <= tolerance;
            if ( currentInside ) polygon.push( current );
            if ( currentInside !== nextInside )
            {
                polygon.push( intersection( current, next, currentDistance, nextDistance ) );
            }
        }
        if ( polygon.length < 3 ) continue;
        for ( let index = 1; index < polygon.length - 1; index += 1 )
        {
            const a = polygon[ 0 ];
            const b = polygon[ index ];
            const c = polygon[ index + 1 ];
            if ( a === b || b === c || c === a ) continue;
            indices.push( a, b, c );
            faceOwners.push( mesh.faceOwners[ faceIndex ] );
            faceEdges.push( mesh.faceEdges[ faceIndex ] );
        }
    }
    return {
        positions,
        indices,
        vertexOwners,
        vertexEdges,
        faceOwners,
        faceEdges,
        ownerIds: mesh.ownerIds,
        edgeIds: mesh.edgeIds
    };
}

function compactMesh( mesh )
{
    const remap = new Int32Array( mesh.positions.length / 3 );
    remap.fill( -1 );
    const positions = [];
    const vertexOwners = [];
    const vertexEdges = [];
    const indices = [];
    for ( const oldIndex of mesh.indices )
    {
        if ( remap[ oldIndex ] < 0 )
        {
            remap[ oldIndex ] = positions.length / 3;
            const offset = oldIndex * 3;
            positions.push(
                mesh.positions[ offset ],
                mesh.positions[ offset + 1 ],
                mesh.positions[ offset + 2 ]
            );
            vertexOwners.push( mesh.vertexOwners[ oldIndex ] );
            vertexEdges.push( mesh.vertexEdges[ oldIndex ] );
        }
        indices.push( remap[ oldIndex ] );
    }
    return {
        positions,
        indices,
        vertexOwners,
        vertexEdges,
        faceOwners: Array.from( mesh.faceOwners ),
        faceEdges: Array.from( mesh.faceEdges ),
        ownerIds: mesh.ownerIds,
        edgeIds: mesh.edgeIds
    };
}

function removePlanarPortCaps( mesh )
{
    if ( !mesh.faceFieldModes || mesh.faceFieldModes.length !== mesh.indices.length / 3 )
    {
        throw new Error( 'the local union mesher did not return field-mode provenance' );
    }
    const faceCount = mesh.indices.length / 3;
    const capFaces = [];
    const capFaceSet = new Set();
    for ( let face = 0; face < faceCount; face += 1 )
    {
        const offset = face * 3;
        const allVerticesOnClipPlane = mesh.vertexFieldModes
            && mesh.vertexFieldModes[ mesh.indices[ offset ] ] === SPARSE_UNION_FIELD_MODES.CLIP_PLANE
            && mesh.vertexFieldModes[ mesh.indices[ offset + 1 ] ] === SPARSE_UNION_FIELD_MODES.CLIP_PLANE
            && mesh.vertexFieldModes[ mesh.indices[ offset + 2 ] ] === SPARSE_UNION_FIELD_MODES.CLIP_PLANE;
        if ( mesh.faceFieldModes[ face ] !== SPARSE_UNION_FIELD_MODES.CLIP_PLANE
            && !allVerticesOnClipPlane ) continue;
        capFaces.push( face );
        capFaceSet.add( face );
    }
    const adjacency = new Map( capFaces.map( ( face ) => [ face, [] ] ) );
    const edgeUses = new Map();
    function includeEdge( face, first, second )
    {
        const key = `${Math.min( first, second )},${Math.max( first, second )}`;
        if ( !edgeUses.has( key ) ) edgeUses.set( key, [] );
        edgeUses.get( key ).push( face );
    }
    for ( const face of capFaces )
    {
        const offset = face * 3;
        includeEdge( face, mesh.indices[ offset ], mesh.indices[ offset + 1 ] );
        includeEdge( face, mesh.indices[ offset + 1 ], mesh.indices[ offset + 2 ] );
        includeEdge( face, mesh.indices[ offset + 2 ], mesh.indices[ offset ] );
    }
    for ( const uses of edgeUses.values() )
    {
        if ( uses.length !== 2 ) continue;
        const first = uses[ 0 ];
        const second = uses[ 1 ];
        if ( mesh.faceOwners[ first ] !== mesh.faceOwners[ second ]
            || mesh.faceEdges[ first ] !== mesh.faceEdges[ second ] ) continue;
        adjacency.get( first ).push( second );
        adjacency.get( second ).push( first );
    }
    const visited = new Set();
    const componentsByOwner = new Map();
    for ( const seed of capFaces )
    {
        if ( visited.has( seed ) ) continue;
        const component = [];
        const queue = [ seed ];
        visited.add( seed );
        let doubleArea = 0;
        while ( queue.length > 0 )
        {
            const face = queue.pop();
            component.push( face );
            const offset = face * 3;
            const a = readPosition( mesh.positions, mesh.indices[ offset ] );
            const b = readPosition( mesh.positions, mesh.indices[ offset + 1 ] );
            const c = readPosition( mesh.positions, mesh.indices[ offset + 2 ] );
            doubleArea += length( cross( subtract( b, a ), subtract( c, a ) ) );
            for ( const neighbour of adjacency.get( face ) )
            {
                if ( visited.has( neighbour ) ) continue;
                visited.add( neighbour );
                queue.push( neighbour );
            }
        }
        const ownerKey = `${mesh.faceOwners[ seed ]},${mesh.faceEdges[ seed ]}`;
        if ( !componentsByOwner.has( ownerKey ) ) componentsByOwner.set( ownerKey, [] );
        componentsByOwner.get( ownerKey ).push( { faces: component, doubleArea } );
    }
    const removeFaces = new Set();
    let retainedCapFragments = 0;
    let retainedCapFragmentFaces = 0;
    for ( const components of componentsByOwner.values() )
    {
        components.sort( ( a, b ) => b.doubleArea - a.doubleArea || b.faces.length - a.faces.length );
        for ( const face of components[ 0 ].faces ) removeFaces.add( face );
        retainedCapFragments += Math.max( 0, components.length - 1 );
        retainedCapFragmentFaces += components.slice( 1 ).reduce(
            ( sum, component ) => sum + component.faces.length, 0
        );
    }
    // A marching-tetrahedra mode tie can leave a capsule-mode triangle (or a
    // tiny group) completely enclosed by the selected planar cap. Once the cap
    // is removed that island would create an additional boundary loop. The
    // original local union is connected, so retain the largest remaining face
    // component and remove only components disconnected *by this cap removal*.
    const allEdgeUses = new Map();
    function includeAllEdge( face, first, second )
    {
        const key = `${Math.min( first, second )},${Math.max( first, second )}`;
        if ( !allEdgeUses.has( key ) ) allEdgeUses.set( key, [] );
        allEdgeUses.get( key ).push( face );
    }
    for ( let face = 0; face < faceCount; face += 1 )
    {
        const offset = face * 3;
        includeAllEdge( face, mesh.indices[ offset ], mesh.indices[ offset + 1 ] );
        includeAllEdge( face, mesh.indices[ offset + 1 ], mesh.indices[ offset + 2 ] );
        includeAllEdge( face, mesh.indices[ offset + 2 ], mesh.indices[ offset ] );
    }
    const keptAdjacency = Array.from( { length: faceCount }, () => [] );
    for ( const uses of allEdgeUses.values() )
    {
        if ( uses.length !== 2 ) continue;
        const [ first, second ] = uses;
        if ( removeFaces.has( first ) || removeFaces.has( second ) ) continue;
        keptAdjacency[ first ].push( second );
        keptAdjacency[ second ].push( first );
    }
    const keptVisited = new Uint8Array( faceCount );
    const keptComponents = [];
    for ( let seed = 0; seed < faceCount; seed += 1 )
    {
        if ( removeFaces.has( seed ) || keptVisited[ seed ] ) continue;
        const faces = [];
        const queue = [ seed ];
        keptVisited[ seed ] = 1;
        let area = 0;
        while ( queue.length > 0 )
        {
            const face = queue.pop();
            faces.push( face );
            const offset = face * 3;
            const a = readPosition( mesh.positions, mesh.indices[ offset ] );
            const b = readPosition( mesh.positions, mesh.indices[ offset + 1 ] );
            const c = readPosition( mesh.positions, mesh.indices[ offset + 2 ] );
            area += length( cross( subtract( b, a ), subtract( c, a ) ) );
            for ( const neighbour of keptAdjacency[ face ] )
            {
                if ( keptVisited[ neighbour ] ) continue;
                keptVisited[ neighbour ] = 1;
                queue.push( neighbour );
            }
        }
        keptComponents.push( { faces, area } );
    }
    keptComponents.sort( ( a, b ) => b.area - a.area || b.faces.length - a.faces.length );
    let removedCapIslandFaces = 0;
    for ( const component of keptComponents.slice( 1 ) )
    {
        for ( const face of component.faces )
        {
            removeFaces.add( face );
            removedCapIslandFaces++;
        }
    }
    const indices = [];
    const faceOwners = [];
    const faceEdges = [];
    let removedFaces = 0;
    for ( let face = 0; face < mesh.indices.length / 3; face += 1 )
    {
        if ( removeFaces.has( face ) )
        {
            removedFaces++;
            continue;
        }
        indices.push(
            mesh.indices[ face * 3 ],
            mesh.indices[ face * 3 + 1 ],
            mesh.indices[ face * 3 + 2 ]
        );
        faceOwners.push( mesh.faceOwners[ face ] );
        faceEdges.push( mesh.faceEdges[ face ] );
    }
    return {
        positions: Array.from( mesh.positions ),
        indices,
        vertexOwners: Array.from( mesh.vertexOwners ),
        vertexEdges: Array.from( mesh.vertexEdges ),
        faceOwners,
        faceEdges,
        ownerIds: mesh.ownerIds,
        edgeIds: mesh.edgeIds,
        removedFaces,
        retainedCapFragments,
        retainedCapFragmentFaces,
        removedCapIslands: Math.max( 0, keptComponents.length - 1 ),
        removedCapIslandFaces
    };
}

function relabelStarPatchProvenance( patch, ownershipRays )
{
    if ( !Array.isArray( ownershipRays ) || ownershipRays.length === 0 ) return patch;
    const rayByBoundaryOwner = new Map(
        ownershipRays.map( ( ray ) => [ String( ray.boundaryOwner.id ), ray ] )
    );
    const ownerLookup = new Map( patch.ownerIds.map( ( value, index ) => [ String( value ), index ] ) );
    const edgeLookup = new Map( patch.edgeIds.map( ( value, index ) => [ String( value ), index ] ) );
    function ownerIndex( owner )
    {
        const key = String( owner.id );
        if ( !ownerLookup.has( key ) )
        {
            ownerLookup.set( key, patch.ownerIds.length );
            patch.ownerIds.push( owner.id );
        }
        return ownerLookup.get( key );
    }
    function edgeIndex( owner )
    {
        const key = String( owner.edgeIndex );
        if ( !edgeLookup.has( key ) )
        {
            edgeLookup.set( key, patch.edgeIds.length );
            patch.edgeIds.push( owner.edgeIndex );
        }
        return edgeLookup.get( key );
    }
    for ( let face = 0; face < patch.indices.length / 3; face += 1 )
    {
        const boundaryOwner = patch.ownerIds[ patch.faceOwners[ face ] ];
        const ray = rayByBoundaryOwner.get( String( boundaryOwner ) );
        if ( !ray || ray.internalOwners.length === 0 ) continue;
        const offset = face * 3;
        const a = readPosition( patch.positions, patch.indices[ offset ] );
        const b = readPosition( patch.positions, patch.indices[ offset + 1 ] );
        const c = readPosition( patch.positions, patch.indices[ offset + 2 ] );
        const centre = scale( add( add( a, b ), c ), 1 / 3 );
        const direction = subtract( ray.portCenter, ray.anchor );
        const denominator = lengthSquared( direction );
        const fraction = denominator > EPSILON
            ? clamp( dot( subtract( centre, ray.anchor ), direction ) / denominator, 0, 1 )
            : 1;
        const sequence = [ ...ray.internalOwners, ray.boundaryOwner ];
        const slot = Math.min( sequence.length - 1, Math.floor( fraction * sequence.length ) );
        const owner = sequence[ slot ];
        patch.faceOwners[ face ] = ownerIndex( owner );
        patch.faceEdges[ face ] = edgeIndex( owner );
    }
    return patch;
}

function boundaryLoops( mesh )
{
    const records = new Map();
    function include( first, second )
    {
        const low = Math.min( first, second );
        const high = Math.max( first, second );
        const key = `${low},${high}`;
        if ( !records.has( key ) ) records.set( key, [] );
        records.get( key ).push( [ first, second ] );
    }
    for ( let index = 0; index < mesh.indices.length; index += 3 )
    {
        include( mesh.indices[ index ], mesh.indices[ index + 1 ] );
        include( mesh.indices[ index + 1 ], mesh.indices[ index + 2 ] );
        include( mesh.indices[ index + 2 ], mesh.indices[ index ] );
    }
    const directed = [ ...records.values() ].filter( ( uses ) => uses.length === 1 ).map( ( uses ) => uses[ 0 ] );
    const outgoing = new Map();
    for ( const [ first, second ] of directed )
    {
        if ( !outgoing.has( first ) ) outgoing.set( first, [] );
        outgoing.get( first ).push( second );
    }
    const unused = new Set( directed.map( ( pair ) => `${pair[ 0 ]},${pair[ 1 ]}` ) );
    const loops = [];
    while ( unused.size > 0 )
    {
        const firstKey = unused.values().next().value;
        const [ start, nextValue ] = firstKey.split( ',' ).map( Number );
        const loop = [ start ];
        let current = start;
        let next = nextValue;
        let guard = directed.length + 1;
        while ( guard-- > 0 )
        {
            unused.delete( `${current},${next}` );
            current = next;
            if ( current === start ) break;
            loop.push( current );
            const candidates = ( outgoing.get( current ) ?? [] ).filter(
                ( candidate ) => unused.has( `${current},${candidate}` )
            );
            if ( candidates.length === 0 ) break;
            next = candidates[ 0 ];
        }
        if ( current === start && loop.length >= 3 ) loops.push( loop );
    }
    return loops;
}

function loopCentre( mesh, loop )
{
    const centre = { x: 0, y: 0, z: 0 };
    for ( const index of loop )
    {
        const value = readPosition( mesh.positions, index );
        centre.x += value.x;
        centre.y += value.y;
        centre.z += value.z;
    }
    return scale( centre, 1 / loop.length );
}

function assignLoopsToPorts( mesh, ports, tolerance, options = {} )
{
    const loops = boundaryLoops( mesh );
    if ( loops.length !== ports.length )
    {
        throw new Error(
            `junction clipping produced ${loops.length} boundary loop(s) for ${ports.length} port(s)`
        );
    }
    const boundaryFace = new Map();
    for ( let face = 0; face < mesh.indices.length / 3; face += 1 )
    {
        for ( let edge = 0; edge < 3; edge += 1 )
        {
            const first = mesh.indices[ face * 3 + edge ];
            const second = mesh.indices[ face * 3 + ( edge + 1 ) % 3 ];
            const key = `${Math.min( first, second )},${Math.max( first, second )}`;
            if ( !boundaryFace.has( key ) ) boundaryFace.set( key, [] );
            boundaryFace.get( key ).push( face );
        }
    }
    const loopData = loops.map( ( loop, loopIndex ) => {
        const centre = loopCentre( mesh, loop );
        let perimeter = 0;
        const faceOwners = new Map();
        const faceEdges = new Map();
        const vertexOwners = new Map();
        const vertexEdges = new Map();
        const include = ( map, value ) => map.set( value, ( map.get( value ) ?? 0 ) + 1 );
        for ( let index = 0; index < loop.length; index += 1 )
        {
            const first = loop[ index ];
            const second = loop[ ( index + 1 ) % loop.length ];
            perimeter += length( subtract(
                readPosition( mesh.positions, second ), readPosition( mesh.positions, first )
            ) );
            include( vertexOwners, mesh.ownerIds[ mesh.vertexOwners[ first ] ] );
            include( vertexEdges, mesh.edgeIds[ mesh.vertexEdges[ first ] ] );
            const key = `${Math.min( first, second )},${Math.max( first, second )}`;
            const faces = boundaryFace.get( key ) ?? [];
            if ( faces.length === 1 )
            {
                include( faceOwners, mesh.ownerIds[ mesh.faceOwners[ faces[ 0 ] ] ] );
                include( faceEdges, mesh.edgeIds[ mesh.faceEdges[ faces[ 0 ] ] ] );
            }
        }
        let regularized = loop.map( ( vertex ) => readPosition( mesh.positions, vertex ) );
        for ( let pass = 0; pass < 6; pass += 1 )
        {
            regularized = regularized.map( ( value, index ) => add(
                scale( value, 0.5 ),
                scale( add(
                    regularized[ ( index + regularized.length - 1 ) % regularized.length ],
                    regularized[ ( index + 1 ) % regularized.length ]
                ), 0.25 )
            ) );
        }
        const regularizedPerimeter = regularized.reduce( ( sum, value, index ) =>
            sum + length( subtract( regularized[ ( index + 1 ) % regularized.length ], value ) ), 0 );
        return {
            loop, loopIndex, centre, perimeter, regularizedPerimeter,
            faceOwners, faceEdges, vertexOwners, vertexEdges
        };
    } );
    const diagnostics = ports.map( ( port, portIndex ) => loopData.map( ( data ) => {
        const plane = { center: port.center, normal: port.outward };
        const centreError = length( subtract( data.centre, port.center ) );
        const planeError = Math.abs( signedDistanceToPlane( data.centre, plane ) );
        let projectedDoubleArea = 0;
        let maximumPlaneError = 0;
        for ( let index = 0; index < data.loop.length; index += 1 )
        {
            const first = readPosition( mesh.positions, data.loop[ index ] );
            const second = readPosition( mesh.positions, data.loop[ ( index + 1 ) % data.loop.length ] );
            projectedDoubleArea += dot(
                cross( subtract( first, port.center ), subtract( second, port.center ) ),
                port.outward
            );
            maximumPlaneError = Math.max(
                maximumPlaneError,
                Math.abs( signedDistanceToPlane( first, plane ) )
            );
        }
        const projectedArea = Math.abs( projectedDoubleArea ) * 0.5;
        const projectedRadius = Math.sqrt( projectedArea / Math.PI );
        const faceOwnerFraction = ( data.faceOwners.get( port.edgeId ) ?? 0 ) / data.loop.length;
        const faceEdgeFraction = ( data.faceEdges.get( port.edgeIndex ) ?? 0 ) / data.loop.length;
        const vertexOwnerFraction = ( data.vertexOwners.get( port.edgeId ) ?? 0 ) / data.loop.length;
        const vertexEdgeFraction = ( data.vertexEdges.get( port.edgeIndex ) ?? 0 ) / data.loop.length;
        const scaleRatio = projectedRadius / Math.max( port.radius, EPSILON );
        const rawPerimeterScaleRatio = data.perimeter / TAU / Math.max( port.radius, EPSILON );
        const perimeterScaleRatio = data.regularizedPerimeter / TAU / Math.max( port.radius, EPSILON );
        const circularity = projectedArea > EPSILON
            ? clamp( 4 * Math.PI * projectedArea
                / ( data.regularizedPerimeter * data.regularizedPerimeter ), 0, 1 )
            : 0;
        const provenanceFraction = Math.max(
            faceOwnerFraction, faceEdgeFraction, vertexOwnerFraction, vertexEdgeFraction
        );
        const score = centreError / Math.max( port.radius, tolerance )
            + planeError / Math.max( port.radius, tolerance ) * 8
            + Math.abs( Math.log( Math.max( scaleRatio, 1e-6 ) ) ) * 2.5
            + ( 1 - provenanceFraction ) * 7
            + ( provenanceFraction === 0 ? 12 : 0 );
        return {
            portIndex,
            portId: port.id,
            loopIndex: data.loopIndex,
            vertices: data.loop.length,
            centre: data.centre,
            centreError,
            planeError,
            maximumPlaneError,
            perimeter: data.perimeter,
            perimeterRadius: data.perimeter / TAU,
            regularizedPerimeter: data.regularizedPerimeter,
            regularizedPerimeterRadius: data.regularizedPerimeter / TAU,
            projectedArea,
            projectedRadius,
            scaleRatio,
            rawPerimeterScaleRatio,
            perimeterScaleRatio,
            circularity,
            faceOwnerFraction,
            faceEdgeFraction,
            vertexOwnerFraction,
            vertexEdgeFraction,
            dominantFaceOwners: [ ...data.faceOwners.entries() ]
                .sort( ( left, right ) => right[ 1 ] - left[ 1 ] ).slice( 0, 4 ),
            dominantFaceEdges: [ ...data.faceEdges.entries() ]
                .sort( ( left, right ) => right[ 1 ] - left[ 1 ] ).slice( 0, 4 ),
            score
        };
    } ) );

    // Rectangular Hungarian assignment. Post-cap validation guarantees this is
    // square, but retaining the general form keeps diagnostics deterministic.
    const rowCount = ports.length;
    const columnCount = loops.length;
    const u = new Float64Array( rowCount + 1 );
    const v = new Float64Array( columnCount + 1 );
    const matchedRow = new Int32Array( columnCount + 1 );
    const way = new Int32Array( columnCount + 1 );
    for ( let row = 1; row <= rowCount; row += 1 )
    {
        matchedRow[ 0 ] = row;
        let column = 0;
        const minimum = new Float64Array( columnCount + 1 );
        minimum.fill( Number.POSITIVE_INFINITY );
        const used = new Uint8Array( columnCount + 1 );
        do
        {
            used[ column ] = 1;
            const currentRow = matchedRow[ column ];
            let delta = Number.POSITIVE_INFINITY;
            let nextColumn = 0;
            for ( let candidate = 1; candidate <= columnCount; candidate += 1 )
            {
                if ( used[ candidate ] ) continue;
                const cost = diagnostics[ currentRow - 1 ][ candidate - 1 ].score
                    - u[ currentRow ] - v[ candidate ];
                if ( cost < minimum[ candidate ] )
                {
                    minimum[ candidate ] = cost;
                    way[ candidate ] = column;
                }
                if ( minimum[ candidate ] < delta )
                {
                    delta = minimum[ candidate ];
                    nextColumn = candidate;
                }
            }
            for ( let candidate = 0; candidate <= columnCount; candidate += 1 )
            {
                if ( used[ candidate ] )
                {
                    u[ matchedRow[ candidate ] ] += delta;
                    v[ candidate ] -= delta;
                }
                else minimum[ candidate ] -= delta;
            }
            column = nextColumn;
        }
        while ( matchedRow[ column ] !== 0 );
        do
        {
            const previous = way[ column ];
            matchedRow[ column ] = matchedRow[ previous ];
            column = previous;
        }
        while ( column !== 0 );
    }
    const loopForPort = new Int32Array( rowCount );
    loopForPort.fill( -1 );
    for ( let column = 1; column <= columnCount; column += 1 )
    {
        loopForPort[ matchedRow[ column ] - 1 ] = column - 1;
    }
    const assignments = new Map();
    const selectedDiagnostics = [];
    for ( let portIndex = 0; portIndex < ports.length; portIndex += 1 )
    {
        const loopIndex = loopForPort[ portIndex ];
        const selected = diagnostics[ portIndex ][ loopIndex ];
        const provenanceFraction = Math.max(
            selected.faceOwnerFraction,
            selected.faceEdgeFraction,
            selected.vertexOwnerFraction,
            selected.vertexEdgeFraction
        );
        const plausible = selected.centreError <= Math.max( ports[ portIndex ].radius * 6, tolerance * 20 )
            && selected.maximumPlaneError <= Math.max( ports[ portIndex ].radius * 2, tolerance * 20 )
            && selected.scaleRatio >= ( options.minimumPortProjectedRadiusRatio ?? 0.5 )
            && selected.scaleRatio <= ( options.maximumPortProjectedRadiusRatio ?? 1.5 )
            && provenanceFraction >= ( options.minimumPortProvenanceFraction ?? 0.5 );
        if ( !plausible )
        {
            const error = new Error(
                `no provenance-constrained patch boundary matches port ${ports[ portIndex ].id} `
                + `(selected=${JSON.stringify( selected )}; siblings=${JSON.stringify( diagnostics[ portIndex ] )})`
            );
            error.code = 'HYBRID_PORT_NOT_ISOLATED';
            error.edgeId = ports[ portIndex ].edgeId;
            error.edgeIndex = ports[ portIndex ].edgeIndex;
            error.portId = ports[ portIndex ].id;
            error.portRadius = ports[ portIndex ].radius;
            const competingEdgeIndices = selected.dominantFaceEdges
                .map( ( value ) => value[ 0 ] )
                .filter( ( value ) => value !== ports[ portIndex ].edgeIndex );
            error.advancePorts = [ ports[ portIndex ], ...ports.filter( ( candidate ) =>
                candidate.clusterIndex === ports[ portIndex ].clusterIndex
                && competingEdgeIndices.includes( candidate.edgeIndex )
            ) ].map( ( candidate ) => ( {
                edgeId: candidate.edgeId,
                edgeIndex: candidate.edgeIndex,
                side: candidate.side,
                radius: candidate.radius,
                portId: candidate.id
            } ) );
            throw error;
        }
        assignments.set( ports[ portIndex ].id, loops[ loopIndex ] );
        selectedDiagnostics.push( {
            ...selected,
            siblingScores: diagnostics[ portIndex ].map( ( value ) => ( {
                loopIndex: value.loopIndex,
                score: value.score,
                centreError: value.centreError,
                planeError: value.planeError,
                projectedRadius: value.projectedRadius,
                perimeterRadius: value.perimeterRadius,
                regularizedPerimeterRadius: value.regularizedPerimeterRadius,
                rawPerimeterScaleRatio: value.rawPerimeterScaleRatio,
                perimeterScaleRatio: value.perimeterScaleRatio,
                circularity: value.circularity,
                faceOwnerFraction: value.faceOwnerFraction,
                faceEdgeFraction: value.faceEdgeFraction
            } ) )
        } );
    }
    assignments.diagnostics = selectedDiagnostics;
    return assignments;
}

function canonicalizePortLoops( mesh, ports, assignments, cellSize )
{
    const results = [];
    for ( const port of ports )
    {
        const loop = assignments.get( port.id );
        const originals = loop.map( ( vertex ) => readPosition( mesh.positions, vertex ) );
        const affectedFaces = [];
        const originalNormals = new Map();
        const loopVertices = new Set( loop );
        for ( let face = 0; face < mesh.indices.length / 3; face += 1 )
        {
            const vertices = [
                mesh.indices[ face * 3 ], mesh.indices[ face * 3 + 1 ], mesh.indices[ face * 3 + 2 ]
            ];
            if ( !vertices.some( ( vertex ) => loopVertices.has( vertex ) ) ) continue;
            affectedFaces.push( face );
            const a = readPosition( mesh.positions, vertices[ 0 ] );
            const b = readPosition( mesh.positions, vertices[ 1 ] );
            const c = readPosition( mesh.positions, vertices[ 2 ] );
            originalNormals.set( face, normalize( cross( subtract( b, a ), subtract( c, a ) ) ) );
        }
        const basis = choosePerpendicular( port.outward );
        const binormal = normalize( cross( port.outward, basis ) );
        let signedArea = 0;
        let phaseX = 0;
        let phaseY = 0;
        for ( let index = 0; index < originals.length; index += 1 )
        {
            const current = subtract( originals[ index ], port.center );
            const next = subtract( originals[ ( index + 1 ) % originals.length ], port.center );
            signedArea += dot( cross( current, next ), port.outward );
        }
        const direction = signedArea >= 0 ? 1 : -1;
        for ( let index = 0; index < originals.length; index += 1 )
        {
            const radial = subtract(
                subtract( originals[ index ], port.center ),
                scale( port.outward, dot( subtract( originals[ index ], port.center ), port.outward ) )
            );
            if ( lengthSquared( radial ) <= EPSILON ) continue;
            const sourceAngle = Math.atan2( dot( radial, binormal ), dot( radial, basis ) );
            const offset = sourceAngle - direction * TAU * index / originals.length;
            phaseX += Math.cos( offset );
            phaseY += Math.sin( offset );
        }
        const phase = Math.atan2( phaseY, phaseX );
        let maximumDisplacement = 0;
        let squaredDisplacement = 0;
        for ( let index = 0; index < loop.length; index += 1 )
        {
            const angle = phase + direction * TAU * index / loop.length;
            const position = add( port.center, scale( add(
                scale( basis, Math.cos( angle ) ), scale( binormal, Math.sin( angle ) )
            ), port.radius ) );
            const displacement = length( subtract( position, originals[ index ] ) );
            maximumDisplacement = Math.max( maximumDisplacement, displacement );
            squaredDisplacement += displacement * displacement;
            const offset = loop[ index ] * 3;
            mesh.positions[ offset ] = position.x;
            mesh.positions[ offset + 1 ] = position.y;
            mesh.positions[ offset + 2 ] = position.z;
        }
        let invalidReason = null;
        for ( const face of affectedFaces )
        {
            const vertices = [
                mesh.indices[ face * 3 ], mesh.indices[ face * 3 + 1 ], mesh.indices[ face * 3 + 2 ]
            ];
            const a = readPosition( mesh.positions, vertices[ 0 ] );
            const b = readPosition( mesh.positions, vertices[ 1 ] );
            const c = readPosition( mesh.positions, vertices[ 2 ] );
            const value = cross( subtract( b, a ), subtract( c, a ) );
            const doubleArea = length( value );
            if ( doubleArea <= Math.max( cellSize * cellSize * 1e-10, 1e-14 ) )
            {
                invalidReason = `degenerate adjacent face ${face}`;
                break;
            }
            if ( dot( scale( value, 1 / doubleArea ), originalNormals.get( face ) ) <= 0 )
            {
                invalidReason = `inverted adjacent face ${face}`;
                break;
            }
        }
        if ( !invalidReason )
        {
            const probe = {
                positions: mesh.positions,
                indices: mesh.indices,
                patchSpatialIndex: null
            };
            probe.patchSpatialIndex = buildPatchSpatialIndex( probe, Math.max( cellSize * 2.5, 1e-4 ) );
            for ( const face of affectedFaces )
            {
                const candidate = [
                    mesh.indices[ face * 3 ], mesh.indices[ face * 3 + 1 ], mesh.indices[ face * 3 + 2 ]
                ];
                if ( triangleIntersectsIndexedPatches( probe, candidate ) )
                {
                    invalidReason = `adjacent face ${face} intersects the canonicalized patch`;
                    break;
                }
            }
        }
        if ( invalidReason )
        {
            for ( let index = 0; index < loop.length; index += 1 )
            {
                const offset = loop[ index ] * 3;
                mesh.positions[ offset ] = originals[ index ].x;
                mesh.positions[ offset + 1 ] = originals[ index ].y;
                mesh.positions[ offset + 2 ] = originals[ index ].z;
            }
            const error = new Error(
                `port ${port.id} cannot be canonicalized to its authored support circle: ${invalidReason}`
            );
            error.code = 'HYBRID_PORT_NOT_ISOLATED';
            error.edgeId = port.edgeId;
            error.edgeIndex = port.edgeIndex;
            error.portId = port.id;
            error.portRadius = port.radius;
            error.advancePorts = [ {
                edgeId: port.edgeId,
                edgeIndex: port.edgeIndex,
                side: port.side,
                radius: port.radius,
                portId: port.id
            } ];
            throw error;
        }
        results.push( {
            portId: port.id,
            vertices: loop.length,
            radius: port.radius,
            maximumDisplacement,
            rmsDisplacement: Math.sqrt( squaredDisplacement / loop.length ),
            adjacentFaces: affectedFaces.length
        } );
    }
    return results;
}

function choosePerpendicular( tangent )
{
    const axis = Math.abs( tangent.x ) <= Math.abs( tangent.y ) && Math.abs( tangent.x ) <= Math.abs( tangent.z )
        ? { x: 1, y: 0, z: 0 }
        : ( Math.abs( tangent.y ) <= Math.abs( tangent.z )
            ? { x: 0, y: 1, z: 0 }
            : { x: 0, y: 0, z: 1 } );
    return normalize( cross( tangent, axis ), { x: 1, y: 0, z: 0 } );
}

function rotateAroundAxis( value, axis, angle )
{
    const cosine = Math.cos( angle );
    const sine = Math.sin( angle );
    return add(
        add( scale( value, cosine ), scale( cross( axis, value ), sine ) ),
        scale( axis, dot( axis, value ) * ( 1 - cosine ) )
    );
}

function transportNormal( normal, fromTangent, toTangent )
{
    const axisValue = cross( fromTangent, toTangent );
    const sine = length( axisValue );
    const cosine = clamp( dot( fromTangent, toTangent ), -1, 1 );
    if ( sine < 1e-8 )
    {
        if ( cosine >= 0 ) return normalize( subtract( normal, scale( toTangent, dot( normal, toTangent ) ) ) );
        return choosePerpendicular( toTangent );
    }
    const axis = scale( axisValue, 1 / sine );
    const rotated = rotateAroundAxis( normal, axis, Math.atan2( sine, cosine ) );
    return normalize( subtract( rotated, scale( toTangent, dot( rotated, toTangent ) ) ) );
}

function tubeFrames( values )
{
    const tangents = values.map( ( _value, index ) => {
        if ( index === 0 ) return normalize( subtract( values[ 1 ], values[ 0 ] ) );
        if ( index === values.length - 1 ) return normalize( subtract( values.at( -1 ), values.at( -2 ) ) );
        return normalize( subtract( values[ index + 1 ], values[ index - 1 ] ) );
    } );
    const normals = [ choosePerpendicular( tangents[ 0 ] ) ];
    for ( let index = 1; index < values.length; index += 1 )
    {
        normals.push( transportNormal( normals.at( -1 ), tangents[ index - 1 ], tangents[ index ] ) );
    }
    return { tangents, normals };
}

function appendVertex( output, value, owner, edge )
{
    const index = output.positions.length / 3;
    output.positions.push( value.x, value.y, value.z );
    output.vertexOwners.push( owner );
    output.vertexEdges.push( edge );
    return index;
}

function appendFace( output, a, b, c, owner, edge )
{
    if ( a === b || b === c || c === a )
    {
        throw new Error( 'surface construction attempted to append a repeated-index face' );
    }
    const pa = readPosition( output.positions, a );
    const pb = readPosition( output.positions, b );
    const pc = readPosition( output.positions, c );
    const bufferedA = float32Point( pa );
    const bufferedB = float32Point( pb );
    const bufferedC = float32Point( pc );
    const bufferedDoubleArea = length( cross(
        subtract( bufferedB, bufferedA ),
        subtract( bufferedC, bufferedA )
    ) );
    const maximumEdgeSquared = Math.max(
        lengthSquared( subtract( pb, pa ) ),
        lengthSquared( subtract( pc, pb ) ),
        lengthSquared( subtract( pa, pc ) )
    );
    if ( !Number.isFinite( bufferedDoubleArea )
        || bufferedDoubleArea <= Math.max(
            output.minimumDoubleArea ?? 0,
            Number.EPSILON * maximumEdgeSquared
        ) )
    {
        throw new Error( 'surface construction attempted to append a geometrically degenerate face' );
    }
    output.indices.push( a, b, c );
    output.faceOwners.push( owner );
    output.faceEdges.push( edge );
}

function appendPatch( output, patch, globalOwnerIndex, globalEdgeIndex )
{
    const vertexOffset = output.positions.length / 3;
    for ( const value of patch.positions ) output.positions.push( value );
    for ( let index = 0; index < patch.vertexOwners.length; index += 1 )
    {
        output.vertexOwners.push( globalOwnerIndex( patch.ownerIds[ patch.vertexOwners[ index ] ] ) );
        output.vertexEdges.push( globalEdgeIndex( patch.edgeIds[ patch.vertexEdges[ index ] ] ) );
    }
    for ( const index of patch.indices ) output.indices.push( index + vertexOffset );
    for ( let index = 0; index < patch.faceOwners.length; index += 1 )
    {
        output.faceOwners.push( globalOwnerIndex( patch.ownerIds[ patch.faceOwners[ index ] ] ) );
        output.faceEdges.push( globalEdgeIndex( patch.edgeIds[ patch.faceEdges[ index ] ] ) );
    }
    return vertexOffset;
}

function bufferedAreaAudit( positions, indices, minimumDoubleArea, maximumSamples = 8 )
{
    let negligibleFaces = 0;
    let smallestDoubleArea = Number.POSITIVE_INFINITY;
    const samples = [];
    for ( let face = 0; face < indices.length / 3; face += 1 )
    {
        const a = float32Point( readPosition( positions, indices[ face * 3 ] ) );
        const b = float32Point( readPosition( positions, indices[ face * 3 + 1 ] ) );
        const c = float32Point( readPosition( positions, indices[ face * 3 + 2 ] ) );
        const doubleArea = length( cross( subtract( b, a ), subtract( c, a ) ) );
        smallestDoubleArea = Math.min( smallestDoubleArea, doubleArea );
        if ( doubleArea > minimumDoubleArea ) continue;
        negligibleFaces++;
        if ( samples.length < maximumSamples )
        {
            samples.push( {
                face,
                indices: [ indices[ face * 3 ], indices[ face * 3 + 1 ], indices[ face * 3 + 2 ] ],
                doubleArea
            } );
        }
    }
    return {
        negligibleFaces,
        smallestDoubleArea: Number.isFinite( smallestDoubleArea ) ? smallestDoubleArea : null,
        minimumDoubleArea,
        samples
    };
}

function normalCompatibilityAudit( positions, indices, maximumSamples = 8, suppliedNormals = null )
{
    const normals = suppliedNormals ?? createNormals( positions, indices );
    let opposedFaces = 0;
    let minimumAverageDot = 1;
    const samples = [];
    for ( let face = 0; face < indices.length / 3; face += 1 )
    {
        const vertices = [ indices[ face * 3 ], indices[ face * 3 + 1 ], indices[ face * 3 + 2 ] ];
        const a = readPosition( positions, vertices[ 0 ] );
        const b = readPosition( positions, vertices[ 1 ] );
        const c = readPosition( positions, vertices[ 2 ] );
        const faceNormal = unitTriangleNormal( a, b, c );
        let averageDot = 0;
        for ( const vertex of vertices )
        {
            averageDot += faceNormal.x * normals[ vertex * 3 ]
                + faceNormal.y * normals[ vertex * 3 + 1 ]
                + faceNormal.z * normals[ vertex * 3 + 2 ];
        }
        averageDot /= 3;
        minimumAverageDot = Math.min( minimumAverageDot, averageDot );
        if ( averageDot >= -0.05 ) continue;
        opposedFaces++;
        if ( samples.length < maximumSamples ) samples.push( { face, vertices, averageDot } );
    }
    return { opposedFaces, minimumAverageDot, samples };
}

function closedGenusZeroPatch( patch )
{
    const topology = patch.stats.topology;
    return topology.connectedComponents === 1
        && topology.boundaryEdges === 0
        && topology.nonManifoldEdges === 0
        && topology.genus === 0;
}

function patchCacheKey( cluster, patchSource, patchCellSize, minimumDoubleArea, options, origins )
{
    const identity = ( value ) => `${typeof value}:${String( value )}`;
    const vector = ( value ) => value
        ? [ value.x, value.y, value.z ]
        : null;
    return JSON.stringify( {
        version: 2,
        nodes: cluster.nodeIds.map( identity ).sort(),
        source: patchSource.map( ( segment ) => ( {
            a: vector( segment.a ),
            b: vector( segment.b ),
            radiusA: segment.radiusA,
            radiusB: segment.radiusB,
            ownerId: identity( segment.ownerId ),
            edgeIndex: identity( segment.edgeIndex ),
            clipCentre: vector( segment.clipPlane?.center ),
            clipNormal: vector( segment.clipPlane?.normal )
        } ) ),
        patchCellSize,
        minimumDoubleArea,
        paddingCells: options.patchPaddingCells ?? 0.35,
        maxCells: options.maxPatchCells ?? 250_000,
        minimumPatchRadiusCells: Math.max( 4, options.minimumPatchRadiusCells ?? 4 ),
        patchCapacityCellGrowth: options.patchCapacityCellGrowth ?? 1.15,
        maximumPatchCapacityRetries: options.maximumPatchCapacityRetries ?? 12,
        maximumFallbackHubInflation: options.maximumFallbackHubInflation ?? 4.5,
        origins
    } );
}

function cycleArcLengths( output, loop )
{
    const cumulative = new Float64Array( loop.length + 1 );
    for ( let index = 0; index < loop.length; index += 1 )
    {
        const current = readPosition( output.positions, loop[ index ] );
        const next = readPosition( output.positions, loop[ ( index + 1 ) % loop.length ] );
        cumulative[ index + 1 ] = cumulative[ index ] + length( subtract( next, current ) );
    }
    if ( cumulative.at( -1 ) <= EPSILON ) throw new Error( 'bridge boundary has zero perimeter' );
    for ( let index = 1; index < cumulative.length; index += 1 )
    {
        cumulative[ index ] /= cumulative.at( -1 );
    }
    return cumulative;
}

function sampleCycle( output, loop, cumulative, fraction )
{
    fraction -= Math.floor( fraction );
    let low = 0;
    let high = loop.length;
    while ( low + 1 < high )
    {
        const middle = Math.floor( ( low + high ) / 2 );
        if ( cumulative[ middle ] <= fraction ) low = middle;
        else high = middle;
    }
    const denominator = cumulative[ low + 1 ] - cumulative[ low ];
    const local = denominator > EPSILON ? ( fraction - cumulative[ low ] ) / denominator : 0;
    const first = readPosition( output.positions, loop[ low ] );
    const second = readPosition( output.positions, loop[ ( low + 1 ) % loop.length ] );
    return add( first, scale( subtract( second, first ), local ) );
}

function bridgeTriangleMetric( output, a, b, c, bridgeScaleSquared, seamNormal = null )
{
    const pa = readPosition( output.positions, a );
    const pb = readPosition( output.positions, b );
    const pc = readPosition( output.positions, c );
    const ab = lengthSquared( subtract( pb, pa ) );
    const bc = lengthSquared( subtract( pc, pb ) );
    const ca = lengthSquared( subtract( pa, pc ) );
    const faceCross = cross( subtract( pb, pa ), subtract( pc, pa ) );
    const geometricDoubleArea = length( faceCross );
    const bufferedA = float32Point( pa );
    const bufferedB = float32Point( pb );
    const bufferedC = float32Point( pc );
    const doubleArea = length( cross(
        subtract( bufferedB, bufferedA ),
        subtract( bufferedC, bufferedA )
    ) );
    const maximumEdgeSquared = Math.max( ab, bc, ca );
    if ( !Number.isFinite( doubleArea )
        || !Number.isFinite( geometricDoubleArea )
        || doubleArea <= Math.max(
            output.minimumDoubleArea ?? 0,
            bridgeScaleSquared * 1e-15,
            Number.EPSILON * maximumEdgeSquared
        ) )
    {
        return null;
    }
    if ( triangleIntersectsIndexedPatches( output, [ a, b, c ] ) ) return null;
    const faceNormal = scale( faceCross, -1 / geometricDoubleArea );
    const seamAlignment = seamNormal ? dot( faceNormal, seamNormal ) : 1;
    const seamPenalty = seamNormal
        ? ( 1 - seamAlignment ) * 8 + Math.max( 0, -seamAlignment ) ** 2 * 180
        : 0;
    return {
        doubleArea,
        maximumEdgeSquared,
        seamAlignment,
        cost: maximumEdgeSquared / doubleArea
            + maximumEdgeSquared / Math.max( bridgeScaleSquared, EPSILON ) * 0.12
            + seamPenalty
    };
}

function planBridge( output, sourceLoop, targetLoop )
{
    const sourceFractions = cycleArcLengths( output, sourceLoop );
    const targetFractions = cycleArcLengths( output, targetLoop );
    const maximumSourceSector = Math.max( ...sourceLoop.map(
        ( _vertex, index ) => sourceFractions[ index + 1 ] - sourceFractions[ index ]
    ) );
    const maximumTargetSector = Math.max( ...targetLoop.map(
        ( _vertex, index ) => targetFractions[ index + 1 ] - targetFractions[ index ]
    ) );
    const maximumProgressMismatch = Math.max( maximumSourceSector, maximumTargetSector )
        * 1.05 + 1e-9;
    const sourcePerimeter = sourceLoop.reduce( ( sum, vertex, index ) => sum + length( subtract(
        readPosition( output.positions, sourceLoop[ ( index + 1 ) % sourceLoop.length ] ),
        readPosition( output.positions, vertex )
    ) ), 0 );
    const targetPerimeter = targetLoop.reduce( ( sum, vertex, index ) => sum + length( subtract(
        readPosition( output.positions, targetLoop[ ( index + 1 ) % targetLoop.length ] ),
        readPosition( output.positions, vertex )
    ) ), 0 );
    const bridgeScaleSquared = Math.max(
        ( sourcePerimeter + targetPerimeter ) ** 2 / ( 4 * Math.PI * Math.PI ),
        EPSILON
    );
    const columns = targetLoop.length + 1;
    const stateCount = ( sourceLoop.length + 1 ) * columns;
    const costs = new Float64Array( stateCount );
    costs.fill( Number.POSITIVE_INFINITY );
    const previous = new Int8Array( stateCount );
    previous.fill( -1 );
    costs[ 0 ] = 0;
    const stateIndex = ( sourceIndex, targetIndex ) => sourceIndex * columns + targetIndex;
    function relax( fromSource, fromTarget, toSource, toTarget, mode, face, seamNormal = null )
    {
        // A valid annulus zipper may lead by at most one local arc sector. A
        // soft quality score otherwise favours completing the sparse ring
        // early and fanning most of a dense ring across its diameter.
        const progressMismatch = sourceFractions[ toSource ] - targetFractions[ toTarget ];
        if ( Math.abs( progressMismatch ) > maximumProgressMismatch ) return;
        const metric = bridgeTriangleMetric( output, ...face, bridgeScaleSquared, seamNormal );
        if ( !metric ) return;
        const nextCost = costs[ stateIndex( fromSource, fromTarget ) ]
            + metric.cost
            + progressMismatch * progressMismatch * 3.5;
        const destination = stateIndex( toSource, toTarget );
        if ( nextCost >= costs[ destination ] ) return;
        costs[ destination ] = nextCost;
        previous[ destination ] = mode;
    }
    for ( let sourceIndex = 0; sourceIndex <= sourceLoop.length; sourceIndex += 1 )
    {
        for ( let targetIndex = 0; targetIndex <= targetLoop.length; targetIndex += 1 )
        {
            if ( !Number.isFinite( costs[ stateIndex( sourceIndex, targetIndex ) ] ) ) continue;
            const a = sourceLoop[ sourceIndex % sourceLoop.length ];
            const b = targetLoop[ targetIndex % targetLoop.length ];
            if ( sourceIndex < sourceLoop.length )
            {
                const aNext = sourceLoop[ ( sourceIndex + 1 ) % sourceLoop.length ];
                const seamNormal = output.seamNormals.get(
                    `${Math.min( a, aNext )},${Math.max( a, aNext )}`
                ) ?? null;
                relax( sourceIndex, targetIndex, sourceIndex + 1, targetIndex, 0,
                    [ a, aNext, b ], seamNormal );
            }
            if ( targetIndex < targetLoop.length )
            {
                const bNext = targetLoop[ ( targetIndex + 1 ) % targetLoop.length ];
                relax( sourceIndex, targetIndex, sourceIndex, targetIndex + 1, 1, [ a, bNext, b ] );
            }
        }
    }
    const finalCost = costs.at( -1 );
    if ( !Number.isFinite( finalCost ) ) return null;
    const faces = [];
    let sourceIndex = sourceLoop.length;
    let targetIndex = targetLoop.length;
    let minimumDoubleArea = Number.POSITIVE_INFINITY;
    let maximumAspect = 0;
    while ( sourceIndex > 0 || targetIndex > 0 )
    {
        const mode = previous[ stateIndex( sourceIndex, targetIndex ) ];
        let face;
        if ( mode === 0 )
        {
            const previousSource = sourceIndex - 1;
            face = [
                sourceLoop[ previousSource % sourceLoop.length ],
                sourceLoop[ sourceIndex % sourceLoop.length ],
                targetLoop[ targetIndex % targetLoop.length ]
            ];
            sourceIndex = previousSource;
        }
        else if ( mode === 1 )
        {
            const previousTarget = targetIndex - 1;
            face = [
                sourceLoop[ sourceIndex % sourceLoop.length ],
                targetLoop[ targetIndex % targetLoop.length ],
                targetLoop[ previousTarget % targetLoop.length ]
            ];
            targetIndex = previousTarget;
        }
        else
        {
            throw new Error( 'bridge dynamic programme has no predecessor' );
        }
        const metric = bridgeTriangleMetric( output, ...face, bridgeScaleSquared );
        minimumDoubleArea = Math.min( minimumDoubleArea, metric.doubleArea );
        maximumAspect = Math.max( maximumAspect, metric.maximumEdgeSquared / metric.doubleArea );
        faces.push( face );
    }
    faces.reverse();
    return { faces, cost: finalCost, minimumDoubleArea, maximumAspect };
}

function buildBoundarySeamNormals( output, portLoops )
{
    const requested = new Set();
    for ( const loop of portLoops.values() )
    {
        for ( let index = 0; index < loop.length; index += 1 )
        {
            const first = loop[ index ];
            const second = loop[ ( index + 1 ) % loop.length ];
            requested.add( `${Math.min( first, second )},${Math.max( first, second )}` );
        }
    }
    const normals = new Map();
    for ( let face = 0; face < output.indices.length / 3; face += 1 )
    {
        const vertices = [
            output.indices[ face * 3 ],
            output.indices[ face * 3 + 1 ],
            output.indices[ face * 3 + 2 ]
        ];
        const a = readPosition( output.positions, vertices[ 0 ] );
        const b = readPosition( output.positions, vertices[ 1 ] );
        const c = readPosition( output.positions, vertices[ 2 ] );
        const faceNormal = normalize( cross( subtract( b, a ), subtract( c, a ) ) );
        for ( let edge = 0; edge < 3; edge += 1 )
        {
            const first = vertices[ edge ];
            const second = vertices[ ( edge + 1 ) % 3 ];
            const key = `${Math.min( first, second )},${Math.max( first, second )}`;
            if ( requested.has( key ) ) normals.set( key, faceNormal );
        }
    }
    return normals;
}

function orientation2d( a, b, c )
{
    return ( b[ 0 ] - a[ 0 ] ) * ( c[ 1 ] - a[ 1 ] )
        - ( b[ 1 ] - a[ 1 ] ) * ( c[ 0 ] - a[ 0 ] );
}

function pointInTriangle2d( value, a, b, c, tolerance )
{
    const first = orientation2d( a, b, value );
    const second = orientation2d( b, c, value );
    const third = orientation2d( c, a, value );
    const negative = first < -tolerance || second < -tolerance || third < -tolerance;
    const positive = first > tolerance || second > tolerance || third > tolerance;
    return !( negative && positive );
}

function segmentsIntersect2d( a, b, c, d, tolerance )
{
    const abC = orientation2d( a, b, c );
    const abD = orientation2d( a, b, d );
    const cdA = orientation2d( c, d, a );
    const cdB = orientation2d( c, d, b );
    const opposite = ( first, second ) =>
        ( first > tolerance && second < -tolerance )
        || ( first < -tolerance && second > tolerance );
    if ( opposite( abC, abD ) && opposite( cdA, cdB ) ) return true;
    const onSegment = ( value, start, end, orientation ) => Math.abs( orientation ) <= tolerance
        && value[ 0 ] >= Math.min( start[ 0 ], end[ 0 ] ) - tolerance
        && value[ 0 ] <= Math.max( start[ 0 ], end[ 0 ] ) + tolerance
        && value[ 1 ] >= Math.min( start[ 1 ], end[ 1 ] ) - tolerance
        && value[ 1 ] <= Math.max( start[ 1 ], end[ 1 ] ) + tolerance;
    return onSegment( c, a, b, abC )
        || onSegment( d, a, b, abD )
        || onSegment( a, c, d, cdA )
        || onSegment( b, c, d, cdB );
}

function coplanarTrianglesIntersect( left, right, normal, tolerance )
{
    const axis = Math.abs( normal.x ) > Math.abs( normal.y )
        ? ( Math.abs( normal.x ) > Math.abs( normal.z ) ? 0 : 2 )
        : ( Math.abs( normal.y ) > Math.abs( normal.z ) ? 1 : 2 );
    const project = ( value ) => axis === 0
        ? [ value.y, value.z ]
        : axis === 1 ? [ value.x, value.z ] : [ value.x, value.y ];
    const first = left.map( project );
    const second = right.map( project );
    for ( let leftEdge = 0; leftEdge < 3; leftEdge += 1 )
    {
        for ( let rightEdge = 0; rightEdge < 3; rightEdge += 1 )
        {
            if ( segmentsIntersect2d(
                first[ leftEdge ], first[ ( leftEdge + 1 ) % 3 ],
                second[ rightEdge ], second[ ( rightEdge + 1 ) % 3 ], tolerance
            ) ) return true;
        }
    }
    return pointInTriangle2d( first[ 0 ], second[ 0 ], second[ 1 ], second[ 2 ], tolerance )
        || pointInTriangle2d( second[ 0 ], first[ 0 ], first[ 1 ], first[ 2 ], tolerance );
}

function segmentIntersectsTriangle( start, end, triangle, tolerance )
{
    const direction = subtract( end, start );
    const edgeOne = subtract( triangle[ 1 ], triangle[ 0 ] );
    const edgeTwo = subtract( triangle[ 2 ], triangle[ 0 ] );
    const h = cross( direction, edgeTwo );
    const determinant = dot( edgeOne, h );
    if ( Math.abs( determinant ) <= tolerance ) return false;
    const inverse = 1 / determinant;
    const s = subtract( start, triangle[ 0 ] );
    const u = inverse * dot( s, h );
    if ( u < -tolerance || u > 1 + tolerance ) return false;
    const q = cross( s, edgeOne );
    const v = inverse * dot( direction, q );
    if ( v < -tolerance || u + v > 1 + tolerance ) return false;
    const t = inverse * dot( edgeTwo, q );
    return t >= -tolerance && t <= 1 + tolerance;
}

function trianglesIntersect( left, right, tolerance )
{
    const leftNormal = cross( subtract( left[ 1 ], left[ 0 ] ), subtract( left[ 2 ], left[ 0 ] ) );
    const rightNormal = cross( subtract( right[ 1 ], right[ 0 ] ), subtract( right[ 2 ], right[ 0 ] ) );
    const normalCross = cross( leftNormal, rightNormal );
    const normalProduct = length( leftNormal ) * length( rightNormal );
    if ( length( normalCross ) <= 1e-10 * Math.max( Number.EPSILON, normalProduct ) )
    {
        const planeDistance = Math.abs( dot( leftNormal, subtract( right[ 0 ], left[ 0 ] ) ) );
        if ( planeDistance > tolerance * Math.max( 1, length( leftNormal ) ) ) return false;
        return coplanarTrianglesIntersect( left, right, leftNormal, tolerance );
    }
    for ( let edge = 0; edge < 3; edge += 1 )
    {
        if ( segmentIntersectsTriangle( left[ edge ], left[ ( edge + 1 ) % 3 ], right, tolerance )
            || segmentIntersectsTriangle( right[ edge ], right[ ( edge + 1 ) % 3 ], left, tolerance ) )
        {
            return true;
        }
    }
    return false;
}

function triangleBounds( triangle )
{
    return {
        minimum: {
            x: Math.min( ...triangle.map( ( value ) => value.x ) ),
            y: Math.min( ...triangle.map( ( value ) => value.y ) ),
            z: Math.min( ...triangle.map( ( value ) => value.z ) )
        },
        maximum: {
            x: Math.max( ...triangle.map( ( value ) => value.x ) ),
            y: Math.max( ...triangle.map( ( value ) => value.y ) ),
            z: Math.max( ...triangle.map( ( value ) => value.z ) )
        }
    };
}

function boundsOverlap( first, second, tolerance )
{
    return first.minimum.x <= second.maximum.x + tolerance
        && first.maximum.x + tolerance >= second.minimum.x
        && first.minimum.y <= second.maximum.y + tolerance
        && first.maximum.y + tolerance >= second.minimum.y
        && first.minimum.z <= second.maximum.z + tolerance
        && first.maximum.z + tolerance >= second.minimum.z;
}

function buildPatchSpatialIndex( output, cellSize )
{
    const size = Math.max( cellSize, 1e-4 );
    const buckets = new Map();
    const bounds = [];
    const key = ( x, y, z ) => `${x},${y},${z}`;
    for ( let face = 0; face < output.indices.length / 3; face += 1 )
    {
        const triangle = [
            readPosition( output.positions, output.indices[ face * 3 ] ),
            readPosition( output.positions, output.indices[ face * 3 + 1 ] ),
            readPosition( output.positions, output.indices[ face * 3 + 2 ] )
        ];
        const box = triangleBounds( triangle );
        bounds.push( box );
        const minimum = [
            Math.floor( box.minimum.x / size ),
            Math.floor( box.minimum.y / size ),
            Math.floor( box.minimum.z / size )
        ];
        const maximum = [
            Math.floor( box.maximum.x / size ),
            Math.floor( box.maximum.y / size ),
            Math.floor( box.maximum.z / size )
        ];
        for ( let x = minimum[ 0 ]; x <= maximum[ 0 ]; x += 1 )
        {
            for ( let y = minimum[ 1 ]; y <= maximum[ 1 ]; y += 1 )
            {
                for ( let z = minimum[ 2 ]; z <= maximum[ 2 ]; z += 1 )
                {
                    const bucketKey = key( x, y, z );
                    if ( !buckets.has( bucketKey ) ) buckets.set( bucketKey, [] );
                    buckets.get( bucketKey ).push( face );
                }
            }
        }
    }
    return { size, buckets, bounds, key };
}

function triangleIntersectsIndexedPatches( output, candidateIndices )
{
    const spatial = output.patchSpatialIndex;
    if ( !spatial ) return false;
    const triangle = candidateIndices.map( ( vertex ) => readPosition( output.positions, vertex ) );
    const box = triangleBounds( triangle );
    const minimum = [
        Math.floor( box.minimum.x / spatial.size ),
        Math.floor( box.minimum.y / spatial.size ),
        Math.floor( box.minimum.z / spatial.size )
    ];
    const maximum = [
        Math.floor( box.maximum.x / spatial.size ),
        Math.floor( box.maximum.y / spatial.size ),
        Math.floor( box.maximum.z / spatial.size )
    ];
    const candidates = new Set();
    for ( let x = minimum[ 0 ]; x <= maximum[ 0 ]; x += 1 )
    {
        for ( let y = minimum[ 1 ]; y <= maximum[ 1 ]; y += 1 )
        {
            for ( let z = minimum[ 2 ]; z <= maximum[ 2 ]; z += 1 )
            {
                for ( const face of spatial.buckets.get( spatial.key( x, y, z ) ) ?? [] )
                {
                    candidates.add( face );
                }
            }
        }
    }
    const candidateVertices = new Set( candidateIndices );
    const tolerance = Math.max( spatial.size * 1e-8, 1e-10 );
    for ( const face of candidates )
    {
        const faceIndices = [
            output.indices[ face * 3 ],
            output.indices[ face * 3 + 1 ],
            output.indices[ face * 3 + 2 ]
        ];
        if ( faceIndices.some( ( vertex ) => candidateVertices.has( vertex ) ) ) continue;
        if ( !boundsOverlap( box, spatial.bounds[ face ], tolerance ) ) continue;
        const existing = faceIndices.map( ( vertex ) => readPosition( output.positions, vertex ) );
        if ( trianglesIntersect( triangle, existing, tolerance ) ) return true;
    }
    return false;
}

function findBridgeInternalIntersection( output, faces )
{
    const tolerance = Math.max( ( output.patchSpatialIndex?.size ?? 0 ) * 1e-8, 1e-10 );
    const triangles = faces.map( ( face ) => face.map( ( vertex ) => readPosition( output.positions, vertex ) ) );
    const bounds = triangles.map( triangleBounds );
    for ( let first = 0; first < faces.length; first += 1 )
    {
        const firstVertices = new Set( faces[ first ] );
        for ( let second = first + 1; second < faces.length; second += 1 )
        {
            if ( faces[ second ].some( ( vertex ) => firstVertices.has( vertex ) ) ) continue;
            if ( !boundsOverlap( bounds[ first ], bounds[ second ], tolerance ) ) continue;
            if ( trianglesIntersect( triangles[ first ], triangles[ second ], tolerance ) )
            {
                return {
                    first,
                    second,
                    firstFace: faces[ first ],
                    secondFace: faces[ second ],
                    firstPoints: triangles[ first ],
                    secondPoints: triangles[ second ]
                };
            }
        }
    }
    return null;
}

function bridgeHasInternalIntersections( output, faces )
{
    return findBridgeInternalIntersection( output, faces ) !== null;
}

function cycleCorrespondenceScore( output, sourceLoop, targetLoop )
{
    const sourceFractions = cycleArcLengths( output, sourceLoop );
    const targetFractions = cycleArcLengths( output, targetLoop );
    const sampleCount = Math.max( 24, Math.min( 192, Math.max( sourceLoop.length, targetLoop.length ) * 3 ) );
    let squaredDistance = 0;
    let scaleSquared = 0;
    let sourceCentre = { x: 0, y: 0, z: 0 };
    let targetCentre = { x: 0, y: 0, z: 0 };
    for ( let index = 0; index < sampleCount; index += 1 )
    {
        const fraction = index / sampleCount;
        const source = sampleCycle( output, sourceLoop, sourceFractions, fraction );
        const target = sampleCycle( output, targetLoop, targetFractions, fraction );
        squaredDistance += lengthSquared( subtract( source, target ) );
        sourceCentre = add( sourceCentre, source );
        targetCentre = add( targetCentre, target );
    }
    sourceCentre = scale( sourceCentre, 1 / sampleCount );
    targetCentre = scale( targetCentre, 1 / sampleCount );
    for ( let index = 0; index < sampleCount; index += 1 )
    {
        const fraction = index / sampleCount;
        scaleSquared += lengthSquared( subtract(
            sampleCycle( output, sourceLoop, sourceFractions, fraction ), sourceCentre
        ) );
        scaleSquared += lengthSquared( subtract(
            sampleCycle( output, targetLoop, targetFractions, fraction ), targetCentre
        ) );
    }
    return squaredDistance / Math.max( scaleSquared, EPSILON );
}

function selectBridgePlan( output, sourceLoop, rawTargetLoop )
{
    let best = null;
    let plannedCandidates = 0;
    let patchRejectedCandidates = 0;
    let internallyIntersectingCandidates = 0;
    let firstInternalIntersection = null;
    let canonical = null;
    for ( const reversed of [ false, true ] )
    {
        const oriented = reversed ? [ ...rawTargetLoop ].reverse() : [ ...rawTargetLoop ];
        for ( let rotation = 0; rotation < oriented.length; rotation += 1 )
        {
            const targetLoop = oriented.map(
                ( _value, index ) => oriented[ ( rotation + index ) % oriented.length ]
            );
            const correspondence = cycleCorrespondenceScore( output, sourceLoop, targetLoop );
            if ( !canonical || correspondence < canonical.correspondence )
            {
                canonical = { reversed, rotation, targetLoop, correspondence };
            }
        }
    }
    // Most ports already have a canonical transported winding and phase. Try
    // that exact correspondence once, with every normal area/patch/internal
    // intersection guard still active, before the expensive DP phase sweep.
    const canonicalPlan = planBridge( output, sourceLoop, canonical.targetLoop );
    const canonicalIntersection = canonicalPlan
        ? findBridgeInternalIntersection( output, canonicalPlan.faces )
        : null;
    if ( canonicalPlan && !canonicalIntersection )
    {
        const score = canonicalPlan.cost
            + canonical.correspondence * ( sourceLoop.length + rawTargetLoop.length ) * 8;
        return {
            best: { ...canonicalPlan, ...canonical, score },
            diagnostics: {
                sourceVertices: sourceLoop.length,
                targetVertices: rawTargetLoop.length,
                candidates: rawTargetLoop.length * 2,
                plannedCandidates: 1,
                patchRejectedCandidates: 0,
                internallyIntersectingCandidates: 0,
                firstInternalIntersection: null,
                canonicalFastPath: true
            }
        };
    }
    if ( canonicalPlan )
    {
        internallyIntersectingCandidates++;
        firstInternalIntersection = {
            reversed: canonical.reversed,
            rotation: canonical.rotation,
            ...canonicalIntersection
        };
    }
    else patchRejectedCandidates++;
    for ( const reversed of [ false, true ] )
    {
        const oriented = reversed ? [ ...rawTargetLoop ].reverse() : [ ...rawTargetLoop ];
        for ( let rotation = 0; rotation < oriented.length; rotation += 1 )
        {
            const targetLoop = oriented.map(
                ( _value, index ) => oriented[ ( rotation + index ) % oriented.length ]
            );
            const plan = planBridge( output, sourceLoop, targetLoop );
            if ( !plan )
            {
                patchRejectedCandidates++;
                continue;
            }
            plannedCandidates++;
            const internalIntersection = findBridgeInternalIntersection( output, plan.faces );
            if ( internalIntersection )
            {
                internallyIntersectingCandidates++;
                if ( !firstInternalIntersection )
                {
                    firstInternalIntersection = {
                        reversed,
                        rotation,
                        ...internalIntersection
                    };
                }
                continue;
            }
            const correspondence = cycleCorrespondenceScore( output, sourceLoop, targetLoop );
            const score = plan.cost + correspondence * ( sourceLoop.length + targetLoop.length ) * 8;
            if ( best && score >= best.score ) continue;
            best = { ...plan, score, correspondence, reversed, rotation, targetLoop };
        }
    }
    return {
        best,
        diagnostics: {
            sourceVertices: sourceLoop.length,
            targetVertices: rawTargetLoop.length,
            candidates: rawTargetLoop.length * 2,
            plannedCandidates,
            patchRejectedCandidates,
            internallyIntersectingCandidates,
            firstInternalIntersection,
            canonicalFastPath: false
        }
    };
}

function loopPerimeter( output, loop )
{
    return loop.reduce( ( sum, vertex, index ) => sum + length( subtract(
        readPosition( output.positions, loop[ ( index + 1 ) % loop.length ] ),
        readPosition( output.positions, vertex )
    ) ), 0 );
}

function projectedLoopRadius( output, loop, centre, normal )
{
    if ( !centre || !normal || loop.length < 3 ) return null;
    let projectedDoubleArea = 0;
    for ( let index = 0; index < loop.length; index += 1 )
    {
        const first = subtract( readPosition( output.positions, loop[ index ] ), centre );
        const second = subtract(
            readPosition( output.positions, loop[ ( index + 1 ) % loop.length ] ), centre
        );
        projectedDoubleArea += dot( cross( first, second ), normal );
    }
    return Math.sqrt( Math.abs( projectedDoubleArea ) * 0.5 / Math.PI );
}

function stageRuns( stages )
{
    const runs = [];
    for ( let index = 0; index < stages.length; index += 1 )
    {
        const stage = stages[ index ];
        const current = runs.at( -1 );
        if ( current?.stage === stage )
        {
            current.lastOffset = index;
            current.triangles++;
        }
        else
        {
            runs.push( { stage, firstOffset: index, lastOffset: index, triangles: 1 } );
        }
    }
    return runs;
}

function chooseStripFaces( output, first, second )
{
    if ( first.length !== second.length ) return null;
    const bridgeScaleSquared = Math.max(
        ( loopPerimeter( output, first ) + loopPerimeter( output, second ) ) ** 2
            / ( 4 * Math.PI * Math.PI ),
        EPSILON
    );
    const faces = [];
    let minimumDoubleArea = Number.POSITIVE_INFINITY;
    let maximumAspect = 0;
    for ( let index = 0; index < first.length; index += 1 )
    {
        const next = ( index + 1 ) % first.length;
        const a = first[ index ];
        const aNext = first[ next ];
        const b = second[ index ];
        const bNext = second[ next ];
        const seamNormal = output.seamNormals.get(
            `${Math.min( a, aNext )},${Math.max( a, aNext )}`
        ) ?? null;
        const alternatives = [
            [ [ a, aNext, bNext ], [ a, bNext, b ] ],
            [ [ a, aNext, b ], [ aNext, bNext, b ] ]
        ].map( ( candidate ) => {
            const metrics = candidate.map( ( face, faceIndex ) => bridgeTriangleMetric(
                output, ...face, bridgeScaleSquared, faceIndex === 0 ? seamNormal : null
            ) );
            return metrics.every( Boolean )
                ? { faces: candidate, metrics, cost: metrics.reduce( ( sum, value ) => sum + value.cost, 0 ) }
                : null;
        } ).filter( Boolean ).sort( ( left, right ) => left.cost - right.cost );
        if ( alternatives.length === 0 ) return null;
        for ( let face = 0; face < 2; face += 1 )
        {
            const metric = alternatives[ 0 ].metrics[ face ];
            minimumDoubleArea = Math.min( minimumDoubleArea, metric.doubleArea );
            maximumAspect = Math.max( maximumAspect, metric.maximumEdgeSquared / metric.doubleArea );
            faces.push( alternatives[ 0 ].faces[ face ] );
        }
    }
    return { faces, minimumDoubleArea, maximumAspect };
}

function loopAxialSlab( output, loop, origin, axis )
{
    let minimum = Number.POSITIVE_INFINITY;
    let maximum = Number.NEGATIVE_INFINITY;
    for ( const vertex of loop )
    {
        const axial = dot( subtract( readPosition( output.positions, vertex ), origin ), axis );
        minimum = Math.min( minimum, axial );
        maximum = Math.max( maximum, axial );
    }
    return { minimum, maximum, depth: maximum - minimum };
}

function collarSpanError( edge, context, diagnostics )
{
    const edgeRecord = context.edgeRecord ?? edge;
    const error = new Error(
        `edge ${edgeRecord.id} port ${context.port?.id ?? context.side ?? 'unknown'} `
        + 'has insufficient axial room for a non-intersecting staged collar'
    );
    error.code = 'HYBRID_COLLAR_SPAN_TOO_SHORT';
    error.edgeLocalIndex = edgeRecord.localIndex;
    error.edgeId = edgeRecord.id;
    error.edgeIndex = edgeRecord.edgeIndex;
    error.portId = context.port?.id ?? null;
    error.side = context.side ?? context.port?.side ?? null;
    error.portRadius = context.port?.radius ?? null;
    error.collarSpanDiagnostics = diagnostics;
    return error;
}

function buildStagedBridge( output, sourceLoop, rawTargetLoop, owner, edge, context = {} )
{
    const sourceCentre = loopCentre( { positions: output.positions }, sourceLoop );
    const targetCentre = loopCentre( { positions: output.positions }, rawTargetLoop );
    const centreDelta = subtract( targetCentre, sourceCentre );
    const centreDistance = length( centreDelta );
    if ( centreDistance <= EPSILON )
    {
        throw collarSpanError( edge, context, {
            centreDistance,
            reason: 'coincident-loop-centres'
        } );
    }
    const axis = normalize( centreDelta );
    const targetRadius = rawTargetLoop.reduce( ( sum, vertex ) => {
        const delta = subtract( readPosition( output.positions, vertex ), targetCentre );
        return sum + length( subtract( delta, scale( axis, dot( delta, axis ) ) ) );
    }, 0 ) / rawTargetLoop.length;
    const basis = choosePerpendicular( axis );
    const binormal = normalize( cross( axis, basis ) );
    const sourceValues = sourceLoop.map( ( vertex ) => {
        const delta = subtract( readPosition( output.positions, vertex ), sourceCentre );
        const axial = dot( delta, axis );
        const planar = subtract( delta, scale( axis, axial ) );
        return { axial, planar };
    } );
    const sourceSlab = loopAxialSlab( output, sourceLoop, sourceCentre, axis );
    const targetLocalSlab = loopAxialSlab( output, rawTargetLoop, targetCentre, axis );
    const targetSlab = {
        minimum: centreDistance + targetLocalSlab.minimum,
        maximum: centreDistance + targetLocalSlab.maximum,
        depth: targetLocalSlab.depth
    };
    const openAxialSpan = targetSlab.minimum - sourceSlab.maximum;
    let signedArea = 0;
    let phaseX = 0;
    let phaseY = 0;
    for ( let index = 0; index < sourceValues.length; index += 1 )
    {
        signedArea += dot( cross(
            sourceValues[ index ].planar,
            sourceValues[ ( index + 1 ) % sourceValues.length ].planar
        ), axis );
    }
    const cycleDirection = signedArea >= 0 ? 1 : -1;
    for ( let index = 0; index < sourceValues.length; index += 1 )
    {
        const sourceAngle = Math.atan2(
            dot( sourceValues[ index ].planar, binormal ),
            dot( sourceValues[ index ].planar, basis )
        );
        const offset = sourceAngle - cycleDirection * TAU * index / sourceValues.length;
        phaseX += Math.cos( offset );
        phaseY += Math.sin( offset );
    }
    const phase = Math.atan2( phaseY, phaseX );
    sourceValues.forEach( ( value, index ) => {
        const angle = phase + cycleDirection * TAU * index / sourceValues.length;
        value.circle = scale( add(
            scale( basis, Math.cos( angle ) ),
            scale( binormal, Math.sin( angle ) )
        ), targetRadius );
    } );
    // Distinct stage counts are meaningful retries: extra planar rings reduce
    // the radial displacement handled by any one annular strip.
    const stageCounts = [ 5, 6, 7 ];
    const originalPositionLength = output.positions.length;
    const originalOwnerLength = output.vertexOwners.length;
    const originalEdgeLength = output.vertexEdges.length;
    let attempts = 0;
    let stripRejected = 0;
    let finalPlanRejected = 0;
    let internalRejected = 0;
    let firstInternalIntersection = null;
    let firstFinalPlanDiagnostics = null;
    for ( const stageCount of stageCounts )
    {
        attempts++;
        output.positions.length = originalPositionLength;
        output.vertexOwners.length = originalOwnerLength;
        output.vertexEdges.length = originalEdgeLength;
        const rings = [ sourceLoop ];
        // Every ring after the sampled port boundary lies on its own plane.
        // Divide the measured free interval between the forward-most source
        // point and backward-most target point into strictly ordered slabs.
        // This makes adjacent strips meet only on their shared planar ring;
        // MT roughness cannot make neighbouring axial stages overlap.
        const axialIntervals = stageCount + 2;
        const scaleTolerance = Math.max(
            1e-7,
            centreDistance * 1e-5,
            targetRadius * 1e-5
        );
        const axialStep = openAxialSpan / axialIntervals;
        if ( !( axialStep > scaleTolerance ) )
        {
            throw collarSpanError( edge, context, {
                centreDistance,
                sourceSlab,
                targetSlab,
                openAxialSpan,
                axialIntervals,
                axialStep,
                minimumAxialStep: scaleTolerance,
                reason: 'ordered-ring-slabs-do-not-fit'
            } );
        }
        const ringAxials = Array.from(
            { length: stageCount },
            ( _value, index ) => sourceSlab.maximum + axialStep * ( index + 1 )
        );
        const conformingAxial = sourceSlab.maximum + axialStep * ( stageCount + 1 );
        for ( let fractionIndex = 0; fractionIndex < stageCount; fractionIndex += 1 )
        {
            const blend = fractionIndex === 0
                ? 0
                : fractionIndex / ( stageCount - 1 );
            const smooth = blend * blend * ( 3 - 2 * blend );
            rings.push( sourceValues.map( ( value ) => {
                const planar = add(
                    scale( value.planar, 1 - smooth ),
                    scale( value.circle, smooth )
                );
                const position = add(
                    add( sourceCentre, scale( axis, ringAxials[ fractionIndex ] ) ),
                    planar
                );
                return appendVertex( output, position, owner, edge );
            } ) );
        }
        const faces = [];
        const faceStages = [];
        let minimumDoubleArea = Number.POSITIVE_INFINITY;
        let maximumAspect = 0;
        let valid = true;
        for ( let index = 0; index < rings.length - 1; index += 1 )
        {
            const strip = chooseStripFaces( output, rings[ index ], rings[ index + 1 ] );
            if ( !strip )
            {
                stripRejected++;
                valid = false;
                break;
            }
            faces.push( ...strip.faces );
            faceStages.push( ...strip.faces.map( () => `strip-${index}` ) );
            minimumDoubleArea = Math.min( minimumDoubleArea, strip.minimumDoubleArea );
            maximumAspect = Math.max( maximumAspect, strip.maximumAspect );
        }
        if ( !valid ) continue;
        let finalSelection = selectBridgePlan( output, rings.at( -1 ), rawTargetLoop );
        if ( !finalSelection.best )
        {
            finalPlanRejected++;
            firstFinalPlanDiagnostics ??= finalSelection.diagnostics;
            continue;
        }
        // Match a dense final collar ring to the actual transported tube-ring
        // polygon (including its phase and orientation) before reducing the
        // vertex count. This confines the n-to-m zipper to a narrow terminal
        // interval instead of letting its long triangles cut back through an
        // earlier smoothing stage.
        const targetCycle = finalSelection.best.targetLoop;
        const targetFractions = cycleArcLengths( output, targetCycle );
        const conformingRing = rings.at( -1 ).map( ( _vertex, index ) => {
            const target = sampleCycle(
                output, targetCycle, targetFractions, index / rings.at( -1 ).length
            );
            const targetDelta = subtract( target, targetCentre );
            const targetPlanar = subtract(
                targetDelta,
                scale( axis, dot( targetDelta, axis ) )
            );
            return appendVertex(
                output,
                add(
                    add( sourceCentre, scale( axis, conformingAxial ) ),
                    targetPlanar
                ),
                owner,
                edge
            );
        } );
        const conformingStrip = chooseStripFaces( output, rings.at( -1 ), conformingRing );
        if ( !conformingStrip )
        {
            stripRejected++;
            continue;
        }
        faces.push( ...conformingStrip.faces );
        faceStages.push( ...conformingStrip.faces.map( () => 'target-conforming-strip' ) );
        minimumDoubleArea = Math.min( minimumDoubleArea, conformingStrip.minimumDoubleArea );
        maximumAspect = Math.max( maximumAspect, conformingStrip.maximumAspect );
        const provisionalSelection = finalSelection.best;
        const alignedPlan = planBridge( output, conformingRing, targetCycle );
        const alignedIntersection = alignedPlan
            ? findBridgeInternalIntersection( output, alignedPlan.faces )
            : null;
        if ( !alignedPlan || alignedIntersection )
        {
            finalPlanRejected++;
            firstFinalPlanDiagnostics ??= {
                reason: !alignedPlan ? 'aligned-plan-rejected' : 'aligned-plan-self-intersection',
                provisionalReversed: provisionalSelection.reversed,
                provisionalRotation: provisionalSelection.rotation,
                provisionalCorrespondence: provisionalSelection.correspondence,
                alignedIntersection
            };
            continue;
        }
        const sourceParameter = new Map( conformingRing.map(
            ( vertex, index ) => [ vertex, index / conformingRing.length ]
        ) );
        const targetParameter = new Map( targetCycle.map(
            ( vertex, index ) => [ vertex, targetFractions[ index ] ]
        ) );
        const maximumTargetSector = Math.max( ...targetCycle.map(
            ( _vertex, index ) => targetFractions[ index + 1 ] - targetFractions[ index ]
        ) );
        const maximumParameterSpan = maximumTargetSector + 2 / conformingRing.length + 1e-6;
        let nonLocalFace = null;
        for ( const face of alignedPlan.faces )
        {
            const sourceParameters = face.filter( ( vertex ) => sourceParameter.has( vertex ) )
                .map( ( vertex ) => sourceParameter.get( vertex ) );
            const targetParameters = face.filter( ( vertex ) => targetParameter.has( vertex ) )
                .map( ( vertex ) => targetParameter.get( vertex ) );
            for ( const sourceValue of sourceParameters )
            {
                for ( const targetValue of targetParameters )
                {
                    const raw = Math.abs( sourceValue - targetValue );
                    const circular = Math.min( raw, 1 - raw );
                    if ( circular > maximumParameterSpan )
                    {
                        nonLocalFace = { face, sourceValue, targetValue, circular, maximumParameterSpan };
                        break;
                    }
                }
                if ( nonLocalFace ) break;
            }
            if ( nonLocalFace ) break;
        }
        if ( nonLocalFace )
        {
            finalPlanRejected++;
            firstFinalPlanDiagnostics ??= {
                reason: 'aligned-plan-circumferential-span',
                provisionalReversed: provisionalSelection.reversed,
                provisionalRotation: provisionalSelection.rotation,
                provisionalCorrespondence: provisionalSelection.correspondence,
                nonLocalFace
            };
            continue;
        }
        finalSelection = { best: {
            ...alignedPlan,
            targetLoop: targetCycle,
            reversed: provisionalSelection.reversed,
            rotation: provisionalSelection.rotation,
            correspondence: cycleCorrespondenceScore( output, conformingRing, targetCycle )
        } };
        faces.push( ...alignedPlan.faces );
        faceStages.push( ...alignedPlan.faces.map( () => 'final-reduction' ) );
        minimumDoubleArea = Math.min( minimumDoubleArea, alignedPlan.minimumDoubleArea );
        maximumAspect = Math.max( maximumAspect, alignedPlan.maximumAspect );
        const intersection = findBridgeInternalIntersection( output, faces );
        if ( intersection )
        {
            internalRejected++;
            if ( !firstInternalIntersection )
            {
                firstInternalIntersection = {
                    ...intersection,
                    firstStage: faceStages[ intersection.first ],
                    secondStage: faceStages[ intersection.second ]
                };
            }
            continue;
        }
        const axialSlabs = [
            { stage: 'source', ...sourceSlab },
            ...rings.slice( 1 ).map( ( ring, index ) => ( {
                stage: `morph-${index}`,
                ...loopAxialSlab( output, ring, sourceCentre, axis )
            } ) ),
            {
                stage: 'target-conforming',
                ...loopAxialSlab( output, conformingRing, sourceCentre, axis )
            },
            { stage: 'target', ...targetSlab }
        ];
        return {
            faces,
            faceStageRuns: stageRuns( faceStages ),
            intermediateRings: stageCount + 1,
            correspondence: finalSelection.best.correspondence,
            reversed: finalSelection.best.reversed,
            rotation: finalSelection.best.rotation,
            minimumDoubleArea,
            maximumAspect,
            attempts,
            centreDistance,
            axialSlabs
        };
    }
    output.positions.length = originalPositionLength;
    output.vertexOwners.length = originalOwnerLength;
    output.vertexEdges.length = originalEdgeLength;
    const stagedDiagnostics = {
        attempts, stripRejected, finalPlanRejected, internalRejected,
        firstInternalIntersection, firstFinalPlanDiagnostics,
        centreDistance,
        sourceSlab,
        targetSlab,
        openAxialSpan,
        reason: 'all-validated-staging-patterns-rejected'
    };
    const error = collarSpanError( edge, context, stagedDiagnostics );
    error.stagedDiagnostics = stagedDiagnostics;
    throw error;
}

function bridgeLoops( output, sourceLoop, rawTargetLoop, owner, edge, context = {} )
{
    if ( sourceLoop.length < 3 || rawTargetLoop.length < 3 )
    {
        throw new Error( 'a bridge requires two closed loops with at least three vertices' );
    }
    const selection = selectBridgePlan( output, sourceLoop, rawTargetLoop );
    let best = context.forceStaged ? null : selection.best;
    let staged = Boolean( context.forceStaged );
    if ( !best )
    {
        try
        {
            best = buildStagedBridge( output, sourceLoop, rawTargetLoop, owner, edge, context );
            staged = true;
        }
        catch ( error )
        {
            error.bridgeDiagnostics = {
                ...selection.diagnostics,
                staged: error.stagedDiagnostics ?? null,
                collarSpan: error.collarSpanDiagnostics ?? null
            };
            throw error;
        }
    }
    const firstFace = output.indices.length / 3;
    for ( const face of best.faces ) appendFace( output, ...face, owner, edge );
    const localStageRuns = best.faceStageRuns ?? [ {
        stage: 'direct', firstOffset: 0, lastOffset: best.faces.length - 1,
        triangles: best.faces.length
    } ];
    const projectedRadius = projectedLoopRadius(
        output, sourceLoop, context.port?.center, context.port?.outward
    );
    output.bridgeStats.push( {
        firstFace,
        lastFace: output.indices.length / 3 - 1,
        sourceVertices: sourceLoop.length,
        targetVertices: rawTargetLoop.length,
        triangles: best.faces.length,
        staged,
        intermediateRings: best.intermediateRings ?? 0,
        sourcePerimeter: loopPerimeter( output, sourceLoop ),
        targetPerimeter: loopPerimeter( output, rawTargetLoop ),
        effectivePortRadius: loopPerimeter( output, sourceLoop ) / TAU,
        authoredPortRadius: context.port?.radius ?? null,
        projectedPortRadius: projectedRadius,
        projectedScaleRatio: projectedRadius !== null && context.port?.radius
            ? projectedRadius / context.port.radius
            : null,
        swellingRatio: context.port?.radius
            ? loopPerimeter( output, sourceLoop ) / TAU / context.port.radius
            : null,
        edgeId: context.port?.edgeId ?? null,
        portId: context.port?.id ?? null,
        side: context.side ?? context.port?.side ?? null,
        reversed: best.reversed,
        rotation: best.rotation,
        correspondence: best.correspondence,
        minimumDoubleArea: best.minimumDoubleArea,
        maximumAspect: best.maximumAspect,
        centreDistance: best.centreDistance ?? null,
        axialSlabs: best.axialSlabs ?? null,
        internalIntersections: 0,
        faceStages: localStageRuns.map( ( run ) => ( {
            ...run,
            firstFace: firstFace + run.firstOffset,
            lastFace: firstFace + run.lastOffset
        } ) ),
        sourceLoopVertices: [ ...sourceLoop ],
        targetLoopVertices: [ ...rawTargetLoop ]
    } );
}

function appendTube( output, edge, startPort, endPort, startBoundary, endBoundary, owner, edgeOwner, options )
{
    const available = endPort.distance - startPort.distance;
    const baseGap = Math.min(
        Math.max(
            ( options.cellSize ?? 0.04 ) * 1.15,
            Math.min( startPort.radius, endPort.radius ) * 0.16
        ),
        available * 0.18
    );
    const startEffectiveRadius = loopPerimeter( output, startBoundary ) / TAU;
    const endEffectiveRadius = loopPerimeter( output, endBoundary ) / TAU;
    const desiredStartGap = baseGap + Math.max( 0, startEffectiveRadius - startPort.radius )
        * ( options.swollenPortCollarLengthFactor ?? 1.65 );
    const desiredEndGap = baseGap + Math.max( 0, endEffectiveRadius - endPort.radius )
        * ( options.swollenPortCollarLengthFactor ?? 1.65 );
    const reservedSpan = Math.max(
        ( options.cellSize ?? 0.04 ) * 2,
        Math.min( startPort.radius, endPort.radius ) * 0.5
    );
    const collarBudget = available - reservedSpan;
    if ( collarBudget <= baseGap * 2 + EPSILON )
    {
        const error = new Error(
            `edge ${edge.id} cannot accommodate its validated axial collars `
            + `(available=${available}; baseGap=${baseGap}; reserve=${reservedSpan})`
        );
        error.code = 'HYBRID_COLLAR_SPAN_TOO_SHORT';
        error.edgeLocalIndex = edge.localIndex;
        error.edgeId = edge.id;
        error.edgeIndex = edge.edgeIndex;
        throw error;
    }
    const desiredExtra = desiredStartGap + desiredEndGap - baseGap * 2;
    const extraBudget = collarBudget - baseGap * 2;
    const extraScale = desiredExtra > extraBudget ? extraBudget / desiredExtra : 1;
    const startGap = baseGap + ( desiredStartGap - baseGap ) * extraScale;
    const endGap = baseGap + ( desiredEndGap - baseGap ) * extraScale;
    const from = startPort.distance + startGap;
    const to = endPort.distance - endGap;
    if ( to <= from + EPSILON )
    {
        throw new Error( `edge ${edge.id} has no room between its junction ports` );
    }
    const values = slicePolyline( edge, from, to );
    const frames = tubeFrames( values );
    const radialSegments = Math.max( 6, Math.floor( options.radialSegments ?? 12 ) );
    const rings = [];
    for ( let sampleIndex = 0; sampleIndex < values.length; sampleIndex += 1 )
    {
        const centre = values[ sampleIndex ];
        const normal = frames.normals[ sampleIndex ];
        const binormal = normalize( cross( frames.tangents[ sampleIndex ], normal ) );
        const ring = [];
        for ( let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1 )
        {
            const angle = TAU * radialIndex / radialSegments;
            const radial = add( scale( normal, Math.cos( angle ) ), scale( binormal, Math.sin( angle ) ) );
            ring.push( appendVertex( output, add( centre, scale( radial, centre.radius ) ), owner, edgeOwner ) );
        }
        rings.push( ring );
    }
    for ( let ringIndex = 0; ringIndex < rings.length - 1; ringIndex += 1 )
    {
        const first = rings[ ringIndex ];
        const second = rings[ ringIndex + 1 ];
        for ( let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1 )
        {
            const next = ( radialIndex + 1 ) % radialSegments;
            appendFace( output, first[ radialIndex ], first[ next ], second[ next ], owner, edgeOwner );
            appendFace( output, first[ radialIndex ], second[ next ], second[ radialIndex ], owner, edgeOwner );
        }
    }
    const bridge = ( side, port, boundary, ring ) => {
        try
        {
            bridgeLoops( output, boundary, ring, owner, edgeOwner, {
                port,
                side,
                edgeRecord: edge,
                forceStaged: options.forceStagedBridges === true
            } );
        }
        catch ( error )
        {
            error.message += ` (edge=${edge.id}; port=${port.id}; side=${side}; `
                + `sourceVertices=${boundary?.length ?? 0}; targetVertices=${ring.length}; `
                + `sourcePerimeter=${boundary ? loopPerimeter( output, boundary ) : null}; `
                + `targetPerimeter=${loopPerimeter( output, ring )}; `
                + `diagnostics=${JSON.stringify( error.bridgeDiagnostics ?? null )})`;
            throw error;
        }
    };
    bridge( 'start', startPort, startBoundary, rings[ 0 ] );
    bridge( 'end', endPort, endBoundary, rings.at( -1 ) );
}

function edgeRecords( indices )
{
    const records = new Map();
    function include( first, second, faceIndex )
    {
        const low = Math.min( first, second );
        const high = Math.max( first, second );
        const key = `${low},${high}`;
        if ( !records.has( key ) ) records.set( key, [] );
        records.get( key ).push( {
            faceIndex,
            direction: first === low ? 1 : -1
        } );
    }
    for ( let faceIndex = 0; faceIndex < indices.length / 3; faceIndex += 1 )
    {
        const offset = faceIndex * 3;
        include( indices[ offset ], indices[ offset + 1 ], faceIndex );
        include( indices[ offset + 1 ], indices[ offset + 2 ], faceIndex );
        include( indices[ offset + 2 ], indices[ offset ], faceIndex );
    }
    return records;
}

function orientFaces( positions, indices )
{
    const faceCount = indices.length / 3;
    const records = edgeRecords( indices );
    const adjacency = Array.from( { length: faceCount }, () => [] );
    let nonManifoldEdges = 0;
    for ( const uses of records.values() )
    {
        if ( uses.length !== 2 )
        {
            if ( uses.length > 2 ) nonManifoldEdges++;
            continue;
        }
        const flipRelation = uses[ 0 ].direction === uses[ 1 ].direction ? 1 : 0;
        adjacency[ uses[ 0 ].faceIndex ].push( [ uses[ 1 ].faceIndex, flipRelation ] );
        adjacency[ uses[ 1 ].faceIndex ].push( [ uses[ 0 ].faceIndex, flipRelation ] );
    }
    const flips = new Int8Array( faceCount );
    flips.fill( -1 );
    const components = [];
    let orientationConflicts = 0;
    for ( let seed = 0; seed < faceCount; seed += 1 )
    {
        if ( flips[ seed ] >= 0 ) continue;
        flips[ seed ] = 0;
        const component = [];
        const queue = [ seed ];
        while ( queue.length > 0 )
        {
            const face = queue.pop();
            component.push( face );
            for ( const [ neighbour, relation ] of adjacency[ face ] )
            {
                const expected = flips[ face ] ^ relation;
                if ( flips[ neighbour ] < 0 )
                {
                    flips[ neighbour ] = expected;
                    queue.push( neighbour );
                }
                else if ( flips[ neighbour ] !== expected ) orientationConflicts++;
            }
        }
        components.push( component );
    }
    for ( let face = 0; face < faceCount; face += 1 )
    {
        if ( flips[ face ] )
        {
            const offset = face * 3;
            [ indices[ offset + 1 ], indices[ offset + 2 ] ] = [ indices[ offset + 2 ], indices[ offset + 1 ] ];
        }
    }
    for ( const component of components )
    {
        let volume = 0;
        for ( const face of component )
        {
            const offset = face * 3;
            const a = readPosition( positions, indices[ offset ] );
            const b = readPosition( positions, indices[ offset + 1 ] );
            const c = readPosition( positions, indices[ offset + 2 ] );
            volume += dot( a, cross( b, c ) ) / 6;
        }
        if ( volume < 0 )
        {
            for ( const face of component )
            {
                const offset = face * 3;
                [ indices[ offset + 1 ], indices[ offset + 2 ] ] = [ indices[ offset + 2 ], indices[ offset + 1 ] ];
            }
        }
    }
    return { orientationConflicts, nonManifoldEdges, components: components.length };
}

function createNormals( positions, indices, requireCertificate = false )
{
    const vertexCount = positions.length / 3;
    const faceCount = indices.length / 3;
    const normals = new Float64Array( positions.length );
    const faceNormals = new Float64Array( faceCount * 3 );
    const incidentCounts = new Uint32Array( vertexCount );
    for ( let index = 0; index < indices.length; index += 3 )
    {
        const faceIndex = index / 3;
        const a = indices[ index ];
        const b = indices[ index + 1 ];
        const c = indices[ index + 2 ];
        const pa = readPosition( positions, a );
        const pb = readPosition( positions, b );
        const pc = readPosition( positions, c );
        const face = unitTriangleNormal( pa, pb, pc );
        faceNormals[ faceIndex * 3 ] = face.x;
        faceNormals[ faceIndex * 3 + 1 ] = face.y;
        faceNormals[ faceIndex * 3 + 2 ] = face.z;
        const vertices = [ a, b, c ];
        const values = [ pa, pb, pc ];
        for ( let corner = 0; corner < 3; corner += 1 )
        {
            const vertex = vertices[ corner ];
            incidentCounts[ vertex ]++;
            const current = values[ corner ];
            const previous = values[ ( corner + 2 ) % 3 ];
            const next = values[ ( corner + 1 ) % 3 ];
            const first = normalize( subtract( previous, current ) );
            const second = normalize( subtract( next, current ) );
            const angle = Math.acos( clamp( dot( first, second ), -1, 1 ) );
            normals[ vertex * 3 ] += face.x * angle;
            normals[ vertex * 3 + 1 ] += face.y * angle;
            normals[ vertex * 3 + 2 ] += face.z * angle;
        }
    }
    const incidentOffsets = new Uint32Array( vertexCount + 1 );
    for ( let vertex = 0; vertex < vertexCount; vertex += 1 )
    {
        incidentOffsets[ vertex + 1 ] = incidentOffsets[ vertex ] + incidentCounts[ vertex ];
    }
    const incidentFaces = new Uint32Array( indices.length );
    const incidentCursors = incidentOffsets.slice( 0, vertexCount );
    for ( let face = 0; face < faceCount; face += 1 )
    {
        for ( let corner = 0; corner < 3; corner += 1 )
        {
            const vertex = indices[ face * 3 + corner ];
            incidentFaces[ incidentCursors[ vertex ]++ ] = face;
        }
    }
    for ( let index = 0; index < normals.length; index += 3 )
    {
        const vertex = index / 3;
        const hasIncidentFace = incidentOffsets[ vertex ] < incidentOffsets[ vertex + 1 ];
        const firstFace = hasIncidentFace ? incidentFaces[ incidentOffsets[ vertex ] ] : 0;
        const fallback = !hasIncidentFace
            ? { x: 0, y: 1, z: 0 }
            : {
                x: faceNormals[ firstFace * 3 ],
                y: faceNormals[ firstFace * 3 + 1 ],
                z: faceNormals[ firstFace * 3 + 2 ]
            };
        const value = normalize(
            { x: normals[ index ], y: normals[ index + 1 ], z: normals[ index + 2 ] },
            fallback
        );
        normals[ index ] = value.x;
        normals[ index + 1 ] = value.y;
        normals[ index + 2 ] = value.z;
    }

    const faceScore = ( face ) => {
        const faceOffset = face * 3;
        const qx = faceNormals[ faceOffset ];
        const qy = faceNormals[ faceOffset + 1 ];
        const qz = faceNormals[ faceOffset + 2 ];
        let score = 0;
        for ( let corner = 0; corner < 3; corner += 1 )
        {
            const normalOffset = indices[ faceOffset + corner ] * 3;
            score += qx * normals[ normalOffset ]
                + qy * normals[ normalOffset + 1 ]
                + qz * normals[ normalOffset + 2 ];
        }
        return score / 3;
    };

    // Solve the audit's actual face-average constraints on the assembled,
    // oriented surface. Each Gauss-Seidel step is the minimum-norm tangent
    // correction for one linearised spherical constraint. Only faces incident
    // to changed vertices are revisited, and ascending face ids make the solve
    // deterministic. The positive target leaves ample Float32 margin over the
    // audit's -0.05 rejection threshold.
    const target = 0.008;
    let active = [];
    for ( let face = 0; face < faceCount; face += 1 )
    {
        if ( faceScore( face ) < target ) active.push( face );
    }
    let solverIterations = 0;
    for ( ; solverIterations < 320 && active.length > 0; solverIterations += 1 )
    {
        active.sort( ( left, right ) => left - right );
        const next = [];
        const nextMarks = new Uint8Array( faceCount );
        const includeIncidentFaces = ( vertex ) => {
            for ( let incident = incidentOffsets[ vertex ]; incident < incidentOffsets[ vertex + 1 ]; incident += 1 )
            {
                const face = incidentFaces[ incident ];
                if ( nextMarks[ face ] ) continue;
                nextMarks[ face ] = 1;
                next.push( face );
            }
        };
        let updates = 0;
        for ( const face of active )
        {
            const score = faceScore( face );
            if ( score >= target ) continue;
            const faceOffset = face * 3;
            const q = {
                x: faceNormals[ faceOffset ],
                y: faceNormals[ faceOffset + 1 ],
                z: faceNormals[ faceOffset + 2 ]
            };
            const tangentValues = [];
            let denominator = 0;
            let maximumTangent = 0;
            for ( let corner = 0; corner < 3; corner += 1 )
            {
                const vertex = indices[ faceOffset + corner ];
                const normalOffset = vertex * 3;
                const normal = {
                    x: normals[ normalOffset ],
                    y: normals[ normalOffset + 1 ],
                    z: normals[ normalOffset + 2 ]
                };
                const tangent = subtract( q, scale( normal, dot( q, normal ) ) );
                const tangentSquared = lengthSquared( tangent );
                tangentValues.push( { vertex, normalOffset, normal, tangent, tangentSquared } );
                denominator += tangentSquared;
                maximumTangent = Math.max( maximumTangent, Math.sqrt( tangentSquared ) );
            }
            if ( denominator <= 1e-14 )
            {
                // Escape the antipodal stationary point deterministically; a
                // subsequent tangent solve performs the actual projection.
                const value = tangentValues.slice().sort(
                    ( left, right ) => left.vertex - right.vertex
                )[ 0 ];
                const escape = choosePerpendicular( q );
                const adjusted = normalize( add(
                    scale( value.normal, 0.995 ), scale( escape, 0.1 )
                ) );
                normals[ value.normalOffset ] = adjusted.x;
                normals[ value.normalOffset + 1 ] = adjusted.y;
                normals[ value.normalOffset + 2 ] = adjusted.z;
                includeIncidentFaces( value.vertex );
                updates++;
                continue;
            }
            let multiplier = 3 * ( target - score ) / denominator * 0.92;
            const maximumStep = multiplier * maximumTangent;
            if ( maximumStep > 0.2 ) multiplier *= 0.2 / maximumStep;
            for ( const value of tangentValues )
            {
                const adjusted = normalize( add( value.normal, scale( value.tangent, multiplier ) ) );
                normals[ value.normalOffset ] = adjusted.x;
                normals[ value.normalOffset + 1 ] = adjusted.y;
                normals[ value.normalOffset + 2 ] = adjusted.z;
                includeIncidentFaces( value.vertex );
            }
            updates++;
        }
        if ( updates === 0 ) break;
        active = next.filter( ( face ) => faceScore( face ) < target );
    }
    const result = new Float32Array( normals.length );
    for ( let index = 0; index < normals.length; index++ ) result[ index ] = normals[ index ];
    const certificate = normalCompatibilityAudit( positions, indices, 8, result );
    result.solverDiagnostics = {
        iterations: solverIterations,
        opposedFaces: certificate.opposedFaces,
        minimumAverageDot: certificate.minimumAverageDot,
        samples: certificate.samples
    };
    if ( requireCertificate && certificate.opposedFaces !== 0 )
    {
        const error = new Error(
            `normal constraint solver left ${certificate.opposedFaces} opposed face(s)`
        );
        error.code = 'HYBRID_NORMAL_CERTIFICATE_FAILED';
        error.normalDiagnostics = result.solverDiagnostics;
        throw error;
    }
    return result;
}

function topologyStats( vertexCount, indices )
{
    const records = edgeRecords( indices );
    let boundaryEdges = 0;
    let nonManifoldEdges = 0;
    let orientationMismatches = 0;
    for ( const uses of records.values() )
    {
        if ( uses.length === 1 ) boundaryEdges++;
        else if ( uses.length !== 2 ) nonManifoldEdges++;
        if ( uses.length === 2 && uses[ 0 ].direction === uses[ 1 ].direction ) orientationMismatches++;
    }
    const union = new Int32Array( vertexCount );
    for ( let index = 0; index < vertexCount; index++ ) union[ index ] = index;
    function find( value )
    {
        while ( union[ value ] !== value )
        {
            union[ value ] = union[ union[ value ] ];
            value = union[ value ];
        }
        return value;
    }
    function join( a, b )
    {
        a = find( a );
        b = find( b );
        if ( a !== b ) union[ b ] = a;
    }
    for ( let index = 0; index < indices.length; index += 3 )
    {
        join( indices[ index ], indices[ index + 1 ] );
        join( indices[ index + 1 ], indices[ index + 2 ] );
    }
    const used = new Set( indices );
    const components = new Set( [ ...used ].map( find ) ).size;
    const eulerCharacteristic = used.size - records.size + indices.length / 3;
    return {
        uniqueEdges: records.size,
        boundaryEdges,
        nonManifoldEdges,
        orientationMismatches,
        connectedComponents: components,
        eulerCharacteristic,
        genus: boundaryEdges === 0 && nonManifoldEdges === 0
            ? ( 2 * components - eulerCharacteristic ) / 2
            : null
    };
}

function openTopologyStats( vertexCount, indices )
{
    const records = edgeRecords( indices );
    const used = new Set( indices );
    const boundaryAdjacency = new Map();
    const incidentFaces = Array.from( { length: vertexCount }, () => [] );
    const faceNeighboursAtVertex = Array.from( { length: vertexCount }, () => new Map() );
    let boundaryEdges = 0;
    let nonManifoldEdges = 0;
    let orientationMismatches = 0;
    const nonManifoldVertexSet = new Set();

    function addBoundaryNeighbour( first, second )
    {
        if ( !boundaryAdjacency.has( first ) ) boundaryAdjacency.set( first, [] );
        boundaryAdjacency.get( first ).push( second );
    }
    function connectFacesAtVertex( vertex, first, second )
    {
        const adjacency = faceNeighboursAtVertex[ vertex ];
        if ( !adjacency.has( first ) ) adjacency.set( first, [] );
        if ( !adjacency.has( second ) ) adjacency.set( second, [] );
        adjacency.get( first ).push( second );
        adjacency.get( second ).push( first );
    }

    for ( let face = 0; face < indices.length / 3; face += 1 )
    {
        incidentFaces[ indices[ face * 3 ] ].push( face );
        incidentFaces[ indices[ face * 3 + 1 ] ].push( face );
        incidentFaces[ indices[ face * 3 + 2 ] ].push( face );
    }
    for ( const [ key, uses ] of records )
    {
        const [ first, second ] = key.split( ',' ).map( Number );
        if ( uses.length === 1 )
        {
            boundaryEdges++;
            addBoundaryNeighbour( first, second );
            addBoundaryNeighbour( second, first );
        }
        else if ( uses.length !== 2 )
        {
            nonManifoldEdges++;
            nonManifoldVertexSet.add( first );
            nonManifoldVertexSet.add( second );
        }
        if ( uses.length === 2 )
        {
            connectFacesAtVertex( first, uses[ 0 ].faceIndex, uses[ 1 ].faceIndex );
            connectFacesAtVertex( second, uses[ 0 ].faceIndex, uses[ 1 ].faceIndex );
            if ( uses[ 0 ].direction === uses[ 1 ].direction ) orientationMismatches++;
        }
    }

    let boundaryLoops = 0;
    let openBoundaryChains = 0;
    const boundaryLoopSizes = [];
    const visitedBoundaryVertices = new Set();
    for ( const seed of boundaryAdjacency.keys() )
    {
        if ( visitedBoundaryVertices.has( seed ) ) continue;
        const stack = [ seed ];
        visitedBoundaryVertices.add( seed );
        let vertices = 0;
        let degreeSum = 0;
        let allDegreeTwo = true;
        while ( stack.length > 0 )
        {
            const vertex = stack.pop();
            vertices++;
            const neighbours = boundaryAdjacency.get( vertex ) ?? [];
            degreeSum += neighbours.length;
            if ( neighbours.length !== 2 ) allDegreeTwo = false;
            for ( const neighbour of neighbours )
            {
                if ( visitedBoundaryVertices.has( neighbour ) ) continue;
                visitedBoundaryVertices.add( neighbour );
                stack.push( neighbour );
            }
        }
        if ( allDegreeTwo )
        {
            boundaryLoops++;
            boundaryLoopSizes.push( degreeSum / 2 );
        }
        else
        {
            openBoundaryChains++;
        }
    }

    for ( const vertex of used )
    {
        const faces = incidentFaces[ vertex ];
        if ( faces.length === 0 ) continue;
        const adjacency = faceNeighboursAtVertex[ vertex ];
        const remaining = new Set( faces );
        let fans = 0;
        while ( remaining.size > 0 )
        {
            fans++;
            const seed = remaining.values().next().value;
            remaining.delete( seed );
            const stack = [ seed ];
            while ( stack.length > 0 )
            {
                const face = stack.pop();
                for ( const neighbour of adjacency.get( face ) ?? [] )
                {
                    if ( !remaining.delete( neighbour ) ) continue;
                    stack.push( neighbour );
                }
            }
        }
        const boundaryDegree = ( boundaryAdjacency.get( vertex ) ?? [] ).length;
        if ( fans !== 1 || ( boundaryDegree !== 0 && boundaryDegree !== 2 ) )
        {
            nonManifoldVertexSet.add( vertex );
        }
    }

    const union = new Int32Array( vertexCount );
    for ( let index = 0; index < vertexCount; index++ ) union[ index ] = index;
    function find( value )
    {
        while ( union[ value ] !== value )
        {
            union[ value ] = union[ union[ value ] ];
            value = union[ value ];
        }
        return value;
    }
    function join( first, second )
    {
        first = find( first );
        second = find( second );
        if ( first !== second ) union[ second ] = first;
    }
    for ( let index = 0; index < indices.length; index += 3 )
    {
        join( indices[ index ], indices[ index + 1 ] );
        join( indices[ index + 1 ], indices[ index + 2 ] );
    }
    const connectedComponents = new Set( [ ...used ].map( find ) ).size;
    const eulerCharacteristic = used.size - records.size + indices.length / 3;
    const genusValue = ( 2 * connectedComponents - boundaryLoops - eulerCharacteristic ) / 2;
    const genus = nonManifoldEdges === 0
        && nonManifoldVertexSet.size === 0
        && openBoundaryChains === 0
        && Math.abs( genusValue - Math.round( genusValue ) ) < 1e-8
        && genusValue >= 0
        ? Math.round( genusValue )
        : null;
    return {
        vertices: used.size,
        triangles: indices.length / 3,
        uniqueEdges: records.size,
        connectedComponents,
        boundaryEdges,
        boundaryLoops,
        boundaryLoopSizes: boundaryLoopSizes.sort( ( a, b ) => b - a ),
        openBoundaryChains,
        nonManifoldEdges,
        nonManifoldVertices: nonManifoldVertexSet.size,
        orientationMismatches,
        eulerCharacteristic,
        genus
    };
}

function makeVertexProvenance( vertexCount, indices, faceValues )
{
    const sets = Array.from( { length: vertexCount }, () => new Set() );
    for ( let face = 0; face < indices.length / 3; face += 1 )
    {
        const value = faceValues[ face ];
        sets[ indices[ face * 3 ] ].add( value );
        sets[ indices[ face * 3 + 1 ] ].add( value );
        sets[ indices[ face * 3 + 2 ] ].add( value );
    }
    const offsets = new Uint32Array( vertexCount + 1 );
    const values = [];
    const primary = new Int32Array( vertexCount );
    primary.fill( -1 );
    for ( let vertex = 0; vertex < vertexCount; vertex += 1 )
    {
        offsets[ vertex ] = values.length;
        const sorted = [ ...sets[ vertex ] ].filter( ( value ) => value >= 0 ).sort( ( a, b ) => a - b );
        values.push( ...sorted );
        if ( sorted.length > 0 ) primary[ vertex ] = sorted[ 0 ];
    }
    offsets[ vertexCount ] = values.length;
    return { primary, offsets, values: new Int32Array( values ) };
}

/**
 * Builds one indexed semantic tree skin.  Junction fields never contain an
 * unrelated edge: the only implicit unions are per declared semantic cluster.
 * Their clipped boundary loops are reused as actual vertices of the connecting
 * generalized cylinders, so there are no hidden caps or overlapping collars.
 *
 * @param {Array<{id?:string,edgeIndex?:number,parentId:string,childId:string,
 * points:Array<{x:number,y:number,z:number,radius:number}>}>} sampledEdges
 * @param {Object} options
 * @returns {{positions:Float32Array,indices:Uint32Array,normals:Float32Array,
 * faceOwners:Int32Array,vertexOwners:Int32Array,faceEdges:Int32Array,
 * vertexEdges:Int32Array,ownerIds:Array,edgeIds:Array,stats:Object,
 * clusters:Array,ports:Array}}
 */
function buildHybridTreeMeshAttempt( sampledEdges, options = {} )
{
    const startedAt = globalThis.performance?.now?.() ?? Date.now();
    const edges = normalizeEdges( sampledEdges );
    if ( edges.length === 0 )
    {
        return {
            positions: new Float32Array(), indices: new Uint32Array(), normals: new Float32Array(),
            faceOwners: new Int32Array(), vertexOwners: new Int32Array(),
            faceEdges: new Int32Array(), vertexEdges: new Int32Array(),
            ownerIds: [], edgeIds: [], clusters: [], ports: [],
            stats: { algorithm: 'semantic-local-union-plus-explicit-tubes', vertices: 0, triangles: 0,
                topology: topologyStats( 0, new Uint32Array() ), elapsedMs: 0 }
        };
    }
    const incidence = buildIncidence( edges );
    const forcedMergeKeys = new Set( options._forcedMergeEdgeKeys ?? [] );
    const forcedMergeEdges = new Set();
    edges.forEach( ( edge, edgeIndex ) => {
        const key = `${typeof edge.id}:${String( edge.id )}|${typeof edge.edgeIndex}:${String( edge.edgeIndex )}`;
        if ( forcedMergeKeys.has( key ) ) forcedMergeEdges.add( edgeIndex );
    } );
    let clusterData;
    let portData;
    let isolationResult;
    for ( let iteration = 0; iteration <= edges.length; iteration += 1 )
    {
        clusterData = makeClusters( edges, incidence, options, forcedMergeEdges );
        portData = makePorts(
            edges, incidence, clusterData.clusters, clusterData.clusterForNode,
            clusterData.nodeScales, clusterData.endpointDepths, options
        );
        const conflicts = new Set( portData.depthConflicts );
        if ( conflicts.size === 0 )
        {
            isolationResult = isolateClusterPorts(
                edges, clusterData.clusters, portData, options
            );
            for ( const failure of isolationResult.failures )
            {
                conflicts.add( failure.port.edgeLocalIndex );
            }
        }
        if ( conflicts.size === 0 ) break;
        let added = false;
        for ( const edgeIndex of conflicts )
        {
            if ( forcedMergeEdges.has( edgeIndex ) ) continue;
            forcedMergeEdges.add( edgeIndex );
            added = true;
        }
        if ( !added || iteration === edges.length )
        {
            throw new Error( 'semantic junction clustering could not reach isolated fixed-point ports' );
        }
    }
    const adjustedClusterPorts = isolationResult?.adjustedPorts ?? 0;
    const ownerIds = [];
    const ownerLookup = new Map();
    const edgeIds = [];
    const edgeLookup = new Map();
    function tableIndex( table, lookup, value )
    {
        const key = `${typeof value}:${String( value )}`;
        if ( !lookup.has( key ) )
        {
            lookup.set( key, table.length );
            table.push( value );
        }
        return lookup.get( key );
    }
    const globalOwnerIndex = ( value ) => tableIndex( ownerIds, ownerLookup, value );
    const globalEdgeIndex = ( value ) => tableIndex( edgeIds, edgeLookup, value );
    for ( const edge of edges )
    {
        globalOwnerIndex( edge.id );
        globalEdgeIndex( edge.edgeIndex );
    }
    // Bound even the largest permitted fallback hub before construction. The
    // exact audit threshold is computed from the final Float32 bounds below;
    // this conservative value prevents circular build-then-reject behaviour.
    const constructionScale = expandedTreeScale(
        edges, options.maximumFallbackHubInflation ?? 4.5
    );
    const constructionMinimumDoubleArea = Math.max(
        constructionScale * constructionScale * 1e-14,
        1e-18
    );
    const output = {
        positions: [], indices: [], faceOwners: [], vertexOwners: [], faceEdges: [], vertexEdges: [],
        bridgeStats: [],
        meshScale: constructionScale,
        minimumDoubleArea: constructionMinimumDoubleArea
    };
    const globalPortLoops = new Map();
    const patchStats = [];
    const patchCache = options._patchCache instanceof Map ? options._patchCache : null;
    let patchCacheHits = 0;
    const clippingTolerance = options.clippingTolerance ?? Math.max( 1e-7, ( options.cellSize ?? 0.04 ) * 1e-5 );

    for ( const cluster of clusterData.clusters )
    {
        const clusterPorts = portData.portsByCluster.get( cluster.index );
        let patchSource = buildPatchSource(
            cluster,
            edges,
            clusterPorts,
            portData.internalEdgesByCluster.get( cluster.index ),
            options
        );
        const minimumRadius = Math.min( ...patchSource.map( ( segment ) => Math.min( segment.radiusA, segment.radiusB ) ) );
        const requestedPatchCellSize = Math.min(
            options.cellSize ?? 0.04,
            Math.max( options.minimumCellSize ?? 0.012, minimumRadius * ( options.radiusCellFactor ?? 0.62 ) )
        );
        let patchCellSize = requestedPatchCellSize;
        const minimumPatchRadiusCells = Math.max( 4, options.minimumPatchRadiusCells ?? 4 );
        const maximumPatchCellSize = minimumRadius / minimumPatchRadiusCells;
        const patchCapacityCellGrowth = Math.max( 1.01, options.patchCapacityCellGrowth ?? 1.15 );
        const maximumPatchCapacityRetries = Math.max(
            1, Math.floor( options.maximumPatchCapacityRetries ?? 12 )
        );
        const capacityRetries = [];
        const configuredOrigin = Array.isArray( options.origin )
            ? { x: options.origin[ 0 ] ?? 0, y: options.origin[ 1 ] ?? 0, z: options.origin[ 2 ] ?? 0 }
            : {
                x: options.origin?.x ?? 0,
                y: options.origin?.y ?? 0,
                z: options.origin?.z ?? 0
            };
        const originFractions = options.patchOriginRetryFractions ?? [
            [ 0, 0, 0 ],
            [ 0.173, 0.347, 0.593 ],
            [ 0.419, 0.113, 0.271 ],
            [ 0.283, 0.661, 0.157 ],
            [ 0.719, 0.431, 0.877 ],
            [ 0.557, 0.239, 0.743 ]
        ];
        const cacheKey = patchCacheKey(
            cluster, patchSource, patchCellSize, constructionMinimumDoubleArea, options, originFractions
        );
        const cached = patchCache?.get( cacheKey );
        if ( cached )
        {
            // Port ids contain the transient cluster index. Geometry is exact-
            // key reusable, but loop identity must be rebound against the
            // current cluster after structural merges renumber clusters.
            const loopAssignments = assignLoopsToPorts(
                cached.patch, clusterPorts, clippingTolerance, options
            );
            const offset = appendPatch( output, cached.patch, globalOwnerIndex, globalEdgeIndex );
            for ( const [ portId, loop ] of loopAssignments )
            {
                globalPortLoops.set( portId, loop.map( ( index ) => index + offset ) );
            }
            patchCacheHits++;
            patchStats.push( {
                ...cached.patchStat,
                clusterId: cluster.id,
                cacheHit: true,
                portLoopAssignments: loopAssignments.diagnostics,
                sparseAttempts: [],
                cachedCapacityRetries: cached.patchStat.capacityRetries ?? [],
                capacityRetries: [],
                sparseElapsedMs: 0,
                sparseCandidateCells: 0,
                sparseLatticeSamples: 0
            } );
            continue;
        }
        const sparseAttempts = [];
        const meshPatch = ( source, phase, retryTopology ) => {
            let best = null;
            let firstTopology = null;
            for ( let originIndex = 0; originIndex < originFractions.length; originIndex += 1 )
            {
                const fraction = originFractions[ originIndex ];
                const origin = [
                    configuredOrigin.x + fraction[ 0 ] * patchCellSize,
                    configuredOrigin.y + fraction[ 1 ] * patchCellSize,
                    configuredOrigin.z + fraction[ 2 ] * patchCellSize
                ];
                let candidate;
                try
                {
                    candidate = buildSparseUnionMesh( source, {
                        cellSize: patchCellSize,
                        paddingCells: options.patchPaddingCells ?? 0.35,
                        maxCells: options.maxPatchCells ?? 250_000,
                        origin
                    } );
                }
                catch ( error )
                {
                    if ( error?.code !== 'SPARSE_MAX_CELLS_EXCEEDED' ) throw error;
                    const previousCellSize = patchCellSize;
                    const nextCellSize = Math.min(
                        maximumPatchCellSize,
                        previousCellSize * patchCapacityCellGrowth
                    );
                    const canRetry = capacityRetries.length < maximumPatchCapacityRetries
                        && nextCellSize > previousCellSize * ( 1 + 1e-12 );
                    const diagnostic = {
                        phase,
                        originIndex,
                        previousCellSize,
                        nextCellSize: canRetry ? nextCellSize : null,
                        minimumRadius,
                        minimumRadiusCellsBefore: minimumRadius / previousCellSize,
                        minimumRadiusCellsAfter: canRetry ? minimumRadius / nextCellSize : null,
                        observedCandidateCells: error.observedCandidateCells,
                        limit: error.limit,
                        segmentIndex: error.segmentIndex,
                        inputSegmentIndex: error.inputSegmentIndex,
                        bounds: error.bounds,
                        partialStats: error.partialStats
                    };
                    if ( !canRetry )
                    {
                        error.hybridPatchCapacity = {
                            clusterId: cluster.id,
                            nodeIds: [ ...cluster.nodeIds ],
                            requestedCellSize: requestedPatchCellSize,
                            currentCellSize: previousCellSize,
                            maximumCellSize: maximumPatchCellSize,
                            minimumRadius,
                            minimumPatchRadiusCells,
                            retries: [ ...capacityRetries, diagnostic ]
                        };
                        throw error;
                    }
                    capacityRetries.push( diagnostic );
                    patchCellSize = nextCellSize;
                    // Cell capacity is a property of this complete local field,
                    // not of one lattice phase. Restart the phase so every
                    // candidate compared below uses the same resolution.
                    return meshPatch( source, phase, retryTopology );
                }
                firstTopology ??= candidate.stats.topology;
                const areaAudit = bufferedAreaAudit(
                    candidate.positions, candidate.indices, constructionMinimumDoubleArea
                );
                const topologyValid = closedGenusZeroPatch( candidate );
                const normalAudit = topologyValid && areaAudit.negligibleFaces === 0
                    ? normalCompatibilityAudit( candidate.positions, candidate.indices )
                    : { opposedFaces: Number.POSITIVE_INFINITY, minimumAverageDot: null, samples: [] };
                sparseAttempts.push( {
                    phase,
                    originIndex,
                    origin,
                    cellSize: patchCellSize,
                    elapsedMs: candidate.stats.elapsedMs,
                    candidateCells: candidate.stats.candidateCells,
                    latticeSamples: candidate.stats.latticeSamples,
                    vertices: candidate.stats.vertices,
                    triangles: candidate.stats.triangles,
                    topology: candidate.stats.topology,
                    areaAudit,
                    normalAudit
                } );
                const score = Number( !topologyValid ) * 1e12
                    + areaAudit.negligibleFaces * 1e6
                    + normalAudit.opposedFaces;
                if ( !best || score < best.score )
                {
                    best = { patch: candidate, areaAudit, normalAudit, score };
                }
                if ( topologyValid
                    && areaAudit.negligibleFaces === 0
                    && normalAudit.opposedFaces === 0 )
                {
                    return { patch: candidate, areaAudit, normalAudit, firstTopology };
                }
                // Authored handles are a semantic-field problem, not a reason
                // to spend several lattice passes. Only clean-topology slivers
                // receive origin retries before the star fallback is selected.
                if ( originIndex === 0 && !retryTopology && !topologyValid ) break;
            }
            return { ...best, firstTopology };
        };
        let patchResult = meshPatch( patchSource, 'authored', false );
        let patch = patchResult.patch;
        let rawAreaAudit = patchResult.areaAudit;
        let rawNormalAudit = patchResult.normalAudit;
        const authoredPatchTopology = patchResult.firstTopology;
        let topologyFallback = false;
        let fallbackHubInflation = 1;
        if ( !closedGenusZeroPatch( patch )
            || rawAreaAudit.negligibleFaces !== 0
            || rawNormalAudit.opposedFaces !== 0 )
        {
            patchSource = buildStarPatchSource(
                cluster,
                edges,
                clusterPorts,
                portData.internalEdgesByCluster.get( cluster.index ),
                options
            );
            patchResult = meshPatch( patchSource, 'fallback-1', true );
            patch = patchResult.patch;
            rawAreaAudit = patchResult.areaAudit;
            rawNormalAudit = patchResult.normalAudit;
            topologyFallback = true;
            while ( ( !closedGenusZeroPatch( patch )
                || rawAreaAudit.negligibleFaces !== 0
                || rawNormalAudit.opposedFaces !== 0 )
                && fallbackHubInflation < ( options.maximumFallbackHubInflation ?? 4.5 ) )
            {
                const step = 1.42;
                fallbackHubInflation *= step;
                const ownershipRays = patchSource.ownershipRays;
                patchSource = patchSource.map( ( segment ) => ( {
                    ...segment,
                    a: segment.fallbackHub
                        ? { ...segment.a, radius: segment.radiusA * step }
                        : segment.a,
                    radiusA: segment.fallbackHub ? segment.radiusA * step : segment.radiusA
                } ) );
                patchSource.ownershipRays = ownershipRays;
                patchResult = meshPatch(
                    patchSource,
                    `fallback-${fallbackHubInflation.toFixed( 6 )}`,
                    true
                );
                patch = patchResult.patch;
                rawAreaAudit = patchResult.areaAudit;
                rawNormalAudit = patchResult.normalAudit;
            }
        }
        const rawPatchTopology = patch.stats.topology;
        if ( !closedGenusZeroPatch( patch )
            || rawAreaAudit.negligibleFaces !== 0
            || rawNormalAudit.opposedFaces !== 0 )
        {
            const error = new Error(
                `semantic cluster ${cluster.id} cannot produce a genus-zero local patch `
                + `(components=${rawPatchTopology.connectedComponents}, genus=${rawPatchTopology.genus}; `
                + `negligibleFaces=${rawAreaAudit.negligibleFaces}; `
                + `opposedFaces=${rawNormalAudit.opposedFaces}; `
                + `fallback=${topologyFallback}; primitives=${JSON.stringify( patchSource.map( ( segment ) => ( {
                    a: segment.a, b: segment.b, radiusA: segment.radiusA, radiusB: segment.radiusB,
                    clipPlane: segment.clipPlane
                } ) ) )})`
            );
            error.patchSource = patchSource;
            error.cluster = cluster;
            throw error;
        }
        patch = removePlanarPortCaps( patch );
        const removedCapFaces = patch.removedFaces;
        const retainedCapFragments = patch.retainedCapFragments;
        const retainedCapFragmentFaces = patch.retainedCapFragmentFaces;
        const removedCapIslands = patch.removedCapIslands;
        const removedCapIslandFaces = patch.removedCapIslandFaces;
        if ( topologyFallback )
        {
            patch = relabelStarPatchProvenance( patch, patchSource.ownershipRays );
        }
        patch = compactMesh( patch );
        const postCapAreaAudit = bufferedAreaAudit(
            patch.positions, patch.indices, constructionMinimumDoubleArea
        );
        if ( postCapAreaAudit.negligibleFaces !== 0 )
        {
            throw new Error(
                `semantic cluster ${cluster.id} retained ${postCapAreaAudit.negligibleFaces} `
                + 'Float32-negligible face(s) after cap removal'
            );
        }
        const postCapTopology = openTopologyStats( patch.positions.length / 3, patch.indices );
        const expectedEulerCharacteristic = 2 - clusterPorts.length;
        if ( postCapTopology.connectedComponents !== 1
            || postCapTopology.boundaryLoops !== clusterPorts.length
            || postCapTopology.openBoundaryChains !== 0
            || postCapTopology.nonManifoldEdges !== 0
            || postCapTopology.nonManifoldVertices !== 0
            || postCapTopology.eulerCharacteristic !== expectedEulerCharacteristic
            || postCapTopology.genus !== 0 )
        {
            throw new Error(
                `semantic cluster ${cluster.id} cap removal is not a genus-zero patch `
                + `(expectedPorts=${clusterPorts.length}; topology=${JSON.stringify( postCapTopology )})`
            );
        }
        const loopAssignments = assignLoopsToPorts( patch, clusterPorts, clippingTolerance, options );
        const offset = appendPatch( output, patch, globalOwnerIndex, globalEdgeIndex );
        for ( const [ portId, loop ] of loopAssignments )
        {
            globalPortLoops.set( portId, loop.map( ( index ) => index + offset ) );
        }
        const patchStat = {
            clusterId: cluster.id,
            cacheHit: false,
            nodes: cluster.nodeIds.length,
            ports: clusterPorts.length,
            primitives: patchSource.length,
            requestedCellSize: requestedPatchCellSize,
            cellSize: patchCellSize,
            minimumRadius,
            minimumRadiusCells: minimumRadius / patchCellSize,
            capacityRetries,
            removedCapFaces,
            retainedCapFragments,
            retainedCapFragmentFaces,
            removedCapIslands,
            removedCapIslandFaces,
            topologyFallback,
            fallbackHubInflation,
            authoredTopology: authoredPatchTopology,
            rawTopology: rawPatchTopology,
            rawAreaAudit,
            rawNormalAudit,
            postCapTopology,
            postCapAreaAudit,
            sparseAttempts,
            sparseElapsedMs: sparseAttempts.reduce( ( sum, attempt ) => sum + attempt.elapsedMs, 0 ),
            sparseCandidateCells: sparseAttempts.reduce(
                ( sum, attempt ) => sum + attempt.candidateCells, 0
            ),
            sparseLatticeSamples: sparseAttempts.reduce(
                ( sum, attempt ) => sum + attempt.latticeSamples, 0
            ),
            expectedPortLoops: clusterPorts.length,
            portLoopAssignments: loopAssignments.diagnostics,
            vertices: patch.positions.length / 3,
            triangles: patch.indices.length / 3
        };
        patchStats.push( patchStat );
        patchCache?.set( cacheKey, { patch, patchStat } );
    }

    output.seamNormals = buildBoundarySeamNormals( output, globalPortLoops );
    output.patchSpatialIndex = buildPatchSpatialIndex(
        output,
        Math.max( options.cellSize ?? 0.04, options.minimumCellSize ?? 0.012 ) * 2.5
    );
    const shortCollarFailures = [];
    for ( const span of portData.spanEdges )
    {
        const edge = edges[ span.edgeLocalIndex ];
        const owner = globalOwnerIndex( edge.id );
        const edgeOwner = globalEdgeIndex( edge.edgeIndex );
        const checkpoint = {
            positions: output.positions.length,
            indices: output.indices.length,
            faceOwners: output.faceOwners.length,
            vertexOwners: output.vertexOwners.length,
            faceEdges: output.faceEdges.length,
            vertexEdges: output.vertexEdges.length,
            bridgeStats: output.bridgeStats.length
        };
        try
        {
            appendTube(
                output, edge, span.startPort, span.endPort,
                globalPortLoops.get( span.startPort.id ),
                globalPortLoops.get( span.endPort.id ),
                owner, edgeOwner, options
            );
        }
        catch ( error )
        {
            if ( error.code !== 'HYBRID_COLLAR_SPAN_TOO_SHORT' ) throw error;
            for ( const [ field, lengthValue ] of Object.entries( checkpoint ) )
            {
                output[ field ].length = lengthValue;
            }
            shortCollarFailures.push( {
                edgeLocalIndex: error.edgeLocalIndex ?? edge.localIndex,
                edgeId: error.edgeId ?? edge.id,
                edgeIndex: error.edgeIndex ?? edge.edgeIndex,
                portId: error.portId ?? null,
                side: error.side ?? null,
                portRadius: error.portRadius ?? null,
                collarSpanDiagnostics: error.collarSpanDiagnostics ?? null,
                bridgeDiagnostics: error.bridgeDiagnostics ?? null,
                message: error.message
            } );
        }
    }
    if ( shortCollarFailures.length > 0 )
    {
        const error = new Error(
            `${shortCollarFailures.length} semantic span(s) cannot accommodate validated collars`
        );
        error.code = 'HYBRID_COLLAR_SPANS_TOO_SHORT';
        error.failures = shortCollarFailures;
        throw error;
    }

    const orientation = orientFaces( output.positions, output.indices );
    const positionArray = new Float32Array( output.positions );
    const indexArray = new Uint32Array( output.indices );
    const meshScale = positionBufferScale( positionArray );
    const minimumDoubleArea = Math.max( meshScale * meshScale * 1e-14, 1e-18 );
    if ( constructionMinimumDoubleArea < minimumDoubleArea )
    {
        throw new Error(
            `construction area threshold ${constructionMinimumDoubleArea} did not bound `
            + `final audit threshold ${minimumDoubleArea}`
        );
    }
    const finalAreaAudit = bufferedAreaAudit(
        positionArray, indexArray, minimumDoubleArea
    );
    if ( finalAreaAudit.negligibleFaces !== 0 )
    {
        throw new Error(
            `final Float32 mesh contains ${finalAreaAudit.negligibleFaces} audit-negligible face(s)`
        );
    }
    const faceOwnerArray = new Int32Array( output.faceOwners );
    const faceEdgeArray = new Int32Array( output.faceEdges );
    const ownerProvenance = makeVertexProvenance( positionArray.length / 3, indexArray, faceOwnerArray );
    const edgeProvenance = makeVertexProvenance( positionArray.length / 3, indexArray, faceEdgeArray );
    const topology = topologyStats( positionArray.length / 3, indexArray );
    const normalArray = createNormals( positionArray, indexArray, true );
    const clusterSummaries = clusterData.clusters.map( ( cluster ) => {
        const incidentEdgeIndices = new Set( portData.internalEdgesByCluster.get( cluster.index ) );
        for ( const port of portData.portsByCluster.get( cluster.index ) )
        {
            incidentEdgeIndices.add( port.edgeLocalIndex );
        }
        return {
            ...cluster,
            portIds: portData.portsByCluster.get( cluster.index ).map( ( port ) => port.id ),
            ownerIds: [ ...incidentEdgeIndices ].map( ( index ) => edges[ index ].id ),
            edgeIds: [ ...incidentEdgeIndices ].map( ( index ) => edges[ index ].edgeIndex )
        };
    } );
    const allowedOwnerPairKeys = new Set();
    const allowedOwnerPairs = [];
    for ( const cluster of clusterSummaries )
    {
        for ( let first = 0; first < cluster.ownerIds.length; first += 1 )
        {
            for ( let second = first + 1; second < cluster.ownerIds.length; second += 1 )
            {
                const pair = [ cluster.ownerIds[ first ], cluster.ownerIds[ second ] ];
                const key = pair.map( String ).sort().join( '\u0000' );
                if ( allowedOwnerPairKeys.has( key ) ) continue;
                allowedOwnerPairKeys.add( key );
                allowedOwnerPairs.push( pair );
            }
        }
    }
    const finishedAt = globalThis.performance?.now?.() ?? Date.now();
    return {
        positions: positionArray,
        indices: indexArray,
        normals: normalArray,
        faceOwners: faceOwnerArray,
        vertexOwners: ownerProvenance.primary,
        faceEdges: faceEdgeArray,
        vertexEdges: edgeProvenance.primary,
        vertexOwnerOffsets: ownerProvenance.offsets,
        vertexOwnerValues: ownerProvenance.values,
        vertexEdgeOffsets: edgeProvenance.offsets,
        vertexEdgeValues: edgeProvenance.values,
        ownerIds,
        edgeIds,
        clusters: clusterSummaries,
        allowedOwnerPairs,
        ports: portData.ports.map( ( port ) => ( {
            id: port.id,
            clusterIndex: port.clusterIndex,
            edgeId: port.edgeId,
            edgeIndex: port.edgeIndex,
            side: port.side,
            center: port.center,
            radius: port.radius,
            outward: port.outward
        } ) ),
        stats: {
            algorithm: 'semantic-local-union-plus-explicit-parallel-transport-tubes',
            inputEdges: sampledEdges.length,
            validEdges: edges.length,
            semanticNodes: incidence.size,
            junctionClusters: clusterData.clusters.length,
            absorbedEdges: edges.length - portData.spanEdges.length,
            explicitSpans: portData.spanEdges.length,
            adjustedClusterPorts,
            patches: patchStats,
            sparseMeshing: {
                cacheHits: patchCacheHits,
                cacheMisses: patchStats.length - patchCacheHits,
                attempts: patchStats.reduce(
                    ( sum, patch ) => sum + patch.sparseAttempts.length, 0
                ),
                originRetries: patchStats.reduce(
                    ( sum, patch ) => sum + Math.max( 0, patch.sparseAttempts.length - 1 ), 0
                ),
                capacityRetries: patchStats.reduce(
                    ( sum, patch ) => sum + ( patch.capacityRetries?.length ?? 0 ), 0
                ),
                elapsedMs: patchStats.reduce( ( sum, patch ) => sum + patch.sparseElapsedMs, 0 ),
                candidateCells: patchStats.reduce(
                    ( sum, patch ) => sum + patch.sparseCandidateCells, 0
                ),
                latticeSamples: patchStats.reduce(
                    ( sum, patch ) => sum + patch.sparseLatticeSamples, 0
                )
            },
            bridges: output.bridgeStats,
            vertices: positionArray.length / 3,
            triangles: indexArray.length / 3,
            orientationRepair: orientation,
            topology,
            normalSolver: normalArray.solverDiagnostics,
            meshScale,
            minimumDoubleArea,
            constructionMinimumDoubleArea,
            finalAreaAudit,
            elapsedMs: finishedAt - startedAt
        }
    };
}

export function buildHybridTreeMesh( sampledEdges, options = {} )
{
    const forcedMergeEdgeKeys = new Set( options._forcedMergeEdgeKeys ?? [] );
    const portDepthOffsets = { ...( options._portDepthOffsets ?? {} ) };
    const patchCache = options._patchCache instanceof Map ? options._patchCache : new Map();
    const feedbackCounts = new Map();
    const structuralFeedback = [];
    const maximumAttempts = Math.max( 2, sampledEdges.length * 3 + 1 );
    const edgeKey = ( value ) => `${typeof value.edgeId}:${String( value.edgeId )}`
        + `|${typeof value.edgeIndex}:${String( value.edgeIndex )}`;
    for ( let attempt = 0; attempt < maximumAttempts; attempt += 1 )
    {
        try
        {
            const result = buildHybridTreeMeshAttempt( sampledEdges, {
                ...options,
                _forcedMergeEdgeKeys: [ ...forcedMergeEdgeKeys ],
                _portDepthOffsets: portDepthOffsets,
                _patchCache: patchCache
            } );
            result.stats.structuralRetries = attempt;
            result.stats.structuralFeedback = structuralFeedback;
            return result;
        }
        catch ( error )
        {
            if ( error.code === 'HYBRID_PORT_NOT_ISOLATED' )
            {
                const signature = `${edgeKey( error )}|${error.portId ?? ''}`;
                const count = ( feedbackCounts.get( signature ) ?? 0 ) + 1;
                feedbackCounts.set( signature, count );
                const advancePorts = error.advancePorts?.length > 0
                    ? error.advancePorts
                    : [ {
                        edgeId: error.edgeId,
                        edgeIndex: error.edgeIndex,
                        side: error.portId?.endsWith( ':end' ) ? 'end' : 'start',
                        radius: error.portRadius
                    } ];
                if ( count <= ( options.postMeshPortAdvanceAttempts ?? 2 ) )
                {
                    const advances = [];
                    for ( const port of advancePorts )
                    {
                        const key = `${edgeKey( port )}|${port.side}`;
                        const increment = Math.max(
                            ( options.cellSize ?? 0.04 ) * 1.25,
                            ( port.radius ?? error.portRadius ?? 0 ) * 0.65
                        );
                        portDepthOffsets[ key ] = ( portDepthOffsets[ key ] ?? 0 ) + increment;
                        advances.push( { key, increment, total: portDepthOffsets[ key ] } );
                    }
                    structuralFeedback.push( {
                        attempt,
                        action: 'advance-sibling-ports',
                        portId: error.portId,
                        reason: error.message,
                        advances
                    } );
                    continue;
                }
                const merged = [];
                for ( const port of advancePorts )
                {
                    const key = edgeKey( port );
                    forcedMergeEdgeKeys.add( key );
                    merged.push( key );
                }
                structuralFeedback.push( {
                    attempt,
                    action: 'merge-non-isolated-port-edges',
                    portId: error.portId,
                    reason: error.message,
                    edges: merged
                } );
                continue;
            }
            if ( error.code === 'HYBRID_COLLAR_SPAN_TOO_SHORT' )
            {
                const key = edgeKey( error );
                if ( forcedMergeEdgeKeys.has( key ) ) throw error;
                forcedMergeEdgeKeys.add( key );
                structuralFeedback.push( {
                    attempt,
                    action: 'merge-short-collar-span',
                    edge: key
                } );
                continue;
            }
            if ( error.code === 'HYBRID_COLLAR_SPANS_TOO_SHORT' )
            {
                const merged = [];
                for ( const failure of error.failures ?? [] )
                {
                    const key = edgeKey( failure );
                    if ( forcedMergeEdgeKeys.has( key ) ) continue;
                    forcedMergeEdgeKeys.add( key );
                    merged.push( key );
                }
                if ( merged.length === 0 )
                {
                    error.structuralFeedback = [ ...structuralFeedback ];
                    throw error;
                }
                structuralFeedback.push( {
                    attempt,
                    action: 'merge-short-collar-spans',
                    edges: merged,
                    failures: error.failures
                } );
                continue;
            }
            error.structuralFeedback = [ ...structuralFeedback ];
            error.message += ` (structuralFeedback=${JSON.stringify( structuralFeedback )})`;
            throw error;
        }
    }
    const error = new Error( `hybrid tree meshing did not converge after ${maximumAttempts} structural retries` );
    error.structuralFeedback = structuralFeedback;
    throw error;
}


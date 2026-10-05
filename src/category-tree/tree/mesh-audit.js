/**
 * Deterministic topology and numerical audit for an indexed THREE.BufferGeometry.
 *
 * The implementation deliberately depends only on the BufferGeometry/BufferAttribute
 * interface, so it can run in the browser and in Node without a WebGL context.
 * It never mutates the supplied geometry.
 *
 * Optional provenance has this shape:
 *
 * {
 *   triangleOwners: Array<Owner>, // `faceOwners` is accepted as an alias
 *   vertexOwners: Array<Owner>,
 *   triangleEdges: Array<Owner>,  // `faceEdges` is accepted as an alias
 *   vertexEdges: Array<Owner>,
 *   ownerIds: Array<Owner>,       // optional lookup tables for integer arrays
 *   edgeIds: Array<Owner>,
 *   expectedOwners: Iterable<string | number>,
 *   expectedEdgeIds: Iterable<string | number>,
 *   expectedNodeIds: Iterable<string | number>,
 *   allowedOwnerPairs: Iterable<[string | number, string | number]>,
 *   isContactAllowed: (leftOwner, rightOwner) => boolean
 * }
 *
 * An Owner may be a primitive owner id or an object containing ownerId/ownerIds,
 * edgeId/edgeIds, and nodeId/nodeIds. Cross-owner surface edges are only judged
 * when allowedOwnerPairs or isContactAllowed is supplied. This lets the surface
 * builder preserve edge/node correspondence and explicitly define which skeleton
 * neighbours may meet; an adjacency between any other owners is reported as an
 * unintended fusion.
 */

const DEFAULT_MAX_DETAILS = 24;

class UnionFind
{
    constructor( size )
    {
        this.parent = new Int32Array( size );
        this.rank = new Uint8Array( size );
        for ( let index = 0; index < size; index += 1 )
        {
            this.parent[ index ] = index;
        }
    }

    find( value )
    {
        let root = value;
        while ( this.parent[ root ] !== root )
        {
            root = this.parent[ root ];
        }
        while ( this.parent[ value ] !== value )
        {
            const parent = this.parent[ value ];
            this.parent[ value ] = root;
            value = parent;
        }
        return root;
    }

    union( left, right )
    {
        let leftRoot = this.find( left );
        let rightRoot = this.find( right );
        if ( leftRoot === rightRoot )
        {
            return leftRoot;
        }
        if ( this.rank[ leftRoot ] < this.rank[ rightRoot ] )
        {
            [ leftRoot, rightRoot ] = [ rightRoot, leftRoot ];
        }
        this.parent[ rightRoot ] = leftRoot;
        if ( this.rank[ leftRoot ] === this.rank[ rightRoot ] )
        {
            this.rank[ leftRoot ] += 1;
        }
        return leftRoot;
    }
}

class PackedEdgeStore
{
    constructor( maximumOccurrences, base )
    {
        this.base = base;
        this.keys = new Map();
        this.a = new Uint32Array( maximumOccurrences );
        this.b = new Uint32Array( maximumOccurrences );
        this.head = new Int32Array( maximumOccurrences );
        this.tail = new Int32Array( maximumOccurrences );
        this.useCount = new Uint32Array( maximumOccurrences );
        this.incidenceTriangle = new Uint32Array( maximumOccurrences );
        this.incidenceDirection = new Int8Array( maximumOccurrences );
        this.incidenceNext = new Int32Array( maximumOccurrences );
        this.head.fill( -1 );
        this.tail.fill( -1 );
        this.incidenceNext.fill( -1 );
        this.edgeCount = 0;
        this.incidenceCount = 0;
    }

    add( from, to, triangle )
    {
        const a = Math.min( from, to );
        const b = Math.max( from, to );
        const key = edgeKey( a, b, this.base );
        let edge = this.keys.get( key );
        if ( edge === undefined )
        {
            edge = this.edgeCount++;
            this.keys.set( key, edge );
            this.a[ edge ] = a;
            this.b[ edge ] = b;
        }
        const incidence = this.incidenceCount++;
        this.incidenceTriangle[ incidence ] = triangle;
        this.incidenceDirection[ incidence ] = from === a ? 1 : -1;
        if ( this.tail[ edge ] >= 0 )
        {
            this.incidenceNext[ this.tail[ edge ] ] = incidence;
        }
        else
        {
            this.head[ edge ] = incidence;
        }
        this.tail[ edge ] = incidence;
        this.useCount[ edge ] += 1;
        return edge;
    }

    forEachIncidence( edge, callback )
    {
        let incidence = this.head[ edge ];
        let index = 0;
        while ( incidence >= 0 )
        {
            callback(
                this.incidenceTriangle[ incidence ],
                this.incidenceDirection[ incidence ],
                index,
                incidence
            );
            incidence = this.incidenceNext[ incidence ];
            index += 1;
        }
    }

    incidenceTriangles( edge )
    {
        const result = [];
        this.forEachIncidence( edge, ( triangle ) => result.push( triangle ) );
        return result;
    }
}

function now()
{
    return globalThis.performance?.now?.() ?? Date.now();
}

function finiteNumber( value )
{
    return typeof value === 'number' && Number.isFinite( value );
}

function readAttribute3( attribute, index, target )
{
    if ( typeof attribute.getX === 'function' )
    {
        target[ 0 ] = attribute.getX( index );
        target[ 1 ] = attribute.getY( index );
        target[ 2 ] = attribute.getZ( index );
        return target;
    }
    const offset = index * attribute.itemSize;
    target[ 0 ] = attribute.array[ offset ];
    target[ 1 ] = attribute.array[ offset + 1 ];
    target[ 2 ] = attribute.array[ offset + 2 ];
    return target;
}

function copyAttribute3( attribute )
{
    const values = new Float64Array( attribute.count * 3 );
    const scratch = [ 0, 0, 0 ];
    for ( let index = 0; index < attribute.count; index += 1 )
    {
        readAttribute3( attribute, index, scratch );
        const offset = index * 3;
        values[ offset ] = scratch[ 0 ];
        values[ offset + 1 ] = scratch[ 1 ];
        values[ offset + 2 ] = scratch[ 2 ];
    }
    return values;
}

function getIndexArray( geometry )
{
    const index = geometry.index;
    if ( !index )
    {
        throw new TypeError( 'Mesh audit requires an indexed BufferGeometry.' );
    }
    if ( index.array )
    {
        return { array: index.array, count: index.count ?? index.array.length };
    }
    if ( ArrayBuffer.isView( index ) || Array.isArray( index ) )
    {
        return { array: index, count: index.length };
    }
    throw new TypeError( 'Geometry index must expose an array and count.' );
}

function getPositionAttribute( geometry )
{
    const position = geometry.getAttribute?.( 'position' ) ?? geometry.attributes?.position;
    if ( !position || position.itemSize < 3 )
    {
        throw new TypeError( 'Mesh audit requires a position attribute with itemSize >= 3.' );
    }
    return position;
}

function getNormalAttribute( geometry )
{
    return geometry.getAttribute?.( 'normal' ) ?? geometry.attributes?.normal ?? null;
}

function positionAt( positions, index )
{
    const offset = index * 3;
    return [ positions[ offset ], positions[ offset + 1 ], positions[ offset + 2 ] ];
}

function triangleCross( positions, a, b, c )
{
    const ao = a * 3;
    const bo = b * 3;
    const co = c * 3;
    const abx = positions[ bo ] - positions[ ao ];
    const aby = positions[ bo + 1 ] - positions[ ao + 1 ];
    const abz = positions[ bo + 2 ] - positions[ ao + 2 ];
    const acx = positions[ co ] - positions[ ao ];
    const acy = positions[ co + 1 ] - positions[ ao + 1 ];
    const acz = positions[ co + 2 ] - positions[ ao + 2 ];
    return [
        aby * acz - abz * acy,
        abz * acx - abx * acz,
        abx * acy - aby * acx
    ];
}

function vectorLength( vector )
{
    return Math.hypot( vector[ 0 ], vector[ 1 ], vector[ 2 ] );
}

function edgeKey( a, b, base )
{
    const low = Math.min( a, b );
    const high = Math.max( a, b );
    return low * base + high;
}

function addSample( samples, value, maximum )
{
    if ( samples.length < maximum )
    {
        samples.push( value );
    }
}

function idKey( value )
{
    return `${typeof value}:${String( value )}`;
}

function pairKey( left, right )
{
    const leftKey = idKey( left );
    const rightKey = idKey( right );
    return leftKey < rightKey
        ? JSON.stringify( [ leftKey, rightKey ] )
        : JSON.stringify( [ rightKey, leftKey ] );
}

function iterableValues( value )
{
    if ( value == null )
    {
        return [];
    }
    if ( typeof value === 'string' || typeof value === 'number' )
    {
        return [ value ];
    }
    return Array.from( value );
}

function normaliseOwner( raw )
{
    const result = {
        raw,
        owners: [],
        edgeIds: [],
        nodeIds: []
    };
    if ( raw == null )
    {
        return result;
    }
    if ( typeof raw !== 'object' )
    {
        result.owners.push( raw );
        return result;
    }
    result.owners.push( ...iterableValues( raw.ownerIds ?? raw.ownerId ) );
    result.edgeIds.push( ...iterableValues( raw.edgeIds ?? raw.edgeId ) );
    result.nodeIds.push( ...iterableValues( raw.nodeIds ?? raw.nodeId ) );
    if ( result.owners.length === 0 )
    {
        result.owners.push( ...result.edgeIds );
    }
    return result;
}

function buildCoincidentVertexReport( positions, finiteVertices, tolerance, maxDetails )
{
    const vertexCount = finiteVertices.length;
    const cells = new Map();
    const union = new UnionFind( vertexCount );
    const samples = [];
    let pairCount = 0;
    let exactPairCount = 0;
    const toleranceSquared = tolerance * tolerance;

    for ( let vertex = 0; vertex < vertexCount; vertex += 1 )
    {
        if ( !finiteVertices[ vertex ] )
        {
            continue;
        }
        const offset = vertex * 3;
        const x = positions[ offset ];
        const y = positions[ offset + 1 ];
        const z = positions[ offset + 2 ];
        const cellX = Math.floor( x / tolerance );
        const cellY = Math.floor( y / tolerance );
        const cellZ = Math.floor( z / tolerance );

        for ( let dx = -1; dx <= 1; dx += 1 )
        {
            for ( let dy = -1; dy <= 1; dy += 1 )
            {
                for ( let dz = -1; dz <= 1; dz += 1 )
                {
                    const candidates = cells.get( `${cellX + dx},${cellY + dy},${cellZ + dz}` );
                    if ( !candidates )
                    {
                        continue;
                    }
                    for ( const other of candidates )
                    {
                        const otherOffset = other * 3;
                        const deltaX = x - positions[ otherOffset ];
                        const deltaY = y - positions[ otherOffset + 1 ];
                        const deltaZ = z - positions[ otherOffset + 2 ];
                        const distanceSquared = deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ;
                        if ( distanceSquared <= toleranceSquared )
                        {
                            pairCount += 1;
                            if ( distanceSquared === 0 )
                            {
                                exactPairCount += 1;
                            }
                            union.union( vertex, other );
                            addSample( samples, {
                                vertices: [ other, vertex ],
                                distance: Math.sqrt( distanceSquared )
                            }, maxDetails );
                        }
                    }
                }
            }
        }

        const ownKey = `${cellX},${cellY},${cellZ}`;
        let ownCell = cells.get( ownKey );
        if ( !ownCell )
        {
            ownCell = [];
            cells.set( ownKey, ownCell );
        }
        ownCell.push( vertex );
    }

    const groups = new Map();
    if ( pairCount > 0 )
    {
        for ( let vertex = 0; vertex < vertexCount; vertex += 1 )
        {
            const root = union.find( vertex );
            if ( root === vertex )
            {
                continue;
            }
            const members = groups.get( root ) ?? [ root ];
            members.push( vertex );
            groups.set( root, members );
        }
    }

    return {
        tolerance,
        pairCount,
        exactPairCount,
        groupCount: groups.size,
        samples,
        groupSamples: Array.from( groups.values() ).slice( 0, maxDetails )
    };
}

function buildBoundarySummary( boundaryEdges, edgeStore )
{
    if ( boundaryEdges.length === 0 )
    {
        return { componentCount: 0, loopCount: 0, openChainCount: 0 };
    }
    const adjacency = new Map();
    for ( const edge of boundaryEdges )
    {
        const a = edgeStore ? edgeStore.a[ edge ] : edge.a;
        const b = edgeStore ? edgeStore.b[ edge ] : edge.b;
        for ( const [ from, to ] of [ [ a, b ], [ b, a ] ] )
        {
            const neighbours = adjacency.get( from ) ?? [];
            neighbours.push( to );
            adjacency.set( from, neighbours );
        }
    }
    const visited = new Set();
    let componentCount = 0;
    let loopCount = 0;
    let openChainCount = 0;
    for ( const start of adjacency.keys() )
    {
        if ( visited.has( start ) )
        {
            continue;
        }
        componentCount += 1;
        let loop = true;
        const stack = [ start ];
        visited.add( start );
        while ( stack.length > 0 )
        {
            const vertex = stack.pop();
            const neighbours = adjacency.get( vertex ) ?? [];
            if ( neighbours.length !== 2 )
            {
                loop = false;
            }
            for ( const neighbour of neighbours )
            {
                if ( !visited.has( neighbour ) )
                {
                    visited.add( neighbour );
                    stack.push( neighbour );
                }
            }
        }
        if ( loop )
        {
            loopCount += 1;
        }
        else
        {
            openChainCount += 1;
        }
    }
    return { componentCount, loopCount, openChainCount };
}

function auditProvenance(
    provenance,
    validTriangleIds,
    validTriangleCount,
    edgeStore,
    maxDetails
)
{
    if ( !provenance )
    {
        return {
            supplied: false,
            coverageComplete: null,
            contactPolicySupplied: false,
            unintendedContactEdges: null
        };
    }

    const triangleOwners = provenance.triangleOwners ?? provenance.faceOwners ?? [];
    const triangleEdges = provenance.triangleEdges ?? provenance.faceEdges ?? [];
    const vertexOwners = provenance.vertexOwners ?? [];
    const vertexEdges = provenance.vertexEdges ?? [];
    const ownerTable = provenance.ownerIds ?? null;
    const edgeTable = provenance.edgeIds ?? null;
    const representedOwners = new Set();
    const representedEdges = new Set();
    const representedNodes = new Set();
    let assignedTriangleCount = 0;
    const indexedOwnerCache = new Map();

    const addRepresentation = ( owner ) =>
    {
        for ( const value of owner.owners ) representedOwners.add( idKey( value ) );
        for ( const value of owner.edgeIds ) representedEdges.add( idKey( value ) );
        for ( const value of owner.nodeIds ) representedNodes.add( idKey( value ) );
    };

    const indexedOwnerAt = ( owners, edges, index ) =>
    {
        const ownerValue = owners[ index ];
        const edgeValue = edges[ index ];
        const cacheable = ( ownerValue == null || typeof ownerValue !== 'object' )
            && ( edgeValue == null || typeof edgeValue !== 'object' );
        const cacheKey = cacheable ? `${idKey( ownerValue )}|${idKey( edgeValue )}` : null;
        if ( cacheKey != null && indexedOwnerCache.has( cacheKey ) )
        {
            return indexedOwnerCache.get( cacheKey );
        }
        const ownerId = ownerTable && Number.isInteger( ownerValue )
            ? ownerTable[ ownerValue ]
            : ownerValue;
        const edgeId = edgeTable && Number.isInteger( edgeValue )
            ? edgeTable[ edgeValue ]
            : edgeValue;
        if ( ownerId == null && edgeId == null )
        {
            const result = normaliseOwner( null );
            if ( cacheKey != null ) indexedOwnerCache.set( cacheKey, result );
            return result;
        }
        if ( typeof ownerId === 'object' && edgeId == null )
        {
            return normaliseOwner( ownerId );
        }
        const result = normaliseOwner( {
            ownerId,
            edgeId,
            source: ownerValue
        } );
        if ( cacheKey != null ) indexedOwnerCache.set( cacheKey, result );
        return result;
    };

    for ( let index = 0; index < validTriangleCount; index += 1 )
    {
        const triangle = validTriangleIds[ index ];
        const owner = indexedOwnerAt( triangleOwners, triangleEdges, triangle );
        if ( owner.owners.length > 0 || owner.edgeIds.length > 0 || owner.nodeIds.length > 0 )
        {
            assignedTriangleCount += 1;
            addRepresentation( owner );
        }
    }
    for ( let vertex = 0; vertex < vertexOwners.length; vertex += 1 )
    {
        addRepresentation( indexedOwnerAt( vertexOwners, vertexEdges, vertex ) );
    }

    const missing = ( expected, represented ) => iterableValues( expected )
        .filter( ( value ) => !represented.has( idKey( value ) ) );
    const missingOwners = missing( provenance.expectedOwners, representedOwners );
    const missingEdgeIds = missing( provenance.expectedEdgeIds, representedEdges );
    const missingNodeIds = missing( provenance.expectedNodeIds, representedNodes );

    const allowedPairs = new Set(
        iterableValues( provenance.allowedOwnerPairs )
            .map( ( pair ) => pairKey( pair[ 0 ], pair[ 1 ] ) )
    );
    const contactPolicySupplied = provenance.allowedOwnerPairs != null
        || typeof provenance.isContactAllowed === 'function';
    let crossOwnerEdgeCount = 0;
    let unintendedContactEdges = 0;
    let unclassifiedContactEdges = 0;
    const unintendedContactSamples = [];

    const ownersOverlap = ( left, right ) =>
    {
        const rightKeys = new Set( right.owners.map( idKey ) );
        return left.owners.some( ( owner ) => rightKeys.has( idKey( owner ) ) );
    };
    const allowedByPairs = ( left, right ) => left.owners.some(
        ( leftOwner ) => right.owners.some(
            ( rightOwner ) => allowedPairs.has( pairKey( leftOwner, rightOwner ) )
        )
    );

    for ( let edge = 0; edge < edgeStore.edgeCount; edge += 1 )
    {
        if ( edgeStore.useCount[ edge ] !== 2 )
        {
            continue;
        }
        const leftIncidence = edgeStore.head[ edge ];
        const rightIncidence = edgeStore.incidenceNext[ leftIncidence ];
        const leftTriangle = edgeStore.incidenceTriangle[ leftIncidence ];
        const rightTriangle = edgeStore.incidenceTriangle[ rightIncidence ];
        const left = indexedOwnerAt( triangleOwners, triangleEdges, leftTriangle );
        const right = indexedOwnerAt( triangleOwners, triangleEdges, rightTriangle );
        if ( !left || !right || left.owners.length === 0 || right.owners.length === 0 )
        {
            unclassifiedContactEdges += 1;
            continue;
        }
        if ( ownersOverlap( left, right ) )
        {
            continue;
        }
        crossOwnerEdgeCount += 1;
        if ( !contactPolicySupplied )
        {
            continue;
        }
        const allowed = typeof provenance.isContactAllowed === 'function'
            ? provenance.isContactAllowed( left.raw, right.raw )
            : allowedByPairs( left, right );
        if ( !allowed )
        {
            unintendedContactEdges += 1;
            addSample( unintendedContactSamples, {
                edge: [ edgeStore.a[ edge ], edgeStore.b[ edge ] ],
                triangles: [ leftTriangle, rightTriangle ],
                owners: [ left.owners, right.owners ]
            }, maxDetails );
        }
    }

    const coverageComplete = assignedTriangleCount === validTriangleCount
        && missingOwners.length === 0
        && missingEdgeIds.length === 0
        && missingNodeIds.length === 0;

    return {
        supplied: true,
        triangleOwnerEntries: triangleOwners.length,
        triangleEdgeEntries: triangleEdges.length,
        vertexOwnerEntries: vertexOwners.length,
        vertexEdgeEntries: vertexEdges.length,
        assignedTriangleCount,
        unassignedTriangleCount: validTriangleCount - assignedTriangleCount,
        representedOwnerCount: representedOwners.size,
        representedEdgeCount: representedEdges.size,
        representedNodeCount: representedNodes.size,
        missingOwners,
        missingEdgeIds,
        missingNodeIds,
        coverageComplete,
        contactPolicySupplied,
        crossOwnerEdgeCount,
        unclassifiedContactEdges,
        unintendedContactEdges: contactPolicySupplied ? unintendedContactEdges : null,
        unintendedContactSamples
    };
}

function orientation2d( a, b, c )
{
    return ( b[ 0 ] - a[ 0 ] ) * ( c[ 1 ] - a[ 1 ] )
        - ( b[ 1 ] - a[ 1 ] ) * ( c[ 0 ] - a[ 0 ] );
}

function pointInTriangle2d( point, a, b, c, epsilon )
{
    const one = orientation2d( a, b, point );
    const two = orientation2d( b, c, point );
    const three = orientation2d( c, a, point );
    const hasNegative = one < -epsilon || two < -epsilon || three < -epsilon;
    const hasPositive = one > epsilon || two > epsilon || three > epsilon;
    return !( hasNegative && hasPositive );
}

function segmentsIntersect2d( a, b, c, d, epsilon )
{
    const abC = orientation2d( a, b, c );
    const abD = orientation2d( a, b, d );
    const cdA = orientation2d( c, d, a );
    const cdB = orientation2d( c, d, b );
    const oppositeSides = ( left, right ) =>
        ( left > epsilon && right < -epsilon ) || ( left < -epsilon && right > epsilon );
    if ( oppositeSides( abC, abD ) && oppositeSides( cdA, cdB ) )
    {
        return true;
    }
    const onSegment = ( point, start, end, orientation ) => Math.abs( orientation ) <= epsilon
        && point[ 0 ] >= Math.min( start[ 0 ], end[ 0 ] ) - epsilon
        && point[ 0 ] <= Math.max( start[ 0 ], end[ 0 ] ) + epsilon
        && point[ 1 ] >= Math.min( start[ 1 ], end[ 1 ] ) - epsilon
        && point[ 1 ] <= Math.max( start[ 1 ], end[ 1 ] ) + epsilon;
    return onSegment( c, a, b, abC )
        || onSegment( d, a, b, abD )
        || onSegment( a, c, d, cdA )
        || onSegment( b, c, d, cdB );
}

function coplanarTrianglesIntersect( left, right, normal, epsilon )
{
    const axis = Math.abs( normal[ 0 ] ) > Math.abs( normal[ 1 ] )
        ? ( Math.abs( normal[ 0 ] ) > Math.abs( normal[ 2 ] ) ? 0 : 2 )
        : ( Math.abs( normal[ 1 ] ) > Math.abs( normal[ 2 ] ) ? 1 : 2 );
    const project = ( point ) => axis === 0
        ? [ point[ 1 ], point[ 2 ] ]
        : axis === 1 ? [ point[ 0 ], point[ 2 ] ] : [ point[ 0 ], point[ 1 ] ];
    const l = left.map( project );
    const r = right.map( project );
    for ( let leftEdge = 0; leftEdge < 3; leftEdge += 1 )
    {
        for ( let rightEdge = 0; rightEdge < 3; rightEdge += 1 )
        {
            if ( segmentsIntersect2d(
                l[ leftEdge ], l[ ( leftEdge + 1 ) % 3 ],
                r[ rightEdge ], r[ ( rightEdge + 1 ) % 3 ], epsilon
            ) )
            {
                return true;
            }
        }
    }
    return pointInTriangle2d( l[ 0 ], r[ 0 ], r[ 1 ], r[ 2 ], epsilon )
        || pointInTriangle2d( r[ 0 ], l[ 0 ], l[ 1 ], l[ 2 ], epsilon );
}

function dot( left, right )
{
    return left[ 0 ] * right[ 0 ] + left[ 1 ] * right[ 1 ] + left[ 2 ] * right[ 2 ];
}

function subtract( left, right )
{
    return [ left[ 0 ] - right[ 0 ], left[ 1 ] - right[ 1 ], left[ 2 ] - right[ 2 ] ];
}

function cross( left, right )
{
    return [
        left[ 1 ] * right[ 2 ] - left[ 2 ] * right[ 1 ],
        left[ 2 ] * right[ 0 ] - left[ 0 ] * right[ 2 ],
        left[ 0 ] * right[ 1 ] - left[ 1 ] * right[ 0 ]
    ];
}

function segmentIntersectsTriangle( start, end, triangle, epsilon )
{
    const direction = subtract( end, start );
    const edgeOne = subtract( triangle[ 1 ], triangle[ 0 ] );
    const edgeTwo = subtract( triangle[ 2 ], triangle[ 0 ] );
    const h = cross( direction, edgeTwo );
    const determinant = dot( edgeOne, h );
    if ( Math.abs( determinant ) <= epsilon )
    {
        return false;
    }
    const inverse = 1 / determinant;
    const s = subtract( start, triangle[ 0 ] );
    const u = inverse * dot( s, h );
    if ( u < -epsilon || u > 1 + epsilon )
    {
        return false;
    }
    const q = cross( s, edgeOne );
    const v = inverse * dot( direction, q );
    if ( v < -epsilon || u + v > 1 + epsilon )
    {
        return false;
    }
    const t = inverse * dot( edgeTwo, q );
    return t >= -epsilon && t <= 1 + epsilon;
}

function trianglesIntersect( left, right, epsilon )
{
    const leftNormal = cross( subtract( left[ 1 ], left[ 0 ] ), subtract( left[ 2 ], left[ 0 ] ) );
    const rightNormal = cross( subtract( right[ 1 ], right[ 0 ] ), subtract( right[ 2 ], right[ 0 ] ) );
    const normalCross = cross( leftNormal, rightNormal );
    const normalProduct = vectorLength( leftNormal ) * vectorLength( rightNormal );
    const parallel = vectorLength( normalCross )
        <= 1e-10 * Math.max( Number.EPSILON, normalProduct );
    if ( parallel )
    {
        const planeDistance = Math.abs( dot( leftNormal, subtract( right[ 0 ], left[ 0 ] ) ) );
        if ( planeDistance > epsilon * Math.max( 1, vectorLength( leftNormal ) ) )
        {
            return false;
        }
        return coplanarTrianglesIntersect( left, right, leftNormal, epsilon );
    }
    for ( let edge = 0; edge < 3; edge += 1 )
    {
        if ( segmentIntersectsTriangle( left[ edge ], left[ ( edge + 1 ) % 3 ], right, epsilon )
            || segmentIntersectsTriangle( right[ edge ], right[ ( edge + 1 ) % 3 ], left, epsilon ) )
        {
            return true;
        }
    }
    return false;
}

function selfIntersectionFromTriangles( triangles, positions, epsilon, options, maxDetails )
{
    const settings = typeof options === 'object' ? options : {};
    if ( options !== true && settings.enabled !== true )
    {
        return {
            checked: false,
            complete: false,
            reason: 'disabled',
            intersectionCount: null
        };
    }
    const maximumTriangles = settings.maxTriangles ?? 12000;
    const maximumCandidatePairs = settings.maxCandidatePairs ?? 2000000;
    if ( triangles.length > maximumTriangles )
    {
        return {
            checked: false,
            complete: false,
            reason: `triangle limit exceeded (${triangles.length} > ${maximumTriangles})`,
            intersectionCount: null
        };
    }

    const records = triangles.map( ( triangle ) =>
    {
        const points = triangle.indices.map( ( vertex ) => positionAt( positions, vertex ) );
        return {
            triangle: triangle.triangle,
            indices: triangle.indices,
            points,
            minimum: [
                Math.min( ...points.map( ( point ) => point[ 0 ] ) ),
                Math.min( ...points.map( ( point ) => point[ 1 ] ) ),
                Math.min( ...points.map( ( point ) => point[ 2 ] ) )
            ],
            maximum: [
                Math.max( ...points.map( ( point ) => point[ 0 ] ) ),
                Math.max( ...points.map( ( point ) => point[ 1 ] ) ),
                Math.max( ...points.map( ( point ) => point[ 2 ] ) )
            ]
        };
    } ).sort( ( left, right ) => left.minimum[ 0 ] - right.minimum[ 0 ] );

    const active = [];
    const samples = [];
    let candidatePairs = 0;
    let testedPairs = 0;
    let intersectionCount = 0;
    let complete = true;

    outer:
    for ( const current of records )
    {
        for ( let index = active.length - 1; index >= 0; index -= 1 )
        {
            if ( active[ index ].maximum[ 0 ] < current.minimum[ 0 ] - epsilon )
            {
                active.splice( index, 1 );
            }
        }
        for ( const other of active )
        {
            const aabbOverlap = other.maximum[ 1 ] >= current.minimum[ 1 ] - epsilon
                && current.maximum[ 1 ] >= other.minimum[ 1 ] - epsilon
                && other.maximum[ 2 ] >= current.minimum[ 2 ] - epsilon
                && current.maximum[ 2 ] >= other.minimum[ 2 ] - epsilon;
            if ( !aabbOverlap )
            {
                continue;
            }
            candidatePairs += 1;
            if ( candidatePairs > maximumCandidatePairs )
            {
                complete = false;
                break outer;
            }
            if ( current.indices.some( ( vertex ) => other.indices.includes( vertex ) ) )
            {
                continue;
            }
            testedPairs += 1;
            if ( trianglesIntersect( current.points, other.points, epsilon ) )
            {
                intersectionCount += 1;
                addSample( samples, [ other.triangle, current.triangle ], maxDetails );
            }
        }
        active.push( current );
    }

    return {
        checked: true,
        complete,
        reason: complete ? null : 'candidate-pair budget exceeded',
        triangleCount: triangles.length,
        candidatePairs,
        testedPairs,
        intersectionCount,
        samples
    };
}

function selfIntersectionFromIndexedTriangles(
    triangleIds,
    triangleCount,
    indices,
    positions,
    epsilon,
    options,
    maxDetails
)
{
    const settings = typeof options === 'object' ? options : {};
    if ( options !== true && settings.enabled !== true )
    {
        return {
            checked: false,
            complete: false,
            reason: 'disabled',
            intersectionCount: null
        };
    }
    const maximumTriangles = settings.maxTriangles ?? 12000;
    if ( triangleCount > maximumTriangles )
    {
        return {
            checked: false,
            complete: false,
            reason: `triangle limit exceeded (${triangleCount} > ${maximumTriangles})`,
            intersectionCount: null
        };
    }
    const triangles = new Array( triangleCount );
    for ( let index = 0; index < triangleCount; index += 1 )
    {
        const triangle = triangleIds[ index ];
        const offset = triangle * 3;
        triangles[ index ] = {
            triangle,
            indices: [
                Number( indices[ offset ] ),
                Number( indices[ offset + 1 ] ),
                Number( indices[ offset + 2 ] )
            ]
        };
    }
    return selfIntersectionFromTriangles(
        triangles,
        positions,
        epsilon,
        { ...settings, enabled: true },
        maxDetails
    );
}

/**
 * Run only the optional, bounded triangle self-intersection pass.
 * This is intentionally isolated because it is considerably more expensive than
 * the linear topology audit and is not a substitute for a robust CAD kernel.
 */
export function auditTriangleSelfIntersections( geometry, options = {} )
{
    const position = getPositionAttribute( geometry );
    const positions = copyAttribute3( position );
    const { array: indices, count: indexCount } = getIndexArray( geometry );
    const triangles = [];
    let minimumX = Infinity;
    let minimumY = Infinity;
    let minimumZ = Infinity;
    let maximumX = -Infinity;
    let maximumY = -Infinity;
    let maximumZ = -Infinity;
    for ( let vertex = 0; vertex < position.count; vertex += 1 )
    {
        const offset = vertex * 3;
        const x = positions[ offset ];
        const y = positions[ offset + 1 ];
        const z = positions[ offset + 2 ];
        if ( finiteNumber( x ) && finiteNumber( y ) && finiteNumber( z ) )
        {
            minimumX = Math.min( minimumX, x );
            minimumY = Math.min( minimumY, y );
            minimumZ = Math.min( minimumZ, z );
            maximumX = Math.max( maximumX, x );
            maximumY = Math.max( maximumY, y );
            maximumZ = Math.max( maximumZ, z );
        }
    }
    const scale = Math.hypot( maximumX - minimumX, maximumY - minimumY, maximumZ - minimumZ ) || 1;
    const epsilon = options.epsilon ?? scale * 1e-10;
    for ( let offset = 0; offset + 2 < indexCount; offset += 3 )
    {
        const triangle = offset / 3;
        const tri = [ Number( indices[ offset ] ), Number( indices[ offset + 1 ] ), Number( indices[ offset + 2 ] ) ];
        if ( tri.every( ( vertex ) => Number.isInteger( vertex ) && vertex >= 0 && vertex < position.count )
            && new Set( tri ).size === 3 )
        {
            const normal = triangleCross( positions, tri[ 0 ], tri[ 1 ], tri[ 2 ] );
            if ( vectorLength( normal ) > epsilon * epsilon )
            {
                triangles.push( { triangle, indices: tri } );
            }
        }
    }
    return selfIntersectionFromTriangles(
        triangles,
        positions,
        epsilon,
        { ...options, enabled: true },
        options.maxDetails ?? DEFAULT_MAX_DETAILS
    );
}

/**
 * Audit an indexed BufferGeometry. The default expectations describe Gate 2's
 * target: one closed, consistently oriented, welded two-manifold with normals.
 * Use expectations.maxBoundaryEdges/maxBoundaryLoops to document a deliberate
 * planting boundary.
 */
export function auditIndexedGeometry( geometry, options = {} )
{
    const startedAt = now();
    const maxDetails = options.maxDetails ?? DEFAULT_MAX_DETAILS;
    const position = getPositionAttribute( geometry );
    const normal = getNormalAttribute( geometry );
    const positions = copyAttribute3( position );
    const { array: indices, count: indexCount } = getIndexArray( geometry );
    const vertexCount = position.count;
    const triangleCount = Math.floor( indexCount / 3 );
    const finiteVertices = new Uint8Array( vertexCount );
    const nonFinitePositionSamples = [];
    let nonFinitePositionVertices = 0;
    let nonFinitePositionValues = 0;
    const bounds = {
        minimum: [ Infinity, Infinity, Infinity ],
        maximum: [ -Infinity, -Infinity, -Infinity ]
    };

    for ( let vertex = 0; vertex < vertexCount; vertex += 1 )
    {
        const offset = vertex * 3;
        let finite = true;
        for ( let axis = 0; axis < 3; axis += 1 )
        {
            const value = positions[ offset + axis ];
            if ( !finiteNumber( value ) )
            {
                finite = false;
                nonFinitePositionValues += 1;
            }
            else
            {
                bounds.minimum[ axis ] = Math.min( bounds.minimum[ axis ], value );
                bounds.maximum[ axis ] = Math.max( bounds.maximum[ axis ], value );
            }
        }
        if ( finite )
        {
            finiteVertices[ vertex ] = 1;
        }
        else
        {
            nonFinitePositionVertices += 1;
            addSample( nonFinitePositionSamples, vertex, maxDetails );
        }
    }

    const finiteBounds = bounds.minimum.every( finiteNumber ) && bounds.maximum.every( finiteNumber );
    const scale = finiteBounds
        ? Math.hypot(
            bounds.maximum[ 0 ] - bounds.minimum[ 0 ],
            bounds.maximum[ 1 ] - bounds.minimum[ 1 ],
            bounds.maximum[ 2 ] - bounds.minimum[ 2 ]
        ) || 1
        : 1;
    const positionTolerance = options.positionTolerance ?? Math.max( scale * 1e-10, 1e-12 );
    const minimumDoubleArea = options.minimumDoubleArea ?? Math.max( scale * scale * 1e-14, 1e-18 );
    const base = vertexCount + 1;
    if ( vertexCount > 90000000 )
    {
        throw new RangeError( 'Mesh audit edge keys require fewer than 90,000,001 vertices.' );
    }

    const validTriangles = new Uint8Array( triangleCount );
    const validTriangleIds = new Uint32Array( triangleCount );
    let validTriangleCount = 0;
    const referencedVertices = new Uint8Array( vertexCount );
    const vertexTriangleDegree = new Uint32Array( vertexCount );
    const edgeStore = new PackedEdgeStore( triangleCount * 3, base );
    const repeatedIndexSamples = [];
    const zeroAreaSamples = [];
    const invalidIndexSamples = [];
    const nonFiniteTriangleSamples = [];
    const duplicateTriangleSamples = [];
    const triangleKeys = new Map();
    let repeatedIndexTriangles = 0;
    let zeroAreaTriangles = 0;
    let invalidIndexTriangles = 0;
    let nonFiniteTriangles = 0;
    let duplicateTriangles = 0;

    for ( let triangle = 0; triangle < triangleCount; triangle += 1 )
    {
        const offset = triangle * 3;
        const tri = [
            Number( indices[ offset ] ),
            Number( indices[ offset + 1 ] ),
            Number( indices[ offset + 2 ] )
        ];
        if ( !tri.every( ( vertex ) => Number.isInteger( vertex ) && vertex >= 0 && vertex < vertexCount ) )
        {
            invalidIndexTriangles += 1;
            addSample( invalidIndexSamples, { triangle, indices: tri }, maxDetails );
            continue;
        }
        if ( new Set( tri ).size !== 3 )
        {
            repeatedIndexTriangles += 1;
            addSample( repeatedIndexSamples, { triangle, indices: tri }, maxDetails );
            continue;
        }
        if ( !tri.every( ( vertex ) => finiteVertices[ vertex ] ) )
        {
            nonFiniteTriangles += 1;
            addSample( nonFiniteTriangleSamples, { triangle, indices: tri }, maxDetails );
            continue;
        }
        const faceCross = triangleCross( positions, tri[ 0 ], tri[ 1 ], tri[ 2 ] );
        const doubleArea = vectorLength( faceCross );
        if ( doubleArea <= minimumDoubleArea )
        {
            zeroAreaTriangles += 1;
            addSample( zeroAreaSamples, { triangle, indices: tri, doubleArea }, maxDetails );
            continue;
        }

        validTriangles[ triangle ] = 1;
        validTriangleIds[ validTriangleCount++ ] = triangle;
        const duplicateKey = [ ...tri ].sort( ( left, right ) => left - right ).join( ',' );
        if ( triangleKeys.has( duplicateKey ) )
        {
            duplicateTriangles += 1;
            addSample( duplicateTriangleSamples, [ triangleKeys.get( duplicateKey ), triangle ], maxDetails );
        }
        else
        {
            triangleKeys.set( duplicateKey, triangle );
        }
        for ( const vertex of tri )
        {
            referencedVertices[ vertex ] = 1;
            vertexTriangleDegree[ vertex ] += 1;
        }
        edgeStore.add( tri[ 0 ], tri[ 1 ], triangle );
        edgeStore.add( tri[ 1 ], tri[ 2 ], triangle );
        edgeStore.add( tri[ 2 ], tri[ 0 ], triangle );
    }

    const vertexTriangleOffsets = new Uint32Array( vertexCount + 1 );
    for ( let vertex = 0; vertex < vertexCount; vertex += 1 )
    {
        vertexTriangleOffsets[ vertex + 1 ] =
            vertexTriangleOffsets[ vertex ] + vertexTriangleDegree[ vertex ];
    }
    const vertexTriangles = new Uint32Array( validTriangleCount * 3 );
    const vertexTriangleCursor = vertexTriangleOffsets.slice( 0, vertexCount );
    for ( let index = 0; index < validTriangleCount; index += 1 )
    {
        const triangle = validTriangleIds[ index ];
        const offset = triangle * 3;
        for ( let corner = 0; corner < 3; corner += 1 )
        {
            const vertex = Number( indices[ offset + corner ] );
            vertexTriangles[ vertexTriangleCursor[ vertex ]++ ] = triangle;
        }
    }

    const topologyStartedAt = now();
    const triangleUnion = new UnionFind( triangleCount );
    const boundaryEdges = [];
    const nonManifoldEdges = [];
    const inconsistentWindingEdges = [];
    const boundaryDegree = new Uint32Array( vertexCount );
    const incidentNonManifoldEdge = new Uint8Array( vertexCount );
    const orientationDegree = new Uint32Array( triangleCount );
    let sharedManifoldEdges = 0;

    for ( let edge = 0; edge < edgeStore.edgeCount; edge += 1 )
    {
        const firstIncidence = edgeStore.head[ edge ];
        const firstTriangle = edgeStore.incidenceTriangle[ firstIncidence ];
        edgeStore.forEachIncidence( edge, ( triangle, _direction, index ) => {
            if ( index > 0 ) triangleUnion.union( firstTriangle, triangle );
        } );
        if ( edgeStore.useCount[ edge ] === 1 )
        {
            boundaryEdges.push( edge );
            boundaryDegree[ edgeStore.a[ edge ] ] += 1;
            boundaryDegree[ edgeStore.b[ edge ] ] += 1;
        }
        else if ( edgeStore.useCount[ edge ] > 2 )
        {
            nonManifoldEdges.push( edge );
            incidentNonManifoldEdge[ edgeStore.a[ edge ] ] = 1;
            incidentNonManifoldEdge[ edgeStore.b[ edge ] ] = 1;
        }
        else
        {
            const leftIncidence = firstIncidence;
            const rightIncidence = edgeStore.incidenceNext[ leftIncidence ];
            const leftTriangle = edgeStore.incidenceTriangle[ leftIncidence ];
            const rightTriangle = edgeStore.incidenceTriangle[ rightIncidence ];
            const differentFlipRequired = edgeStore.incidenceDirection[ leftIncidence ]
                === edgeStore.incidenceDirection[ rightIncidence ] ? 1 : 0;
            if ( differentFlipRequired )
            {
                inconsistentWindingEdges.push( edge );
            }
            orientationDegree[ leftTriangle ] += 1;
            orientationDegree[ rightTriangle ] += 1;
            sharedManifoldEdges += 1;
        }
    }

    const orientationOffsets = new Uint32Array( triangleCount + 1 );
    for ( let triangle = 0; triangle < triangleCount; triangle += 1 )
    {
        orientationOffsets[ triangle + 1 ] =
            orientationOffsets[ triangle ] + orientationDegree[ triangle ];
    }
    const orientationNeighbours = new Uint32Array( sharedManifoldEdges * 2 );
    const orientationParities = new Uint8Array( sharedManifoldEdges * 2 );
    const orientationEdges = new Uint32Array( sharedManifoldEdges * 2 );
    const orientationCursor = orientationOffsets.slice( 0, triangleCount );
    for ( let edge = 0; edge < edgeStore.edgeCount; edge += 1 )
    {
        if ( edgeStore.useCount[ edge ] !== 2 ) continue;
        const leftIncidence = edgeStore.head[ edge ];
        const rightIncidence = edgeStore.incidenceNext[ leftIncidence ];
        const leftTriangle = edgeStore.incidenceTriangle[ leftIncidence ];
        const rightTriangle = edgeStore.incidenceTriangle[ rightIncidence ];
        const parity = edgeStore.incidenceDirection[ leftIncidence ]
            === edgeStore.incidenceDirection[ rightIncidence ] ? 1 : 0;
        let destination = orientationCursor[ leftTriangle ]++;
        orientationNeighbours[ destination ] = rightTriangle;
        orientationParities[ destination ] = parity;
        orientationEdges[ destination ] = edge;
        destination = orientationCursor[ rightTriangle ]++;
        orientationNeighbours[ destination ] = leftTriangle;
        orientationParities[ destination ] = parity;
        orientationEdges[ destination ] = edge;
    }

    const nonManifoldVertexDetails = [];
    const nonManifoldVertexSet = new Set();
    let boundaryVertexCount = 0;
    for ( let vertex = 0; vertex < vertexCount; vertex += 1 )
    {
        const firstIncidentTriangle = vertexTriangleOffsets[ vertex ];
        const lastIncidentTriangle = vertexTriangleOffsets[ vertex + 1 ];
        const incidentTriangleCount = lastIncidentTriangle - firstIncidentTriangle;
        if ( incidentTriangleCount === 0 )
        {
            continue;
        }
        if ( boundaryDegree[ vertex ] > 0 )
        {
            boundaryVertexCount += 1;
        }
        const linkAdjacency = new Map();
        const linkDegree = new Map();
        for ( let incident = firstIncidentTriangle; incident < lastIncidentTriangle; incident += 1 )
        {
            const triangle = vertexTriangles[ incident ];
            const offset = triangle * 3;
            const first = Number( indices[ offset ] );
            const second = Number( indices[ offset + 1 ] );
            const third = Number( indices[ offset + 2 ] );
            const left = first === vertex ? second : first;
            const right = third === vertex ? second : third;
            const leftNeighbours = linkAdjacency.get( left ) ?? [];
            const rightNeighbours = linkAdjacency.get( right ) ?? [];
            leftNeighbours.push( right );
            rightNeighbours.push( left );
            linkAdjacency.set( left, leftNeighbours );
            linkAdjacency.set( right, rightNeighbours );
            linkDegree.set( left, ( linkDegree.get( left ) ?? 0 ) + 1 );
            linkDegree.set( right, ( linkDegree.get( right ) ?? 0 ) + 1 );
        }
        let linkComponents = 0;
        const visited = new Set();
        for ( const start of linkAdjacency.keys() )
        {
            if ( visited.has( start ) ) continue;
            linkComponents += 1;
            const stack = [ start ];
            visited.add( start );
            while ( stack.length > 0 )
            {
                const current = stack.pop();
                for ( const neighbour of linkAdjacency.get( current ) ?? [] )
                {
                    if ( !visited.has( neighbour ) )
                    {
                        visited.add( neighbour );
                        stack.push( neighbour );
                    }
                }
            }
        }
        const degrees = Array.from( linkDegree.values() );
        const degreeOne = degrees.filter( ( degree ) => degree === 1 ).length;
        const invalidDegree = degrees.some( ( degree ) => degree !== 1 && degree !== 2 );
        const closedLinkValid = boundaryDegree[ vertex ] === 0
            && degreeOne === 0
            && !invalidDegree;
        const boundaryLinkValid = boundaryDegree[ vertex ] === 2
            && degreeOne === 2
            && !invalidDegree;
        const manifold = !incidentNonManifoldEdge[ vertex ]
            && linkComponents === 1
            && ( closedLinkValid || boundaryLinkValid );
        if ( !manifold )
        {
            nonManifoldVertexSet.add( vertex );
            addSample( nonManifoldVertexDetails, {
                vertex,
                incidentTriangles: incidentTriangleCount,
                boundaryEdges: boundaryDegree[ vertex ],
                linkComponents,
                linkDegrees: degrees.sort( ( left, right ) => left - right ),
                incidentNonManifoldEdge: Boolean( incidentNonManifoldEdge[ vertex ] )
            }, maxDetails );
        }
    }

    const componentMap = new Map();
    for ( let index = 0; index < validTriangleCount; index += 1 )
    {
        const triangle = validTriangleIds[ index ];
        const root = triangleUnion.find( triangle );
        let component = componentMap.get( root );
        if ( !component )
        {
            component = {
                root,
                triangles: 0,
                vertices: new Set(),
                edges: 0,
                boundaryEdges: [],
                nonManifoldEdges: 0,
                orientationConflicts: 0,
                flips: 0
            };
            componentMap.set( root, component );
        }
        component.triangles += 1;
        const offset = triangle * 3;
        component.vertices.add( Number( indices[ offset ] ) );
        component.vertices.add( Number( indices[ offset + 1 ] ) );
        component.vertices.add( Number( indices[ offset + 2 ] ) );
    }
    for ( let edge = 0; edge < edgeStore.edgeCount; edge += 1 )
    {
        const firstTriangle = edgeStore.incidenceTriangle[ edgeStore.head[ edge ] ];
        const component = componentMap.get( triangleUnion.find( firstTriangle ) );
        component.edges += 1;
        if ( edgeStore.useCount[ edge ] === 1 ) component.boundaryEdges.push( edge );
        if ( edgeStore.useCount[ edge ] > 2 ) component.nonManifoldEdges += 1;
    }

    const orientationValues = new Int8Array( triangleCount );
    orientationValues.fill( -1 );
    const orientationConflictKeys = new Set();
    const orientationConflictEdges = [];
    const orientationConflictSamples = [];
    const orientationStack = new Uint32Array( Math.max( validTriangleCount, 1 ) );
    for ( let validIndex = 0; validIndex < validTriangleCount; validIndex += 1 )
    {
        const seed = validTriangleIds[ validIndex ];
        if ( orientationValues[ seed ] !== -1 ) continue;
        orientationValues[ seed ] = 0;
        let stackLength = 1;
        orientationStack[ 0 ] = seed;
        while ( stackLength > 0 )
        {
            const current = orientationStack[ --stackLength ];
            for ( let adjacency = orientationOffsets[ current ];
                adjacency < orientationOffsets[ current + 1 ];
                adjacency += 1 )
            {
                const neighbour = orientationNeighbours[ adjacency ];
                const expected = orientationValues[ current ] ^ orientationParities[ adjacency ];
                if ( orientationValues[ neighbour ] === -1 )
                {
                    orientationValues[ neighbour ] = expected;
                    orientationStack[ stackLength++ ] = neighbour;
                }
                else if ( orientationValues[ neighbour ] !== expected )
                {
                    const edge = orientationEdges[ adjacency ];
                    const key = edgeKey( edgeStore.a[ edge ], edgeStore.b[ edge ], base );
                    if ( !orientationConflictKeys.has( key ) )
                    {
                        orientationConflictKeys.add( key );
                        orientationConflictEdges.push( edge );
                        const firstTriangle = edgeStore.incidenceTriangle[ edgeStore.head[ edge ] ];
                        componentMap.get( triangleUnion.find( firstTriangle ) )
                            .orientationConflicts += 1;
                        addSample( orientationConflictSamples, {
                            edge: [ edgeStore.a[ edge ], edgeStore.b[ edge ] ],
                            triangles: edgeStore.incidenceTriangles( edge )
                        }, maxDetails );
                    }
                }
            }
        }
    }
    for ( let index = 0; index < validTriangleCount; index += 1 )
    {
        const triangle = validTriangleIds[ index ];
        if ( orientationValues[ triangle ] !== 1 ) continue;
        componentMap.get( triangleUnion.find( triangle ) ).flips += 1;
    }

    const components = [];
    for ( const component of componentMap.values() )
    {
        const boundary = buildBoundarySummary( component.boundaryEdges, edgeStore );
        const nonManifoldVertices = Array.from( component.vertices )
            .filter( ( vertex ) => nonManifoldVertexSet.has( vertex ) );
        const orientationConflicts = component.orientationConflicts;
        const flipsRequired = Math.min( component.flips, component.triangles - component.flips );
        const eulerCharacteristic = component.vertices.size - component.edges + component.triangles;
        const topologicallyManifold = component.nonManifoldEdges === 0
            && nonManifoldVertices.length === 0;
        const orientable = orientationConflicts === 0;
        const genusValue = ( 2 - boundary.loopCount - eulerCharacteristic ) / 2;
        const genus = topologicallyManifold
            && orientable
            && boundary.openChainCount === 0
            && Number.isInteger( genusValue )
            && genusValue >= 0
            ? genusValue
            : null;
        components.push( {
            triangles: component.triangles,
            vertices: component.vertices.size,
            edges: component.edges,
            boundaryEdges: component.boundaryEdges.length,
            boundaryLoops: boundary.loopCount,
            openBoundaryChains: boundary.openChainCount,
            nonManifoldEdges: component.nonManifoldEdges,
            nonManifoldVertices: nonManifoldVertices.length,
            eulerCharacteristic,
            genus,
            orientable,
            flipsRequiredForConsistentWinding: flipsRequired
        } );
    }
    components.sort( ( left, right ) => right.triangles - left.triangles );
    const topologyFinishedAt = now();

    const validReferencedVertexCount = referencedVertices.reduce( ( sum, value ) => sum + value, 0 );
    const isolatedVertexSamples = [];
    let isolatedVertices = 0;
    for ( let vertex = 0; vertex < vertexCount; vertex += 1 )
    {
        if ( !referencedVertices[ vertex ] )
        {
            isolatedVertices += 1;
            addSample( isolatedVertexSamples, vertex, maxDetails );
        }
    }

    const normalReport = {
        supplied: Boolean( normal ),
        count: normal?.count ?? 0,
        countMatchesPositions: normal ? normal.count === vertexCount : false,
        nonFiniteVertices: 0,
        nonFiniteValues: 0,
        zeroLengthVertices: 0,
        nonUnitVertices: 0,
        opposedTriangles: 0,
        samples: {
            nonFinite: [],
            zeroLength: [],
            nonUnit: [],
            opposedTriangles: []
        }
    };
    let normals = null;
    if ( normal )
    {
        normals = copyAttribute3( normal );
        for ( let vertex = 0; vertex < normal.count; vertex += 1 )
        {
            const offset = vertex * 3;
            const values = [ normals[ offset ], normals[ offset + 1 ], normals[ offset + 2 ] ];
            const nonFiniteValues = values.filter( ( value ) => !finiteNumber( value ) ).length;
            if ( nonFiniteValues > 0 )
            {
                normalReport.nonFiniteVertices += 1;
                normalReport.nonFiniteValues += nonFiniteValues;
                addSample( normalReport.samples.nonFinite, vertex, maxDetails );
                continue;
            }
            const length = vectorLength( values );
            if ( length <= 1e-12 )
            {
                normalReport.zeroLengthVertices += 1;
                addSample( normalReport.samples.zeroLength, vertex, maxDetails );
            }
            else if ( Math.abs( length - 1 ) > ( options.normalLengthTolerance ?? 1e-3 ) )
            {
                normalReport.nonUnitVertices += 1;
                addSample( normalReport.samples.nonUnit, { vertex, length }, maxDetails );
            }
        }
        if ( normal.count === vertexCount )
        {
            for ( let index = 0; index < validTriangleCount; index += 1 )
            {
                const triangle = validTriangleIds[ index ];
                const triangleOffset = triangle * 3;
                const triangleVertices = [
                    Number( indices[ triangleOffset ] ),
                    Number( indices[ triangleOffset + 1 ] ),
                    Number( indices[ triangleOffset + 2 ] )
                ];
                const face = triangleCross( positions, ...triangleVertices );
                const faceLength = vectorLength( face );
                let averageDot = 0;
                let usable = true;
                for ( const vertex of triangleVertices )
                {
                    const offset = vertex * 3;
                    const vertexNormal = [ normals[ offset ], normals[ offset + 1 ], normals[ offset + 2 ] ];
                    const normalLength = vectorLength( vertexNormal );
                    if ( !finiteNumber( normalLength ) || normalLength <= 1e-12 )
                    {
                        usable = false;
                        break;
                    }
                    averageDot += dot( face, vertexNormal ) / ( faceLength * normalLength );
                }
                if ( usable && averageDot / 3 < -( options.normalOppositionTolerance ?? 0.05 ) )
                {
                    normalReport.opposedTriangles += 1;
                    addSample( normalReport.samples.opposedTriangles, triangle, maxDetails );
                }
            }
        }
    }

    const coincidentVertices = buildCoincidentVertexReport(
        positions, finiteVertices, positionTolerance, maxDetails
    );
    const provenance = auditProvenance(
        options.provenance,
        validTriangleIds,
        validTriangleCount,
        edgeStore,
        maxDetails
    );
    const selfIntersections = selfIntersectionFromIndexedTriangles(
        validTriangleIds,
        validTriangleCount,
        indices,
        positions,
        options.selfIntersections?.epsilon ?? positionTolerance,
        options.selfIntersections,
        maxDetails
    );

    const expectations = {
        components: options.expectations?.components ?? 1,
        maxBoundaryEdges: options.expectations?.maxBoundaryEdges ?? 0,
        maxBoundaryLoops: options.expectations?.maxBoundaryLoops ?? 0,
        requireNormals: options.expectations?.requireNormals ?? true,
        requireProvenance: options.expectations?.requireProvenance ?? Boolean( options.provenance ),
        requireCompleteSelfIntersectionPass: options.expectations?.requireCompleteSelfIntersectionPass ?? false
    };
    const failures = [];
    const fail = ( condition, message ) =>
    {
        if ( condition ) failures.push( message );
    };
    fail( indexCount % 3 !== 0, 'index count is not divisible by three' );
    fail( invalidIndexTriangles > 0, `${invalidIndexTriangles} triangles contain invalid indices` );
    fail( nonFinitePositionVertices > 0, `${nonFinitePositionVertices} vertices contain non-finite positions` );
    fail( nonFiniteTriangles > 0, `${nonFiniteTriangles} triangles reference non-finite positions` );
    fail( repeatedIndexTriangles > 0, `${repeatedIndexTriangles} triangles repeat a vertex index` );
    fail( zeroAreaTriangles > 0, `${zeroAreaTriangles} triangles have zero or negligible area` );
    fail( duplicateTriangles > 0, `${duplicateTriangles} duplicate triangles were found` );
    fail( components.length !== expectations.components,
        `expected ${expectations.components} surface component(s), found ${components.length}` );
    fail( boundaryEdges.length > expectations.maxBoundaryEdges,
        `expected at most ${expectations.maxBoundaryEdges} boundary edges, found ${boundaryEdges.length}` );
    const boundaryLoopCount = components.reduce( ( sum, component ) => sum + component.boundaryLoops, 0 );
    fail( boundaryLoopCount > expectations.maxBoundaryLoops,
        `expected at most ${expectations.maxBoundaryLoops} boundary loops, found ${boundaryLoopCount}` );
    fail( nonManifoldEdges.length > 0, `${nonManifoldEdges.length} non-manifold edges were found` );
    fail( nonManifoldVertexSet.size > 0, `${nonManifoldVertexSet.size} non-manifold vertices were found` );
    fail( inconsistentWindingEdges.length > 0,
        `${inconsistentWindingEdges.length} shared edges have inconsistent winding` );
    fail( orientationConflictKeys.size > 0,
        `${orientationConflictKeys.size} orientation constraints conflict` );
    fail( isolatedVertices > 0, `${isolatedVertices} vertices are not referenced by valid triangles` );
    fail( coincidentVertices.groupCount > 0,
        `${coincidentVertices.groupCount} groups of distinct vertices are spatially coincident` );
    if ( expectations.requireNormals )
    {
        fail( !normal, 'normal attribute is missing' );
        fail( normal && normal.count !== vertexCount, 'normal count does not match position count' );
    }
    fail( normalReport.nonFiniteVertices > 0,
        `${normalReport.nonFiniteVertices} normals contain non-finite values` );
    fail( normalReport.zeroLengthVertices > 0,
        `${normalReport.zeroLengthVertices} normals have zero length` );
    fail( normalReport.nonUnitVertices > 0,
        `${normalReport.nonUnitVertices} normals are not unit length` );
    fail( normalReport.opposedTriangles > 0,
        `${normalReport.opposedTriangles} triangles oppose their vertex normals` );
    if ( expectations.requireProvenance )
    {
        fail( !provenance.supplied, 'surface provenance is missing' );
        fail( provenance.supplied && !provenance.coverageComplete,
            'surface provenance does not cover every valid triangle and expected hierarchy id' );
    }
    fail( provenance.unintendedContactEdges > 0,
        `${provenance.unintendedContactEdges} surface edges join unrelated provenance owners` );
    fail( selfIntersections.checked && selfIntersections.intersectionCount > 0,
        `${selfIntersections.intersectionCount} non-adjacent triangle intersections were found` );
    fail( expectations.requireCompleteSelfIntersectionPass && !selfIntersections.complete,
        'the required self-intersection pass did not complete' );

    const elapsedMilliseconds = now() - startedAt;
    return {
        ok: failures.length === 0,
        failures,
        counts: {
            vertices: vertexCount,
            referencedVertices: validReferencedVertexCount,
            isolatedVertices,
            indices: indexCount,
            trailingIndices: indexCount % 3,
            triangles: triangleCount,
            validTriangles: validTriangleCount,
            edges: edgeStore.edgeCount,
            components: components.length
        },
        bounds: finiteBounds ? bounds : null,
        tolerances: {
            scale,
            position: positionTolerance,
            minimumDoubleArea
        },
        finite: {
            nonFinitePositionVertices,
            nonFinitePositionValues,
            positionSamples: nonFinitePositionSamples
        },
        degeneracy: {
            invalidIndexTriangles,
            invalidIndexSamples,
            nonFiniteTriangles,
            nonFiniteTriangleSamples,
            repeatedIndexTriangles,
            repeatedIndexSamples,
            zeroAreaTriangles,
            zeroAreaSamples,
            duplicateTriangles,
            duplicateTriangleSamples
        },
        topology: {
            boundaryEdges: boundaryEdges.length,
            boundaryEdgeSamples: boundaryEdges.slice( 0, maxDetails )
                .map( ( edge ) => [ edgeStore.a[ edge ], edgeStore.b[ edge ] ] ),
            boundaryVertices: boundaryVertexCount,
            boundaryLoops: boundaryLoopCount,
            openBoundaryChains: components.reduce( ( sum, component ) => sum + component.openBoundaryChains, 0 ),
            nonManifoldEdges: nonManifoldEdges.length,
            nonManifoldEdgeSamples: nonManifoldEdges.slice( 0, maxDetails ).map( ( edge ) => ( {
                edge: [ edgeStore.a[ edge ], edgeStore.b[ edge ] ],
                incidentTriangles: edgeStore.incidenceTriangles( edge )
            } ) ),
            nonManifoldVertices: nonManifoldVertexSet.size,
            nonManifoldVertexSamples: nonManifoldVertexDetails,
            inconsistentWindingEdges: inconsistentWindingEdges.length,
            inconsistentWindingSamples: inconsistentWindingEdges.slice( 0, maxDetails ).map( ( edge ) => ( {
                edge: [ edgeStore.a[ edge ], edgeStore.b[ edge ] ],
                triangles: edgeStore.incidenceTriangles( edge )
            } ) ),
            orientationConflicts: orientationConflictKeys.size,
            orientationConflictSamples,
            eulerCharacteristic: validReferencedVertexCount - edgeStore.edgeCount + validTriangleCount,
            componentEulerSum: components.reduce( ( sum, component ) => sum + component.eulerCharacteristic, 0 ),
            components,
            isolatedVertexSamples
        },
        normals: normalReport,
        coincidentVertices,
        provenance,
        selfIntersections,
        expectations,
        timings: {
            topologyMilliseconds: topologyFinishedAt - topologyStartedAt,
            totalMilliseconds: elapsedMilliseconds
        }
    };
}

export function formatMeshAuditSummary( report )
{
    const status = report.ok ? 'PASS' : 'FAIL';
    const topology = report.topology;
    const lines = [
        `${status}: ${report.counts.vertices} vertices, ${report.counts.validTriangles} triangles, ${report.counts.components} component(s)`,
        `boundaries ${topology.boundaryEdges} edge(s) / ${topology.boundaryLoops} loop(s); non-manifold ${topology.nonManifoldEdges} edge(s) / ${topology.nonManifoldVertices} vertex/vertices`,
        `winding ${topology.inconsistentWindingEdges} inconsistent edge(s); coincident ${report.coincidentVertices.groupCount} group(s); degenerate ${report.degeneracy.zeroAreaTriangles + report.degeneracy.repeatedIndexTriangles}`
    ];
    if ( report.selfIntersections.checked )
    {
        lines.push( `self-intersections ${report.selfIntersections.intersectionCount}${report.selfIntersections.complete ? '' : ' (partial pass)'}` );
    }
    if ( report.failures.length > 0 )
    {
        lines.push( ...report.failures.map( ( failure ) => `- ${failure}` ) );
    }
    return lines.join( '\n' );
}

// Short alias for scenario harnesses and developer-console probes.
export const auditMesh = auditIndexedGeometry;

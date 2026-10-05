/**
 * Sparse hard-union meshing for tapered capsule segments.
 *
 * The implementation intentionally has no THREE dependency.  It returns raw,
 * indexed buffers which can be passed directly to THREE.BufferGeometry.
 * Every primitive is a continuously tapered swept sphere (a tapered capsule),
 * and the sampled field is the minimum of all primitive fields.  Consequently
 * there are no per-segment caps left inside the result.
 */

const CUBE_CORNERS = Object.freeze( [
    [ 0, 0, 0 ],
    [ 1, 0, 0 ],
    [ 1, 1, 0 ],
    [ 0, 1, 0 ],
    [ 0, 0, 1 ],
    [ 1, 0, 1 ],
    [ 1, 1, 1 ],
    [ 0, 1, 1 ]
] );

// Six tetrahedra around the global 0 -> 6 body diagonal.  Using this same
// decomposition in every cube selects the same diagonal on every shared face.
const CUBE_TETRAHEDRA = Object.freeze( [
    [ 0, 1, 2, 6 ],
    [ 0, 2, 3, 6 ],
    [ 0, 3, 7, 6 ],
    [ 0, 7, 4, 6 ],
    [ 0, 4, 5, 6 ],
    [ 0, 5, 1, 6 ]
] );

const SQRT_THREE = Math.sqrt( 3 );
export const SPARSE_UNION_FIELD_MODES = Object.freeze( {
    TAPERED_CAPSULE: 0,
    CLIP_PLANE: 1
} );
// A 14-bit signed coordinate per axis leaves enough exact-integer bits to add
// a 5-bit lattice-edge direction.  Normal scene grids use compact Number keys;
// unusually large grids fall back to strings without changing behaviour.
const PACK_BASE = 16_384;
const PACK_BIAS = 8_192;
const PACK_MINIMUM = -PACK_BIAS;
const PACK_MAXIMUM = PACK_BIAS - 1;

function finitePoint( point )
{
    return point
        && Number.isFinite( point.x )
        && Number.isFinite( point.y )
        && Number.isFinite( point.z );
}

function gridKey( x, y, z )
{
    if ( x >= PACK_MINIMUM && x <= PACK_MAXIMUM
        && y >= PACK_MINIMUM && y <= PACK_MAXIMUM
        && z >= PACK_MINIMUM && z <= PACK_MAXIMUM )
    {
        return ( ( x + PACK_BIAS ) * PACK_BASE + y + PACK_BIAS ) * PACK_BASE + z + PACK_BIAS;
    }
    return `g:${x},${y},${z}`;
}

function cellKey( x, y, z )
{
    return gridKey( x, y, z );
}

function floorDiv( value, divisor )
{
    return Math.floor( value / divisor );
}

function compareGridPoints( a, b )
{
    return a.x - b.x || a.y - b.y || a.z - b.z;
}

function edgeKey( a, b )
{
    const first = compareGridPoints( a, b ) <= 0 ? a : b;
    const second = first === a ? b : a;
    if ( typeof first.key === 'number' && typeof second.key === 'number' )
    {
        const dx = second.x - first.x;
        const dy = second.y - first.y;
        const dz = second.z - first.z;
        const direction = ( dx + 1 ) * 9 + ( dy + 1 ) * 3 + dz + 1;
        return first.key * 27 + direction;
    }
    return `${first.key}|${second.key}`;
}

function clamp( value, minimum, maximum )
{
    return Math.max( minimum, Math.min( maximum, value ) );
}

function normalizeOrigin( origin )
{
    if ( Array.isArray( origin ) )
    {
        const [ x = 0, y = 0, z = 0 ] = origin;
        if ( Number.isFinite( x ) && Number.isFinite( y ) && Number.isFinite( z ) )
        {
            return { x, y, z };
        }
    }
    if ( finitePoint( origin ) )
    {
        return { x: origin.x, y: origin.y, z: origin.z };
    }
    return { x: 0, y: 0, z: 0 };
}

function ownerKey( value )
{
    return value === undefined || value === null ? '' : String( value );
}

function normalizeSegments( sourceSegments, cellSize, stats )
{
    const segments = [];
    const ownerIds = [];
    const ownerLookup = new Map();
    const edgeIds = [];
    const edgeLookup = new Map();

    function tableIndex( table, lookup, value )
    {
        const key = ownerKey( value );
        if ( !lookup.has( key ) )
        {
            lookup.set( key, table.length );
            table.push( value === undefined ? key : value );
        }
        return lookup.get( key );
    }

    for ( let inputIndex = 0; inputIndex < sourceSegments.length; inputIndex++ )
    {
        const source = sourceSegments[ inputIndex ];
        if ( !source || !finitePoint( source.a ) || !finitePoint( source.b )
            || !Number.isFinite( source.radiusA ) || !Number.isFinite( source.radiusB ) )
        {
            stats.invalidSegments++;
            continue;
        }

        let radiusA = Math.max( 0, source.radiusA );
        let radiusB = Math.max( 0, source.radiusB );
        if ( radiusA !== source.radiusA || radiusB !== source.radiusB )
        {
            stats.clampedRadii++;
        }
        if ( Math.max( radiusA, radiusB ) <= 0 )
        {
            stats.invalidSegments++;
            continue;
        }

        // A mathematically zero tip is useful to callers, but sampling an
        // exactly zero-radius primitive cannot produce a reliable manifold.
        const radiusFloor = Math.max( cellSize * 1e-6, Number.EPSILON );
        if ( radiusA === 0 )
        {
            radiusA = radiusFloor;
            stats.clampedRadii++;
        }
        if ( radiusB === 0 )
        {
            radiusB = radiusFloor;
            stats.clampedRadii++;
        }

        const ax = source.a.x;
        const ay = source.a.y;
        const az = source.a.z;
        const bx = source.b.x;
        const by = source.b.y;
        const bz = source.b.z;
        const dx = bx - ax;
        const dy = by - ay;
        const dz = bz - az;
        const lengthSquared = dx * dx + dy * dy + dz * dz;
        const length = Math.sqrt( lengthSquared );
        if ( length <= cellSize * 1e-9 )
        {
            stats.degenerateSegments++;
        }

        const ownerTableIndex = tableIndex( ownerIds, ownerLookup, source.ownerId );
        const edgeValue = source.edgeIndex ?? inputIndex;
        const edgeTableIndex = tableIndex( edgeIds, edgeLookup, edgeValue );
        let clipPlane = null;
        if ( source.clipPlane !== undefined && source.clipPlane !== null )
        {
            const center = source.clipPlane.center;
            const normal = source.clipPlane.normal;
            const normalLength = finitePoint( normal )
                ? Math.hypot( normal.x, normal.y, normal.z )
                : 0;
            if ( finitePoint( center ) && normalLength > Number.EPSILON )
            {
                clipPlane = {
                    cx: center.x,
                    cy: center.y,
                    cz: center.z,
                    nx: normal.x / normalLength,
                    ny: normal.y / normalLength,
                    nz: normal.z / normalLength
                };
                stats.clippedSegments++;
            }
            else
            {
                stats.invalidClipPlanes++;
            }
        }
        segments.push( {
            ax, ay, az,
            bx, by, bz,
            dx, dy, dz,
            length,
            lengthSquared,
            radiusA,
            radiusB,
            radiusDelta: radiusB - radiusA,
            maxRadius: Math.max( radiusA, radiusB ),
            minRadius: Math.min( radiusA, radiusB ),
            clipPlane,
            // The approximate tapered-capsule field below is bounded by this
            // Lipschitz constant.  It makes sparse-cell rejection conservative.
            lipschitz: length > 0 ? 1 + Math.abs( radiusB - radiusA ) / length : 1,
            ownerTableIndex,
            edgeTableIndex,
            inputIndex
        } );
    }

    stats.validSegments = segments.length;
    return { segments, ownerIds, edgeIds };
}

/**
 * Continuous field for a linearly tapered swept sphere.  Projection is onto
 * the centreline and the local radius is linearly interpolated there.  This is
 * an exact capsule SDF when the endpoint radii agree, and a conservative,
 * signed-distance-like field for a tapered capsule.
 */
function segmentField( segment, x, y, z )
{
    if ( segment.lengthSquared <= Number.EPSILON )
    {
        const qx = x - segment.ax;
        const qy = y - segment.ay;
        const qz = z - segment.az;
        return Math.sqrt( qx * qx + qy * qy + qz * qz ) - segment.maxRadius;
    }

    const px = x - segment.ax;
    const py = y - segment.ay;
    const pz = z - segment.az;
    const projection = clamp(
        ( px * segment.dx + py * segment.dy + pz * segment.dz ) / segment.lengthSquared,
        0,
        1
    );
    const qx = px - projection * segment.dx;
    const qy = py - projection * segment.dy;
    const qz = pz - projection * segment.dz;
    const radius = segment.radiusA + projection * segment.radiusDelta;
    return Math.sqrt( qx * qx + qy * qy + qz * qz ) - radius;
}

/**
 * Intersects one tapered capsule with its optional inward half-space. The
 * signed plane distance is negative on the retained side, so max(capsule,
 * plane) is the standard implicit intersection. Keeping this operation on
 * the primitive (before the hard-min union) prevents a port plane from
 * clipping an unrelated primitive which happens to lie in front of it.
 */
function clippedSegmentField( segment, x, y, z )
{
    const capsuleValue = segmentField( segment, x, y, z );
    if ( !segment.clipPlane )
    {
        return {
            value: capsuleValue,
            fieldMode: SPARSE_UNION_FIELD_MODES.TAPERED_CAPSULE
        };
    }
    const plane = segment.clipPlane;
    const planeValue = ( x - plane.cx ) * plane.nx
        + ( y - plane.cy ) * plane.ny
        + ( z - plane.cz ) * plane.nz;
    if ( planeValue >= capsuleValue )
    {
        return {
            value: planeValue,
            fieldMode: SPARSE_UNION_FIELD_MODES.CLIP_PLANE
        };
    }
    return {
        value: capsuleValue,
        fieldMode: SPARSE_UNION_FIELD_MODES.TAPERED_CAPSULE
    };
}

function createSparseDomain( segments, settings, stats )
{
    const {
        cellSize,
        origin,
        blockSize,
        paddingCells,
        maxCells,
        isoLevel
    } = settings;
    const candidateCells = new Map();
    const segmentBuckets = new Map();
    const cellHalfDiagonal = cellSize * SQRT_THREE * 0.5;
    const surfacePadding = paddingCells * cellSize * SQRT_THREE;
    const blockWorldSize = blockSize * cellSize;
    const blockHalfDiagonal = blockWorldSize * SQRT_THREE * 0.5;

    for ( let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++ )
    {
        const segment = segments[ segmentIndex ];
        const expansion = segment.maxRadius + Math.max( 0, isoLevel )
            + cellSize * ( paddingCells + 2 );
        const minCellX = Math.floor( ( Math.min( segment.ax, segment.bx ) - expansion - origin.x ) / cellSize ) - 1;
        const minCellY = Math.floor( ( Math.min( segment.ay, segment.by ) - expansion - origin.y ) / cellSize ) - 1;
        const minCellZ = Math.floor( ( Math.min( segment.az, segment.bz ) - expansion - origin.z ) / cellSize ) - 1;
        const maxCellX = Math.floor( ( Math.max( segment.ax, segment.bx ) + expansion - origin.x ) / cellSize ) + 1;
        const maxCellY = Math.floor( ( Math.max( segment.ay, segment.by ) + expansion - origin.y ) / cellSize ) + 1;
        const maxCellZ = Math.floor( ( Math.max( segment.az, segment.bz ) + expansion - origin.z ) / cellSize ) + 1;

        const minBlockX = floorDiv( minCellX, blockSize );
        const minBlockY = floorDiv( minCellY, blockSize );
        const minBlockZ = floorDiv( minCellZ, blockSize );
        const maxBlockX = floorDiv( maxCellX, blockSize );
        const maxBlockY = floorDiv( maxCellY, blockSize );
        const maxBlockZ = floorDiv( maxCellZ, blockSize );

        for ( let blockX = minBlockX; blockX <= maxBlockX; blockX++ )
        {
            const centerX = origin.x + ( blockX * blockSize + blockSize * 0.5 ) * cellSize;
            for ( let blockY = minBlockY; blockY <= maxBlockY; blockY++ )
            {
                const centerY = origin.y + ( blockY * blockSize + blockSize * 0.5 ) * cellSize;
                for ( let blockZ = minBlockZ; blockZ <= maxBlockZ; blockZ++ )
                {
                    stats.blocksVisited++;
                    const centerZ = origin.z + ( blockZ * blockSize + blockSize * 0.5 ) * cellSize;
                    const blockValue = clippedSegmentField( segment, centerX, centerY, centerZ ).value;
                    const blockReach = segment.lipschitz * blockHalfDiagonal;
                    const sampleReach = segment.lipschitz * cellSize * SQRT_THREE * ( paddingCells + 1 );
                    const bucketKey = gridKey( blockX, blockY, blockZ );

                    // A one-sided bound indexes every primitive which could be
                    // inside, or close enough to affect a surface sample, in
                    // this coarse block.  Deep interiors must remain indexed so
                    // they can suppress another primitive's occluded surface.
                    if ( blockValue <= isoLevel + blockReach + sampleReach )
                    {
                        let bucket = segmentBuckets.get( bucketKey );
                        if ( !bucket )
                        {
                            bucket = [];
                            segmentBuckets.set( bucketKey, bucket );
                        }
                        bucket.push( segmentIndex );
                    }

                    // The hard-union boundary is a subset of the union of the
                    // individual primitive zero sets.  A two-sided Lipschitz
                    // bound therefore safely rejects blocks with no possible
                    // contribution to the final boundary.
                    if ( Math.abs( blockValue - isoLevel ) > blockReach + surfacePadding )
                    {
                        continue;
                    }
                    stats.surfaceBlocksVisited++;

                    const startX = Math.max( minCellX, blockX * blockSize );
                    const startY = Math.max( minCellY, blockY * blockSize );
                    const startZ = Math.max( minCellZ, blockZ * blockSize );
                    const endX = Math.min( maxCellX, ( blockX + 1 ) * blockSize - 1 );
                    const endY = Math.min( maxCellY, ( blockY + 1 ) * blockSize - 1 );
                    const endZ = Math.min( maxCellZ, ( blockZ + 1 ) * blockSize - 1 );
                    const cellReach = segment.lipschitz * cellHalfDiagonal + surfacePadding;

                    for ( let x = startX; x <= endX; x++ )
                    {
                        const worldX = origin.x + ( x + 0.5 ) * cellSize;
                        for ( let y = startY; y <= endY; y++ )
                        {
                            const worldY = origin.y + ( y + 0.5 ) * cellSize;
                            for ( let z = startZ; z <= endZ; z++ )
                            {
                                const worldZ = origin.z + ( z + 0.5 ) * cellSize;
                                if ( Math.abs(
                                    clippedSegmentField( segment, worldX, worldY, worldZ ).value - isoLevel
                                ) > cellReach )
                                {
                                    continue;
                                }
                                const key = cellKey( x, y, z );
                                if ( !candidateCells.has( key ) )
                                {
                                    candidateCells.set( key, { x, y, z } );
                                    if ( candidateCells.size > maxCells )
                                    {
                                        stats.candidateCells = candidateCells.size;
                                        stats.broadphaseBuckets = segmentBuckets.size;
                                        const candidateBounds = {
                                            minX: Number.POSITIVE_INFINITY,
                                            minY: Number.POSITIVE_INFINITY,
                                            minZ: Number.POSITIVE_INFINITY,
                                            maxX: Number.NEGATIVE_INFINITY,
                                            maxY: Number.NEGATIVE_INFINITY,
                                            maxZ: Number.NEGATIVE_INFINITY
                                        };
                                        for ( const cell of candidateCells.values() )
                                        {
                                            candidateBounds.minX = Math.min( candidateBounds.minX, cell.x );
                                            candidateBounds.minY = Math.min( candidateBounds.minY, cell.y );
                                            candidateBounds.minZ = Math.min( candidateBounds.minZ, cell.z );
                                            candidateBounds.maxX = Math.max( candidateBounds.maxX, cell.x );
                                            candidateBounds.maxY = Math.max( candidateBounds.maxY, cell.y );
                                            candidateBounds.maxZ = Math.max( candidateBounds.maxZ, cell.z );
                                        }
                                        const cellBounds = {
                                            min: {
                                                x: candidateBounds.minX,
                                                y: candidateBounds.minY,
                                                z: candidateBounds.minZ
                                            },
                                            max: {
                                                x: candidateBounds.maxX,
                                                y: candidateBounds.maxY,
                                                z: candidateBounds.maxZ
                                            }
                                        };
                                        const worldBounds = {
                                            min: {
                                                x: origin.x + candidateBounds.minX * cellSize,
                                                y: origin.y + candidateBounds.minY * cellSize,
                                                z: origin.z + candidateBounds.minZ * cellSize
                                            },
                                            max: {
                                                x: origin.x + ( candidateBounds.maxX + 1 ) * cellSize,
                                                y: origin.y + ( candidateBounds.maxY + 1 ) * cellSize,
                                                z: origin.z + ( candidateBounds.maxZ + 1 ) * cellSize
                                            }
                                        };
                                        const segmentCellBounds = {
                                            min: { x: minCellX, y: minCellY, z: minCellZ },
                                            max: { x: maxCellX, y: maxCellY, z: maxCellZ }
                                        };
                                        const segmentWorldBounds = {
                                            min: {
                                                x: origin.x + minCellX * cellSize,
                                                y: origin.y + minCellY * cellSize,
                                                z: origin.z + minCellZ * cellSize
                                            },
                                            max: {
                                                x: origin.x + ( maxCellX + 1 ) * cellSize,
                                                y: origin.y + ( maxCellY + 1 ) * cellSize,
                                                z: origin.z + ( maxCellZ + 1 ) * cellSize
                                            }
                                        };
                                        const observedCandidateCells = candidateCells.size;
                                        const error = new RangeError(
                                            `Sparse union exceeded maxCells (${maxCells}); observed `
                                            + `${observedCandidateCells} candidate cells while processing `
                                            + `segment ${segmentIndex} at cellSize ${cellSize}.`
                                        );
                                        error.code = 'SPARSE_MAX_CELLS_EXCEEDED';
                                        error.observedCandidateCells = observedCandidateCells;
                                        error.limit = maxCells;
                                        error.maxCells = maxCells;
                                        error.segmentIndex = segmentIndex;
                                        error.inputSegmentIndex = segment.inputIndex;
                                        error.segmentCount = segments.length;
                                        error.cellSize = cellSize;
                                        error.bounds = {
                                            candidateCells: cellBounds,
                                            candidateWorld: worldBounds,
                                            currentSegmentCells: segmentCellBounds,
                                            currentSegmentWorld: segmentWorldBounds
                                        };
                                        error.partialStats = {
                                            ...stats,
                                            completedSegments: segmentIndex,
                                            currentSegmentIndex: segmentIndex,
                                            currentInputSegmentIndex: segment.inputIndex
                                        };
                                        throw error;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    const cells = [ ...candidateCells.values() ];
    cells.sort( compareGridPoints );
    stats.candidateCells = cells.length;
    stats.broadphaseBuckets = segmentBuckets.size;
    return { cells, segmentBuckets };
}

function createFieldSampler( segments, segmentBuckets, settings, stats )
{
    const { cellSize, origin, blockSize, isoLevel, valueEpsilon } = settings;
    const samples = new Map();
    const farValue = isoLevel + cellSize * blockSize * SQRT_THREE * 4;

    function bucketForWorld( x, y, z )
    {
        const gridX = Math.floor( ( x - origin.x ) / cellSize );
        const gridY = Math.floor( ( y - origin.y ) / cellSize );
        const gridZ = Math.floor( ( z - origin.z ) / cellSize );
        return segmentBuckets.get( gridKey(
            floorDiv( gridX, blockSize ),
            floorDiv( gridY, blockSize ),
            floorDiv( gridZ, blockSize )
        ) );
    }

    function evaluate( x, y, z, preferredSegments = null )
    {
        const candidates = bucketForWorld( x, y, z ) ?? preferredSegments;
        if ( !candidates || candidates.length === 0 )
        {
            stats.missingSampleBuckets++;
            return { value: farValue, segmentIndex: -1 };
        }
        let value = Infinity;
        let segmentIndex = -1;
        let fieldMode = SPARSE_UNION_FIELD_MODES.TAPERED_CAPSULE;
        for ( const candidateIndex of candidates )
        {
            const candidate = clippedSegmentField( segments[ candidateIndex ], x, y, z );
            const candidateValue = candidate.value;
            if ( candidateValue < value - valueEpsilon
                || ( Math.abs( candidateValue - value ) <= valueEpsilon
                    && ( segmentIndex < 0 || candidateIndex < segmentIndex ) ) )
            {
                value = candidateValue;
                segmentIndex = candidateIndex;
                fieldMode = candidate.fieldMode;
            }
        }
        if ( Math.abs( value - isoLevel ) <= valueEpsilon )
        {
            // Symbolic, deterministic perturbation prevents a zero surface from
            // passing exactly through a lattice vertex (which otherwise creates
            // coincident vertices on several unrelated lattice edges).
            value = isoLevel + valueEpsilon;
        }
        return { value, segmentIndex, fieldMode };
    }

    function sample( x, y, z )
    {
        const key = gridKey( x, y, z );
        let result = samples.get( key );
        if ( result )
        {
            return result;
        }
        const worldX = origin.x + x * cellSize;
        const worldY = origin.y + y * cellSize;
        const worldZ = origin.z + z * cellSize;
        const evaluated = evaluate( worldX, worldY, worldZ );
        result = {
            x,
            y,
            z,
            key,
            worldX,
            worldY,
            worldZ,
            value: evaluated.value,
            segmentIndex: evaluated.segmentIndex,
            fieldMode: evaluated.fieldMode
        };
        samples.set( key, result );
        return result;
    }

    return { evaluate, sample, samples };
}

function tetraGradient( tetraSamples )
{
    const p0 = tetraSamples[ 0 ];
    const p1 = tetraSamples[ 1 ];
    const p2 = tetraSamples[ 2 ];
    const p3 = tetraSamples[ 3 ];
    const e1x = p1.worldX - p0.worldX;
    const e1y = p1.worldY - p0.worldY;
    const e1z = p1.worldZ - p0.worldZ;
    const e2x = p2.worldX - p0.worldX;
    const e2y = p2.worldY - p0.worldY;
    const e2z = p2.worldZ - p0.worldZ;
    const e3x = p3.worldX - p0.worldX;
    const e3y = p3.worldY - p0.worldY;
    const e3z = p3.worldZ - p0.worldZ;

    const c23x = e2y * e3z - e2z * e3y;
    const c23y = e2z * e3x - e2x * e3z;
    const c23z = e2x * e3y - e2y * e3x;
    const determinant = e1x * c23x + e1y * c23y + e1z * c23z;
    if ( Math.abs( determinant ) <= Number.EPSILON )
    {
        return { x: 0, y: 1, z: 0 };
    }

    const c31x = e3y * e1z - e3z * e1y;
    const c31y = e3z * e1x - e3x * e1z;
    const c31z = e3x * e1y - e3y * e1x;
    const c12x = e1y * e2z - e1z * e2y;
    const c12y = e1z * e2x - e1x * e2z;
    const c12z = e1x * e2y - e1y * e2x;
    const d1 = p1.value - p0.value;
    const d2 = p2.value - p0.value;
    const d3 = p3.value - p0.value;
    return {
        x: ( d1 * c23x + d2 * c31x + d3 * c12x ) / determinant,
        y: ( d1 * c23y + d2 * c31y + d3 * c12y ) / determinant,
        z: ( d1 * c23z + d2 * c31z + d3 * c12z ) / determinant
    };
}

function meshSparseCells( cells, segments, sampler, settings, stats )
{
    const { isoLevel, valueEpsilon, degenerateAreaEpsilon } = settings;
    const positions = [];
    const vertexSegments = [];
    const vertexFieldModes = [];
    const indices = [];
    const faceSegments = [];
    const faceFieldModes = [];
    const intersectionVertices = new Map();
    const triangleKeys = new Set();

    function intersectionVertex( first, second )
    {
        const key = edgeKey( first, second );
        const existing = intersectionVertices.get( key );
        if ( existing !== undefined )
        {
            return existing;
        }
        const denominator = second.value - first.value;
        const interpolation = Math.abs( denominator ) <= valueEpsilon
            ? 0.5
            : clamp( ( isoLevel - first.value ) / denominator, 0, 1 );
        const x = first.worldX + ( second.worldX - first.worldX ) * interpolation;
        const y = first.worldY + ( second.worldY - first.worldY ) * interpolation;
        const z = first.worldZ + ( second.worldZ - first.worldZ ) * interpolation;
        const provenance = sampler.evaluate( x, y, z,
            [ first.segmentIndex, second.segmentIndex ].filter( ( value ) => value >= 0 ) );
        const vertexIndex = positions.length / 3;
        positions.push( x, y, z );
        vertexSegments.push( provenance.segmentIndex );
        vertexFieldModes.push( provenance.fieldMode );
        intersectionVertices.set( key, vertexIndex );
        return vertexIndex;
    }

    function appendTriangle( a, b, c, gradient )
    {
        if ( a === b || b === c || c === a )
        {
            stats.discardedDegenerateTriangles++;
            return;
        }
        const ax = positions[ a * 3 ];
        const ay = positions[ a * 3 + 1 ];
        const az = positions[ a * 3 + 2 ];
        const abx = positions[ b * 3 ] - ax;
        const aby = positions[ b * 3 + 1 ] - ay;
        const abz = positions[ b * 3 + 2 ] - az;
        const acx = positions[ c * 3 ] - ax;
        const acy = positions[ c * 3 + 1 ] - ay;
        const acz = positions[ c * 3 + 2 ] - az;
        let nx = aby * acz - abz * acy;
        let ny = abz * acx - abx * acz;
        let nz = abx * acy - aby * acx;
        const areaSquared = nx * nx + ny * ny + nz * nz;
        if ( !Number.isFinite( areaSquared ) || areaSquared <= degenerateAreaEpsilon )
        {
            stats.discardedDegenerateTriangles++;
            return;
        }
        if ( nx * gradient.x + ny * gradient.y + nz * gradient.z < 0 )
        {
            [ b, c ] = [ c, b ];
            nx = -nx;
            ny = -ny;
            nz = -nz;
        }
        const ordered = [ a, b, c ].sort( ( left, right ) => left - right );
        const key = `${ordered[ 0 ]},${ordered[ 1 ]},${ordered[ 2 ]}`;
        if ( triangleKeys.has( key ) )
        {
            stats.discardedDuplicateTriangles++;
            return;
        }
        triangleKeys.add( key );

        const centroidX = ( ax + positions[ b * 3 ] + positions[ c * 3 ] ) / 3;
        const centroidY = ( ay + positions[ b * 3 + 1 ] + positions[ c * 3 + 1 ] ) / 3;
        const centroidZ = ( az + positions[ b * 3 + 2 ] + positions[ c * 3 + 2 ] ) / 3;
        const provenance = sampler.evaluate( centroidX, centroidY, centroidZ,
            [ vertexSegments[ a ], vertexSegments[ b ], vertexSegments[ c ] ]
                .filter( ( value, index, array ) => value >= 0 && array.indexOf( value ) === index ) );
        indices.push( a, b, c );
        faceSegments.push( provenance.segmentIndex );
        faceFieldModes.push( provenance.fieldMode );
    }

    function polygonizeTetrahedron( tetraSamples )
    {
        const inside = [];
        const outside = [];
        for ( let index = 0; index < 4; index++ )
        {
            ( tetraSamples[ index ].value < isoLevel ? inside : outside ).push( index );
        }
        if ( inside.length === 0 || inside.length === 4 )
        {
            return;
        }

        const gradient = tetraGradient( tetraSamples );
        if ( inside.length === 1 )
        {
            const inner = tetraSamples[ inside[ 0 ] ];
            appendTriangle(
                intersectionVertex( inner, tetraSamples[ outside[ 0 ] ] ),
                intersectionVertex( inner, tetraSamples[ outside[ 1 ] ] ),
                intersectionVertex( inner, tetraSamples[ outside[ 2 ] ] ),
                gradient
            );
            return;
        }
        if ( inside.length === 3 )
        {
            const outer = tetraSamples[ outside[ 0 ] ];
            appendTriangle(
                intersectionVertex( outer, tetraSamples[ inside[ 0 ] ] ),
                intersectionVertex( outer, tetraSamples[ inside[ 1 ] ] ),
                intersectionVertex( outer, tetraSamples[ inside[ 2 ] ] ),
                gradient
            );
            return;
        }

        const firstInside = tetraSamples[ inside[ 0 ] ];
        const secondInside = tetraSamples[ inside[ 1 ] ];
        const firstOutside = tetraSamples[ outside[ 0 ] ];
        const secondOutside = tetraSamples[ outside[ 1 ] ];
        const quad = [
            intersectionVertex( firstInside, firstOutside ),
            intersectionVertex( firstInside, secondOutside ),
            intersectionVertex( secondInside, secondOutside ),
            intersectionVertex( secondInside, firstOutside )
        ];
        appendTriangle( quad[ 0 ], quad[ 1 ], quad[ 2 ], gradient );
        appendTriangle( quad[ 0 ], quad[ 2 ], quad[ 3 ], gradient );
    }

    for ( const cell of cells )
    {
        const corners = CUBE_CORNERS.map( ( offset ) => sampler.sample(
            cell.x + offset[ 0 ],
            cell.y + offset[ 1 ],
            cell.z + offset[ 2 ]
        ) );
        for ( const tetrahedron of CUBE_TETRAHEDRA )
        {
            polygonizeTetrahedron( tetrahedron.map( ( index ) => corners[ index ] ) );
        }
    }

    return compactMesh(
        positions,
        indices,
        vertexSegments,
        faceSegments,
        vertexFieldModes,
        faceFieldModes,
        stats
    );
}

function compactMesh(
    sourcePositions,
    sourceIndices,
    sourceVertexSegments,
    faceSegments,
    sourceVertexFieldModes,
    faceFieldModes,
    stats
)
{
    const remap = new Int32Array( sourcePositions.length / 3 );
    remap.fill( -1 );
    let nextIndex = 0;
    for ( const sourceIndex of sourceIndices )
    {
        if ( remap[ sourceIndex ] < 0 )
        {
            remap[ sourceIndex ] = nextIndex++;
        }
    }

    const positions = new Float32Array( nextIndex * 3 );
    const vertexSegments = new Int32Array( nextIndex );
    const vertexFieldModes = new Uint8Array( nextIndex );
    for ( let sourceIndex = 0; sourceIndex < remap.length; sourceIndex++ )
    {
        const targetIndex = remap[ sourceIndex ];
        if ( targetIndex < 0 )
        {
            continue;
        }
        positions[ targetIndex * 3 ] = sourcePositions[ sourceIndex * 3 ];
        positions[ targetIndex * 3 + 1 ] = sourcePositions[ sourceIndex * 3 + 1 ];
        positions[ targetIndex * 3 + 2 ] = sourcePositions[ sourceIndex * 3 + 2 ];
        vertexSegments[ targetIndex ] = sourceVertexSegments[ sourceIndex ];
        vertexFieldModes[ targetIndex ] = sourceVertexFieldModes[ sourceIndex ];
    }

    const indices = new Uint32Array( sourceIndices.length );
    for ( let index = 0; index < sourceIndices.length; index++ )
    {
        indices[ index ] = remap[ sourceIndices[ index ] ];
    }
    stats.unusedIntersectionVertices = remap.length - nextIndex;
    return {
        positions,
        indices,
        vertexSegments,
        faceSegments: Int32Array.from( faceSegments ),
        vertexFieldModes,
        faceFieldModes: Uint8Array.from( faceFieldModes )
    };
}

function createNormals( positions, indices )
{
    const normals = new Float32Array( positions.length );
    for ( let index = 0; index < indices.length; index += 3 )
    {
        const a = indices[ index ];
        const b = indices[ index + 1 ];
        const c = indices[ index + 2 ];
        const ax = positions[ a * 3 ];
        const ay = positions[ a * 3 + 1 ];
        const az = positions[ a * 3 + 2 ];
        const abx = positions[ b * 3 ] - ax;
        const aby = positions[ b * 3 + 1 ] - ay;
        const abz = positions[ b * 3 + 2 ] - az;
        const acx = positions[ c * 3 ] - ax;
        const acy = positions[ c * 3 + 1 ] - ay;
        const acz = positions[ c * 3 + 2 ] - az;
        const nx = aby * acz - abz * acy;
        const ny = abz * acx - abx * acz;
        const nz = abx * acy - aby * acx;
        for ( const vertex of [ a, b, c ] )
        {
            normals[ vertex * 3 ] += nx;
            normals[ vertex * 3 + 1 ] += ny;
            normals[ vertex * 3 + 2 ] += nz;
        }
    }
    for ( let index = 0; index < normals.length; index += 3 )
    {
        const length = Math.hypot( normals[ index ], normals[ index + 1 ], normals[ index + 2 ] );
        if ( length > Number.EPSILON )
        {
            normals[ index ] /= length;
            normals[ index + 1 ] /= length;
            normals[ index + 2 ] /= length;
        }
        else
        {
            normals[ index + 1 ] = 1;
        }
    }
    return normals;
}

function mapProvenance( mesh, segments )
{
    const vertexOwners = new Int32Array( mesh.vertexSegments.length );
    const vertexEdges = new Int32Array( mesh.vertexSegments.length );
    for ( let index = 0; index < mesh.vertexSegments.length; index++ )
    {
        const segment = segments[ mesh.vertexSegments[ index ] ];
        vertexOwners[ index ] = segment?.ownerTableIndex ?? -1;
        vertexEdges[ index ] = segment?.edgeTableIndex ?? -1;
    }
    const faceOwners = new Int32Array( mesh.faceSegments.length );
    const faceEdges = new Int32Array( mesh.faceSegments.length );
    for ( let index = 0; index < mesh.faceSegments.length; index++ )
    {
        const segment = segments[ mesh.faceSegments[ index ] ];
        faceOwners[ index ] = segment?.ownerTableIndex ?? -1;
        faceEdges[ index ] = segment?.edgeTableIndex ?? -1;
    }
    return { vertexOwners, vertexEdges, faceOwners, faceEdges };
}

function topologyStats( vertexCount, indices )
{
    const parents = new Int32Array( vertexCount );
    for ( let index = 0; index < vertexCount; index++ )
    {
        parents[ index ] = index;
    }
    function find( index )
    {
        let root = index;
        while ( parents[ root ] !== root )
        {
            root = parents[ root ];
        }
        while ( parents[ index ] !== index )
        {
            const next = parents[ index ];
            parents[ index ] = root;
            index = next;
        }
        return root;
    }
    function unite( first, second )
    {
        const firstRoot = find( first );
        const secondRoot = find( second );
        if ( firstRoot !== secondRoot )
        {
            parents[ secondRoot ] = firstRoot;
        }
    }

    const edges = new Map();
    function includeEdge( first, second )
    {
        const low = Math.min( first, second );
        const high = Math.max( first, second );
        const key = `${low},${high}`;
        let record = edges.get( key );
        if ( !record )
        {
            record = { count: 0, balance: 0 };
            edges.set( key, record );
        }
        record.count++;
        record.balance += first === low ? 1 : -1;
        unite( first, second );
    }

    for ( let index = 0; index < indices.length; index += 3 )
    {
        includeEdge( indices[ index ], indices[ index + 1 ] );
        includeEdge( indices[ index + 1 ], indices[ index + 2 ] );
        includeEdge( indices[ index + 2 ], indices[ index ] );
    }
    let boundaryEdges = 0;
    let nonManifoldEdges = 0;
    let orientationMismatches = 0;
    for ( const record of edges.values() )
    {
        if ( record.count === 1 )
        {
            boundaryEdges++;
        }
        else if ( record.count !== 2 )
        {
            nonManifoldEdges++;
        }
        if ( record.count === 2 && record.balance !== 0 )
        {
            orientationMismatches++;
        }
    }
    const roots = new Set();
    for ( let index = 0; index < vertexCount; index++ )
    {
        roots.add( find( index ) );
    }
    const connectedComponents = vertexCount === 0 ? 0 : roots.size;
    const triangleCount = indices.length / 3;
    const eulerCharacteristic = vertexCount - edges.size + triangleCount;
    const genus = boundaryEdges === 0 && nonManifoldEdges === 0
        ? ( 2 * connectedComponents - eulerCharacteristic ) / 2
        : null;
    return {
        uniqueEdges: edges.size,
        boundaryEdges,
        nonManifoldEdges,
        orientationMismatches,
        connectedComponents,
        eulerCharacteristic,
        genus
    };
}

/**
 * Build one indexed hard-union mesh from variable-radius line segments.
 *
 * @param {Array<{a:{x:number,y:number,z:number},b:{x:number,y:number,z:number},
 * radiusA:number,radiusB:number,ownerId?:*,edgeIndex?:*,clipPlane?:{
 * center:{x:number,y:number,z:number},normal:{x:number,y:number,z:number}}}>} sourceSegments
 * @param {{cellSize:number,isoLevel?:number,paddingCells?:number,
 * blockSize?:number,maxCells?:number,origin?:{x:number,y:number,z:number}|number[],
 * valueEpsilon?:number,degenerateAreaEpsilon?:number}} options
 * @returns {{positions:Float32Array,indices:Uint32Array,normals:Float32Array,
 * faceOwners:Int32Array,vertexOwners:Int32Array,faceEdges:Int32Array,
 * vertexEdges:Int32Array,faceFieldModes:Uint8Array,vertexFieldModes:Uint8Array,
 * ownerIds:Array,edgeIds:Array,stats:Object}}
 */
export function buildSparseUnionMesh( sourceSegments, options = {} )
{
    if ( !Array.isArray( sourceSegments ) )
    {
        throw new TypeError( 'segments must be an array' );
    }
    const cellSize = options.cellSize;
    if ( !Number.isFinite( cellSize ) || cellSize <= 0 )
    {
        throw new RangeError( 'options.cellSize must be a finite positive number' );
    }

    const startedAt = typeof performance !== 'undefined' && performance.now
        ? performance.now()
        : Date.now();
    const stats = {
        algorithm: 'sparse-uniform-marching-tetrahedra',
        field: 'hard-min tapered-capsule',
        inputSegments: sourceSegments.length,
        validSegments: 0,
        invalidSegments: 0,
        degenerateSegments: 0,
        clampedRadii: 0,
        clippedSegments: 0,
        invalidClipPlanes: 0,
        blocksVisited: 0,
        surfaceBlocksVisited: 0,
        broadphaseBuckets: 0,
        candidateCells: 0,
        latticeSamples: 0,
        missingSampleBuckets: 0,
        discardedDegenerateTriangles: 0,
        discardedDuplicateTriangles: 0,
        unusedIntersectionVertices: 0,
        warnings: []
    };
    const settings = {
        cellSize,
        isoLevel: Number.isFinite( options.isoLevel ) ? options.isoLevel : 0,
        paddingCells: Number.isFinite( options.paddingCells )
            ? Math.max( 0, options.paddingCells )
            : 0.25,
        blockSize: Number.isInteger( options.blockSize )
            ? clamp( options.blockSize, 2, 64 )
            : 8,
        maxCells: Number.isInteger( options.maxCells ) && options.maxCells > 0
            ? options.maxCells
            : 2_000_000,
        origin: normalizeOrigin( options.origin ),
        valueEpsilon: Number.isFinite( options.valueEpsilon ) && options.valueEpsilon > 0
            ? options.valueEpsilon
            // This is deliberately larger than floating-point epsilon.  It is
            // still only 0.01% of a cell, but keeps a lattice-aligned zero from
            // collapsing several marching-tetrahedra intersections onto the
            // same point and leaving a hole when degenerate faces are removed.
            : Math.max( cellSize * 1e-4, Number.EPSILON * 32 ),
        degenerateAreaEpsilon: Number.isFinite( options.degenerateAreaEpsilon )
            && options.degenerateAreaEpsilon >= 0
            ? options.degenerateAreaEpsilon
            : Math.pow( cellSize, 4 ) * 1e-18
    };

    const normalized = normalizeSegments( sourceSegments, cellSize, stats );
    const { segments, ownerIds, edgeIds } = normalized;
    if ( segments.length === 0 )
    {
        return {
            positions: new Float32Array(),
            indices: new Uint32Array(),
            normals: new Float32Array(),
            faceOwners: new Int32Array(),
            vertexOwners: new Int32Array(),
            faceEdges: new Int32Array(),
            vertexEdges: new Int32Array(),
            faceFieldModes: new Uint8Array(),
            vertexFieldModes: new Uint8Array(),
            ownerIds,
            edgeIds,
            stats: {
                ...stats,
                vertices: 0,
                triangles: 0,
                cellSize,
                elapsedMs: 0,
                topology: topologyStats( 0, new Uint32Array() )
            }
        };
    }

    const minimumRadius = Math.min( ...segments.map( ( segment ) => segment.minRadius ) );
    const maximumRadius = Math.max( ...segments.map( ( segment ) => segment.maxRadius ) );
    Object.assign( stats, {
        cellSize,
        minimumRadius,
        maximumRadius,
        radiusToCellRatio: minimumRadius / cellSize
    } );
    if ( cellSize > minimumRadius )
    {
        stats.warnings.push(
            `cellSize (${cellSize}) exceeds minimum radius (${minimumRadius}); `
            + 'the thinnest features may disappear or disconnect.'
        );
    }

    const domain = createSparseDomain( segments, settings, stats );
    const sampler = createFieldSampler( segments, domain.segmentBuckets, settings, stats );
    const mesh = meshSparseCells( domain.cells, segments, sampler, settings, stats );
    if ( stats.clippedSegments > 0 )
    {
        stats.field = 'hard-min of half-space-clipped tapered capsules';
    }
    stats.latticeSamples = sampler.samples.size;
    const normals = createNormals( mesh.positions, mesh.indices );
    const provenance = mapProvenance( mesh, segments );
    const topology = topologyStats( mesh.positions.length / 3, mesh.indices );
    const finishedAt = typeof performance !== 'undefined' && performance.now
        ? performance.now()
        : Date.now();
    Object.assign( stats, {
        vertices: mesh.positions.length / 3,
        triangles: mesh.indices.length / 3,
        elapsedMs: finishedAt - startedAt,
        topology
    } );

    return {
        positions: mesh.positions,
        indices: mesh.indices,
        normals,
        faceOwners: provenance.faceOwners,
        vertexOwners: provenance.vertexOwners,
        faceEdges: provenance.faceEdges,
        vertexEdges: provenance.vertexEdges,
        faceFieldModes: mesh.faceFieldModes,
        vertexFieldModes: mesh.vertexFieldModes,
        ownerIds,
        edgeIds,
        stats
    };
}


import * as THREE from 'three';
import { createBranchCurve, getConduitRadii } from './tree-layer.js';
import { resolveSemanticCollisions } from './semantic-collision-resolver.js';

function smoothstep( value )
{
    const t = Math.max( 0, Math.min( 1, value ) );
    return t * t * ( 3 - 2 * t );
}

function edgeId( edge )
{
    return `${edge.parent.id} -> ${edge.child.id}`;
}

function progressForNode( node, growthProgress )
{
    if ( node.growthEligible === false ) return 0;
    if ( !node.latent ) return 1;
    return Math.max( 0, Math.min( 1, growthProgress.get( node.id ) ?? 0 ) );
}

function inheritedRoute( hierarchy, node )
{
    const route = [];
    let cursor = node;
    while ( cursor )
    {
        route.push( cursor.id );
        cursor = cursor.parentId ? hierarchy.byId.get( cursor.parentId ) : null;
    }
    return route;
}

/**
 * Samples the authored skeleton once and resolves only physically impossible,
 * non-semantic contacts.  Growth subsequently truncates these same paths, so a
 * replay cannot choose a different silhouette from the mature tree.
 */
export function prepareTreeSurfaceModel( hierarchy, positions, parameters = {}, options = {} )
{
    const conduitWeight = parameters.conduitWeight ?? 1;
    const asymmetry = parameters.asymmetry ?? 0.55;
    const sampleSpacing = options.sampleSpacing ?? 0.105;
    const sourceEdges = [];

    hierarchy.edges.forEach( ( edge, edgeIndex ) => {
        if ( edge.child.growthEligible === false ) return;
        const startData = positions.get( edge.parent.id );
        const endData = positions.get( edge.child.id );
        const curve = createBranchCurve(
            new THREE.Vector3( startData.x, startData.y, startData.z ),
            new THREE.Vector3( endData.x, endData.y, endData.z ),
            edge,
            asymmetry
        );
        const radii = getConduitRadii( edge, conduitWeight );
        const length = curve.getLength();
        const segmentCount = Math.max( 3, Math.ceil( length / sampleSpacing ) );
        const points = [];
        for ( let index = 0; index <= segmentCount; index += 1 )
        {
            const t = index / segmentCount;
            const point = curve.getPoint( t );
            points.push( {
                x: point.x,
                y: point.y,
                z: point.z,
                radius: THREE.MathUtils.lerp( radii.start, Math.max( radii.end, 0.045 ), smoothstep( t ) ),
                t
            } );
        }
        sourceEdges.push( {
            id: edgeId( edge ),
            edgeIndex,
            parentId: edge.parent.id,
            childId: edge.child.id,
            parentRoute: inheritedRoute( hierarchy, edge.parent ),
            childRoute: inheritedRoute( hierarchy, edge.child ),
            isTrunk: ( edge.parent.kind === 'root' || edge.parent.kind === 'trunk' )
                && edge.child.kind === 'trunk',
            latent: edge.child.latent === true,
            node: {
                id: edge.child.id,
                latent: edge.child.latent === true,
                growthEligible: edge.child.growthEligible !== false
            },
            points
        } );
    } );

    const extremeDensity = sourceEdges.length > 560 && conduitWeight > 1.6;
    const collisionOptions = {
        clearance: options.collisionClearance ?? Math.max( 0.006, 0.012 * conduitWeight ),
        junctionAllowance: options.junctionAllowance ?? 0.025,
        junctionRadiusFactor: options.junctionRadiusFactor ?? 2.75,
        siblingJunctionAllowance: options.siblingJunctionAllowance ?? 0.008,
        siblingJunctionRadiusFactor: options.siblingJunctionRadiusFactor ?? 0.82,
        maxIterations: options.collisionIterations ?? ( extremeDensity ? 120 : 80 ),
        maxDisplacement: options.maxCollisionDisplacement ?? ( extremeDensity ? 2 : 1.2 ),
        maxNodeDisplacement: options.maxNodeDisplacement ?? ( extremeDensity ? 1.2 : 0.8 ),
        relaxSharedNodes: true,
        fixedNodeIds: [ hierarchy.root.id ],
        influenceRadius: options.collisionInfluenceRadius ?? 0.38,
        cellSize: options.collisionCellSize ?? 0.34,
        silhouetteAxis: options.silhouetteAxis ?? { x: 0, y: 0, z: 1 }
    };
    const resolved = options.resolveCollisions === false
        ? {
            edges: sourceEdges,
            report: {
                converged: true,
                fusionFree: true,
                initialContactCount: 0,
                finalContactCount: 0,
                finalSurfaceOverlapPairCount: 0,
                unresolved: [],
                skipped: true
            }
        }
        : resolveSemanticCollisions( sourceEdges, collisionOptions );

    const minimumModelRadius = sourceEdges.reduce(
        ( minimum, edge ) => Math.min(
            minimum,
            ...edge.points.map( ( point ) => point.radius )
        ),
        Number.POSITIVE_INFINITY
    );
    const cellSize = options.cellSize
        ?? Math.max( 0.024, Math.min( 0.042, minimumModelRadius * 0.72 ) );

    return {
        hierarchy,
        conduitWeight,
        cellSize,
        collisionOptions,
        edges: resolved.edges,
        collisionReport: resolved.report,
        activeEdgeIds: new Set( resolved.edges.map( ( edge ) => edge.id ) )
    };
}

function interpolatePoint( a, b, fraction, t )
{
    return {
        x: THREE.MathUtils.lerp( a.x, b.x, fraction ),
        y: THREE.MathUtils.lerp( a.y, b.y, fraction ),
        z: THREE.MathUtils.lerp( a.z, b.z, fraction ),
        radius: THREE.MathUtils.lerp( a.radius, b.radius, fraction ),
        t
    };
}

function truncatePoints( points, progress )
{
    if ( progress >= 1 ) return points;
    const scaled = progress * ( points.length - 1 );
    const whole = Math.floor( scaled );
    const fraction = scaled - whole;
    const result = points.slice( 0, whole + 1 );
    if ( whole < points.length - 1 && fraction > 1e-8 )
    {
        result.push( interpolatePoint( points[whole], points[whole + 1], fraction, progress ) );
    }
    return result;
}

/**
 * Converts one quantised growth state to tapered-capsule primitives.  Consecutive
 * primitives overlap as a hard union; there are no per-edge caps in the result.
 */
export function createTreeSurfaceSegments( model, growthProgress = new Map() )
{
    const state = createTreeSurfaceEdges( model, growthProgress );
    const segments = [];
    for ( const edge of state.edges )
    {
        for ( let index = 0; index < edge.points.length - 1; index += 1 )
        {
            const a = edge.points[index];
            const b = edge.points[index + 1];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dz = b.z - a.z;
            if ( dx * dx + dy * dy + dz * dz < 1e-12 ) continue;
            segments.push( {
                a: { x: a.x, y: a.y, z: a.z },
                b: { x: b.x, y: b.y, z: b.z },
                radiusA: a.radius,
                radiusB: b.radius,
                ownerId: edge.id,
                edgeIndex: edge.edgeIndex
            } );
        }
    }
    return { ...state, segments };
}

/**
 * Returns the collision-resolved semantic edges for one growth state. This is
 * the preferred input for the hybrid junction/tube mesher because it retains
 * the exact node ownership on both sides of every span.
 */
export function createTreeSurfaceEdges( model, growthProgress = new Map() )
{
    const eligibleLatent = model.hierarchy.nodes.filter(
        ( node ) => node.latent && node.growthEligible !== false
    );
    const crownProgress = eligibleLatent.length === 0
        ? 1
        : eligibleLatent.reduce(
            ( sum, node ) => sum + progressForNode( node, growthProgress ),
            0
        ) / eligibleLatent.length;
    const edges = [];
    const releasedEdgeIds = [];
    let complete = true;

    for ( const edge of model.edges )
    {
        const progress = progressForNode( edge.node, growthProgress );
        if ( edge.latent && progress < 1 ) complete = false;
        if ( progress <= 1e-5 ) continue;

        const points = truncatePoints( edge.points, progress );
        if ( points.length < 2 ) continue;
        releasedEdgeIds.push( edge.id );
        const ringProgress = edge.isTrunk
            ? ( edge.latent ? 0.48 + progress * 0.52 : 0.58 + crownProgress * 0.42 )
            : 1;
        edges.push( {
            ...edge,
            points: points.map( ( point ) => ( {
                ...point,
                radius: point.radius * ringProgress
            } ) )
        } );
    }

    return {
        edges,
        releasedEdgeIds,
        complete,
        crownProgress,
        cellSize: complete ? model.cellSize : model.cellSize * 1.28
    };
}

export function quantisedGrowthSignature( model, growthProgress, steps = 14 )
{
    const values = [];
    for ( const edge of model.edges )
    {
        if ( !edge.latent ) continue;
        const value = progressForNode( edge.node, growthProgress );
        values.push( Math.min( steps, Math.floor( value * steps + 1e-8 ) ) );
    }
    return values.join( ',' );
}

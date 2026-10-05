import assert from 'node:assert/strict';
import test from 'node:test';
import { buildHybridTreeMesh } from '../../src/category-tree/tree/hybrid-tree-mesher.js';
import {
    auditMesh,
    auditTriangleSelfIntersections
} from '../../src/category-tree/tree/mesh-audit.js';

const p = ( x, y, z, radius ) => ( { x, y, z, radius } );

function edge( id, edgeIndex, parentId, childId, points )
{
    return { id, edgeIndex, parentId, childId, points };
}

function assertManifold( mesh, components = 1 )
{
    const topology = mesh.stats.topology;
    assert.ok( mesh.positions.length > 0 );
    assert.equal( mesh.positions.length % 3, 0 );
    assert.equal( mesh.indices.length % 3, 0 );
    assert.equal( mesh.faceOwners.length, mesh.indices.length / 3 );
    assert.equal( mesh.faceEdges.length, mesh.indices.length / 3 );
    assert.equal( mesh.vertexOwners.length, mesh.positions.length / 3 );
    assert.equal( mesh.vertexEdges.length, mesh.positions.length / 3 );
    assert.ok( [ ...mesh.positions ].every( Number.isFinite ) );
    assert.ok( [ ...mesh.normals ].every( Number.isFinite ) );
    assert.equal( topology.boundaryEdges, 0 );
    assert.equal( topology.nonManifoldEdges, 0 );
    assert.equal( topology.orientationMismatches, 0 );
    assert.equal( topology.connectedComponents, components );
    assert.equal( topology.eulerCharacteristic, components * 2 );
    assert.equal( topology.genus, 0 );
    assert.equal( mesh.stats.orientationRepair.orientationConflicts, 0 );
    assert.equal( mesh.stats.normalSolver.opposedFaces, 0 );
    assert.ok( mesh.stats.normalSolver.minimumAverageDot >= -0.05 );
    for ( const patch of mesh.stats.patches )
    {
        assert.ok( patch.postCapTopology );
        assert.equal( patch.postCapTopology.connectedComponents, 1 );
        assert.equal( patch.postCapTopology.boundaryLoops, patch.ports );
        assert.equal( patch.postCapTopology.openBoundaryChains, 0 );
        assert.equal( patch.postCapTopology.nonManifoldEdges, 0 );
        assert.equal( patch.postCapTopology.nonManifoldVertices, 0 );
        assert.equal( patch.postCapTopology.eulerCharacteristic, 2 - patch.ports );
        assert.equal( patch.postCapTopology.genus, 0 );
    }
    for ( const bridge of mesh.stats.bridges )
    {
        if ( !bridge.staged )
        {
            assert.equal( bridge.triangles, bridge.sourceVertices + bridge.targetVertices );
        }
        else
        {
            assert.ok( bridge.intermediateRings >= 2 );
            assert.ok( bridge.triangles > bridge.sourceVertices + bridge.targetVertices );
        }
    }
}

function geometryAdapter( mesh )
{
    const attribute = ( array ) => ( { array, itemSize: 3, count: array.length / 3 } );
    return {
        index: { array: mesh.indices, count: mesh.indices.length },
        attributes: {
            position: attribute( mesh.positions ),
            normal: attribute( mesh.normals )
        }
    };
}

const coarse = {
    cellSize: 0.1,
    minimumCellSize: 0.055,
    radialSegments: 8,
    acuteAngle: 7,
    maxPatchCells: 100_000
};

test( 'trunk continuation and lateral releases form one closed skin', () =>
{
    const mesh = buildHybridTreeMesh( [
        edge( 'lower trunk', 0, 'root', 'release', [ p( 0, -2.2, 0, 0.42 ), p( 0, 0, 0, 0.36 ) ] ),
        edge( 'upper trunk', 1, 'release', 'crown', [ p( 0, 0, 0, 0.36 ), p( 0.08, 2.1, 0.05, 0.25 ) ] ),
        edge( 'left release', 2, 'release', 'left', [ p( 0, 0, 0, 0.34 ), p( -1.8, 1.2, 0.15, 0.14 ) ] ),
        edge( 'right release', 3, 'release', 'right', [ p( 0, 0, 0, 0.34 ), p( 1.7, 1.35, -0.12, 0.14 ) ] )
    ], coarse );

    assertManifold( mesh );
    assert.deepEqual( new Set( mesh.ownerIds ), new Set( [
        'lower trunk', 'upper trunk', 'left release', 'right release'
    ] ) );
    const releaseCluster = mesh.clusters.find( ( cluster ) => cluster.nodeIds.includes( 'release' ) );
    assert.equal( releaseCluster.ownerIds.length, 4 );
    assert.equal( mesh.allowedOwnerPairs.length, 6 );
    const geometry = geometryAdapter( mesh );
    const strict = auditMesh( geometry, { maxDetails: 100_000 } );
    assert.equal( strict.ok, true, strict.failures.join( '\n' ) );
    assert.equal( mesh.stats.minimumDoubleArea, strict.tolerances.minimumDoubleArea );
    assert.equal( strict.normals.opposedTriangles, 0 );
    const intersections = auditTriangleSelfIntersections( geometry, {
        maxTriangles: 12_000,
        maxCandidatePairs: 3_000_000,
        maxDetails: 100_000
    } );
    assert.equal( intersections.complete, true );
    assert.equal( intersections.intersectionCount, 0 );
} );

test( 'dense 181-to-12 collar reduction stays local and intersection-free', () =>
{
    const mesh = buildHybridTreeMesh( [
        edge( 'dense reducer', 0, 'root', 'tip', [
            p( 0, -1.5, 0, 0.3195 ),
            p( 0, 1.5, 0, 0.3195 )
        ] )
    ], {
        cellSize: 0.0319,
        minimumCellSize: 0.0319,
        radialSegments: 12,
        maxPatchCells: 240_000,
        forceStagedBridges: true
    } );

    assertManifold( mesh );
    assert.equal( mesh.stats.bridges.length, 2 );
    for ( const bridge of mesh.stats.bridges )
    {
        assert.equal( bridge.sourceVertices, 181 );
        assert.equal( bridge.targetVertices, 12 );
        assert.equal( bridge.staged, true );
        assert.equal( bridge.internalIntersections, 0 );
        assert.ok( bridge.axialSlabs.length >= 4 );
        for ( let index = 1; index < bridge.axialSlabs.length; index += 1 )
        {
            assert.ok(
                bridge.axialSlabs[ index - 1 ].maximum < bridge.axialSlabs[ index ].minimum,
                `collar slabs overlap: ${JSON.stringify( bridge.axialSlabs )}`
            );
        }
    }

    const geometry = geometryAdapter( mesh );
    const strict = auditMesh( geometry, { maxDetails: 1_000 } );
    assert.equal( strict.ok, true, strict.failures.join( '\n' ) );
    assert.equal( mesh.stats.minimumDoubleArea, strict.tolerances.minimumDoubleArea );
    assert.equal( strict.degeneracy.repeatedIndexTriangles, 0 );
    assert.equal( strict.degeneracy.zeroAreaTriangles, 0 );
    assert.equal( strict.topology.nonManifoldEdges, 0 );
    assert.equal( strict.topology.nonManifoldVertices, 0 );
    assert.equal( strict.topology.orientationConflicts, 0 );
    const intersections = auditTriangleSelfIntersections( geometry, {
        maxTriangles: 50_000,
        maxCandidatePairs: 10_000_000,
        maxDetails: 1_000
    } );
    assert.equal( intersections.complete, true );
    assert.equal( intersections.intersectionCount, 0 );
} );

test( 'cached patch loops are rebound after a semantic merge renumbers ports', () =>
{
    const edges = [
        edge( 'cache-lower', 0, 'root', 'lower', [
            p( 0, -3, 0, 0.25 ), p( 0, -1, 0, 0.22 )
        ] ),
        edge( 'cache-middle', 1, 'lower', 'upper', [
            p( 0, -1, 0, 0.22 ), p( 0.1, 1, 0, 0.19 )
        ] ),
        edge( 'cache-upper', 2, 'upper', 'tip', [
            p( 0.1, 1, 0, 0.19 ), p( 0.2, 3, 0, 0.14 )
        ] )
    ];
    const cache = new Map();
    const options = {
        ...coarse,
        cellSize: 0.08,
        minimumCellSize: 0.05,
        _patchCache: cache
    };
    buildHybridTreeMesh( edges, options );
    const merged = buildHybridTreeMesh( edges, {
        ...options,
        _forcedMergeEdgeKeys: [ 'string:cache-middle|number:1' ]
    } );

    assertManifold( merged );
    assert.equal( merged.stats.absorbedEdges, 1 );
    assert.ok( merged.stats.sparseMeshing.cacheHits >= 2 );
    assert.ok( merged.stats.patches.some( ( patch ) => patch.cacheHit ) );
} );

test( 'a principal three-way branch has one genus-zero component', () =>
{
    const mesh = buildHybridTreeMesh( [
        edge( 'stem', 0, 'root', 'meaning', [ p( 0, -1.7, 0, 0.36 ), p( 0, 0, 0, 0.3 ) ] ),
        edge( 'meaning-a', 1, 'meaning', 'a', [ p( 0, 0, 0, 0.3 ), p( -1.55, 1.25, 0.18, 0.13 ) ] ),
        edge( 'meaning-b', 2, 'meaning', 'b', [ p( 0, 0, 0, 0.3 ), p( 0.08, 1.9, -0.18, 0.13 ) ] ),
        edge( 'meaning-c', 3, 'meaning', 'c', [ p( 0, 0, 0, 0.3 ), p( 1.5, 1.3, 0.22, 0.13 ) ] )
    ], coarse );

    assertManifold( mesh );
    assert.ok( mesh.stats.junctionClusters >= 4 );
    assert.ok( mesh.stats.explicitSpans >= 3 );
} );

test( 'an over-capacity thick junction coarsens only its local patch within the radius bound', () =>
{
    const edges = [
        edge( 'capacity-stem', 0, 'root', 'junction', [
            p( 0, -1.7, 0, 0.36 ), p( 0, 0, 0, 0.3 )
        ] ),
        edge( 'capacity-a', 1, 'junction', 'a', [
            p( 0, 0, 0, 0.3 ), p( -1.55, 1.25, 0.18, 0.13 )
        ] ),
        edge( 'capacity-b', 2, 'junction', 'b', [
            p( 0, 0, 0, 0.3 ), p( 0.08, 1.9, -0.18, 0.13 )
        ] ),
        edge( 'capacity-c', 3, 'junction', 'c', [
            p( 0, 0, 0, 0.3 ), p( 1.5, 1.3, 0.22, 0.13 )
        ] )
    ];
    const cache = new Map();
    const options = {
        ...coarse,
        cellSize: 0.04,
        minimumCellSize: 0.02,
        maxPatchCells: 15_000,
        _patchCache: cache
    };
    const first = buildHybridTreeMesh( edges, options );
    assertManifold( first );
    assert.ok( first.stats.sparseMeshing.capacityRetries >= 1 );
    const adjusted = first.stats.patches.filter( ( patch ) => patch.capacityRetries.length > 0 );
    assert.equal( adjusted.length, 1 );
    assert.ok( adjusted[ 0 ].cellSize > adjusted[ 0 ].requestedCellSize );
    assert.ok( adjusted[ 0 ].minimumRadiusCells >= 4 - 1e-12 );
    for ( const retry of adjusted[ 0 ].capacityRetries )
    {
        assert.ok( retry.minimumRadiusCellsAfter >= 4 - 1e-12 );
        assert.equal( retry.limit, 15_000 );
    }

    const cached = buildHybridTreeMesh( edges, options );
    assertManifold( cached );
    assert.equal( cached.stats.sparseMeshing.capacityRetries, 0 );
    const cachedAdjusted = cached.stats.patches.find(
        ( patch ) => patch.clusterId === adjusted[ 0 ].clusterId
    );
    assert.equal( cachedAdjusted.cacheHit, true );
    assert.equal( cachedAdjusted.cellSize, adjusted[ 0 ].cellSize );
    assert.equal( cachedAdjusted.capacityRetries.length, 0 );
    assert.equal( cachedAdjusted.cachedCapacityRetries.length, adjusted[ 0 ].capacityRetries.length );
} );

test( 'crowded recursive branching remains closed without a global field', () =>
{
    const mesh = buildHybridTreeMesh( [
        edge( 'stem', 0, 'r', 'j0', [ p( 0, -1.4, 0, 0.3 ), p( 0, 0, 0, 0.25 ) ] ),
        edge( 'left', 1, 'j0', 'j1', [ p( 0, 0, 0, 0.25 ), p( -0.9, 0.9, 0.08, 0.16 ) ] ),
        edge( 'right', 2, 'j0', 'j2', [ p( 0, 0, 0, 0.25 ), p( 0.9, 0.9, -0.08, 0.16 ) ] ),
        edge( 'left-a', 3, 'j1', 'la', [ p( -0.9, 0.9, 0.08, 0.16 ), p( -1.45, 1.75, 0.25, 0.075 ) ] ),
        edge( 'left-b', 4, 'j1', 'lb', [ p( -0.9, 0.9, 0.08, 0.16 ), p( -0.38, 1.72, -0.05, 0.075 ) ] ),
        edge( 'right-a', 5, 'j2', 'ra', [ p( 0.9, 0.9, -0.08, 0.16 ), p( 0.38, 1.72, 0.05, 0.075 ) ] ),
        edge( 'right-b', 6, 'j2', 'rb', [ p( 0.9, 0.9, -0.08, 0.16 ), p( 1.45, 1.75, -0.25, 0.075 ) ] )
    ], { ...coarse, cellSize: 0.075, minimumCellSize: 0.045 } );

    assertManifold( mesh );
    assert.equal( mesh.stats.validEdges, 7 );
    assert.ok( mesh.stats.patches.every( ( patch ) => patch.primitives <= 3 ) );
} );

test( 'a thin short fork is absorbed into a semantic local cluster', () =>
{
    const mesh = buildHybridTreeMesh( [
        edge( 'stem', 0, 'r', 'fork', [ p( 0, -1, 0, 0.22 ), p( 0, 0, 0, 0.15 ) ] ),
        edge( 'short', 1, 'fork', 'near', [ p( 0, 0, 0, 0.15 ), p( 0.08, 0.11, 0, 0.09 ) ] ),
        edge( 'thin-a', 2, 'near', 'a', [ p( 0.08, 0.11, 0, 0.09 ), p( -0.55, 0.9, 0.07, 0.045 ) ] ),
        edge( 'thin-b', 3, 'near', 'b', [ p( 0.08, 0.11, 0, 0.09 ), p( 0.72, 0.82, -0.06, 0.045 ) ] )
    ], { ...coarse, cellSize: 0.055, minimumCellSize: 0.03 } );

    assertManifold( mesh );
    assert.ok( mesh.stats.absorbedEdges >= 1 );
    const cluster = mesh.clusters.find( ( candidate ) => candidate.nodeIds.includes( 'fork' ) );
    assert.ok( cluster.nodeIds.includes( 'near' ) );
    assert.ok( cluster.ownerIds.includes( 'short' ) );
} );

test( 'nearby unrelated branches are never put in the same implicit union', () =>
{
    const mesh = buildHybridTreeMesh( [
        edge( 'near-one', 10, 'a0', 'a1', [ p( -0.13, -1, 0, 0.11 ), p( -0.13, 1, 0, 0.1 ) ] ),
        edge( 'near-two', 20, 'b0', 'b1', [ p( 0.13, -1, 0.03, 0.11 ), p( 0.13, 1, 0.03, 0.1 ) ] )
    ], { ...coarse, cellSize: 0.055, minimumCellSize: 0.035 } );

    assertManifold( mesh, 2 );
    assert.deepEqual( mesh.allowedOwnerPairs, [] );
    assert.ok( mesh.clusters.every( ( cluster ) => cluster.ownerIds.length === 1 ) );
} );


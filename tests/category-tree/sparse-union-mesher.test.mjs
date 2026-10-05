import assert from 'node:assert/strict';
import test from 'node:test';
import {
    buildSparseUnionMesh,
    SPARSE_UNION_FIELD_MODES
} from '../../src/category-tree/tree/sparse-union-mesher.js';

function assertClosedOrientedManifold( result, expectedComponents = 1 )
{
    const topology = result.stats.topology;
    assert.equal( topology.boundaryEdges, 0 );
    assert.equal( topology.nonManifoldEdges, 0 );
    assert.equal( topology.orientationMismatches, 0 );
    assert.equal( topology.connectedComponents, expectedComponents );
    assert.equal( result.indices.length % 3, 0 );
    assert.equal( result.faceOwners.length, result.indices.length / 3 );
    assert.equal( result.vertexOwners.length, result.positions.length / 3 );
    assert.equal( result.faceFieldModes.length, result.indices.length / 3 );
    assert.equal( result.vertexFieldModes.length, result.positions.length / 3 );
    assert.ok( [ ...result.positions ].every( Number.isFinite ) );
    assert.ok( [ ...result.normals ].every( Number.isFinite ) );
}

test( 'a tapered capsule is closed, oriented and attributed', () =>
{
    const result = buildSparseUnionMesh( [ {
        a: { x: 0.13, y: -0.27, z: 0.31 },
        b: { x: 1.91, y: 0.42, z: -0.18 },
        radiusA: 0.31,
        radiusB: 0.17,
        ownerId: 'limb',
        edgeIndex: 17
    } ], { cellSize: 0.1 } );

    assertClosedOrientedManifold( result );
    assert.equal( result.stats.topology.eulerCharacteristic, 2 );
    assert.deepEqual( result.ownerIds, [ 'limb' ] );
    assert.deepEqual( result.edgeIds, [ 17 ] );
    assert.ok( [ ...result.faceOwners ].every( ( owner ) => owner === 0 ) );
} );

test( 'an aligned three-way junction is one watertight hard union', () =>
{
    const result = buildSparseUnionMesh( [
        {
            a: { x: 0, y: -2, z: 0 },
            b: { x: 0, y: 0, z: 0 },
            radiusA: 0.45,
            radiusB: 0.35,
            ownerId: 'trunk',
            edgeIndex: 0
        },
        {
            a: { x: 0, y: 0, z: 0 },
            b: { x: -1.5, y: 1, z: 0 },
            radiusA: 0.35,
            radiusB: 0.18,
            ownerId: 'left',
            edgeIndex: 1
        },
        {
            a: { x: 0, y: 0, z: 0 },
            b: { x: 1.5, y: 1, z: 0 },
            radiusA: 0.35,
            radiusB: 0.18,
            ownerId: 'right',
            edgeIndex: 2
        }
    ], { cellSize: 0.1, paddingCells: 1 } );

    assertClosedOrientedManifold( result );
    assert.equal( result.stats.discardedDegenerateTriangles, 0 );
    assert.equal( result.stats.topology.eulerCharacteristic, 2 );
    assert.ok( new Set( result.faceOwners ).size >= 2 );
} );

test( 'two unrelated capsules remain two closed components', () =>
{
    const result = buildSparseUnionMesh( [
        {
            a: { x: -2, y: 0, z: 0 },
            b: { x: -1, y: 0.4, z: 0 },
            radiusA: 0.25,
            radiusB: 0.18,
            ownerId: 'first'
        },
        {
            a: { x: 1, y: 0, z: 0 },
            b: { x: 2, y: -0.4, z: 0 },
            radiusA: 0.22,
            radiusB: 0.16,
            ownerId: 'second'
        }
    ], { cellSize: 0.1 } );

    assertClosedOrientedManifold( result, 2 );
    assert.equal( result.stats.topology.eulerCharacteristic, 4 );
} );

test( 'a clip plane intersects only its primitive before the hard union', () =>
{
    const planeX = 0.17;
    const result = buildSparseUnionMesh( [
        {
            a: { x: -1.4, y: 0, z: 0 },
            b: { x: 1.4, y: 0, z: 0 },
            radiusA: 0.34,
            radiusB: 0.28,
            ownerId: 'clipped',
            edgeIndex: 10,
            clipPlane: {
                center: { x: planeX, y: 0, z: 0 },
                // Deliberately non-unit: normalisation is part of the API.
                normal: { x: 3, y: 0, z: 0 }
            }
        },
        {
            // This uncut primitive crosses the retained portion of the first
            // primitive. It must remain intact even where it lies in front of
            // the first primitive's clipping plane.
            a: { x: 0.28, y: -1.1, z: 0.04 },
            b: { x: 0.28, y: 1.1, z: 0.04 },
            radiusA: 0.24,
            radiusB: 0.2,
            ownerId: 'uncut',
            edgeIndex: 20
        }
    ], { cellSize: 0.08, paddingCells: 1 } );

    assertClosedOrientedManifold( result );
    assert.equal( result.stats.clippedSegments, 1 );
    assert.equal( result.stats.invalidClipPlanes, 0 );

    const capFaces = [];
    for ( let face = 0; face < result.faceFieldModes.length; face++ )
    {
        if ( result.faceFieldModes[ face ] === SPARSE_UNION_FIELD_MODES.CLIP_PLANE )
        {
            capFaces.push( face );
        }
    }
    assert.ok( capFaces.length > 0, 'the clipped primitive has a planar cap' );
    assert.ok( capFaces.every( ( face ) => result.faceOwners[ face ] === 0 ) );

    const maximumCapPlaneError = Math.max( ...capFaces.flatMap( ( face ) => [
        result.indices[ face * 3 ],
        result.indices[ face * 3 + 1 ],
        result.indices[ face * 3 + 2 ]
    ] ).map( ( vertex ) => Math.abs( result.positions[ vertex * 3 ] - planeX ) ) );
    // Marching tetrahedra linearly approximates the non-smooth max() crease;
    // a marked cap stays within one cell of its analytical plane.
    assert.ok( maximumCapPlaneError < 0.08, `cap plane error ${maximumCapPlaneError}` );

    const uncutOwner = result.ownerIds.indexOf( 'uncut' );
    assert.ok( [ ...result.faceOwners ].some( ( owner ) => owner === uncutOwner ) );
    const maximumX = Math.max( ...Array.from(
        { length: result.positions.length / 3 },
        ( _value, vertex ) => result.positions[ vertex * 3 ]
    ) );
    assert.ok( maximumX > planeX + 0.2, 'the uncut primitive survives in front of the plane' );
    assert.ok( [ ...result.faceFieldModes ].some(
        ( mode ) => mode === SPARSE_UNION_FIELD_MODES.TAPERED_CAPSULE
    ) );
} );

test( 'the lattice and buffers are deterministic', () =>
{
    const segments = [
        {
            a: { x: 0.1, y: 0.2, z: 0.3 },
            b: { x: 1.17, y: 2.13, z: -0.43 },
            radiusA: 0.22,
            radiusB: 0.13,
            ownerId: 'a',
            edgeIndex: 0
        },
        {
            a: { x: 1.17, y: 2.13, z: -0.43 },
            b: { x: 2.4, y: 2.9, z: 0.7 },
            radiusA: 0.13,
            radiusB: 0.07,
            ownerId: 'b',
            edgeIndex: 1
        }
    ];
    const first = buildSparseUnionMesh( segments, { cellSize: 0.08, origin: [ 0, 0, 0 ] } );
    const second = buildSparseUnionMesh( segments, { cellSize: 0.08, origin: [ 0, 0, 0 ] } );

    assert.deepEqual( first.positions, second.positions );
    assert.deepEqual( first.indices, second.indices );
    assert.deepEqual( first.faceOwners, second.faceOwners );
    assertClosedOrientedManifold( first );
} );

test( 'invalid and zero-width input is filtered without non-finite output', () =>
{
    const result = buildSparseUnionMesh( [
        {
            a: { x: Number.NaN, y: 0, z: 0 },
            b: { x: 1, y: 0, z: 0 },
            radiusA: 1,
            radiusB: 1
        },
        {
            a: { x: 0, y: 0, z: 0 },
            b: { x: 1, y: 0, z: 0 },
            radiusA: 0,
            radiusB: 0
        }
    ], { cellSize: 0.1 } );

    assert.equal( result.stats.validSegments, 0 );
    assert.equal( result.stats.invalidSegments, 2 );
    assert.equal( result.positions.length, 0 );
    assert.equal( result.indices.length, 0 );
} );

test( 'maxCells failure reports measured sparse-domain diagnostics', () =>
{
    let failure;
    try
    {
        buildSparseUnionMesh( [ {
            a: { x: -1, y: 0, z: 0 },
            b: { x: 1, y: 0, z: 0 },
            radiusA: 0.4,
            radiusB: 0.2,
            ownerId: 'limited'
        } ], {
            cellSize: 0.1,
            maxCells: 12,
            origin: [ 0.025, 0.05, 0.075 ]
        } );
    }
    catch ( error )
    {
        failure = error;
    }

    assert.ok( failure instanceof RangeError );
    assert.equal( failure.code, 'SPARSE_MAX_CELLS_EXCEEDED' );
    assert.equal( failure.observedCandidateCells, 13 );
    assert.equal( failure.limit, 12 );
    assert.equal( failure.maxCells, 12 );
    assert.equal( failure.segmentIndex, 0 );
    assert.equal( failure.inputSegmentIndex, 0 );
    assert.equal( failure.segmentCount, 1 );
    assert.equal( failure.cellSize, 0.1 );
    assert.equal( failure.partialStats.candidateCells, 13 );
    assert.equal( failure.partialStats.cellSize, 0.1 );
    assert.equal( failure.partialStats.minimumRadius, 0.2 );
    assert.equal( failure.partialStats.maximumRadius, 0.4 );
    assert.equal( failure.partialStats.radiusToCellRatio, 2 );
    assert.equal( failure.partialStats.currentSegmentIndex, 0 );
    assert.equal( failure.partialStats.currentInputSegmentIndex, 0 );
    assert.ok( failure.partialStats.blocksVisited > 0 );
    assert.ok( failure.partialStats.surfaceBlocksVisited > 0 );
    assert.deepEqual(
        Object.keys( failure.bounds ).sort(),
        [ 'candidateCells', 'candidateWorld', 'currentSegmentCells', 'currentSegmentWorld' ]
    );
    for ( const bounds of Object.values( failure.bounds ) )
    {
        for ( const axis of [ 'x', 'y', 'z' ] )
        {
            assert.ok( Number.isFinite( bounds.min[ axis ] ) );
            assert.ok( Number.isFinite( bounds.max[ axis ] ) );
            assert.ok( bounds.min[ axis ] <= bounds.max[ axis ] );
        }
    }
    assert.match( failure.message, /observed 13 candidate cells/ );
    assert.match( failure.message, /segment 0/ );
    assert.match( failure.message, /cellSize 0\.1/ );
} );


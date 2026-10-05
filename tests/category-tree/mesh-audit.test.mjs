import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
    auditIndexedGeometry,
    auditMesh,
    auditTriangleSelfIntersections,
    formatMeshAuditSummary
} from '../../src/category-tree/tree/mesh-audit.js';

function makeGeometry( vertices, indices, { computeNormals = true } = {} )
{
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices.flat(), 3 ) );
    geometry.setIndex( indices );
    if ( computeNormals )
    {
        geometry.computeVertexNormals();
    }
    return geometry;
}

function makeTetrahedron()
{
    return makeGeometry(
        [
            [ 1, 1, 1 ],
            [ -1, -1, 1 ],
            [ -1, 1, -1 ],
            [ 1, -1, -1 ]
        ],
        [
            0, 2, 1,
            0, 1, 3,
            0, 3, 2,
            1, 2, 3
        ]
    );
}

function makeWeldedTorus( majorSegments = 12, minorSegments = 8 )
{
    const vertices = [];
    const indices = [];
    for ( let major = 0; major < majorSegments; major += 1 )
    {
        const u = major / majorSegments * Math.PI * 2;
        for ( let minor = 0; minor < minorSegments; minor += 1 )
        {
            const v = minor / minorSegments * Math.PI * 2;
            const radius = 2 + 0.6 * Math.cos( v );
            vertices.push( [
                radius * Math.cos( u ),
                radius * Math.sin( u ),
                0.6 * Math.sin( v )
            ] );
        }
    }
    const at = ( major, minor ) =>
        ( major % majorSegments ) * minorSegments + ( minor % minorSegments );
    for ( let major = 0; major < majorSegments; major += 1 )
    {
        for ( let minor = 0; minor < minorSegments; minor += 1 )
        {
            const a = at( major, minor );
            const b = at( major + 1, minor );
            const c = at( major + 1, minor + 1 );
            const d = at( major, minor + 1 );
            indices.push( a, b, d, b, c, d );
        }
    }
    return makeGeometry( vertices, indices );
}

function makeMobiusWithDetachedTriangle( segments = 7 )
{
    const vertices = [];
    const indices = [];
    const radius = 2;
    const halfWidth = 0.28;
    for ( let segment = 0; segment < segments; segment += 1 )
    {
        const angle = segment / segments * Math.PI * 2;
        for ( const side of [ -1, 1 ] )
        {
            const width = side * halfWidth;
            const radial = radius + width * Math.cos( angle / 2 );
            vertices.push( [
                radial * Math.cos( angle ),
                radial * Math.sin( angle ),
                width * Math.sin( angle / 2 )
            ] );
        }
    }
    for ( let segment = 0; segment < segments; segment += 1 )
    {
        const next = ( segment + 1 ) % segments;
        const flipped = segment === segments - 1;
        const a = segment * 2;
        const b = a + 1;
        const c = next * 2 + Number( flipped );
        const d = next * 2 + Number( !flipped );
        indices.push( a, c, b, b, c, d );
    }
    const detached = vertices.length;
    vertices.push( [ 5, 0, 0 ], [ 6, 0, 0 ], [ 5, 1, 0 ] );
    indices.push( detached, detached + 1, detached + 2 );
    return makeGeometry( vertices, indices );
}

function reportWithoutTimings( report )
{
    const result = structuredClone( report );
    delete result.timings;
    return result;
}

test( 'a closed consistently wound tetrahedron passes the strict defaults', () =>
{
    const report = auditIndexedGeometry( makeTetrahedron() );

    assert.equal( report.ok, true, formatMeshAuditSummary( report ) );
    assert.equal( report.counts.components, 1 );
    assert.equal( report.topology.boundaryEdges, 0 );
    assert.equal( report.topology.nonManifoldEdges, 0 );
    assert.equal( report.topology.nonManifoldVertices, 0 );
    assert.equal( report.topology.inconsistentWindingEdges, 0 );
    assert.equal( report.topology.eulerCharacteristic, 2 );
    assert.equal( report.topology.components[ 0 ].genus, 0 );
    assert.strictEqual( auditMesh, auditIndexedGeometry );
} );

test( 'an open quad reports one four-edge boundary loop', () =>
{
    const geometry = makeGeometry(
        [ [ 0, 0, 0 ], [ 1, 0, 0 ], [ 1, 1, 0 ], [ 0, 1, 0 ] ],
        [ 0, 1, 2, 0, 2, 3 ]
    );
    const report = auditIndexedGeometry( geometry );

    assert.equal( report.ok, false );
    assert.equal( report.topology.boundaryEdges, 4 );
    assert.equal( report.topology.boundaryLoops, 1 );
    assert.equal( report.topology.openBoundaryChains, 0 );
    assert.equal( report.topology.components[ 0 ].genus, 0 );
} );

test( 'three faces sharing an edge are detected as edge- and vertex-non-manifold', () =>
{
    const geometry = makeGeometry(
        [
            [ 0, 0, 0 ], [ 1, 0, 0 ], [ 0, 1, 0 ],
            [ 0, -1, 0 ], [ 0, 0, 1 ]
        ],
        [ 0, 1, 2, 1, 0, 3, 0, 1, 4 ]
    );
    const report = auditIndexedGeometry( geometry );

    assert.equal( report.topology.nonManifoldEdges, 1 );
    assert.ok( report.topology.nonManifoldVertices >= 2 );
} );

test( 'a bow-tie vertex is rejected even though every edge has at most two faces', () =>
{
    const geometry = makeGeometry(
        [
            [ 0, 0, 0 ], [ 1, 0, 0 ], [ 0, 1, 0 ],
            [ -1, 0, 0 ], [ 0, -1, 0 ]
        ],
        [ 0, 1, 2, 0, 3, 4 ]
    );
    const report = auditIndexedGeometry( geometry );

    assert.equal( report.topology.nonManifoldEdges, 0 );
    assert.equal( report.topology.nonManifoldVertices, 1 );
    assert.equal( report.counts.components, 2 );
    assert.equal( report.topology.nonManifoldVertexSamples[ 0 ].linkComponents, 2 );
} );

test( 'matching traversal of a shared edge is reported as inconsistent winding', () =>
{
    const geometry = makeGeometry(
        [ [ 0, 0, 0 ], [ 1, 0, 0 ], [ 1, 1, 0 ], [ 0, 1, 0 ] ],
        [ 0, 1, 2, 0, 3, 2 ]
    );
    const report = auditIndexedGeometry( geometry );

    assert.equal( report.topology.inconsistentWindingEdges, 1 );
    assert.equal( report.topology.orientationConflicts, 0 );
    assert.equal( report.topology.components[ 0 ].flipsRequiredForConsistentWinding, 1 );
} );

test( 'packed topology storage preserves deterministic multi-component conflict reports', () =>
{
    const geometry = makeMobiusWithDetachedTriangle();
    const faceCount = geometry.index.count / 3;
    const options = {
        maxDetails: 100,
        provenance: {
            triangleOwners: Array.from(
                { length: faceCount },
                ( _value, face ) => face === faceCount - 1 ? 'detached' : 'mobius'
            ),
            expectedOwners: [ 'mobius', 'detached' ],
            allowedOwnerPairs: []
        },
        expectations: {
            components: 2,
            maxBoundaryEdges: 100,
            maxBoundaryLoops: 2,
            requireProvenance: true
        }
    };
    const first = auditIndexedGeometry( geometry, options );
    const second = auditIndexedGeometry( geometry, options );

    assert.equal( first.counts.components, 2 );
    assert.equal( first.topology.boundaryLoops, 2 );
    assert.ok( first.topology.orientationConflicts > 0 );
    assert.equal( first.provenance.coverageComplete, true );
    assert.deepEqual( reportWithoutTimings( second ), reportWithoutTimings( first ) );
} );

test( 'degenerate faces, unused vertices, and split coincident vertices are separate findings', () =>
{
    const geometry = makeGeometry(
        [ [ 0, 0, 0 ], [ 1, 0, 0 ], [ 0, 1, 0 ], [ 0, 1, 0 ] ],
        [ 0, 1, 2, 0, 0, 3 ]
    );
    const report = auditIndexedGeometry( geometry );

    assert.equal( report.degeneracy.repeatedIndexTriangles, 1 );
    assert.equal( report.coincidentVertices.exactPairCount, 1 );
    assert.equal( report.coincidentVertices.groupCount, 1 );
    assert.equal( report.counts.isolatedVertices, 1 );
} );

test( 'non-finite positions and normals are counted without crashing the topology pass', () =>
{
    const geometry = makeGeometry(
        [ [ 0, 0, 0 ], [ 1, 0, 0 ], [ Number.NaN, 1, 0 ] ],
        [ 0, 1, 2 ],
        { computeNormals: false }
    );
    geometry.setAttribute( 'normal', new THREE.Float32BufferAttribute( [
        0, 0, 1,
        0, 0, 1,
        Number.NaN, 0, 1
    ], 3 ) );
    const report = auditIndexedGeometry( geometry );

    assert.equal( report.finite.nonFinitePositionVertices, 1 );
    assert.equal( report.degeneracy.nonFiniteTriangles, 1 );
    assert.equal( report.normals.nonFiniteVertices, 1 );
} );

test( 'component Euler data recovers genus one for a welded torus', () =>
{
    const report = auditIndexedGeometry( makeWeldedTorus() );

    assert.equal( report.ok, true, formatMeshAuditSummary( report ) );
    assert.equal( report.topology.eulerCharacteristic, 0 );
    assert.equal( report.topology.components[ 0 ].genus, 1 );
    assert.equal( report.topology.boundaryEdges, 0 );
} );

test( 'provenance reports coverage and contacts between unrelated owners', () =>
{
    const geometry = makeGeometry(
        [ [ 0, 0, 0 ], [ 1, 0, 0 ], [ 1, 1, 0 ], [ 0, 1, 0 ] ],
        [ 0, 1, 2, 0, 2, 3 ]
    );
    const report = auditIndexedGeometry( geometry, {
        provenance: {
            triangleOwners: [
                { ownerId: 'trunk', edgeId: 'edge-0', nodeIds: [ 'root', 'fork' ] },
                { ownerId: 'remote-branch', edgeId: 'edge-1', nodeIds: [ 'fork', 'tip' ] }
            ],
            expectedOwners: [ 'trunk', 'remote-branch' ],
            expectedEdgeIds: [ 'edge-0', 'edge-1' ],
            expectedNodeIds: [ 'root', 'fork', 'tip' ],
            allowedOwnerPairs: []
        },
        expectations: {
            maxBoundaryEdges: 4,
            maxBoundaryLoops: 1
        }
    } );

    assert.equal( report.provenance.coverageComplete, true );
    assert.equal( report.provenance.crossOwnerEdgeCount, 1 );
    assert.equal( report.provenance.unintendedContactEdges, 1 );
    assert.match( report.failures.join( '\n' ), /unrelated provenance owners/ );
} );

test( 'mesher face-owner and face-edge lookup tables are accepted directly', () =>
{
    const geometry = makeTetrahedron();
    const report = auditIndexedGeometry( geometry, {
        provenance: {
            faceOwners: Int32Array.of( 0, 0, 1, 1 ),
            faceEdges: Int32Array.of( 0, 0, 1, 1 ),
            vertexOwners: Int32Array.of( 0, 0, 1, 1 ),
            vertexEdges: Int32Array.of( 0, 0, 1, 1 ),
            ownerIds: [ 'trunk', 'branch' ],
            edgeIds: [ 'root->fork', 'fork->tip' ],
            expectedOwners: [ 'trunk', 'branch' ],
            expectedEdgeIds: [ 'root->fork', 'fork->tip' ],
            allowedOwnerPairs: [ [ 'trunk', 'branch' ] ]
        }
    } );

    assert.equal( report.provenance.coverageComplete, true );
    assert.equal( report.provenance.representedOwnerCount, 2 );
    assert.equal( report.provenance.representedEdgeCount, 2 );
    assert.equal( report.provenance.unintendedContactEdges, 0 );
    assert.equal( report.ok, true, formatMeshAuditSummary( report ) );
} );

test( 'the bounded optional pass finds an intersection between non-adjacent triangles', () =>
{
    const geometry = makeGeometry(
        [
            [ -1, -1, 0 ], [ 1, -1, 0 ], [ 0, 1, 0 ],
            [ 0, -0.5, -1 ], [ 0, -0.5, 1 ], [ 0, 0.5, 0 ]
        ],
        [ 0, 1, 2, 3, 4, 5 ]
    );
    const report = auditTriangleSelfIntersections( geometry, {
        maxTriangles: 10,
        maxCandidatePairs: 10
    } );

    assert.equal( report.checked, true );
    assert.equal( report.complete, true );
    assert.equal( report.intersectionCount, 1 );
} );

test( 'the optional pass does not confuse disjoint collinear coplanar edges with an intersection', () =>
{
    const geometry = makeGeometry(
        [
            [ 0, 0, 0 ], [ 1, 0, 0 ], [ 0, 1, 0 ],
            [ 2, 0, 0 ], [ 3, 0, 0 ], [ 3, 1, 0 ]
        ],
        [ 0, 1, 2, 3, 4, 5 ]
    );
    const report = auditTriangleSelfIntersections( geometry, {
        maxTriangles: 10,
        maxCandidatePairs: 10
    } );

    assert.equal( report.checked, true );
    assert.equal( report.complete, true );
    assert.equal( report.intersectionCount, 0 );
} );

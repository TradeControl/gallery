import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveSemanticCollisions } from '../../src/category-tree/tree/semantic-collision-resolver.js';

const point = ( x, y, z = 0, radius = 0.08 ) => ( { x, y, z, radius } );

function curvedNearCoincidentEdges()
{
    return [
        {
            id: 'spares-demand->spares-demand-change', parentId: 'spares-demand', childId: 'spares-demand-change',
            points: [ point( -2, -0.35 ), point( -1, -0.04 ), point( 0, 0 ), point( 1, -0.04 ), point( 2, -0.35 ) ]
        },
        {
            id: 'material-readiness->material-readiness-change', parentId: 'material-readiness', childId: 'material-readiness-change',
            points: [ point( -2, 0.35 ), point( -1, 0.04 ), point( 0, 0.003 ), point( 1, 0.04 ), point( 2, 0.35 ) ]
        }
    ];
}

test( 'separates the known kind of unrelated near-coincident branch pair deterministically', () => {
    const input = curvedNearCoincidentEdges();
    const options = { maxIterations: 50, maxDisplacement: 1.2, silhouetteAxis: { x: 0, y: 0, z: 1 } };
    const first = resolveSemanticCollisions( input, options );
    const second = resolveSemanticCollisions( input, options );

    assert.ok( first.report.initialEdgePairCount > 0 );
    assert.equal( first.report.finalEdgePairCount, 0 );
    assert.equal( first.report.converged, true );
    assert.deepEqual( first.edges, second.edges );
    assert.deepEqual( input, curvedNearCoincidentEdges(), 'input edges remain untouched' );
    for ( let edgeIndex = 0; edgeIndex < input.length; edgeIndex++ )
    {
        assert.deepEqual( first.edges[ edgeIndex ].points[ 0 ], input[ edgeIndex ].points[ 0 ] );
        assert.deepEqual( first.edges[ edgeIndex ].points.at( -1 ), input[ edgeIndex ].points.at( -1 ) );
    }
} );

test( 'allows surface overlap only near a declared shared junction', () => {
    const edges = [
        {
            id: 'a', parentId: 'root', childId: 'fork',
            points: [ point( -2, 0 ), point( -1, 0 ), point( 0, 0 ) ]
        },
        {
            id: 'b', parentId: 'fork', childId: 'tip',
            points: [ point( 0, 0 ), point( 0.4, 0.08 ), point( 1.5, 0.8 ) ]
        }
    ];
    const result = resolveSemanticCollisions( edges );
    assert.equal( result.report.initialEdgePairCount, 0 );
    assert.ok( result.report.allowedJunctionContactCount > 0 );
    assert.ok( result.report.allowedContinuationContactCount > 0 );
    assert.equal( result.report.converged, true );
} );

test( 'does not use incidence as permission for a remote overlap', () => {
    const edges = [
        {
            id: 'out-and-back', parentId: 'fork', childId: 'a-tip',
            points: [ point( 0, 0 ), point( 1, 0.8 ), point( 2, 0 ), point( 1, -0.02 ), point( 0.25, -0.02 ) ]
        },
        {
            id: 'straight', parentId: 'fork', childId: 'b-tip',
            points: [ point( 0, 0 ), point( 0.7, 0 ), point( 1.4, 0 ), point( 2.1, 0 ) ]
        }
    ];
    const detectionOnly = resolveSemanticCollisions( edges, { maxIterations: 0 } );
    assert.ok( detectionOnly.report.initialEdgePairCount > 0 );
    assert.ok( detectionOnly.report.unresolved.some(
        ( collision ) => collision.relation === 'incident' && collision.incidentType === 'sibling'
    ) );
} );

test( 'a generous continuation reach does not license long sibling fusion', () => {
    const edges = [
        {
            id: 'sibling-a', parentId: 'fork', childId: 'a-tip',
            points: [ point( 0, 0 ), point( 0.7, 0 ), point( 1.4, 0 ) ]
        },
        {
            id: 'sibling-b', parentId: 'fork', childId: 'b-tip',
            points: [ point( 0, 0 ), point( 0.7, 0.06 ), point( 1.4, 0.06 ) ]
        }
    ];
    const result = resolveSemanticCollisions( edges, {
        maxIterations: 0,
        junctionAllowance: 1,
        junctionRadiusFactor: 20,
        siblingJunctionAllowance: 0.002,
        siblingJunctionRadiusFactor: 0.3
    } );
    assert.ok( result.report.unresolved.some( ( collision ) => collision.incidentType === 'sibling' ) );
    assert.equal( result.report.allowedContinuationContactCount, 0 );
} );

test( 'ancestry metadata does not license unrelated remote fusion', () => {
    const edges = [
        {
            id: 'ancestor', parentId: 'root', childId: 'ancestor-node',
            points: [ point( -1, 0 ), point( 0, 0 ), point( 1, 0 ) ], ancestry: [ 'root' ]
        },
        {
            id: 'descendant', parentId: 'middle', childId: 'descendant-node',
            points: [ point( -1, 0.02 ), point( 0, 0.02 ), point( 1, 0.02 ) ], ancestry: [ 'root', 'ancestor-node' ]
        }
    ];
    const result = resolveSemanticCollisions( edges, { maxIterations: 0 } );
    assert.ok( result.report.unresolved.some( ( collision ) => collision.relation === 'ancestor' ) );
} );

test( 'allows a non-incident contact only inside a short declared ancestor junction route', () => {
    const edges = [
        { id: 'root-a', parentId: 'root', childId: 'a', points: [ point( -1, 0 ), point( 0, 0 ) ] },
        { id: 'a-b', parentId: 'a', childId: 'b', points: [ point( 0, 0 ), point( 0.05, 0 ) ] },
        { id: 'b-tip', parentId: 'b', childId: 'tip', points: [ point( 0.05, 0 ), point( 1, 0 ) ] }
    ];
    const result = resolveSemanticCollisions( edges, { maxIterations: 0 } );
    assert.equal( result.report.initialEdgePairCount, 0 );
    assert.ok( result.report.allowedAncestorJunctionContactCount > 0 );
} );

test( 'reports an immovable collision between locked edges', () => {
    const edges = curvedNearCoincidentEdges().map( ( edge ) => ( { ...edge, locked: true } ) );
    const result = resolveSemanticCollisions( edges, { maxIterations: 10 } );
    assert.equal( result.report.converged, false );
    assert.equal( result.report.iterations, 1 );
    assert.ok( result.report.unresolved.length > 0 );
    assert.equal( result.report.displacedPointCount, 0 );
} );

test( 'optionally relaxes semantic nodes as shared variables without cracking incident edges', () => {
    const edges = [
        {
            id: 'root-a', parentId: 'root', childId: 'a',
            points: [ point( 0, 0 ), point( 1, 0.24 ), point( 2, 0 ) ]
        },
        {
            id: 'a-tip', parentId: 'a', childId: 'a-tip-node',
            points: [ point( 2, 0 ), point( 2.6, 0.5 ), point( 3.2, 0.9 ) ]
        },
        {
            id: 'root-b', parentId: 'root', childId: 'b',
            points: [ point( 0, 0 ), point( 1, -0.24 ), point( 2, 0.025 ) ]
        },
        {
            id: 'b-tip', parentId: 'b', childId: 'b-tip-node',
            points: [ point( 2, 0.025 ), point( 2.6, -0.5 ), point( 3.2, -0.9 ) ]
        }
    ];
    const result = resolveSemanticCollisions( edges, {
        relaxSharedNodes: true,
        maxIterations: 60,
        maxDisplacement: 1,
        maxNodeDisplacement: 1
    } );

    assert.equal( result.report.converged, true );
    assert.equal( result.report.sharedNodeRelaxationEnabled, true );
    assert.ok( result.report.movedNodeCount >= 2 );
    assert.deepEqual( result.edges[0].points.at( -1 ), result.edges[1].points[0], 'node a remains welded' );
    assert.deepEqual( result.edges[2].points.at( -1 ), result.edges[3].points[0], 'node b remains welded' );
    assert.deepEqual( result.edges[0].points[0], point( 0, 0 ), 'root remains fixed' );
    assert.deepEqual( result.edges[2].points[0], point( 0, 0 ), 'all root bindings remain fixed' );
} );


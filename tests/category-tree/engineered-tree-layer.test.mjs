import assert from 'node:assert/strict';
import test from 'node:test';

import { createEngineeredTreeLayer } from '../../src/category-tree/tree/engineered-tree-layer.js';

class FakeWorker
{
    static instances = [];

    constructor()
    {
        this.listeners = new Map();
        this.messages = [];
        this.terminated = false;
        FakeWorker.instances.push( this );
    }

    addEventListener( type, listener )
    {
        const listeners = this.listeners.get( type ) ?? [];
        listeners.push( listener );
        this.listeners.set( type, listeners );
    }

    postMessage( message )
    {
        if ( this.terminated ) throw new Error( 'postMessage called after terminate' );
        this.messages.push( message );
    }

    terminate()
    {
        this.terminated = true;
    }

    emitMessage( data )
    {
        for ( const listener of this.listeners.get( 'message' ) ?? [] )
        {
            listener( { data } );
        }
    }
}

const hierarchy = {
    edges: [ {
        child: {
            id: 'branch',
            latent: true,
            growthEligible: true
        }
    } ]
};

function surfaceResult( marker )
{
    return {
        positions: Float32Array.of(
            0, 0, 0,
            1, 0, 0,
            0, 1, 0
        ),
        indices: Uint32Array.of( 0, 1, 2 ),
        normals: Float32Array.of(
            0, 0, 1,
            0, 0, 1,
            0, 0, 1
        ),
        faceOwners: Int32Array.of( 0 ),
        vertexOwners: Int32Array.of( 0, 0, 0 ),
        faceEdges: Int32Array.of( 0 ),
        vertexEdges: Int32Array.of( 0, 0, 0 ),
        vertexOwnerOffsets: Uint32Array.of( 0, 1, 2, 3 ),
        vertexOwnerValues: Int32Array.of( 0, 0, 0 ),
        vertexEdgeOffsets: Uint32Array.of( 0, 1, 2, 3 ),
        vertexEdgeValues: Int32Array.of( 0, 0, 0 ),
        ownerIds: [ 'root -> branch' ],
        edgeIds: [ 0 ],
        stats: {
            marker,
            triangles: 1,
            totalBuildMilliseconds: 5
        }
    };
}

function surfaceState( marker )
{
    return {
        releasedEdgeIds: [ 'root -> branch' ],
        complete: marker !== 'initial',
        crownProgress: marker === 'initial' ? 0 : 1,
        cellSize: 0.04,
        activeHierarchyEdgeIds: [ 'root -> branch' ],
        collisionReport: { marker }
    };
}

function responseFor( request, marker )
{
    return {
        revision: request.revision,
        requestId: request.requestId,
        result: surfaceResult( marker ),
        surfaceState: surfaceState( marker )
    };
}

async function withFakeWorker( callback )
{
    const previousWorker = globalThis.Worker;
    FakeWorker.instances = [];
    globalThis.Worker = FakeWorker;
    try
    {
        await callback();
    }
    finally
    {
        if ( previousWorker === undefined ) delete globalThis.Worker;
        else globalThis.Worker = previousWorker;
        FakeWorker.instances = [];
    }
}

test( 'a successful current-revision result remains visible while newer growth fails', async () => {
    await withFakeWorker( async () => {
        const layer = createEngineeredTreeLayer( hierarchy, new Map(), {} );
        const worker = FakeWorker.instances[ 0 ];
        const initialRequest = worker.messages[ 0 ];
        const initialGeometry = layer.getSurfaceState().geometry;
        const mesh = layer.group.getObjectByName( 'continuous-tree-surface' );
        let initialGeometryDisposed = false;
        initialGeometry.addEventListener( 'dispose', () => {
            initialGeometryDisposed = true;
        } );

        layer.setGrowthProgress( new Map( [ [ 'branch', 1 ] ] ) );
        assert.equal( worker.messages.length, 1 );

        worker.emitMessage( responseFor( initialRequest, 'bootstrap' ) );

        const bootstrapState = layer.getSurfaceState();
        const bootstrapGeometry = bootstrapState.geometry;
        const bootstrapBuild = bootstrapState.build;
        const bootstrapPositions = bootstrapGeometry.getAttribute( 'position' ).array;
        const bootstrapIndices = bootstrapGeometry.index.array;
        assert.equal( bootstrapBuild.marker, 'bootstrap' );
        assert.equal( bootstrapState.error, null );
        assert.equal( bootstrapState.busy, true );
        assert.equal( bootstrapState.collisionReport.marker, 'bootstrap' );
        assert.notEqual( bootstrapGeometry, initialGeometry );
        assert.equal( initialGeometryDisposed, true );
        assert.equal( bootstrapGeometry.getAttribute( 'position' ).count, 3 );
        assert.equal( bootstrapGeometry.index.count, 3 );
        assert.equal( mesh.visible, true );
        assert.equal( worker.messages.length, 2 );
        assert.deepEqual( worker.messages[ 1 ].growthEntries, [ [ 'branch', 1 ] ] );

        const finalRequest = worker.messages[ 1 ];
        const capacityError = 'Sparse union exceeded maxCells (250000)';
        worker.emitMessage( {
            revision: finalRequest.revision,
            requestId: finalRequest.requestId,
            error: capacityError
        } );

        const failedState = layer.getSurfaceState();
        assert.equal( failedState.busy, false );
        assert.equal( failedState.error, capacityError );
        assert.equal( failedState.build, bootstrapBuild );
        assert.equal( failedState.geometry, bootstrapGeometry );
        assert.equal( failedState.geometry.getAttribute( 'position' ).array, bootstrapPositions );
        assert.equal( failedState.geometry.index.array, bootstrapIndices );
        assert.equal( failedState.collisionReport.marker, 'bootstrap' );
        assert.equal( mesh.visible, true );
        assert.equal( await layer.whenIdle(), bootstrapBuild );
        layer.dispose();
    } );
} );

test( 'a terminated worker generation cannot install a late result', async () => {
    await withFakeWorker( () => {
        const layer = createEngineeredTreeLayer( hierarchy, new Map(), {} );
        const oldWorker = FakeWorker.instances[ 0 ];
        const oldRequest = oldWorker.messages[ 0 ];

        layer.rebuild( new Map(), {}, new Map( [ [ 'branch', 1 ] ] ) );
        const currentWorker = FakeWorker.instances[ 1 ];
        const currentRequest = currentWorker.messages[ 0 ];
        assert.equal( oldWorker.terminated, true );

        oldWorker.emitMessage( responseFor( oldRequest, 'old-generation' ) );
        assert.equal( layer.getSurfaceState().build, null );

        currentWorker.emitMessage( responseFor( currentRequest, 'current-generation' ) );
        assert.equal( layer.getSurfaceState().build.marker, 'current-generation' );
        layer.dispose();
    } );
} );

test( 'an error from a superseded request is discarded before submitting the latest state', async () => {
    await withFakeWorker( () => {
        const layer = createEngineeredTreeLayer( hierarchy, new Map(), {} );
        const worker = FakeWorker.instances[ 0 ];
        const initialRequest = worker.messages[ 0 ];
        layer.setGrowthProgress( new Map( [ [ 'branch', 1 ] ] ) );

        worker.emitMessage( {
            revision: initialRequest.revision,
            requestId: initialRequest.requestId,
            error: 'stale request failed'
        } );

        assert.equal( worker.messages.length, 2 );
        assert.ok( worker.messages[ 1 ].initialize );
        assert.equal( layer.getSurfaceState().error, null );
        assert.equal( layer.getSurfaceState().busy, true );

        worker.emitMessage( responseFor( worker.messages[ 1 ], 'recovered' ) );
        assert.equal( layer.getSurfaceState().build.marker, 'recovered' );
        assert.equal( layer.getSurfaceState().error, null );
        layer.dispose();
    } );
} );

test( 'dispose releases installed CPU buffers and ignores a late worker result', async () => {
    await withFakeWorker( async () => {
        const layer = createEngineeredTreeLayer( hierarchy, new Map(), {} );
        const worker = FakeWorker.instances[ 0 ];
        worker.emitMessage( responseFor( worker.messages[ 0 ], 'installed' ) );
        const installedGeometry = layer.getSurfaceState().geometry;

        layer.setGrowthProgress( new Map( [ [ 'branch', 1 ] ] ) );
        const lateRequest = worker.messages[ 1 ];
        const idle = layer.whenIdle();
        layer.dispose();

        assert.equal( worker.terminated, true );
        assert.equal( layer.group.children.length, 0 );
        assert.equal( layer.getSurfaceState().geometry, null );
        assert.equal( layer.getSurfaceState().build, null );
        assert.equal( layer.getSurfaceState().collisionReport, null );
        assert.equal( installedGeometry.index, null );
        assert.deepEqual( Object.keys( installedGeometry.attributes ), [] );
        assert.deepEqual( installedGeometry.userData, {} );
        assert.equal( await idle, null );

        worker.emitMessage( responseFor( lateRequest, 'late' ) );
        assert.equal( layer.getSurfaceState().build, null );
    } );
} );

test( 'production fails closed without a Worker instead of meshing synchronously', () => {
    const previousWorker = globalThis.Worker;
    delete globalThis.Worker;
    try
    {
        const layer = createEngineeredTreeLayer( hierarchy, new Map(), {} );
        const state = layer.getSurfaceState();
        assert.equal( state.busy, false );
        assert.equal( state.build, null );
        assert.match( state.error, /worker is unavailable/i );
        layer.dispose();
    }
    finally
    {
        if ( previousWorker !== undefined ) globalThis.Worker = previousWorker;
    }
} );

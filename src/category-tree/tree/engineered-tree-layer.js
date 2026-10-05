import * as THREE from 'three';

function createMaterial()
{
    return new THREE.MeshStandardMaterial( {
        color: 0xf4f2ea,
        roughness: 0.74,
        metalness: 0.02
    } );
}

function emptyGeometry()
{
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( [], 3 ) );
    geometry.setIndex( [] );
    return geometry;
}

function toBufferGeometry( result, correspondence )
{
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute( 'position', new THREE.BufferAttribute( result.positions, 3 ) );
    geometry.setAttribute( 'normal', new THREE.BufferAttribute( result.normals, 3 ) );
    geometry.setAttribute(
        'surfaceOwner',
        new THREE.BufferAttribute( new Float32Array( result.vertexOwners ), 1 )
    );
    geometry.setIndex( new THREE.BufferAttribute( result.indices, 1 ) );
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    geometry.userData.faceOwners = result.faceOwners;
    geometry.userData.faceEdges = result.faceEdges;
    geometry.userData.ownerIds = result.ownerIds;
    geometry.userData.edgeIds = result.edgeIds;
    geometry.userData.vertexOwnerOffsets = result.vertexOwnerOffsets;
    geometry.userData.vertexOwnerValues = result.vertexOwnerValues;
    geometry.userData.vertexEdgeOffsets = result.vertexEdgeOffsets;
    geometry.userData.vertexEdgeValues = result.vertexEdgeValues;
    geometry.userData.correspondence = correspondence;
    geometry.userData.surfaceStats = result.stats;
    return geometry;
}

function mesherOptions()
{
    return {
        maxPatchCells: 250_000
    };
}

function growthStateSignature( hierarchy, growthProgress, steps = 14 )
{
    const values = [];
    for ( const edge of hierarchy.edges )
    {
        const node = edge.child;
        if ( node.growthEligible === false || !node.latent ) continue;
        const progress = Math.max( 0, Math.min( 1, growthProgress.get( node.id ) ?? 0 ) );
        values.push( Math.min( steps, Math.floor( progress * steps + 1e-8 ) ) );
    }
    return values.join( ',' );
}

/**
 * The visible body is one indexed hard-union surface. A worker keeps remeshing
 * off the animation thread; while it works, the last valid, closed quantised
 * growth state remains on screen.
 */
export function createEngineeredTreeLayer( hierarchy, initialPositions, initialParameters = {} )
{
    const group = new THREE.Group();
    group.name = 'engineered-tree-body';
    const mesh = new THREE.Mesh( emptyGeometry(), createMaterial() );
    mesh.name = 'continuous-tree-surface';
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add( mesh );

    let rebuildPositions = initialPositions;
    let rebuildParameters = initialParameters;
    let workerNeedsInitialization = true;
    let collisionReport = null;
    let growthProgress = new Map();
    let growthSignature = null;
    let revision = 0;
    let requestSequence = 0;
    let desiredStateSequence = 0;
    let workerGeneration = 0;
    let activeRequest = null;
    let pendingState = null;
    let worker = null;
    let lastError = null;
    let lastBuild = null;
    let disposed = false;
    const idleWaiters = new Set();

    function resolveIdleWaiters()
    {
        if ( activeRequest || pendingState ) return;
        for ( const resolve of idleWaiters ) resolve( lastBuild );
        idleWaiters.clear();
    }

    function continueWithPendingState()
    {
        if ( disposed ) return;
        if ( pendingState )
        {
            const next = pendingState;
            pendingState = null;
            submit( next );
        }
        else resolveIdleWaiters();
    }

    function installResult( result, surfaceState )
    {
        const replacement = toBufferGeometry( result, {
            releasedEdgeIds: surfaceState.releasedEdgeIds,
            hierarchyEdgeCount: hierarchy.edges.length,
            activeHierarchyEdgeIds: surfaceState.activeHierarchyEdgeIds,
            complete: surfaceState.complete
        } );
        const previous = mesh.geometry;
        mesh.geometry = replacement;
        previous.dispose();
        mesh.visible = result.indices.length > 0;
        lastBuild = {
            ...result.stats,
            complete: surfaceState.complete,
            cellSize: surfaceState.cellSize,
            releasedEdges: surfaceState.releasedEdgeIds.length,
            collisionReport: surfaceState.collisionReport
        };
        collisionReport = surfaceState.collisionReport;
        mesh.userData.collisionReport = collisionReport;
        mesh.userData.gate2 = lastBuild;
    }

    function createWorker()
    {
        if ( disposed || typeof Worker === 'undefined' ) return null;
        const generation = ++workerGeneration;
        let instance;
        try
        {
            instance = new Worker(
                new URL( './tree-surface-worker.js', import.meta.url ),
                { type: 'module', name: 'category-tree-surface' }
            );
        }
        catch ( error )
        {
            lastError = error instanceof Error ? error.message : String( error );
            console.error( `Tree surface worker could not start: ${lastError}` );
            return null;
        }
        instance.addEventListener( 'message', ( event ) => {
            if ( disposed || worker !== instance || generation !== workerGeneration ) return;
            const message = event.data;
            if ( !activeRequest || message.requestId !== activeRequest.requestId ) return;
            const completedRequest = activeRequest;
            activeRequest = null;
            const isCurrentRevision = message.revision === revision;
            const isLatestDesiredState = isCurrentRevision
                && completedRequest.state.desiredStateId === desiredStateSequence
                && pendingState === null;
            if ( isCurrentRevision && !message.error )
            {
                try
                {
                    // A completed closed surface is the new last-valid state even
                    // when a newer quantised growth request is waiting. Keeping it
                    // visible is the reason remeshing occurs off the render thread.
                    installResult( message.result, message.surfaceState );
                    lastError = null;
                }
                catch ( error )
                {
                    lastError = error instanceof Error ? error.message : String( error );
                    console.error( `Tree surface installation failed: ${lastError}` );
                }
            }
            else if ( isLatestDesiredState )
            {
                lastError = message.error;
                workerNeedsInitialization = true;
                console.error( `Tree surface rebuild failed: ${message.error}` );
            }
            else if ( message.error )
            {
                // A failed superseded request must not poison the replacement
                // request's UI state. Reinitialising is conservative because the
                // worker may have failed while preparing its revision model.
                workerNeedsInitialization = true;
            }
            continueWithPendingState();
        } );
        function handleFatalWorkerError( event )
        {
            if ( disposed || worker !== instance || generation !== workerGeneration ) return;
            lastError = event.message || ( event.type === 'messageerror'
                ? 'Tree surface worker returned an unreadable message.'
                : 'Unknown Tree surface worker error.' );
            activeRequest = null;
            workerNeedsInitialization = true;
            instance.terminate();
            worker = null;
            workerGeneration += 1;
            console.error( lastError );
            pendingState = null;
            resolveIdleWaiters();
        }
        instance.addEventListener( 'error', handleFatalWorkerError );
        instance.addEventListener( 'messageerror', handleFatalWorkerError );
        return instance;
    }

    function submit( state )
    {
        if ( disposed ) return;
        const requestId = ++requestSequence;
        activeRequest = { requestId, state };
        if ( worker )
        {
            lastError = null;
            const initialize = workerNeedsInitialization
                ? {
                    hierarchy,
                    positions: rebuildPositions,
                    parameters: rebuildParameters
                }
                : null;
            try
            {
                worker.postMessage( {
                    revision,
                    requestId,
                    initialize,
                    growthEntries: state.growthEntries,
                    options: mesherOptions()
                } );
                workerNeedsInitialization = false;
            }
            catch ( error )
            {
                lastError = error instanceof Error ? error.message : String( error );
                console.error( `Tree surface worker submission failed: ${lastError}` );
                worker.terminate();
                worker = null;
                workerGeneration += 1;
                workerNeedsInitialization = true;
                activeRequest = null;
                resolveIdleWaiters();
            }
        }
        else
        {
            activeRequest = null;
            lastError ||= 'Tree surface worker is unavailable; the last valid surface was retained.';
            resolveIdleWaiters();
        }
    }

    function requestSurface( force = false )
    {
        if ( disposed ) return;
        const signature = growthStateSignature( hierarchy, growthProgress );
        if ( !force && signature === growthSignature ) return;
        growthSignature = signature;
        lastError = null;
        const state = {
            desiredStateId: ++desiredStateSequence,
            growthEntries: [ ...growthProgress ]
        };
        if ( activeRequest ) pendingState = state;
        else submit( state );
    }

    function rebuild( positions, parameters = {}, progress = growthProgress )
    {
        if ( disposed ) return;
        revision += 1;
        pendingState = null;
        activeRequest = null;
        if ( worker ) worker.terminate();
        worker = createWorker();
        rebuildPositions = positions;
        rebuildParameters = { ...parameters };
        workerNeedsInitialization = true;
        collisionReport = null;
        mesh.userData.collisionReport = null;
        growthProgress = progress;
        growthSignature = null;
        lastError = null;
        requestSurface( true );
    }

    rebuild( initialPositions, initialParameters );

    return {
        group,
        rebuild,
        update() {},
        setVisible( visible ) {
            if ( disposed ) return;
            group.visible = visible;
        },
        setGrowthProgress( progress ) {
            if ( disposed ) return;
            growthProgress = progress;
            requestSurface();
        },
        whenIdle() {
            if ( disposed ) return Promise.resolve( null );
            if ( !activeRequest && !pendingState ) return Promise.resolve( lastBuild );
            return new Promise( ( resolve ) => idleWaiters.add( resolve ) );
        },
        getSurfaceState() {
            return {
                busy: Boolean( activeRequest || pendingState ),
                error: lastError,
                build: lastBuild,
                collisionReport,
                geometry: mesh.geometry
            };
        },
        dispose() {
            if ( disposed ) return;
            disposed = true;
            revision += 1;
            desiredStateSequence += 1;
            workerGeneration += 1;
            if ( worker ) worker.terminate();
            worker = null;
            activeRequest = null;
            pendingState = null;
            const geometry = mesh.geometry;
            geometry.dispose();
            for ( const attribute of Object.keys( geometry.attributes ) )
            {
                geometry.deleteAttribute( attribute );
            }
            geometry.setIndex( null );
            geometry.userData = {};
            mesh.geometry = null;
            mesh.material.dispose();
            mesh.material = null;
            mesh.userData = {};
            group.remove( mesh );
            rebuildPositions = null;
            rebuildParameters = null;
            growthProgress = new Map();
            growthSignature = null;
            collisionReport = null;
            lastBuild = null;
            lastError = null;
            for ( const resolve of idleWaiters ) resolve( null );
            idleWaiters.clear();
        }
    };
}

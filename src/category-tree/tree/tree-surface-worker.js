import { buildHybridTreeMesh } from './hybrid-tree-mesher.js';
import {
    createTreeSurfaceEdges,
    prepareTreeSurfaceModel
} from './tree-surface-model.js';

let activeRevision = -1;
let model = null;

function transferableBuffers( result )
{
    const values = [
        result.positions,
        result.indices,
        result.normals,
        result.faceOwners,
        result.vertexOwners,
        result.faceEdges,
        result.vertexEdges,
        result.vertexOwnerOffsets,
        result.vertexOwnerValues,
        result.vertexEdgeOffsets,
        result.vertexEdgeValues
    ];
    return [ ...new Set( values
        .filter( ( value ) => ArrayBuffer.isView( value ) )
        .map( ( value ) => value.buffer ) ) ];
}

self.addEventListener( 'message', ( event ) => {
    const {
        revision,
        requestId,
        initialize,
        growthEntries = [],
        options = {}
    } = event.data;
    const started = performance.now();
    let preparationMilliseconds = 0;
    try
    {
        if ( initialize )
        {
            const preparationStarted = performance.now();
            model = prepareTreeSurfaceModel(
                initialize.hierarchy,
                initialize.positions,
                initialize.parameters
            );
            preparationMilliseconds = performance.now() - preparationStarted;
            activeRevision = revision;
        }
        if ( !model || activeRevision !== revision )
        {
            throw new Error( `Tree surface worker has no model for revision ${revision}.` );
        }

        const state = createTreeSurfaceEdges( model, new Map( growthEntries ) );
        const meshStarted = performance.now();
        const result = buildHybridTreeMesh( state.edges, {
            ...options,
            cellSize: state.cellSize
        } );
        result.stats.preparationMilliseconds = preparationMilliseconds;
        result.stats.meshBuildMilliseconds = performance.now() - meshStarted;
        result.stats.totalBuildMilliseconds = performance.now() - started;
        const surfaceState = {
            releasedEdgeIds: state.releasedEdgeIds,
            complete: state.complete,
            crownProgress: state.crownProgress,
            cellSize: state.cellSize,
            activeHierarchyEdgeIds: [ ...model.activeEdgeIds ],
            collisionReport: model.collisionReport
        };
        self.postMessage( {
            revision,
            requestId,
            result,
            surfaceState
        }, transferableBuffers( result ) );
    }
    catch ( error )
    {
        self.postMessage( {
            revision,
            requestId,
            error: error instanceof Error ? error.message : String( error )
        } );
    }
} );

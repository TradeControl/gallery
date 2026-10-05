import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as THREE from 'three';

import {
    createHierarchy,
    representativeHierarchy,
    unfoldingHierarchy
} from '../../src/category-tree/tree/hierarchy.js';
import { createUnfoldingLayout } from '../../src/category-tree/tree/layout.js';
import { createGrowthCycle } from '../../src/category-tree/tree/growth-cycle.js';
import {
    createTreeSurfaceEdges,
    prepareTreeSurfaceModel
} from '../../src/category-tree/tree/tree-surface-model.js';
import { buildHybridTreeMesh } from '../../src/category-tree/tree/hybrid-tree-mesher.js';
import { auditMesh, formatMeshAuditSummary } from '../../src/category-tree/tree/mesh-audit.js';

const PROJECT_ROOT = join( dirname( fileURLToPath( import.meta.url ) ), '..', '..' );
const RESULTS_PATH = join(
    PROJECT_ROOT,
    'docs',
    'projects',
    'category tree',
    'tree',
    'gate2-audit-results.json'
);

const EXPECTED_HIERARCHY_NODES = 683;
const EXPECTED_HIERARCHY_EDGES = 682;
const TIERS = [ 0, 1, 3, 8 ];
const CONDUIT_WEIGHTS = [ 0.75, 1.85 ];
const REPLAY_TIER = 8;
const REPLAY_WEIGHT = 1.34;
const FORM = Object.freeze( {
    crownSpread: 1.14,
    verticalRise: 0.95,
    asymmetry: 0.68,
    windSweep: 0.48
} );

function now()
{
    return globalThis.performance?.now?.() ?? Date.now();
}

function round( value, digits = 3 )
{
    if ( !Number.isFinite( value ) ) return value;
    const scale = 10 ** digits;
    return Math.round( value * scale ) / scale;
}

function memorySnapshot()
{
    const usage = process.memoryUsage();
    const megabytes = ( value ) => round( value / ( 1024 * 1024 ), 3 );
    return {
        residentSetMegabytes: megabytes( usage.rss ),
        heapUsedMegabytes: megabytes( usage.heapUsed ),
        externalMegabytes: megabytes( usage.external ),
        arrayBuffersMegabytes: megabytes( usage.arrayBuffers )
    };
}

function pairKey( left, right )
{
    return left < right ? `${left}\u0000${right}` : `${right}\u0000${left}`;
}

function makeScenarioFixture( growthTiers, conduitWeight )
{
    // Layout writes support radii and gravity eligibility onto hierarchy nodes;
    // every scenario therefore receives an isolated, freshly validated tree.
    const establishedHierarchy = createHierarchy( representativeHierarchy );
    const hierarchy = createHierarchy( unfoldingHierarchy );
    const positions = createUnfoldingLayout( establishedHierarchy, hierarchy, {
        trunkRise: 2.05 * FORM.verticalRise,
        branchRise: 1.45 * FORM.verticalRise,
        principalReach: 2.8 * FORM.crownSpread,
        asymmetry: FORM.asymmetry,
        windSweep: FORM.windSweep,
        growthTiers
    } );
    return {
        hierarchy,
        positions,
        parameters: {
            ...FORM,
            growthTiers,
            conduitWeight
        }
    };
}

function matureProgress( hierarchy )
{
    return new Map( hierarchy.nodes
        .filter( ( node ) => node.latent && node.growthEligible !== false )
        .map( ( node ) => [ node.id, 1 ] ) );
}

function makeGeometry( mesh )
{
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(
            mesh.positions instanceof Float32Array
                ? mesh.positions
                : new Float32Array( mesh.positions ),
            3
        )
    );
    geometry.setIndex( new THREE.BufferAttribute(
        mesh.indices instanceof Uint32Array
            ? mesh.indices
            : new Uint32Array( mesh.indices ),
        1
    ) );
    geometry.setAttribute(
        'normal',
        new THREE.BufferAttribute(
            mesh.normals instanceof Float32Array
                ? mesh.normals
                : new Float32Array( mesh.normals ),
            3
        )
    );
    return geometry;
}

function clusterSemanticPolicy( clusters, surfaceEdges )
{
    const edgeById = new Map( surfaceEdges.map( ( edge ) => [ edge.id, edge ] ) );
    const knownNodes = new Set();
    for ( const edge of surfaceEdges )
    {
        knownNodes.add( edge.parentId );
        knownNodes.add( edge.childId );
    }

    const allowedPairKeys = new Set();
    const allowedOwnerPairs = [];
    const failures = [];

    for ( const cluster of clusters )
    {
        const nodeIds = new Set( cluster.nodeIds ?? [] );
        const unknownNodes = [ ...nodeIds ].filter( ( nodeId ) => !knownNodes.has( nodeId ) );
        if ( unknownNodes.length > 0 )
        {
            failures.push( `${cluster.id} contains unknown nodes: ${unknownNodes.join( ', ' )}` );
        }

        const internalEdges = surfaceEdges.filter(
            ( edge ) => nodeIds.has( edge.parentId ) && nodeIds.has( edge.childId )
        );
        if ( nodeIds.size > 1 )
        {
            const adjacency = new Map( [ ...nodeIds ].map( ( nodeId ) => [ nodeId, [] ] ) );
            for ( const edge of internalEdges )
            {
                adjacency.get( edge.parentId ).push( edge.childId );
                adjacency.get( edge.childId ).push( edge.parentId );
            }
            const first = nodeIds.values().next().value;
            const reached = new Set( [ first ] );
            const pending = [ first ];
            while ( pending.length > 0 )
            {
                for ( const adjacent of adjacency.get( pending.pop() ) )
                {
                    if ( reached.has( adjacent ) ) continue;
                    reached.add( adjacent );
                    pending.push( adjacent );
                }
            }
            if ( reached.size !== nodeIds.size )
            {
                failures.push(
                    `${cluster.id} is not a connected semantic subtree `
                    + `(${reached.size}/${nodeIds.size} nodes reached)`
                );
            }
        }

        const incidentOwners = surfaceEdges
            .filter( ( edge ) => nodeIds.has( edge.parentId ) || nodeIds.has( edge.childId ) )
            .map( ( edge ) => edge.id );
        const declaredOwners = cluster.ownerIds ?? [];
        for ( const owner of declaredOwners )
        {
            if ( !edgeById.has( owner ) || !incidentOwners.includes( owner ) )
            {
                failures.push( `${cluster.id} declares non-incident owner '${owner}'` );
            }
        }
        const owners = [ ...new Set( incidentOwners ) ].sort();
        for ( let left = 0; left < owners.length; left += 1 )
        {
            for ( let right = left + 1; right < owners.length; right += 1 )
            {
                const key = pairKey( owners[ left ], owners[ right ] );
                if ( allowedPairKeys.has( key ) ) continue;
                allowedPairKeys.add( key );
                allowedOwnerPairs.push( [ owners[ left ], owners[ right ] ] );
            }
        }
    }

    return { allowedPairKeys, allowedOwnerPairs, failures };
}

function validateDeclaredOwnerPairs( mesh, semanticPolicy )
{
    const failures = [];
    const declaredKeys = new Set();
    for ( const pair of mesh.allowedOwnerPairs ?? [] )
    {
        if ( !Array.isArray( pair ) || pair.length !== 2 )
        {
            failures.push( `invalid allowed-owner pair: ${JSON.stringify( pair )}` );
            continue;
        }
        const key = pairKey( pair[ 0 ], pair[ 1 ] );
        declaredKeys.add( key );
        if ( !semanticPolicy.allowedPairKeys.has( key ) )
        {
            failures.push( `non-semantic allowed-owner pair: ${pair[ 0 ]} <> ${pair[ 1 ]}` );
        }
    }
    for ( const key of semanticPolicy.allowedPairKeys )
    {
        if ( !declaredKeys.has( key ) )
        {
            failures.push( `mesher omitted semantic allowed-owner pair ${JSON.stringify( key.split( '\u0000' ))}` );
        }
    }
    return failures;
}

function contractedClusterGraph( mesh )
{
    const clusterIndices = mesh.clusters.map( ( cluster ) => cluster.index );
    const parent = new Map( clusterIndices.map( ( index ) => [ index, index ] ) );
    const find = ( value ) =>
    {
        let root = value;
        while ( parent.get( root ) !== root ) root = parent.get( root );
        while ( parent.get( value ) !== value )
        {
            const next = parent.get( value );
            parent.set( value, root );
            value = next;
        }
        return root;
    };
    const join = ( left, right ) =>
    {
        const leftRoot = find( left );
        const rightRoot = find( right );
        if ( leftRoot !== rightRoot ) parent.set( rightRoot, leftRoot );
    };
    const portsByEdge = new Map();
    for ( const port of mesh.ports )
    {
        const values = portsByEdge.get( port.edgeId ) ?? [];
        values.push( port );
        portsByEdge.set( port.edgeId, values );
    }
    const malformedSpanEdges = [];
    let edges = 0;
    for ( const [ edgeId, ports ] of portsByEdge )
    {
        if ( ports.length !== 2 )
        {
            malformedSpanEdges.push( { edgeId, portCount: ports.length } );
            continue;
        }
        edges += 1;
        join( ports[ 0 ].clusterIndex, ports[ 1 ].clusterIndex );
    }
    const components = new Set( clusterIndices.map( find ) ).size;
    const vertices = clusterIndices.length;
    return {
        vertices,
        edges,
        components,
        cycleRank: edges - vertices + components,
        malformedSpanEdges
    };
}

function localPatchTopologyReport( mesh )
{
    const patches = ( mesh.stats.patches ?? [] ).map( ( patch ) =>
    {
        const topology = patch.postCapTopology ?? patch.openTopology ?? null;
        const expectedBoundaryLoops = patch.ports;
        const boundaryLoops = topology?.boundaryLoops ?? null;
        const components = topology?.connectedComponents ?? topology?.components ?? null;
        const eulerCharacteristic = topology?.eulerCharacteristic ?? null;
        const expectedEulerCharacteristic = 2 - expectedBoundaryLoops;
        const inferredGenus = topology?.genus ?? (
            Number.isFinite( components )
            && Number.isFinite( boundaryLoops )
            && Number.isFinite( eulerCharacteristic )
                ? ( 2 * components - boundaryLoops - eulerCharacteristic ) / 2
                : null
        );
        return {
            clusterId: patch.clusterId,
            nodes: patch.nodes,
            ports: patch.ports,
            topologyFallback: patch.topologyFallback ?? false,
            authoredTopology: patch.authoredTopology ?? null,
            rawTopology: patch.rawTopology ?? null,
            postCapTopology: topology,
            expectedBoundaryLoops,
            expectedEulerCharacteristic,
            boundaryLoops,
            inferredGenus,
            nonDiskCapRemoval: topology != null && (
                components !== 1
                || boundaryLoops !== expectedBoundaryLoops
                || inferredGenus !== 0
                || eulerCharacteristic !== expectedEulerCharacteristic
                || ( topology.openBoundaryChains ?? 0 ) !== 0
                || ( topology.nonManifoldEdges ?? 0 ) !== 0
                || ( topology.nonManifoldVertices ?? 0 ) !== 0
            )
        };
    } );
    return {
        available: patches.some( ( patch ) => patch.postCapTopology != null ),
        patchCount: patches.length,
        topologyFallbackCount: patches.filter( ( patch ) => patch.topologyFallback ).length,
        authoredHandlePatches: patches.filter(
            ( patch ) => patch.authoredTopology?.genus != null && patch.authoredTopology.genus !== 0
        ).map( ( patch ) => ( {
            clusterId: patch.clusterId,
            genus: patch.authoredTopology.genus,
            ports: patch.ports
        } ) ),
        rawHandlePatches: patches.filter(
            ( patch ) => patch.rawTopology?.genus != null && patch.rawTopology.genus !== 0
        ).map( ( patch ) => ( {
            clusterId: patch.clusterId,
            genus: patch.rawTopology.genus,
            ports: patch.ports
        } ) ),
        nonDiskCapRemovalPatches: patches.filter( ( patch ) => patch.nonDiskCapRemoval )
    };
}

function geometryQualityReport( mesh )
{
    const patchComplexity = ( mesh.stats.patches ?? [] )
        .map( ( patch ) => ( {
            clusterId: patch.clusterId,
            vertices: patch.vertices,
            triangles: patch.triangles,
            cellSize: round( patch.cellSize, 6 ),
            topologyFallback: patch.topologyFallback,
            fallbackHubInflation: round( patch.fallbackHubInflation ?? 1, 6 ),
            nodes: patch.nodes,
            ports: patch.ports
        } ) )
        .sort( ( left, right ) => right.triangles - left.triangles );
    const fallbackPatches = ( mesh.stats.patches ?? [] )
        .filter( ( patch ) => patch.topologyFallback )
        .map( ( patch ) => ( {
            clusterId: patch.clusterId,
            nodes: patch.nodes,
            ports: patch.ports,
            hubInflation: round( patch.fallbackHubInflation ?? 1, 6 )
        } ) )
        .sort( ( left, right ) => right.hubInflation - left.hubInflation );
    const bridgeByPort = new Map( ( mesh.stats.bridges ?? [] )
        .filter( ( bridge ) => bridge.portId != null )
        .map( ( bridge ) => [ bridge.portId, bridge ] ) );
    const perimeterRatios = ( mesh.stats.bridges ?? [] )
        .filter( ( bridge ) => Number.isFinite( bridge.swellingRatio ) )
        .map( ( bridge ) => ( {
            edgeId: bridge.edgeId ?? null,
            portId: bridge.portId ?? null,
            side: bridge.side ?? null,
            ratio: round( bridge.swellingRatio, 6 ),
            effectiveRadius: round( bridge.effectivePortRadius, 6 ),
            authoredRadius: round( bridge.authoredPortRadius, 6 ),
            staged: bridge.staged,
            intermediateRings: bridge.intermediateRings
        } ) )
        .sort( ( left, right ) => right.ratio - left.ratio );
    const projectedRatios = ( mesh.stats.patches ?? [] )
        .flatMap( ( patch ) => patch.portLoopAssignments ?? [] )
        .filter( ( assignment ) => Number.isFinite( assignment.scaleRatio ) )
        .map( ( assignment ) => {
            const bridge = bridgeByPort.get( assignment.portId );
            const authoredRadius = bridge?.authoredPortRadius
                ?? ( assignment.scaleRatio !== 0
                    ? assignment.projectedRadius / assignment.scaleRatio
                    : null );
            return {
                edgeId: bridge?.edgeId ?? null,
                portId: assignment.portId ?? null,
                side: bridge?.side ?? null,
                ratio: round( assignment.scaleRatio, 6 ),
                projectedRadius: round( assignment.projectedRadius, 6 ),
                authoredRadius: round( authoredRadius, 6 ),
                provenanceFraction: round( Math.max(
                    assignment.faceOwnerFraction ?? 0,
                    assignment.faceEdgeFraction ?? 0,
                    assignment.vertexOwnerFraction ?? 0,
                    assignment.vertexEdgeFraction ?? 0
                ), 6 )
            };
        } )
        .sort( ( left, right ) => right.ratio - left.ratio );
    const severeThreshold = 1.25;
    const ratioSummary = ( ratios ) => ( {
        measuredPorts: ratios.length,
        minimumRatio: ratios.length > 0
            ? Math.min( ...ratios.map( ( value ) => value.ratio ) )
            : null,
        maximumRatio: ratios[ 0 ]?.ratio ?? null,
        severeThreshold,
        severeCount: ratios.filter( ( value ) => value.ratio > severeThreshold ).length,
        worstOffenders: ratios.slice( 0, 24 )
    } );
    return {
        patchComplexity: {
            totalPatches: patchComplexity.length,
            totalVertices: patchComplexity.reduce( ( sum, patch ) => sum + patch.vertices, 0 ),
            totalTriangles: patchComplexity.reduce( ( sum, patch ) => sum + patch.triangles, 0 ),
            largestPatches: patchComplexity.slice( 0, 10 )
        },
        topologyFallbacks: {
            count: fallbackPatches.length,
            maximumHubInflation: fallbackPatches[ 0 ]?.hubInflation ?? 1,
            worstOffenders: fallbackPatches.slice( 0, 24 )
        },
        projectedAreaEquivalentToAuthoredRadius: ratioSummary( projectedRatios ),
        rawPerimeterEquivalentToAuthoredRadius: ratioSummary( perimeterRatios )
    };
}

function compactStructuralFeedback( mesh )
{
    return ( mesh.stats.structuralFeedback ?? [] ).map( ( value ) => ( {
        attempt: value.attempt,
        action: value.action,
        portId: value.portId ?? null,
        edge: value.edge ?? null,
        advances: ( value.advances ?? [] ).map( ( advance ) => ( {
            key: advance.key,
            increment: round( advance.increment, 6 ),
            total: round( advance.total, 6 )
        } ) )
    } ) );
}

function collisionRelationSummary( collisionReport )
{
    const records = new Map();
    for ( const contact of collisionReport?.unresolved ?? [] )
    {
        const relation = contact.relation ?? 'unknown';
        if ( !records.has( relation ) )
        {
            records.set( relation, {
                contacts: 0,
                surfaceOverlapContacts: 0,
                uniqueEdgePairs: new Set(),
                maximumPenetration: 0,
                maximumSurfacePenetration: 0
            } );
        }
        const record = records.get( relation );
        record.contacts += 1;
        record.surfaceOverlapContacts += Number( contact.isSurfaceOverlap === true );
        record.uniqueEdgePairs.add( contact.pairId ?? pairKey( contact.edgeAId, contact.edgeBId ) );
        record.maximumPenetration = Math.max( record.maximumPenetration, contact.penetration ?? 0 );
        record.maximumSurfacePenetration = Math.max(
            record.maximumSurfacePenetration,
            contact.surfacePenetration ?? 0
        );
    }
    return Object.fromEntries( [ ...records ].sort( ( left, right ) => left[ 0 ].localeCompare( right[ 0 ] ) )
        .map( ( [ relation, record ] ) => [ relation, {
            contacts: record.contacts,
            surfaceOverlapContacts: record.surfaceOverlapContacts,
            uniqueEdgePairs: record.uniqueEdgePairs.size,
            maximumPenetration: round( record.maximumPenetration, 6 ),
            maximumSurfacePenetration: round( record.maximumSurfacePenetration, 6 )
        } ] ) );
}

function meshOwnerId( mesh, triangle )
{
    const ownerIndex = mesh.faceOwners?.[ triangle ];
    return Number.isInteger( ownerIndex ) && ownerIndex >= 0
        ? mesh.ownerIds?.[ ownerIndex ] ?? null
        : null;
}

function meshEdgeId( mesh, triangle )
{
    const edgeIndex = mesh.faceEdges?.[ triangle ];
    return Number.isInteger( edgeIndex ) && edgeIndex >= 0
        ? mesh.edgeIds?.[ edgeIndex ] ?? null
        : null;
}

function meshPosition( mesh, vertex )
{
    const offset = vertex * 3;
    return {
        x: mesh.positions[ offset ],
        y: mesh.positions[ offset + 1 ],
        z: mesh.positions[ offset + 2 ]
    };
}

function triangleEdgeLengths( positions )
{
    const distance = ( left, right ) => Math.hypot(
        right.x - left.x,
        right.y - left.y,
        right.z - left.z
    );
    return [
        distance( positions[ 0 ], positions[ 1 ] ),
        distance( positions[ 1 ], positions[ 2 ] ),
        distance( positions[ 2 ], positions[ 0 ] )
    ];
}

function bridgeStageForTriangle( bridge, triangle )
{
    const offset = triangle - bridge.firstFace;
    if ( Array.isArray( bridge.faceStages ) ) return bridge.faceStages[ offset ] ?? null;
    for ( const range of bridge.stageRanges ?? [] )
    {
        const first = range.firstFace ?? bridge.firstFace + ( range.firstOffset ?? 0 );
        const last = range.lastFace ?? bridge.firstFace + ( range.lastOffset ?? -1 );
        if ( triangle >= first && triangle <= last ) return range.stage ?? range.name ?? null;
    }
    return bridge.staged ? 'staged-collar-unspecified' : 'direct-zipper';
}

function bridgeContextForTriangle( mesh, triangle )
{
    const bridge = ( mesh.stats.bridges ?? [] ).find(
        ( candidate ) => triangle >= candidate.firstFace && triangle <= candidate.lastFace
    );
    if ( !bridge ) return null;
    return {
        edgeId: bridge.edgeId ?? null,
        portId: bridge.portId ?? null,
        side: bridge.side ?? null,
        firstFace: bridge.firstFace,
        lastFace: bridge.lastFace,
        faceOffset: triangle - bridge.firstFace,
        stage: bridgeStageForTriangle( bridge, triangle ),
        sourceVertices: bridge.sourceVertices,
        targetVertices: bridge.targetVertices,
        staged: bridge.staged,
        intermediateRings: bridge.intermediateRings,
        minimumDoubleArea: bridge.minimumDoubleArea,
        axialSlabs: bridge.axialSlabs ?? null
    };
}

function patchContextForTriangle( mesh, triangle )
{
    let firstFace = 0;
    for ( const patch of mesh.stats.patches ?? [] )
    {
        const lastFace = firstFace + ( patch.triangles ?? 0 ) - 1;
        if ( triangle >= firstFace && triangle <= lastFace )
        {
            return {
                clusterId: patch.clusterId,
                firstFace,
                lastFace,
                faceOffset: triangle - firstFace,
                vertices: patch.vertices,
                triangles: patch.triangles,
                cellSize: patch.cellSize,
                topologyFallback: patch.topologyFallback,
                fallbackHubInflation: patch.fallbackHubInflation,
                nodes: patch.nodes,
                ports: patch.ports
            };
        }
        firstFace = lastFace + 1;
    }
    return null;
}

function opposedNormalDetails( mesh, report )
{
    return ( report.normals.samples.opposedTriangles ?? [] ).map( ( triangle ) => {
        const offset = triangle * 3;
        const vertices = [
            Number( mesh.indices[ offset ] ),
            Number( mesh.indices[ offset + 1 ] ),
            Number( mesh.indices[ offset + 2 ] )
        ];
        const positions = vertices.map( ( vertex ) => meshPosition( mesh, vertex ) );
        const ab = {
            x: positions[ 1 ].x - positions[ 0 ].x,
            y: positions[ 1 ].y - positions[ 0 ].y,
            z: positions[ 1 ].z - positions[ 0 ].z
        };
        const ac = {
            x: positions[ 2 ].x - positions[ 0 ].x,
            y: positions[ 2 ].y - positions[ 0 ].y,
            z: positions[ 2 ].z - positions[ 0 ].z
        };
        const face = {
            x: ab.y * ac.z - ab.z * ac.y,
            y: ab.z * ac.x - ab.x * ac.z,
            z: ab.x * ac.y - ab.y * ac.x
        };
        const faceLength = Math.hypot( face.x, face.y, face.z );
        const vertexNormals = vertices.map( ( vertex ) => {
            const normalOffset = vertex * 3;
            return {
                x: mesh.normals[ normalOffset ],
                y: mesh.normals[ normalOffset + 1 ],
                z: mesh.normals[ normalOffset + 2 ]
            };
        } );
        const vertexDots = vertexNormals.map( ( normal ) => {
            const normalLength = Math.hypot( normal.x, normal.y, normal.z );
            return ( face.x * normal.x + face.y * normal.y + face.z * normal.z )
                / Math.max( faceLength * normalLength, Number.EPSILON );
        } );
        return {
            triangle,
            vertices,
            positions,
            doubleArea: faceLength,
            faceNormal: {
                x: face.x / faceLength,
                y: face.y / faceLength,
                z: face.z / faceLength
            },
            vertexNormals,
            ownerId: meshOwnerId( mesh, triangle ),
            hierarchyEdgeIndex: meshEdgeId( mesh, triangle ),
            patch: patchContextForTriangle( mesh, triangle ),
            bridge: bridgeContextForTriangle( mesh, triangle ),
            vertexDots: vertexDots.map( ( value ) => round( value, 6 ) ),
            averageDot: round(
                vertexDots.reduce( ( sum, value ) => sum + value, 0 ) / vertexDots.length,
                6
            )
        };
    } );
}

function detailedDefectReport( mesh, report )
{
    const minimumDoubleArea = report.tolerances.minimumDoubleArea;
    const patchVertexLimit = ( mesh.stats.patches ?? [] )
        .reduce( ( sum, patch ) => sum + ( patch.vertices ?? 0 ), 0 );
    const zeroAreaTriangles = [];
    const edgeMap = new Map();
    const triangleCount = Math.floor( mesh.indices.length / 3 );
    const addEdge = ( left, right, triangle ) =>
    {
        const a = Math.min( left, right );
        const b = Math.max( left, right );
        const key = `${a}:${b}`;
        const edge = edgeMap.get( key ) ?? { key, a, b, triangles: [] };
        edge.triangles.push( triangle );
        edgeMap.set( key, edge );
    };

    for ( let triangle = 0; triangle < triangleCount; triangle += 1 )
    {
        const offset = triangle * 3;
        const vertices = [
            Number( mesh.indices[ offset ] ),
            Number( mesh.indices[ offset + 1 ] ),
            Number( mesh.indices[ offset + 2 ] )
        ];
        const positions = vertices.map( ( vertex ) => meshPosition( mesh, vertex ) );
        const ab = {
            x: positions[ 1 ].x - positions[ 0 ].x,
            y: positions[ 1 ].y - positions[ 0 ].y,
            z: positions[ 1 ].z - positions[ 0 ].z
        };
        const ac = {
            x: positions[ 2 ].x - positions[ 0 ].x,
            y: positions[ 2 ].y - positions[ 0 ].y,
            z: positions[ 2 ].z - positions[ 0 ].z
        };
        const cross = {
            x: ab.y * ac.z - ab.z * ac.y,
            y: ab.z * ac.x - ab.x * ac.z,
            z: ab.x * ac.y - ab.y * ac.x
        };
        const doubleArea = Math.hypot( cross.x, cross.y, cross.z );
        if ( new Set( vertices ).size < 3 || !Number.isFinite( doubleArea )
            || doubleArea <= minimumDoubleArea )
        {
            if ( Number.isFinite( doubleArea ) && new Set( vertices ).size === 3
                && doubleArea <= minimumDoubleArea )
            {
                const edgeLengths = triangleEdgeLengths( positions );
                zeroAreaTriangles.push( {
                    triangle,
                    vertices,
                    positions,
                    doubleArea,
                    strictMinimumDoubleArea: minimumDoubleArea,
                    edgeLengths,
                    minimumEdgeLength: Math.min( ...edgeLengths ),
                    maximumEdgeLength: Math.max( ...edgeLengths ),
                    hasNearDuplicateVertices:
                        Math.min( ...edgeLengths ) <= Math.sqrt( minimumDoubleArea ),
                    vertexOrigins: vertices.map( ( vertex ) =>
                        vertex < patchVertexLimit ? 'junction-patch' : 'explicit-span' ),
                    patch: patchContextForTriangle( mesh, triangle ),
                    bridge: bridgeContextForTriangle( mesh, triangle ),
                    ownerId: meshOwnerId( mesh, triangle ),
                    hierarchyEdgeIndex: meshEdgeId( mesh, triangle )
                } );
            }
            continue;
        }
        addEdge( vertices[ 0 ], vertices[ 1 ], triangle );
        addEdge( vertices[ 1 ], vertices[ 2 ], triangle );
        addEdge( vertices[ 2 ], vertices[ 0 ], triangle );
    }

    const boundaryEdges = [ ...edgeMap.values() ].filter( ( edge ) => edge.triangles.length === 1 );
    const boundaryByVertex = new Map();
    for ( const edge of boundaryEdges )
    {
        for ( const vertex of [ edge.a, edge.b ] )
        {
            const values = boundaryByVertex.get( vertex ) ?? [];
            values.push( edge );
            boundaryByVertex.set( vertex, values );
        }
    }
    const unvisited = new Set( boundaryEdges.map( ( edge ) => edge.key ) );
    const boundaryLoops = [];
    while ( unvisited.size > 0 )
    {
        const startKey = unvisited.values().next().value;
        const stack = [ edgeMap.get( startKey ) ];
        const componentEdges = [];
        const componentVertices = new Set();
        unvisited.delete( startKey );
        while ( stack.length > 0 )
        {
            const edge = stack.pop();
            componentEdges.push( edge );
            componentVertices.add( edge.a );
            componentVertices.add( edge.b );
            for ( const vertex of [ edge.a, edge.b ] )
            {
                for ( const neighbour of boundaryByVertex.get( vertex ) ?? [] )
                {
                    if ( !unvisited.delete( neighbour.key ) ) continue;
                    stack.push( neighbour );
                }
            }
        }
        const vertices = [ ...componentVertices ];
        const centre = vertices.reduce( ( sum, vertex ) =>
        {
            const position = meshPosition( mesh, vertex );
            sum.x += position.x;
            sum.y += position.y;
            sum.z += position.z;
            return sum;
        }, { x: 0, y: 0, z: 0 } );
        centre.x /= vertices.length;
        centre.y /= vertices.length;
        centre.z /= vertices.length;
        const backingZeroAreaTriangles = new Set();
        const boundaryEdgeDetails = componentEdges.map( ( edge ) =>
        {
            const matchingZeroArea = zeroAreaTriangles.filter(
                ( triangle ) => triangle.vertices.includes( edge.a ) && triangle.vertices.includes( edge.b )
            );
            for ( const triangle of matchingZeroArea ) backingZeroAreaTriangles.add( triangle.triangle );
            const face = edge.triangles[ 0 ];
            return {
                vertices: [ edge.a, edge.b ],
                positions: [ meshPosition( mesh, edge.a ), meshPosition( mesh, edge.b ) ],
                incidentTriangle: face,
                ownerId: meshOwnerId( mesh, face ),
                hierarchyEdgeIndex: meshEdgeId( mesh, face ),
                matchingZeroAreaTriangles: matchingZeroArea.map( ( triangle ) => triangle.triangle )
            };
        } );
        boundaryLoops.push( {
            edges: componentEdges.length,
            vertices: vertices.length,
            closed: componentEdges.every(
                ( edge ) => ( boundaryByVertex.get( edge.a )?.length ?? 0 ) === 2
                    && ( boundaryByVertex.get( edge.b )?.length ?? 0 ) === 2
            ),
            centre: {
                x: round( centre.x, 6 ),
                y: round( centre.y, 6 ),
                z: round( centre.z, 6 )
            },
            owners: [ ...new Set( boundaryEdgeDetails.map( ( edge ) => edge.ownerId ) ) ],
            backingZeroAreaTriangles: [ ...backingZeroAreaTriangles ].sort( ( a, b ) => a - b ),
            everyEdgeBackedByZeroAreaFace: boundaryEdgeDetails.every(
                ( edge ) => edge.matchingZeroAreaTriangles.length > 0
            ),
            edgeSamples: boundaryEdgeDetails.slice( 0, 8 )
        } );
    }
    boundaryLoops.sort( ( left, right ) => right.edges - left.edges );
    return {
        strictMinimumDoubleArea: minimumDoubleArea,
        patchVertexLimit,
        boundaryLoops,
        zeroAreaTriangles: zeroAreaTriangles.map( ( triangle ) => ( {
            ...triangle,
            doubleArea: Number( triangle.doubleArea.toExponential( 8 ) ),
            edgeLengths: triangle.edgeLengths.map(
                ( value ) => Number( value.toExponential( 8 ) )
            ),
            minimumEdgeLength: Number( triangle.minimumEdgeLength.toExponential( 8 ) ),
            maximumEdgeLength: Number( triangle.maximumEdgeLength.toExponential( 8 ) )
        } ) ),
        opposedNormals: {
            count: report.normals.opposedTriangles,
            samples: opposedNormalDetails( mesh, report )
        }
    };
}

function recordAssertion( failures, callback )
{
    try
    {
        callback();
    }
    catch ( error )
    {
        failures.push( error instanceof Error ? error.message : String( error ) );
    }
}

function assertGate2Report( scenarioId, fixture, state, model, mesh, report )
{
    const failures = [];
    const activeEdgeIds = state.edges.map( ( edge ) => edge.id ).sort();
    const activeEdgeIndices = state.edges.map( ( edge ) => edge.edgeIndex ).sort( ( a, b ) => a - b );

    recordAssertion( failures, () => assert.equal(
        fixture.hierarchy.nodes.length,
        EXPECTED_HIERARCHY_NODES,
        `${scenarioId}: validated hierarchy node count`
    ) );
    recordAssertion( failures, () => assert.equal(
        fixture.hierarchy.edges.length,
        EXPECTED_HIERARCHY_EDGES,
        `${scenarioId}: validated hierarchy relationship count`
    ) );
    recordAssertion( failures, () => assert.equal(
        report.counts.components,
        1,
        `${scenarioId}: one connected surface component`
    ) );
    recordAssertion( failures, () => assert.equal(
        report.topology.boundaryEdges,
        0,
        `${scenarioId}: no boundary edges`
    ) );
    recordAssertion( failures, () => assert.equal(
        report.topology.nonManifoldEdges,
        0,
        `${scenarioId}: no non-manifold edges`
    ) );
    recordAssertion( failures, () => assert.equal(
        report.topology.nonManifoldVertices,
        0,
        `${scenarioId}: no non-manifold vertices`
    ) );
    recordAssertion( failures, () => assert.equal(
        report.topology.inconsistentWindingEdges,
        0,
        `${scenarioId}: no inconsistent winding edges`
    ) );
    recordAssertion( failures, () => assert.equal(
        report.topology.orientationConflicts,
        0,
        `${scenarioId}: no orientation conflicts`
    ) );
    recordAssertion( failures, () => assert.deepEqual(
        report.topology.components.map( ( component ) => component.genus ),
        [ 0 ],
        `${scenarioId}: the acyclic hierarchy skin has genus zero`
    ) );
    recordAssertion( failures, () => assert.equal(
        mesh.stats.topology.genus,
        0,
        `${scenarioId}: mesher's unfiltered topology also has genus zero`
    ) );
    const graph = contractedClusterGraph( mesh );
    recordAssertion( failures, () => assert.deepEqual(
        graph.malformedSpanEdges,
        [],
        `${scenarioId}: every explicit semantic span has exactly two cluster ports`
    ) );
    recordAssertion( failures, () => assert.equal(
        graph.cycleRank,
        0,
        `${scenarioId}: contracted cluster/span graph remains acyclic`
    ) );
    const patchTopology = localPatchTopologyReport( mesh );
    if ( patchTopology.available )
    {
        recordAssertion( failures, () => assert.deepEqual(
            patchTopology.nonDiskCapRemovalPatches,
            [],
            `${scenarioId}: every cap-removed junction patch is a genus-zero sphere with one disk removed per port`
        ) );
    }
    recordAssertion( failures, () => assert.equal(
        report.degeneracy.invalidIndexTriangles
            + report.degeneracy.nonFiniteTriangles
            + report.degeneracy.repeatedIndexTriangles
            + report.degeneracy.zeroAreaTriangles
            + report.degeneracy.duplicateTriangles,
        0,
        `${scenarioId}: no invalid or degenerate triangles`
    ) );
    recordAssertion( failures, () => assert.equal(
        report.finite.nonFinitePositionVertices,
        0,
        `${scenarioId}: finite positions`
    ) );
    recordAssertion( failures, () => assert.equal(
        report.normals.nonFiniteVertices
            + report.normals.zeroLengthVertices
            + report.normals.opposedTriangles,
        0,
        `${scenarioId}: finite, usable, consistently directed normals`
    ) );
    recordAssertion( failures, () => assert.equal(
        report.coincidentVertices.groupCount,
        0,
        `${scenarioId}: no split coincident seam vertices`
    ) );
    recordAssertion( failures, () => assert.equal(
        report.provenance.coverageComplete,
        true,
        `${scenarioId}: complete provenance coverage`
    ) );
    recordAssertion( failures, () => assert.deepEqual(
        [ ...mesh.ownerIds ].sort(),
        activeEdgeIds,
        `${scenarioId}: every and only active semantic edge is represented`
    ) );
    recordAssertion( failures, () => assert.deepEqual(
        [ ...mesh.edgeIds ].sort( ( a, b ) => a - b ),
        activeEdgeIndices,
        `${scenarioId}: every and only active hierarchy edge index is represented`
    ) );
    recordAssertion( failures, () => assert.deepEqual(
        report.provenance.missingOwners,
        [],
        `${scenarioId}: no active semantic owner is missing from faces`
    ) );
    recordAssertion( failures, () => assert.deepEqual(
        report.provenance.missingEdgeIds,
        [],
        `${scenarioId}: no active hierarchy edge is missing from faces`
    ) );
    recordAssertion( failures, () => assert.equal(
        report.provenance.unassignedTriangleCount,
        0,
        `${scenarioId}: every face has direct mesher provenance`
    ) );
    recordAssertion( failures, () => assert.equal(
        report.provenance.unclassifiedContactEdges,
        0,
        `${scenarioId}: every ownership transition is classified`
    ) );
    recordAssertion( failures, () => assert.equal(
        report.provenance.unintendedContactEdges,
        0,
        `${scenarioId}: no unrelated ownership transition`
    ) );
    const unrelatedContacts = ( model.collisionReport.unresolved ?? [] )
        .filter( ( contact ) => contact.relation === 'unrelated' && contact.isSurfaceOverlap === true );
    recordAssertion( failures, () => assert.equal(
        unrelatedContacts.length,
        0,
        `${scenarioId}: collision resolver left no unrelated true surface penetrations`
    ) );
    recordAssertion( failures, () => assert.equal(
        report.ok,
        true,
        `${scenarioId}: strict mesh audit failed\n${formatMeshAuditSummary( report )}`
    ) );
    return failures;
}

function scenarioSummary( {
    id,
    fixture,
    state,
    model,
    mesh,
    report,
    timings,
    memory,
    failures,
    replay = null
} )
{
    const eligibleNodes = fixture.hierarchy.nodes.filter(
        ( node ) => node.growthEligible !== false
    ).length;
    return {
        id,
        growthTiers: fixture.parameters.growthTiers,
        conduitWeight: fixture.parameters.conduitWeight,
        hierarchy: {
            nodes: fixture.hierarchy.nodes.length,
            relationships: fixture.hierarchy.edges.length,
            activeNodes: eligibleNodes,
            activeEdges: state.edges.length,
            dormantNodes: fixture.hierarchy.nodes.length - eligibleNodes
        },
        collisionResolution: {
            iterations: model.collisionReport.iterations ?? 0,
            initialEdgePairs: model.collisionReport.initialEdgePairCount ?? 0,
            remainingEdgePairs: model.collisionReport.finalEdgePairCount ?? 0,
            remainingSurfaceOverlapPairs: model.collisionReport.finalSurfaceOverlapPairCount ?? 0,
            displacedPoints: model.collisionReport.displacedPointCount ?? 0,
            movedNodes: model.collisionReport.movedNodeCount ?? 0,
            maximumDisplacement: round( model.collisionReport.maxDisplacement ?? 0, 6 ),
            rmsDisplacement: round( model.collisionReport.rmsDisplacement ?? 0, 6 ),
            maximumNodeDisplacement: round( model.collisionReport.maxNodeDisplacement ?? 0, 6 ),
            remainingContactsBySemanticRelation: collisionRelationSummary( model.collisionReport )
        },
        geometry: {
            architecture: mesh.stats.algorithm,
            vertices: report.counts.vertices,
            triangles: report.counts.validTriangles,
            junctionClusters: mesh.stats.junctionClusters,
            absorbedEdges: mesh.stats.absorbedEdges,
            explicitSpans: mesh.stats.explicitSpans,
            components: report.counts.components,
            boundaryEdges: report.topology.boundaryEdges,
            nonManifoldEdges: report.topology.nonManifoldEdges,
            nonManifoldVertices: report.topology.nonManifoldVertices,
            inconsistentWindingEdges: report.topology.inconsistentWindingEdges,
            orientationConflicts: report.topology.orientationConflicts,
            eulerCharacteristic: report.topology.eulerCharacteristic,
            genus: report.topology.components[ 0 ]?.genus ?? null,
            builderTopology: mesh.stats.topology,
            coincidentVertexGroups: report.coincidentVertices.groupCount,
            invalidOrDegenerateTriangles:
                report.degeneracy.invalidIndexTriangles
                + report.degeneracy.nonFiniteTriangles
                + report.degeneracy.repeatedIndexTriangles
                + report.degeneracy.zeroAreaTriangles
                + report.degeneracy.duplicateTriangles,
            nonFinitePositionVertices: report.finite.nonFinitePositionVertices,
            nonFiniteNormalVertices: report.normals.nonFiniteVertices
        },
        structuralRetries: {
            count: mesh.stats.structuralRetries ?? mesh.stats.structuralFeedback?.length ?? 0,
            actions: compactStructuralFeedback( mesh )
        },
        provenance: {
            representedOwners: report.provenance.representedOwnerCount,
            representedEdges: report.provenance.representedEdgeCount,
            missingOwners: report.provenance.missingOwners,
            missingEdges: report.provenance.missingEdgeIds,
            unassignedTriangles: report.provenance.unassignedTriangleCount,
            crossOwnerEdges: report.provenance.crossOwnerEdgeCount,
            unintendedContactEdges: report.provenance.unintendedContactEdges
        },
        defects: report.topology.boundaryEdges > 0
            || report.degeneracy.zeroAreaTriangles > 0
            || report.normals.opposedTriangles > 0
            ? detailedDefectReport( mesh, report )
            : {
                strictMinimumDoubleArea: report.tolerances.minimumDoubleArea,
                boundaryLoops: [],
                zeroAreaTriangles: [],
                opposedNormals: { count: 0, samples: [] }
            },
        contractedClusterGraph: contractedClusterGraph( mesh ),
        localPatchTopology: localPatchTopologyReport( mesh ),
        geometryQuality: geometryQualityReport( mesh ),
        timingsMilliseconds: {
            prepareAndResolve: round( timings.prepare ),
            meshBuild: round( timings.mesh ),
            audit: round( timings.audit ),
            total: round( timings.prepare + timings.mesh + timings.audit )
        },
        memoryMegabytes: memory,
        replay,
        passed: failures.length === 0,
        failures
    };
}

function compactFailureDiagnostics( summary )
{
    const projected = summary.geometryQuality.projectedAreaEquivalentToAuthoredRadius;
    const perimeter = summary.geometryQuality.rawPerimeterEquivalentToAuthoredRadius;
    return {
        id: summary.id,
        geometry: summary.geometry,
        structuralRetries: summary.structuralRetries,
        zeroAreaTriangles: summary.defects.zeroAreaTriangles,
        opposedNormals: summary.defects.opposedNormals,
        geometryQuality: {
            patchComplexity: summary.geometryQuality.patchComplexity,
            topologyFallbacks: summary.geometryQuality.topologyFallbacks,
            projectedAreaEquivalentToAuthoredRadius: {
                measuredPorts: projected.measuredPorts,
                minimumRatio: projected.minimumRatio,
                maximumRatio: projected.maximumRatio,
                severeThreshold: projected.severeThreshold,
                severeCount: projected.severeCount,
                worstOffenders: projected.worstOffenders.slice( 0, 10 )
            },
            rawPerimeterEquivalentToAuthoredRadius: {
                measuredPorts: perimeter.measuredPorts,
                minimumRatio: perimeter.minimumRatio,
                maximumRatio: perimeter.maximumRatio,
                severeThreshold: perimeter.severeThreshold,
                severeCount: perimeter.severeCount,
                worstOffenders: perimeter.worstOffenders.slice( 0, 10 )
            }
        },
        timingsMilliseconds: summary.timingsMilliseconds,
        memoryMegabytes: summary.memoryMegabytes
    };
}

async function executeScenario( definition )
{
    const { id, growthTiers, conduitWeight, replay, maximumPatchCells } = definition;
    console.log( `[gate2] ${id}: preparing tier ${growthTiers}, conduit ${conduitWeight}` );
    const memory = { start: memorySnapshot() };
    const fixture = makeScenarioFixture( growthTiers, conduitWeight );
    const preparationStarted = now();
    const model = prepareTreeSurfaceModel(
        fixture.hierarchy,
        fixture.positions,
        fixture.parameters
    );
    let progress = matureProgress( fixture.hierarchy );
    let replaySummary = null;

    if ( replay )
    {
        const cycle = createGrowthCycle( fixture.hierarchy, 2 );
        let snapshot = cycle.sample( 0 );
        let elapsed = 0;
        let ancestryViolations = 0;
        const releaseTimes = new Map();
        while ( !snapshot.complete && elapsed < 180 )
        {
            elapsed += 0.05;
            snapshot = cycle.sample( elapsed );
            for ( const node of fixture.hierarchy.nodes )
            {
                if ( !node.latent || node.growthEligible === false ) continue;
                const value = snapshot.progress.get( node.id ) ?? 0;
                if ( value > 0 && !releaseTimes.has( node.id ) ) releaseTimes.set( node.id, elapsed );
                const parent = fixture.hierarchy.byId.get( node.parentId );
                if ( value > 1e-10 && parent?.latent && parent.growthEligible !== false
                    && ( snapshot.progress.get( parent.id ) ?? 0 ) < 1 - 1e-10 )
                {
                    ancestryViolations += 1;
                }
            }
        }
        progress = snapshot.progress;
        replaySummary = {
            seed: cycle.seed,
            sampleStepSeconds: 0.05,
            completionTimeSeconds: round( elapsed, 2 ),
            complete: snapshot.complete,
            completedNodes: snapshot.completedCount,
            eligibleLatentNodes: snapshot.eligibleCount,
            releasedNodes: releaseTimes.size,
            ancestryReleaseViolations: ancestryViolations
        };
    }

    const state = createTreeSurfaceEdges( model, progress );
    const preparationFinished = now();
    memory.afterPrepare = memorySnapshot();
    const meshStarted = now();
    let mesh;
    try
    {
        mesh = buildHybridTreeMesh( state.edges, {
            cellSize: state.cellSize,
            ...( maximumPatchCells ? { maxPatchCells: maximumPatchCells } : {} )
        } );
    }
    catch ( error )
    {
        if ( error instanceof Error )
        {
            error.gate2ScenarioDiagnostics = {
                stage: 'mesh-build',
                activeNodes: fixture.hierarchy.nodes.filter(
                    ( node ) => node.growthEligible !== false
                ).length,
                activeEdges: state.edges.length,
                collisionResolution: {
                    iterations: model.collisionReport.iterations ?? 0,
                    remainingContactsBySemanticRelation: collisionRelationSummary(
                        model.collisionReport
                    )
                },
                structuralFeedback: error.structuralFeedback ?? null,
                timingsMilliseconds: {
                    prepareAndResolve: round( preparationFinished - preparationStarted ),
                    meshUntilFailure: round( now() - meshStarted )
                },
                memoryMegabytes: {
                    ...memory,
                    atFailure: memorySnapshot()
                }
            };
        }
        throw error;
    }
    const meshFinished = now();
    memory.afterMesh = memorySnapshot();
    const semanticPolicy = clusterSemanticPolicy( mesh.clusters, state.edges );
    const declaredPolicyFailures = validateDeclaredOwnerPairs( mesh, semanticPolicy );
    const geometry = makeGeometry( mesh );
    const auditStarted = now();
    const report = auditMesh( geometry, {
        maxDetails: 64,
        provenance: {
            triangleOwners: mesh.faceOwners,
            vertexOwners: mesh.vertexOwners,
            triangleEdges: mesh.faceEdges,
            vertexEdges: mesh.vertexEdges,
            ownerIds: mesh.ownerIds,
            edgeIds: mesh.edgeIds,
            expectedOwners: state.edges.map( ( edge ) => edge.id ),
            expectedEdgeIds: state.edges.map( ( edge ) => edge.edgeIndex ),
            allowedOwnerPairs: semanticPolicy.allowedOwnerPairs
        },
        expectations: {
            components: 1,
            maxBoundaryEdges: 0,
            maxBoundaryLoops: 0,
            requireNormals: true,
            requireProvenance: true
        }
    } );
    const auditFinished = now();
    memory.afterAudit = memorySnapshot();
    geometry.dispose();

    const failures = [ ...semanticPolicy.failures, ...declaredPolicyFailures ];
    failures.push( ...assertGate2Report( id, fixture, state, model, mesh, report ) );
    if ( replay )
    {
        recordAssertion( failures, () => assert.equal(
            replaySummary.complete,
            true,
            `${id}: growth cycle reached its explicit complete flag`
        ) );
        recordAssertion( failures, () => assert.equal(
            replaySummary.completedNodes,
            replaySummary.eligibleLatentNodes,
            `${id}: every eligible latent node completed`
        ) );
        recordAssertion( failures, () => assert.equal(
            replaySummary.ancestryReleaseViolations,
            0,
            `${id}: descendants never released before their latent parent completed`
        ) );
        recordAssertion( failures, () => assert.equal(
            state.complete,
            true,
            `${id}: surface model reports complete growth`
        ) );
    }

    const summary = scenarioSummary( {
        id,
        fixture,
        state,
        model,
        mesh,
        report,
        memory,
        replay: replaySummary,
        failures,
        timings: {
            prepare: preparationFinished - preparationStarted,
            mesh: meshFinished - meshStarted,
            audit: auditFinished - auditStarted
        }
    } );
    console.log(
        `[gate2] ${id}: ${summary.passed ? 'PASS' : 'FAIL'}; `
        + `${summary.geometry.vertices} vertices, ${summary.geometry.triangles} triangles, `
        + `${summary.timingsMilliseconds.total} ms`
    );
    if ( !summary.passed )
    {
        for ( const failure of summary.failures ) console.error( `  - ${failure}` );
        console.error(
            `[gate2] ${id}: compact diagnostics\n`
            + JSON.stringify( compactFailureDiagnostics( summary ), null, 2 )
        );
    }
    return summary;
}

function scenarioDefinitions()
{
    const matrix = TIERS.flatMap( ( growthTiers ) => CONDUIT_WEIGHTS.map( ( conduitWeight ) => ( {
        id: `tier-${growthTiers}-weight-${conduitWeight.toFixed( 2 )}`,
        growthTiers,
        conduitWeight,
        replay: false
    } ) ) );
    matrix.push( {
        id: `completed-replay-tier-${REPLAY_TIER}-weight-${REPLAY_WEIGHT.toFixed( 2 )}`,
        growthTiers: REPLAY_TIER,
        conduitWeight: REPLAY_WEIGHT,
        replay: true
    } );
    return matrix;
}

function requestedScenarioId()
{
    const argument = process.argv.slice( 2 ).find( ( value ) => value.startsWith( '--scenario=' ) );
    return argument?.slice( '--scenario='.length ) ?? null;
}

function requestedMaximumPatchCells()
{
    const argument = process.argv.slice( 2 ).find(
        ( value ) => value.startsWith( '--max-patch-cells=' )
    );
    if ( !argument ) return null;
    const value = Number( argument.slice( '--max-patch-cells='.length ) );
    if ( !Number.isInteger( value ) || value <= 0 )
    {
        throw new RangeError( '--max-patch-cells must be a positive integer' );
    }
    return value;
}

async function main()
{
    const allDefinitions = scenarioDefinitions();
    const requested = requestedScenarioId();
    const maximumPatchCells = requestedMaximumPatchCells();
    const selectedDefinitions = requested
        ? allDefinitions.filter( ( definition ) => definition.id === requested )
        : allDefinitions;
    const definitions = selectedDefinitions.map( ( definition ) => ( {
        ...definition,
        maximumPatchCells
    } ) );
    if ( definitions.length === 0 )
    {
        throw new Error(
            `Unknown Gate 2 scenario '${requested}'. Valid ids: `
            + allDefinitions.map( ( definition ) => definition.id ).join( ', ' )
        );
    }

    const startedAt = now();
    const scenarios = [];
    for ( const definition of definitions )
    {
        try
        {
            scenarios.push( await executeScenario( definition ) );
        }
        catch ( error )
        {
            const failure = error instanceof Error ? `${error.name}: ${error.message}` : String( error );
            console.error( `[gate2] ${definition.id}: ERROR; ${failure}` );
            if ( error instanceof Error && error.stack ) console.error( error.stack );
            scenarios.push( {
                id: definition.id,
                growthTiers: definition.growthTiers,
                conduitWeight: definition.conduitWeight,
                passed: false,
                failures: [ failure ],
                errorStack: error instanceof Error ? error.stack : null,
                diagnostics: error instanceof Error ? error.gate2ScenarioDiagnostics ?? null : null
            } );
        }
    }
    const completeMatrix = definitions.length === allDefinitions.length;
    const passed = scenarios.every( ( scenario ) => scenario.passed );
    const results = {
        gate: 2,
        target: 'one connected, watertight, consistently oriented two-manifold tree surface',
        architecture: 'semantic local hard-union junction patches welded to explicit parallel-transport tubes',
        generatedAt: new Date().toISOString(),
        completeMatrix,
        passed: completeMatrix && passed,
        scenarioCount: scenarios.length,
        elapsedMilliseconds: round( now() - startedAt ),
        scenarios
    };

    console.log( JSON.stringify( results, null, 2 ) );
    if ( completeMatrix && passed )
    {
        await mkdir( dirname( RESULTS_PATH ), { recursive: true } );
        await writeFile( RESULTS_PATH, `${JSON.stringify( results, null, 2 )}\n`, 'utf8' );
        console.log( `[gate2] wrote passing audit record to ${RESULTS_PATH}` );
        return;
    }

    if ( !completeMatrix )
    {
        console.log( '[gate2] filtered diagnostic run; documentation was intentionally left untouched.' );
        if ( !passed ) process.exitCode = 1;
    }
    else
    {
        console.error( '[gate2] one or more scenarios failed; documentation was intentionally left untouched.' );
        process.exitCode = 1;
    }
}

await main();

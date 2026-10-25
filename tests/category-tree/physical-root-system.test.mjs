import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
    createCompositionTree,
    treeBaselineDefaults,
    treePlacementRanges
} from '../../src/category-tree/composition/tree-instance.js';
import {
    createCompositionRootSystem
} from '../../src/category-tree/composition/root-system.js';
import {
    createPlantingEnvelope
} from '../../src/category-tree/composition/planting-envelope.js';
import {
    createHierarchy,
    representativeHierarchy,
    unfoldingHierarchy
} from '../../src/category-tree/tree/hierarchy.js';
import {
    createUnfoldingLayout
} from '../../src/category-tree/tree/layout.js';
import {
    createEngineeredTreeLayer
} from '../../src/category-tree/tree/engineered-tree-layer.js';

function createFixture()
{
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    const parameters = { depth: 5.5, width: 3.8 };
    const membrane = {
        height: ( x, z ) => -parameters.depth * Math.exp(
            -( x * x + z * z ) / ( parameters.width * parameters.width )
        ) + x * 0.035 - z * 0.02
    };
    const renderer = {
        getContext() {
            return {
                getContextAttributes() {
                    return { stencil: true };
                }
            };
        }
    };
    const tree = createCompositionTree( {
        scene,
        renderer,
        camera,
        membrane
    } );
    return { scene, membrane, parameters, tree };
}

function createUnrootedFixture()
{
    const scene = new THREE.Scene();
    const membrane = {
        height: ( x, z ) => -5.5 * Math.exp(
            -( x * x + z * z ) / ( 3.8 * 3.8 )
        )
    };
    const establishedHierarchy = createHierarchy( representativeHierarchy );
    const hierarchy = createHierarchy( unfoldingHierarchy );
    const positions = createUnfoldingLayout(
        establishedHierarchy,
        hierarchy,
        {
            trunkRise: 2.05 * treeBaselineDefaults.verticalRise,
            branchRise: 1.45 * treeBaselineDefaults.verticalRise,
            principalReach: 2.8 * treeBaselineDefaults.crownSpread,
            asymmetry: treeBaselineDefaults.asymmetry,
            windSweep: treeBaselineDefaults.windSweep,
            growthTiers: treeBaselineDefaults.growthTiers
        }
    );
    const layer = createEngineeredTreeLayer(
        hierarchy,
        positions,
        { ...treeBaselineDefaults }
    );
    const plantingGroup = new THREE.Group();
    plantingGroup.position.y = -5.5;
    plantingGroup.add( layer.group );
    scene.add( plantingGroup );
    scene.updateMatrixWorld( true );
    const trunk = layer.getTrunkVisibilityResources().trunkMesh;
    const plantingEnvelope = createPlantingEnvelope( { scene, membrane } );
    const envelope = plantingEnvelope.update( trunk );
    return {
        scene,
        membrane,
        hierarchy,
        plantingGroup,
        plantingEnvelope,
        envelope,
        trunk
    };
}

function attributeBytes( attribute )
{
    return Buffer.from( new Uint8Array(
        attribute.array.buffer,
        attribute.array.byteOffset,
        attribute.array.byteLength
    ) );
}

function ringRadius( points )
{
    const centre = points.reduce(
        ( total, point ) => total.add( point ),
        new THREE.Vector3()
    ).multiplyScalar( 1 / points.length );
    return points.reduce(
        ( total, point ) => total + point.distanceTo( centre ),
        0
    ) / points.length;
}

function pathVertices( geometry, roleValue, pathValue )
{
    const position = geometry.getAttribute( 'position' );
    const role = geometry.getAttribute( 'rootRole' );
    const path = geometry.getAttribute( 'rootPath' );
    const points = [];
    for ( let index = 0; index < position.count; index += 1 )
    {
        if ( role.getX( index ) !== roleValue
            || path.getX( index ) !== pathValue ) continue;
        points.push( new THREE.Vector3().fromBufferAttribute( position, index ) );
    }
    return points;
}

function assertFaceContainment( scene, tree )
{
    const roots = tree.physicalRootSystem;
    const geometry = roots.mesh.geometry;
    const surfaceBand = tree.plantingEnvelope.getSnapshot()
        .surfaceBandHalfThickness;
    const position = geometry.getAttribute( 'position' );
    const path = geometry.getAttribute( 'rootPath' );
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    scene.updateMatrixWorld( true );
    for ( let index = 0; index < geometry.index.count; index += 3 )
    {
        const aIndex = geometry.index.getX( index );
        const bIndex = geometry.index.getX( index + 1 );
        const cIndex = geometry.index.getX( index + 2 );
        a.fromBufferAttribute( position, aIndex );
        b.fromBufferAttribute( position, bIndex );
        c.fromBufferAttribute( position, cIndex );
        const probes = [
            a.clone().add( b ).add( c ).multiplyScalar( 1 / 3 ),
            a.clone().lerp( b, 0.5 ),
            b.clone().lerp( c, 0.5 ),
            c.clone().lerp( a, 0.5 )
        ];
        const pathId = path.getX( aIndex );
        for ( const probe of probes )
        {
            roots.mesh.localToWorld( probe );
            const sample = tree.plantingEnvelope.sample(
                probe.x,
                probe.y,
                probe.z
            );
            if ( pathId === 0
                && sample.signedTerrainDistance > surfaceBand + 2e-6 )
            {
                assert.equal(
                    sample.insideContactFootprint,
                    true,
                    `an exposed collar face must remain in the measured contact footprint `
                    + `(signed=${sample.signedTerrainDistance.toFixed( 5 )}, `
                    + `x=${probe.x.toFixed( 3 )}, z=${probe.z.toFixed( 3 )})`
                );
            }
            else if ( pathId > 0 )
            {
                assert.ok(
                    sample.signedTerrainDistance <= 2e-6,
                    `every principal and fine-root face must remain below terrain `
                    + `(path=${pathId}, `
                    + `signed=${sample.signedTerrainDistance.toFixed( 5 )})`
                );
            }
        }
    }
}

function assertCollarShadingContinuity( roots )
{
    const geometry = roots.mesh.geometry;
    const descriptor = geometry.userData.physicalRootSystem;
    const position = geometry.getAttribute( 'position' );
    const normal = geometry.getAttribute( 'normal' );
    const finalBandStart = ( descriptor.collarBandCount - 1 )
        * descriptor.collarSideCount * 6;
    const finalBandEnd = descriptor.collarBandCount
        * descriptor.collarSideCount * 6;
    const points = [ new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3() ];
    const normals = [ new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3() ];
    for ( let offset = finalBandStart; offset < finalBandEnd; offset += 3 )
    {
        for ( let corner = 0; corner < 3; corner += 1 )
        {
            const vertex = geometry.index.getX( offset + corner );
            points[corner].fromBufferAttribute( position, vertex );
            normals[corner].fromBufferAttribute( normal, vertex );
        }
        const faceNormal = points[1].clone().sub( points[0] ).cross(
            points[2].clone().sub( points[0] )
        ).normalize();
        const vertexNormal = normals[0].clone().add( normals[1] )
            .add( normals[2] ).normalize();
        assert.ok(
            faceNormal.dot( vertexNormal ) > 0.5,
            'the exposed collar band must not shade against its face winding'
        );
    }

    roots.mesh.updateWorldMatrix( true, false );
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(
        roots.mesh.matrixWorld
    );
    const snapshot = roots.getSnapshot();
    for ( let side = 0; side < descriptor.collarSideCount; side += 1 )
    {
        const shoulderNormal = new THREE.Vector3().fromBufferAttribute(
            normal,
            snapshot.shoulderStartVertex + side
        ).applyMatrix3( normalMatrix ).normalize();
        const sourceNormal = new THREE.Vector3().fromArray(
            snapshot.shoulderSourceNormals[side]
        );
        assert.ok(
            shoulderNormal.dot( sourceNormal ) > 0.999,
            'the collar shoulder normal must retain the source-trunk seam normal'
        );
    }
}

test( 'the composition derives a physical root system without mutating Tree', () => {
    const {
        membrane,
        hierarchy,
        plantingGroup,
        plantingEnvelope,
        envelope,
        trunk
    } = createUnrootedFixture();
    const sourcePositions = attributeBytes(
        trunk.geometry.getAttribute( 'position' )
    );
    const sourceIndices = attributeBytes( trunk.geometry.index );
    const sourceDrawRange = { ...trunk.geometry.drawRange };
    const roots = createCompositionRootSystem( {
        plantingGroup,
        membrane,
        plantingEnvelope,
        hierarchy
    } );
    const snapshot = roots.update( trunk, envelope );

    assert.equal( snapshot.status, 'attached' );
    assert.equal( roots.group.parent, plantingGroup );
    assert.notEqual( roots.mesh.geometry, trunk.geometry );
    assert.notEqual( roots.mesh.material, trunk.material );
    assert.equal(
        roots.mesh.material.color.getHex(),
        trunk.material.color.getHex()
    );
    assert.equal( roots.mesh.material.roughness, trunk.material.roughness );
    assert.equal( roots.mesh.material.metalness, trunk.material.metalness );
    assert.equal( roots.mesh.material.clearcoat, trunk.material.clearcoat );
    assert.equal( roots.mesh.material.depthTest, true );
    assert.equal( roots.mesh.material.depthWrite, true );
    assert.equal( roots.diagnostic.material.depthTest, true );
    assert.equal( roots.diagnostic.material.depthWrite, false );
    assert.equal( snapshot.materialSharedWithTrunk, false );
    assert.equal( snapshot.materialDerivedFromTrunk, true );
    assert.equal( snapshot.sourceMaterialUuid, trunk.material.uuid );
    assert.equal( snapshot.materialSource, 'live-monumental-trunk-derived' );
    assert.equal( snapshot.motionPolicy, 'weighted-shoulder-handoff' );
    const motionWeights = roots.mesh.geometry.getAttribute(
        'rootMotionWeight'
    );
    assert.ok( motionWeights );
    assert.ok( Array.from( { length: 18 }, ( _, side ) =>
        motionWeights.getX( 90 + side ) ).every( ( weight ) => weight === 1 ) );
    assert.ok( Array.from( { length: 18 }, ( _, side ) =>
        motionWeights.getX( 54 + side ) ).every( ( weight ) => weight === 0 ) );
    assert.ok( Array.from( { length: 18 }, ( _, side ) =>
        motionWeights.getX( 72 + side ) ).every( ( weight ) => weight === 0 ) );
    const pathAttribute = roots.mesh.geometry.getAttribute( 'rootPath' );
    for ( let index = 0; index < motionWeights.count; index += 1 )
    {
        if ( pathAttribute.getX( index ) > 0 )
        {
            assert.equal(
                motionWeights.getX( index ),
                0,
                'every buried principal and fine-root vertex must be motionless'
            );
        }
    }
    const shader = {
        uniforms: {},
        vertexShader: '#include <begin_vertex>',
        fragmentShader: ''
    };
    roots.mesh.material.onBeforeCompile( shader, {} );
    assert.match( shader.vertexShader, /attribute float rootMotionWeight/ );
    assert.match( shader.vertexShader,
        /motionReach\s*=\s*smoothstep\([^;]+\)\s*\*\s*rootMotionWeight/ );
    assert.equal( snapshot.principalRootCount, 5 );
    assert.equal( snapshot.continuationCount, 5 );
    assert.equal( snapshot.shoulderClearanceSatisfied, true );
    assert.equal( snapshot.shoulderRingIndices.length, 18 );
    assert.ok(
        snapshot.maximumCollarRise
            <= snapshot.shoulderClearance + 0.08
    );
    assert.deepEqual(
        snapshot.hierarchySourceIds.filter( ( id ) => !id.startsWith( 'counter-' ) )
            .sort(),
        [ 'finance', 'operations', 'resources' ]
    );
    assert.doesNotMatch( snapshot.topologySource, /router/i );
    assert.deepEqual(
        attributeBytes( trunk.geometry.getAttribute( 'position' ) ),
        sourcePositions
    );
    assert.deepEqual( attributeBytes( trunk.geometry.index ), sourceIndices );
    assert.deepEqual( trunk.geometry.drawRange, sourceDrawRange );
} );

test( 'root surfaces taper inside the measured terrain and well envelope', () => {
    const { scene, membrane, tree } = createFixture();
    const roots = tree.physicalRootSystem;
    const snapshot = roots.getSnapshot();
    const geometry = roots.mesh.geometry;
    const position = geometry.getAttribute( 'position' );
    const normal = geometry.getAttribute( 'normal' );
    const role = geometry.getAttribute( 'rootRole' );
    const path = geometry.getAttribute( 'rootPath' );
    const local = new THREE.Vector3();
    scene.updateMatrixWorld( true );

    for ( const attribute of [ position, normal ] )
    {
        assert.ok(
            attribute.array.every( Number.isFinite ),
            `${attribute.name || 'root'} geometry must remain finite`
        );
    }
    const triangleA = new THREE.Vector3();
    const triangleB = new THREE.Vector3();
    const triangleC = new THREE.Vector3();
    const edgeAB = new THREE.Vector3();
    const edgeAC = new THREE.Vector3();
    for ( let index = 0; index < geometry.index.count; index += 3 )
    {
        triangleA.fromBufferAttribute(
            position,
            geometry.index.getX( index )
        );
        triangleB.fromBufferAttribute(
            position,
            geometry.index.getX( index + 1 )
        );
        triangleC.fromBufferAttribute(
            position,
            geometry.index.getX( index + 2 )
        );
        edgeAB.subVectors( triangleB, triangleA );
        edgeAC.subVectors( triangleC, triangleA );
        assert.ok(
            edgeAB.cross( edgeAC ).lengthSq() > 1e-15,
            'physical root triangles must not collapse'
        );
    }
    assertFaceContainment( scene, tree );

    for ( let index = 0; index < position.count; index += 1 )
    {
        local.fromBufferAttribute( position, index );
        const world = roots.mesh.localToWorld( local.clone() );
        const sample = tree.plantingEnvelope.sample( world.x, world.y, world.z );
        if ( role.getX( index ) === 1 || role.getX( index ) === 2 )
        {
            assert.ok(
                world.y <= membrane.height( world.x, world.z ) + 2e-6,
                'every principal and fine-root surface vertex must remain below terrain'
            );
            const pathIndex = path.getX( index );
            const influenceFloor = role.getX( index ) === 1
                ? snapshot.principalInfluenceFloors[pathIndex - 1]
                : snapshot.continuationInfluenceFloors[pathIndex - 6];
            assert.ok(
                sample.wellInfluence >= influenceFloor - 2e-6,
                'every physical root surface vertex must satisfy its fitted well budget'
            );
        }
        if ( role.getX( index ) === 0
            && sample.signedTerrainDistance
                > tree.plantingEnvelope.getSnapshot().surfaceBandHalfThickness )
        {
            assert.equal(
                sample.insideContactFootprint,
                true,
                'the exposed collar must remain inside the measured contact footprint'
            );
        }
    }

    for ( let pathId = 1; pathId <= 5; pathId += 1 )
    {
        for ( const [ rootRole, sides, rolePathId ] of [
            [ 1, 10, pathId ],
            [ 2, 8, pathId + 5 ]
        ] )
        {
            const points = pathVertices( geometry, rootRole, rolePathId );
            assert.ok( points.length > sides * 2 );
            assert.ok(
                ringRadius( points.slice( -sides ) )
                    < ringRadius( points.slice( 0, sides ) ) * 0.5,
                'each physical path must taper materially toward its endpoint'
            );
        }
    }
    assert.equal( snapshot.aboveTerrainOutsideContactCount, 0 );
    assert.ok( snapshot.maximumBuriedSignedDistance < 0 );
    assert.ok( snapshot.minimumPrincipalWellInfluence >= 0.22 - 1e-6 );
    assert.ok( snapshot.minimumContinuationWellInfluence >= 0.12 - 1e-6 );
    assert.ok( snapshot.minimumWellInfluenceMargin >= -1e-8 );
    assert.ok( snapshot.minimumSurfaceWellInfluenceMargin >= -2e-6 );
    assert.ok( snapshot.endpointBands.every( ( band ) => band === 'deep-medium' ) );
    assert.equal( snapshot.uncapped, true );
    assert.equal(
        geometry.index.count,
        4 * 18 * 6 + 5 * ( 24 * 10 * 6 + 18 * 8 * 6 ),
        'only side quads are indexed; the collar and roots have no end caps'
    );
} );

test( 'combined shallow narrow trough contains the full root surface', () => {
    const { scene, parameters, tree } = createFixture();
    const roots = tree.physicalRootSystem;
    tree.setPlacementValue( 'scale', 1.3 );
    tree.setPlacementValue( 'embedDepth', 1 );
    tree.setPlacementValue( 'rotationDegrees', 180 );
    parameters.depth = 1;
    parameters.width = 1.5;
    tree.updatePlacement();

    const snapshot = roots.getSnapshot();
    assert.equal( snapshot.status, 'attached' );
    assert.ok(
        snapshot.minimumSurfaceWellInfluenceMargin >= -2e-6,
        `depth=1, width=1.5, scale=1.3, settlement=1, rotation=180 `
        + `must retain the fitted well budget across the full root surface `
        + `(minimum margin=${snapshot.minimumSurfaceWellInfluenceMargin})`
    );

    const geometry = roots.mesh.geometry;
    const position = geometry.getAttribute( 'position' );
    const path = geometry.getAttribute( 'rootPath' );
    const local = new THREE.Vector3();
    scene.updateMatrixWorld( true );
    for ( let index = 0; index < position.count; index += 1 )
    {
        const pathId = path.getX( index );
        if ( pathId === 0 ) continue;
        const influenceFloor = pathId <= 5
            ? snapshot.principalInfluenceFloors[pathId - 1]
            : snapshot.continuationInfluenceFloors[pathId - 6];
        local.fromBufferAttribute( position, index );
        const world = roots.mesh.localToWorld( local.clone() );
        const sample = tree.plantingEnvelope.sample(
            world.x,
            world.y,
            world.z
        );
        assert.ok(
            sample.wellInfluence >= influenceFloor - 2e-6,
            `combined trough surface escaped its fitted well budget `
            + `(path=${pathId}, vertex=${index}, `
            + `influence=${sample.wellInfluence}, floor=${influenceFloor}, `
            + `margin=${sample.wellInfluence - influenceFloor})`
        );
    }
    assertFaceContainment( scene, tree );
} );

test( 'root geometry follows live transforms and diagnostics restore safely', () => {
    const { scene, parameters, tree } = createFixture();
    const roots = tree.physicalRootSystem;
    let previousRevision = roots.getSnapshot().revision;
    const firstRootGeometry = roots.mesh.geometry;
    const firstDiagnosticGeometry = roots.diagnostic.geometry;
    const disposeCounts = { root: 0, diagnostic: 0 };
    const disposeRoot = firstRootGeometry.dispose.bind( firstRootGeometry );
    const disposeDiagnostic = firstDiagnosticGeometry.dispose.bind(
        firstDiagnosticGeometry
    );
    firstRootGeometry.dispose = () => {
        disposeCounts.root += 1;
        disposeRoot();
    };
    firstDiagnosticGeometry.dispose = () => {
        disposeCounts.diagnostic += 1;
        disposeDiagnostic();
    };

    for ( const scale of [
        treePlacementRanges.scale.min,
        treePlacementRanges.scale.max
    ] )
    {
        for ( const settlement of [
            treePlacementRanges.embedDepth.min,
            treePlacementRanges.embedDepth.max
        ] )
        {
            tree.setPlacementValue( 'scale', scale );
            tree.setPlacementValue( 'embedDepth', settlement );
            const snapshot = roots.getSnapshot();
            assert.equal( snapshot.status, 'attached' );
            assert.ok( snapshot.revision > previousRevision );
            assert.ok( snapshot.endpointBands.every(
                ( band ) => band === 'deep-medium'
            ) );
            assert.equal( snapshot.aboveTerrainOutsideContactCount, 0 );
            previousRevision = snapshot.revision;
        }
    }
    assert.deepEqual( disposeCounts, { root: 1, diagnostic: 1 } );

    tree.setPlacementValue( 'rotationDegrees', 0 );
    const zeroDegreeShoulder = roots.getSnapshot().shoulderSourceLine;
    tree.setPlacementValue( 'rotationDegrees', 90 );
    assert.notDeepEqual(
        roots.getSnapshot().shoulderSourceLine,
        zeroDegreeShoulder,
        'orientation must rotate the geometry against an asymmetric membrane'
    );
    for ( const orientation of [
        treePlacementRanges.rotationDegrees.min,
        treePlacementRanges.rotationDegrees.max
    ] )
    {
        tree.setPlacementValue( 'rotationDegrees', orientation );
        const snapshot = roots.getSnapshot();
        assert.equal( snapshot.status, 'attached' );
        assert.ok( snapshot.endpointBands.every(
            ( band ) => band === 'deep-medium'
        ) );
        assert.equal( snapshot.aboveTerrainOutsideContactCount, 0 );
    }

    parameters.depth = 5.9;
    parameters.width = 4.2;
    tree.updatePlacement();
    assert.equal( roots.getSnapshot().status, 'attached' );
    assert.ok( roots.getSnapshot().endpointBands.every(
        ( band ) => band === 'deep-medium'
    ) );

    for ( const width of [ 1.5, 6 ] )
    {
        parameters.width = width;
        tree.updatePlacement();
        const snapshot = roots.getSnapshot();
        assert.equal( snapshot.status, 'attached' );
        assert.ok( snapshot.minimumWellInfluenceMargin >= -1e-8 );
        assert.ok( snapshot.minimumSurfaceWellInfluenceMargin >= -2e-6 );
        assert.ok( snapshot.endpointBands.every(
            ( band ) => band === 'deep-medium'
        ) );
    }
    parameters.width = 4.2;
    tree.updatePlacement();

    parameters.depth = 1;
    parameters.width = 6;
    tree.setPlacementValue( 'scale', 0.9 );
    tree.setPlacementValue( 'embedDepth', 0 );
    tree.setPlacementValue( 'rotationDegrees', 90 );
    assertFaceContainment( scene, tree );

    parameters.depth = 8;
    parameters.width = 1.5;
    tree.setPlacementValue( 'scale', 1.3 );
    tree.setPlacementValue( 'embedDepth', 1 );
    tree.setFormValue( 'crownSpread', 0.65 );
    tree.setFormValue( 'verticalRise', 0.7 );
    tree.setFormValue( 'asymmetry', 1 );
    tree.setFormValue( 'windSweep', -1.2 );
    const extreme = roots.getSnapshot();
    assert.equal( extreme.shoulderClearanceSatisfied, true );
    assert.ok(
        extreme.maximumCollarRise <= extreme.shoulderClearance * 2.25,
        'side-correspondent shoulders must not grow into a tall sleeve'
    );
    assertFaceContainment( scene, tree );
    assertCollarShadingContinuity( roots );

    const plantingChildCount = tree.group.children.length;
    const previousSourceUuid = roots.getSnapshot().sourceGeometryUuid;
    const replaceDisposeCounts = { root: 0, diagnostic: 0 };
    const replacedRootGeometry = roots.mesh.geometry;
    const replacedDiagnosticGeometry = roots.diagnostic.geometry;
    const disposeReplacedRoot = replacedRootGeometry.dispose.bind(
        replacedRootGeometry
    );
    const disposeReplacedDiagnostic = replacedDiagnosticGeometry.dispose.bind(
        replacedDiagnosticGeometry
    );
    replacedRootGeometry.dispose = () => {
        replaceDisposeCounts.root += 1;
        disposeReplacedRoot();
    };
    replacedDiagnosticGeometry.dispose = () => {
        replaceDisposeCounts.diagnostic += 1;
        disposeReplacedDiagnostic();
    };
    tree.setFormValue( 'crownSpread', 1.16 );
    const rebuiltTrunk = tree.layer.getTrunkVisibilityResources().trunkMesh;
    assert.equal( tree.group.children.length, plantingChildCount );
    assert.notEqual( rebuiltTrunk.geometry.uuid, previousSourceUuid );
    assert.equal(
        roots.getSnapshot().sourceGeometryUuid,
        rebuiltTrunk.geometry.uuid
    );
    assert.deepEqual( replaceDisposeCounts, { root: 1, diagnostic: 1 } );
    const stableRootUuid = roots.mesh.geometry.uuid;
    tree.update( 1000 );
    tree.update( 1016 );
    assert.equal(
        roots.mesh.geometry.uuid,
        stableRootUuid,
        'ordinary animation frames must not rebuild physical roots'
    );

    assert.equal( roots.diagnostic.visible, false );
    tree.setPhysicalRootDiagnosticVisible( true );
    assert.equal( roots.diagnostic.visible, true );
    tree.setVisible( false );
    assert.equal( roots.group.visible, false );
    assert.equal( roots.diagnostic.visible, false );
    tree.setVisible( true );
    assert.equal( roots.group.visible, true );
    assert.equal( roots.diagnostic.visible, true );

    const trunk = tree.layer.getTrunkVisibilityResources().trunkMesh;
    const detached = {
        ...tree.plantingEnvelope.getSnapshot(),
        status: 'detached'
    };
    assert.equal( roots.update( trunk, detached ).status, 'unavailable' );
    assert.equal( roots.mesh.visible, false );
    assert.equal( roots.diagnostic.visible, false );
    tree.updatePlacement();
    assert.equal( roots.getSnapshot().status, 'attached' );
    assert.equal( roots.mesh.visible, true );
    assert.equal( roots.diagnostic.visible, true );
} );

test( 'disposing composition roots preserves Tree resources', () => {
    const { tree } = createFixture();
    const roots = tree.physicalRootSystem;
    const trunk = tree.layer.getTrunkVisibilityResources().trunkMesh;
    let sourceMaterialDisposed = false;
    let sourceGeometryDisposed = false;
    let rootMaterialDisposed = 0;
    const ownedDisposeCounts = {
        rootGeometry: 0,
        diagnosticGeometry: 0,
        diagnosticMaterial: 0
    };
    trunk.material.dispose = () => { sourceMaterialDisposed = true; };
    trunk.geometry.dispose = () => { sourceGeometryDisposed = true; };
    const disposeRootMaterial = roots.mesh.material.dispose.bind(
        roots.mesh.material
    );
    roots.mesh.material.dispose = () => {
        rootMaterialDisposed += 1;
        disposeRootMaterial();
    };
    const disposeRootGeometry = roots.mesh.geometry.dispose.bind(
        roots.mesh.geometry
    );
    const disposeDiagnosticGeometry = roots.diagnostic.geometry.dispose.bind(
        roots.diagnostic.geometry
    );
    const disposeDiagnosticMaterial = roots.diagnostic.material.dispose.bind(
        roots.diagnostic.material
    );
    roots.mesh.geometry.dispose = () => {
        ownedDisposeCounts.rootGeometry += 1;
        disposeRootGeometry();
    };
    roots.diagnostic.geometry.dispose = () => {
        ownedDisposeCounts.diagnosticGeometry += 1;
        disposeDiagnosticGeometry();
    };
    roots.diagnostic.material.dispose = () => {
        ownedDisposeCounts.diagnosticMaterial += 1;
        disposeDiagnosticMaterial();
    };

    roots.dispose();

    assert.equal( sourceMaterialDisposed, false );
    assert.equal( sourceGeometryDisposed, false );
    assert.equal( rootMaterialDisposed, 1 );
    assert.deepEqual( ownedDisposeCounts, {
        rootGeometry: 1,
        diagnosticGeometry: 1,
        diagnosticMaterial: 1
    } );
    assert.equal( roots.group.parent, null );
} );

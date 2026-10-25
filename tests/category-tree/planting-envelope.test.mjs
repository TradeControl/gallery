import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
    createPlantingEnvelope
} from '../../src/category-tree/composition/planting-envelope.js';
import {
    createMonumentalTrunkGeometry
} from '../../src/lib/tree/engineered-tree-layer.js';
import {
    createCompositionTree,
    treePlacementRanges
} from '../../src/category-tree/composition/tree-instance.js';

function createSyntheticTrunk( {
    radialSegments = 6,
    ringY = [ -1.4, -0.35, 1.6 ],
    topYBySide = null
} = {} )
{
    const vertices = [];
    for ( let ring = 0; ring < ringY.length; ring += 1 )
    {
        const taper = 1 - ring * 0.08;
        for ( let side = 0; side < radialSegments; side += 1 )
        {
            const angle = side / radialSegments * Math.PI * 2;
            vertices.push(
                Math.cos( angle ) * 1.25 * taper,
                ring === ringY.length - 1 && topYBySide
                    ? topYBySide[side]
                    : ringY[ring],
                Math.sin( angle ) * 0.72 * taper
            );
        }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute( vertices, 3 )
    );
    geometry.userData.monumentalTrunk = {
        radialSegments,
        sideVertexCount: radialSegments * ringY.length,
        plantingSegmentCount: 1,
        samplesPerSpan: 1
    };
    const material = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh( geometry, material );
    mesh.name = 'synthetic monumental trunk';
    return { geometry, material, mesh };
}

function disposeSyntheticTrunk( trunk )
{
    trunk.mesh.removeFromParent();
    trunk.geometry.dispose();
    trunk.material.dispose();
}

function assertNear( actual, expected, tolerance = 1e-6 )
{
    assert.ok(
        Math.abs( actual - expected ) <= tolerance,
        `${actual} must be within ${tolerance} of ${expected}`
    );
}

test( 'the planting envelope follows the real noncircular trunk and terrain', () => {
    const scene = new THREE.Scene();
    const membrane = {
        height: ( x, z ) => -0.4 + x * 0.18 - z * 0.11
    };
    const trunk = createSyntheticTrunk();
    scene.add( trunk.mesh );
    const envelope = createPlantingEnvelope( { scene, membrane } );

    const snapshot = envelope.update( trunk.mesh );
    assert.equal( snapshot.status, 'attached' );
    assert.equal( snapshot.contactCount, 6 );
    assert.equal( snapshot.plantingRootFootprint.length, 6 );
    assert.equal( snapshot.contactBySide.length, 6 );
    assert.equal( snapshot.plantingRingIndex, 1 );
    assert.equal( snapshot.geometryUuid, trunk.geometry.uuid );
    for ( const point of snapshot.contactLine )
    {
        assertNear( point[1], membrane.height( point[0], point[2] ), 2e-7 );
    }
    assert.ok(
        new Set( snapshot.contactLine.map( ( point ) => point[1].toFixed( 5 ) ) )
            .size > 2,
        'a sloping membrane must produce a nonconstant contact line'
    );
    const xExtent = Math.max( ...snapshot.plantingRootFootprint.map(
        ( point ) => point[0]
    ) ) - Math.min( ...snapshot.plantingRootFootprint.map(
        ( point ) => point[0]
    ) );
    const zExtent = Math.max( ...snapshot.plantingRootFootprint.map(
        ( point ) => point[2]
    ) ) - Math.min( ...snapshot.plantingRootFootprint.map(
        ( point ) => point[2]
    ) );
    assert.ok( xExtent > zExtent * 1.5, 'the real elliptical footprint is retained' );
    const plantedEdge = snapshot.plantingRootFootprint[0][0];
    const contactEdge = snapshot.contactFootprint[0][0];
    const annulusX = ( plantedEdge + contactEdge ) * 0.5;
    const annulus = envelope.sample(
        annulusX,
        membrane.height( annulusX, 0 ),
        0
    );
    assert.equal( annulus.insidePlantingFootprint, true );
    assert.equal( annulus.insideContactFootprint, false );
    assert.equal( annulus.band, 'terrain' );

    envelope.dispose();
    disposeSyntheticTrunk( trunk );
} );

test( 'updates track live Tree transforms and mutable membrane parameters', () => {
    const scene = new THREE.Scene();
    const parameters = { depth: 4, width: 3 };
    const membrane = {
        height: ( x, z ) => -parameters.depth * Math.exp(
            -( x * x + z * z ) / ( parameters.width * parameters.width )
        )
    };
    const trunk = createSyntheticTrunk( {
        ringY: [ -1.1, 0, 3.2 ]
    } );
    const plantingTransform = new THREE.Group();
    plantingTransform.position.y = -parameters.depth;
    plantingTransform.scale.setScalar( 1.2 );
    plantingTransform.rotation.y = 0.3;
    plantingTransform.add( trunk.mesh );
    scene.add( plantingTransform );
    scene.updateMatrixWorld( true );
    const envelope = createPlantingEnvelope( { scene, membrane } );

    const first = envelope.update( trunk.mesh );
    assert.equal( first.status, 'attached' );
    assert.equal( first.anchor[1], -4 );
    const firstFootprint = first.plantingRootFootprint.map(
        ( point ) => point.join( ',' )
    );

    parameters.depth = 5;
    parameters.width = 2.4;
    plantingTransform.position.y = -parameters.depth - 0.2;
    plantingTransform.scale.setScalar( 0.78 );
    plantingTransform.rotation.y = -0.55;
    scene.updateMatrixWorld( true );
    const second = envelope.update( trunk.mesh );
    assert.equal( second.revision, first.revision + 1 );
    assertNear( second.anchor[1], -5.2 );
    assert.equal( second.status, 'attached' );
    assert.notDeepEqual(
        second.plantingRootFootprint.map( ( point ) => point.join( ',' ) ),
        firstFootprint
    );
    for ( const point of second.contactLine )
    {
        assertNear( point[1], membrane.height( point[0], point[2] ), 2e-7 );
    }

    envelope.dispose();
    disposeSyntheticTrunk( trunk );
} );

test( 'the published anchor is the authored planting root, not a ring centroid', () => {
    const scene = new THREE.Scene();
    const nodes = [
        { id: 'planting-root', kind: 'root' },
        { id: 'uptake', kind: 'trunk' },
        { id: 'exchange', kind: 'trunk' }
    ];
    const positions = new Map( [
        [ 'planting-root', { x: 0, y: 0, z: 0 } ],
        [ 'uptake', { x: 0, y: 2, z: 0 } ],
        [ 'exchange', { x: 0.25, y: 4, z: 0.1 } ]
    ] );
    const geometry = createMonumentalTrunkGeometry( nodes, positions, {
        asymmetry: 0.68,
        conduitWeight: 1.34,
        loadDirection: new THREE.Vector3( 1, 0, 0.35 )
    } );
    const material = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh( geometry, material );
    mesh.userData.monumentalTrunk = { nodes, positions };
    const transform = new THREE.Group();
    transform.position.set( 1.2, -4, -0.7 );
    transform.rotation.y = 0.42;
    transform.scale.setScalar( 1.1 );
    transform.add( mesh );
    scene.add( transform );
    scene.updateMatrixWorld( true );
    const membrane = { height: () => -3.4 };
    const envelope = createPlantingEnvelope( { scene, membrane } );

    const snapshot = envelope.update( mesh );
    const expected = new THREE.Vector3().applyMatrix4( mesh.matrixWorld );
    snapshot.anchor.forEach( ( value, index ) => assertNear(
        value,
        expected.getComponent( index )
    ) );
    const ringCentroid = snapshot.plantingRootFootprint.reduce(
        ( total, point ) => total.add( new THREE.Vector3().fromArray( point ) ),
        new THREE.Vector3()
    ).multiplyScalar( 1 / snapshot.plantingRootFootprint.length );
    assert.ok( ringCentroid.distanceTo( expected ) > 1e-3 );

    envelope.dispose();
    mesh.removeFromParent();
    geometry.dispose();
    material.dispose();
} );

test( 'samples expose bounded influence and unambiguous terrain bands', () => {
    const scene = new THREE.Scene();
    const parameters = { depth: 4.5, width: 3.1 };
    const membrane = {
        height: ( x, z ) => -parameters.depth * Math.exp(
            -( x * x + z * z ) / ( parameters.width * parameters.width )
        )
    };
    const trunk = createSyntheticTrunk( {
        ringY: [ -1.25, 0, 3.4 ]
    } );
    trunk.mesh.position.y = -parameters.depth;
    scene.add( trunk.mesh );
    scene.updateMatrixWorld( true );
    const envelope = createPlantingEnvelope( { scene, membrane } );
    const snapshot = envelope.update( trunk.mesh );
    assert.ok( snapshot.deepMediumDepth
        > snapshot.surfaceBandHalfThickness * 2 );

    const centreTerrain = membrane.height( 0, 0 );
    const contact = envelope.sample( 0, centreTerrain, 0 );
    assert.equal( contact.band, 'contact' );
    assert.equal( contact.insideFootprint, true );
    assert.equal( contact.insidePlantingFootprint, true );
    assert.equal( contact.insideContactFootprint, true );
    assert.equal( contact.wellInfluence, 1 );
    assert.equal( contact.signedTerrainDistance, 0 );

    const above = envelope.sample(
        0,
        centreTerrain + snapshot.surfaceBandHalfThickness * 2,
        0
    );
    assert.equal( above.band, 'above-terrain' );
    const buried = envelope.sample(
        0,
        centreTerrain - snapshot.deepMediumDepth * 0.5,
        0
    );
    assert.equal( buried.band, 'buried' );
    const deep = envelope.sample(
        0,
        centreTerrain - snapshot.deepMediumDepth - 0.1,
        0
    );
    assert.equal( deep.band, 'deep-medium' );

    const outsideX = snapshot.characteristicFootprintRadius * 3;
    const outsideTerrain = membrane.height( outsideX, 0 );
    const terrain = envelope.sample( outsideX, outsideTerrain, 0 );
    assert.equal( terrain.band, 'terrain' );
    assert.equal( terrain.insideFootprint, false );
    const far = envelope.sample( 100, membrane.height( 100, 0 ), 0 );
    assert.ok( far.wellInfluence >= 0 && far.wellInfluence <= 1 );
    assert.ok( far.wellInfluence < terrain.wellInfluence );

    envelope.dispose();
    disposeSyntheticTrunk( trunk );
} );

test( 'extreme placements report detached, fully buried and partial states', () => {
    const scene = new THREE.Scene();
    const membrane = { height: () => 0 };
    const envelope = createPlantingEnvelope( { scene, membrane } );
    const detached = createSyntheticTrunk( { ringY: [ 1, 2, 3 ] } );
    const buried = createSyntheticTrunk( { ringY: [ -3, -2, -1 ] } );
    const partial = createSyntheticTrunk( {
        ringY: [ -2, -1, 1 ],
        topYBySide: [ 1, 1, -0.5, -0.5, 1, -0.5 ]
    } );
    scene.add( detached.mesh, buried.mesh, partial.mesh );
    scene.updateMatrixWorld( true );

    assert.equal( envelope.update( detached.mesh ).status, 'detached' );
    assert.equal( envelope.update( buried.mesh ).status, 'fully-buried' );
    const partialSnapshot = envelope.update( partial.mesh );
    assert.equal( partialSnapshot.status, 'partial' );
    assert.ok( partialSnapshot.contactCount > 0 );
    assert.ok( partialSnapshot.contactCount < partialSnapshot.radialSegments );

    envelope.dispose();
    disposeSyntheticTrunk( detached );
    disposeSyntheticTrunk( buried );
    disposeSyntheticTrunk( partial );
} );

test( 'diagnostics are hidden, depth-tested and own no Tree resources', () => {
    const scene = new THREE.Scene();
    const membrane = { height: () => 0 };
    const trunk = createSyntheticTrunk();
    scene.add( trunk.mesh );
    scene.updateMatrixWorld( true );
    const sourceBytes = Buffer.from(
        new Uint8Array( trunk.geometry.getAttribute( 'position' ).array.buffer )
    );
    let sourceGeometryDisposed = false;
    let sourceMaterialDisposed = false;
    trunk.geometry.dispose = () => { sourceGeometryDisposed = true; };
    trunk.material.dispose = () => { sourceMaterialDisposed = true; };
    const envelope = createPlantingEnvelope( { scene, membrane } );

    assert.equal( envelope.group.visible, false );
    assert.ok( scene.children.includes( envelope.group ) );
    envelope.update( trunk.mesh );
    assert.equal( envelope.group.children.length, 5 );
    for ( const diagnostic of envelope.group.children )
    {
        assert.equal( diagnostic.material.depthTest, true );
        assert.equal( diagnostic.material.depthWrite, false );
        assert.notEqual( diagnostic.geometry, trunk.geometry );
    }
    assert.equal( envelope.setDiagnosticVisible( true ), true );
    assert.equal( envelope.group.visible, true );
    assert.equal( envelope.setDiagnosticVisible( false ), false );
    assert.deepEqual(
        Buffer.from( new Uint8Array(
            trunk.geometry.getAttribute( 'position' ).array.buffer
        ) ),
        sourceBytes
    );

    envelope.dispose();
    assert.equal( scene.children.includes( envelope.group ), false );
    assert.equal( sourceGeometryDisposed, false );
    assert.equal( sourceMaterialDisposed, false );
    trunk.mesh.removeFromParent();
} );

test( 'the composition refreshes and restores its live envelope diagnostic', () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    const parameters = { depth: 5.5, width: 3.8 };
    const membrane = {
        height: ( x, z ) => -parameters.depth * Math.exp(
            -( x * x + z * z ) / ( parameters.width * parameters.width )
        )
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

    const initial = tree.plantingEnvelope.getSnapshot();
    assert.equal( initial.status, 'attached' );
    assert.equal( initial.radialSegments, 18 );
    assert.equal( initial.contactCount, 18 );
    assert.deepEqual( initial.anchor, [ 0, -5.5, 0 ] );
    assert.equal( tree.plantingEnvelope.group.visible, false );

    const trunk = tree.layer.getTrunkVisibilityResources().trunkMesh;
    const meaning = trunk.userData.monumentalTrunk.positions.get( 'meaning' );
    function meaningExposure( snapshot )
    {
        scene.updateMatrixWorld( true );
        const meaningWorld = new THREE.Vector3(
            meaning.x,
            meaning.y,
            meaning.z
        ).applyMatrix4( trunk.matrixWorld );
        const highestContact = Math.max( ...snapshot.contactLine.map(
            ( point ) => point[1]
        ) );
        return meaningWorld.y - highestContact;
    }
    const endpointExposures = new Map();
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
            const endpoint = tree.plantingEnvelope.getSnapshot();
            assert.equal( endpoint.status, 'attached' );
            assert.equal( endpoint.contactCount, endpoint.radialSegments );
            const exposure = meaningExposure( endpoint );
            assert.ok(
                exposure > parameters.depth * 0.6,
                `crown onset must clear contact at ${scale}/${settlement}`
            );
            endpointExposures.set( `${scale}/${settlement}`, exposure );
        }
    }

    const leastProminentExposure = endpointExposures.get(
        `${treePlacementRanges.scale.min}`
        + `/${treePlacementRanges.embedDepth.max}`
    );
    const maximumScaleExposure = endpointExposures.get(
        `${treePlacementRanges.scale.max}`
        + `/${treePlacementRanges.embedDepth.max}`
    );
    assert.ok(
        maximumScaleExposure > leastProminentExposure,
        'maximum scale must expose more lower trunk than minimum scale'
    );

    const placementBeforeRejection = { ...tree.placement };
    const matrixBeforeRejection = tree.group.matrix.clone();
    assert.throws(
        () => tree.setPlacementValue(
            'scale',
            treePlacementRanges.scale.min - treePlacementRanges.scale.step
        ),
        /scale must be between/
    );
    assert.throws(
        () => tree.setPlacementValue( 'toString', 1 ),
        /Unknown Tree placement parameter/
    );
    assert.deepEqual( tree.placement, placementBeforeRejection );
    assert.deepEqual( tree.group.matrix.elements, matrixBeforeRejection.elements );

    tree.setPlacementValue( 'scale', 1.15 );
    tree.setPlacementValue( 'rotationDegrees', 31 );
    tree.setPlacementValue( 'embedDepth', 0.5 );
    parameters.depth = 6;
    parameters.width = 2.5;
    tree.updatePlacement();
    const updated = tree.plantingEnvelope.getSnapshot();
    assert.ok( updated.revision > initial.revision );
    assert.equal( updated.status, 'attached' );
    assert.deepEqual( updated.anchor, [ 0, -6.5, 0 ] );

    assert.equal( tree.setPlantingEnvelopeDiagnosticVisible( true ), true );
    tree.setVisible( false );
    assert.equal( tree.plantingEnvelope.group.visible, false );
    tree.setVisible( true );
    assert.equal( tree.plantingEnvelope.group.visible, true );

    tree.plantingEnvelope.dispose();
    tree.visibilityRenderer.dispose();
    tree.group.removeFromParent();
} );

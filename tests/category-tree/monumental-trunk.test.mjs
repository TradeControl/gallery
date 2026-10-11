import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
    createEngineeredTreeLayer,
    createMonumentalTrunkGeometry
} from '../../src/category-tree/tree/engineered-tree-layer.js';

test( 'monumental trunk has one monotone outward-facing sidewall', () => {
    const nodes = [
        { id: 'planting-root', kind: 'root', latent: false },
        { id: 'uptake', kind: 'trunk', latent: false },
        { id: 'exchange', kind: 'trunk', latent: false },
        { id: 'meaning', kind: 'trunk', latent: false },
        { id: 'crown-trunk-1', kind: 'trunk', latent: true, supportRadius: 0.32 },
        { id: 'crown-trunk-2', kind: 'trunk', latent: true, supportRadius: 0.29 }
    ];
    const positions = new Map( nodes.map( ( node, index ) => [
        node.id,
        { x: index > 3 ? ( index - 3 ) * 0.08 : 0, y: index * 1.5, z: 0 }
    ] ) );
    const geometry = createMonumentalTrunkGeometry( nodes, positions, {
        asymmetry: 0.68,
        conduitWeight: 1.34,
        loadDirection: new THREE.Vector3( 1, 0, 0.2 )
    } );
    const metadata = geometry.userData.monumentalTrunk;

    assert.equal(
        metadata.bodySegmentCount,
        ( nodes.length - 1 ) * metadata.samplesPerSpan + metadata.plantingSegmentCount
    );
    assert.equal(
        metadata.bodyIndexCount,
        metadata.bodySegmentCount * metadata.radialSegments * 6
    );
    assert.equal(
        metadata.sideVertexCount,
        ( metadata.bodySegmentCount + 1 ) * metadata.radialSegments
    );
    assert.equal( geometry.index.count,
        metadata.baseIndexCount + metadata.bodyIndexCount + metadata.topIndexCount );
    assert.equal( metadata.nodeRadii.length, nodes.length );
    assert.ok( metadata.nodeRadii[0] > metadata.nodeRadii.at( -1 ) * 2.5 );
    for ( let index = 1; index < metadata.nodeRadii.length; index += 1 )
    {
        assert.ok( metadata.nodeRadii[index] <= metadata.nodeRadii[index - 1] );
    }

    geometry.computeBoundingBox();
    const size = geometry.boundingBox.getSize( new THREE.Vector3() );
    assert.ok( size.x > 2.5, 'the lower trunk must have monumental lateral mass' );
    assert.ok( size.y > 7, 'the sweep must span the complete trunk chain' );

    const firstBodyIndex = metadata.baseIndexCount;
    const position = geometry.getAttribute( 'position' );
    const a = new THREE.Vector3().fromBufferAttribute(
        position, geometry.index.getX( firstBodyIndex ) );
    const b = new THREE.Vector3().fromBufferAttribute(
        position, geometry.index.getX( firstBodyIndex + 1 ) );
    const c = new THREE.Vector3().fromBufferAttribute(
        position, geometry.index.getX( firstBodyIndex + 2 ) );
    const faceNormal = new THREE.Vector3().crossVectors(
        b.clone().sub( a ), c.clone().sub( a )
    ).normalize();
    const faceCentre = a.clone().add( b ).add( c ).multiplyScalar( 1 / 3 );
    const outward = new THREE.Vector3( faceCentre.x, 0, faceCentre.z ).normalize();
    assert.ok( faceNormal.dot( outward ) > 0.9, 'sidewall faces must point outward' );
} );

test( 'engineered layer replaces only trunk edges and grows one contiguous prefix', () => {
    const root = {
        id: 'planting-root', kind: 'root', parentId: null,
        latent: false, children: [], growthEligible: true
    };
    const uptake = {
        id: 'uptake', kind: 'trunk', parentId: root.id,
        latent: false, children: [], growthEligible: true
    };
    const meaning = {
        id: 'meaning', kind: 'trunk', parentId: uptake.id,
        latent: false, children: [], growthEligible: true
    };
    const stage = {
        id: 'crown-trunk-1', kind: 'trunk', parentId: meaning.id,
        latent: true, children: [],
        growthEligible: true, supportRadius: 0.32
    };
    const limb = {
        id: 'operations', kind: 'total', parentId: meaning.id,
        latent: false, children: [],
        growthEligible: true, supportRadius: 0.16
    };
    const terminal = {
        id: 'inspection', kind: 'terminal', parentId: limb.id,
        latent: true, children: [],
        growthEligible: true, supportRadius: 0.035
    };
    root.children.push( uptake );
    uptake.children.push( meaning );
    meaning.children.push( stage, limb );
    limb.children.push( terminal );
    const nodes = [ root, uptake, meaning, stage, limb, terminal ];
    const edges = [
        { parent: root, child: uptake },
        { parent: uptake, child: meaning },
        { parent: meaning, child: stage },
        { parent: meaning, child: limb },
        { parent: limb, child: terminal }
    ];
    const hierarchy = {
        root,
        nodes,
        edges,
        terminals: [ terminal ],
        byId: new Map( nodes.map( ( node ) => [ node.id, node ] ) )
    };
    const positions = new Map( [
        [ root.id, { x: 0, y: 0, z: 0 } ],
        [ uptake.id, { x: 0, y: 2, z: 0 } ],
        [ meaning.id, { x: 0, y: 4, z: 0 } ],
        [ stage.id, { x: 0.08, y: 5.4, z: 0.04 } ],
        [ limb.id, { x: 2.3, y: 5.1, z: 0.4 } ],
        [ terminal.id, { x: 3.5, y: 6, z: 0.7 } ]
    ] );
    const layer = createEngineeredTreeLayer( hierarchy, positions, {
        asymmetry: 0.68,
        conduitWeight: 1.34,
        informationTerminalId: terminal.id
    } );
    const trunk = layer.group.getObjectByName( 'monumental trunk' );
    const informationCore = layer.group.getObjectByName( 'routed information core' );

    assert.ok( trunk );
    assert.ok( informationCore );
    assert.equal( layer.group.children.length, 5 );
    assert.equal( layer.group.getObjectByName( 'planting-root -> uptake' ), undefined );
    assert.ok( layer.group.getObjectByName( 'meaning -> operations' ) );

    layer.setGrowthProgress( new Map() );
    const initialCount = trunk.geometry.drawRange.count;
    const initialGeometry = trunk.geometry;
    let initialGeometryDisposed = false;
    initialGeometry.dispose = () => { initialGeometryDisposed = true; };
    layer.setGrowthProgress( new Map( [ [ stage.id, 0.5 ], [ terminal.id, 0.5 ] ] ) );
    const partialCount = trunk.geometry.drawRange.count;
    const partialMetadata = trunk.geometry.userData.monumentalTrunk;
    assert.equal( initialGeometryDisposed, true );
    assert.notEqual( trunk.geometry, initialGeometry );
    assert.ok( partialCount > initialCount );
    assert.ok( partialCount <= partialMetadata.baseIndexCount + partialMetadata.bodyIndexCount );
    assert.equal(
        ( partialCount - partialMetadata.baseIndexCount )
            % ( partialMetadata.radialSegments * 6 ),
        0
    );

    layer.setGrowthProgress( new Map( [ [ stage.id, 1 ], [ terminal.id, 1 ] ] ) );
    assert.ok( trunk.geometry.drawRange.count > partialCount );
    assert.equal( trunk.geometry.drawRange.count, trunk.geometry.index.count );
} );

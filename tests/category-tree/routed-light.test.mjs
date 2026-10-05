import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
    createHierarchy,
    representativeHierarchy,
    unfoldingHierarchy
} from '../../src/category-tree/tree/hierarchy.js';
import { createUnfoldingLayout } from '../../src/category-tree/tree/layout.js';
import { createGrowthCycle } from '../../src/category-tree/tree/growth-cycle.js';
import {
    createEngineeredTreeLayer,
    createInformationCoreGeometry,
    createInformationRoute,
    selectInformationTerminalForTier
} from '../../src/category-tree/tree/engineered-tree-layer.js';

function createFixture( growthTiers = 3 )
{
    const established = createHierarchy( representativeHierarchy );
    const hierarchy = createHierarchy( unfoldingHierarchy );
    const form = {
        crownSpread: 1.14,
        verticalRise: 0.95,
        asymmetry: 0.68,
        conduitWeight: 1.34,
        windSweep: 0.48,
        growthTiers,
        informationStartTier: 1,
        packetSpeed: 1.55
    };
    const positions = createUnfoldingLayout( established, hierarchy, {
        trunkRise: 2.05 * form.verticalRise,
        branchRise: 1.45 * form.verticalRise,
        principalReach: 2.8 * form.crownSpread,
        asymmetry: form.asymmetry,
        windSweep: form.windSweep,
        growthTiers: form.growthTiers
    } );
    return { form, hierarchy, positions };
}

test( 'routed light follows one exact continuous authored route', () => {
    const { form, hierarchy, positions } = createFixture();
    const route = createInformationRoute(
        hierarchy, positions, 'process-readiness-state', form.asymmetry
    );
    assert.deepEqual( route.nodeIds, [
        'process-readiness-state',
        'process-readiness',
        'process-state',
        'process-observation',
        'crown-trunk-1',
        'meaning',
        'exchange',
        'uptake',
        'planting-root'
    ] );
    assert.equal( route.segments.length, route.nodeIds.length - 1 );

    let lengthSum = 0;
    for ( let index = 0; index < route.segments.length; index += 1 )
    {
        const segment = route.segments[index];
        assert.equal( segment.edge.child.id, segment.childId );
        assert.equal( segment.edge.parent.id, segment.parentId );
        assert.ok( segment.length > 0 );
        assert.equal( segment.childDistance, lengthSum );
        lengthSum += segment.length;
        assert.equal( segment.parentDistance, lengthSum );

        if ( index < route.segments.length - 1 )
        {
            const next = route.segments[index + 1];
            assert.equal( segment.parentId, next.childId );
            assert.ok( Math.abs( segment.parentDistance - next.childDistance ) < 1e-9 );
            assert.ok(
                segment.curve.getPoint( 0 ).distanceTo( next.curve.getPoint( 1 ) ) < 1e-9
            );
        }
    }
    assert.equal( route.totalDistance, lengthSum );
} );

test( 'start tiers resolve deterministic authored terminal routes', () => {
    const { form, hierarchy, positions } = createFixture( 8 );
    const expected = [
        'process-readiness-state',
        'people-readiness-state',
        'earned-value-state',
        'growth-4-antler-1-arm-1-field-1-state',
        'growth-5-antler-1-arm-1-field-1-state',
        'growth-6-antler-1-arm-1-field-1-state',
        'growth-7-antler-1-arm-1-field-1-state',
        'growth-8-antler-1-arm-1-field-1-state'
    ];
    const routes = expected.map( ( expectedId, index ) => {
        const tier = index + 1;
        const terminal = selectInformationTerminalForTier( hierarchy, tier );
        assert.equal( terminal.id, expectedId );
        assert.equal( terminal.kind, 'terminal' );
        assert.equal( terminal.supportTier, true );
        assert.equal( terminal.growthTier, tier );
        assert.notEqual( terminal.growthEligible, false );
        return createInformationRoute( hierarchy, positions, terminal.id, form.asymmetry );
    } );

    assert.notEqual( routes[0].totalDistance, routes[1].totalDistance );
    assert.notEqual( routes[1].totalDistance, routes[2].totalDistance );
    assert.ok( routes[2].nodeIds.includes( 'crown-trunk-3' ) );
    assert.ok( routes[2].nodeIds.includes( 'crown-trunk-2' ) );
    assert.ok( routes[2].nodeIds.includes( 'crown-trunk-1' ) );
} );

test( 'growth remains active until the selected late-tier terminal is mature', () => {
    const { hierarchy } = createFixture();
    const growthCycle = createGrowthCycle( hierarchy, 2 );
    let elapsed = 0;
    let growth = growthCycle.sample( elapsed, 0.42 );
    while ( growth.viability < 0.999 )
    {
        elapsed += 1 / 60;
        growth = growthCycle.sample( elapsed, 0.42 );
    }

    assert.equal( Math.round( growth.viability * 100 ), 100 );
    assert.equal( growth.complete, false );
    assert.ok( growth.progress.get( 'earned-value-state' ) < 0.999 );

    while ( !growth.complete )
    {
        elapsed += 1 / 60;
        growth = growthCycle.sample( elapsed, 0.42 );
    }
    assert.ok( growth.progress.get( 'earned-value-state' ) >= 0.999 );
} );

test( 'one route-local packet advances inward and leaves unrelated graphite untouched', () => {
    const { form, hierarchy, positions } = createFixture();
    const layer = createEngineeredTreeLayer( hierarchy, positions, form );
    const routedMeshes = layer.group.children.filter( ( mesh ) => mesh.userData.informationRoute );
    const routedTerminal = layer.group.getObjectByName(
        'process-readiness -> process-readiness-state'
    );
    const unrelated = layer.group.getObjectByName( 'assembly -> joining' );
    const trunk = layer.group.getObjectByName( 'monumental trunk' );
    const core = layer.group.getObjectByName( 'routed information core' );

    assert.equal( routedMeshes.length, 4 );
    assert.ok( core );
    assert.equal( layer.group.children.filter( ( mesh ) =>
        mesh.userData.informationCore
    ).length, 1 );
    assert.ok( routedTerminal.geometry.getAttribute( 'informationDistance' ) );
    assert.equal( unrelated.geometry.getAttribute( 'informationDistance' ), undefined );
    assert.equal( routedTerminal.material, unrelated.material );
    assert.equal( routedTerminal.material.color.getHex(), 0x1b1e1e );
    assert.equal( routedTerminal.material.alphaHash, false );
    assert.equal( unrelated.material.alphaHash, false );
    assert.equal( core.material.depthTest, true );
    assert.equal( core.material.depthFunc, THREE.GreaterDepth );
    assert.equal( core.material.depthWrite, false );
    assert.equal( core.material.blending, THREE.AdditiveBlending );
    const trunkMask = trunk.geometry.getAttribute( 'informationRoute' );
    assert.ok( Array.from( trunkMask.array ).some( ( value ) => value === 1 ) );
    assert.ok( Array.from( trunkMask.array ).some( ( value ) => value === 0 ) );
    const coreDistances = core.geometry.getAttribute( 'informationDistance' );
    assert.equal( coreDistances.getX( 0 ), 0 );
    assert.ok( Math.abs(
        coreDistances.getX( coreDistances.count - 1 )
        - core.geometry.userData.informationCore.totalDistance
    ) < 1e-5 );
    for ( let index = 1; index < coreDistances.count; index += 1 )
    {
        assert.ok( coreDistances.getX( index ) >= coreDistances.getX( index - 1 ) );
    }
    const terminalPosition = positions.get( 'process-readiness-state' );
    const rootPosition = positions.get( 'planting-root' );
    assert.ok( core.geometry.userData.informationCore.terminal.distanceTo(
        new THREE.Vector3( terminalPosition.x, terminalPosition.y, terminalPosition.z )
    ) < 1e-6 );
    assert.ok( core.geometry.userData.informationCore.root.distanceTo(
        new THREE.Vector3( rootPosition.x, rootPosition.y, rootPosition.z )
    ) < 1e-6 );

    const maximumWeightCore = createInformationCoreGeometry(
        createInformationRoute(
            hierarchy, positions, 'process-readiness-state', form.asymmetry
        ),
        1.85
    );
    assert.ok( maximumWeightCore.userData.informationCore.radius < 0.045 );
    maximumWeightCore.dispose();

    const mature = new Map( hierarchy.nodes
        .filter( ( node ) => node.latent && node.growthEligible !== false )
        .map( ( node ) => [ node.id, 1 ] ) );
    layer.setGrowthProgress( mature );
    const protectedPositions = trunk.geometry.getAttribute( 'position' ).array;
    layer.update( 100, form );
    const start = { ...layer.group.userData.routedLight };
    layer.update( 101, form );
    const later = { ...layer.group.userData.routedLight };

    assert.equal( start.packetCount, 1 );
    assert.equal( later.packetCount, 1 );
    assert.equal( start.headDistance, 0 );
    assert.ok( later.headDistance > start.headDistance );
    assert.equal( later.terminalId, 'process-readiness-state' );
    assert.equal( later.startTier, 1 );
    assert.equal( later.packetSpeed, 1.55 );
    assert.equal( later.coreMeshCount, 1 );
    assert.equal( trunk.geometry.getAttribute( 'position' ).array, protectedPositions );

    layer.update( 102, { ...form, packetSpeed: 0.5 } );
    assert.equal( layer.group.userData.routedLight.headDistance, 0 );
    layer.update( 103, { ...form, packetSpeed: 0.5 } );
    assert.ok( Math.abs( layer.group.userData.routedLight.headDistance - 0.5 ) < 1e-9 );

    const travelDuration = ( later.totalDistance + 2.2 ) / 0.5;
    layer.update( 102 + travelDuration + 0.2, { ...form, packetSpeed: 0.5 } );
    assert.equal( layer.group.userData.routedLight.packetCount, 0 );
    assert.equal( layer.group.userData.routedLight.headDistance, -100 );
    assert.equal( core.material.uniforms.informationHead.value, -100 );
} );

test( 'changing start tier retains mature growth and leaves the outer Tree unchanged', () => {
    const { form, hierarchy, positions } = createFixture( 3 );
    const layer = createEngineeredTreeLayer( hierarchy, positions, form );
    const mature = new Map( hierarchy.nodes
        .filter( ( node ) => node.latent && node.growthEligible !== false )
        .map( ( node ) => [ node.id, 1 ] ) );
    layer.setGrowthProgress( mature );
    layer.update( 20, form );
    const tierOne = { ...layer.group.userData.routedLight };
    const tierOneTrunk = layer.group.getObjectByName( 'monumental trunk' );
    const tierOneUnrelated = layer.group.getObjectByName( 'assembly -> joining' );
    const trunkPositions = Array.from(
        tierOneTrunk.geometry.getAttribute( 'position' ).array
    );
    const unrelatedPositions = Array.from(
        tierOneUnrelated.geometry.getAttribute( 'position' ).array
    );

    layer.rebuild( positions, { ...form, informationStartTier: 3 } );
    layer.update( 30, { ...form, informationStartTier: 3 } );
    const tierThree = { ...layer.group.userData.routedLight };
    const tierThreeTrunk = layer.group.getObjectByName( 'monumental trunk' );
    const tierThreeUnrelated = layer.group.getObjectByName( 'assembly -> joining' );

    assert.equal( tierOne.terminalId, 'process-readiness-state' );
    assert.equal( tierThree.terminalId, 'earned-value-state' );
    assert.equal( tierThree.startTier, 3 );
    assert.ok( tierThree.routeNodeIds.includes( 'crown-trunk-3' ) );
    assert.notEqual( tierThree.totalDistance, tierOne.totalDistance );
    assert.equal( tierThree.packetCount, 1 );
    assert.equal( tierThree.coreMeshCount, 1 );
    assert.equal( tierThreeTrunk.material, tierOneTrunk.material );
    assert.equal( tierThreeUnrelated.material, tierOneUnrelated.material );
    assert.deepEqual(
        Array.from( tierThreeTrunk.geometry.getAttribute( 'position' ).array ),
        trunkPositions
    );
    assert.deepEqual(
        Array.from( tierThreeUnrelated.geometry.getAttribute( 'position' ).array ),
        unrelatedPositions
    );
} );

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import * as THREE from 'three';
import {
    createHierarchy,
    representativeHierarchy,
    unfoldingHierarchy
} from '../../src/lib/tree/hierarchy.js';
import { createUnfoldingLayout } from '../../src/lib/tree/layout.js';
import {
    createEngineeredTreeLayer,
    createInformationRoute,
    createTrunkEnvelopeDescriptor
} from '../../src/lib/tree/engineered-tree-layer.js';
import {
    createInternalRouterTreeDescriptor,
    createInternalRouterTreeGeometry,
    internalRouterCandidateId,
    internalRouterGrowthWallScale,
    internalRouterSeedSite,
    internalRouterTierRange,
    internalRouterTopology
} from '../../src/lib/tree/internal-router-tree.js';

const routedTerminalId = 'process-readiness-state';

function createFixture( overrides = {} )
{
    const established = createHierarchy( representativeHierarchy );
    const hierarchy = createHierarchy( unfoldingHierarchy );
    const form = {
        crownSpread: 1.14,
        verticalRise: 0.95,
        asymmetry: 0.68,
        conduitWeight: 1.34,
        windSweep: 0.48,
        growthTiers: 3,
        packetFrequency: 0.2,
        packetSpeed: 1.55,
        ...overrides
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

function createDescriptorFixture( overrides = {} )
{
    const fixture = createFixture( overrides );
    const envelope = createTrunkEnvelopeDescriptor(
        fixture.hierarchy,
        fixture.positions,
        fixture.form
    );
    const route = createInformationRoute(
        fixture.hierarchy,
        fixture.positions,
        routedTerminalId,
        fixture.form.asymmetry
    );
    const seedSegment = route.byChildId.get( internalRouterSeedSite.childId );
    const seedSpan = envelope.trunkNodeIds.findIndex( ( nodeId, index ) =>
        nodeId === internalRouterSeedSite.parentId
        && envelope.trunkNodeIds[index + 1] === internalRouterSeedSite.childId
    );
    assert.ok( seedSegment );
    assert.equal( seedSegment.parentId, internalRouterSeedSite.parentId );
    assert.ok( seedSpan >= 0 );
    const seedCurveParameter = seedSegment.curve.getUtoTmapping(
        internalRouterSeedSite.localProgress
    );
    const descriptor = createInternalRouterTreeDescriptor( {
        envelope,
        seedPoint: seedSegment.curve.getPointAt(
            internalRouterSeedSite.localProgress
        ),
        seedLongitudinalStation: ( seedSpan + seedCurveParameter )
            * envelope.samplesPerSpan,
        seedSite: internalRouterSeedSite,
        maximumTier: fixture.form.internalRouterTiers
    } );
    return { ...fixture, descriptor, envelope, route, seedSegment };
}

function matureProgress( hierarchy )
{
    return new Map( hierarchy.nodes
        .filter( ( node ) => node.latent && node.growthEligible !== false )
        .map( ( node ) => [ node.id, 1 ] ) );
}

function bufferFor( array )
{
    return Buffer.from( array.buffer, array.byteOffset, array.byteLength );
}

function assertByteEquivalent( actual, expected, message )
{
    assert.equal(
        Buffer.compare( bufferFor( actual ), bufferFor( expected ) ),
        0,
        message
    );
}

function assertNear( actual, expected, tolerance = 2e-6, message = '' )
{
    assert.ok(
        Math.abs( actual - expected ) <= tolerance,
        message || `${actual} should be within ${tolerance} of ${expected}`
    );
}

function assertVectorNear( actual, expected, tolerance = 2e-6, message = '' )
{
    assert.ok(
        actual.distanceTo( expected ) <= tolerance,
        message || `${actual.toArray()} should meet ${expected.toArray()}`
    );
}

function topologySignature( descriptor )
{
    return descriptor.nodes.map( ( node ) => ( {
        id: node.id,
        parentId: node.parentId,
        tier: node.tier,
        ordinal: node.ordinal
    } ) );
}

function expectedTopology( maximumTier )
{
    const terminalCount = 3 * 2 ** ( maximumTier - 1 );
    const nodeCount = 1 + 3 * ( 2 ** maximumTier - 1 );
    return {
        levelCount: maximumTier + 1,
        maximumTier,
        firstSplitCount: 3,
        recursiveSplitCount: 2,
        nodeCount,
        edgeCount: nodeCount - 1,
        terminalCount
    };
}

function causalRuneState( diagnostics )
{
    return {
        candidateId: diagnostics.candidateId,
        mode: diagnostics.mode,
        aggregation: diagnostics.aggregation,
        spatialConvergenceClaim: diagnostics.spatialConvergenceClaim,
        entryCount: diagnostics.entryCount,
        consumptionCount: diagnostics.consumptionCount,
        outputCount: diagnostics.outputCount,
        centreResumeCount: diagnostics.centreResumeCount,
        activeTraversalCount: diagnostics.activeTraversalCount,
        activeCausalPacketIds: diagnostics.activeCausalPacketIds,
        activeTraversals: diagnostics.activeTraversals,
        entryRecords: diagnostics.entryRecords,
        transductionRecords: diagnostics.transductionRecords,
        centreResumeRecords: diagnostics.centreResumeRecords,
        conservation: diagnostics.conservation
    };
}

test( 'D1 is one deterministic four-level inverted routing tree at the exact rune seed', () => {
    const first = createDescriptorFixture();
    const repeated = createDescriptorFixture();
    const descriptor = first.descriptor;
    const repeatedDescriptor = repeated.descriptor;
    const geometry = createInternalRouterTreeGeometry( descriptor );
    const repeatedGeometry = createInternalRouterTreeGeometry(
        repeatedDescriptor
    );

    assert.equal( descriptor.candidateId, internalRouterCandidateId );
    assert.deepEqual( descriptor.topology, internalRouterTopology );
    assert.deepEqual( internalRouterTopology, {
        levelCount: 4,
        maximumTier: 3,
        firstSplitCount: 3,
        recursiveSplitCount: 2,
        nodeCount: 22,
        edgeCount: 21,
        terminalCount: 12
    } );
    assert.equal( descriptor.levelCount, 4 );
    assert.equal( descriptor.maximumTier, 3 );
    assert.equal( descriptor.nodeCount, 22 );
    assert.equal( descriptor.edgeCount, 21 );
    assert.equal( descriptor.terminalCount, 12 );
    assert.equal( descriptor.routeCount, 12 );
    assert.equal( descriptor.edges.length, descriptor.nodes.length - 1 );
    assert.equal( new Set( descriptor.nodes.map( ( node ) => node.id ) ).size, 22 );
    assert.equal( new Set( descriptor.edges.map( ( edge ) => edge.id ) ).size, 21 );

    const expectedSeed = first.seedSegment.curve.getPointAt(
        internalRouterSeedSite.localProgress
    );
    assertVectorNear(
        new THREE.Vector3().fromArray( descriptor.seedPoint ),
        expectedSeed,
        2e-6,
        'the D1 seed must be the authored object-space rune point'
    );
    assert.deepEqual( descriptor.seedSite, internalRouterSeedSite );

    const nodeById = new Map( descriptor.nodes.map( ( node ) => [
        node.id,
        node
    ] ) );
    const baselineFirstRotation = 0.07856627431199101;
    const tierOneNodes = descriptor.nodes
        .filter( ( node ) => node.tier === 1 )
        .sort( ( left, right ) => left.ordinal - right.ordinal );
    assert.equal( tierOneNodes.length, 3 );
    for ( let index = 0; index < tierOneNodes.length; index += 1 )
    {
        assertNear(
            tierOneNodes[index].angle,
            baselineFirstRotation + index * Math.PI * 2 / 3,
            1e-12,
            `baseline tier-3 first-split angle ${index} must remain fixed`
        );
    }
    const childrenByParent = new Map();
    for ( const edge of descriptor.edges )
    {
        const parent = nodeById.get( edge.parentId );
        const child = nodeById.get( edge.childId );
        assert.ok( parent );
        assert.ok( child );
        assert.equal( child.parentId, parent.id );
        assert.equal( child.tier, parent.tier + 1 );
        assert.ok(
            child.longitudinalStation < parent.longitudinalStation,
            `${edge.id} must descend rootward in trunk space`
        );
        const children = childrenByParent.get( parent.id ) ?? [];
        children.push( child.id );
        childrenByParent.set( parent.id, children );
    }
    for ( const node of descriptor.nodes )
    {
        const childCount = childrenByParent.get( node.id )?.length ?? 0;
        if ( node.tier === 0 ) assert.equal( childCount, 3 );
        else if ( node.tier < 3 ) assert.equal( childCount, 2 );
        else assert.equal( childCount, 0 );
    }

    const usedEdges = new Set();
    const terminalIds = new Set();
    const edgeById = new Map( descriptor.edges.map( ( edge ) => [
        edge.id,
        edge
    ] ) );
    for ( const route of descriptor.terminalRoutes )
    {
        assert.equal( route.nodeIds.length, 4 );
        assert.equal( route.edgeIds.length, 3 );
        assert.equal( route.nodeIds[0], descriptor.nodes[0].id );
        assert.equal( route.nodeIds.at( -1 ), route.terminalNodeId );
        assert.equal( nodeById.get( route.terminalNodeId ).tier, 3 );
        assert.ok( route.totalLength > 0 );
        terminalIds.add( route.terminalNodeId );
        for ( let index = 0; index < route.edgeIds.length; index += 1 )
        {
            const edge = edgeById.get( route.edgeIds[index] );
            assert.ok( edge );
            assert.equal( edge.parentId, route.nodeIds[index] );
            assert.equal( edge.childId, route.nodeIds[index + 1] );
            usedEdges.add( edge.id );
        }
    }
    assert.equal( terminalIds.size, 12 );
    assert.equal( usedEdges.size, descriptor.edges.length );
    assert.ok( descriptor.nodes.filter( ( node ) => node.tier === 3 )
        .every( ( node ) =>
            node.longitudinalStation < descriptor.envelope.samplesPerSpan
        ), 'all terminal routes must reach the planting-root span' );

    assert.deepEqual(
        topologySignature( repeatedDescriptor ),
        topologySignature( descriptor )
    );
    assertByteEquivalent(
        repeatedDescriptor.topologyData,
        descriptor.topologyData,
        'D1 node placement must be byte deterministic'
    );
    assertByteEquivalent(
        repeatedDescriptor.edgeData,
        descriptor.edgeData,
        'D1 edge placement must be byte deterministic'
    );
    for ( const attributeName of [
        'position',
        'normal',
        'routerEdge',
        'routerTier',
        'carrierVisibility'
    ] )
    {
        assertByteEquivalent(
            repeatedGeometry.getAttribute( attributeName ).array,
            geometry.getAttribute( attributeName ).array,
            `D1 ${attributeName} must be byte deterministic`
        );
    }
    assertByteEquivalent(
        repeatedGeometry.index.array,
        geometry.index.array,
        'D1 topology indices must be byte deterministic'
    );
    geometry.dispose();
    repeatedGeometry.dispose();
} );

test( 'D1 router tiers 3 through 6 produce deterministic bounded topology and geometry', () => {
    assert.deepEqual( internalRouterTierRange, {
        min: 3,
        max: 6,
        default: 3
    } );
    for ( let maximumTier = 3; maximumTier <= 6; maximumTier += 1 )
    {
        const first = createDescriptorFixture( {
            internalRouterTiers: maximumTier
        } );
        const repeated = createDescriptorFixture( {
            internalRouterTiers: maximumTier
        } );
        const descriptor = first.descriptor;
        const repeatedDescriptor = repeated.descriptor;
        const expected = expectedTopology( maximumTier );
        const geometry = createInternalRouterTreeGeometry( descriptor );
        const repeatedGeometry = createInternalRouterTreeGeometry(
            repeatedDescriptor
        );

        assert.deepEqual( descriptor.topology, expected );
        assert.equal( descriptor.levelCount, expected.levelCount );
        assert.equal( descriptor.maximumTier, maximumTier );
        assert.equal( descriptor.nodeCount, expected.nodeCount );
        assert.equal( descriptor.edgeCount, expected.edgeCount );
        assert.equal( descriptor.terminalCount, expected.terminalCount );
        assert.equal( descriptor.routeCount, expected.terminalCount );
        assert.equal( descriptor.edges.length, descriptor.nodes.length - 1 );
        assert.equal(
            new Set( descriptor.nodes.map( ( node ) => node.id ) ).size,
            expected.nodeCount
        );
        assert.equal(
            new Set( descriptor.edges.map( ( edge ) => edge.id ) ).size,
            expected.edgeCount
        );

        const nodesByTier = new Map();
        for ( const node of descriptor.nodes )
        {
            const nodes = nodesByTier.get( node.tier ) ?? [];
            nodes.push( node );
            nodesByTier.set( node.tier, nodes );
        }
        assert.equal( nodesByTier.get( 0 ).length, 1 );
        for ( let tier = 1; tier <= maximumTier; tier += 1 )
        {
            assert.equal(
                nodesByTier.get( tier ).length,
                3 * 2 ** ( tier - 1 ),
                `tier ${tier} must retain deterministic triadic/binary recursion`
            );
        }

        const nodeById = new Map( descriptor.nodes.map( ( node ) => [
            node.id,
            node
        ] ) );
        for ( const edge of descriptor.edges )
        {
            const parent = nodeById.get( edge.parentId );
            const child = nodeById.get( edge.childId );
            assert.ok( parent );
            assert.ok( child );
            assert.equal( child.tier, parent.tier + 1 );
            assert.ok(
                child.longitudinalStation < parent.longitudinalStation,
                `${edge.id} must remain rootward at router tier ${maximumTier}`
            );
            assert.equal( edge.audit.breachCount, 0 );
            assert.ok( edge.audit.minimumGrowthWallClearance > 0 );
            assert.ok( edge.audit.minimumConstraintClearance >= -1e-6 );
        }
        assert.equal( descriptor.containment.verified, true );
        assert.equal( descriptor.containment.breachCount, 0 );
        assert.ok( descriptor.containment.minimumGrowthWallClearance > 0 );
        assert.ok( descriptor.containment.minimumConstraintClearance >= -1e-6 );
        assert.equal(
            descriptor.containment.sampleCount,
            1 + expected.edgeCount * descriptor.edges[0].audit.sampleCount
        );
        assert.ok( Number.isFinite(
            descriptor.separation.minimumNonJunctionSeparation
        ) );
        assert.equal( descriptor.separation.hardGate, false );

        const terminalIds = new Set();
        for ( const route of descriptor.terminalRoutes )
        {
            assert.equal( route.nodeIds.length, maximumTier + 1 );
            assert.equal( route.edgeIds.length, maximumTier );
            assert.equal( route.nodeIds[0], descriptor.nodes[0].id );
            assert.equal( route.nodeIds.at( -1 ), route.terminalNodeId );
            assert.equal(
                nodeById.get( route.terminalNodeId ).tier,
                maximumTier
            );
            assert.ok( route.totalLength > 0 );
            terminalIds.add( route.terminalNodeId );
        }
        assert.equal( terminalIds.size, expected.terminalCount );
        assert.ok( nodesByTier.get( maximumTier ).every( ( node ) =>
            node.longitudinalStation < descriptor.envelope.samplesPerSpan
        ), 'all terminal routes must still reach the planting-root span' );

        assert.deepEqual(
            topologySignature( repeatedDescriptor ),
            topologySignature( descriptor )
        );
        assertByteEquivalent(
            repeatedDescriptor.topologyData,
            descriptor.topologyData,
            `tier ${maximumTier} node placement must be byte deterministic`
        );
        assertByteEquivalent(
            repeatedDescriptor.edgeData,
            descriptor.edgeData,
            `tier ${maximumTier} edge placement must be byte deterministic`
        );
        for ( const attributeName of [
            'position',
            'normal',
            'routerEdge',
            'routerTier',
            'carrierVisibility'
        ] )
        {
            assertByteEquivalent(
                repeatedGeometry.getAttribute( attributeName ).array,
                geometry.getAttribute( attributeName ).array,
                `tier ${maximumTier} ${attributeName} must be byte deterministic`
            );
        }
        assertByteEquivalent(
            repeatedGeometry.index.array,
            geometry.index.array,
            `tier ${maximumTier} topology indices must be byte deterministic`
        );
        assert.equal(
            geometry.userData.internalRouterTree.vertexContainment.verified,
            true
        );
        assert.equal(
            geometry.userData.internalRouterTree.vertexContainment.breachCount,
            0
        );
        assert.ok(
            geometry.userData.internalRouterTree.vertexContainment
                .minimumGrowthWallClearance > 0
        );
        assert.equal(
            geometry.userData.internalRouterTree.maximumTier,
            maximumTier
        );
        geometry.dispose();
        repeatedGeometry.dispose();
    }
} );

test( 'D1 rejects router complexity outside the bounded review range', () => {
    for ( const maximumTier of [ 2, 2.5, 7 ] )
    {
        assert.throws(
            () => createDescriptorFixture( {
                internalRouterTiers: maximumTier
            } ),
            /maximumTier must be an integer from 3 to 6/
        );
    }
} );

test( 'D1 exposes a separate bounded internal-router tier control', async () => {
    const html = await readFile(
        new URL( '../../src/category-tree/tree/index.html', import.meta.url ),
        'utf8'
    );
    const main = await readFile(
        new URL( '../../src/category-tree/tree/main.js', import.meta.url ),
        'utf8'
    );
    assert.match(
        html,
        /<label[^>]*for="internal-router-tiers"[^>]*>[\s\S]*?<span>Internal router tiers<\/span>/
    );
    const slider = html.match(
        /<input\s+id="internal-router-tiers"[^>]*>/
    )?.[0];
    assert.ok( slider, 'the internal-router tier slider must exist' );
    assert.match( slider, /\btype="range"/ );
    assert.match( slider, /\bmin="3"/ );
    assert.match( slider, /\bmax="6"/ );
    assert.match( slider, /\bstep="1"/ );
    assert.match( slider, /\bvalue="4"/ );
    assert.match(
        main,
        /bindRange\(\s*'growth-tiers',\s*'growthTiers'/,
        'canopy growth tiers must retain their own form property'
    );
    assert.match(
        main,
        /bindRange\(\s*'internal-router-tiers',\s*'internalRouterTiers'[\s\S]*?engineeredTree\.setInternalRouterTiers/,
        'router complexity must use its own property and targeted rebuild'
    );
} );

test( 'D1 tiers 3 through 6 remain inside representative growth envelopes', () => {
    const forms = [
        {},
        {
            crownSpread: 0.65,
            verticalRise: 0.70,
            asymmetry: 1,
            conduitWeight: 0.75,
            windSweep: -1.2,
            growthTiers: 0
        },
        {
            crownSpread: 1.45,
            verticalRise: 1.35,
            asymmetry: 0,
            conduitWeight: 1.85,
            windSweep: 1.2,
            growthTiers: 8
        },
        {
            // Worst tier-6 corner from the bounded min/max form audit.
            crownSpread: 0.65,
            verticalRise: 1.35,
            asymmetry: 1,
            conduitWeight: 0.75,
            windSweep: -1.2,
            growthTiers: 0
        }
    ];
    for ( let maximumTier = 3; maximumTier <= 6; maximumTier += 1 )
    {
        let referenceTopology = null;
        for ( const overrides of forms )
        {
            const { descriptor } = createDescriptorFixture( {
                ...overrides,
                internalRouterTiers: maximumTier
            } );
            const geometry = createInternalRouterTreeGeometry( descriptor );
            const signature = topologySignature( descriptor );
            referenceTopology ??= signature;
            assert.deepEqual(
                signature,
                referenceTopology,
                `form controls may adapt placement but not tier-${maximumTier} topology`
            );
            assert.equal(
                descriptor.envelope.appliedWallClearanceScale,
                internalRouterGrowthWallScale
            );
            assert.equal( descriptor.containment.verified, true );
            assert.equal( descriptor.containment.breachCount, 0 );
            assert.ok( descriptor.containment.minimumGrowthWallClearance > 0 );
            assert.ok(
                descriptor.containment.minimumConstraintClearance >= -1e-6
            );
            assert.equal( descriptor.containment.includesTubeRadius, true );
            assert.equal( descriptor.containment.includesWallMargin, true );
            assert.equal( geometry.userData.internalRouterTree
                .vertexContainment.verified, true );
            assert.equal( geometry.userData.internalRouterTree
                .vertexContainment.breachCount, 0 );
            assert.ok( geometry.userData.internalRouterTree
                .vertexContainment.minimumGrowthWallClearance > 0 );

            let sampleCount = 1;
            let independentlyMeasuredMinimum = Number.POSITIVE_INFINITY;
            for ( const edge of descriptor.edges )
            {
                const audit = edge.audit;
                assert.ok( audit.sampleCount >= 17 );
                assert.equal( audit.breachCount, 0 );
                sampleCount += audit.sampleCount;
                let edgeMinimum = Number.POSITIVE_INFINITY;
                for ( let index = 0; index < audit.sampleCount; index += 1 )
                {
                    const point = new THREE.Vector3().fromArray(
                        audit.centrelinePoints,
                        index * 3
                    );
                    const centre = new THREE.Vector3().fromArray(
                        audit.envelopeCentres,
                        index * 3
                    );
                    assert.ok( point.toArray().every( Number.isFinite ) );
                    assert.ok( centre.toArray().every( Number.isFinite ) );
                    const wallClearance = audit.envelopeRadii[index]
                        - point.distanceTo( centre )
                        - audit.tubeRadii[index];
                    const constraintClearance = wallClearance
                        - descriptor.dimensions.wallMargin;
                    assertNear(
                        audit.growthWallClearances[index],
                        wallClearance,
                        2e-6
                    );
                    assertNear(
                        audit.constraintClearances[index],
                        constraintClearance,
                        2e-6
                    );
                    assert.ok( wallClearance > 0 );
                    assert.ok( constraintClearance >= -1e-6 );
                    edgeMinimum = Math.min( edgeMinimum, wallClearance );
                }
                assertNear(
                    audit.minimumGrowthWallClearance,
                    edgeMinimum,
                    2e-6
                );
                independentlyMeasuredMinimum = Math.min(
                    independentlyMeasuredMinimum,
                    edgeMinimum
                );
            }
            assert.equal( descriptor.containment.sampleCount, sampleCount );
            assert.ok(
                descriptor.containment.minimumGrowthWallClearance
                    <= independentlyMeasuredMinimum + 2e-6
            );
            assert.ok( Number.isFinite(
                descriptor.separation.minimumNonJunctionSeparation
            ) );
            assert.ok(
                descriptor.separation.minimumNonJunctionSeparation > 0,
                `tier ${maximumTier} unrelated tubes must remain separated`
            );
            assert.equal( descriptor.separation.hardGate, false );
            geometry.dispose();
        }
    }
} );

test( 'D1 is invisible in production and one neutral mesh when isolated for diagnosis', () => {
    const fixture = createFixture();
    const layer = createEngineeredTreeLayer(
        fixture.hierarchy,
        fixture.positions,
        fixture.form
    );
    const resources = layer.getInternalRouterTreeResources();
    const geometry = resources.geometry;
    const positions = geometry.getAttribute( 'position' ).array.slice();
    const indices = geometry.index.array.slice();

    assert.equal( resources.enabled, false );
    assert.equal( resources.mesh.visible, false );
    assert.equal( resources.mesh.name, 'D1 inverted internal router diagnostic' );
    assert.equal( resources.material.name, 'D1 internal router neutral diagnostic' );
    assert.equal( resources.material.emissive.getHex(), 0x000000 );
    assert.equal( resources.material.transparent, false );
    assert.equal( resources.diagnostics.diagnosticOnly, true );
    assert.equal( resources.diagnostics.productionVisible, false );
    assert.equal( resources.diagnostics.packetConnected, false );
    assert.equal( resources.diagnostics.junctionImplemented, false );
    assert.equal( resources.diagnostics.transportImplemented, false );
    assert.equal( resources.diagnostics.meshCount, 1 );
    assert.equal( resources.diagnostics.maximumDrawCalls, 1 );
    assert.equal( resources.diagnostics.activeDrawCalls, 0 );
    assert.equal( layer.group.children.filter(
        ( child ) => child.userData.internalRouterTree
    ).length, 1 );

    layer.setVisible( false );
    layer.setInternalRouterDiagnosticVisible( true );
    const isolated = layer.getInternalRouterTreeResources();
    assert.equal( isolated.enabled, true );
    assert.equal( isolated.mesh.visible, true );
    assert.equal( isolated.diagnostics.diagnosticVisible, true );
    assert.equal( isolated.diagnostics.activeDrawCalls, 1 );
    assert.equal( layer.group.visible, true );
    assert.deepEqual(
        layer.group.children.filter( ( child ) => child.visible ),
        [ isolated.mesh ],
        'the bounded diagnostic must isolate exactly one router mesh'
    );

    layer.setInternalRouterDiagnosticVisible( false );
    assert.equal( resources.mesh.visible, false );
    assert.equal( layer.group.visible, false );
    layer.setVisible( true );
    assert.equal( layer.group.visible, true );
    assert.equal( resources.mesh.visible, false );
    assertByteEquivalent(
        geometry.getAttribute( 'position' ).array,
        positions,
        'diagnostic presentation must not move the router'
    );
    assertByteEquivalent(
        geometry.index.array,
        indices,
        'diagnostic presentation must not change router topology'
    );
} );

test( 'D1 diagnostic isolation leaves accepted geometry and 11 Hz transport unchanged', () => {
    function createMatureLayer()
    {
        const fixture = createFixture( {
            packetFrequency: 11,
            packetSpeed: 0.5
        } );
        const layer = createEngineeredTreeLayer(
            fixture.hierarchy,
            fixture.positions,
            fixture.form
        );
        layer.setGrowthProgress( matureProgress( fixture.hierarchy ) );
        return { ...fixture, layer };
    }

    const baseline = createMatureLayer();
    const isolated = createMatureLayer();
    isolated.layer.setVisible( false );
    isolated.layer.setInternalRouterDiagnosticVisible( true );

    const acceptedObjects = [
        [ 'monumental trunk', 'trunk' ],
        [ 'meaning -> operations', 'representative branch' ],
        [ 'routed information core', 'routed core' ],
        [ 'trunk interior carrier skeleton', 'accepted C1 skeleton' ]
    ];
    for ( const [ objectName, label ] of acceptedObjects )
    {
        const expected = baseline.layer.group.getObjectByName( objectName );
        const actual = isolated.layer.group.getObjectByName( objectName );
        assert.ok( expected, `${label} baseline must exist` );
        assert.ok( actual, `${label} isolated candidate must exist` );
        assertByteEquivalent(
            actual.geometry.getAttribute( 'position' ).array,
            expected.geometry.getAttribute( 'position' ).array,
            `D1 must not change ${label} positions`
        );
        assertByteEquivalent(
            actual.geometry.index.array,
            expected.geometry.index.array,
            `D1 must not change ${label} topology`
        );
    }

    for ( const elapsed of [ 0, 2, 10, 30 ] )
    {
        baseline.layer.update( elapsed, baseline.form );
        isolated.layer.update( elapsed, isolated.form );
        assert.deepEqual(
            isolated.layer.group.userData.routedLight,
            baseline.layer.group.userData.routedLight,
            `D1 inspection must not alter routed transport at ${elapsed}s`
        );
        assert.deepEqual(
            causalRuneState( isolated.layer.group.userData.trunkRunes ),
            causalRuneState( baseline.layer.group.userData.trunkRunes ),
            `D1 inspection must not alter the causal ledger at ${elapsed}s`
        );
    }
    assert.equal(
        baseline.layer.group.userData.routedLight.packetFrequency,
        11
    );
    assert.equal( baseline.layer.group.userData.routedLight.packetSpeed, 0.5 );
    assert.ok( baseline.layer.group.userData.routedLight.emittedPacketCount > 0 );
    assert.ok( baseline.layer.group.userData.trunkRunes.entryCount > 0 );
    assert.equal(
        isolated.layer.group.userData.internalRouterTree.packetConnected,
        false
    );
    assert.equal(
        isolated.layer.group.userData.internalRouterTree.transportImplemented,
        false
    );
} );

test( 'changing D1 router tiers leaves accepted Tree geometry and causal transport unchanged', () => {
    function createMatureLayer()
    {
        const fixture = createFixture( {
            packetFrequency: 11,
            packetSpeed: 0.5
        } );
        const layer = createEngineeredTreeLayer(
            fixture.hierarchy,
            fixture.positions,
            fixture.form
        );
        layer.setGrowthProgress( matureProgress( fixture.hierarchy ) );
        return { ...fixture, layer };
    }

    const baseline = createMatureLayer();
    const candidates = [];
    for ( let maximumTier = 3; maximumTier <= 6; maximumTier += 1 )
    {
        const candidate = createMatureLayer();
        const before = candidate.layer.getInternalRouterTreeResources();
        candidate.layer.setInternalRouterTiers( maximumTier );
        const after = candidate.layer.getInternalRouterTreeResources();
        const expected = expectedTopology( maximumTier );

        assert.equal( after.descriptor.maximumTier, maximumTier );
        assert.deepEqual( after.descriptor.topology, expected );
        assert.equal( after.descriptor.nodeCount, expected.nodeCount );
        assert.equal( after.descriptor.edgeCount, expected.edgeCount );
        assert.equal( after.descriptor.terminalCount, expected.terminalCount );
        assert.equal( after.mesh.visible, false );
        assert.equal( after.diagnostics.packetConnected, false );
        assert.equal( after.diagnostics.junctionImplemented, false );
        assert.equal( after.diagnostics.transportImplemented, false );
        if ( maximumTier === 3 )
        {
            assert.equal(
                after.revision,
                before.revision,
                'setting the existing default must not rebuild the router'
            );
        }
        else
        {
            assert.ok(
                after.revision > before.revision,
                `selecting tier ${maximumTier} must replace the router resource`
            );
        }
        candidates.push( { maximumTier, ...candidate } );
    }

    const acceptedObjects = [
        [ 'monumental trunk', 'trunk' ],
        [ 'meaning -> operations', 'representative branch' ],
        [ 'routed information core', 'routed core' ],
        [ 'trunk interior carrier skeleton', 'accepted C1 skeleton' ]
    ];
    for ( const candidate of candidates )
    {
        for ( const [ objectName, label ] of acceptedObjects )
        {
            const expected = baseline.layer.group.getObjectByName( objectName );
            const actual = candidate.layer.group.getObjectByName( objectName );
            assert.ok( expected, `${label} baseline must exist` );
            assert.ok( actual, `${label} tier ${candidate.maximumTier} must exist` );
            assertByteEquivalent(
                actual.geometry.getAttribute( 'position' ).array,
                expected.geometry.getAttribute( 'position' ).array,
                `router tier ${candidate.maximumTier} must not change ${label} positions`
            );
            assertByteEquivalent(
                actual.geometry.index.array,
                expected.geometry.index.array,
                `router tier ${candidate.maximumTier} must not change ${label} topology`
            );
        }
    }

    for ( const elapsed of [ 0, 2, 10, 30 ] )
    {
        baseline.layer.update( elapsed, baseline.form );
        const expectedPacketIds = baseline.layer.group.userData.routedLight
            .activePackets.map( ( packet ) => packet.id );
        const expectedRuneState = causalRuneState(
            baseline.layer.group.userData.trunkRunes
        );

        for ( const candidate of candidates )
        {
            candidate.layer.update( elapsed, candidate.form );
            const actualRoutedLight = candidate.layer.group.userData.routedLight;
            assert.deepEqual(
                actualRoutedLight,
                baseline.layer.group.userData.routedLight,
                `router tier ${candidate.maximumTier} must not alter routed transport at ${elapsed}s`
            );
            assert.deepEqual(
                actualRoutedLight.activePackets.map( ( packet ) => packet.id ),
                expectedPacketIds,
                `router tier ${candidate.maximumTier} must preserve packet identities at ${elapsed}s`
            );
            assert.deepEqual(
                causalRuneState( candidate.layer.group.userData.trunkRunes ),
                expectedRuneState,
                `router tier ${candidate.maximumTier} must not alter the C4c ledger at ${elapsed}s`
            );
        }
    }
} );

test( 'live D1 tier changes replace only router geometry while 11 Hz packets remain active', () => {
    const fixture = createFixture( {
        packetFrequency: 11,
        packetSpeed: 0.5
    } );
    const layer = createEngineeredTreeLayer(
        fixture.hierarchy,
        fixture.positions,
        fixture.form
    );
    layer.setGrowthProgress( matureProgress( fixture.hierarchy ) );
    for ( const elapsed of [ 0, 2, 10, 30 ] )
    {
        layer.update( elapsed, fixture.form );
    }

    const routedBefore = structuredClone( layer.group.userData.routedLight );
    const runeBefore = structuredClone( causalRuneState(
        layer.group.userData.trunkRunes
    ) );
    const packetIdsBefore = routedBefore.activePackets.map(
        ( packet ) => packet.id
    );
    assert.equal( routedBefore.packetFrequency, 11 );
    assert.ok( routedBefore.packetCount > 0 );
    assert.ok( routedBefore.emittedPacketCount > 0 );
    assert.ok( packetIdsBefore.length > 0 );
    assert.ok( runeBefore.entryCount > 0 );

    const acceptedObjects = [
        'monumental trunk',
        'meaning -> operations',
        'routed information core',
        'trunk interior carrier skeleton'
    ].map( ( name ) => {
        const object = layer.group.getObjectByName( name );
        assert.ok( object, `${name} must exist before the live tier cycle` );
        return {
            name,
            object,
            geometry: object.geometry,
            material: object.material
        };
    } );

    function observeDisposal( geometry )
    {
        const originalDispose = geometry.dispose;
        let count = 0;
        geometry.dispose = function observedDispose( ...args )
        {
            count += 1;
            return originalDispose.apply( this, args );
        };
        return () => count;
    }

    function assertLiveStateUnchanged( stage )
    {
        const routed = layer.group.userData.routedLight;
        assert.deepEqual(
            routed,
            routedBefore,
            `${stage} must preserve live routing and emission schedule state`
        );
        assert.deepEqual(
            routed.activePackets.map( ( packet ) => packet.id ),
            packetIdsBefore,
            `${stage} must preserve independent packet identities`
        );
        assert.deepEqual(
            causalRuneState( layer.group.userData.trunkRunes ),
            runeBefore,
            `${stage} must preserve the live C4c causal ledger`
        );
        for ( const accepted of acceptedObjects )
        {
            const current = layer.group.getObjectByName( accepted.name );
            assert.equal(
                current,
                accepted.object,
                `${stage} must preserve ${accepted.name} object identity`
            );
            assert.equal(
                current.geometry,
                accepted.geometry,
                `${stage} must preserve ${accepted.name} geometry ownership`
            );
            assert.equal(
                current.material,
                accepted.material,
                `${stage} must preserve ${accepted.name} material ownership`
            );
        }
    }

    const initial = layer.getInternalRouterTreeResources();
    const routerMesh = initial.mesh;
    const tier3Geometry = initial.geometry;
    const tier3Disposed = observeDisposal( tier3Geometry );
    assert.equal( initial.descriptor.maximumTier, 3 );

    layer.setInternalRouterTiers( 6 );
    const tier6 = layer.getInternalRouterTreeResources();
    const tier6Geometry = tier6.geometry;
    assert.equal( tier6.mesh, routerMesh, '3 -> 6 must retain the router Mesh' );
    assert.notEqual(
        tier6Geometry,
        tier3Geometry,
        '3 -> 6 must replace the router geometry'
    );
    assert.equal( tier6.descriptor.maximumTier, 6 );
    assert.equal( tier3Disposed(), 1, '3 -> 6 must dispose tier-3 geometry once' );
    const tier6Disposed = observeDisposal( tier6Geometry );
    assertLiveStateUnchanged( '3 -> 6' );

    layer.setInternalRouterTiers( 6 );
    const tier6NoOp = layer.getInternalRouterTreeResources();
    assert.equal( tier6NoOp.mesh, routerMesh );
    assert.equal( tier6NoOp.geometry, tier6Geometry );
    assert.equal( tier3Disposed(), 1 );
    assert.equal( tier6Disposed(), 0, 'a tier-6 no-op must not dispose geometry' );
    assertLiveStateUnchanged( 'tier-6 no-op' );

    layer.setInternalRouterTiers( 3 );
    const restored = layer.getInternalRouterTreeResources();
    const restoredGeometry = restored.geometry;
    assert.equal( restored.mesh, routerMesh, '6 -> 3 must retain the router Mesh' );
    assert.notEqual(
        restoredGeometry,
        tier6Geometry,
        '6 -> 3 must replace tier-6 geometry'
    );
    assert.notEqual(
        restoredGeometry,
        tier3Geometry,
        '6 -> 3 must build a fresh tier-3 geometry'
    );
    assert.equal( restored.descriptor.maximumTier, 3 );
    assert.equal( tier3Disposed(), 1 );
    assert.equal( tier6Disposed(), 1, '6 -> 3 must dispose tier-6 geometry once' );
    const restoredDisposed = observeDisposal( restoredGeometry );
    assertLiveStateUnchanged( '6 -> 3' );

    layer.setInternalRouterTiers( 3 );
    const restoredNoOp = layer.getInternalRouterTreeResources();
    assert.equal( restoredNoOp.mesh, routerMesh );
    assert.equal( restoredNoOp.geometry, restoredGeometry );
    assert.equal( tier3Disposed(), 1 );
    assert.equal( tier6Disposed(), 1 );
    assert.equal(
        restoredDisposed(),
        0,
        'a restored tier-3 no-op must not dispose current geometry'
    );
    assertLiveStateUnchanged( 'restored tier-3 no-op' );
} );

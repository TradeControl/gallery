import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
    createInformationRoute
} from '../../src/lib/tree/engineered-tree-layer.js';
import {
    internalRouterSeedSite
} from '../../src/lib/tree/internal-router-tree.js';

const routedTerminalId = 'process-readiness-state';
const junctionCandidateId = 'c4d-d2-router-junction-v1';
const routerRootNodeId = 'd1-router-seed';

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
        internalRouterTiers: 3,
        packetFrequency: 0.2,
        packetSpeed: 1.55,
        internalRouterJunctionEnabled: true,
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
    const layer = createEngineeredTreeLayer( hierarchy, positions, form );
    return { form, hierarchy, positions, layer };
}

function matureProgress( hierarchy )
{
    return new Map( hierarchy.nodes
        .filter( ( node ) => node.latent && node.growthEligible !== false )
        .map( ( node ) => [ node.id, 1 ] ) );
}

function createMatureFixture( overrides = {} )
{
    const fixture = createFixture( overrides );
    fixture.layer.setGrowthProgress( matureProgress( fixture.hierarchy ) );
    return fixture;
}

function getJunctionResources( fixture )
{
    assert.equal(
        typeof fixture.layer.getInternalRouterJunctionResources,
        'function',
        'D2 must expose an auditable junction resource API'
    );
    const resources = fixture.layer.getInternalRouterJunctionResources();
    assert.ok( resources );
    assert.equal( resources.diagnostics,
        fixture.layer.group.userData.internalRouterJunction );
    return resources;
}

function createRoute( fixture, terminalId = routedTerminalId )
{
    return createInformationRoute(
        fixture.hierarchy,
        fixture.positions,
        terminalId,
        fixture.form.asymmetry
    );
}

function routeBoundary( route )
{
    const segment = route.byChildId.get( internalRouterSeedSite.childId );
    assert.ok( segment, 'the route must contain the authored exchange/meaning span' );
    assert.equal( segment.parentId, internalRouterSeedSite.parentId );
    const localProgress = internalRouterSeedSite.localProgress;
    return {
        segment,
        localProgress,
        point: segment.curve.getPointAt( localProgress ),
        distance: THREE.MathUtils.lerp(
            segment.parentDistance,
            segment.childDistance,
            localProgress
        )
    };
}

function assertNear( actual, expected, tolerance = 2e-8, message = '' )
{
    assert.ok(
        Math.abs( actual - expected ) <= tolerance,
        message || `${actual} should be within ${tolerance} of ${expected}`
    );
}

function assertVectorNear( actual, expected, tolerance = 2e-6, message = '' )
{
    const left = actual?.isVector3
        ? actual
        : new THREE.Vector3().fromArray( actual );
    const right = expected?.isVector3
        ? expected
        : new THREE.Vector3().fromArray( expected );
    assert.ok(
        left.distanceTo( right ) <= tolerance,
        message || `${left.toArray()} should meet ${right.toArray()}`
    );
}

function assertByteEquivalent( actual, expected, message )
{
    const left = Buffer.from(
        actual.buffer,
        actual.byteOffset,
        actual.byteLength
    );
    const right = Buffer.from(
        expected.buffer,
        expected.byteOffset,
        expected.byteLength
    );
    assert.equal( Buffer.compare( left, right ), 0, message );
}

function sortRecords( records )
{
    return records.slice().sort( ( left, right ) =>
        left.id.localeCompare( right.id )
    );
}

function sortPackets( packets )
{
    return packets.slice().sort( ( left, right ) =>
        left.id.localeCompare( right.id )
    );
}

function assertD2Conserved( diagnostics )
{
    assert.equal( diagnostics.entryCount, diagnostics.consumptionCount );
    assert.equal( diagnostics.consumptionCount, diagnostics.outputCount );
    assert.equal( diagnostics.outputCount, diagnostics.parkedOutputCount );
    assert.equal( diagnostics.conservation.entered, diagnostics.entryCount );
    assert.equal(
        diagnostics.conservation.consumed,
        diagnostics.consumptionCount
    );
    assert.equal( diagnostics.conservation.produced, diagnostics.outputCount );
    assert.equal(
        diagnostics.conservation.parked,
        diagnostics.parkedOutputCount
    );
    assert.equal( diagnostics.conservation.sourceBalance, 0 );
    assert.equal( diagnostics.conservation.outputBalance, 0 );
    assert.equal( diagnostics.conservation.retainedSourceIdsUnique, true );
    assert.equal( diagnostics.conservation.retainedOutputIdsUnique, true );
}

function assertD2Identity( diagnostics )
{
    assert.equal( diagnostics.candidateId, junctionCandidateId );
    assert.equal( diagnostics.enabled, true );
    assert.equal( diagnostics.packetConnected, true );
    assert.equal( diagnostics.junctionImplemented, true );
    assert.equal( diagnostics.transportImplemented, false );
    assert.equal( diagnostics.semanticClaim, 'transduction' );
    assert.equal( diagnostics.mode, 'one-to-one' );
    assert.equal( diagnostics.aggregation, false );
    assert.equal( diagnostics.coordinateContinuous, true );
    assert.equal( diagnostics.routerRootNodeId, routerRootNodeId );
    assert.equal(
        diagnostics.boundaryLocalProgress,
        internalRouterSeedSite.localProgress
    );
    assert.equal( diagnostics.assignedRouteCount, 0 );
}

function assertImmutableOneToOneRecord( record, output )
{
    assert.ok( Object.isFrozen( record ) );
    assert.ok( Object.isFrozen( record.provenance ) );
    assert.ok( Object.isFrozen( record.provenance[0] ) );
    assert.ok( Object.isFrozen( record.provenance[0].routeNodeIds ) );
    assert.ok( Object.isFrozen( output ) );
    assert.ok( Object.isFrozen( output.provenance ) );
    assert.ok( Object.isFrozen( output.provenance[0] ) );
    assert.ok( Object.isFrozen( output.position ) );
    assert.equal( record.mode, 'one-to-one' );
    assert.equal( record.aggregation, false );
    assert.equal( record.sourcePacketCount, 1 );
    assert.equal( record.outputPacketCount, 1 );
    assert.equal( record.provenanceCardinality, 1 );
    assert.equal( record.provenance.length, 1 );
    assert.equal( record.provenance[0].sourcePacketId, record.sourcePacketId );
    assert.equal( record.outputPacketId, output.id );
    assert.notEqual( record.outputPacketId, record.sourcePacketId );
    assert.equal( output.kind, 'transduced-output' );
    assert.equal( output.signalClass, 'output' );
    assert.equal( output.state, 'parked-at-router-root' );
    assert.equal( output.sourcePacketId, record.sourcePacketId );
    assert.equal( output.routerRootNodeId, routerRootNodeId );
    assert.equal( output.routeAssignment, null );
    assert.deepEqual( output.provenance, record.provenance );
}

function assertLegacyC4cIdle( fixture )
{
    const diagnostics = fixture.layer.group.userData.trunkRunes;
    assert.equal( diagnostics.entryCount, 0 );
    assert.equal( diagnostics.consumptionCount, 0 );
    assert.equal( diagnostics.outputCount, 0 );
    assert.equal( diagnostics.centreResumeCount, 0 );
    assert.equal( diagnostics.activeTraversalCount, 0 );
    assert.equal( fixture.layer.group.userData.routedLight.inRunePacketCount, 0 );
    assert.equal(
        fixture.layer.getTrunkRuneResources().activeTraversals.length,
        0
    );
}

test( 'the Tree study opts into D2 with an independent diagnostic control', () => {
    const mainSource = readFileSync(
        new URL( '../../src/category-tree/tree/main.js', import.meta.url ),
        'utf8'
    );
    const htmlSource = readFileSync(
        new URL( '../../src/category-tree/tree/index.html', import.meta.url ),
        'utf8'
    );

    assert.match( mainSource, /internalRouterJunctionEnabled:\s*true/ );
    assert.match(
        mainSource,
        /setInternalRouterJunctionDiagnosticVisible\(\s*inspectingJunction\s*\)/
    );
    assert.match(
        htmlSource,
        /id="inspect-router-junction"[\s\S]*?data-view="junction"/
    );
    assert.match( htmlSource, /id="internal-router-junction-activity"/ );
} );

test( 'D2 joins the authored canopy route to the exact D1 root in object space', () => {
    const forms = [
        {},
        {
            crownSpread: 0.65,
            verticalRise: 0.70,
            asymmetry: 1,
            conduitWeight: 0.75,
            windSweep: -1.2,
            growthTiers: 0,
            internalRouterTiers: 3
        },
        {
            crownSpread: 1.45,
            verticalRise: 1.35,
            asymmetry: 0,
            conduitWeight: 1.85,
            windSweep: 1.2,
            growthTiers: 8,
            internalRouterTiers: 4
        }
    ];

    for ( const overrides of forms )
    {
        const fixture = createFixture( overrides );
        const router = fixture.layer.getInternalRouterTreeResources();
        const junction = getJunctionResources( fixture );
        const boundary = routeBoundary( createRoute( fixture ) );
        const diagnostics = junction.diagnostics;

        assertD2Identity( diagnostics );
        assertVectorNear(
            router.descriptor.seedPoint,
            boundary.point,
            2e-6,
            'the D1 root must be the exact authored route point'
        );
        assertVectorNear(
            diagnostics.routerRootPoint,
            router.descriptor.seedPoint,
            2e-6,
            'the D2 boundary must use the D1 root without an offset'
        );
        assert.equal(
            router.descriptor.seedSite.id,
            internalRouterSeedSite.id
        );
        assert.equal(
            router.descriptor.seedSite.parentId,
            internalRouterSeedSite.parentId
        );
        assert.equal(
            router.descriptor.seedSite.childId,
            internalRouterSeedSite.childId
        );
    }
} );

test( 'D2 atomically consumes one cyan source and parks one distinct gold output', () => {
    const fixture = createFixture( { packetFrequency: 0.01 } );
    fixture.layer.update( 0, fixture.form );
    const source = fixture.layer.group.userData.routedLight.activePackets[0];
    assert.ok( source );
    assert.equal( source.kind, 'source' );
    assert.equal( source.signalClass, 'source' );
    const boundary = routeBoundary( createRoute( fixture, source.terminalId ) );
    const arrival = source.emittedAt
        + boundary.distance / fixture.form.packetSpeed;

    fixture.layer.update( arrival - 0.000001, fixture.form );
    let junctionResources = getJunctionResources( fixture );
    let diagnostics = junctionResources.diagnostics;
    assertD2Identity( diagnostics );
    assert.equal( diagnostics.entryCount, 0 );
    assert.ok( fixture.layer.group.userData.routedLight.activePackets.some(
        ( packet ) => packet.id === source.id
    ) );
    const tracePosition = junctionResources.ingressTrace.geometry
        .getAttribute( 'position' );
    assert.equal( junctionResources.ingressTrace.geometry.drawRange.count, 17 );
    assertVectorNear(
        [
            tracePosition.getX( tracePosition.count - 1 ),
            tracePosition.getY( tracePosition.count - 1 ),
            tracePosition.getZ( tracePosition.count - 1 )
        ],
        diagnostics.routerRootPoint,
        2e-6,
        'the event-gated cyan diagnostic must terminate at the exact D1 root'
    );
    assert.equal( junctionResources.ingressMesh.material.depthTest, true );
    assert.equal( junctionResources.ingressTrace.material.depthTest, true );

    fixture.layer.update( arrival + 0.000001, fixture.form );
    const resources = getJunctionResources( fixture );
    diagnostics = resources.diagnostics;
    assert.equal( diagnostics.entryCount, 1 );
    assert.equal( diagnostics.consumptionCount, 1 );
    assert.equal( diagnostics.outputCount, 1 );
    assert.equal( diagnostics.parkedOutputCount, 1 );
    assert.equal( diagnostics.retainedEntryRecordCount, 1 );
    assert.equal( diagnostics.retainedTransductionRecordCount, 1 );
    assert.equal( diagnostics.retainedParkedOutputCount, 1 );
    assertD2Conserved( diagnostics );
    const entry = diagnostics.entryRecords[0];
    const record = diagnostics.transductionRecords[0];
    const output = diagnostics.parkedOutputs[0];
    const expectedOutputId = `${source.id}::meaning-transducer::output`;

    assert.ok( Object.isFrozen( entry ) );
    assert.ok( Object.isFrozen( entry.routeNodeIds ) );
    assert.equal( entry.sourcePacketId, source.id );
    assert.equal( entry.sourcePacketCount, 1 );
    assert.equal( entry.aggregation, false );
    assert.equal( record.sourcePacketId, source.id );
    assert.equal( record.outputPacketId, expectedOutputId );
    assert.equal( output.id, expectedOutputId );
    assert.equal( output.terminalId, source.terminalId );
    assertNear( output.sourceEmittedAt, source.emittedAt );
    assertNear( output.transformedAt, arrival, 2e-8 );
    assertNear( output.parkedAt, arrival, 2e-8 );
    assertVectorNear( output.position, diagnostics.routerRootPoint );
    assertImmutableOneToOneRecord( record, output );
    assert.equal(
        fixture.layer.group.userData.routedLight.activePackets.some(
            ( packet ) => packet.id === source.id
                || packet.id === expectedOutputId
        ),
        false,
        'neither the consumed source nor parked D2 output may remain routed'
    );
    assertLegacyC4cIdle( fixture );
} );

test( 'D2 output remains parked through time and a live router-tier change', () => {
    const fixture = createFixture( { packetFrequency: 0.01 } );
    fixture.layer.update( 0, fixture.form );
    const source = fixture.layer.group.userData.routedLight.activePackets[0];
    const boundary = routeBoundary( createRoute( fixture, source.terminalId ) );
    const arrival = source.emittedAt
        + boundary.distance / fixture.form.packetSpeed;
    fixture.layer.update( arrival + 0.000001, fixture.form );

    const beforeResources = getJunctionResources( fixture );
    const beforeDiagnostics = structuredClone( beforeResources.diagnostics );
    const beforeLedger = structuredClone( beforeResources.ledger );
    const beforeOutput = beforeResources.diagnostics.parkedOutputs[0];
    const beforePosition = beforeOutput.position.slice();
    const initialRouter = fixture.layer.getInternalRouterTreeResources();
    assert.equal( initialRouter.descriptor.maximumTier, 3 );

    fixture.layer.update( arrival + 0.25, fixture.form );
    let diagnostics = getJunctionResources( fixture ).diagnostics;
    assert.deepEqual( diagnostics.parkedOutputs[0].position, beforePosition );
    assert.equal( diagnostics.assignedRouteCount, 0 );
    assert.equal( fixture.layer.group.userData.routedLight
        .transducedOutputPacketCount, 0 );
    assertLegacyC4cIdle( fixture );

    fixture.layer.setInternalRouterTiers( 4 );
    const tierFour = fixture.layer.getInternalRouterTreeResources();
    const afterResources = getJunctionResources( fixture );
    diagnostics = afterResources.diagnostics;
    assert.equal( tierFour.descriptor.maximumTier, 4 );
    assertVectorNear( tierFour.descriptor.seedPoint, beforePosition );
    assert.deepEqual( afterResources.ledger, beforeLedger );
    assert.deepEqual( diagnostics, beforeDiagnostics );
    assert.deepEqual( diagnostics.parkedOutputs[0].position, beforePosition );
    assert.equal( tierFour.diagnostics.packetConnected, true );
    assert.equal( tierFour.diagnostics.junctionImplemented, true );
    assert.equal( tierFour.diagnostics.transportImplemented, false );
    assertLegacyC4cIdle( fixture );
} );

test( 'D2 conserves default and 11 Hz traffic independently of update cadence', () => {
    for ( const packetFrequency of [ 0.2, 11 ] )
    {
        const parameters = { packetFrequency, packetSpeed: 0.5 };
        const fine = createMatureFixture( parameters );
        const coarse = createMatureFixture( parameters );
        const finalElapsed = packetFrequency === 11 ? 45 : 30;
        fine.layer.update( 0, fine.form );
        for ( let step = 1; step <= finalElapsed * 10; step += 1 )
        {
            fine.layer.update( step / 10, fine.form );
            assertD2Conserved( getJunctionResources( fine ).diagnostics );
        }
        coarse.layer.update( 0, coarse.form );
        coarse.layer.update( finalElapsed, coarse.form );

        const fineDiagnostics = getJunctionResources( fine ).diagnostics;
        const coarseDiagnostics = getJunctionResources( coarse ).diagnostics;
        const fineTransport = fine.layer.group.userData.routedLight;
        const coarseTransport = coarse.layer.group.userData.routedLight;
        assertD2Identity( fineDiagnostics );
        assertD2Identity( coarseDiagnostics );
        assertD2Conserved( fineDiagnostics );
        assertD2Conserved( coarseDiagnostics );
        assert.ok( fineDiagnostics.outputCount > 0 );
        if ( packetFrequency === 11 )
        {
            assert.ok(
                fineDiagnostics.outputCount > 100,
                'maximum traffic must exercise sustained junction congestion'
            );
        }
        assert.equal( fineDiagnostics.auditTruncated, false );
        assert.equal( coarseDiagnostics.auditTruncated, false );
        assert.ok( fineDiagnostics.entryRecords.length
            <= fineDiagnostics.auditCapacity );
        assert.ok( fineDiagnostics.transductionRecords.length
            <= fineDiagnostics.auditCapacity );
        assert.ok( fineDiagnostics.parkedOutputs.length
            <= fineDiagnostics.auditCapacity );
        assert.equal(
            new Set( fineDiagnostics.entryRecords.map(
                ( record ) => record.sourcePacketId
            ) ).size,
            fineDiagnostics.entryRecords.length
        );
        assert.equal(
            new Set( fineDiagnostics.transductionRecords.map(
                ( record ) => record.outputPacketId
            ) ).size,
            fineDiagnostics.transductionRecords.length
        );
        for ( let index = 0;
            index < fineDiagnostics.transductionRecords.length;
            index += 1 )
        {
            assertImmutableOneToOneRecord(
                fineDiagnostics.transductionRecords[index],
                fineDiagnostics.parkedOutputs[index]
            );
        }

        assert.equal( coarseTransport.emittedPacketCount,
            fineTransport.emittedPacketCount );
        assert.equal( coarseDiagnostics.entryCount,
            fineDiagnostics.entryCount );
        assert.equal( coarseDiagnostics.consumptionCount,
            fineDiagnostics.consumptionCount );
        assert.equal( coarseDiagnostics.outputCount,
            fineDiagnostics.outputCount );
        assert.equal( coarseDiagnostics.parkedOutputCount,
            fineDiagnostics.parkedOutputCount );
        assert.deepEqual(
            sortRecords( coarseDiagnostics.entryRecords ),
            sortRecords( fineDiagnostics.entryRecords )
        );
        assert.deepEqual(
            sortRecords( coarseDiagnostics.transductionRecords ),
            sortRecords( fineDiagnostics.transductionRecords )
        );
        assert.deepEqual(
            sortRecords( coarseDiagnostics.parkedOutputs ),
            sortRecords( fineDiagnostics.parkedOutputs )
        );
        const finePackets = sortPackets( fineTransport.activePackets );
        const coarsePackets = sortPackets( coarseTransport.activePackets );
        assert.deepEqual(
            coarsePackets.map( ( packet ) => packet.id ),
            finePackets.map( ( packet ) => packet.id )
        );
        for ( let index = 0; index < finePackets.length; index += 1 )
        {
            assert.equal( coarsePackets[index].kind, 'source' );
            assert.equal( finePackets[index].kind, 'source' );
            assertNear(
                coarsePackets[index].headDistance,
                finePackets[index].headDistance,
                2e-8
            );
        }
        assert.equal( fineTransport.transducedOutputPacketCount, 0 );
        assert.equal( coarseTransport.transducedOutputPacketCount, 0 );
        assertLegacyC4cIdle( fine );
        assertLegacyC4cIdle( coarse );
    }
} );

test( 'opting into D2 preserves accepted Tree, C1, D1 and upstream packet state', () => {
    const active = createFixture();
    const control = createFixture( { internalRouterJunctionEnabled: false } );
    active.layer.setGrowthProgress( matureProgress( active.hierarchy ) );
    control.layer.setGrowthProgress( matureProgress( control.hierarchy ) );

    const acceptedObjects = [
        'monumental trunk',
        'meaning -> operations',
        'routed information core',
        'trunk interior carrier skeleton'
    ];
    for ( const name of acceptedObjects )
    {
        const actual = active.layer.group.getObjectByName( name );
        const expected = control.layer.group.getObjectByName( name );
        assert.ok( actual, `D2 ${name} must exist` );
        assert.ok( expected, `control ${name} must exist` );
        assertByteEquivalent(
            actual.geometry.getAttribute( 'position' ).array,
            expected.geometry.getAttribute( 'position' ).array,
            `D2 must not change ${name} positions`
        );
        assertByteEquivalent(
            actual.geometry.index.array,
            expected.geometry.index.array,
            `D2 must not change ${name} topology`
        );
    }
    const activeRouter = active.layer.getInternalRouterTreeResources();
    const controlRouter = control.layer.getInternalRouterTreeResources();
    assertByteEquivalent(
        activeRouter.geometry.getAttribute( 'position' ).array,
        controlRouter.geometry.getAttribute( 'position' ).array,
        'D2 must not move D1 router geometry'
    );
    assertByteEquivalent(
        activeRouter.geometry.index.array,
        controlRouter.geometry.index.array,
        'D2 must not change D1 router topology'
    );
    assert.equal( control.layer.getInternalRouterJunctionResources().enabled,
        false );
    assert.equal( controlRouter.diagnostics.packetConnected, false );
    assert.equal( controlRouter.diagnostics.junctionImplemented, false );
    assert.equal( controlRouter.diagnostics.transportImplemented, false );

    for ( const elapsed of [ 0, 0.01 ] )
    {
        active.layer.update( elapsed, active.form );
        control.layer.update( elapsed, control.form );
        assert.deepEqual(
            active.layer.group.userData.routedLight,
            control.layer.group.userData.routedLight,
            `D2 must preserve upstream packets before the boundary at ${elapsed}s`
        );
    }
    const activeDiagnostics = getJunctionResources( active ).diagnostics;
    assert.equal( activeDiagnostics.entryCount, 0 );
    assertD2Conserved( activeDiagnostics );
    assertLegacyC4cIdle( active );
} );

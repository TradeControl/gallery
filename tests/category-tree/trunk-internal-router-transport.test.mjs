import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as THREE from 'three';
import {
    createHierarchy,
    representativeHierarchy,
    unfoldingHierarchy
} from '../../src/category-tree/tree/hierarchy.js';
import { createUnfoldingLayout } from '../../src/category-tree/tree/layout.js';
import {
    createEngineeredTreeLayer,
    createInformationRoute
} from '../../src/category-tree/tree/engineered-tree-layer.js';
import {
    internalRouterSeedSite
} from '../../src/category-tree/tree/internal-router-tree.js';
import {
    createInternalRouterRouteEpoch,
    createInternalRouterTransport,
    internalRouterTransportCandidateId
} from '../../src/category-tree/tree/internal-router-transport.js';

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
        internalRouterTiers: 3,
        packetFrequency: 0.2,
        packetSpeed: 1.55,
        internalRouterJunctionEnabled: true,
        internalRouterTransportEnabled: true,
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

function boundaryFor( fixture, terminalId = routedTerminalId )
{
    const route = createInformationRoute(
        fixture.hierarchy,
        fixture.positions,
        terminalId,
        fixture.form.asymmetry
    );
    const segment = route.byChildId.get( internalRouterSeedSite.childId );
    assert.ok( segment );
    return {
        point: segment.curve.getPointAt( internalRouterSeedSite.localProgress ),
        distance: THREE.MathUtils.lerp(
            segment.parentDistance,
            segment.childDistance,
            internalRouterSeedSite.localProgress
        )
    };
}

function assertNear( actual, expected, tolerance = 2e-7, message = '' )
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

function assertConserved( diagnostics )
{
    assert.equal( diagnostics.aggregation, false );
    assert.equal( diagnostics.conservation.handoffBalance, 0 );
    assert.equal( diagnostics.conservation.lifecycleBalance, 0 );
    assert.equal( diagnostics.conservation.produced,
        diagnostics.dispatchCount + diagnostics.pendingAtRootCount );
    assert.equal( diagnostics.dispatchCount,
        diagnostics.activePacketCount + diagnostics.arrivalCount );
    assert.equal( diagnostics.conservation.retainedOutputIdsUnique, true );
}

function sortRecords( records )
{
    return records.slice().sort( ( left, right ) =>
        left.outputPacketId.localeCompare( right.outputPacketId )
    );
}

function transportState( fixture )
{
    const resources = fixture.layer.getInternalRouterTransportResources();
    assert.equal( resources.diagnostics,
        fixture.layer.group.userData.internalRouterTransport );
    return resources;
}

test( 'the Tree study opts into one independent D3 transport diagnostic', () => {
    const mainSource = readFileSync(
        new URL( '../../src/category-tree/tree/main.js', import.meta.url ),
        'utf8'
    );
    const htmlSource = readFileSync(
        new URL( '../../src/category-tree/tree/index.html', import.meta.url ),
        'utf8'
    );
    assert.match( mainSource, /internalRouterTransportEnabled:\s*true/ );
    assert.match( mainSource,
        /setInternalRouterTransportDiagnosticVisible\(\s*inspectingTransport\s*\)/ );
    assert.match( htmlSource,
        /id="inspect-router-transport"[\s\S]*?data-view="transport"/ );
    assert.match( htmlSource, /id="internal-router-transport-activity"/ );
} );

test( 'D3 dispatches the same D2 gold identity down exactly one frozen seed-first route', () => {
    const fixture = createFixture( { packetFrequency: 0.01 } );
    fixture.layer.update( 0, fixture.form );
    const source = fixture.layer.group.userData.routedLight.activePackets[0];
    const boundary = boundaryFor( fixture, source.terminalId );
    const arrival = source.emittedAt + boundary.distance / fixture.form.packetSpeed;
    fixture.layer.update( arrival, fixture.form );

    const junction = fixture.layer.getInternalRouterJunctionResources();
    const router = fixture.layer.getInternalRouterTreeResources();
    const resources = transportState( fixture );
    const diagnostics = resources.diagnostics;
    assert.equal( diagnostics.candidateId, internalRouterTransportCandidateId );
    assert.equal( diagnostics.dispatchCount, 1 );
    assert.equal( diagnostics.activePacketCount, 1 );
    assert.equal( diagnostics.arrivalCount, 0 );
    assert.equal( diagnostics.pendingAtRootCount, 0 );
    assertConserved( diagnostics );

    const output = junction.ledger.parkedOutputs[0];
    const dispatch = diagnostics.dispatchRecords[0];
    const packet = diagnostics.activePackets[0];
    assert.equal( packet.id, output.id );
    assert.equal( dispatch.outputPacketId, output.id );
    assert.equal( packet.sourcePacketId, output.sourcePacketId );
    assert.equal( dispatch.provenance, output.provenance );
    assert.equal( packet.provenance, output.provenance );
    assert.ok( Object.isFrozen( dispatch ) );
    assert.ok( Object.isFrozen( dispatch.routeAssignment ) );
    assert.ok( Object.isFrozen( dispatch.routeAssignment.edgeIds ) );
    assert.equal( dispatch.routeAssignment.edgeIds.length,
        router.descriptor.maximumTier );
    assert.equal( dispatch.routeAssignment.nodeIds[0], 'd1-router-seed' );
    assert.equal( new Set( dispatch.routeAssignment.edgeIds ).size,
        dispatch.routeAssignment.edgeIds.length );
    assertVectorNear( packet.position, boundary.point );
    assert.equal( junction.diagnostics.parkedOutputCount, 0 );
    assert.equal( junction.diagnostics.releasedOutputCount, 1 );
    assert.equal( junction.diagnostics.assignedRouteCount, 1 );
    assert.equal( junction.diagnostics.transportImplemented, true );

    const repeated = createInternalRouterTransport();
    const repeatedDispatch = repeated.dispatch(
        output,
        router.descriptor,
        output.transformedAt,
        fixture.form.packetSpeed,
        resources.diagnostics.resourceRevision
    );
    assert.equal( repeatedDispatch.routeAssignment.routeIndex,
        dispatch.routeAssignment.routeIndex );
    assert.throws( () => repeated.dispatch(
        output,
        router.descriptor,
        output.transformedAt,
        fixture.form.packetSpeed,
        resources.diagnostics.resourceRevision
    ), /dispatched twice/ );

    fixture.layer.setInternalRouterJunctionDiagnosticVisible( true );
    fixture.layer.setInternalRouterTransportDiagnosticVisible( true );
    fixture.layer.update( arrival, fixture.form );
    const visible = transportState( fixture );
    assert.equal( visible.guide.visible, true );
    assert.equal( visible.packetMesh.visible, true );
    assert.equal( visible.packetMesh.count, 1 );
    assert.equal( visible.guide.material.depthTest, true );
    assert.equal( visible.packetMesh.material.depthTest, true );
    assert.equal( visible.packetMesh.material.depthWrite, true );
    assert.ok( visible.packetCapacity >= visible.transport.activePacketCount );
    assert.equal( visible.diagnostics.visualOverflowCount, 0 );
    assert.equal( junction.outputMesh.visible, true );
    assert.equal( junction.outputMesh.material.isShaderMaterial, true );
    assert.equal( junction.ingressMesh.material.isShaderMaterial, true );
    assert.equal( junction.ingressTrace.material.isShaderMaterial, true );
    assert.equal( junction.outputMesh.material.userData.deformationFieldId,
        'engineered-tree-shared-sway-v1' );
    assert.equal( junction.outputMesh.material.userData.deformationFieldId,
        visible.packetMesh.material.userData.deformationFieldId );
    const outputOffset = junction.outputMesh.material.uniforms
        .diagnosticOffset.value;
    const packetMatrix = new THREE.Matrix4();
    visible.packetMesh.getMatrixAt( 0, packetMatrix );
    const matrixPosition = new THREE.Vector3().setFromMatrixPosition(
        packetMatrix
    );
    assertVectorNear( matrixPosition, visible.transport.activePackets[0].position );
    assertVectorNear( outputOffset, boundary.point );
    assertVectorNear( matrixPosition, outputOffset );
    assert.equal( router.mesh.visible, false,
        'D3 uses a centreline guide rather than hiding packets inside D1 tubes' );
} );

test( 'D3 keeps the live D2 ingress attached to the same deformation field', () => {
    const fixture = createFixture( { packetFrequency: 0.01 } );
    fixture.layer.setInternalRouterJunctionDiagnosticVisible( true );
    fixture.layer.setInternalRouterTransportDiagnosticVisible( true );
    fixture.layer.update( 0, fixture.form );
    const source = fixture.layer.group.userData.routedLight.activePackets[0];
    const boundary = boundaryFor( fixture, source.terminalId );
    const arrival = source.emittedAt + boundary.distance / fixture.form.packetSpeed;
    const approach = arrival - 0.2;
    fixture.layer.update( approach, fixture.form );

    const junction = fixture.layer.getInternalRouterJunctionResources();
    const transport = transportState( fixture );
    assert.equal( junction.ingressMesh.visible, true );
    assert.equal( junction.ingressTrace.visible, true );
    assert.equal( junction.ingressTrace.geometry.drawRange.count, 17 );
    assert.equal( junction.ingressMesh.material.uniforms.treeTime.value, approach );
    assert.equal( junction.ingressTrace.material.uniforms.treeTime.value, approach );
    assert.equal( junction.ingressMesh.material.uniforms.treeResponse.value,
        fixture.form.structuralResponse ?? 0.22 );
    assert.equal( junction.ingressMesh.material.userData.deformationFieldId,
        'engineered-tree-shared-sway-v1' );
    assert.equal( junction.ingressTrace.material.userData.deformationFieldId,
        'engineered-tree-shared-sway-v1' );
    assert.equal( junction.ingressMesh.material.userData.deformationFieldId,
        transport.packetMesh.material.userData.deformationFieldId );
    assert.equal( junction.ingressTrace.material.userData.deformationFieldId,
        transport.guide.material.userData.deformationFieldId );
} );

test( 'D3 speed changes re-anchor motion without a jump', () => {
    const fixture = createFixture( {
        packetFrequency: 0.01,
        packetSpeed: 0.5
    } );
    fixture.layer.update( 0, fixture.form );
    const source = fixture.layer.group.userData.routedLight.activePackets[0];
    const boundary = boundaryFor( fixture, source.terminalId );
    const arrival = source.emittedAt + boundary.distance / fixture.form.packetSpeed;
    fixture.layer.update( arrival + 0.4, fixture.form );
    const before = transportState( fixture ).diagnostics.activePackets[0];
    assertNear( before.headDistance, 0.2 );

    fixture.form.packetSpeed = 3;
    fixture.layer.update( arrival + 0.4, fixture.form );
    const anchored = transportState( fixture ).diagnostics.activePackets[0];
    assert.equal( anchored.id, before.id );
    assert.equal( anchored.routeAssignment.id, before.routeAssignment.id );
    assertNear( anchored.headDistance, before.headDistance );
    assertVectorNear( anchored.position, before.position, 2e-7 );

    fixture.layer.update( arrival + 0.5, fixture.form );
    const advanced = transportState( fixture ).diagnostics.activePackets[0];
    assertNear( advanced.headDistance, before.headDistance + 0.3 );
    assertConserved( transportState( fixture ).diagnostics );
} );

test( 'D3 conserves default and 11 Hz traffic independently of update cadence', () => {
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
            assertConserved( transportState( fine ).diagnostics );
        }
        coarse.layer.update( 0, coarse.form );
        coarse.layer.update( finalElapsed, coarse.form );

        const fineState = transportState( fine ).diagnostics;
        const coarseState = transportState( coarse ).diagnostics;
        assertConserved( fineState );
        assertConserved( coarseState );
        assert.ok( fineState.dispatchCount > 0 );
        if ( packetFrequency === 11 )
        {
            assert.ok( fineState.dispatchCount > 100 );
            assert.ok( fineState.maximumConcurrentPacketCount > 20 );
            const activeRouteOccupancy = new Map();
            for ( const packet of fineState.activePackets )
            {
                const routeId = packet.routeAssignment.id;
                activeRouteOccupancy.set(
                    routeId,
                    ( activeRouteOccupancy.get( routeId ) ?? 0 ) + 1
                );
            }
            assert.ok( Math.max( ...activeRouteOccupancy.values() ) > 1,
                'high traffic must exercise independent packets on one route' );
            assert.ok( fineState.currentSharedRouteCount > 0 );
            assert.ok( fineState.currentSelectedRouteCount
                <= fineState.currentRouteCapacity );
            assert.equal( new Set( fineState.activePackets.map(
                ( packet ) => packet.id
            ) ).size, fineState.activePacketCount );
        }
        assert.equal( coarseState.dispatchCount, fineState.dispatchCount );
        assert.equal( coarseState.completionCount, fineState.completionCount );
        assert.equal( coarseState.maximumConcurrentPacketCount,
            fineState.maximumConcurrentPacketCount,
            'analytic peak concurrency must not depend on render cadence' );
        assert.deepEqual(
            sortRecords( coarseState.dispatchRecords ),
            sortRecords( fineState.dispatchRecords )
        );
        assert.deepEqual(
            sortRecords( coarseState.completionRecords ),
            sortRecords( fineState.completionRecords )
        );
        const finePackets = sortRecords( fineState.activePackets );
        const coarsePackets = sortRecords( coarseState.activePackets );
        assert.deepEqual(
            coarsePackets.map( ( packet ) => packet.id ),
            finePackets.map( ( packet ) => packet.id )
        );
        for ( let index = 0; index < finePackets.length; index += 1 )
        {
            assert.equal( coarsePackets[index].routeAssignment.id,
                finePackets[index].routeAssignment.id );
            assertNear( coarsePackets[index].headDistance,
                finePackets[index].headDistance );
            assertVectorNear( coarsePackets[index].position,
                finePackets[index].position, 2e-6 );
        }
        assert.equal( fineState.visualOverflowCount, 0 );
        assert.equal( coarseState.visualOverflowCount, 0 );
    }
} );

test( 'D3 retains in-flight route epochs across a live tier change', () => {
    const fixture = createMatureFixture( {
        packetFrequency: 11,
        packetSpeed: 0.5,
        internalRouterTiers: 3
    } );
    fixture.layer.update( 0, fixture.form );
    const firstSource = fixture.layer.group.userData.routedLight.activePackets[0];
    const boundary = boundaryFor( fixture, firstSource.terminalId );
    const arrival = firstSource.emittedAt
        + boundary.distance / fixture.form.packetSpeed;
    fixture.layer.update( arrival, fixture.form );
    const before = transportState( fixture ).diagnostics;
    assert.ok( before.activePacketCount > 0 );
    const first = before.activePackets.find( ( packet ) =>
        packet.sourcePacketId === firstSource.id
    );
    assert.ok( first );
    assert.equal( first.routeAssignment.maximumTier, 3 );

    fixture.layer.setInternalRouterTiers( 6 );
    fixture.form.internalRouterTiers = 6;
    fixture.layer.update( arrival, fixture.form );
    const changed = transportState( fixture ).diagnostics;
    const retained = changed.activePackets.find( ( packet ) =>
        packet.id === first.id
    );
    assert.ok( retained );
    assert.equal( retained.routeAssignment.id, first.routeAssignment.id );
    assertNear( retained.headDistance, first.headDistance );
    assertVectorNear( retained.position, first.position, 2e-7 );
    assert.equal( changed.currentMaximumTier, 6 );
    assert.equal( changed.staleEpochActiveCount, before.activePacketCount );
    assertConserved( changed );

    fixture.layer.update( arrival + 1, fixture.form );
    const mixed = transportState( fixture ).diagnostics;
    assert.ok( mixed.activePackets.some( ( packet ) =>
        packet.routeAssignment.maximumTier === 3 ) );
    assert.ok( mixed.activePackets.some( ( packet ) =>
        packet.routeAssignment.maximumTier === 6 ) );
    assert.ok( mixed.staleEpochActiveCount > 0 );
    assert.equal( transportState( fixture ).guide.geometry.userData
        .internalRouterTransportGuide.maximumTier, 6 );
    assertConserved( mixed );
} );

test( 'D3 bounds lifetime audit indexes and reuses deterministic tier epochs', () => {
    const fixture = createFixture( { packetFrequency: 0.01 } );
    fixture.layer.update( 0, fixture.form );
    const source = fixture.layer.group.userData.routedLight.activePackets[0];
    const boundary = boundaryFor( fixture, source.terminalId );
    const arrival = source.emittedAt + boundary.distance / fixture.form.packetSpeed;
    fixture.layer.update( arrival, fixture.form );
    const output = fixture.layer.getInternalRouterJunctionResources()
        .ledger.parkedOutputs[0];
    const tierThree = fixture.layer.getInternalRouterTreeResources().descriptor;
    const tierThreeEpoch = createInternalRouterRouteEpoch( tierThree );
    fixture.layer.setInternalRouterTiers( 6 );
    const tierSix = fixture.layer.getInternalRouterTreeResources().descriptor;
    fixture.layer.setInternalRouterTiers( 3 );
    const tierThreeAgain = fixture.layer.getInternalRouterTreeResources().descriptor;
    assert.notEqual( createInternalRouterRouteEpoch( tierSix ), tierThreeEpoch );
    assert.equal( createInternalRouterRouteEpoch( tierThreeAgain ), tierThreeEpoch );

    const capacity = 8;
    const transport = createInternalRouterTransport( { capacity } );
    const emitted = [];
    for ( let index = 0; index < capacity * 3; index += 1 )
    {
        const candidate = Object.freeze( {
            ...output,
            id: `${output.id}::bounded-${index}`
        } );
        emitted.push( candidate );
        transport.dispatch( candidate, tierThreeAgain, index * 0.01, 0.5, index );
    }
    transport.advance( 0, 0.23, 0.5 );
    const snapshot = transport.snapshot();
    assert.equal( snapshot.dispatchCount, capacity * 3 );
    assert.ok( snapshot.retainedDispatchRecordCount <= capacity );
    assert.ok( snapshot.retainedDuplicateGuardCount <= capacity );
    assert.ok( snapshot.retainedRouteCount <= tierThreeAgain.routeCount );
    assert.throws( () => transport.dispatch(
        emitted[0],
        tierThreeAgain,
        1,
        0.5,
        1
    ), /dispatched twice/ );

    const engineSource = readFileSync(
        new URL( '../../src/category-tree/tree/engineered-tree-layer.js', import.meta.url ),
        'utf8'
    );
    assert.match( engineSource,
        /internalRouterTransportPacketMesh\.dispose\(\)/ );
    assert.match( engineSource,
        /descendant\.isInstancedMesh\s*\)\s*descendant\.dispose\(\)/ );
} );

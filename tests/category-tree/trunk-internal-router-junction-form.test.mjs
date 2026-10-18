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
    createInformationRoute,
    createTrunkEnvelopeDescriptor,
    getInformationPacketRadius,
    informationPacketVisualProfile
} from '../../src/category-tree/tree/engineered-tree-layer.js';
import {
    createInternalRouterJunctionFormGeometry,
    internalRouterJunctionFormCandidateId,
    internalRouterJunctionFormCircumferenceRange,
    internalRouterJunctionFormStyle,
    normaliseInternalRouterJunctionFormCircumference,
    setInternalRouterJunctionFormManifestations
} from '../../src/category-tree/tree/internal-router-junction-form.js';
import { internalRouterSeedSite } from '../../src/category-tree/tree/internal-router-tree.js';
import {
    createInternalRouterPacketTrailGeometry
} from '../../src/category-tree/tree/trunk-visibility-renderer.js';

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
        internalRouterTiers: 4,
        packetFrequency: 0.2,
        packetSpeed: 1.55,
        internalRouterJunctionEnabled: true,
        internalRouterTransportEnabled: true,
        internalRouterPresentationEnabled: false,
        internalRouterJunctionFormEnabled: false,
        internalRouterJunctionFormCircumference: 0.55,
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
    const trunkEnvelope = createTrunkEnvelopeDescriptor(
        hierarchy,
        positions,
        {
            asymmetry: form.asymmetry,
            conduitWeight: form.conduitWeight
        }
    );
    const layer = createEngineeredTreeLayer( hierarchy, positions, form );
    return { form, hierarchy, positions, trunkEnvelope, layer };
}

function mature( fixture )
{
    fixture.layer.setGrowthProgress( new Map( fixture.hierarchy.nodes
        .filter( ( node ) => node.latent && node.growthEligible !== false )
        .map( ( node ) => [ node.id, 1 ] ) ) );
    return fixture;
}

function boundaryFor( fixture, terminalId )
{
    const route = createInformationRoute(
        fixture.hierarchy,
        fixture.positions,
        terminalId,
        fixture.form.asymmetry
    );
    const segment = route.byChildId.get( internalRouterSeedSite.childId );
    return {
        distance: THREE.MathUtils.lerp(
            segment.parentDistance,
            segment.childDistance,
            internalRouterSeedSite.localProgress
        ),
        point: segment.curve.getPointAt(
            internalRouterSeedSite.localProgress
        ).toArray()
    };
}

function assertVectorNear( actual, expected, tolerance = 2e-6, message = '' )
{
    assert.equal( actual.length, expected.length, message );
    for ( let index = 0; index < actual.length; index += 1 )
    {
        assert.ok(
            Math.abs( actual[index] - expected[index] ) <= tolerance,
            `${message} coordinate ${index}: ${actual[index]} != ${expected[index]}`
        );
    }
}

function copyGeometry( object )
{
    return {
        uuid: object.geometry.uuid,
        position: object.geometry.getAttribute( 'position' ).array.slice(),
        index: object.geometry.index?.array.slice() ?? null
    };
}

function assertGeometryUnchanged( actual, expected, message )
{
    assert.equal( actual.geometry.uuid, expected.uuid, `${message} UUID` );
    assert.deepEqual(
        actual.geometry.getAttribute( 'position' ).array,
        expected.position,
        `${message} positions`
    );
    assert.deepEqual(
        actual.geometry.index?.array ?? null,
        expected.index,
        `${message} topology`
    );
}

function transportContract( layer )
{
    const state = layer.getInternalRouterTransportResources().diagnostics;
    return structuredClone( {
        dispatchCount: state.dispatchCount,
        completionCount: state.completionCount,
        activePacketCount: state.activePacketCount,
        maximumConcurrentPacketCount: state.maximumConcurrentPacketCount,
        visualOverflowCount: state.visualOverflowCount,
        conservation: state.conservation,
        dispatchRecords: state.dispatchRecords,
        completionRecords: state.completionRecords,
        activePackets: state.activePackets
    } );
}

function junctionContract( layer )
{
    const state = layer.getInternalRouterJunctionResources().diagnostics;
    return structuredClone( {
        entryCount: state.entryCount,
        consumptionCount: state.consumptionCount,
        outputCount: state.outputCount,
        entryRecords: state.entryRecords,
        transductionRecords: state.transductionRecords,
        parkedOutputs: state.parkedOutputs,
        conservation: state.conservation
    } );
}

function presentationContract( layer )
{
    const resources = layer.getInternalRouterPresentationResources();
    return structuredClone( {
        activePacketIds: resources.activePacketIds,
        packetTrails: resources.packetTrails,
        trailSegmentCount: resources.trailSegmentCount,
        trailSampleCount: resources.trailSampleCount
    } );
}

test( 'the junction form is default-off and exactly contained at the D1/D2 seed', () => {
    const mainSource = readFileSync(
        new URL( '../../src/category-tree/tree/main.js', import.meta.url ),
        'utf8'
    );
    const htmlSource = readFileSync(
        new URL( '../../src/category-tree/tree/index.html', import.meta.url ),
        'utf8'
    );
    assert.match( mainSource,
        /internalRouterJunctionFormEnabled:\s*false/ );
    assert.match( htmlSource,
        /id="show-internal-router-junction-form" type="checkbox">/ );
    assert.match( htmlSource,
        /id="internal-router-junction-form-activity"/ );
    assert.match( mainSource,
        /internalRouterJunctionFormCircumference:\s*0\.55/ );
    assert.match( mainSource,
        /engineeredTree\.setInternalRouterJunctionFormCircumference/ );
    assert.match( mainSource,
        /internalRouterJunctionFormCircumference:\s*'junction-circumference'/ );
    assert.match( htmlSource,
        /id="junction-circumference" type="range" min="0\.20" max="1\.00" step="0\.01" value="0\.55"/ );
    assert.equal( internalRouterJunctionFormCandidateId,
        'c4d-d4-junction-knot-v1' );

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
            internalRouterTiers: 6
        }
    ];
    for ( const overrides of forms )
    {
        const fixture = createFixture( overrides );
        const router = fixture.layer.getInternalRouterTreeResources();
        const junction = fixture.layer.getInternalRouterJunctionResources();
        const resources = fixture.layer.getInternalRouterJunctionFormResources();
        const metadata = resources.geometry.userData
            .internalRouterJunctionForm;
        assert.equal( resources.enabled, false );
        assert.equal( resources.effectiveEnabled, false );
        assert.equal( resources.active, false );
        assert.equal( resources.manifestations.length, 0 );
        assert.equal( metadata.candidateId,
            internalRouterJunctionFormCandidateId );
        assertVectorNear( metadata.anchor, router.descriptor.seedPoint );
        assertVectorNear( metadata.anchor,
            junction.diagnostics.routerRootPoint );
        assertVectorNear( metadata.waistPoint, router.descriptor.seedPoint,
            1e-9 );
        assert.ok( metadata.waistToSeedDistance <= 1e-9 );
        assert.equal( metadata.seedSite.id, internalRouterSeedSite.id );
        assert.equal( metadata.objectSpace, true );
        assert.equal( metadata.cameraFacing, false );
        assert.equal( metadata.surfaceExcursion, false );
        assert.equal( metadata.appliedCircumferenceScale,
            internalRouterJunctionFormCircumferenceRange.defaultValue );
        assert.equal( metadata.scaleSemantic,
            'fraction-of-local-safe-trunk-circumference' );
        assert.equal( metadata.longitudinalEnvelopeSampled, true );
        assert.equal( metadata.physicalTrunkBreachCount, 0 );
        assert.ok( metadata.minimumTrunkWallClearance >= -1e-6 );
        assert.ok( metadata.minimumGrowthWallClearance >= -1e-6 );
        assert.ok( metadata.maximumRadialExtent
            + router.descriptor.nodes[0].actualRadius
            + router.descriptor.dimensions.wallMargin
            <= metadata.growthRadius + 1e-6 );
        assert.equal( metadata.vertexCount,
            ( internalRouterJunctionFormStyle.tubularSegments + 1 )
                * ( internalRouterJunctionFormStyle.radialSegments + 1 ) );
        assert.equal( metadata.triangleCount,
            internalRouterJunctionFormStyle.tubularSegments
                * internalRouterJunctionFormStyle.radialSegments * 2 );
    }
} );

test( 'the rune circumference sweeps monotonically to the audited trunk maximum', () => {
    assert.equal( normaliseInternalRouterJunctionFormCircumference( null ),
        internalRouterJunctionFormCircumferenceRange.defaultValue );
    assert.equal( normaliseInternalRouterJunctionFormCircumference( -2 ),
        internalRouterJunctionFormCircumferenceRange.minimum );
    assert.equal( normaliseInternalRouterJunctionFormCircumference( 4 ),
        internalRouterJunctionFormCircumferenceRange.maximum );

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
            internalRouterTiers: 6
        }
    ];
    for ( const overrides of forms )
    {
        const fixture = createFixture( overrides );
        const initial = fixture.layer.getInternalRouterJunctionFormResources();
        const initialMetadata = initial.geometry.userData
            .internalRouterJunctionForm;
        const seed = initialMetadata.waistPoint;
        const topology = {
            tubeRadius: initialMetadata.tubeRadius,
            longitudinalHalfSpan: initialMetadata.longitudinalHalfSpan,
            vertexCount: initialMetadata.vertexCount,
            triangleCount: initialMetadata.triangleCount
        };

        fixture.layer.setInternalRouterJunctionFormCircumference(
            internalRouterJunctionFormCircumferenceRange.minimum
        );
        const minimum = fixture.layer.getInternalRouterJunctionFormResources();
        const minimumMetadata = minimum.geometry.userData
            .internalRouterJunctionForm;
        fixture.layer.setInternalRouterJunctionFormCircumference(
            internalRouterJunctionFormCircumferenceRange.maximum
        );
        const maximum = fixture.layer.getInternalRouterJunctionFormResources();
        const maximumMetadata = maximum.geometry.userData
            .internalRouterJunctionForm;

        assert.ok( minimumMetadata.loopRadius
            < initialMetadata.loopRadius );
        assert.ok( initialMetadata.loopRadius
            < maximumMetadata.loopRadius );
        assert.ok( minimumMetadata.actualOuterRadius
            < initialMetadata.actualOuterRadius );
        assert.ok( initialMetadata.actualOuterRadius
            < maximumMetadata.actualOuterRadius );
        assert.equal( maximumMetadata.loopRadius,
            maximumMetadata.maximumSafeLoopRadius );
        assert.equal( maximumMetadata.appliedCircumferenceScale, 1 );
        assert.equal( maximumMetadata.physicalTrunkBreachCount, 0 );
        assert.ok( maximumMetadata.minimumTrunkWallClearance >= -1e-6 );
        assert.equal( maximumMetadata.longitudinalEnvelopeSampled, true );
        assert.ok( maximumMetadata.envelopeStationCount > 2 );
        assert.deepEqual( {
            tubeRadius: maximumMetadata.tubeRadius,
            longitudinalHalfSpan: maximumMetadata.longitudinalHalfSpan,
            vertexCount: maximumMetadata.vertexCount,
            triangleCount: maximumMetadata.triangleCount
        }, topology );
        assertVectorNear( minimumMetadata.waistPoint, seed, 1e-9 );
        assertVectorNear( maximumMetadata.waistPoint, seed, 1e-9 );
        assert.ok( maximumMetadata.waistToSeedDistance <= 1e-9 );
    }
} );

test( 'only genuine packets manifest cyan approach and provenance-linked gold departure', () => {
    const fixture = mature( createFixture( {
        packetFrequency: 0.01,
        internalRouterPresentationEnabled: true,
        internalRouterJunctionFormEnabled: true
    } ) );
    fixture.layer.update( 0, fixture.form );
    let resources = fixture.layer.getInternalRouterJunctionFormResources();
    assert.equal( resources.effectiveEnabled, true );
    assert.equal( resources.active, false );
    assert.equal( resources.maximumSignal, 0 );
    assert.equal( resources.manifestations.length, 0 );
    assert.equal( resources.diagnostics.productionVisible, false );

    const source = fixture.layer.group.userData.routedLight.activePackets[0];
    const boundary = boundaryFor( fixture, source.terminalId );
    const arrival = source.emittedAt
        + boundary.distance / fixture.form.packetSpeed;
    const approachRemaining =
        internalRouterJunctionFormStyle.approachDistance * 0.4;
    fixture.layer.update(
        arrival - approachRemaining / fixture.form.packetSpeed,
        fixture.form
    );
    resources = fixture.layer.getInternalRouterJunctionFormResources();
    assert.equal( resources.active, true );
    assert.ok( resources.maximumSignal
        > internalRouterJunctionFormStyle.discardThreshold );
    assert.ok( resources.manifestations.length > 0 );
    assert.ok( resources.manifestations.every( ( manifestation ) =>
        manifestation.kind === 'cyan-approach'
            && manifestation.outputPacketId === null
            && manifestation.occurredAt === null ) );
    assert.ok( resources.manifestations.some( ( manifestation ) =>
        manifestation.sourcePacketId === source.id ) );
    const liveSourceIds = new Set(
        fixture.layer.group.userData.routedLight.activePackets.map(
            ( packet ) => packet.id
        )
    );
    assert.ok( resources.manifestations.every( ( manifestation ) =>
        liveSourceIds.has( manifestation.sourcePacketId ) ) );
    const phase = resources.geometry.getAttribute( 'junctionPhase' );
    const signal = resources.geometry.getAttribute( 'packetSignal' );
    const approachWarmth = resources.geometry.getAttribute( 'packetWarmth' );
    for ( let index = 0; index < signal.count; index += 1 )
    {
        if ( phase.getX( index ) > 0.500001 )
        {
            assert.equal( signal.getX( index ), 0,
                'cyan approach may not illuminate the goldward half' );
        }
        if ( signal.getX( index )
            > internalRouterJunctionFormStyle.discardThreshold )
        {
            assert.equal( approachWarmth.getX( index ), 0,
                'cyan approach may not anticipate post-boundary gold' );
        }
    }

    fixture.layer.update( arrival + 1e-7, fixture.form );
    resources = fixture.layer.getInternalRouterJunctionFormResources();
    const junction = fixture.layer.getInternalRouterJunctionResources();
    const transport = fixture.layer.getInternalRouterTransportResources();
    assert.equal( junction.diagnostics.transductionRecords.length, 1 );
    const record = junction.diagnostics.transductionRecords[0];
    const gold = resources.manifestations.find( ( manifestation ) =>
        manifestation.kind === 'gold-departure'
            && manifestation.sourcePacketId === source.id
    );
    assert.ok( gold );
    assert.equal( gold.outputPacketId, record.outputPacketId );
    assert.equal( gold.occurredAt, record.outputAt );
    assert.equal( record.enteredAt, record.outputAt );
    assertVectorNear( record.boundaryPoint, boundary.point );
    assert.ok( transport.diagnostics.activePackets.some( ( packet ) =>
        packet.id === gold.outputPacketId
            && packet.sourcePacketId === gold.sourcePacketId ) );
    assert.deepEqual( resources.diagnostics.sourceColour,
        informationPacketVisualProfile.sourceColour );
    assert.equal( resources.diagnostics.outputColour,
        informationPacketVisualProfile.outputColour );
    assert.equal( resources.diagnostics.aggregation, false );
    assert.equal( record.provenanceCardinality, 1 );
    const warmth = resources.geometry.getAttribute( 'packetWarmth' );
    let cyanSignal = 0;
    let transitionSignal = 0;
    let goldSignal = 0;
    for ( let index = 0; index < signal.count; index += 1 )
    {
        const strength = signal.getX( index );
        const value = warmth.getX( index );
        if ( value <= 0.01 ) cyanSignal = Math.max( cyanSignal, strength );
        else if ( value >= 0.99 ) goldSignal = Math.max( goldSignal, strength );
        else transitionSignal = Math.max( transitionSignal, strength );
    }
    assert.ok( cyanSignal > 0 );
    assert.ok( transitionSignal > 0 );
    assert.ok( goldSignal > 0 );

    fixture.layer.update( arrival + 2, fixture.form );
    resources = fixture.layer.getInternalRouterJunctionFormResources();
    assert.equal( resources.active, false );
    assert.equal( resources.maximumSignal, 0 );
    assert.equal( resources.manifestations.length, 0 );
    assert.equal( resources.diagnostics.productionVisible, false );
    assert.equal( resources.diagnostics.persistentDisclosure, false );
    assert.ok( Array.from(
        resources.geometry.getAttribute( 'packetSignal' ).array
    ).every( ( value ) => value === 0 ) );
} );

test( 'the form toggle changes neither accepted Tree geometry nor D2-D4 state', () => {
    const fixture = mature( createFixture( {
        packetFrequency: 0.01,
        internalRouterPresentationEnabled: true,
        internalRouterJunctionFormEnabled: true
    } ) );
    fixture.layer.update( 0, fixture.form );
    const source = fixture.layer.group.userData.routedLight.activePackets[0];
    const boundary = boundaryFor( fixture, source.terminalId );
    const arrival = source.emittedAt
        + boundary.distance / fixture.form.packetSpeed;
    fixture.layer.update( arrival + 0.2, fixture.form );

    const acceptedNames = [
        'monumental trunk',
        'meaning -> operations',
        'routed information core',
        'trunk interior carrier skeleton'
    ];
    const accepted = new Map( acceptedNames.map( ( name ) => [
        name,
        copyGeometry( fixture.layer.group.getObjectByName( name ) )
    ] ) );
    const router = fixture.layer.getInternalRouterTreeResources();
    const routerGeometry = copyGeometry( router.mesh );
    const routerDescriptor = router.descriptor;
    const form = fixture.layer.getInternalRouterJunctionFormResources();
    const formGeometryUuid = form.geometry.uuid;
    const junction = junctionContract( fixture.layer );
    const transport = transportContract( fixture.layer );
    const presentation = presentationContract( fixture.layer );

    assert.equal( fixture.layer.setInternalRouterJunctionFormEnabled( false ),
        false );
    let disabled = fixture.layer.getInternalRouterJunctionFormResources();
    assert.equal( disabled.active, false );
    assert.equal( disabled.maximumSignal, 0 );
    assert.equal( disabled.manifestations.length, 0 );
    assert.equal( disabled.geometry.uuid, formGeometryUuid );
    assert.deepEqual( junctionContract( fixture.layer ), junction );
    assert.deepEqual( transportContract( fixture.layer ), transport );
    assert.deepEqual( presentationContract( fixture.layer ), presentation );

    assert.equal( fixture.layer.setInternalRouterJunctionFormEnabled( true ),
        true );
    const enabled = fixture.layer.getInternalRouterJunctionFormResources();
    assert.equal( enabled.active, true );
    assert.equal( enabled.geometry.uuid, formGeometryUuid );
    assert.deepEqual( junctionContract( fixture.layer ), junction );
    assert.deepEqual( transportContract( fixture.layer ), transport );
    assert.deepEqual( presentationContract( fixture.layer ), presentation );
    for ( const name of acceptedNames )
    {
        assertGeometryUnchanged(
            fixture.layer.group.getObjectByName( name ),
            accepted.get( name ),
            name
        );
    }
    assertGeometryUnchanged(
        fixture.layer.getInternalRouterTreeResources().mesh,
        routerGeometry,
        'D1 router'
    );
    assert.equal(
        fixture.layer.getInternalRouterTreeResources().descriptor,
        routerDescriptor
    );
} );

test( 'resizing only replaces the junction form and preserves the live event', () => {
    const fixture = mature( createFixture( {
        packetFrequency: 0.01,
        internalRouterPresentationEnabled: true,
        internalRouterJunctionFormEnabled: true
    } ) );
    fixture.layer.update( 0, fixture.form );
    const source = fixture.layer.group.userData.routedLight.activePackets[0];
    const boundary = boundaryFor( fixture, source.terminalId );
    const arrival = source.emittedAt
        + boundary.distance / fixture.form.packetSpeed;
    fixture.layer.update( arrival + 0.2, fixture.form );

    const acceptedNames = [
        'monumental trunk',
        'meaning -> operations',
        'routed information core',
        'trunk interior carrier skeleton'
    ];
    const accepted = new Map( acceptedNames.map( ( name ) => [
        name,
        copyGeometry( fixture.layer.group.getObjectByName( name ) )
    ] ) );
    const router = fixture.layer.getInternalRouterTreeResources();
    const routerGeometry = copyGeometry( router.mesh );
    const routerDescriptor = router.descriptor;
    const routerRevision = router.revision;
    const junction = junctionContract( fixture.layer );
    const transport = transportContract( fixture.layer );
    const presentation = presentationContract( fixture.layer );
    const before = fixture.layer.getInternalRouterJunctionFormResources();
    const beforeManifestations = structuredClone( before.manifestations );
    const originalDispose = before.geometry.dispose.bind( before.geometry );
    let disposed = false;
    before.geometry.dispose = () => {
        disposed = true;
        originalDispose();
    };

    assert.equal(
        fixture.layer.setInternalRouterJunctionFormCircumference( 1 ),
        1
    );
    const after = fixture.layer.getInternalRouterJunctionFormResources();
    assert.equal( disposed, true );
    assert.notEqual( after.geometry.uuid, before.geometry.uuid );
    assert.equal( after.revision, before.revision + 1 );
    assert.equal( after.circumference, 1 );
    assert.deepEqual( after.manifestations, beforeManifestations );
    assert.equal( after.active, true );
    assert.equal( after.geometry.userData.internalRouterJunctionForm
        .physicalTrunkBreachCount, 0 );
    assert.deepEqual( junctionContract( fixture.layer ), junction );
    assert.deepEqual( transportContract( fixture.layer ), transport );
    assert.deepEqual( presentationContract( fixture.layer ), presentation );
    assert.equal( fixture.layer.getInternalRouterTreeResources().revision,
        routerRevision );
    assert.equal( fixture.layer.getInternalRouterTreeResources().descriptor,
        routerDescriptor );
    for ( const name of acceptedNames )
    {
        assertGeometryUnchanged(
            fixture.layer.group.getObjectByName( name ),
            accepted.get( name ),
            name
        );
    }
    assertGeometryUnchanged(
        fixture.layer.getInternalRouterTreeResources().mesh,
        routerGeometry,
        'D1 router'
    );
} );

test( 'the junction form remains bounded and transport-conserving at 11 Hz', () => {
    const parameters = {
        packetFrequency: 11,
        packetSpeed: 0.5,
        internalRouterTiers: 4,
        internalRouterPresentationEnabled: true,
        internalRouterJunctionFormCircumference: 1
    };
    const enabled = mature( createFixture( {
        ...parameters,
        internalRouterJunctionFormEnabled: true
    } ) );
    const control = mature( createFixture( {
        ...parameters,
        internalRouterJunctionFormEnabled: false
    } ) );
    enabled.layer.update( 0, enabled.form );
    control.layer.update( 0, control.form );
    enabled.layer.update( 45, enabled.form );
    control.layer.update( 45, control.form );

    const enabledJunction = junctionContract( enabled.layer );
    const controlJunction = junctionContract( control.layer );
    const enabledTransport = transportContract( enabled.layer );
    const controlTransport = transportContract( control.layer );
    assert.deepEqual( enabledJunction, controlJunction );
    assert.deepEqual( enabledTransport, controlTransport );
    assert.deepEqual( presentationContract( enabled.layer ),
        presentationContract( control.layer ) );
    assert.ok( enabledTransport.dispatchCount > 100 );
    assert.ok( enabledTransport.maximumConcurrentPacketCount > 20 );
    assert.equal( enabledJunction.conservation.sourceBalance, 0 );
    assert.equal( enabledJunction.conservation.handoffBalance, 0 );
    assert.equal( enabledJunction.conservation.transportBalance, 0 );
    assert.equal( enabledTransport.conservation.handoffBalance, 0 );
    assert.equal( enabledTransport.conservation.lifecycleBalance, 0 );
    assert.equal( enabledTransport.visualOverflowCount, 0 );

    const resources = enabled.layer.getInternalRouterJunctionFormResources();
    assert.ok( resources.manifestations.length > 0 );
    assert.ok( resources.manifestations.length
        <= internalRouterJunctionFormStyle.maximumManifestations );
    assert.equal( resources.diagnostics.activeManifestationCount,
        resources.manifestations.length );
    assert.equal( new Set( resources.manifestations.map(
        ( manifestation ) => manifestation.id
    ) ).size, resources.manifestations.length );
    assert.equal( resources.diagnostics.manifestationOverflowCount, 0 );
    assert.equal( resources.diagnostics.activeDrawCalls, 0,
        'the unit fixture has not submitted the shared renderer draw' );
    assert.equal( resources.geometry.uuid,
        enabled.layer.getInternalRouterJunctionFormResources().geometry.uuid );

    const activeSourceIds = new Set(
        enabled.layer.group.userData.routedLight.activePackets.map(
            ( packet ) => packet.id
        )
    );
    const activeOutputIds = new Set(
        enabled.layer.getInternalRouterTransportResources().diagnostics
            .activePackets.map( ( packet ) => packet.id )
    );
    const recordByOutputId = new Map(
        enabled.layer.getInternalRouterJunctionResources().diagnostics
            .transductionRecords.map( ( record ) => [
                record.outputPacketId,
                record
            ] )
    );
    for ( const manifestation of resources.manifestations )
    {
        if ( manifestation.kind === 'cyan-approach' )
        {
            assert.ok( activeSourceIds.has( manifestation.sourcePacketId ) );
            assert.equal( manifestation.outputPacketId, null );
        }
        else
        {
            assert.equal( manifestation.kind, 'gold-departure' );
            assert.ok( activeOutputIds.has( manifestation.outputPacketId ) );
            const record = recordByOutputId.get(
                manifestation.outputPacketId
            );
            assert.ok( record );
            assert.equal( manifestation.sourcePacketId,
                record.sourcePacketId );
        }
    }
    assert.equal( resources.diagnostics.aggregation, false );
    assert.equal( resources.diagnostics.overlapPolicy,
        'per-vertex-maximum-no-semantic-aggregation' );
    assert.equal( resources.geometry.userData.internalRouterJunctionForm
        .appliedCircumferenceScale, 1 );
    assert.equal( resources.geometry.userData.internalRouterJunctionForm
        .physicalTrunkBreachCount, 0 );
    assert.ok( resources.geometry.userData.internalRouterJunctionForm
        .minimumTrunkWallClearance >= -1e-6 );
} );

test( 'the form shares D4 depth, deformation and colour without camera projection', () => {
    const fixture = createFixture();
    const router = fixture.layer.getInternalRouterTreeResources();
    const radius = getInformationPacketRadius( fixture.form.conduitWeight );
    const formGeometry = createInternalRouterJunctionFormGeometry(
        router.descriptor,
        radius,
        fixture.form.internalRouterJunctionFormCircumference,
        fixture.trunkEnvelope
    );
    const response = setInternalRouterJunctionFormManifestations(
        formGeometry,
        [ {
            id: 'proof-event',
            kind: 'gold-departure',
            headPhase: 0.62
        } ]
    );
    assert.equal( response.active, true );
    assert.deepEqual( response.activeManifestationIds, [ 'proof-event' ] );
    const merged = createInternalRouterPacketTrailGeometry(
        [],
        radius,
        formGeometry
    );
    assert.equal( merged.userData.internalRouterPresentation
        .junctionFormIncluded, true );
    assert.equal( merged.userData.internalRouterPresentation
        .junctionFormVertexCount,
    formGeometry.getAttribute( 'position' ).count );
    assert.equal( merged.userData.internalRouterPresentation
        .packetTrailVertexCount, 0 );
    assert.ok( merged.getAttribute( 'packetSignal' ) );
    assert.ok( merged.getAttribute( 'packetWarmth' ) );
    assert.ok( merged.getAttribute( 'junctionPhase' ) );
    merged.dispose();
    formGeometry.dispose();

    const source = readFileSync(
        new URL(
            '../../src/category-tree/tree/trunk-visibility-renderer.js',
            import.meta.url
        ),
        'utf8'
    );
    assert.match( source,
        /attribute float packetWarmth;[\s\S]*?varying float internalPacketWarmth/ );
    assert.match( source,
        /mix\([\s\S]*?sourceColour,[\s\S]*?outputColour,[\s\S]*?internalPacketWarmth/ );
    assert.match( source,
        /junctionFormResources\.active[\s\S]*?junctionFormResources\.geometry/ );
    assert.match( source,
        /shared-d4-depth-aware-subsurface-junction-knot/ );
    assert.match( source,
        /shellDepthPasses:\s*2[\s\S]*?nearestSignalDepthPasses:\s*1[\s\S]*?overlayPasses:\s*1/ );
    assert.match( source, /rearTransmissionFloor:\s*0/ );
    assert.match( source, /sharedPacketTrailDraw:\s*true/ );
    assert.match( source, /blending:\s*THREE\.NormalBlending/ );
    assert.doesNotMatch( source, /THREE\.GreaterDepth/ );
    assert.doesNotMatch( source, /new THREE\.Sprite|cameraPosition/ );
} );

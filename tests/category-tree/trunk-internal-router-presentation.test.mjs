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
    getInformationSignal,
    getInformationPacketRadius,
    informationPacketVisualProfile,
    internalRouterPresentationCandidateId
} from '../../src/category-tree/tree/engineered-tree-layer.js';
import {
    internalRouterSeedSite
} from '../../src/category-tree/tree/internal-router-tree.js';
import {
    trunkRuneCandidateIds
} from '../../src/category-tree/tree/trunk-rune-layer.js';
import {
    createInternalRouterPacketTrailGeometry,
    internalRouterPresentationStyle
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
        internalRouterTiers: 3,
        packetFrequency: 0.2,
        packetSpeed: 1.55,
        internalRouterJunctionEnabled: true,
        internalRouterTransportEnabled: true,
        internalRouterPresentationEnabled: true,
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
    return THREE.MathUtils.lerp(
        segment.parentDistance,
        segment.childDistance,
        internalRouterSeedSite.localProgress
    );
}

function transportContract( layer )
{
    const state = layer.getInternalRouterTransportResources().diagnostics;
    return {
        dispatchCount: state.dispatchCount,
        arrivalCount: state.arrivalCount,
        activePackets: state.activePackets.map( ( packet ) => ( {
            id: packet.id,
            sourcePacketId: packet.sourcePacketId,
            routeId: packet.routeAssignment.id,
            headDistance: packet.headDistance,
            position: packet.position
        } ) ),
        conservation: state.conservation
    };
}

test( 'the signed-off packet-only presentation is integral on load', () => {
    const mainSource = readFileSync(
        new URL( '../../src/category-tree/tree/main.js', import.meta.url ),
        'utf8'
    );
    const htmlSource = readFileSync(
        new URL( '../../src/category-tree/tree/index.html', import.meta.url ),
        'utf8'
    );
    const rendererSource = readFileSync(
        new URL(
            '../../src/category-tree/tree/trunk-visibility-renderer.js',
            import.meta.url
        ),
        'utf8'
    );
    assert.match( mainSource, /packetFrequency:\s*1/ );
    assert.match( mainSource, /internalRouterTiers:\s*4/ );
    assert.match( mainSource,
        /internalRouterPresentationEnabled:\s*true/ );
    assert.match( mainSource, /trunkRunesVisible:\s*false/ );
    assert.match( mainSource,
        /matureGrowth\s*=\s*growthCycle\.sample\(\s*Number\.MAX_SAFE_INTEGER/ );
    assert.match( mainSource, /let unfoldingActive\s*=\s*false/ );
    assert.match( mainSource,
        /setCameraView\(\s*cameraViews\.presentation\s*\)/ );
    assert.match( htmlSource,
        /id="packet-frequency"[^>]*max="11\.00"[^>]*value="1\.00"/ );
    assert.match( htmlSource,
        /id="internal-router-tiers"[^>]*min="3"[^>]*max="6"[^>]*value="4"/ );
    assert.doesNotMatch( htmlSource, /id="show-internal-router-presentation"/ );
    assert.doesNotMatch( htmlSource, /id="show-trunk-runes"/ );
    assert.doesNotMatch( mainSource,
        /bindSwitch\(\s*'show-internal-router-presentation'/ );
    assert.doesNotMatch( mainSource, /bindSwitch\(\s*'show-trunk-runes'/ );
    assert.match( htmlSource,
        /id="recursive-complexity">100%<\/output>/ );
    assert.doesNotMatch( htmlSource, /Legacy C4c|D4 gold packet trails/ );
    assert.match( htmlSource,
        /data-view="presentation">Packet Passage/ );
    assert.match( rendererSource, /oneSubmittedTrailPerPacket:\s*true/ );
    assert.match( rendererSource, /new THREE\.CurvePath\(\)/ );
    assert.doesNotMatch( rendererSource, /new THREE\.CatmullRomCurve3/ );
    assert.match( rendererSource,
        /getInformationSignal\([\s\S]*?trail\.headDistance/ );
    assert.doesNotMatch( rendererSource,
        /instanceMatrix\s*=\s*resources\.packetMesh\.instanceMatrix/ );
    assert.match( rendererSource, /blending:\s*THREE\.NormalBlending/ );
    assert.match( rendererSource, /rearTransmissionFloor:\s*0/ );
    assert.doesNotMatch( rendererSource, /THREE\.GreaterDepth/ );
    assert.equal( internalRouterPresentationCandidateId,
        'c4d-d4-route-local-subsurface-trails-v2' );
    assert.equal( internalRouterPresentationStyle.packetCoreRadius,
        informationPacketVisualProfile.coreRadius );
    assert.equal( internalRouterPresentationStyle.outputColour,
        informationPacketVisualProfile.outputColour );
    assert.equal( getInformationPacketRadius( 1.34 ),
        informationPacketVisualProfile.coreRadius );

    const liveRadius = getInformationPacketRadius( 0.9 );
    const geometry = createInternalRouterPacketTrailGeometry( [ {
        id: 'visual-profile-proof',
        headDistance: 2,
        samples: [
            { distance: 1, position: [ 0, 0, 0 ] },
            { distance: 1.5, position: [ 0.5, 0, 0 ] },
            { distance: 2, position: [ 0.5, -0.5, 0 ] }
        ]
    } ], liveRadius );
    assert.equal( geometry.userData.internalRouterPresentation.packetRadius,
        liveRadius );
    assert.equal( geometry.userData.internalRouterPresentation.centreline,
        'piecewise-authored-route-samples' );
    assert.ok( geometry.getAttribute( 'packetSignal' ) );
    geometry.dispose();

    const activationStart = rendererSource.indexOf(
        'const packetLocusActive'
    );
    const activationEnd = rendererSource.indexOf(
        'const runeActive',
        activationStart
    );
    const activationSource = rendererSource.slice(
        activationStart,
        activationEnd
    );
    assert.doesNotMatch( activationSource,
        /stencilAvailable|ownershipGeometry/ );
    assert.match( rendererSource,
        /function createRuneSubsurfaceMaterial\(\)[\s\S]*?side: THREE\.FrontSide/ );
} );

test( 'D4 submits exactly the active D3 identities and leaves no idle mark', () => {
    const fixture = mature( createFixture( {
        packetFrequency: 0.01,
        internalRouterTiers: 4
    } ) );
    fixture.layer.update( 0, fixture.form );
    let presentation = fixture.layer.getInternalRouterPresentationResources();
    assert.equal( presentation.candidateId,
        internalRouterPresentationCandidateId );
    assert.equal( presentation.diagnostics.eventDriven, true );
    assert.equal( presentation.diagnostics.packetOnlyDisclosure, true );
    assert.equal( presentation.diagnostics.fullRouterInventoryVisible, false );
    assert.equal( presentation.diagnostics.persistentDisclosure, false );
    assert.equal( presentation.diagnostics.aggregation, false );
    assert.equal( presentation.diagnostics.colourBoundary,
        'cyan-input-to-cosmos-gold-output-at-rune' );
    assert.equal( presentation.diagnostics.morphology,
        'canopy-equivalent-head-and-wake' );
    assert.equal( presentation.diagnostics.activePacketCount, 0 );
    assert.equal( presentation.diagnostics.submittedTrailCount, 0 );
    assert.equal( presentation.packetTrails.length, 0 );
    assert.equal( presentation.diagnostics.productionVisible, false );

    const source = fixture.layer.group.userData.routedLight.activePackets[0];
    const arrival = source.emittedAt
        + boundaryFor( fixture, source.terminalId ) / fixture.form.packetSpeed;
    fixture.layer.update( arrival, fixture.form );
    presentation = fixture.layer.getInternalRouterPresentationResources();
    const transport = fixture.layer.getInternalRouterTransportResources();
    assert.ok( transport.diagnostics.activePacketCount > 0 );
    assert.deepEqual( presentation.activePacketIds,
        transport.activePackets.map( ( packet ) => packet.id ) );
    assert.deepEqual( presentation.diagnostics.activePacketIds,
        presentation.activePacketIds );
    assert.equal( presentation.packetTrails.length,
        transport.diagnostics.activePacketCount );
    assert.equal( presentation.diagnostics.submittedTrailCount,
        transport.diagnostics.activePacketCount );
    for ( let index = 0; index < presentation.packetTrails.length; index += 1 )
    {
        const trail = presentation.packetTrails[index];
        const packet = transport.activePackets[index];
        assert.equal( trail.id, packet.id );
        assert.equal( trail.headDistance, packet.headDistance );
        assert.deepEqual( trail.samples.at( -1 ).position, packet.position );
    }
    assert.equal( presentation.diagnostics.productionVisible, true );
    assert.equal( transport.guide.visible, false );
    assert.equal( transport.packetMesh.visible, false );

    const finalPacket = transport.activePackets.at( -1 );
    fixture.layer.update(
        arrival + finalPacket.routeAssignment.totalLength
            / fixture.form.packetSpeed + 0.1,
        fixture.form
    );
    presentation = fixture.layer.getInternalRouterPresentationResources();
    assert.equal( presentation.diagnostics.activePacketCount, 0 );
    assert.equal( presentation.diagnostics.submittedTrailCount, 0 );
    assert.equal( presentation.packetTrails.length, 0 );
    assert.equal( presentation.diagnostics.productionVisible, false );
} );

test( 'D4 owns its lower-trunk depth envelope across preserved C4 candidates', () => {
    const fixture = mature( createFixture( {
        packetFrequency: 1,
        trunkRuneCandidateId: trunkRuneCandidateIds.opticalFibre
    } ) );
    fixture.layer.update( 0, fixture.form );
    const source = fixture.layer.group.userData.routedLight.activePackets[0];
    const arrival = source.emittedAt
        + boundaryFor( fixture, source.terminalId ) / fixture.form.packetSpeed;
    fixture.layer.update( arrival + 0.25, fixture.form );
    const presentation = fixture.layer.getInternalRouterPresentationResources();
    assert.ok( presentation.proxyGeometry );
    assert.equal( 'ownershipGeometry' in presentation, false );
    assert.equal( presentation.diagnostics.rendererEligible, true );
    assert.equal( presentation.diagnostics.productionVisible, true );
    assert.equal( presentation.diagnostics.submittedTrailCount,
        presentation.diagnostics.activePacketCount );
} );

test( 'toggling D4 changes neither transport state nor Tree geometry', () => {
    const fixture = mature( createFixture( { packetFrequency: 1 } ) );
    fixture.layer.update( 0, fixture.form );
    const source = fixture.layer.group.userData.routedLight.activePackets[0];
    const arrival = source.emittedAt
        + boundaryFor( fixture, source.terminalId ) / fixture.form.packetSpeed;
    fixture.layer.update( arrival + 0.35, fixture.form );
    const before = transportContract( fixture.layer );
    const trunk = fixture.layer.getTrunkVisibilityResources().trunkMesh;
    const router = fixture.layer.getInternalRouterTreeResources();
    const trunkGeometryUuid = trunk.geometry.uuid;
    const trunkMaterialUuid = trunk.material.uuid;
    const routerGeometryUuid = router.geometry.uuid;
    const routerDescriptor = router.descriptor;

    fixture.layer.setInternalRouterPresentationEnabled( false );
    assert.deepEqual( transportContract( fixture.layer ), before );
    const disabledPresentation = fixture.layer
        .getInternalRouterPresentationResources();
    assert.equal( disabledPresentation.diagnostics.enabled, false );
    assert.ok( disabledPresentation.diagnostics.activePacketCount > 0 );
    assert.equal( disabledPresentation.packetTrails.length, 0 );
    assert.equal( disabledPresentation.activePackets.length, 0 );
    fixture.layer.setInternalRouterPresentationEnabled( true );
    assert.deepEqual( transportContract( fixture.layer ), before );
    const enabledPresentation = fixture.layer
        .getInternalRouterPresentationResources();
    assert.ok( enabledPresentation.packetTrails.length > 0 );
    assert.equal( enabledPresentation.packetRadius,
        getInformationPacketRadius( fixture.form.conduitWeight ) );
    assert.equal( trunk.geometry.uuid, trunkGeometryUuid );
    assert.equal( trunk.material.uuid, trunkMaterialUuid );
    assert.equal( fixture.layer.getInternalRouterTreeResources().geometry.uuid,
        routerGeometryUuid );
    assert.equal( fixture.layer.getInternalRouterTreeResources().descriptor,
        routerDescriptor );
} );

test( 'D4 preserves one exact gold head-and-wake trail per packet at 11 Hz', () => {
    const fixture = mature( createFixture( {
        packetFrequency: 11,
        packetSpeed: 0.5,
        internalRouterTiers: 4
    } ) );
    fixture.layer.update( 0, fixture.form );
    fixture.layer.update( 45, fixture.form );
    const transport = fixture.layer.getInternalRouterTransportResources();
    const presentation = fixture.layer.getInternalRouterPresentationResources();
    const state = transport.diagnostics;
    assert.ok( state.dispatchCount > 100 );
    assert.ok( state.maximumConcurrentPacketCount > 20 );
    assert.equal( state.conservation.handoffBalance, 0 );
    assert.equal( state.conservation.lifecycleBalance, 0 );
    assert.equal( state.visualOverflowCount, 0 );
    assert.equal( presentation.packetTrails.length, state.activePacketCount );
    assert.equal( presentation.diagnostics.submittedTrailCount,
        state.activePacketCount );
    assert.equal( new Set( presentation.activePacketIds ).size,
        state.activePacketCount );
    assert.deepEqual( presentation.activePacketIds,
        state.activePackets.map( ( packet ) => packet.id ) );
    for ( let index = 0; index < state.activePackets.length; index += 1 )
    {
        const packet = state.activePackets[index];
        const trail = presentation.packetTrails[index];
        assert.equal( trail.id, packet.id );
        assert.equal( packet.signalClass, 'output' );
        assert.equal( trail.headDistance, packet.headDistance );
        assert.deepEqual( trail.samples.at( -1 ).position, packet.position );
        assert.ok( trail.headDistance - trail.startDistance
            <= informationPacketVisualProfile.trailLength + 1e-9 );
        assert.equal( trail.segmentCount, trail.samples.length - 1 );
        for ( let sampleIndex = 1;
            sampleIndex < trail.samples.length;
            sampleIndex += 1 )
        {
            const previous = trail.samples[sampleIndex - 1];
            const current = trail.samples[sampleIndex];
            assert.ok( current.distance > previous.distance );
            assert.ok( current.distance - previous.distance
                <= informationPacketVisualProfile
                    .internalMaximumSegmentLength + 1e-9 );
        }
    }
    assert.ok( state.currentSharedRouteCount > 0 );
    const shared = new Map();
    for ( const packet of state.activePackets )
    {
        const routeId = packet.routeAssignment.id;
        const retained = shared.get( routeId ) ?? [];
        retained.push( packet );
        shared.set( routeId, retained );
    }
    const congested = Array.from( shared.values() ).find(
        ( packets ) => packets.length > 1
    );
    assert.ok( congested );
    assert.equal( new Set( congested.map( ( packet ) => packet.id ) ).size,
        congested.length );
    assert.ok( new Set( congested.map( ( packet ) => packet.headDistance ) )
        .size > 1 );
    assert.equal( internalRouterPresentationStyle.overlapPolicy,
        'physical-occlusion-no-semantic-aggregation' );
    assert.equal( internalRouterPresentationStyle.headWidth,
        informationPacketVisualProfile.headWidth );
    assert.equal( internalRouterPresentationStyle.trailLength,
        informationPacketVisualProfile.trailLength );
    assert.equal( internalRouterPresentationStyle.wakeAmplitude,
        informationPacketVisualProfile.wakeAmplitude );
    assert.equal( internalRouterPresentationStyle.wakeDecay,
        informationPacketVisualProfile.wakeDecay );
    assert.equal( getInformationSignal( 1, 1 ), 1 );
    assert.ok( getInformationSignal( 0,
        informationPacketVisualProfile.trailLength )
        <= informationPacketVisualProfile.discardThreshold );
} );

test( 'D4 renderer stays bounded and disposes only renderer-owned resources', () => {
    const source = readFileSync(
        new URL(
            '../../src/category-tree/tree/trunk-visibility-renderer.js',
            import.meta.url
        ),
        'utf8'
    );
    assert.match( source,
        /mode:\s*'d4-packet-subsurface'[\s\S]*?passCount:\s*5/ );
    assert.match( source, /packetLocusDepthPasses:\s*1/ );
    assert.match( source, /packetLocusOverlayPasses:\s*1/ );
    assert.match( source,
        /technique:\s*'route-local-depth-aware-subsurface-head-and-wake'[\s\S]*?ownershipPasses:\s*0/ );
    assert.match( source,
        /packetLocusDepthMaterial\.dispose\(\)/ );
    assert.match( source,
        /packetLocusSubsurfaceMaterial\.dispose\(\)/ );
    assert.match( source,
        /packetLocusMesh\.geometry\.dispose\(\)/ );
    assert.match( source,
        /mergeGeometries\( sources, false \)/ );
    assert.match( source,
        /new THREE\.Float32BufferAttribute\( packetSignal, 1 \)/ );
    assert.match( source, /previousGeometry\.dispose\(\)/ );
    assert.doesNotMatch( source, /new THREE\.InstancedMesh/ );
    assert.doesNotMatch( source,
        /packetLocusMesh\.instanceMatrix\s*=\s*resources\.packetMesh\.instanceMatrix/ );
} );

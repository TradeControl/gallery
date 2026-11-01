import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as THREE from 'three';
import {
    createHierarchy,
    createPhysicalUptakeLayer,
    createUnfoldingLayout,
    getInformationPacketRadius,
    informationPacketVisualProfile,
    physicalUptakeCandidateId,
    physicalUptakeVisualProfile,
    representativeHierarchy,
    rootedMotionFieldId,
    selectPhysicalUptakeTerminals,
    unfoldingHierarchy
} from '../../src/lib/tree/index.js';

const moltenSource = readFileSync(
    new URL(
        '../../src/lib/casting-pit/universe/sluice-gate-layer.js',
        import.meta.url
    ),
    'utf8'
);

const parameters = Object.freeze( {
    crownSpread: 0.8,
    verticalRise: 0.95,
    asymmetry: 0.68,
    conduitWeight: 1.34,
    windSweep: 0,
    growthTiers: 6,
    structuralResponse: 0.5,
    canopyGustCandidate: true,
    gustIntervalBase: 0,
    motionFrozen: false,
    packetSpeed: 1.55,
    packetFrequency: 4
} );

function createFixture()
{
    const established = createHierarchy( representativeHierarchy );
    const hierarchy = createHierarchy( unfoldingHierarchy );
    const positions = createUnfoldingLayout( established, hierarchy, {
        trunkRise: 2.05 * parameters.verticalRise,
        branchRise: 1.45 * parameters.verticalRise,
        principalReach: 2.8 * parameters.crownSpread,
        asymmetry: parameters.asymmetry,
        windSweep: parameters.windSweep,
        growthTiers: parameters.growthTiers
    } );
    const layer = createPhysicalUptakeLayer(
        hierarchy,
        positions,
        parameters
    );
    const mature = new Map( hierarchy.nodes.map( ( node ) => [ node.id, 1 ] ) );
    layer.setGrowthProgress( mature );
    return { hierarchy, positions, layer, mature };
}

function transfer( serial, overrides = {} )
{
    return {
        transferId: `uptake-${serial}`,
        sourceParcelId: `parcel-${serial}`,
        sourceId: `feed-${serial % 3}`,
        mass: serial + 1,
        energy: serial + 2,
        temperature: serial + 2.5,
        contactPosition: [ serial * 0.1, -5.5, serial * -0.05 ],
        contactTime: serial * 0.25,
        ...overrides
    };
}

function textureData( layer )
{
    return layer.mesh.material.uniforms.trafficTexture.value.image.data;
}

function longestIlluminatedRun( layer )
{
    const snapshot = layer.getSnapshot();
    const width = snapshot.resources.textureWidth;
    const height = snapshot.resources.textureHeight;
    const data = textureData( layer );
    let longest = 0;
    for ( let row = 0; row < height; row += 1 )
    {
        let run = 0;
        for ( let column = 0; column < width; column += 1 )
        {
            const illuminated = data[( row * width + column ) * 4] >= 2;
            run = illuminated ? run + 1 : 0;
            longest = Math.max( longest, run );
        }
    }
    return longest;
}

function approximately( actual, expected, tolerance = 1e-9 )
{
    assert.ok(
        Math.abs( actual - expected ) <= tolerance,
        `${actual} should be within ${tolerance} of ${expected}`
    );
}

function smoothstep( minimum, maximum, value )
{
    const bounded = Math.min( 1, Math.max(
        0,
        ( value - minimum ) / ( maximum - minimum )
    ) );
    return bounded * bounded * ( 3 - 2 * bounded );
}

function uptakeColourAt( signal )
{
    const profile = physicalUptakeVisualProfile;
    const bodyHeat = smoothstep( 0.18, 0.9, signal );
    const headHeat = smoothstep( 0.82, 1, signal );
    const cooled = profile.cooledColour.map(
        ( component ) => component * profile.tailIntensity
    );
    const body = cooled.map( ( component, index ) => THREE.MathUtils.lerp(
        component,
        profile.bodyColour[index],
        bodyHeat * profile.bodyMixMaximum
    ) );
    const head = body.map( ( component, index ) => THREE.MathUtils.lerp(
        component,
        profile.headColour[index] * profile.headIntensity,
        headHeat * profile.headMixMaximum
    ) );
    const intensity = THREE.MathUtils.lerp(
        profile.bodyIntensityMinimum,
        profile.bodyIntensityMaximum,
        bodyHeat
    );
    return head.map( ( component ) => component * intensity );
}

test( 'uptake is event-driven and packet frequency cannot emit autonomously', () => {
    const { layer } = createFixture();
    const fast = { ...parameters, packetFrequency: 20 };
    assert.equal( layer.getSnapshot().candidateId, physicalUptakeCandidateId );
    assert.equal( layer.getSnapshot().autonomousEmission, false );

    layer.update( 0, fast );
    layer.update( 120, fast );

    const snapshot = layer.getSnapshot();
    assert.equal( snapshot.acceptedTransferCount, 0 );
    assert.equal( snapshot.activePacketCount, 0 );
    assert.equal( snapshot.completedVisualCount, 0 );
    assert.equal( snapshot.resources.illuminatedSampleCount, 0 );
    assert.equal( textureData( layer ).some( ( value ) => value !== 0 ), false );
} );

test( 'accepted transfers preserve frozen provenance and deduplicate ownership', () => {
    const { layer } = createFixture();
    const accepted = layer.acceptPhysicalUptake( transfer( 2 ) );
    assert.equal( accepted.accepted, true );
    assert.equal( accepted.duplicate, false );
    assert.equal( Object.isFrozen( accepted ), true );
    assert.equal( Object.isFrozen( accepted.transfer ), true );
    assert.equal( Object.isFrozen( accepted.transfer.contactPosition ), true );
    assert.deepEqual( accepted.transfer, {
        transferId: 'uptake-2',
        sourceParcelId: 'parcel-2',
        sourceId: 'feed-2',
        mass: 3,
        energy: 4,
        temperature: 4.5,
        contactPosition: [ 0.2, -5.5, -0.1 ],
        contactTime: 0.5,
        sequence: 0
    } );

    const duplicate = layer.acceptPhysicalUptake( transfer( 2, {
        mass: 99,
        energy: 99
    } ) );
    assert.equal( duplicate.accepted, false );
    assert.equal( duplicate.duplicate, true );
    assert.strictEqual( duplicate.transfer, accepted.transfer );

    const snapshot = layer.getSnapshot();
    assert.equal( snapshot.acceptedTransferCount, 1 );
    assert.equal( snapshot.duplicateTransferCount, 1 );
    assert.equal( snapshot.pendingTransferCount, 1 );
    assert.equal( snapshot.acceptedMass, 3 );
    assert.equal( snapshot.acceptedEnergy, 4 );
    assert.equal( snapshot.lifecycleBalance, 0 );
    assert.equal( snapshot.massBalance, 0 );
} );

test( 'one accepted transfer becomes one monotonic root-to-tip liquid wake', () => {
    const { layer } = createFixture();
    layer.acceptPhysicalUptake( transfer( 0 ) );
    layer.update( 0, parameters );
    const first = layer.getSnapshot().activePackets[0];
    assert.equal( first.headDistance, 0 );
    assert.equal( first.phase, 'xylem-stream' );
    assert.ok( layer.getSnapshot().resources.illuminatedSampleCount > 0 );

    layer.update( 1, parameters );
    const second = layer.getSnapshot().activePackets[0];
    assert.ok( second.headDistance > first.headDistance );
    assert.equal( second.transferId, first.transferId );
    assert.equal( second.sourceParcelId, first.sourceParcelId );
    assert.equal( second.routeTerminalId, first.routeTerminalId );
    assert.ok( second.headDistance < second.targetDistance );

    const branchTime = ( second.xylemBoundaryDistance + 0.1 )
        / parameters.packetSpeed;
    layer.update( branchTime, parameters );
    const branch = layer.getSnapshot().activePackets[0];
    assert.equal( branch.phase, 'outward-branch-packet' );
    assert.ok( branch.headDistance > branch.xylemBoundaryDistance );
    assert.ok( branch.targetDistance >= branch.xylemBoundaryDistance );
} );

test( 'real collar contact clips uptake below the accepted entry boundary', () => {
    const { layer } = createFixture();
    layer.acceptPhysicalUptake( transfer( 0, {
        contactPosition: [ 1.2, 0.8, 0 ]
    } ) );
    layer.update( 0, parameters );

    const packet = layer.getSnapshot().activePackets[0];
    assert.ok( packet.entryDistance > 0.7 );
    assert.equal( packet.headDistance, packet.entryDistance );
    assert.equal( packet.laneIndex, 0 );

    const metadata = layer.mesh.geometry.userData.physicalUptake;
    const rootLane = metadata.trafficEdges.find( ( edge ) =>
        edge.childId === 'uptake' && edge.laneIndex === packet.laneIndex
    );
    const width = layer.getSnapshot().resources.textureWidth;
    const rootSample = ( rootLane.row * width + width - 1 ) * 4;
    assert.equal( textureData( layer )[rootSample], 0 );
    assert.ok( layer.getSnapshot().resources.illuminatedSampleCount > 0 );
} );

test( 'the renderer is one connected molten tube field rather than beads', () => {
    const { layer } = createFixture();
    const material = layer.mesh.material;
    const snapshot = layer.getSnapshot();
    assert.equal( layer.group.children.length, 1 );
    assert.equal( layer.group.children[0].isMesh, true );
    assert.equal( layer.group.children[0].isPoints, undefined );
    assert.equal( snapshot.resources.drawCallCount, 1 );
    assert.equal( snapshot.resources.pointCount, 0 );
    assert.ok( snapshot.resources.vertexCount > 0 );
    assert.equal( snapshot.resources.textureWidth, 64 );
    assert.ok( snapshot.resources.textureHeight > 0 );
    assert.deepEqual(
        material.uniforms.lavaCooledColour.value.toArray(),
        physicalUptakeVisualProfile.cooledColour
    );
    assert.deepEqual(
        material.uniforms.lavaBodyColour.value.toArray(),
        physicalUptakeVisualProfile.bodyColour
    );
    assert.deepEqual(
        material.uniforms.lavaHeadColour.value.toArray(),
        physicalUptakeVisualProfile.headColour.map(
            ( component ) => component
                * physicalUptakeVisualProfile.headIntensity
        )
    );
    assert.equal( material.depthTest, true );
    assert.equal( material.depthWrite, false );
    assert.equal( material.depthFunc, THREE.GreaterDepth );
    assert.equal( material.side, THREE.DoubleSide );
    assert.equal( material.blending, THREE.NormalBlending );
    assert.equal( material.toneMapped, true );
    assert.equal( material.lights, false );
    assert.equal( material.userData.physicalUptake.lightCount, 0 );
    assert.equal( material.userData.physicalUptake.bloom, false );
    assert.equal( material.userData.physicalUptake.sugarReturn, false );
    assert.ok( snapshot.resources.tubeRadius >= 0.055 );
    assert.ok( snapshot.resources.tubeRadius <= 0.061 );
    assert.ok(
        snapshot.resources.tubeRadius
            / getInformationPacketRadius( parameters.conduitWeight ) >= 1.8
    );
    assert.equal( layer.mesh.renderOrder, 2 );
    assert.equal( snapshot.resources.laneCount, 3 );
    assert.equal( snapshot.resources.centralLaneCount, 0 );
    assert.ok( snapshot.resources.trunkLaneCount >= 9 );
    assert.ok( snapshot.resources.branchLaneCount > 0 );
    assert.ok( snapshot.resources.minimumCoreClearance > 0 );
    assert.ok( snapshot.resources.minimumBarkClearance > 0 );
} );

test( 'three peripheral trunk lanes stay continuous and branch by authored limb', () => {
    const { layer } = createFixture();
    const records = layer.mesh.geometry.userData.physicalUptake.trafficEdges;
    for ( const childId of [ 'uptake', 'exchange', 'meaning' ] )
    {
        assert.deepEqual(
            records.filter( ( record ) => record.childId === childId )
                .map( ( record ) => record.laneIndex ),
            [ 0, 1, 2 ]
        );
    }
    for ( const [ childId, laneIndex ] of [
        [ 'operations', 0 ],
        [ 'finance', 1 ],
        [ 'resources', 2 ]
    ] )
    {
        assert.deepEqual(
            records.filter( ( record ) => record.childId === childId )
                .map( ( record ) => record.laneIndex ),
            [ laneIndex ]
        );
    }
    for ( let laneIndex = 0; laneIndex < 3; laneIndex += 1 )
    {
        const lower = records.find( ( record ) =>
            record.childId === 'uptake' && record.laneIndex === laneIndex
        );
        const upper = records.find( ( record ) =>
            record.childId === 'exchange' && record.laneIndex === laneIndex
        );
        assert.deepEqual( lower.childPoint, upper.parentPoint );
        assert.ok( Math.hypot(
            lower.parentPoint[0],
            lower.parentPoint[2]
        ) > 1 );
    }
} );

test( 'peripheral lanes retain cyan-core and bark clearance at weight extremes', () => {
    const { layer, positions } = createFixture();
    for ( const conduitWeight of [ 0.75, 1.34, 1.85 ] )
    {
        layer.rebuild( positions, { ...parameters, conduitWeight } );
        const snapshot = layer.getSnapshot();
        const expectedMaximum = Math.min(
            physicalUptakeVisualProfile.laneRadiusMaximum,
            getInformationPacketRadius( conduitWeight )
                * physicalUptakeVisualProfile.laneCoreRadiusMultiple
        );
        assert.ok(
            Math.abs(
                snapshot.resources.tubeRadius - expectedMaximum
            ) < 1e-9
        );
        assert.ok(
            snapshot.resources.minimumCoreClearance
                >= physicalUptakeVisualProfile.laneClearanceMinimum
        );
        assert.ok(
            snapshot.resources.minimumBarkClearance
                >= physicalUptakeVisualProfile.laneClearanceMinimum
        );
        assert.equal( snapshot.resources.centralLaneCount, 0 );
    }
} );

test( 'molten wakes copy cyan packet morphology while retaining a lava-only palette', () => {
    assert.equal(
        physicalUptakeVisualProfile.headWidth,
        informationPacketVisualProfile.headWidth
    );
    assert.equal(
        physicalUptakeVisualProfile.trailLength,
        informationPacketVisualProfile.trailLength
    );
    assert.equal(
        physicalUptakeVisualProfile.wakeAmplitude,
        informationPacketVisualProfile.wakeAmplitude
    );
    assert.equal(
        physicalUptakeVisualProfile.wakeDecay,
        informationPacketVisualProfile.wakeDecay
    );
    assert.deepEqual(
        physicalUptakeVisualProfile.cooledColour,
        [ 0.055, 0.009, 0.004 ]
    );
    assert.deepEqual(
        physicalUptakeVisualProfile.bodyColour,
        [ 0.46, 0.038, 0.006 ]
    );
    assert.deepEqual(
        physicalUptakeVisualProfile.headColour,
        [ 0.95, 0.25, 0.018 ]
    );
    assert.match( moltenSource, /vec3 cooled = vec3\( 0\.055, 0\.009, 0\.004 \)/ );
    assert.match( moltenSource, /vec3 warm = vec3\( 0\.46, 0\.038, 0\.006 \)/ );
    assert.match( moltenSource, /vec3 hot = vec3\( 0\.95, 0\.25, 0\.018 \)/ );

    const tail = uptakeColourAt( 0.25 );
    const body = uptakeColourAt( 0.7 );
    const head = uptakeColourAt( 1 );
    assert.ok( tail[0] < body[0] );
    assert.ok( body[0] < head[0] );
    assert.ok( head[0] < 0.4 );
    assert.ok( head[1] / head[0] > 0.15 );
    assert.equal( physicalUptakeVisualProfile.tailIntensity, 0.42 );
    assert.equal( physicalUptakeVisualProfile.bodyMixMaximum, 0.28 );
    assert.equal( physicalUptakeVisualProfile.headMixMaximum, 0.34 );
    assert.equal( physicalUptakeVisualProfile.opacity, 0.92 );
    assert.equal( physicalUptakeVisualProfile.laneRadiusFraction, 0.14 );
    assert.equal( physicalUptakeVisualProfile.laneRadiusMaximum, 0.075 );
    assert.equal( physicalUptakeVisualProfile.laneCoreRadiusMultiple, 1.875 );

    const { layer } = createFixture();
    layer.acceptPhysicalUptake( transfer( 0 ) );
    layer.update( 1, parameters );
    assert.ok( longestIlluminatedRun( layer ) >= 4 );
    assert.equal( layer.getSnapshot().representation, 'routed-liquid-head-and-wake' );
    assert.equal( layer.getSnapshot().sugarReturn, false );
} );

test( 'genuine transfers are admitted at the shared aggregate packet cadence', () => {
    const { layer } = createFixture();
    const cadence = { ...parameters, packetFrequency: 2 };
    layer.acceptPhysicalUptake( transfer( 0 ) );
    layer.update( 0, cadence );
    assert.deepEqual(
        layer.getSnapshot().activePackets.map( ( packet ) => packet.startedAt ),
        [ 0 ]
    );

    layer.acceptPhysicalUptake( transfer( 1, { contactTime: 0.01 } ) );
    layer.update( 0.49, cadence );
    assert.equal( layer.getSnapshot().activePacketCount, 1 );
    assert.equal( layer.getSnapshot().pendingTransferCount, 1 );
    layer.update( 0.5, cadence );

    const snapshot = layer.getSnapshot();
    assert.equal( snapshot.packetFrequency, 2 );
    assert.equal( snapshot.activePacketCount, 2 );
    assert.deepEqual(
        snapshot.activePackets.map( ( packet ) => packet.startedAt ),
        [ 0, 0.5 ]
    );
    assert.equal( snapshot.visualisedTransferCount, 2 );
    assert.equal( snapshot.acceptedTransferCount, 2 );
    assert.equal( snapshot.massBalance, 0 );
} );

test( 'a newly arrived transfer cannot be back-dated through an empty frame gap', () => {
    const { layer } = createFixture();
    const cadence = { ...parameters, packetFrequency: 2 };
    layer.update( 0, cadence );
    layer.acceptPhysicalUptake( transfer( 0, {
        contactTime: 40,
        presentationTime: 10
    } ) );
    layer.update( 10, cadence );

    const snapshot = layer.getSnapshot();
    assert.equal( snapshot.activePacketCount, 1 );
    assert.equal( snapshot.visualisedTransferCount, 1 );
    assert.equal( snapshot.unvisualisedTransferCount, 0 );
    assert.equal( snapshot.activePackets[0].startedAt, 10 );
    assert.equal( snapshot.activePackets[0].headDistance, 0 );
    assert.equal( snapshot.massBalance, 0 );
} );

test( 'frequency changes rephase the remaining wait without a flash', () => {
    const { layer } = createFixture();
    layer.acceptPhysicalUptake( transfer( 0 ) );
    layer.update( 0, parameters );
    layer.acceptPhysicalUptake( transfer( 1, { contactTime: 0.1 } ) );
    layer.update( 0.1, parameters );

    const faster = { ...parameters, packetFrequency: 8 };
    layer.update( 0.1, faster );
    layer.update( 0.174, faster );
    assert.equal( layer.getSnapshot().activePacketCount, 1 );
    layer.update( 0.175, faster );

    const packets = layer.getSnapshot().activePackets;
    assert.equal( packets.length, 2 );
    approximately( packets[1].startedAt, 0.175 );
} );

test( 'fine and coarse frames preserve the same cadence ownership and motion', () => {
    const fine = createFixture().layer;
    const coarse = createFixture().layer;
    for ( const layer of [ fine, coarse ] )
    {
        layer.acceptPhysicalUptake( transfer( 0 ) );
        layer.update( 0, parameters );
        layer.acceptPhysicalUptake( transfer( 1 ) );
    }
    fine.update( 0.1, parameters );
    fine.update( 0.25, parameters );
    fine.update( 1, parameters );
    coarse.update( 1, parameters );

    const summarise = ( layer ) => layer.getSnapshot().activePackets.map(
        ( packet ) => ( {
            transferId: packet.transferId,
            startedAt: packet.startedAt,
            headDistance: packet.headDistance,
            routeTerminalId: packet.routeTerminalId
        } )
    );
    assert.deepEqual( summarise( fine ), summarise( coarse ) );
} );

test( 'one deterministic real candidate is retained per cadence slot', () => {
    const { layer } = createFixture();
    for ( let serial = 0; serial < 10; serial += 1 )
    {
        layer.acceptPhysicalUptake( transfer( serial, { contactTime: 0 } ) );
    }
    layer.update( 0, parameters );

    const snapshot = layer.getSnapshot();
    assert.equal( snapshot.acceptedTransferCount, 10 );
    assert.equal( snapshot.activePacketCount, 1 );
    assert.equal( snapshot.visualisedTransferCount, 1 );
    assert.equal( snapshot.unvisualisedTransferCount, 9 );
    assert.equal( snapshot.pendingTransferCount, 0 );
    assert.equal( snapshot.lifecycleBalance, 0 );
    assert.equal( snapshot.massBalance, 0 );
    assert.equal( snapshot.acceptedMass, 55 );
    assert.equal( snapshot.visualisedMass, 1 );
    assert.equal( snapshot.unvisualisedMass, 54 );
    assert.equal( snapshot.activePackets[0].transferId, 'uptake-0' );
} );

test( 'lifetime audit storage is bounded while aggregate mass remains exact', () => {
    const { layer } = createFixture();
    const transferCount = physicalUptakeVisualProfile.auditCapacity + 37;
    for ( let serial = 0; serial < transferCount; serial += 1 )
    {
        layer.acceptPhysicalUptake( transfer( serial, { contactTime: 0 } ) );
    }
    layer.update( 0, parameters );

    const snapshot = layer.getSnapshot();
    assert.equal( snapshot.acceptedTransferCount, transferCount );
    assert.equal(
        snapshot.acceptedMass,
        transferCount * ( transferCount + 1 ) / 2
    );
    assert.equal( snapshot.massBalance, 0 );
    assert.equal(
        snapshot.audit.retainedTransferCount,
        physicalUptakeVisualProfile.auditCapacity
    );
    assert.ok(
        snapshot.audit.retainedUnvisualisedIdCount
            <= physicalUptakeVisualProfile.auditCapacity
    );
    assert.equal( snapshot.audit.evictedTransferCount, 37 );
    assert.equal( snapshot.audit.truncated, true );
    assert.ok(
        snapshot.activePacketCount
            <= physicalUptakeVisualProfile.maximumActivePackets
    );
} );

test( 'growth progress limits uptake to manifested authored branches', () => {
    const { hierarchy, layer } = createFixture();
    layer.setGrowthProgress( new Map() );
    layer.acceptPhysicalUptake( transfer( 0 ) );
    layer.update( 0, parameters );
    const restricted = layer.getSnapshot().activePackets[0];
    assert.ok( restricted );
    assert.equal(
        Boolean( hierarchy.byId.get( restricted.routeTerminalId ).latent ),
        false
    );

    layer.reset();
    layer.setGrowthProgress( new Map(
        hierarchy.nodes.map( ( node ) => [ node.id, 1 ] )
    ) );
    layer.acceptPhysicalUptake( transfer( 1, { contactTime: 0 } ) );
    layer.update( 0, parameters );
    const mature = layer.getSnapshot().activePackets[0];
    assert.ok( mature );
    assert.equal( hierarchy.byId.get( mature.routeTerminalId ).latent, true );

    layer.setGrowthProgress( new Map() );
    layer.update( 0.5, parameters );
    assert.equal( layer.getSnapshot().activePacketCount, 0 );
} );

test( 'routed liquid shares the rooted sway field while freeze sway locks it', () => {
    const live = createFixture().layer;
    const frozen = createFixture().layer;
    live.update( 5, parameters );
    frozen.update( 5, { ...parameters, motionFrozen: true } );

    assert.equal(
        live.mesh.material.userData.deformationFieldId,
        rootedMotionFieldId
    );
    assert.equal( live.getSnapshot().deformationFieldId, rootedMotionFieldId );
    assert.equal(
        live.mesh.material.userData.deformationUniforms.time.value,
        5
    );
    assert.equal(
        live.mesh.material.userData.deformationUniforms.response.value,
        parameters.structuralResponse
    );
    assert.equal(
        frozen.mesh.material.userData.deformationUniforms.response.value,
        0
    );
} );

test( 'reset clears audit while rebuild preserves it and replaces only route geometry', () => {
    const { positions, layer } = createFixture();
    const originalMaterial = layer.mesh.material;
    const revision = layer.getSnapshot().resources.revision;
    layer.acceptPhysicalUptake( transfer( 0 ) );
    layer.update( 0, parameters );

    layer.reset();
    assert.equal( layer.getSnapshot().acceptedTransferCount, 0 );
    assert.equal( layer.getSnapshot().activePacketCount, 0 );
    assert.equal( layer.getSnapshot().resources.illuminatedSampleCount, 0 );
    assert.strictEqual( layer.mesh.material, originalMaterial );
    assert.equal( layer.acceptPhysicalUptake( transfer( 0 ) ).accepted, true );

    const oldGeometry = layer.mesh.geometry;
    const oldTexture = layer.mesh.material.uniforms.trafficTexture.value;
    layer.rebuild( positions, parameters );
    assert.equal( layer.getSnapshot().acceptedTransferCount, 1 );
    assert.equal( layer.getSnapshot().acceptedMass, 1 );
    assert.equal( layer.getSnapshot().unvisualisedTransferCount, 1 );
    assert.equal( layer.getSnapshot().massBalance, 0 );
    assert.equal( layer.getSnapshot().resources.revision, revision + 1 );
    assert.equal( layer.getSnapshot().resources.drawCallCount, 1 );
    assert.notStrictEqual( layer.mesh.geometry, oldGeometry );
    assert.notStrictEqual(
        layer.mesh.material.uniforms.trafficTexture.value,
        oldTexture
    );
    assert.strictEqual( layer.mesh.material, originalMaterial );
    assert.equal( layer.getSnapshot().routeCount, 12 );
} );

test( 'route selection is deterministic and balanced across authored limbs', () => {
    const hierarchy = createHierarchy( unfoldingHierarchy );
    const first = selectPhysicalUptakeTerminals( hierarchy );
    const second = selectPhysicalUptakeTerminals( hierarchy );
    assert.deepEqual(
        first.map( ( terminal ) => terminal.id ),
        second.map( ( terminal ) => terminal.id )
    );
    assert.equal( first.length, 12 );
    const limbs = new Set( first.map( ( terminal ) => terminal.limb ) );
    assert.equal( limbs.has( 'operations' ), true );
    assert.equal( limbs.has( 'finance' ), true );
    assert.equal( limbs.has( 'resources' ), true );
} );

test( 'presentation visibility cannot pause causal dispatch or accounting', () => {
    const { layer } = createFixture();
    layer.setVisible( false );
    layer.acceptPhysicalUptake( transfer( 0 ) );
    layer.update( 0, parameters );
    assert.equal( layer.group.visible, false );
    assert.equal( layer.getSnapshot().activePacketCount, 1 );
    assert.equal( layer.getSnapshot().visualisedTransferCount, 1 );
    assert.equal( layer.getSnapshot().massBalance, 0 );
} );

test( 'dispose releases the sole render resources exactly once', () => {
    const { layer } = createFixture();
    assert.equal( layer.dispose(), true );
    assert.equal( layer.group.children.length, 0 );
    assert.equal( layer.getSnapshot().disposed, true );
    assert.equal( layer.getSnapshot().resources.drawCallCount, 0 );
    assert.equal( layer.dispose(), false );
    assert.throws(
        () => layer.acceptPhysicalUptake( transfer( 0 ) ),
        /disposed/
    );
} );

test( 'invalid transfers and cadence values cannot create partial uptake state', () => {
    const { layer } = createFixture();
    assert.throws(
        () => layer.acceptPhysicalUptake( {} ),
        /transfer id/
    );
    assert.throws(
        () => layer.acceptPhysicalUptake( transfer( 0, { mass: 0 } ) ),
        /mass/
    );
    assert.throws(
        () => layer.acceptPhysicalUptake( transfer( 0, { energy: NaN } ) ),
        /energy/
    );
    assert.throws(
        () => layer.acceptPhysicalUptake( transfer( 0, {
            presentationTime: -1
        } ) ),
        /presentation time/
    );
    assert.throws(
        () => layer.update( 1, { ...parameters, packetSpeed: NaN } ),
        /speed/
    );
    assert.throws(
        () => layer.update( 1, { ...parameters, packetFrequency: 0 } ),
        /frequency/
    );
    assert.equal( layer.getSnapshot().acceptedTransferCount, 0 );
    assert.equal( layer.getSnapshot().pendingTransferCount, 0 );
} );

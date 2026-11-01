import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
    createHierarchy,
    representativeHierarchy,
    unfoldingHierarchy
} from '../../src/lib/tree/hierarchy.js';
import { createUnfoldingLayout } from '../../src/lib/tree/layout.js';
import { createGrowthCycle } from '../../src/lib/tree/growth-cycle.js';
import {
    createEngineeredTreeLayer,
    createInformationRoute,
    createInformationTrafficGeometry,
    selectInformationTrafficTerminals
} from '../../src/lib/tree/engineered-tree-layer.js';

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
        packetFrequency: 0.2,
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

test( 'traffic terminals are deterministic and limited to active authored topology', () => {
    const { hierarchy } = createFixture( 3 );
    const first = selectInformationTrafficTerminals( hierarchy );
    const second = selectInformationTrafficTerminals( hierarchy );

    assert.deepEqual(
        first.map( ( terminal ) => terminal.id ),
        second.map( ( terminal ) => terminal.id )
    );
    assert.equal( new Set( first.map( ( terminal ) => terminal.id ) ).size, first.length );
    assert.ok( first.length > 1 );
    assert.ok( first.every( ( terminal ) =>
        terminal.kind === 'terminal' && terminal.growthEligible !== false
    ) );
    assert.ok( first.some( ( terminal ) => !terminal.latent ) );
    for ( const tier of [ 1, 2, 3 ] )
    {
        assert.ok( first.some( ( terminal ) => terminal.growthTier === tier ) );
    }
    assert.ok( first.every( ( terminal ) =>
        terminal.growthTier === undefined || terminal.growthTier <= 3
    ) );
} );

test( 'growth remains active until eligible tier-three traffic is mature', () => {
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

test( 'traffic geometry converges shared authored routes without duplicating edges', () => {
    const { form, hierarchy, positions } = createFixture();
    const routes = [ 'process-readiness-state', 'people-readiness-state' ].map(
        ( terminalId ) => createInformationRoute(
            hierarchy, positions, terminalId, form.asymmetry
        )
    );
    const expectedByChildId = new Map( routes.flatMap( ( route ) =>
        route.segments.map( ( segment ) => [ segment.childId, segment ] )
    ) );
    const sharedChildIds = routes[0].segments
        .map( ( segment ) => segment.childId )
        .filter( ( childId ) => routes[1].byChildId.has( childId ) );

    assert.ok( sharedChildIds.length > 0 );
    const geometry = createInformationTrafficGeometry( routes, form.conduitWeight );
    const metadata = geometry.userData.informationTraffic;
    const trafficUvs = geometry.getAttribute( 'trafficUv' );

    assert.ok( trafficUvs );
    assert.equal( trafficUvs.count, geometry.getAttribute( 'position' ).count );
    assert.deepEqual(
        metadata.trafficEdges.map( ( edge ) => edge.childId ).sort(),
        [ ...expectedByChildId.keys() ].sort()
    );
    for ( const edge of metadata.trafficEdges )
    {
        assert.equal( hierarchy.byId.get( edge.childId ).parentId, edge.parentId );
        assert.ok( edge.length > 0 );
    }
    geometry.dispose();
} );

test( 'only manifested terminals emit from deterministic distributed phases', () => {
    const { form, hierarchy, positions } = createFixture();
    const firstLayer = createEngineeredTreeLayer( hierarchy, positions, form );
    firstLayer.update( 0, form );
    firstLayer.update( 10, form );
    const growing = firstLayer.group.userData.routedLight;

    assert.ok( growing.manifestedEmitterCount > 0 );
    assert.ok( growing.manifestedEmitterCount < growing.eligibleEmitterCount );
    assert.equal( growing.eligibleTerminalIds.length, growing.eligibleEmitterCount );
    assert.equal( growing.emissionSchedule.length, growing.eligibleEmitterCount );
    assert.equal(
        new Set( growing.emissionSchedule.map( ( emitter ) => emitter.phase ) ).size,
        growing.emissionSchedule.length
    );
    for ( const packet of growing.activePackets )
    {
        assert.ok( packet.routeNodeIds.every( ( id ) => !hierarchy.byId.get( id ).latent ) );
    }

    const { form: repeatedForm, hierarchy: repeatedHierarchy, positions: repeatedPositions }
        = createFixture();
    const repeatedLayer = createEngineeredTreeLayer(
        repeatedHierarchy,
        repeatedPositions,
        repeatedForm
    );
    repeatedLayer.update( 0, repeatedForm );
    repeatedLayer.update( 10, repeatedForm );
    const repeated = repeatedLayer.group.userData.routedLight;
    assert.deepEqual( repeated.emissionSchedule, growing.emissionSchedule );
    assert.deepEqual( repeated.activePackets, growing.activePackets );
} );

test( 'distributed packets are deterministic, authored, and frequency controlled', () => {
    function sampleTraffic( packetFrequency )
    {
        const { form, hierarchy, positions } = createFixture();
        const layer = createEngineeredTreeLayer( hierarchy, positions, {
            ...form,
            packetFrequency
        } );
        const mature = new Map( hierarchy.nodes
            .filter( ( node ) => node.latent && node.growthEligible !== false )
            .map( ( node ) => [ node.id, 1 ] ) );
        layer.setGrowthProgress( mature );

        const samples = [];
        for ( let elapsed = 0; elapsed <= 60; elapsed += 0.5 )
        {
            layer.update( elapsed, { ...form, packetFrequency } );
            const diagnostics = layer.group.userData.routedLight;
            samples.push( {
                packetCount: diagnostics.packetCount,
                emittedPacketCount: diagnostics.emittedPacketCount,
                activePackets: diagnostics.activePackets.map( ( packet ) => ( {
                    id: packet.id,
                    terminalId: packet.terminalId,
                    emittedAt: packet.emittedAt,
                    headDistance: packet.headDistance,
                    totalDistance: packet.totalDistance,
                    routeNodeIds: packet.routeNodeIds,
                    activeSegment: packet.activeSegment
                } ) )
            } );
        }
        return { hierarchy, samples };
    }

    const low = sampleTraffic( 0.05 );
    const repeatedLow = sampleTraffic( 0.05 );
    const high = sampleTraffic( 11 );
    assert.deepEqual( low.samples, repeatedLow.samples );
    assert.ok( low.samples.some( ( sample ) => sample.packetCount === 0 ) );
    assert.ok(
        high.samples.at( -1 ).emittedPacketCount
        > low.samples.at( -1 ).emittedPacketCount
    );
    assert.ok( high.samples.some( ( sample ) => sample.packetCount > 1 ) );
    const converged = high.samples.find( ( sample ) =>
        sample.activePackets.some( ( packet, index ) =>
            sample.activePackets.slice( index + 1 ).some( ( other ) =>
                packet.id !== other.id
                && packet.activeSegment !== null
                && packet.activeSegment === other.activeSegment
            )
        )
    );
    assert.ok( converged, 'independent packets should simultaneously occupy one shared edge' );
    assert.equal(
        new Set( converged.activePackets.map( ( packet ) => packet.id ) ).size,
        converged.activePackets.length
    );

    for ( const sample of high.samples )
    {
        for ( const packet of sample.activePackets )
        {
            assert.equal( packet.routeNodeIds[0], packet.terminalId );
            assert.equal( packet.routeNodeIds.at( -1 ), high.hierarchy.root.id );
            for ( let index = 0; index < packet.routeNodeIds.length - 1; index += 1 )
            {
                const child = high.hierarchy.byId.get( packet.routeNodeIds[index] );
                assert.equal( child.parentId, packet.routeNodeIds[index + 1] );
            }
        }
    }
} );

test( 'maximum-frequency traffic at a fixed time is independent of update cadence', () => {
    function sampleAtSixty( step )
    {
        const { form, hierarchy, positions } = createFixture();
        const parameters = { ...form, packetFrequency: 11 };
        const layer = createEngineeredTreeLayer( hierarchy, positions, parameters );
        const mature = new Map( hierarchy.nodes
            .filter( ( node ) => node.latent && node.growthEligible !== false )
            .map( ( node ) => [ node.id, 1 ] ) );
        layer.setGrowthProgress( mature );
        layer.update( 0, parameters );
        for ( let elapsed = step; elapsed < 60; elapsed += step )
        {
            layer.update( elapsed, parameters );
        }
        layer.update( 60, parameters );
        return layer.group.userData.routedLight.activePackets
            .map( ( packet ) => ( {
                id: packet.id,
                emittedAt: packet.emittedAt,
                headDistance: packet.headDistance
            } ) )
            .sort( ( left, right ) => left.id.localeCompare( right.id ) );
    }

    const fine = sampleAtSixty( 0.25 );
    const coarse = sampleAtSixty( 60 );
    assert.ok( fine.length > 1 );
    assert.deepEqual(
        fine.map( ( packet ) => [ packet.id, packet.emittedAt ] ),
        coarse.map( ( packet ) => [ packet.id, packet.emittedAt ] )
    );
    for ( let index = 0; index < fine.length; index += 1 )
    {
        assert.ok(
            Math.abs( fine[index].headDistance - coarse[index].headDistance ) < 1e-9
        );
    }
} );

test( 'the full frequency range keeps maximum-rate packets independent and staggered', () => {
    function createMatureTraffic( packetFrequency )
    {
        const { form, hierarchy, positions } = createFixture();
        const parameters = { ...form, packetFrequency };
        const layer = createEngineeredTreeLayer( hierarchy, positions, parameters );
        const mature = new Map( hierarchy.nodes
            .filter( ( node ) => node.latent && node.growthEligible !== false )
            .map( ( node ) => [ node.id, 1 ] ) );
        layer.setGrowthProgress( mature );
        layer.update( 0, parameters );
        return { hierarchy, layer, parameters };
    }

    const expectedAtTwenty = new Map( [
        [ 0.05, 2 ],
        [ 0.2, 5 ],
        [ 11, 221 ]
    ] );
    for ( const [ packetFrequency, expectedCount ] of expectedAtTwenty )
    {
        const { layer, parameters } = createMatureTraffic( packetFrequency );
        layer.update( 20, parameters );
        assert.equal(
            layer.group.userData.routedLight.emittedPacketCount,
            expectedCount,
            `${packetFrequency}/s should neither drop nor invent due emissions`
        );
    }

    const first = createMatureTraffic( 11 );
    first.layer.update( 2, first.parameters );
    const firstTwoSeconds = first.layer.group.userData.routedLight;
    assert.equal( firstTwoSeconds.emittedPacketCount, 23 );
    assert.equal( firstTwoSeconds.packetCount, 23 );
    assert.equal(
        new Set( firstTwoSeconds.activePackets.map( ( packet ) => packet.id ) ).size,
        firstTwoSeconds.packetCount
    );
    assert.equal(
        new Set( firstTwoSeconds.activePackets.map( ( packet ) => packet.emittedAt ) ).size,
        firstTwoSeconds.packetCount,
        'the 11/s control must not collapse independent emissions onto one instant'
    );
    const emissionTimes = firstTwoSeconds.activePackets
        .map( ( packet ) => packet.emittedAt )
        .sort( ( left, right ) => left - right );
    for ( let index = 1; index < emissionTimes.length; index += 1 )
    {
        assert.ok(
            Math.abs( emissionTimes[index] - emissionTimes[index - 1] - 1 / 11 ) < 1e-9,
            'maximum-frequency emissions should retain their distributed phase spacing'
        );
    }

    const repeated = createMatureTraffic( 11 );
    repeated.layer.update( 2, repeated.parameters );
    assert.deepEqual(
        repeated.layer.group.userData.routedLight.activePackets,
        firstTwoSeconds.activePackets
    );

    first.layer.update( 10, first.parameters );
    const congested = first.layer.group.userData.routedLight;
    const packetsBySegment = new Map();
    for ( const packet of congested.activePackets )
    {
        if ( packet.activeSegment === null ) continue;
        const packets = packetsBySegment.get( packet.activeSegment ) ?? [];
        packets.push( packet );
        packetsBySegment.set( packet.activeSegment, packets );
    }
    const sharedPackets = [ ...packetsBySegment.values() ].find(
        ( packets ) => new Set( packets.map( ( packet ) => packet.terminalId ) ).size > 1
    );
    assert.ok( sharedPackets, 'high-rate traffic should exercise one shared authored route' );
    assert.equal(
        new Set( sharedPackets.map( ( packet ) => packet.id ) ).size,
        sharedPackets.length,
        'congestion must not merge independent packet identities'
    );
    assert.equal( congested.coreMeshCount, 1 );
    assert.ok( congested.occupiedEdgeCount <= congested.uniqueEdgeCount );
    assert.ok( congested.illuminatedSampleRatio < 1 );
} );

test( 'newly manifested routes never receive backdated packets', () => {
    const { form, hierarchy, positions } = createFixture();
    const parameters = {
        ...form,
        packetFrequency: 11,
        packetSpeed: 0.5
    };
    const layer = createEngineeredTreeLayer( hierarchy, positions, parameters );
    layer.update( 0, parameters );
    const initial = layer.group.userData.routedLight;
    const manifestedAtZero = new Set( initial.eligibleTerminalIds.filter( ( terminalId ) =>
        createInformationRoute( hierarchy, positions, terminalId, form.asymmetry )
            .nodes.every( ( node ) => !node.latent )
    ) );
    assert.ok( manifestedAtZero.size < initial.eligibleEmitterCount );

    const mature = new Map( hierarchy.nodes
        .filter( ( node ) => node.latent && node.growthEligible !== false )
        .map( ( node ) => [ node.id, 1 ] ) );
    layer.setGrowthProgress( mature );
    layer.update( 10, parameters );
    const matureTraffic = layer.group.userData.routedLight;
    const packetsFromNewRoutes = matureTraffic.activePackets.filter(
        ( packet ) => !manifestedAtZero.has( packet.terminalId )
    );

    assert.equal(
        matureTraffic.manifestedEmitterCount,
        matureTraffic.eligibleEmitterCount
    );
    assert.ok( packetsFromNewRoutes.length > 0 );
    assert.ok( packetsFromNewRoutes.every( ( packet ) => packet.emittedAt >= 10 ) );
} );

test( 'speed changes advance existing packets and frequency changes preserve them', () => {
    const { form, hierarchy, positions } = createFixture();
    const layer = createEngineeredTreeLayer( hierarchy, positions, form );
    const mature = new Map( hierarchy.nodes
        .filter( ( node ) => node.latent && node.growthEligible !== false )
        .map( ( node ) => [ node.id, 1 ] ) );
    layer.setGrowthProgress( mature );

    layer.update( 0, { ...form, packetSpeed: 0.5, packetFrequency: 11 } );
    const initial = layer.group.userData.routedLight.activePackets[0];
    assert.ok( initial );
    layer.update( 1, { ...form, packetSpeed: 0.5, packetFrequency: 11 } );
    const slow = layer.group.userData.routedLight.activePackets.find(
        ( packet ) => packet.id === initial.id
    );
    assert.ok( Math.abs( slow.headDistance - initial.headDistance - 0.5 ) < 1e-9 );

    layer.update( 2, { ...form, packetSpeed: 3, packetFrequency: 0.05 } );
    const accelerated = layer.group.userData.routedLight.activePackets.find(
        ( packet ) => packet.id === initial.id
    );
    assert.ok( accelerated );
    assert.ok( Math.abs( accelerated.headDistance - slow.headDistance - 3 ) < 1e-9 );
    assert.equal( layer.group.userData.routedLight.packetSpeed, 3 );
    assert.equal( layer.group.userData.routedLight.packetFrequency, 0.05 );
} );

test( 'a live default-to-maximum frequency upshift preserves packets without a burst', () => {
    function sampleUpshift()
    {
        const { form, hierarchy, positions } = createFixture();
        const defaultParameters = {
            ...form,
            packetFrequency: 0.2,
            packetSpeed: 0.5
        };
        const maximumParameters = { ...defaultParameters, packetFrequency: 11 };
        const layer = createEngineeredTreeLayer(
            hierarchy,
            positions,
            defaultParameters
        );
        const mature = new Map( hierarchy.nodes
            .filter( ( node ) => node.latent && node.growthEligible !== false )
            .map( ( node ) => [ node.id, 1 ] ) );
        layer.setGrowthProgress( mature );

        layer.update( 0, defaultParameters );
        layer.update( 7.3, defaultParameters );
        const before = layer.group.userData.routedLight;
        const survivorIds = before.activePackets.map( ( packet ) => packet.id );
        assert.ok( survivorIds.length > 0 );

        layer.update( 7.3, maximumParameters );
        const shifted = layer.group.userData.routedLight;
        assert.equal( shifted.emittedPacketCount, before.emittedPacketCount );
        assert.deepEqual(
            shifted.activePackets.map( ( packet ) => packet.id ),
            survivorIds
        );
        assert.ok( shifted.emissionSchedule.every( ( emitter ) =>
            emitter.nextEmissionAt > 7.3
        ) );

        layer.update( 8.3, maximumParameters );
        const after = layer.group.userData.routedLight;
        assert.ok( survivorIds.every( ( id ) =>
            after.activePackets.some( ( packet ) => packet.id === id )
        ) );
        const newPackets = after.activePackets
            .filter( ( packet ) => packet.emittedAt > 7.3 )
            .sort( ( left, right ) => left.emittedAt - right.emittedAt );
        assert.ok( newPackets.length > 1 );
        assert.equal(
            new Set( newPackets.map( ( packet ) => packet.id ) ).size,
            newPackets.length
        );
        assert.equal(
            new Set( newPackets.map( ( packet ) => packet.emittedAt ) ).size,
            newPackets.length,
            'the upshift must not collapse newly due packets onto one instant'
        );
        for ( let index = 1; index < newPackets.length; index += 1 )
        {
            assert.ok(
                Math.abs(
                    newPackets[index].emittedAt
                    - newPackets[index - 1].emittedAt
                    - 1 / 11
                ) < 1e-9,
                'post-upshift packets should retain maximum-rate phase spacing'
            );
        }

        return {
            before: before.activePackets.map( ( packet ) => ( {
                id: packet.id,
                emittedAt: packet.emittedAt,
                headDistance: packet.headDistance
            } ) ),
            shifted: shifted.activePackets.map( ( packet ) => ( {
                id: packet.id,
                emittedAt: packet.emittedAt,
                headDistance: packet.headDistance
            } ) ),
            after: after.activePackets.map( ( packet ) => ( {
                id: packet.id,
                emittedAt: packet.emittedAt,
                headDistance: packet.headDistance
            } ) ),
            schedule: after.emissionSchedule
        };
    }

    assert.deepEqual( sampleUpshift(), sampleUpshift() );
} );

test( 'traffic updates preserve the accepted graphite Tree geometry', () => {
    const { form, hierarchy, positions } = createFixture();
    const layer = createEngineeredTreeLayer( hierarchy, positions, form );
    const mature = new Map( hierarchy.nodes
        .filter( ( node ) => node.latent && node.growthEligible !== false )
        .map( ( node ) => [ node.id, 1 ] ) );
    layer.setGrowthProgress( mature );
    const protectedMeshes = [
        layer.group.getObjectByName( 'monumental trunk' ),
        layer.group.getObjectByName( 'assembly -> joining' )
    ];
    const snapshots = protectedMeshes.map( ( mesh ) => ( {
        material: mesh.material,
        positions: Array.from( mesh.geometry.getAttribute( 'position' ).array ),
        indices: Array.from( mesh.geometry.index.array )
    } ) );

    layer.update( 0, { ...form, packetFrequency: 0.05 } );
    const core = layer.group.getObjectByName( 'routed information core' );
    const coreGeometry = core.geometry;
    const meshCount = layer.group.children.length;
    layer.update( 20, { ...form, packetFrequency: 11 } );
    protectedMeshes.forEach( ( mesh, index ) => {
        assert.equal( mesh.material, snapshots[index].material );
        assert.deepEqual(
            Array.from( mesh.geometry.getAttribute( 'position' ).array ),
            snapshots[index].positions
        );
        assert.deepEqual( Array.from( mesh.geometry.index.array ), snapshots[index].indices );
    } );
    assert.equal( core.geometry, coreGeometry );
    assert.equal( layer.group.children.length, meshCount );
    assert.equal( layer.group.userData.routedLight.coreMeshCount, 1 );
} );

test( 'packet frequency restores the active review cadence', () => {
    const markup = readFileSync(
        new URL( '../../src/category-tree/tree/index.html', import.meta.url ),
        'utf8'
    );
    const mainSource = readFileSync(
        new URL( '../../src/category-tree/tree/main.js', import.meta.url ),
        'utf8'
    );

    assert.equal( [ ...markup.matchAll( /id="packet-speed"/g ) ].length, 1 );
    assert.equal( [ ...markup.matchAll( /id="packet-frequency"/g ) ].length, 1 );
    const frequencyControl = markup.match( /<input id="packet-frequency"[^>]*>/ )?.[0];
    assert.ok( frequencyControl );
    assert.match( frequencyControl, /min="0\.05"/ );
    assert.match( frequencyControl, /max="11(?:\.0+)?"/ );
    assert.match( frequencyControl, /step="0\.01"/ );
    assert.match( frequencyControl, /value="4\.00"/ );
    assert.match( mainSource, /packetFrequency:\s*4/ );
    assert.doesNotMatch( markup, /start-tier|Start tier/ );
    assert.doesNotMatch( mainSource, /informationStartTier|start-tier/ );
} );

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
    createInformationRoute,
    selectInformationTrafficTerminals
} from '../../src/lib/tree/engineered-tree-layer.js';
import {
    defaultTrunkRuneCandidateId,
    getTrunkRuneCandidateProfile,
    getTrunkRuneRouteDistances,
    trunkRuneCandidateIds,
    trunkRuneTransducerSite
} from '../../src/lib/tree/trunk-rune-layer.js';

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
        trunkRuneCandidateId: trunkRuneCandidateIds.internalArborescence,
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

function createMatureFixture( overrides = {} )
{
    const fixture = createFixture( overrides );
    fixture.layer.setGrowthProgress( new Map( fixture.hierarchy.nodes
        .filter( ( node ) => node.latent && node.growthEligible !== false )
        .map( ( node ) => [ node.id, 1 ] ) ) );
    return fixture;
}

function createRoute( fixture, terminalId )
{
    return createInformationRoute(
        fixture.hierarchy,
        fixture.positions,
        terminalId,
        fixture.form.asymmetry
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

function bufferFor( array )
{
    return Buffer.from( array.buffer, array.byteOffset, array.byteLength );
}

function assertByteEquivalent( actual, expected, message )
{
    assert.equal( Buffer.compare( bufferFor( actual ), bufferFor( expected ) ), 0,
        message );
}

function getDescriptor( fixture )
{
    return fixture.layer.getTrunkVisibilityResources().skeletonMesh.geometry
        .userData.trunkInterior.descriptor;
}

function expectedOwnerId( route, ownerIds )
{
    const matches = route.nodeIds.filter( ( nodeId ) => ownerIds.has( nodeId ) );
    assert.equal(
        matches.length,
        1,
        `route '${route.terminalId}' should map to exactly one C1 owner`
    );
    return matches[0];
}

function sampleCarrierCentreline( carrier, station )
{
    const pointCount = carrier.centreline.length / 3;
    const clamped = THREE.MathUtils.clamp( station, 0, pointCount - 1 );
    const left = Math.floor( clamped );
    const right = Math.min( pointCount - 1, left + 1 );
    return new THREE.Vector3()
        .fromArray( carrier.centreline, left * 3 )
        .lerp(
            new THREE.Vector3().fromArray( carrier.centreline, right * 3 ),
            clamped - left
        );
}

function rangeValues( geometry, range, attributeName )
{
    const attribute = geometry.getAttribute( attributeName );
    return Array.from(
        { length: range.vertexCount },
        ( _, offset ) => attribute.getX( range.vertexStart + offset )
    );
}

function sortRecords( records )
{
    return records.slice().sort( ( left, right ) =>
        left.id.localeCompare( right.id )
    );
}

function maximumAttributeDelta( left, right )
{
    assert.equal( left.length, right.length );
    let maximum = 0;
    for ( let index = 0; index < left.length; index += 1 )
    {
        maximum = Math.max( maximum, Math.abs( left[index] - right[index] ) );
    }
    return maximum;
}

function assertConserved( diagnostics )
{
    const conservation = diagnostics.conservation;
    assert.equal(
        diagnostics.entryCount,
        diagnostics.consumptionCount + conservation.internalSource
    );
    assert.equal( diagnostics.outputCount, diagnostics.consumptionCount );
    assert.equal(
        diagnostics.outputCount,
        diagnostics.centreResumeCount + conservation.internalOutput
    );
    assert.equal( conservation.entered, diagnostics.entryCount );
    assert.equal( conservation.inTraversal, diagnostics.activeTraversalCount );
    assert.equal( conservation.consumed, diagnostics.consumptionCount );
    assert.equal( conservation.produced, diagnostics.outputCount );
    assert.equal( conservation.resumed, diagnostics.centreResumeCount );
    assert.equal(
        conservation.internalSource + conservation.internalOutput,
        diagnostics.activeTraversalCount
    );
    assert.equal( conservation.sourceBalance, 0 );
    assert.equal( conservation.outputBalance, 0 );
    assert.equal( conservation.retainedSourceIdsUnique, true );
    assert.equal( conservation.retainedOutputIdsUnique, true );
}

test( 'C4c internal roots deterministically derive one exact path per C1 owner', () => {
    const expectedCounts = new Map( [
        [ 0, { terminals: 163, owners: 3 } ],
        [ 3, { terminals: 213, owners: 9 } ],
        [ 8, { terminals: 345, owners: 24 } ]
    ] );
    assert.equal(
        defaultTrunkRuneCandidateId,
        trunkRuneCandidateIds.internalArborescence
    );
    const profile = getTrunkRuneCandidateProfile(
        trunkRuneCandidateIds.internalArborescence
    );

    for ( const growthTiers of [ 0, 3, 8 ] )
    {
        const first = createFixture( { growthTiers } );
        const repeated = createFixture( { growthTiers } );
        const resources = first.layer.getTrunkRuneResources();
        const repeatedResources = repeated.layer.getTrunkRuneResources();
        const geometry = resources.geometry;
        const metadata = geometry.userData.trunkRunes;
        const descriptor = getDescriptor( first );
        const expected = expectedCounts.get( growthTiers );
        const ownerIds = new Set( descriptor.carriers.map(
            ( carrier ) => carrier.ownerId
        ) );
        const routes = selectInformationTrafficTerminals( first.hierarchy ).map(
            ( terminal ) => createRoute( first, terminal.id )
        );

        assert.equal( routes.length, expected.terminals );
        assert.equal( descriptor.carriers.length, expected.owners );
        assert.equal( metadata.pathCount, expected.owners );
        assert.equal( metadata.pathProfiles.length, expected.owners );
        assert.equal( metadata.pathRanges.length, expected.owners );
        assert.deepEqual(
            metadata.pathOwnerIds,
            Array.from( ownerIds ).sort()
        );
        for ( const route of routes ) expectedOwnerId( route, ownerIds );

        const referenceRoute = routes[0];
        const entrySegment = referenceRoute.byChildId.get(
            profile.routeEntryChildId
        );
        const exitSegment = referenceRoute.byChildId.get(
            profile.routeExitChildId
        );
        const expectedEntry = entrySegment.curve.getPointAt(
            profile.entryLocalProgress
        );
        const expectedExit = exitSegment.curve.getPointAt(
            profile.exitLocalProgress
        );
        const entryStation = ( 2 + profile.entryLocalProgress )
            * descriptor.samplesPerSpan;
        const exitStation = profile.exitLocalProgress
            * descriptor.samplesPerSpan;
        const carrierByOwner = new Map( descriptor.carriers.map( ( carrier ) => [
            carrier.ownerId,
            carrier
        ] ) );
        let vertexEnd = 0;
        let indexEnd = 0;

        for ( const path of metadata.pathProfiles )
        {
            const range = metadata.pathRanges[path.pathIndex];
            const carrier = carrierByOwner.get( path.ownerId );
            const controls = path.controlPoints;
            const centres = path.centrelinePoints;
            assert.ok( carrier, `'${path.ownerId}' must be an accepted C1 owner` );
            assert.equal( range.ownerId, path.ownerId );
            assert.equal( range.pathIndex, path.pathIndex );
            assert.equal( range.vertexStart, vertexEnd );
            assert.equal( range.indexStart, indexEnd );
            vertexEnd += range.vertexCount;
            indexEnd += range.indexCount;

            assertVectorNear(
                new THREE.Vector3().fromArray( path.centreEntryPoint ),
                expectedEntry,
                2e-6,
                `${path.ownerId} must enter on the authored centre route`
            );
            assertVectorNear(
                new THREE.Vector3().fromArray( path.centreResumePoint ),
                expectedExit,
                2e-6,
                `${path.ownerId} must resume on the authored centre route`
            );
            assertVectorNear(
                new THREE.Vector3().fromArray( centres, 0 ),
                expectedEntry
            );
            assertVectorNear(
                new THREE.Vector3().fromArray( centres, centres.length - 3 ),
                expectedExit
            );
            assertVectorNear(
                new THREE.Vector3().fromArray( controls, 3 ),
                sampleCarrierCentreline( carrier, entryStation ),
                2e-6,
                `${path.ownerId} ingress must meet its accepted C1 carrier`
            );
            assertVectorNear(
                new THREE.Vector3().fromArray( controls, controls.length - 6 ),
                sampleCarrierCentreline( carrier, exitStation ),
                2e-6,
                `${path.ownerId} egress must leave its accepted C1 carrier`
            );
            assert.ok( path.pathLength > expectedEntry.distanceTo( expectedExit ) );
            assertNear(
                path.internalTransformationDistance / path.pathLength,
                profile.transformationPhase,
                1e-12
            );
            assert.ok( rangeValues( geometry, range, 'runeOwner' ).every(
                ( value ) => value === path.pathIndex
            ) );
        }
        assert.equal( vertexEnd, geometry.getAttribute( 'position' ).count );
        assert.equal( indexEnd, geometry.index.count );
        assert.ok( metadata.minimumInheritedCarrierToShellClearance > 0 );
        assert.equal( metadata.minimumPathToShellClearance, null );
        assert.equal( metadata.insideOpaqueShell, null );
        assert.equal( metadata.exteriorSampleCount, null );
        assert.equal( metadata.shellCrossingSampleCount, null );
        assert.equal( metadata.continuousShellContainmentVerified, false );
        assert.equal(
            metadata.containmentEvidence,
            'accepted-c1-carrier-samples-and-exact-central-boundaries'
        );
        assert.equal( metadata.carrierCollisionFree, null );
        assert.equal(
            metadata.carrierClearanceModel,
            'selected-path-coincident-with-owner-and-shared-boundaries'
        );
        assert.deepEqual( metadata.coveredTrunkSpans, [
            {
                parentId: 'exchange',
                childId: 'meaning',
                spanIndex: 2,
                fromLocalProgress: 0.96,
                toLocalProgress: 0
            },
            {
                parentId: 'uptake',
                childId: 'exchange',
                spanIndex: 1,
                fromLocalProgress: 1,
                toLocalProgress: 0
            },
            {
                parentId: 'planting-root',
                childId: 'uptake',
                spanIndex: 0,
                fromLocalProgress: 1,
                toLocalProgress: 0.04
            }
        ] );

        for ( const attributeName of [
            'position',
            'normal',
            'runePhase',
            'runeOwner',
            'runeSignal',
            'runeWarmth'
        ] )
        {
            assertByteEquivalent(
                geometry.getAttribute( attributeName ).array,
                repeatedResources.geometry.getAttribute( attributeName ).array,
                `tier-${growthTiers} ${attributeName} must be deterministic`
            );
        }
        assertByteEquivalent(
            geometry.index.array,
            repeatedResources.geometry.index.array,
            `tier-${growthTiers} indices must be deterministic`
        );
    }
} );

test( 'one packet illuminates only its authored internal root and resumes once', () => {
    const fixture = createFixture( { packetFrequency: 0.01 } );
    fixture.layer.update( 0, fixture.form );
    const resources = fixture.layer.getTrunkRuneResources();
    const metadata = resources.geometry.userData.trunkRunes;
    const ownerIds = new Set( metadata.pathOwnerIds );
    const source = fixture.layer.group.userData.routedLight.activePackets[0];
    const route = createRoute( fixture, source.terminalId );
    const ownerId = expectedOwnerId( route, ownerIds );
    const path = metadata.pathProfiles.find( ( candidate ) =>
        candidate.ownerId === ownerId
    );
    const selectedRange = metadata.pathRanges[path.pathIndex];
    const boundaries = getTrunkRuneRouteDistances(
        route,
        trunkRuneTransducerSite,
        trunkRuneCandidateIds.internalArborescence
    );
    const enteredAt = source.emittedAt
        + boundaries.entryDistance / fixture.form.packetSpeed;

    fixture.layer.update( enteredAt - 0.001, fixture.form );
    assert.equal( fixture.layer.group.userData.trunkRunes.entryCount, 0 );
    assert.ok( Array.from(
        resources.geometry.getAttribute( 'runeSignal' ).array
    ).every( ( value ) => value === 0 ) );

    fixture.layer.update(
        enteredAt + path.pathLength * 0.2 / fixture.form.packetSpeed,
        fixture.form
    );
    let diagnostics = fixture.layer.group.userData.trunkRunes;
    let traversal = diagnostics.activeTraversals[0];
    assert.equal( diagnostics.activeTraversalCount, 1 );
    assert.equal( traversal.sourcePacketId, source.id );
    assert.equal( traversal.pathOwnerId, ownerId );
    assert.equal( traversal.pathIndex, path.pathIndex );
    assertNear( traversal.pathLength, path.pathLength, 1e-12 );
    assert.equal( diagnostics.entryRecords[0].pathOwnerId, ownerId );
    assert.equal( diagnostics.rendererEligible, true );
    assert.equal( resources.mesh.visible, false );
    assert.ok( Math.max( ...rangeValues(
        resources.geometry,
        selectedRange,
        'runeSignal'
    ) ) > 0.99 );
    for ( const range of metadata.pathRanges )
    {
        if ( range.ownerId === ownerId ) continue;
        assert.ok( rangeValues( resources.geometry, range, 'runeSignal' )
            .every( ( value ) => value === 0 ),
        `packet on '${ownerId}' must not illuminate '${range.ownerId}'` );
    }
    assertConserved( diagnostics );

    fixture.layer.update(
        enteredAt + path.pathLength * 0.8 / fixture.form.packetSpeed,
        fixture.form
    );
    diagnostics = fixture.layer.group.userData.trunkRunes;
    traversal = diagnostics.activeTraversals[0];
    const outputId = `${source.id}::meaning-transducer::output`;
    assert.equal( traversal.phase, 'internal-output' );
    assert.equal( traversal.pathOwnerId, ownerId );
    assert.equal( traversal.outputPacketId, outputId );
    assert.equal( diagnostics.entryCount, 1 );
    assert.equal( diagnostics.consumptionCount, 1 );
    assert.equal( diagnostics.outputCount, 1 );
    assert.equal( diagnostics.centreResumeCount, 0 );
    assert.equal( diagnostics.aggregation, false );
    assert.equal( diagnostics.spatialConvergenceClaim, false );
    const record = diagnostics.transductionRecords[0];
    assert.ok( Object.isFrozen( record ) );
    assert.equal( record.pathOwnerId, ownerId );
    assert.equal( record.pathIndex, path.pathIndex );
    assert.equal( record.sourcePacketId, source.id );
    assert.equal( record.outputPacketId, outputId );
    assert.equal( record.provenanceCardinality, 1 );
    assert.equal( record.provenance.length, 1 );
    assert.equal( record.provenance[0].sourcePacketId, source.id );
    assert.equal( record.provenance[0].pathOwnerId, ownerId );
    assert.equal( record.aggregation, false );
    assertConserved( diagnostics );

    fixture.layer.update(
        enteredAt + path.pathLength / fixture.form.packetSpeed + 0.000001,
        fixture.form
    );
    diagnostics = fixture.layer.group.userData.trunkRunes;
    assert.equal( diagnostics.activeTraversalCount, 0 );
    assert.equal( diagnostics.centreResumeCount, 1 );
    assert.equal( diagnostics.centreResumeRecords[0].pathOwnerId, ownerId );
    assert.equal( diagnostics.rendererEligible, false );
    assert.ok( Array.from(
        resources.geometry.getAttribute( 'runeSignal' ).array
    ).every( ( value ) => value === 0 ) );
    assert.ok( Array.from(
        resources.geometry.getAttribute( 'runeWarmth' ).array
    ).every( ( value ) => value === 0 ) );
    const output = fixture.layer.group.userData.routedLight.activePackets.find(
        ( packet ) => packet.id === outputId
    );
    assert.ok( output );
    assert.equal( output.kind, 'transduced-output' );
    assert.equal( output.sourcePacketId, source.id );
    assert.deepEqual( output.provenance, record.provenance );
    assertConserved( diagnostics );
} );

test( '11 Hz traffic retains identities across multiple and shared root paths', () => {
    const parameters = { packetFrequency: 11, packetSpeed: 0.5 };
    const fine = createMatureFixture( parameters );
    const coarse = createMatureFixture( parameters );
    fine.layer.update( 0, fine.form );
    for ( let step = 1; step <= 60; step += 1 )
    {
        fine.layer.update( step * 0.5, fine.form );
    }
    coarse.layer.update( 0, coarse.form );
    coarse.layer.update( 30, coarse.form );

    const diagnostics = fine.layer.group.userData.trunkRunes;
    const coarseDiagnostics = coarse.layer.group.userData.trunkRunes;
    const resources = fine.layer.getTrunkRuneResources();
    const ownerIds = new Set( diagnostics.pathOwnerIds );
    const ownerCounts = new Map();
    for ( const traversal of diagnostics.activeTraversals )
    {
        const expectedOwner = expectedOwnerId(
            createRoute( fine, traversal.terminalId ),
            ownerIds
        );
        assert.equal( traversal.pathOwnerId, expectedOwner );
        ownerCounts.set(
            traversal.pathOwnerId,
            ( ownerCounts.get( traversal.pathOwnerId ) ?? 0 ) + 1
        );
    }
    assert.ok( diagnostics.activeTraversalCount > 1 );
    assert.ok( ownerCounts.size > 1, 'traffic must occupy multiple root owners' );
    assert.ok( Math.max( ...ownerCounts.values() ) > 1,
        'independent packets must share at least one root owner' );
    assert.equal(
        new Set( diagnostics.activeCausalPacketIds ).size,
        diagnostics.activeCausalPacketIds.length
    );
    assert.ok( diagnostics.entryCount > diagnostics.activeTraversalCount );
    assert.ok( diagnostics.outputCount > 0 );

    for ( const entry of diagnostics.entryRecords )
    {
        assert.equal(
            entry.pathOwnerId,
            expectedOwnerId( createRoute( fine, entry.terminalId ), ownerIds )
        );
    }
    for ( const record of diagnostics.transductionRecords )
    {
        assert.equal( record.mode, 'one-to-one' );
        assert.equal( record.aggregation, false );
        assert.equal( record.provenanceCardinality, 1 );
        assert.equal( record.provenance.length, 1 );
        assert.equal( record.provenance[0].sourcePacketId, record.sourcePacketId );
        assert.equal( record.provenance[0].pathOwnerId, record.pathOwnerId );
        assert.equal(
            record.outputPacketId,
            `${record.sourcePacketId}::meaning-transducer::output`
        );
    }
    assert.equal( diagnostics.mode, 'one-to-one' );
    assert.equal( diagnostics.aggregation, false );
    assert.equal( diagnostics.spatialConvergenceClaim, false );
    assert.equal( diagnostics.visualSampling.packetLoss, false );
    assert.equal( diagnostics.visualSampling.aggregation, false );
    assertConserved( diagnostics );

    assert.equal( coarseDiagnostics.entryCount, diagnostics.entryCount );
    assert.equal( coarseDiagnostics.outputCount, diagnostics.outputCount );
    assert.equal(
        coarseDiagnostics.centreResumeCount,
        diagnostics.centreResumeCount
    );
    assert.deepEqual(
        sortRecords( coarseDiagnostics.entryRecords ),
        sortRecords( diagnostics.entryRecords )
    );
    assert.deepEqual(
        sortRecords( coarseDiagnostics.transductionRecords ),
        sortRecords( diagnostics.transductionRecords )
    );
    assert.deepEqual(
        sortRecords( coarseDiagnostics.centreResumeRecords ),
        sortRecords( diagnostics.centreResumeRecords )
    );
    assert.ok( maximumAttributeDelta(
        coarse.layer.getTrunkRuneResources().geometry
            .getAttribute( 'runeSignal' ).array,
        resources.geometry.getAttribute( 'runeSignal' ).array
    ) <= 1e-7, 'internal-root signal must be cadence independent to float precision' );
    assertByteEquivalent(
        coarse.layer.getTrunkRuneResources().geometry
            .getAttribute( 'runeWarmth' ).array,
        resources.geometry.getAttribute( 'runeWarmth' ).array,
        'internal-root colour must be cadence independent'
    );
    assertConserved( coarseDiagnostics );
} );

test( 'C4c rendering is packet-gated and renderer-owned without changing the Tree', () => {
    const internal = createFixture();
    const optical = createFixture( {
        trunkRuneCandidateId: trunkRuneCandidateIds.opticalFibre
    } );
    const resources = internal.layer.getTrunkRuneResources();
    const metadata = resources.geometry.userData.trunkRunes;
    const diagnostics = internal.layer.group.userData.trunkRunes;
    const trunk = internal.layer.group.getObjectByName( 'monumental trunk' );
    const opticalTrunk = optical.layer.group.getObjectByName( 'monumental trunk' );
    const branch = internal.layer.group.getObjectByName( 'meaning -> operations' );
    const opticalBranch = optical.layer.group.getObjectByName(
        'meaning -> operations'
    );
    const core = internal.layer.group.getObjectByName( 'routed information core' );
    const opticalCore = optical.layer.group.getObjectByName(
        'routed information core'
    );

    assert.equal( resources.candidateId,
        trunkRuneCandidateIds.internalArborescence );
    assert.equal( resources.mesh.name,
        'event-revealed internal information arborescence' );
    assert.equal( resources.mesh.visible, false );
    assert.equal( resources.granuleMesh, null );
    assert.equal( resources.granuleGeometry, null );
    assert.equal( resources.material.userData.rendererOwned, true );
    assert.equal( resources.material.userData.idleLuminosity, 0 );
    assert.equal( resources.material.userData.packetOnlyDisclosure, true );
    assert.equal( resources.material.userData.mostlyInvisibleAtIdle, true );
    assert.equal( resources.material.userData.motionModel,
        'shared-tree-deformation' );
    assert.notEqual( resources.ownershipGeometry, trunk.geometry );
    assert.notEqual( resources.proxyGeometry, trunk.geometry );
    const ownership = resources.ownershipGeometry.userData
        .internalRootVisibilityOwnership;
    const proxy = resources.proxyGeometry.userData.internalRootVisibilityProxy;
    assert.ok( ownership );
    assert.ok( proxy );
    assert.equal( ownership.entrySpanIndex, 2 );
    assert.equal( ownership.exitSpanIndex, 0 );
    assert.equal( ownership.fullCircumference, true );
    assert.ok( ownership.cellCount > 0 );
    assert.ok( ownership.triangleCount > 0 );
    assert.equal( proxy.entrySpanIndex, 2 );
    assert.equal( proxy.exitSpanIndex, 0 );
    assert.equal( proxy.closed, true );
    assert.ok( proxy.ringCount > 1 );
    assert.ok( proxy.triangleCount > 0 );
    assertByteEquivalent(
        resources.ownershipGeometry.getAttribute( 'position' ).array,
        trunk.geometry.getAttribute( 'position' ).array,
        'the ownership shell must reuse the accepted trunk positions'
    );
    assert.equal( diagnostics.rendererEligible, false );
    assert.equal( diagnostics.visible, false );
    assert.equal( diagnostics.activeDrawCalls, 0 );
    assert.equal( diagnostics.meshCount, 1 );
    assert.equal( diagnostics.maximumDrawCalls, 1 );
    assert.equal( metadata.rendering,
        'depth-aware-packet-gated-subsurface-transmission' );
    assert.equal( diagnostics.insideOpaqueShell, null );
    assert.equal( diagnostics.carrierCollisionFree, null );
    assert.equal( diagnostics.continuousShellContainmentVerified, false );
    assert.ok( diagnostics.minimumInheritedCarrierToShellClearance > 0 );
    assert.deepEqual( metadata.renderContract, {
        activation: 'genuine-traversal-only',
        mainSceneMeshVisible: false,
        persistentGoldStructure: false,
        packetOnlyDisclosure: true,
        mostlyInvisibleAtIdle: true,
        gradualRootwardColour: true,
        multiSpanPath: true,
        transformationGranule: false,
        idleLuminosity: 0,
        activeExtraPassCount: 5,
        ordinaryDepthOnly: false,
        depthAwareSubsurface: true,
        greaterDepth: false,
        cameraFacing: false,
        aperture: false,
        c1InventoryVisible: false,
        bloomRequired: false
    } );
    assert.equal( metadata.objectSpace, true );
    assert.equal( metadata.cameraFacing, false );
    assert.equal( metadata.pathFrame.cameraIndependent, true );
    assert.equal( metadata.pathFrame.model,
        'accepted-c1-object-space-carrier-family' );

    for ( const [ candidate, baseline, label ] of [
        [ trunk, opticalTrunk, 'trunk' ],
        [ branch, opticalBranch, 'branch' ],
        [ core, opticalCore, 'routed core' ]
    ] )
    {
        assertByteEquivalent(
            candidate.geometry.getAttribute( 'position' ).array,
            baseline.geometry.getAttribute( 'position' ).array,
            `${label} positions must not change with the C4c candidate`
        );
        assertByteEquivalent(
            candidate.geometry.index.array,
            baseline.geometry.index.array,
            `${label} indices must not change with the C4c candidate`
        );
    }

    const runeSource = readFileSync(
        new URL( '../../src/lib/tree/trunk-rune-layer.js', import.meta.url ),
        'utf8'
    );
    const rendererSource = readFileSync(
        new URL(
            '../../src/lib/tree/trunk-visibility-renderer.js',
            import.meta.url
        ),
        'utf8'
    );
    assert.equal( runeSource.includes( 'THREE.GreaterDepth' ), false );
    assert.equal( rendererSource.includes( 'THREE.GreaterDepth' ), false );
    assert.match( rendererSource, /frontDepth/ );
    assert.match( rendererSource, /backDepth/ );
    assert.match( rendererSource, /nearest active rune depth/ );
    assert.match( rendererSource, /burialDependent: true/ );
    assert.match( rendererSource, /cameraFacing: false/ );
    assert.match( rendererSource, /persistentDisclosure: false/ );
} );

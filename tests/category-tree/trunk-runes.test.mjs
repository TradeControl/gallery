import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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
    createTrunkRuneGeometry,
    createTrunkRuneGranuleGeometry,
    getTrunkRuneAdmission,
    getTrunkRuneCandidateProfile,
    getTrunkRuneRouteDistance,
    getTrunkRuneRouteDistances,
    trunkRuneCandidateIds,
    trunkRuneCandidateProfiles,
    trunkRuneFullAdmissionFrequency,
    trunkRuneManifestationDuration,
    trunkRuneSites,
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
        // C4a evidence remains independently selectable even though the live
        // bounded experiment advances to C4b-O1.
        trunkRuneCandidateId: trunkRuneCandidateIds.longitudinal,
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

function createOpticalFixture( overrides = {} )
{
    return createFixture( {
        trunkRuneCandidateId: trunkRuneCandidateIds.opticalFibre,
        ...overrides
    } );
}

function createMatureOpticalFixture( overrides = {} )
{
    const fixture = createOpticalFixture( overrides );
    fixture.layer.setGrowthProgress( matureProgress( fixture.hierarchy ) );
    return fixture;
}

function assertNear( actual, expected, tolerance = 1e-8, message = '' )
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
        message || `${actual.toArray()} must connect to ${expected.toArray()}`
    );
}

function copyAttribute( geometry, name )
{
    return geometry.getAttribute( name ).array.slice();
}

function assertAttributeEquals( geometry, name, expected, message )
{
    assert.deepEqual( geometry.getAttribute( name ).array, expected, message );
}

function getRoute( fixture, terminalId )
{
    return createInformationRoute(
        fixture.hierarchy,
        fixture.positions,
        terminalId,
        fixture.form.asymmetry
    );
}

function deriveRouteBoundaries(
    route,
    candidateId = trunkRuneCandidateIds.longitudinal
)
{
    const segment = route.byChildId.get( trunkRuneTransducerSite.childId );
    assert.ok( segment );
    assert.equal( segment.parentId, trunkRuneTransducerSite.parentId );
    const profile = getTrunkRuneCandidateProfile( candidateId );
    const entryLocalProgress = profile.entryLocalProgress;
    const exitLocalProgress = profile.exitLocalProgress;
    const distanceAt = ( progress ) => THREE.MathUtils.lerp(
        segment.parentDistance,
        segment.childDistance,
        progress
    );
    return {
        segment,
        entryLocalProgress,
        exitLocalProgress,
        entryDistance: distanceAt( entryLocalProgress ),
        exitDistance: distanceAt( exitLocalProgress ),
        entryPoint: segment.curve.getPointAt( entryLocalProgress ),
        exitPoint: segment.curve.getPointAt( exitLocalProgress )
    };
}

function hashTypedArray( array )
{
    return createHash( 'sha256' )
        .update( Buffer.from( array.buffer, array.byteOffset, array.byteLength ) )
        .digest( 'hex' );
}

function createCandidateGeometry( fixture, candidateId )
{
    const trunk = fixture.layer.group.getObjectByName( 'monumental trunk' );
    const trunkData = trunk.userData.monumentalTrunk;
    const descriptor = fixture.layer.getTrunkVisibilityResources()
        .skeletonMesh.geometry.userData.trunkInterior.descriptor;
    const geometry = createTrunkRuneGeometry(
        trunk.geometry,
        trunkData.nodes,
        trunkData.informationRoute,
        descriptor,
        candidateId
    );
    const granuleGeometry = createTrunkRuneGranuleGeometry( geometry );
    return { geometry, granuleGeometry, trunk, descriptor };
}

function getTubeCentres( geometry )
{
    const metadata = geometry.userData.trunkRunes;
    const position = geometry.getAttribute( 'position' );
    const ringSize = metadata.radialSegments + 1;
    return Array.from( { length: metadata.tubularSegments + 1 }, ( _, ring ) => {
        const centre = new THREE.Vector3();
        for ( let side = 0; side < metadata.radialSegments; side += 1 )
        {
            centre.add( new THREE.Vector3().fromBufferAttribute(
                position,
                ring * ringSize + side
            ) );
        }
        return centre.multiplyScalar( 1 / metadata.radialSegments );
    } );
}

function derivePolylineArc( points )
{
    const cumulative = [ 0 ];
    for ( let index = 1; index < points.length; index += 1 )
    {
        cumulative.push(
            cumulative[index - 1] + points[index - 1].distanceTo( points[index] )
        );
    }
    return { cumulative, total: cumulative.at( -1 ) };
}

function pointAtPolylineDistance( points, cumulative, distance )
{
    const clamped = THREE.MathUtils.clamp( distance, 0, cumulative.at( -1 ) );
    let index = 1;
    while ( index < cumulative.length && cumulative[index] < clamped ) index += 1;
    if ( index >= cumulative.length ) return points.at( -1 ).clone();
    const span = cumulative[index] - cumulative[index - 1];
    const amount = span > 1e-12
        ? ( clamped - cumulative[index - 1] ) / span
        : 0;
    return points[index - 1].clone().lerp( points[index], amount );
}

function pointSegmentDistance( point, start, end )
{
    const segment = end.clone().sub( start );
    const lengthSquared = segment.lengthSq();
    if ( lengthSquared < 1e-12 ) return point.distanceTo( start );
    const amount = THREE.MathUtils.clamp(
        point.clone().sub( start ).dot( segment ) / lengthSquared,
        0,
        1
    );
    return point.distanceTo( start.clone().addScaledVector( segment, amount ) );
}

function minimumCarrierClearance( centres, descriptor, tubeRadius )
{
    let minimum = Number.POSITIVE_INFINITY;
    for ( const carrier of descriptor.carriers )
    {
        for ( const centre of centres )
        {
            for ( let index = 0; index + 5 < carrier.centreline.length; index += 3 )
            {
                const start = new THREE.Vector3().fromArray(
                    carrier.centreline,
                    index
                );
                const end = new THREE.Vector3().fromArray(
                    carrier.centreline,
                    index + 3
                );
                minimum = Math.min(
                    minimum,
                    pointSegmentDistance( centre, start, end )
                        - tubeRadius - carrier.radius
                );
            }
        }
    }
    return minimum;
}

function getRingCentreAndRadius( trunkGeometry, ring )
{
    const metadata = trunkGeometry.userData.monumentalTrunk;
    const position = trunkGeometry.getAttribute( 'position' );
    const centre = new THREE.Vector3();
    for ( let side = 0; side < metadata.radialSegments; side += 1 )
    {
        centre.add( new THREE.Vector3().fromBufferAttribute(
            position,
            ring * metadata.radialSegments + side
        ) );
    }
    centre.multiplyScalar( 1 / metadata.radialSegments );
    let radius = Number.POSITIVE_INFINITY;
    let maximumRadius = 0;
    for ( let side = 0; side < metadata.radialSegments; side += 1 )
    {
        const sampleRadius = new THREE.Vector3().fromBufferAttribute(
            position,
            ring * metadata.radialSegments + side
        ).distanceTo( centre );
        radius = Math.min( radius, sampleRadius );
        maximumRadius = Math.max( maximumRadius, sampleRadius );
    }
    return { centre, radius, maximumRadius };
}

function measureRenderedTubeShellRelationship( runeGeometry, trunkGeometry )
{
    const rune = runeGeometry.userData.trunkRunes;
    const trunk = trunkGeometry.userData.monumentalTrunk;
    const spanStartRing = 1 + rune.spanIndex * trunk.samplesPerSpan;
    const startRing = Math.max(
        1,
        Math.floor( spanStartRing + rune.exitLocalProgress * trunk.samplesPerSpan ) - 1
    );
    const endRing = Math.min(
        trunk.sideVertexCount / trunk.radialSegments - 1,
        Math.ceil( spanStartRing + rune.entryLocalProgress * trunk.samplesPerSpan ) + 1
    );
    const shell = [];
    for ( let ring = startRing; ring <= endRing; ring += 1 )
    {
        shell.push( getRingCentreAndRadius( trunkGeometry, ring ) );
    }
    const position = runeGeometry.getAttribute( 'position' );
    const ringSize = rune.radialSegments + 1;
    const clearances = [];
    let minimum = Number.POSITIVE_INFINITY;
    let maximum = Number.NEGATIVE_INFINITY;
    for ( let index = 0; index < position.count; index += 1 )
    {
        const vertex = new THREE.Vector3().fromBufferAttribute( position, index );
        const station = shell.reduce( ( nearest, candidate ) =>
            vertex.distanceToSquared( candidate.centre )
                < vertex.distanceToSquared( nearest.centre )
                ? candidate
                : nearest
        );
        const clearance = station.radius - vertex.distanceTo( station.centre );
        clearances.push( clearance );
        minimum = Math.min( minimum, clearance );
        maximum = Math.max( maximum, clearance );
    }
    const entryClearances = clearances.slice( 0, ringSize );
    const exitClearances = clearances.slice( -ringSize );
    return {
        minimum,
        maximum,
        exteriorVertexCount: clearances.filter( ( value ) => value < -1e-4 ).length,
        buriedVertexCount: clearances.filter( ( value ) => value > 1e-4 ).length,
        minimumEntryClearance: Math.min( ...entryClearances ),
        minimumExitClearance: Math.min( ...exitClearances )
    };
}

function measureCentrelineShellRelationship( runeGeometry, trunkGeometry )
{
    const rune = runeGeometry.userData.trunkRunes;
    const trunk = trunkGeometry.userData.monumentalTrunk;
    const spanStartRing = 1 + rune.spanIndex * trunk.samplesPerSpan;
    const startRing = Math.max(
        1,
        Math.floor( spanStartRing + rune.exitLocalProgress * trunk.samplesPerSpan ) - 2
    );
    const endRing = Math.min(
        trunk.sideVertexCount / trunk.radialSegments - 1,
        Math.ceil( spanStartRing + rune.entryLocalProgress * trunk.samplesPerSpan ) + 2
    );
    const shell = [];
    for ( let ring = startRing; ring <= endRing; ring += 1 )
    {
        shell.push( getRingCentreAndRadius( trunkGeometry, ring ) );
    }
    const centres = Array.from(
        { length: rune.centrelinePoints.length / 3 },
        ( _, index ) => new THREE.Vector3().fromArray(
            rune.centrelinePoints,
            index * 3
        )
    );
    let buriedSampleCount = 0;
    let shellCrossingSampleCount = 0;
    let exteriorSampleCount = 0;
    let maximumExteriorProtrusion = 0;
    const classifications = [];
    for ( const centre of centres )
    {
        const station = shell.reduce( ( nearest, candidate ) =>
            centre.distanceToSquared( candidate.centre )
                < centre.distanceToSquared( nearest.centre )
                ? candidate
                : nearest
        );
        const offset = centre.distanceTo( station.centre );
        const clearance = station.maximumRadius - offset - rune.tubeRadius;
        maximumExteriorProtrusion = Math.max(
            maximumExteriorProtrusion,
            -clearance
        );
        if ( clearance > rune.tubeRadius )
        {
            buriedSampleCount += 1;
            classifications.push( 'buried' );
        }
        else if ( offset - rune.tubeRadius > station.maximumRadius )
        {
            exteriorSampleCount += 1;
            classifications.push( 'exterior' );
        }
        else
        {
            shellCrossingSampleCount += 1;
            classifications.push( 'crossing' );
        }
    }
    return {
        centres,
        buriedSampleCount,
        shellCrossingSampleCount,
        exteriorSampleCount,
        maximumExteriorProtrusion,
        classifications
    };
}

function deriveRevealBands( relationship, entryPoint, exitPoint )
{
    const axis = exitPoint.clone().sub( entryPoint ).normalize();
    const bands = [];
    let current = null;
    for ( let index = 0; index < relationship.centres.length; index += 1 )
    {
        const revealed = relationship.classifications[index] !== 'buried';
        if ( !revealed )
        {
            if ( current ) bands.push( current );
            current = null;
            continue;
        }
        const projection = relationship.centres[index].clone()
            .sub( entryPoint ).dot( axis );
        if ( current === null )
        {
            current = {
                startIndex: index,
                endIndex: index,
                minimumProjection: projection,
                maximumProjection: projection
            };
            continue;
        }
        current.endIndex = index;
        current.minimumProjection = Math.min(
            current.minimumProjection,
            projection
        );
        current.maximumProjection = Math.max(
            current.maximumProjection,
            projection
        );
    }
    if ( current ) bands.push( current );
    return bands.filter( ( band ) => band.endIndex - band.startIndex + 1 >= 3 )
        .map( ( band ) => ( {
            ...band,
            centreProjection:
                ( band.minimumProjection + band.maximumProjection ) * 0.5
        } ) );
}

function measureAxialEnvelope( centres, entryPoint, exitPoint )
{
    const axis = exitPoint.clone().sub( entryPoint ).normalize();
    let minimumLongitudinal = Number.POSITIVE_INFINITY;
    let maximumLongitudinal = Number.NEGATIVE_INFINITY;
    const transverseOffsets = [];
    for ( const centre of centres )
    {
        const relative = centre.clone().sub( entryPoint );
        const longitudinal = relative.dot( axis );
        minimumLongitudinal = Math.min( minimumLongitudinal, longitudinal );
        maximumLongitudinal = Math.max( maximumLongitudinal, longitudinal );
        transverseOffsets.push(
            relative.addScaledVector( axis, -longitudinal )
        );
    }
    let transverseExtent = 0;
    for ( let left = 0; left < transverseOffsets.length; left += 1 )
    {
        for ( let right = left + 1; right < transverseOffsets.length; right += 1 )
        {
            transverseExtent = Math.max(
                transverseExtent,
                transverseOffsets[left].distanceTo( transverseOffsets[right] )
            );
        }
    }
    return {
        longitudinalExtent: maximumLongitudinal - minimumLongitudinal,
        transverseExtent
    };
}

function approximateCurveIntervalLength( curve, from, to, divisions = 48 )
{
    let length = 0;
    let previous = curve.getPointAt( from );
    for ( let step = 1; step <= divisions; step += 1 )
    {
        const progress = THREE.MathUtils.lerp( from, to, step / divisions );
        const point = curve.getPointAt( progress );
        length += previous.distanceTo( point );
        previous = point;
    }
    return length;
}

function getDirectionalShellRadius(
    position,
    ring,
    radialSegments,
    centre,
    radial,
    tangent
)
{
    const lateral = new THREE.Vector3().crossVectors( tangent, radial );
    if ( lateral.lengthSq() < 1e-10 ) lateral.set( 0, 0, 1 );
    lateral.normalize();
    let intersection = Number.NEGATIVE_INFINITY;
    let fallback = 0;
    for ( let side = 0; side < radialSegments; side += 1 )
    {
        const next = ( side + 1 ) % radialSegments;
        const start = new THREE.Vector3().fromBufferAttribute(
            position,
            ring * radialSegments + side
        ).sub( centre );
        const end = new THREE.Vector3().fromBufferAttribute(
            position,
            ring * radialSegments + next
        ).sub( centre );
        const startX = start.dot( radial );
        const startY = start.dot( lateral );
        const endX = end.dot( radial );
        const endY = end.dot( lateral );
        fallback = Math.max( fallback, startX, endX );
        const denominator = endY - startY;
        if ( Math.abs( denominator ) < 1e-10 ) continue;
        const amount = -startY / denominator;
        if ( amount < -1e-8 || amount > 1 + 1e-8 ) continue;
        const x = THREE.MathUtils.lerp( startX, endX, amount );
        if ( x > 0 ) intersection = Math.max( intersection, x );
    }
    return Number.isFinite( intersection ) ? intersection : fallback;
}

function pearsonCorrelation( left, right )
{
    assert.equal( left.length, right.length );
    const leftMean = left.reduce( ( sum, value ) => sum + value, 0 )
        / left.length;
    const rightMean = right.reduce( ( sum, value ) => sum + value, 0 )
        / right.length;
    let numerator = 0;
    let leftVariance = 0;
    let rightVariance = 0;
    for ( let index = 0; index < left.length; index += 1 )
    {
        const leftDelta = left[index] - leftMean;
        const rightDelta = right[index] - rightMean;
        numerator += leftDelta * rightDelta;
        leftVariance += leftDelta * leftDelta;
        rightVariance += rightDelta * rightDelta;
    }
    return numerator / Math.sqrt( leftVariance * rightVariance );
}

function measureOpticalShellRelationship( fixture )
{
    const resources = fixture.layer.getTrunkRuneResources();
    const geometry = resources.geometry;
    const metadata = geometry.userData.trunkRunes;
    const trunk = fixture.layer.group.getObjectByName( 'monumental trunk' );
    const trunkGeometry = trunk.geometry;
    const trunkMetadata = trunkGeometry.userData.monumentalTrunk;
    const trunkPosition = trunkGeometry.getAttribute( 'position' );
    const route = trunk.userData.monumentalTrunk.informationRoute;
    const spans = metadata.coveredTrunkSpans.map( ( definition ) => {
        const segment = route.byChildId.get( definition.childId );
        assert.ok( segment );
        assert.equal( segment.parentId, definition.parentId );
        return {
            ...definition,
            segment,
            length: approximateCurveIntervalLength(
                segment.curve,
                definition.fromLocalProgress,
                definition.toLocalProgress
            )
        };
    } );
    const totalCentrelineLength = spans.reduce(
        ( sum, span ) => sum + span.length,
        0
    );
    const controlPoints = Array.from(
        { length: metadata.controlPoints.length / 3 },
        ( _, index ) => new THREE.Vector3().fromArray(
            metadata.controlPoints,
            index * 3
        )
    );
    const opticalCurve = new THREE.CatmullRomCurve3(
        controlPoints,
        false,
        'centripetal',
        0.45
    );
    const centres = getTubeCentres( geometry );
    const samples = centres.map( ( centre, index ) => {
        const pathPhase = index / ( centres.length - 1 );
        const parameter = opticalCurve.getUtoTmapping( pathPhase );
        let remaining = parameter * totalCentrelineLength;
        let span = spans.at( -1 );
        for ( const candidate of spans )
        {
            span = candidate;
            if ( remaining <= candidate.length + 1e-9 ) break;
            remaining -= candidate.length;
        }
        const spanProgress = span.length > 1e-9
            ? THREE.MathUtils.clamp( remaining / span.length, 0, 1 )
            : 0;
        const localProgress = THREE.MathUtils.lerp(
            span.fromLocalProgress,
            span.toLocalProgress,
            spanProgress
        );
        const tangent = span.segment.curve.getTangentAt( localProgress )
            .negate().normalize();
        const ringValue = 1 + span.spanIndex * trunkMetadata.samplesPerSpan
            + localProgress * trunkMetadata.samplesPerSpan;
        const ring0 = Math.floor( ringValue );
        const ring1 = Math.min(
            trunkMetadata.sideVertexCount / trunkMetadata.radialSegments - 1,
            ring0 + 1
        );
        const amount = ringValue - ring0;
        const centre0 = getRingCentreAndRadius( trunkGeometry, ring0 ).centre;
        const centre1 = getRingCentreAndRadius( trunkGeometry, ring1 ).centre;
        const shellCentre = centre0.clone().lerp( centre1, amount );
        const radial = centre.clone().sub( shellCentre );
        radial.addScaledVector( tangent, -radial.dot( tangent ) );
        const radialOffset = radial.length();
        const radialDirection = radialOffset > 1e-9
            ? radial.clone().multiplyScalar( 1 / radialOffset )
            : new THREE.Vector3( 1, 0, 0 );
        const radius0 = getDirectionalShellRadius(
            trunkPosition,
            ring0,
            trunkMetadata.radialSegments,
            centre0,
            radialDirection,
            tangent
        );
        const radius1 = getDirectionalShellRadius(
            trunkPosition,
            ring1,
            trunkMetadata.radialSegments,
            centre1,
            radialDirection,
            tangent
        );
        const shellRadius = THREE.MathUtils.lerp(
            radius0,
            radius1,
            amount
        );
        const shellClearance = shellRadius - radialOffset
            - metadata.tubeRadius;
        const classification = shellClearance > metadata.tubeRadius
            ? 'buried'
            : radialOffset - metadata.tubeRadius > shellRadius
                ? 'exterior'
                : 'crossing';
        return {
            centre,
            shellCentre,
            radialOffset,
            shellRadius,
            classification
        };
    } );
    const surfaceSamples = samples.filter( ( sample ) =>
        sample.classification !== 'buried'
    );
    const angularSamples = samples.slice( 8, -8 );
    const angles = angularSamples.map( ( sample ) => {
        const radial = sample.centre.clone().sub( sample.shellCentre );
        return Math.atan2( radial.z, radial.x );
    } );
    let angularTravel = 0;
    let reverseAngularStepCount = 0;
    let maximumAngularStep = 0;
    for ( let index = 1; index < angles.length; index += 1 )
    {
        let delta = angles[index] - angles[index - 1];
        while ( delta > Math.PI ) delta -= Math.PI * 2;
        while ( delta < -Math.PI ) delta += Math.PI * 2;
        angularTravel += delta;
        if ( delta < 0 ) reverseAngularStepCount += 1;
        maximumAngularStep = Math.max( maximumAngularStep, Math.abs( delta ) );
    }
    return {
        samples,
        surfaceSamples,
        buriedSampleCount: samples.filter( ( sample ) =>
            sample.classification === 'buried'
        ).length,
        taperCorrelation: pearsonCorrelation(
            surfaceSamples.map( ( sample ) => sample.shellRadius ),
            surfaceSamples.map( ( sample ) => sample.radialOffset )
        ),
        minimumNormalisedRadius: Math.min( ...surfaceSamples.map( ( sample ) =>
            sample.radialOffset / sample.shellRadius
        ) ),
        maximumNormalisedRadius: Math.max( ...surfaceSamples.map( ( sample ) =>
            sample.radialOffset / sample.shellRadius
        ) ),
        minimumShellRadius: Math.min( ...surfaceSamples.map( ( sample ) =>
            sample.shellRadius
        ) ),
        maximumShellRadius: Math.max( ...surfaceSamples.map( ( sample ) =>
            sample.shellRadius
        ) ),
        measuredTurns: angularTravel / ( Math.PI * 2 ),
        reverseAngularStepCount,
        maximumAngularStep
    };
}

function sortRecords( records )
{
    return records.slice().sort( ( left, right ) => left.id.localeCompare( right.id ) );
}

function sortPackets( packets )
{
    return packets.slice().sort( ( left, right ) => left.id.localeCompare( right.id ) );
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

test( 'C4a-E1 exterior brooch remains exact reproducible evidence', () => {
    assert.ok( Object.isFrozen( trunkRuneCandidateIds ) );
    assert.ok( Object.isFrozen( trunkRuneCandidateProfiles ) );
    assert.ok( Object.values( trunkRuneCandidateProfiles ).every( Object.isFrozen ) );
    assert.equal(
        getTrunkRuneCandidateProfile( trunkRuneCandidateIds.evidence ),
        trunkRuneCandidateProfiles[trunkRuneCandidateIds.evidence]
    );
    assert.throws(
        () => getTrunkRuneCandidateProfile( 'not-an-authored-candidate' ),
        /Unknown trunk rune candidate/
    );

    const cases = [
        {
            name: 'initial',
            fixture: createFixture(),
            pathLength: 6.478183593374276,
            transformationDistance: 4.779543702072379,
            transformationPhase: 0.7377907145084274,
            shellCounts: [ 51, 50, 140 ],
            carrierClearance: 0.02776684523077971,
            hashes: {
                controls: 'cd3ffe2980654527f0263a2109708ea072425eec967da8c14ecd27031cca6275',
                centreline: '0d28ab2e391853a338d137be2cfba7a9a7917f9ef0effed3a7b0004addd99fa5',
                position: '6e0aa4f38fb79c4a809494073e8a2f03e2aa86da2e36a4d7c5557eb91458a22c',
                normal: 'c09eb9162dec980a7883f595ef07ed7a39b1b0cef13f07fcba9b1df22386b1fd',
                index: '9292f09f5ffe1155f6147e8ffb94508d035591d2a24f6d0d6407cbe2b308c73b',
                granulePosition:
                    '9db3e7590c7a43667618859c27212d1118e3baccdac0b7d1f10a8ba7d5d2a0cf',
                granuleIndex:
                    '543291d19e3bec3635da0cbd4184d81c1bd2124ff2833e05e0846d47e892da18'
            }
        },
        {
            name: 'mature',
            fixture: createMatureFixture(),
            pathLength: 9.841443922685091,
            transformationDistance: 6.9439360307125355,
            transformationPhase: 0.7055810189301964,
            shellCounts: [ 62, 37, 142 ],
            carrierClearance: 0.030317022697219777,
            hashes: {
                controls: '31942a2825b0479f1dced22350db49af58ef21cf2602489ec7ef27d1f5fb34a6',
                centreline: '258dab3900e85f0aac7005e78f6427f82a16ecfb00d36d38302b1667b2601b5c',
                position: 'f03eafea63295d072ef438e1061f9720eed49f06ae3b4c63533ddaf6c26ecf5c',
                normal: '8814ba10052257ba56b79dfa468be09b63ac5b4dba3fb4abfa4e19bac5fccdb4',
                index: '9292f09f5ffe1155f6147e8ffb94508d035591d2a24f6d0d6407cbe2b308c73b',
                granulePosition:
                    '0ceaab89b2355f83ed687446ed44aaf894dd62f4062b0edfae87610dce95e953',
                granuleIndex:
                    '543291d19e3bec3635da0cbd4184d81c1bd2124ff2833e05e0846d47e892da18'
            }
        }
    ];

    for ( const evidence of cases )
    {
        const { geometry, granuleGeometry } = createCandidateGeometry(
            evidence.fixture,
            trunkRuneCandidateIds.evidence
        );
        const metadata = geometry.userData.trunkRunes;
        assert.equal( metadata.candidateId, trunkRuneCandidateIds.evidence );
        assert.equal( metadata.reviewStatus, 'preserved-technical-evidence' );
        assert.equal( metadata.placementModel, 'exterior-transverse-filigree' );
        assert.equal( metadata.spatialConvergenceClaim, false );
        assert.equal( metadata.artisticForm,
            'visible-three-dimensional-filigree-droplet' );
        assertNear( metadata.pathLength, evidence.pathLength, 1e-12,
            `${evidence.name} E1 path length changed` );
        assertNear(
            metadata.internalTransformationDistance,
            evidence.transformationDistance,
            1e-12,
            `${evidence.name} E1 transformation distance changed`
        );
        assertNear(
            metadata.internalTransformationPhase,
            evidence.transformationPhase,
            1e-12,
            `${evidence.name} E1 transformation phase changed`
        );
        assert.deepEqual( [
            metadata.buriedSampleCount,
            metadata.shellCrossingSampleCount,
            metadata.exteriorSampleCount
        ], evidence.shellCounts );
        assertNear(
            metadata.minimumPathToCarrierClearance,
            evidence.carrierClearance,
            1e-12,
            `${evidence.name} E1 carrier clearance changed`
        );
        assert.equal( metadata.vertexCount, 2334 );
        assert.equal( metadata.triangleCount, 4092 );
        assert.deepEqual( {
            controls: hashTypedArray( metadata.controlPoints ),
            centreline: hashTypedArray( metadata.centrelinePoints ),
            position: hashTypedArray( geometry.getAttribute( 'position' ).array ),
            normal: hashTypedArray( geometry.getAttribute( 'normal' ).array ),
            index: hashTypedArray( geometry.index.array ),
            granulePosition:
                hashTypedArray( granuleGeometry.getAttribute( 'position' ).array ),
            granuleIndex: hashTypedArray( granuleGeometry.index.array )
        }, evidence.hashes, `${evidence.name} E1 buffers changed` );
        geometry.dispose();
        granuleGeometry.dispose();
    }
} );

test( 'C4a-E2 longitudinal placement remains exact reproducible evidence', () => {
    const cases = [
        {
            name: 'initial',
            fixture: createFixture(),
            pathLength: 4.002169533059488,
            transformationDistance: 1.868098096039279,
            transformationPhase: 0.4667713550383253,
            shellCounts: [ 139, 22, 0 ],
            carrierClearance: 0.05415265083258827,
            hashes: {
                controls:
                    '44b08a8314850e8bfb95e93b30c5f8fd14af49f1c870ffb0871c95a337246316',
                centreline:
                    '2ddd877571ee50324780463fd83461768016e0774c2cd6724aa787a641989ee7',
                position:
                    'eaa20d94bb2b228e52be7b2a3a56954b1d0ca662b5e7aeec599816a71336207c',
                normal:
                    '2ef1b77c4817b034f067238108397fe43ae1b5978de2f5ebbc6962b1d76a1da1',
                index:
                    '7ff69004432136194ec1fe6aeda377a218fd4eb75c60993f76dfbfb28e803ece',
                granulePosition:
                    '9047d4f8f5a6c6b23bc1fb1d39609bb7cfa7db667a43c8693f69f518d8f617f0',
                granuleIndex:
                    '543291d19e3bec3635da0cbd4184d81c1bd2124ff2833e05e0846d47e892da18'
            }
        },
        {
            name: 'mature',
            fixture: createMatureFixture(),
            pathLength: 6.067155272287233,
            transformationDistance: 2.820213569059936,
            transformationPhase: 0.4648329311665621,
            shellCounts: [ 151, 10, 0 ],
            carrierClearance: 0.05533682636593468,
            hashes: {
                controls:
                    'c2589b1a4e2aadac45115ccaea8f571be056e81805003f9169a911ce2f82894e',
                centreline:
                    'ce6ea3447266b3ededc6a9729468f54b6201bc1cf87eea5027a322c54de693ff',
                position:
                    'ba398ba816a69e62393c76a03057706b0d2f77ab0bb8f0c12517f71414ccb0f3',
                normal:
                    'd7ae8a7cb8a2bd8f408d83bc03d6683a0f21aaa58a14850072bb43f9899b4841',
                index:
                    '7ff69004432136194ec1fe6aeda377a218fd4eb75c60993f76dfbfb28e803ece',
                granulePosition:
                    'e420e3c3550077ea0735c54bca58cc9144c18bae8909c60e4fa8ca16bb1ffcf7',
                granuleIndex:
                    '543291d19e3bec3635da0cbd4184d81c1bd2124ff2833e05e0846d47e892da18'
            }
        }
    ];

    for ( const evidence of cases )
    {
        const { geometry, granuleGeometry } = createCandidateGeometry(
            evidence.fixture,
            trunkRuneCandidateIds.longitudinal
        );
        const metadata = geometry.userData.trunkRunes;
        assert.equal( metadata.candidateId, trunkRuneCandidateIds.longitudinal );
        assert.equal( metadata.reviewStatus, 'bounded-placement-candidate' );
        assert.equal( metadata.placementModel,
            'axial-shell-straddling-single-route' );
        assert.equal( metadata.spatialConvergenceClaim, false );
        assertNear( metadata.pathLength, evidence.pathLength, 1e-12,
            `${evidence.name} E2 path length changed` );
        assertNear(
            metadata.internalTransformationDistance,
            evidence.transformationDistance,
            1e-12,
            `${evidence.name} E2 transformation distance changed`
        );
        assertNear(
            metadata.internalTransformationPhase,
            evidence.transformationPhase,
            1e-12,
            `${evidence.name} E2 transformation phase changed`
        );
        assert.deepEqual( [
            metadata.buriedSampleCount,
            metadata.shellCrossingSampleCount,
            metadata.exteriorSampleCount
        ], evidence.shellCounts );
        assertNear(
            metadata.minimumPathToCarrierClearance,
            evidence.carrierClearance,
            1e-12,
            `${evidence.name} E2 carrier clearance changed`
        );
        assert.equal( metadata.vertexCount, 1292 );
        assert.equal( metadata.triangleCount, 2172 );
        assert.deepEqual( {
            controls: hashTypedArray( metadata.controlPoints ),
            centreline: hashTypedArray( metadata.centrelinePoints ),
            position: hashTypedArray( geometry.getAttribute( 'position' ).array ),
            normal: hashTypedArray( geometry.getAttribute( 'normal' ).array ),
            index: hashTypedArray( geometry.index.array ),
            granulePosition:
                hashTypedArray( granuleGeometry.getAttribute( 'position' ).array ),
            granuleIndex: hashTypedArray( granuleGeometry.index.array )
        }, evidence.hashes, `${evidence.name} E2 buffers changed` );
        geometry.dispose();
        granuleGeometry.dispose();
    }
} );

test( 'C4a-E2 is a deterministic longitudinal gold transducer with causal light', () => {
    const first = createFixture();
    const second = createFixture();
    const resources = first.layer.getTrunkRuneResources();
    const repeated = second.layer.getTrunkRuneResources();
    const geometry = resources.geometry;
    const metadata = geometry.userData.trunkRunes;
    const trunk = first.layer.group.getObjectByName( 'monumental trunk' );
    const granule = resources.granuleGeometry;
    const repeatedGranule = repeated.granuleGeometry;

    assert.ok( Object.isFrozen( trunkRuneTransducerSite ) );
    assert.ok( Object.isFrozen( trunkRuneSites ) );
    assert.ok( trunkRuneSites.every( Object.isFrozen ) );
    assert.deepEqual( trunkRuneSites, [ {
        id: 'meaning-passage',
        transducerId: 'meaning-transducer',
        parentId: 'exchange',
        childId: 'meaning',
        localProgress: 0.58,
        angularTurn: 0.08
    } ] );
    assert.equal( resources.transducerSite, trunkRuneTransducerSite );
    assert.equal( trunkRuneManifestationDuration, 0 );
    assert.equal( trunkRuneFullAdmissionFrequency, Number.POSITIVE_INFINITY );
    assert.deepEqual( getTrunkRuneAdmission( 'packet-a' ), {
        admitted: true,
        probability: 1,
        hash: getTrunkRuneAdmission( 'packet-a' ).hash,
        strategy: 'none-functional-transduction'
    } );
    assert.notEqual(
        getTrunkRuneAdmission( 'packet-a' ).hash,
        getTrunkRuneAdmission( 'packet-b' ).hash
    );

    assert.equal( resources.mesh.name,
        'longitudinal gold transducer placement study' );
    assert.equal( resources.mesh.parent, first.layer.group );
    assert.equal( resources.mesh.visible, true );
    assert.equal( resources.mesh.material, resources.material );
    assert.equal( resources.granuleMesh.name, 'gold filigree transformation granule' );
    assert.equal( resources.granuleMesh.parent, resources.mesh );
    assert.equal( resources.granuleMesh.material, resources.material );
    assert.equal( resources.ownershipGeometry, null );
    assert.equal( resources.material.depthFunc, THREE.LessEqualDepth );
    assert.equal( resources.material.depthWrite, true );
    assert.equal( resources.material.colorWrite, true );
    assert.equal( resources.material.transparent, false );
    assert.equal( resources.material.side, THREE.FrontSide );
    assert.equal( resources.material.blending, THREE.NormalBlending );
    assert.equal( resources.material.metalness, 0.96 );
    assert.equal( resources.material.emissive.getHex(), 0x000000 );
    assert.equal( resources.material.userData.rendererOwned, false );
    assert.equal( resources.material.userData.depthMode, 'ordinary-less-equal' );
    assert.equal( resources.material.userData.idleLuminosity, 0 );
    assert.equal( metadata.siteCount, 1 );
    assert.equal( metadata.candidateId, trunkRuneCandidateIds.longitudinal );
    assert.equal( metadata.reviewStatus, 'bounded-placement-candidate' );
    assert.equal( metadata.placementModel,
        'axial-shell-straddling-single-route' );
    assert.equal( metadata.spatialConvergenceClaim, false );
    assert.equal( metadata.artisticForm,
        'longitudinal-volumetric-placement-study' );
    assert.equal( metadata.visibleArtifact, true );
    assert.equal( metadata.persistentStructure, true );
    assert.equal( metadata.functionalPath, true );
    assert.equal( metadata.idleLuminosity, 0 );
    assert.equal( metadata.ethnicStyleClaim, false );
    assert.equal( metadata.literalCulturalMotif, false );
    assert.equal( metadata.internal3d, true );
    assert.equal( metadata.surfaceExcursion, true );
    assert.equal( metadata.shellRelationship, 'woven-through-graphite-shell' );
    assert.equal( metadata.connectedPath, true );
    assert.equal( metadata.inletCount, 1 );
    assert.equal( metadata.outletCount, 1 );
    assert.equal( metadata.branched, false );
    assert.equal( metadata.objectSpace, true );
    assert.equal( metadata.cameraFacing, false );
    assert.equal( metadata.pathFrame.cameraIndependent, true );
    assert.equal( metadata.pathFrame.model,
        'parallel-transported-authored-shell-frame' );
    assert.equal( metadata.pathFrame.preferredFront, false );
    assert.ok( Array.isArray( metadata.pathFrame.transportedTangents ) );
    assert.equal(
        metadata.pathFrame.transportedTangents.length,
        getTrunkRuneCandidateProfile( trunkRuneCandidateIds.longitudinal )
            .controls.length
    );
    assert.equal( metadata.rendering, 'ordinary-depth-metallic-filigree' );
    assert.deepEqual( metadata.renderContract, {
        activation: 'genuine-traversal-only',
        mainSceneMeshVisible: true,
        persistentGoldStructure: true,
        idleLuminosity: 0,
        activeExtraPassCount: 0,
        ordinaryDepthOnly: true,
        greaterDepth: false,
        cameraFacing: false,
        aperture: false,
        c1InventoryVisible: false,
        bloomRequired: false
    } );
    assert.equal( metadata.meshCount, 2 );
    assert.equal( metadata.maximumDrawCalls, 2 );
    assert.equal( metadata.idlePassCount, 1 );
    assert.equal( metadata.activeOverlayDrawCalls, 0 );
    assert.equal( metadata.sourceGeometryUuid, trunk.geometry.uuid );
    assert.ok( metadata.pathLength > 0 );
    assert.ok( metadata.controlPoints instanceof Float32Array );
    assert.ok( metadata.centrelinePoints instanceof Float32Array );
    assert.equal( metadata.controlPoints.length, metadata.controlPointCount * 3 );
    assert.equal( metadata.centrelinePoints.length, metadata.centreSampleCount * 3 );
    assert.equal(
        metadata.tubeVertexCount,
        ( metadata.tubularSegments + 1 ) * ( metadata.radialSegments + 1 )
    );
    assert.equal(
        metadata.vertexCount,
        metadata.tubeVertexCount + metadata.granuleVertexCount
    );
    assert.equal(
        metadata.triangleCount,
        metadata.tubeTriangleCount + metadata.granuleTriangleCount
    );
    for ( const name of [
        'position',
        'normal',
        'runePhase',
        'runeSignal',
        'runeWarmth'
    ] )
    {
        assert.deepEqual(
            geometry.getAttribute( name ).array,
            repeated.geometry.getAttribute( name ).array,
            `${name} must be byte deterministic`
        );
    }
    assert.deepEqual( geometry.index.array, repeated.geometry.index.array );
    for ( const name of [
        'position',
        'normal',
        'runePhase',
        'runeSignal',
        'runeWarmth'
    ] )
    {
        assert.deepEqual(
            granule.getAttribute( name ).array,
            repeatedGranule.getAttribute( name ).array,
            `granule ${name} must be byte deterministic`
        );
    }
    assert.deepEqual( granule.index.array, repeatedGranule.index.array );
    assert.deepEqual(
        metadata.controlPoints,
        repeated.geometry.userData.trunkRunes.controlPoints
    );

    const runeSource = readFileSync(
        new URL( '../../src/lib/tree/trunk-rune-layer.js', import.meta.url ),
        'utf8'
    );
    assert.equal( runeSource.includes( 'THREE.GreaterDepth' ), false );
    assert.match( runeSource, /new THREE\.MeshPhysicalMaterial/ );
    assert.match( runeSource, /totalEmissiveRadiance \+= causalColour \* causalSignal/ );

    first.layer.update( 0, first.form );
    const idle = first.layer.group.userData.trunkRunes;
    assert.equal( idle.semanticClaim, 'transduction' );
    assert.equal( idle.mode, 'one-to-one' );
    assert.equal( idle.aggregation, false );
    assert.equal( idle.spatialConvergenceClaim, false );
    assert.equal( idle.candidateId, trunkRuneCandidateIds.longitudinal );
    assert.equal( idle.transductionAlwaysActive, true );
    assert.equal( idle.provenanceCardinality, 1 );
    assert.equal( idle.visualSampling.strategy, 'none' );
    assert.equal( idle.visualSampling.everyEntryTraverses, true );
    assert.equal( idle.visualSampling.packetLoss, false );
    assert.equal( idle.entryCount, 0 );
    assert.equal( idle.consumptionCount, 0 );
    assert.equal( idle.outputCount, 0 );
    assert.equal( idle.activeTraversalCount, 0 );
    assert.equal( idle.visible, true );
    assert.equal( idle.rendererEligible, false );
    assert.equal( idle.activeDrawCalls, 2 );
    for ( const candidate of [ geometry, granule ] )
    {
        assert.ok( Array.from( candidate.getAttribute( 'runeSignal' ).array )
            .every( ( value ) => value === 0 ) );
        assert.ok( Array.from( candidate.getAttribute( 'runeWarmth' ).array )
            .every( ( value ) => value === 0 ) );
    }
    assertConserved( idle );
} );

test( 'E2 is axial, camera-independent and only narrowly revealed through graphite', () => {
    const fixture = createFixture();
    fixture.layer.update( 0, fixture.form );
    const source = fixture.layer.group.userData.routedLight.activePackets[0];
    const route = getRoute( fixture, source.terminalId );
    const resources = fixture.layer.getTrunkRuneResources();
    const geometry = resources.geometry;
    const metadata = geometry.userData.trunkRunes;
    const expected = deriveRouteBoundaries( route );
    const actual = getTrunkRuneRouteDistances(
        route,
        trunkRuneTransducerSite,
        trunkRuneCandidateIds.longitudinal
    );
    const centres = getTubeCentres( geometry );
    const arc = derivePolylineArc( centres );

    assertNear( actual.entryLocalProgress, expected.entryLocalProgress );
    assertNear( actual.exitLocalProgress, expected.exitLocalProgress );
    assertNear( actual.entryDistance, expected.entryDistance );
    assertNear( actual.exitDistance, expected.exitDistance );
    assert.ok( actual.entryDistance < actual.exitDistance );
    assert.equal(
        getTrunkRuneRouteDistance(
            route,
            trunkRuneTransducerSite,
            trunkRuneCandidateIds.longitudinal
        ),
        actual.entryDistance
    );
    assertVectorNear( centres[0], expected.entryPoint, 3e-6 );
    assertVectorNear( centres.at( -1 ), expected.exitPoint, 3e-6 );
    assertVectorNear(
        new THREE.Vector3().fromArray( metadata.centreEntryPoint ),
        expected.entryPoint
    );
    assertVectorNear(
        new THREE.Vector3().fromArray( metadata.centreResumePoint ),
        expected.exitPoint
    );
    assert.ok( centres.slice( 1 ).every( ( centre, index ) =>
        centre.distanceTo( centres[index] ) > 1e-5
    ) );
    assert.equal( geometry.groups.length <= 1, true );
    assert.equal( geometry.index.count, metadata.tubularSegments
        * metadata.radialSegments * 6 );

    const axial = measureAxialEnvelope(
        centres,
        expected.entryPoint,
        expected.exitPoint
    );
    assert.ok(
        axial.longitudinalExtent > axial.transverseExtent,
        `longitudinal extent ${axial.longitudinalExtent} must exceed transverse ${axial.transverseExtent}`
    );
    assertNear( metadata.longitudinalExtent,
        axial.longitudinalExtent + metadata.tubeRadius * 2, 3e-5 );
    assertNear( metadata.transverseExtent,
        axial.transverseExtent + metadata.tubeRadius * 2, 3e-5 );
    assert.ok( metadata.longitudinalToTransverseRatio > 1 );
    assert.equal( metadata.pathFrame.cameraIndependent, true );
    assert.equal( metadata.pathFrame.preferredFront, false );
    assert.equal( metadata.pathFrame.model,
        'parallel-transported-authored-shell-frame' );
    assert.equal( metadata.corridorAngle, null );
    assert.equal( metadata.pathFrame.outward, null );
    assert.equal( metadata.pathFrame.lateral, null );
    assert.equal( metadata.pathFrame.transportedTangents.length,
        metadata.controlPointCount );
    assert.ok( metadata.pathFrame.transportedTangents.flat()
        .every( Number.isFinite ) );

    const axis = expected.exitPoint.clone().sub( expected.entryPoint ).normalize();
    const furthestFromChord = centres.reduce( ( furthest, centre ) => {
        const offset = centre.clone().sub( expected.entryPoint );
        const rejection = offset.clone().addScaledVector(
            axis,
            -offset.dot( axis )
        );
        return rejection.lengthSq() > furthest.lengthSq()
            ? rejection
            : furthest;
    }, new THREE.Vector3() );
    const planeNormal = new THREE.Vector3()
        .crossVectors( axis, furthestFromChord )
        .normalize();
    const nonPlanarDistance = Math.max( ...centres.map( ( centre ) =>
        Math.abs( centre.clone().sub( expected.entryPoint ).dot( planeNormal ) )
    ) );
    assert.ok(
        nonPlanarDistance >= 0.01,
        `the rendered path must fold out of plane (observed ${nonPlanarDistance})`
    );

    assert.ok( Math.abs( metadata.pathLength - arc.total )
        < metadata.pathLength * 0.01 );
    const renderedTransformation = pointAtPolylineDistance(
        centres,
        arc.cumulative,
        arc.total * metadata.internalTransformationPhase
    );
    assertVectorNear(
        renderedTransformation,
        new THREE.Vector3().fromArray( metadata.internalTransformationPoint ),
        metadata.pathLength / metadata.tubularSegments * 0.5,
        'the recorded transformation point must lie on the rendered internal path'
    );
    resources.granuleGeometry.computeBoundingSphere();
    assertVectorNear(
        resources.granuleGeometry.boundingSphere.center,
        new THREE.Vector3().fromArray( metadata.internalTransformationPoint ),
        1e-6,
        'the gold granule must occupy the exact transformation point'
    );
    assertNear(
        metadata.internalTransformationPhase,
        metadata.internalTransformationDistance / metadata.pathLength,
        1e-8
    );
    assert.ok( metadata.internalTransformationDistance > 0 );
    assert.ok( metadata.internalTransformationDistance < metadata.pathLength );
    assert.ok( metadata.internalTransformationPhase > 0 );
    assert.ok( metadata.internalTransformationPhase < 1 );

    const trunk = fixture.layer.group.getObjectByName( 'monumental trunk' );
    const renderedShell = measureRenderedTubeShellRelationship(
        geometry,
        trunk.geometry
    );
    const shellRelationship = measureCentrelineShellRelationship(
        geometry,
        trunk.geometry
    );
    const buriedRatio = metadata.buriedSampleCount / metadata.centreSampleCount;
    const exteriorRatio = metadata.exteriorSampleCount / metadata.centreSampleCount;
    assert.ok( renderedShell.minimum < 0 );
    assert.ok( renderedShell.maximum > 0 );
    assert.ok( renderedShell.exteriorVertexCount > 0 );
    assert.ok( renderedShell.buriedVertexCount > 0 );
    assert.ok( renderedShell.minimumEntryClearance > 0 );
    assert.ok( renderedShell.minimumExitClearance > 0 );
    assert.equal( metadata.straddlesShell, true );
    assert.equal( metadata.insideOpaqueShell, false );
    assert.ok( metadata.minimumPathToShellClearance < 0 );
    assert.ok( metadata.maximumPathToShellClearance > 0 );
    assert.ok(
        buriedRatio >= 0.55,
        `${( buriedRatio * 100 ).toFixed( 1 )}% buried centres must be at least 55%`
    );
    assert.ok( metadata.shellCrossingSampleCount > 0 );
    assert.ok(
        exteriorRatio <= 0.20,
        `${( exteriorRatio * 100 ).toFixed( 1 )}% exterior centres must not exceed 20%`
    );
    assert.ok(
        metadata.maximumExteriorProtrusion <= 0.055,
        `maximum protrusion ${metadata.maximumExteriorProtrusion} must not exceed 0.055`
    );
    assert.equal(
        metadata.buriedSampleCount
            + metadata.shellCrossingSampleCount
            + metadata.exteriorSampleCount,
        metadata.centreSampleCount
    );
    assert.ok(
        shellRelationship.buriedSampleCount
            / shellRelationship.centres.length >= 0.55,
        'an independent shell sample must also find a buried majority'
    );
    assert.ok(
        shellRelationship.exteriorSampleCount
            / shellRelationship.centres.length <= 0.20,
        'an independent shell sample must bound exterior centres'
    );
    assert.ok(
        shellRelationship.maximumExteriorProtrusion <= 0.055 + 3e-3,
        'an independent shell sample must confirm bounded protrusion'
    );
    const revealBands = deriveRevealBands(
        shellRelationship,
        expected.entryPoint,
        expected.exitPoint
    );
    assert.ok(
        revealBands.length >= 3,
        `E2 needs at least three separated axial reveal bands; found ${revealBands.length}`
    );
    assert.ok(
        revealBands.at( -1 ).centreProjection
            - revealBands[0].centreProjection >= axial.longitudinalExtent * 0.45,
        'E2 reveal crests must occupy the longitudinal volume rather than one belt'
    );
    assert.ok( metadata.shellExposureBandCount >= 3 );
    assert.equal( metadata.shellExposureBands.length,
        metadata.shellExposureBandCount );
    assert.ok( metadata.shellExposureLongitudinalSpreadRatio >= 0.45 );

    const descriptor = fixture.layer.getTrunkVisibilityResources()
        .skeletonMesh.geometry.userData.trunkInterior.descriptor;
    const independentCarrierClearance = minimumCarrierClearance(
        centres,
        descriptor,
        metadata.tubeRadius
    );
    assert.ok(
        independentCarrierClearance > 0,
        `independent C1 clearance ${independentCarrierClearance} must remain positive`
    );
    assert.equal( metadata.carrierCollisionFree, true );
    assert.ok(
        metadata.minimumPathToCarrierClearance > 0,
        `reported C1 clearance ${metadata.minimumPathToCarrierClearance} must remain positive`
    );
    assertNear(
        metadata.minimumPathToCarrierClearance,
        independentCarrierClearance,
        3e-5
    );

    // Maturation changes the graphite radius and therefore the physical E2
    // envelope. The placement contract belongs to the finished review state,
    // not only to the narrow pre-growth trunk.
    const mature = createMatureFixture();
    mature.layer.update( 0, mature.form );
    const matureSource = mature.layer.group.userData.routedLight.activePackets[0];
    const matureRoute = getRoute( mature, matureSource.terminalId );
    const matureExpected = deriveRouteBoundaries( matureRoute );
    const matureResources = mature.layer.getTrunkRuneResources();
    const matureMetadata = matureResources.geometry.userData.trunkRunes;
    const matureCentres = getTubeCentres( matureResources.geometry );
    assertVectorNear( matureCentres[0], matureExpected.entryPoint, 3e-6 );
    assertVectorNear( matureCentres.at( -1 ), matureExpected.exitPoint, 3e-6 );
    const matureAxial = measureAxialEnvelope(
        matureCentres,
        matureExpected.entryPoint,
        matureExpected.exitPoint
    );
    assert.ok(
        matureAxial.longitudinalExtent > matureAxial.transverseExtent,
        `mature longitudinal extent ${matureAxial.longitudinalExtent} must exceed `
            + `transverse ${matureAxial.transverseExtent}`
    );
    assertNear( matureMetadata.longitudinalExtent,
        matureAxial.longitudinalExtent + matureMetadata.tubeRadius * 2, 3e-5 );
    assertNear( matureMetadata.transverseExtent,
        matureAxial.transverseExtent + matureMetadata.tubeRadius * 2, 3e-5 );
    assert.ok( matureMetadata.longitudinalToTransverseRatio > 1 );
    assert.equal( matureMetadata.pathFrame.cameraIndependent, true );
    assert.equal( matureMetadata.pathFrame.preferredFront, false );
    assert.equal( matureMetadata.pathFrame.model,
        'parallel-transported-authored-shell-frame' );
    const matureBuriedRatio = matureMetadata.buriedSampleCount
        / matureMetadata.centreSampleCount;
    const matureExteriorRatio = matureMetadata.exteriorSampleCount
        / matureMetadata.centreSampleCount;
    assert.ok( matureBuriedRatio >= 0.55 );
    assert.ok( matureExteriorRatio <= 0.20 );
    assert.ok( matureMetadata.maximumExteriorProtrusion <= 0.055 );
    const matureTrunk = mature.layer.group.getObjectByName( 'monumental trunk' );
    const matureShellRelationship = measureCentrelineShellRelationship(
        matureResources.geometry,
        matureTrunk.geometry
    );
    const matureRevealBands = deriveRevealBands(
        matureShellRelationship,
        matureExpected.entryPoint,
        matureExpected.exitPoint
    );
    assert.ok(
        matureRevealBands.length >= 3,
        `mature E2 needs at least three separated axial reveal bands; found `
            + matureRevealBands.length
    );
    assert.ok(
        matureRevealBands.at( -1 ).centreProjection
            - matureRevealBands[0].centreProjection
                >= matureAxial.longitudinalExtent * 0.45,
        'mature reveal crests must span the longitudinal volume rather than one belt'
    );
    assert.ok( matureMetadata.shellExposureBandCount >= 3 );
    assert.equal( matureMetadata.shellExposureBands.length,
        matureMetadata.shellExposureBandCount );
    assert.ok( matureMetadata.shellExposureLongitudinalSpreadRatio >= 0.45 );
    const matureDescriptor = mature.layer.getTrunkVisibilityResources()
        .skeletonMesh.geometry.userData.trunkInterior.descriptor;
    const matureCarrierClearance = minimumCarrierClearance(
        matureCentres,
        matureDescriptor,
        matureMetadata.tubeRadius
    );
    assert.ok( matureCarrierClearance > 0 );
    assertNear(
        matureMetadata.minimumPathToCarrierClearance,
        matureCarrierClearance,
        3e-5
    );
} );

test( 'C4b-O1 is one narrow taper-following exterior spiral across three trunk spans', () => {
    const first = createOpticalFixture();
    const repeated = createOpticalFixture();
    first.layer.update( 0, first.form );
    repeated.layer.update( 0, repeated.form );
    const resources = first.layer.getTrunkRuneResources();
    const geometry = resources.geometry;
    const metadata = geometry.userData.trunkRunes;
    const centres = getTubeCentres( geometry );
    const source = first.layer.group.userData.routedLight.activePackets[0];
    const route = getRoute( first, source.terminalId );
    const boundaries = getTrunkRuneRouteDistances(
        route,
        trunkRuneTransducerSite,
        trunkRuneCandidateIds.opticalFibre
    );
    const entrySegment = route.byChildId.get( 'meaning' );
    const exitSegment = route.byChildId.get( 'uptake' );

    assert.equal( metadata.candidateId, trunkRuneCandidateIds.opticalFibre );
    assert.equal( resources.candidateId, trunkRuneCandidateIds.opticalFibre );
    assert.equal( metadata.reviewStatus,
        'bounded-artistic-experiment-awaiting-human-review' );
    assert.equal( metadata.placementModel,
        'exterior-taper-following-optical-spiral' );
    assert.equal( metadata.artisticForm,
        'single-exterior-optical-fibre-spiral' );
    assert.equal( metadata.connectedPath, true );
    assert.equal( metadata.functionalPath, true );
    assert.equal( metadata.inletCount, 1 );
    assert.equal( metadata.outletCount, 1 );
    assert.equal( metadata.branched, false );
    assert.equal( metadata.aggregation, false );
    assert.equal( metadata.spatialConvergenceClaim, false );
    assert.equal( metadata.routeEntryParentId, 'exchange' );
    assert.equal( metadata.routeEntryChildId, 'meaning' );
    assert.equal( metadata.routeExitParentId, 'planting-root' );
    assert.equal( metadata.routeExitChildId, 'uptake' );
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
    assert.equal( metadata.coveredTrunkSpanCount, 3 );
    assert.equal( new Set( metadata.coveredTrunkSpans.map(
        ( span ) => span.spanIndex
    ) ).size, 3 );
    assert.equal( boundaries.entryParentId, 'exchange' );
    assert.equal( boundaries.entryChildId, 'meaning' );
    assert.equal( boundaries.exitParentId, 'planting-root' );
    assert.equal( boundaries.exitChildId, 'uptake' );
    assertNear( boundaries.entryLocalProgress, 0.96 );
    assertNear( boundaries.exitLocalProgress, 0.04 );
    assert.ok( boundaries.entryDistance < boundaries.exitDistance );
    assertVectorNear(
        centres[0],
        entrySegment.curve.getPointAt( 0.96 ),
        3e-6,
        'the spiral must enter continuously from the authored canopy route'
    );
    assertVectorNear(
        centres.at( -1 ),
        exitSegment.curve.getPointAt( 0.04 ),
        3e-6,
        'the spiral must resume continuously on the rootward route'
    );
    assertVectorNear(
        new THREE.Vector3().fromArray( metadata.centreEntryPoint ),
        centres[0]
    );
    assertVectorNear(
        new THREE.Vector3().fromArray( metadata.centreResumePoint ),
        centres.at( -1 )
    );
    assert.ok( metadata.pathLength
        > boundaries.exitDistance - boundaries.entryDistance );
    assert.equal( geometry.groups.length <= 1, true );
    assert.ok( centres.slice( 1 ).every( ( centre, index ) =>
        centre.distanceTo( centres[index] ) > 1e-5
    ) );

    assert.equal( metadata.spiralTurns, 3.25 );
    assert.equal( metadata.taperFollowing, true );
    assert.equal( metadata.objectSpace, true );
    assert.equal( metadata.cameraFacing, false );
    assert.equal( metadata.pathFrame.cameraIndependent, true );
    assert.equal( metadata.pathFrame.model,
        'parallel-transported-authored-trunk-frame' );
    assert.equal( metadata.pathFrame.preferredFront, false );
    assert.equal( metadata.pathFrame.transportedTangents.length, 97 );
    assert.equal( metadata.tubeRadius, 0.012 );
    assert.equal( metadata.tubularSegments, 288 );
    assert.equal( metadata.radialSegments, 6 );
    assert.equal( metadata.controlPointCount, 97 );
    assert.equal( metadata.centreSampleCount, 289 );
    assert.equal( metadata.vertexCount, 2023 );
    assert.equal( metadata.triangleCount, 3456 );
    assert.equal( metadata.meshCount, 1 );
    assert.equal( metadata.maximumDrawCalls, 1 );
    assert.equal( resources.granuleMesh, null );
    assert.equal( resources.granuleGeometry, null );
    assert.equal( metadata.transformationArtifact, false );
    assert.equal( metadata.persistentStructure, false );
    assert.equal( metadata.packetOnlyDisclosure, true );
    assert.equal( metadata.idleLuminosity, 0 );
    assert.equal( metadata.colourTransition,
        'continuous-blue-to-cosmos-gold-rootward' );
    assert.equal( metadata.colourTransitionContinuous, true );
    assert.equal( metadata.colourTransitionDirection, 'rootward' );
    assertNear( metadata.internalTransformationPhase, 0.62, 1e-12 );

    const relationship = measureOpticalShellRelationship( first );
    assert.equal( relationship.samples.length, metadata.centreSampleCount );
    assert.equal( relationship.buriedSampleCount, metadata.buriedSampleCount );
    assert.ok(
        relationship.surfaceSamples.length / relationship.samples.length >= 0.88,
        'at least 88% of the independently sampled path must meet the outer shell'
    );
    assert.ok( relationship.taperCorrelation > 0.998 );
    assert.ok( relationship.minimumNormalisedRadius >= 0.95 );
    assert.ok( relationship.maximumNormalisedRadius <= 1.05 );
    assert.ok( relationship.maximumShellRadius
        > relationship.minimumShellRadius * 1.3 );
    assert.ok( metadata.tubeRadius
        < relationship.minimumShellRadius * 0.03 );
    assert.ok( relationship.measuredTurns > 3 );
    assert.ok( relationship.measuredTurns < metadata.spiralTurns );
    assert.equal( relationship.reverseAngularStepCount, 0 );
    assert.ok( relationship.maximumAngularStep < 0.12 );

    assert.equal( metadata.rendering,
        'ordinary-depth-causal-optical-fibre' );
    assert.deepEqual( metadata.renderContract, {
        activation: 'genuine-traversal-only',
        mainSceneMeshVisible: true,
        persistentGoldStructure: false,
        packetOnlyDisclosure: true,
        mostlyInvisibleAtIdle: true,
        gradualRootwardColour: true,
        multiSpanPath: true,
        transformationGranule: false,
        idleLuminosity: 0,
        activeExtraPassCount: 0,
        ordinaryDepthOnly: true,
        greaterDepth: false,
        cameraFacing: false,
        aperture: false,
        c1InventoryVisible: false,
        bloomRequired: false
    } );
    assert.equal( resources.mesh.name,
        'packet-lit exterior optical fibre spiral' );
    assert.equal( resources.mesh.material, resources.material );
    assert.equal( resources.material.name,
        'packet-lit exterior optical fibre' );
    assert.equal( resources.material.color.getHex(), 0x0b0e10 );
    assert.equal( resources.material.emissive.getHex(), 0x000000 );
    assert.equal( resources.material.depthTest, true );
    assert.equal( resources.material.depthFunc, THREE.LessEqualDepth );
    assert.equal( resources.material.depthWrite, true );
    assert.equal( resources.material.transparent, false );
    assert.equal( resources.material.side, THREE.FrontSide );
    assert.equal( resources.material.blending, THREE.NormalBlending );
    assert.equal( resources.material.userData.idleLuminosity, 0 );
    assert.equal( resources.material.userData.packetOnlyDisclosure, true );
    assert.equal( resources.material.userData.mostlyInvisibleAtIdle, true );
    assert.equal( resources.material.userData.motionModel,
        'shared-tree-deformation' );
    assert.equal(
        resources.material.userData.deformationUniforms.time,
        resources.deformationUniforms.time
    );
    assert.equal(
        resources.material.userData.deformationUniforms.response,
        resources.deformationUniforms.response
    );
    assert.equal( resources.material.customProgramCacheKey(),
        'causal-exterior-optical-fibre-c4b' );

    for ( const name of [
        'position',
        'normal',
        'runePhase',
        'runeSignal',
        'runeWarmth'
    ] )
    {
        assert.deepEqual(
            geometry.getAttribute( name ).array,
            repeated.layer.getTrunkRuneResources().geometry
                .getAttribute( name ).array,
            `O1 ${name} must remain byte deterministic`
        );
    }
    assert.deepEqual(
        geometry.index.array,
        repeated.layer.getTrunkRuneResources().geometry.index.array
    );
    assert.ok( Array.from( geometry.getAttribute( 'runeSignal' ).array )
        .every( ( value ) => value === 0 ) );
    assert.ok( Array.from( geometry.getAttribute( 'runeWarmth' ).array )
        .every( ( value ) => value === 0 ) );

    const runeSource = readFileSync(
        new URL( '../../src/lib/tree/trunk-rune-layer.js', import.meta.url ),
        'utf8'
    );
    assert.equal( runeSource.includes( 'THREE.GreaterDepth' ), false );
    assert.match( runeSource, /totalEmissiveRadiance \+= causalColour \* causalSignal/ );

    const mature = createMatureOpticalFixture();
    mature.layer.update( 0, mature.form );
    const matureMetadata = mature.layer.getTrunkRuneResources()
        .geometry.userData.trunkRunes;
    const matureRelationship = measureOpticalShellRelationship( mature );
    assert.equal( matureMetadata.coveredTrunkSpanCount, 3 );
    assert.equal( matureMetadata.spiralTurns, 3.25 );
    assert.ok( matureMetadata.pathLength > metadata.pathLength );
    assert.ok( matureRelationship.surfaceSamples.length
        / matureRelationship.samples.length >= 0.88 );
    assert.ok( matureRelationship.taperCorrelation > 0.998 );
    assert.ok( matureRelationship.minimumNormalisedRadius >= 0.95 );
    assert.ok( matureRelationship.maximumNormalisedRadius <= 1.05 );
    assert.ok( matureRelationship.measuredTurns > 3 );
    assert.equal( matureRelationship.reverseAngularStepCount, 0 );
    assert.equal( matureMetadata.sourceGeometryUuid,
        mature.layer.group.getObjectByName( 'monumental trunk' ).geometry.uuid );
} );

test( 'genuine packets disclose O1 with a continuous blue-to-gold rootward ramp', () => {
    const fixture = createOpticalFixture( { packetFrequency: 0.01 } );
    fixture.layer.update( 0, fixture.form );
    const source = fixture.layer.group.userData.routedLight.activePackets[0];
    const route = getRoute( fixture, source.terminalId );
    const boundaries = getTrunkRuneRouteDistances(
        route,
        trunkRuneTransducerSite,
        trunkRuneCandidateIds.opticalFibre
    );
    const resources = fixture.layer.getTrunkRuneResources();
    const geometry = resources.geometry;
    const metadata = geometry.userData.trunkRunes;
    const signal = geometry.getAttribute( 'runeSignal' );
    const warmth = geometry.getAttribute( 'runeWarmth' );
    const phase = geometry.getAttribute( 'runePhase' );
    const ringSize = metadata.radialSegments + 1;
    const enteredAt = source.emittedAt
        + boundaries.entryDistance / fixture.form.packetSpeed;
    const transformedAt = enteredAt
        + metadata.internalTransformationDistance / fixture.form.packetSpeed;
    const resumedAt = enteredAt
        + metadata.pathLength / fixture.form.packetSpeed;
    const outputId = `${source.id}::meaning-transducer::output`;

    assert.ok( Array.from( signal.array ).every( ( value ) => value === 0 ) );
    assert.ok( Array.from( warmth.array ).every( ( value ) => value === 0 ) );
    assert.equal( resources.material.emissive.getHex(), 0x000000 );
    assert.equal( resources.material.userData.idleLuminosity, 0 );
    fixture.layer.update( enteredAt - 0.001, fixture.form );
    assert.equal( fixture.layer.group.userData.trunkRunes.entryCount, 0 );
    assert.ok( Array.from( signal.array ).every( ( value ) => value === 0 ) );

    const headWarmth = [];
    for ( const traversalProgress of [ 0.08, 0.3, 0.55, 0.8 ] )
    {
        const elapsed = enteredAt
            + metadata.pathLength * traversalProgress / fixture.form.packetSpeed;
        fixture.layer.update( elapsed, fixture.form );
        const diagnostics = fixture.layer.group.userData.trunkRunes;
        assert.equal( diagnostics.activeTraversalCount, 1 );
        assert.equal( diagnostics.activeTraversals[0].sourcePacketId, source.id );
        assertNear(
            diagnostics.activeTraversals[0].progress,
            traversalProgress,
            5e-8
        );
        assert.equal( diagnostics.aggregation, false );
        assert.equal( diagnostics.spatialConvergenceClaim, false );
        assert.equal( diagnostics.mode, 'one-to-one' );
        assert.equal( diagnostics.provenanceCardinality, 1 );
        let strongestIndex = 0;
        for ( let index = 1; index < signal.count; index += 1 )
        {
            if ( signal.getX( index ) > signal.getX( strongestIndex ) )
            {
                strongestIndex = index;
            }
        }
        assert.ok( signal.getX( strongestIndex ) > 0.99 );
        const strongestPhase = phase.getX( strongestIndex );
        const strongestWarmth = warmth.getX( strongestIndex );
        assertNear(
            strongestWarmth,
            THREE.MathUtils.smoothstep( strongestPhase, 0, 1 ),
            2e-7
        );
        headWarmth.push( strongestWarmth );

        const activeRings = [];
        for ( let ring = 0; ring <= metadata.tubularSegments; ring += 1 )
        {
            const index = ring * ringSize;
            if ( signal.getX( index ) > 0.05 )
            {
                activeRings.push( warmth.getX( index ) );
            }
        }
        assert.ok( activeRings.length > 3 );
        assert.ok( activeRings.slice( 1 ).every( ( value, index ) =>
            value + 1e-8 >= activeRings[index]
        ) );
        assert.ok( activeRings.slice( 1 ).every( ( value, index ) =>
            value - activeRings[index] < 0.025
        ) );
    }
    assert.ok( headWarmth.slice( 1 ).every( ( value, index ) =>
        value > headWarmth[index]
    ) );
    assert.ok( headWarmth[0] < 0.05 );
    assert.ok( headWarmth.at( -1 ) > 0.8 );

    let diagnostics = fixture.layer.group.userData.trunkRunes;
    assert.equal( diagnostics.entryCount, 1 );
    assert.equal( diagnostics.consumptionCount, 1 );
    assert.equal( diagnostics.outputCount, 1 );
    assert.equal( diagnostics.centreResumeCount, 0 );
    assert.equal( diagnostics.activeTraversals[0].phase, 'internal-output' );
    assert.equal( diagnostics.activeTraversals[0].outputPacketId, outputId );
    const record = diagnostics.transductionRecords[0];
    assert.ok( Object.isFrozen( record ) );
    assert.equal( record.sourcePacketId, source.id );
    assert.equal( record.outputPacketId, outputId );
    assert.notEqual( record.outputPacketId, record.sourcePacketId );
    assert.equal( record.mode, 'one-to-one' );
    assert.equal( record.aggregation, false );
    assert.equal( record.provenanceCardinality, 1 );
    assert.equal( record.provenance.length, 1 );
    assert.equal( record.provenance[0].sourcePacketId, source.id );
    assertNear( record.consumedAt, transformedAt, 2e-8 );
    assertConserved( diagnostics );

    fixture.layer.update( resumedAt + 0.000001, fixture.form );
    diagnostics = fixture.layer.group.userData.trunkRunes;
    assert.equal( diagnostics.activeTraversalCount, 0 );
    assert.equal( diagnostics.centreResumeCount, 1 );
    assert.ok( Array.from( signal.array ).every( ( value ) => value === 0 ) );
    assert.ok( Array.from( warmth.array ).every( ( value ) => value === 0 ) );
    assertConserved( diagnostics );
    const output = fixture.layer.group.userData.routedLight.activePackets.find(
        ( packet ) => packet.id === outputId
    );
    assert.ok( output );
    assert.equal( output.kind, 'transduced-output' );
    assert.equal( output.sourcePacketId, source.id );
    assert.deepEqual( output.provenance, record.provenance );
    assert.equal(
        fixture.layer.group.userData.routedLight.activePackets.some(
            ( packet ) => packet.id === source.id
        ),
        false
    );
} );

test( 'O1 rebuilds with the unchanged Tree and keeps 11 Hz traffic bounded', () => {
    const optical = createOpticalFixture();
    const legacy = createFixture();
    const compareAcceptedGeometry = ( phase ) => {
        for ( const name of [
            'monumental trunk',
            'assembly -> joining',
            'routed information core'
        ] )
        {
            const opticalMesh = optical.layer.group.getObjectByName( name );
            const legacyMesh = legacy.layer.group.getObjectByName( name );
            assert.ok( opticalMesh, `${phase} optical ${name} must exist` );
            assert.ok( legacyMesh, `${phase} legacy ${name} must exist` );
            assert.deepEqual(
                opticalMesh.geometry.getAttribute( 'position' ).array,
                legacyMesh.geometry.getAttribute( 'position' ).array,
                `${phase} ${name} positions changed with the O1 profile`
            );
            assert.deepEqual(
                opticalMesh.geometry.index.array,
                legacyMesh.geometry.index.array,
                `${phase} ${name} indices changed with the O1 profile`
            );
        }
    };
    compareAcceptedGeometry( 'initial' );

    const initial = optical.layer.getTrunkRuneResources();
    const initialMesh = initial.mesh;
    const initialGeometry = initial.geometry;
    const initialMaterial = initial.material;
    const initialRevision = initial.revision;
    const initialPathLength = initial.geometry.userData.trunkRunes.pathLength;
    optical.layer.setGrowthProgress( matureProgress( optical.hierarchy ) );
    legacy.layer.setGrowthProgress( matureProgress( legacy.hierarchy ) );
    compareAcceptedGeometry( 'mature' );
    const rebuilt = optical.layer.getTrunkRuneResources();
    assert.equal( rebuilt.mesh, initialMesh );
    assert.equal( rebuilt.material, initialMaterial );
    assert.notEqual( rebuilt.geometry, initialGeometry );
    assert.ok( rebuilt.revision > initialRevision );
    assert.equal( rebuilt.candidateId, trunkRuneCandidateIds.opticalFibre );
    assert.equal( rebuilt.geometry.userData.trunkRunes.coveredTrunkSpanCount, 3 );
    assert.ok( rebuilt.geometry.userData.trunkRunes.pathLength
        > initialPathLength );
    assert.equal(
        rebuilt.geometry.userData.trunkRunes.sourceGeometryUuid,
        rebuilt.trunkMesh.geometry.uuid
    );
    assert.equal(
        rebuilt.material.userData.deformationUniforms.time,
        rebuilt.deformationUniforms.time
    );
    assert.equal(
        rebuilt.material.userData.deformationUniforms.response,
        rebuilt.deformationUniforms.response
    );

    const parameters = { packetFrequency: 11, packetSpeed: 0.5 };
    const stress = createMatureOpticalFixture( parameters );
    const control = createMatureOpticalFixture();
    const stressResources = stress.layer.getTrunkRuneResources();
    const stressGeometry = stressResources.geometry;
    const stressMaterial = stressResources.material;
    const stressMesh = stressResources.mesh;
    const stressTrunk = stress.layer.group.getObjectByName( 'monumental trunk' );
    const trunkPositions = copyAttribute( stressTrunk.geometry, 'position' );
    const trunkIndices = stressTrunk.geometry.index.array.slice();
    assert.deepEqual(
        stressGeometry.getAttribute( 'position' ).array,
        control.layer.getTrunkRuneResources().geometry
            .getAttribute( 'position' ).array,
        'frequency and speed controls must not change O1 geometry'
    );
    stress.layer.update( 0, stress.form );
    stress.layer.update( 1500, stress.form );
    const diagnostics = stress.layer.group.userData.trunkRunes;
    const transport = stress.layer.group.userData.routedLight;
    const current = stress.layer.getTrunkRuneResources();
    const traversalCapacity = Math.ceil(
        parameters.packetFrequency * diagnostics.pathLength
            / parameters.packetSpeed
    ) + transport.eligibleEmitterCount;

    assert.ok( diagnostics.entryCount > diagnostics.auditCapacity );
    assert.ok( diagnostics.outputCount > diagnostics.auditCapacity );
    assert.equal( diagnostics.auditTruncated, true );
    assert.ok( diagnostics.activeTraversalCount > transport.eligibleEmitterCount );
    assert.ok( diagnostics.activeTraversalCount <= traversalCapacity );
    assert.equal( diagnostics.entryRecords.length <= diagnostics.auditCapacity, true );
    assert.equal( diagnostics.transductionRecords.length
        <= diagnostics.auditCapacity, true );
    assert.equal( diagnostics.centreResumeRecords.length
        <= diagnostics.auditCapacity, true );
    assert.equal(
        new Set( diagnostics.entryRecords.map( ( record ) => record.id ) ).size,
        diagnostics.entryRecords.length
    );
    assert.equal(
        new Set( diagnostics.transductionRecords.map(
            ( record ) => record.sourcePacketId
        ) ).size,
        diagnostics.transductionRecords.length
    );
    assert.equal(
        new Set( diagnostics.transductionRecords.map(
            ( record ) => record.outputPacketId
        ) ).size,
        diagnostics.transductionRecords.length
    );
    assert.ok( diagnostics.transductionRecords.every( ( record ) =>
        record.mode === 'one-to-one'
        && record.aggregation === false
        && record.provenanceCardinality === 1
        && record.provenance.length === 1
        && record.provenance[0].sourcePacketId === record.sourcePacketId
        && record.outputPacketId
            === `${record.sourcePacketId}::meaning-transducer::output`
    ) );
    assert.equal( diagnostics.mode, 'one-to-one' );
    assert.equal( diagnostics.aggregation, false );
    assert.equal( diagnostics.spatialConvergenceClaim, false );
    assert.equal( diagnostics.visualSampling.packetLoss, false );
    assert.equal( diagnostics.visualSampling.aggregation, false );
    assertConserved( diagnostics );
    assert.equal( current.mesh, stressMesh );
    assert.equal( current.geometry, stressGeometry );
    assert.equal( current.material, stressMaterial );
    assert.equal( current.granuleMesh, null );
    assert.equal( current.granuleGeometry, null );
    assert.equal( diagnostics.meshCount, 1 );
    assert.equal( diagnostics.maximumDrawCalls, 1 );
    assert.equal( diagnostics.activeDrawCalls, 1 );
    assert.equal( transport.activePackets.length,
        transport.activeTransportPacketCount );
    assert.equal(
        transport.activeEventCount,
        transport.activePackets.length + diagnostics.activeTraversalCount
    );
    assertAttributeEquals( stressTrunk.geometry, 'position', trunkPositions );
    assert.deepEqual( stressTrunk.geometry.index.array, trunkIndices );
} );

test( 'one source lights E2 blue, transforms, and resumes as gold', () => {
    const fixture = createFixture();
    fixture.layer.update( 0, fixture.form );
    const source = fixture.layer.group.userData.routedLight.activePackets[0];
    assert.ok( source );
    assert.equal( source.kind, 'source' );
    assert.equal( source.provenance, null );

    const route = getRoute( fixture, source.terminalId );
    const boundaries = getTrunkRuneRouteDistances(
        route,
        trunkRuneTransducerSite,
        trunkRuneCandidateIds.longitudinal
    );
    const resources = fixture.layer.getTrunkRuneResources();
    const metadata = resources.geometry.userData.trunkRunes;
    const enteredAt = source.emittedAt
        + boundaries.entryDistance / fixture.form.packetSpeed;
    const transformedAt = enteredAt
        + metadata.internalTransformationDistance / fixture.form.packetSpeed;
    const resumedAt = enteredAt + metadata.pathLength / fixture.form.packetSpeed;
    const outputId = `${source.id}::meaning-transducer::output`;

    fixture.layer.update( enteredAt - 0.001, fixture.form );
    let diagnostics = fixture.layer.group.userData.trunkRunes;
    assert.equal( diagnostics.entryCount, 0 );
    assert.ok( fixture.layer.group.userData.routedLight.activePackets
        .some( ( packet ) => packet.id === source.id ) );

    fixture.layer.update( enteredAt + 0.000001, fixture.form );
    diagnostics = fixture.layer.group.userData.trunkRunes;
    assert.equal( diagnostics.mode, 'one-to-one' );
    assert.equal( diagnostics.aggregation, false );
    assert.equal( diagnostics.spatialConvergenceClaim, false );
    assert.equal( diagnostics.candidateId, trunkRuneCandidateIds.longitudinal );
    assert.equal( diagnostics.entryCount, 1 );
    assert.equal( diagnostics.consumptionCount, 0 );
    assert.equal( diagnostics.outputCount, 0 );
    assert.equal( diagnostics.activeTraversalCount, 1 );
    assert.equal( diagnostics.activeTraversals[0].phase, 'internal-source' );
    assert.equal( diagnostics.activeTraversals[0].sourcePacketId, source.id );
    assert.equal( diagnostics.activeTraversals[0].outputPacketId, null );
    assert.equal( diagnostics.rendererEligible, false );
    assert.equal( diagnostics.visible, true );
    assert.equal( diagnostics.activeDrawCalls, 2 );
    assert.equal( resources.mesh.visible, true );
    assert.equal(
        fixture.layer.group.userData.routedLight.activePackets
            .some( ( packet ) => packet.id === source.id ),
        false
    );
    const entry = diagnostics.entryRecords[0];
    assert.ok( Object.isFrozen( entry ) );
    assert.ok( Object.isFrozen( entry.routeNodeIds ) );
    assert.equal( entry.recordType, 'internal-entry' );
    assert.equal( entry.sourcePacketId, source.id );
    assert.equal( entry.aggregation, false );
    assert.equal( entry.sourcePacketCount, 1 );
    assertNear( entry.enteredAt, enteredAt, 2e-8 );
    assertNear( entry.entryRouteDistance, boundaries.entryDistance );
    assertNear( entry.exitRouteDistance, boundaries.exitDistance );
    assertVectorNear(
        new THREE.Vector3().fromArray( entry.centreEntryPoint ),
        new THREE.Vector3().fromArray( metadata.centreEntryPoint )
    );
    assertConserved( diagnostics );

    fixture.layer.update( transformedAt - 0.000001, fixture.form );
    diagnostics = fixture.layer.group.userData.trunkRunes;
    assert.equal( diagnostics.consumptionCount, 0 );
    assert.equal( diagnostics.activeTraversals[0].phase, 'internal-source' );
    assert.ok( Array.from( resources.geometry.getAttribute( 'runeWarmth' ).array )
        .every( ( value ) => value === 0 ) );
    assert.ok( Array.from(
        resources.granuleGeometry.getAttribute( 'runeWarmth' ).array
    ).every( ( value ) => value === 0 ) );

    fixture.layer.update( transformedAt + 0.000001, fixture.form );
    diagnostics = fixture.layer.group.userData.trunkRunes;
    assert.equal( diagnostics.consumptionCount, 1 );
    assert.equal( diagnostics.outputCount, 1 );
    assert.equal( diagnostics.centreResumeCount, 0 );
    assert.equal( diagnostics.activeTraversalCount, 1 );
    assert.equal( diagnostics.activeTraversals[0].phase, 'internal-output' );
    assert.equal( diagnostics.activeTraversals[0].kind, 'transduced-output' );
    assert.equal( diagnostics.activeTraversals[0].outputPacketId, outputId );
    assert.ok( Array.from( resources.geometry.getAttribute( 'runeSignal' ).array )
        .some( ( value ) => value > 0 ) );
    assert.ok( Array.from( resources.geometry.getAttribute( 'runeWarmth' ).array )
        .some( ( value ) => value > 0 ) );
    assert.ok( Array.from(
        resources.granuleGeometry.getAttribute( 'runeSignal' ).array
    ).some( ( value ) => value > 0 ) );
    assert.ok( Array.from(
        resources.granuleGeometry.getAttribute( 'runeWarmth' ).array
    ).some( ( value ) => value > 0 ) );
    assert.equal(
        fixture.layer.group.userData.routedLight.activePackets
            .some( ( packet ) => packet.id === outputId ),
        false
    );

    const record = diagnostics.transductionRecords[0];
    assert.ok( Object.isFrozen( record ) );
    assert.ok( Object.isFrozen( record.provenance ) );
    assert.ok( Object.isFrozen( record.provenance[0] ) );
    assert.equal( record.sourcePacketId, source.id );
    assert.equal( record.outputPacketId, outputId );
    assert.notEqual( record.outputPacketId, record.sourcePacketId );
    assert.equal( record.provenanceCardinality, 1 );
    assert.equal( record.sourcePacketCount, 1 );
    assert.equal( record.outputPacketCount, 1 );
    assert.equal( record.aggregation, false );
    assert.equal( record.mode, 'one-to-one' );
    assertNear( record.enteredAt, enteredAt, 2e-8 );
    assertNear( record.consumedAt, transformedAt, 2e-8 );
    assert.equal( record.outputAt, record.consumedAt );
    assertNear(
        record.internalTransformationDistance,
        metadata.internalTransformationDistance
    );
    assertVectorNear(
        new THREE.Vector3().fromArray( record.internalTransformationPoint ),
        new THREE.Vector3().fromArray( metadata.internalTransformationPoint )
    );
    assert.equal( record.provenance[0].sourcePacketId, source.id );
    assert.equal( record.provenance[0].sourceTerminalId, source.terminalId );
    assert.equal( record.provenance[0].consumedAt, record.consumedAt );
    assertConserved( diagnostics );

    fixture.layer.update( resumedAt + 0.000001, fixture.form );
    diagnostics = fixture.layer.group.userData.trunkRunes;
    const transport = fixture.layer.group.userData.routedLight;
    assert.equal( diagnostics.activeTraversalCount, 0 );
    assert.equal( diagnostics.centreResumeCount, 1 );
    assert.equal( diagnostics.rendererEligible, false );
    assert.equal( diagnostics.visible, true );
    for ( const candidate of [ resources.geometry, resources.granuleGeometry ] )
    {
        assert.ok( Array.from( candidate.getAttribute( 'runeSignal' ).array )
            .every( ( value ) => value === 0 ) );
        assert.ok( Array.from( candidate.getAttribute( 'runeWarmth' ).array )
            .every( ( value ) => value === 0 ) );
    }
    assertConserved( diagnostics );
    const resume = diagnostics.centreResumeRecords[0];
    assert.ok( Object.isFrozen( resume ) );
    assert.equal( resume.recordType, 'centre-resume' );
    assert.equal( resume.sourcePacketId, source.id );
    assert.equal( resume.outputPacketId, outputId );
    assertNear( resume.resumedAt, resumedAt, 2e-8 );
    assertVectorNear(
        new THREE.Vector3().fromArray( resume.centreResumePoint ),
        new THREE.Vector3().fromArray( metadata.centreResumePoint )
    );
    const output = transport.activePackets.find( ( packet ) => packet.id === outputId );
    assert.ok( output );
    assert.equal( output.kind, 'transduced-output' );
    assert.equal( output.signalClass, 'output' );
    assert.equal( output.sourcePacketId, source.id );
    assert.equal( output.routeStartDistance, boundaries.exitDistance );
    assert.deepEqual( output.provenance, record.provenance );
    assert.equal( transport.activePackets.some( ( packet ) =>
        packet.id === source.id ), false );
    assertNear(
        output.headDistance,
        boundaries.exitDistance
            + ( resumedAt + 0.000001 - resume.resumedAt ) * fixture.form.packetSpeed,
        2e-6
    );

    const coarse = createFixture();
    coarse.layer.update( 0, coarse.form );
    coarse.layer.update( resumedAt + 0.000001, coarse.form );
    assert.deepEqual(
        coarse.layer.group.userData.trunkRunes.entryRecords,
        diagnostics.entryRecords
    );
    assert.deepEqual(
        coarse.layer.group.userData.trunkRunes.transductionRecords,
        diagnostics.transductionRecords
    );
    assert.deepEqual(
        coarse.layer.group.userData.trunkRunes.centreResumeRecords,
        diagnostics.centreResumeRecords
    );
} );

test( 'speed changes preserve continuous motion before and after internal transformation', () => {
    const fixture = createFixture( { packetSpeed: 1 } );
    fixture.layer.update( 0, fixture.form );
    const source = fixture.layer.group.userData.routedLight.activePackets[0];
    const route = getRoute( fixture, source.terminalId );
    const boundaries = getTrunkRuneRouteDistances(
        route,
        trunkRuneTransducerSite,
        trunkRuneCandidateIds.longitudinal
    );
    const metadata = fixture.layer.getTrunkRuneResources().geometry.userData.trunkRunes;
    const enteredAt = source.emittedAt + boundaries.entryDistance;
    const sourceCheckpoint = enteredAt + metadata.internalTransformationDistance * 0.25;
    fixture.layer.update( sourceCheckpoint, fixture.form );
    let traversal = fixture.layer.getTrunkRuneResources().activeTraversals[0];
    assert.ok( traversal );
    assert.equal( traversal.transformed, false );
    const sourceDistance = traversal.distance;

    const slow = { ...fixture.form, packetSpeed: 0.4 };
    fixture.layer.update( sourceCheckpoint, slow );
    traversal = fixture.layer.getTrunkRuneResources().activeTraversals[0];
    assertNear( traversal.distance, sourceDistance, 1e-10 );
    const sourceStep = Math.min(
        0.2,
        ( metadata.internalTransformationDistance - sourceDistance ) / 0.4 * 0.25
    );
    fixture.layer.update( sourceCheckpoint + sourceStep, slow );
    traversal = fixture.layer.getTrunkRuneResources().activeTraversals[0];
    assertNear( traversal.distance, sourceDistance + sourceStep * 0.4, 2e-8 );

    const transformedAt = sourceCheckpoint + sourceStep
        + ( metadata.internalTransformationDistance - traversal.distance ) / 0.4;
    fixture.layer.update( transformedAt + 0.000001, slow );
    traversal = fixture.layer.getTrunkRuneResources().activeTraversals[0];
    assert.ok( traversal );
    assert.equal( traversal.transformed, true );
    const outputDistance = traversal.distance;

    const fast = { ...fixture.form, packetSpeed: 2.1 };
    fixture.layer.update( transformedAt + 0.000001, fast );
    traversal = fixture.layer.getTrunkRuneResources().activeTraversals[0];
    assertNear( traversal.distance, outputDistance, 1e-10 );
    const outputStep = Math.min(
        0.05,
        ( metadata.pathLength - outputDistance ) / 2.1 * 0.25
    );
    fixture.layer.update( transformedAt + 0.000001 + outputStep, fast );
    traversal = fixture.layer.getTrunkRuneResources().activeTraversals[0];
    assertNear( traversal.distance, outputDistance + outputStep * 2.1, 2e-8 );
    assertConserved( fixture.layer.group.userData.trunkRunes );
} );

test( '11 Hz shared-route congestion conserves independent identities across cadences', () => {
    const parameters = { packetFrequency: 11, packetSpeed: 0.5 };
    const fine = createMatureFixture( parameters );
    fine.layer.update( 0, fine.form );
    let maximumConcurrent = 0;
    const finalElapsed = 45;
    for ( let step = 1; step <= finalElapsed * 10; step += 1 )
    {
        fine.layer.update( step / 10, fine.form );
        maximumConcurrent = Math.max(
            maximumConcurrent,
            fine.layer.group.userData.trunkRunes.activeTraversalCount
        );
        assertConserved( fine.layer.group.userData.trunkRunes );
    }
    const diagnostics = fine.layer.group.userData.trunkRunes;
    const transport = fine.layer.group.userData.routedLight;
    const fineRunes = fine.layer.getTrunkRuneResources();
    assert.ok( maximumConcurrent > 1 );
    assert.ok( diagnostics.entryCount > 100 );
    assert.ok(
        diagnostics.outputCount > diagnostics.entryCount * 0.25,
        'the longer sculptural route must still transform sustained 11 Hz traffic'
    );
    assert.equal( new Set( diagnostics.activeCausalPacketIds ).size,
        diagnostics.activeCausalPacketIds.length );
    assert.equal( new Set( diagnostics.entryRecords.map( ( record ) =>
        record.sourcePacketId ) ).size, diagnostics.entryRecords.length );
    assert.equal( new Set( diagnostics.transductionRecords.map( ( record ) =>
        record.outputPacketId ) ).size, diagnostics.transductionRecords.length );
    assert.equal( diagnostics.aggregation, false );
    assert.equal( diagnostics.spatialConvergenceClaim, false );
    assert.equal( diagnostics.mode, 'one-to-one' );
    assert.equal( diagnostics.visualSampling.packetLoss, false );
    assert.equal( diagnostics.meshCount, 2 );
    assert.equal( diagnostics.maximumDrawCalls, 2 );
    for ( const geometry of [ fineRunes.geometry, fineRunes.granuleGeometry ] )
    {
        for ( const name of [ 'runeSignal', 'runeWarmth' ] )
        {
            const values = Array.from( geometry.getAttribute( name ).array );
            assert.ok( values.every( Number.isFinite ) );
            assert.ok( values.every( ( value ) => value >= 0 && value <= 1 ) );
        }
    }
    for ( const record of diagnostics.transductionRecords )
    {
        assert.equal( record.provenanceCardinality, 1 );
        assert.equal( record.provenance.length, 1 );
        assert.equal( record.provenance[0].sourcePacketId, record.sourcePacketId );
        assert.notEqual( record.outputPacketId, record.sourcePacketId );
    }

    const coarse = createMatureFixture( parameters );
    coarse.layer.update( 0, coarse.form );
    coarse.layer.update( finalElapsed, coarse.form );
    const coarseDiagnostics = coarse.layer.group.userData.trunkRunes;
    const coarseRunes = coarse.layer.getTrunkRuneResources();
    assert.equal(
        coarse.layer.group.userData.routedLight.emittedPacketCount,
        transport.emittedPacketCount
    );
    assert.equal( coarseDiagnostics.entryCount, diagnostics.entryCount );
    assert.equal( coarseDiagnostics.outputCount, diagnostics.outputCount );
    assert.equal( coarseDiagnostics.centreResumeCount, diagnostics.centreResumeCount );
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
    const finePackets = sortPackets( transport.activePackets );
    const coarsePackets = sortPackets(
        coarse.layer.group.userData.routedLight.activePackets
    );
    assert.deepEqual(
        coarsePackets.map( ( packet ) => packet.id ),
        finePackets.map( ( packet ) => packet.id )
    );
    for ( let index = 0; index < finePackets.length; index += 1 )
    {
        assert.equal( coarsePackets[index].kind, finePackets[index].kind );
        assert.equal(
            coarsePackets[index].sourcePacketId,
            finePackets[index].sourcePacketId
        );
        assert.deepEqual( coarsePackets[index].provenance, finePackets[index].provenance );
        assertNear( coarsePackets[index].headDistance, finePackets[index].headDistance, 2e-8 );
    }
    for ( const [ fineGeometry, coarseGeometry ] of [
        [ fineRunes.geometry, coarseRunes.geometry ],
        [ fineRunes.granuleGeometry, coarseRunes.granuleGeometry ]
    ] )
    {
        assert.deepEqual(
            coarseGeometry.getAttribute( 'runeSignal' ).array,
            fineGeometry.getAttribute( 'runeSignal' ).array
        );
        assert.deepEqual(
            coarseGeometry.getAttribute( 'runeWarmth' ).array,
            fineGeometry.getAttribute( 'runeWarmth' ).array
        );
    }
    assertConserved( coarseDiagnostics );
} );

test( 'visual toggle affects only E2, not Tree or transduction', () => {
    const parameters = { packetFrequency: 11, packetSpeed: 0.5 };
    const enabled = createMatureFixture( parameters );
    const disabled = createMatureFixture( parameters );
    disabled.layer.setTrunkRunesVisible( false );

    const trunk = enabled.layer.group.getObjectByName( 'monumental trunk' );
    const branch = enabled.layer.group.getObjectByName( 'assembly -> joining' );
    const core = enabled.layer.group.getObjectByName( 'routed information core' );
    const skeleton = enabled.layer.getTrunkVisibilityResources().skeletonMesh;
    const runes = enabled.layer.getTrunkRuneResources();
    const snapshots = {
        childCount: enabled.layer.group.children.length,
        trunkGeometry: trunk.geometry,
        trunkMaterial: trunk.material,
        trunkPositions: copyAttribute( trunk.geometry, 'position' ),
        trunkIndices: trunk.geometry.index.array.slice(),
        branchGeometry: branch.geometry,
        branchMaterial: branch.material,
        branchPositions: copyAttribute( branch.geometry, 'position' ),
        branchIndices: branch.geometry.index.array.slice(),
        coreGeometry: core.geometry,
        coreMaterial: core.material,
        corePositions: copyAttribute( core.geometry, 'position' ),
        coreIndices: core.geometry.index.array.slice(),
        skeletonGeometry: skeleton.geometry,
        skeletonMaterial: skeleton.material,
        skeletonDescriptor: skeleton.geometry.userData.trunkInterior.descriptor,
        skeletonPositions: copyAttribute( skeleton.geometry, 'position' ),
        skeletonIndices: skeleton.geometry.index.array.slice(),
        carrierVisibility: copyAttribute( skeleton.geometry, 'carrierVisibility' ),
        runeMesh: runes.mesh,
        runeGeometry: runes.geometry,
        runeMaterial: runes.material,
        runePositions: copyAttribute( runes.geometry, 'position' ),
        runeIndices: runes.geometry.index.array.slice(),
        granuleMesh: runes.granuleMesh,
        granuleGeometry: runes.granuleGeometry,
        granulePositions: copyAttribute( runes.granuleGeometry, 'position' ),
        granuleIndices: runes.granuleGeometry.index.array.slice()
    };

    for ( let elapsed = 0; elapsed <= 30; elapsed += 0.5 )
    {
        enabled.layer.update( elapsed, enabled.form );
        disabled.layer.update( elapsed, disabled.form );
        assert.deepEqual(
            disabled.layer.group.userData.routedLight,
            enabled.layer.group.userData.routedLight,
            `visual enablement must not alter transport at ${elapsed}s`
        );
    }
    const enabledRunes = enabled.layer.group.userData.trunkRunes;
    const disabledRunes = disabled.layer.group.userData.trunkRunes;
    assert.ok( enabledRunes.entryCount > 0 );
    assert.equal( disabledRunes.enabled, false );
    assert.equal( disabledRunes.visualEnabled, false );
    assert.equal( disabledRunes.rendererEligible, false );
    assert.equal( disabledRunes.transductionAlwaysActive, true );
    assert.equal( disabledRunes.visible, false );
    assert.equal( enabledRunes.visible, true );
    assert.equal( enabledRunes.rendererEligible, false );
    assert.equal( disabledRunes.entryCount, enabledRunes.entryCount );
    assert.equal( disabledRunes.outputCount, enabledRunes.outputCount );
    assert.deepEqual(
        disabled.layer.getTrunkRuneResources().entryRecords,
        enabled.layer.getTrunkRuneResources().entryRecords
    );
    assert.deepEqual(
        disabled.layer.getTrunkRuneResources().transductionRecords,
        enabled.layer.getTrunkRuneResources().transductionRecords
    );
    assertConserved( disabledRunes );
    assertConserved( enabledRunes );

    assert.equal( enabled.layer.group.children.length, snapshots.childCount );
    assert.equal( trunk.geometry, snapshots.trunkGeometry );
    assert.equal( trunk.material, snapshots.trunkMaterial );
    assertAttributeEquals( trunk.geometry, 'position', snapshots.trunkPositions );
    assert.deepEqual( trunk.geometry.index.array, snapshots.trunkIndices );
    assert.equal( branch.geometry, snapshots.branchGeometry );
    assert.equal( branch.material, snapshots.branchMaterial );
    assertAttributeEquals( branch.geometry, 'position', snapshots.branchPositions );
    assert.deepEqual( branch.geometry.index.array, snapshots.branchIndices );
    assert.equal( core.geometry, snapshots.coreGeometry );
    assert.equal( core.material, snapshots.coreMaterial );
    assertAttributeEquals( core.geometry, 'position', snapshots.corePositions );
    assert.deepEqual( core.geometry.index.array, snapshots.coreIndices );
    assert.equal( skeleton.geometry, snapshots.skeletonGeometry );
    assert.equal( skeleton.material, snapshots.skeletonMaterial );
    assert.equal(
        skeleton.geometry.userData.trunkInterior.descriptor,
        snapshots.skeletonDescriptor
    );
    assertAttributeEquals( skeleton.geometry, 'position', snapshots.skeletonPositions );
    assertAttributeEquals(
        skeleton.geometry,
        'carrierVisibility',
        snapshots.carrierVisibility
    );
    assert.deepEqual( skeleton.geometry.index.array, snapshots.skeletonIndices );
    assert.equal( skeleton.visible, false );
    assert.equal( enabled.layer.getTrunkVisibilityMode(), 'off' );
    assert.equal( enabled.layer.getTrunkRuneResources().mesh, snapshots.runeMesh );
    assert.equal( enabled.layer.getTrunkRuneResources().geometry, snapshots.runeGeometry );
    assert.equal( enabled.layer.getTrunkRuneResources().material, snapshots.runeMaterial );
    assert.equal( enabled.layer.getTrunkRuneResources().ownershipGeometry, null );
    assert.equal( enabled.layer.getTrunkRuneResources().granuleMesh,
        snapshots.granuleMesh );
    assert.equal( enabled.layer.getTrunkRuneResources().granuleGeometry,
        snapshots.granuleGeometry );
    assertAttributeEquals( runes.geometry, 'position', snapshots.runePositions );
    assert.deepEqual( runes.geometry.index.array, snapshots.runeIndices );
    assertAttributeEquals( runes.granuleGeometry, 'position',
        snapshots.granulePositions );
    assert.deepEqual( runes.granuleGeometry.index.array,
        snapshots.granuleIndices );
    assert.equal( runes.geometry.getAttribute( 'carrierVisibility' ), undefined );
    assert.equal( runes.granuleGeometry.getAttribute( 'carrierVisibility' ), undefined );
    assert.equal( runes.mesh.visible, true );
    assert.equal( disabled.layer.getTrunkRuneResources().mesh.visible, false );
    assert.equal( runes.material.depthFunc, THREE.LessEqualDepth );
    assert.equal( runes.material.depthWrite, true );
    assert.equal( runes.material.transparent, false );
    assert.notEqual( snapshots.runeMaterial, snapshots.trunkMaterial );
} );

test( 'growth withdrawal and rebuild cannot backdate or strand internal ownership', () => {
    const growing = createFixture();
    for ( let elapsed = 0; elapsed <= 10; elapsed += 0.5 )
    {
        growing.layer.update( elapsed, growing.form );
    }
    const beforeGrowth = growing.layer.group.userData.trunkRunes.entryRecords;
    assert.ok( beforeGrowth.length > 0 );
    for ( const entry of beforeGrowth )
    {
        assert.ok( getRoute( growing, entry.terminalId ).nodes
            .every( ( node ) => !node.latent ) );
    }

    growing.layer.setGrowthProgress( matureProgress( growing.hierarchy ) );
    growing.layer.update( 10, growing.form );
    for ( let elapsed = 10.5; elapsed <= 50; elapsed += 0.5 )
    {
        growing.layer.update( elapsed, growing.form );
    }
    const newlyManifested = growing.layer.group.userData.trunkRunes.entryRecords
        .filter( ( entry ) => getRoute( growing, entry.terminalId ).nodes
            .some( ( node ) => node.latent ) );
    assert.ok( newlyManifested.length > 0 );
    for ( const entry of newlyManifested )
    {
        const route = getRoute( growing, entry.terminalId );
        const boundaries = getTrunkRuneRouteDistances(
            route,
            trunkRuneTransducerSite,
            trunkRuneCandidateIds.longitudinal
        );
        assertNear( entry.entryRouteDistance, boundaries.entryDistance );
        assertNear( entry.exitRouteDistance, boundaries.exitDistance );
        assert.ok( entry.sourceEmittedAt >= 10 );
        assertNear(
            entry.enteredAt,
            entry.sourceEmittedAt + boundaries.entryDistance / growing.form.packetSpeed,
            2e-6
        );
    }

    const parameters = { packetFrequency: 11, packetSpeed: 0.5 };
    const withdrawal = createMatureFixture( parameters );
    let target = null;
    let withdrawnAt = 0;
    for ( let elapsed = 0; elapsed <= 30; elapsed += 0.1 )
    {
        const stableElapsed = Number( elapsed.toFixed( 6 ) );
        withdrawal.layer.update( stableElapsed, withdrawal.form );
        target = withdrawal.layer.getTrunkRuneResources().activeTraversals
            .find( ( traversal ) => traversal.route.nodes.some( ( node ) =>
                node.latent
            ) );
        if ( target )
        {
            withdrawnAt = stableElapsed;
            break;
        }
    }
    assert.ok( target );
    const sourceId = target.sourcePacketId;
    const outputId = `${sourceId}::meaning-transducer::output`;
    const exitAt = withdrawnAt
        + ( target.pathLength - target.distance ) / withdrawal.form.packetSpeed
        + 0.000001;
    withdrawal.layer.setGrowthProgress( new Map() );
    withdrawal.layer.update( withdrawnAt, withdrawal.form );
    let diagnostics = withdrawal.layer.group.userData.trunkRunes;
    assert.ok( diagnostics.activeCausalPacketIds.includes( sourceId ) );
    assertConserved( diagnostics );

    withdrawal.layer.update( exitAt, withdrawal.form );
    diagnostics = withdrawal.layer.group.userData.trunkRunes;
    const settled = diagnostics.transductionRecords.find( ( record ) =>
        record.sourcePacketId === sourceId
    );
    assert.ok( settled );
    assert.equal( settled.outputPacketId, outputId );
    assert.equal( diagnostics.activeCausalPacketIds.includes( sourceId ), false );
    assert.ok( withdrawal.layer.group.userData.routedLight.activePackets
        .some( ( packet ) => packet.id === outputId ) );
    assert.equal(
        withdrawal.layer.group.userData.routedLight.activePackets
            .some( ( packet ) => packet.id === sourceId ),
        false
    );
    assertConserved( diagnostics );

    const remanifestedAt = exitAt;
    const entriesAtRemanifestation = diagnostics.entryCount;
    withdrawal.layer.setGrowthProgress( matureProgress( withdrawal.hierarchy ) );
    withdrawal.layer.update( remanifestedAt, withdrawal.form );
    for ( let elapsed = remanifestedAt + 0.5;
        elapsed <= remanifestedAt + 30;
        elapsed += 0.5 )
    {
        withdrawal.layer.update( elapsed, withdrawal.form );
    }
    const postRemanifestation = withdrawal.layer.group.userData.trunkRunes
        .entryRecords.slice( entriesAtRemanifestation );
    const latentEntries = postRemanifestation.filter( ( entry ) =>
        getRoute( withdrawal, entry.terminalId ).nodes.some( ( node ) =>
            node.latent
        )
    );
    assert.ok( latentEntries.length > 0 );
    assert.ok( latentEntries.every( ( entry ) =>
        entry.sourceEmittedAt >= remanifestedAt
    ) );

    withdrawal.layer.rebuild( withdrawal.positions, withdrawal.form );
    const reset = withdrawal.layer.group.userData.trunkRunes;
    assert.equal( reset.entryCount, 0 );
    assert.equal( reset.consumptionCount, 0 );
    assert.equal( reset.outputCount, 0 );
    assert.equal( reset.centreResumeCount, 0 );
    assert.equal( reset.activeTraversalCount, 0 );
    assert.equal( reset.entryRecords.length, 0 );
    assert.equal( reset.transductionRecords.length, 0 );
    assert.equal( reset.centreResumeRecords.length, 0 );
    assertConserved( reset );
    withdrawal.layer.setGrowthProgress( matureProgress( withdrawal.hierarchy ) );
    withdrawal.layer.update( 0, withdrawal.form );
    assert.equal(
        withdrawal.layer.group.userData.routedLight.activePackets[0].id,
        'steel@0.000000'
    );
} );

test( 'long maximum-rate operation keeps ledgers and E2 resources bounded', () => {
    const parameters = { packetFrequency: 11, packetSpeed: 0.5 };
    const fixture = createMatureFixture( parameters );
    const resources = fixture.layer.getTrunkRuneResources();
    const initialMesh = resources.mesh;
    const initialGeometry = resources.geometry;
    const initialMaterial = resources.material;
    const initialGranuleMesh = resources.granuleMesh;
    const initialGranuleGeometry = resources.granuleGeometry;
    const initialChildCount = fixture.layer.group.children.length;
    fixture.layer.update( 0, fixture.form );

    let previousEntryCount = 0;
    let previousOutputCount = 0;
    for ( const elapsed of [ 500, 1000, 1500 ] )
    {
        fixture.layer.update( elapsed, fixture.form );
        const diagnostics = fixture.layer.group.userData.trunkRunes;
        const transport = fixture.layer.group.userData.routedLight;
        const current = fixture.layer.getTrunkRuneResources();
        assert.ok( diagnostics.entryCount > previousEntryCount );
        assert.ok( diagnostics.outputCount > previousOutputCount );
        previousEntryCount = diagnostics.entryCount;
        previousOutputCount = diagnostics.outputCount;
        assert.ok( diagnostics.entryCount > diagnostics.auditCapacity );
        assert.ok( diagnostics.outputCount > diagnostics.auditCapacity );
        assert.ok( diagnostics.entryRecords.length <= diagnostics.auditCapacity );
        assert.ok( diagnostics.transductionRecords.length <= diagnostics.auditCapacity );
        assert.ok( diagnostics.centreResumeRecords.length <= diagnostics.auditCapacity );
        assert.equal( diagnostics.retainedEntryRecordCount, diagnostics.entryRecords.length );
        assert.equal(
            diagnostics.retainedTransductionRecordCount,
            diagnostics.transductionRecords.length
        );
        assert.equal(
            diagnostics.retainedCentreResumeRecordCount,
            diagnostics.centreResumeRecords.length
        );
        assert.equal( diagnostics.auditCapacity, 4096 );
        assert.equal( diagnostics.auditTruncated, true );
        assert.equal( current.activeTraversals.length, diagnostics.activeTraversalCount );
        assert.equal( diagnostics.activeEventIds.length, diagnostics.activeTraversalCount );
        assert.equal(
            diagnostics.activeCausalPacketIds.length,
            diagnostics.activeTraversalCount
        );
        // Route-specific travel times can bunch otherwise uniform emissions at
        // the shared transducer. One extra arrival per authored emitter is the
        // deterministic dephasing envelope; growth must not make it unbounded.
        const traversalCapacity = Math.ceil(
            parameters.packetFrequency * diagnostics.pathLength
                / parameters.packetSpeed
        ) + transport.eligibleEmitterCount;
        assert.ok(
            diagnostics.activeTraversalCount <= traversalCapacity,
            `${diagnostics.activeTraversalCount} active traversals exceed `
                + `${traversalCapacity} expected at path ${diagnostics.pathLength}`
        );
        assert.ok( transport.activePackets.length
            <= transport.eligibleEmitterCount * 3 );
        assert.equal( transport.activePackets.length, transport.activeTransportPacketCount );
        assert.equal(
            transport.activeEventCount,
            transport.activePackets.length + current.activeTraversals.length
        );
        assert.equal(
            new Set( diagnostics.entryRecords.map( ( record ) => record.id ) ).size,
            diagnostics.entryRecords.length
        );
        assert.equal(
            new Set( diagnostics.transductionRecords.map( ( record ) =>
                record.sourcePacketId
            ) ).size,
            diagnostics.transductionRecords.length
        );
        assert.equal(
            new Set( diagnostics.transductionRecords.map( ( record ) =>
                record.outputPacketId
            ) ).size,
            diagnostics.transductionRecords.length
        );
        assertConserved( diagnostics );
        assert.equal( diagnostics.aggregation, false );
        assert.equal( diagnostics.spatialConvergenceClaim, false );
        assert.equal( diagnostics.mode, 'one-to-one' );
        assert.equal( diagnostics.visualSampling.aggregation, false );
        assert.equal( diagnostics.visualSampling.packetLoss, false );
        assert.equal( diagnostics.maximumDrawCalls, 2 );
        assert.equal( diagnostics.activeDrawCalls, 2 );
    }

    assert.equal( fixture.layer.getTrunkRuneResources().mesh, initialMesh );
    assert.equal( fixture.layer.getTrunkRuneResources().geometry, initialGeometry );
    assert.equal( fixture.layer.getTrunkRuneResources().material, initialMaterial );
    assert.equal( fixture.layer.getTrunkRuneResources().granuleMesh,
        initialGranuleMesh );
    assert.equal( fixture.layer.getTrunkRuneResources().granuleGeometry,
        initialGranuleGeometry );
    assert.equal( fixture.layer.getTrunkRuneResources().ownershipGeometry, null );
    assert.equal( fixture.layer.group.children.length, initialChildCount );
    assert.equal( fixture.layer.group.userData.trunkRunes.meshCount, 2 );
    assert.equal(
        fixture.layer.group.userData.trunkRunes.vertexCount,
        initialGeometry.getAttribute( 'position' ).count
            + initialGranuleGeometry.getAttribute( 'position' ).count
    );
    assert.equal(
        fixture.layer.group.userData.trunkRunes.triangleCount,
        initialGeometry.index.count / 3 + initialGranuleGeometry.index.count / 3
    );
} );

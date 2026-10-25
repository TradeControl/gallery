import * as THREE from 'three';

export const internalRouterJunctionFormCandidateId =
    'c4d-d4-junction-knot-v1';

export const internalRouterJunctionFormStyle = Object.freeze( {
    longitudinalHalfSpanFraction: 0.64,
    packetRadiusFraction: 0.54,
    tubularSegments: 96,
    radialSegments: 7,
    headWidth: 0.115,
    wakeLength: 0.3,
    wakeAmplitude: 0.42,
    wakeDecay: 3.6,
    // Colour may begin changing only after the audited D2 boundary. A cyan
    // approach can reach the exact waist, but it cannot anticipate gold.
    warmthStart: 0.5,
    warmthEnd: 0.72,
    approachDistance: 0.72,
    departureDistance: 0.72,
    maximumManifestations: 64,
    discardThreshold: 0.004,
    overlapPolicy: 'per-vertex-maximum-no-semantic-aggregation'
} );

export const internalRouterJunctionFormCircumferenceRange = Object.freeze( {
    minimum: 0.2,
    defaultValue: 0.55,
    maximum: 1
} );

const containmentTolerance = 1e-6;
const containmentSurfaceReserve = 0.008;
const containmentSafetyFactor = 0.985;

export function normaliseInternalRouterJunctionFormCircumference( value )
{
    if ( value === null || value === undefined || value === '' )
    {
        return internalRouterJunctionFormCircumferenceRange.defaultValue;
    }
    const requested = Number( value );
    if ( !Number.isFinite( requested ) )
    {
        return internalRouterJunctionFormCircumferenceRange.defaultValue;
    }
    return THREE.MathUtils.clamp(
        requested,
        internalRouterJunctionFormCircumferenceRange.minimum,
        internalRouterJunctionFormCircumferenceRange.maximum
    );
}

class AxialJunctionKnotCurve extends THREE.Curve
{
    constructor(
        seed,
        axis,
        major,
        minor,
        longitudinalHalfSpan,
        loopRadius
    )
    {
        super();
        this.seed = seed.clone();
        this.axis = axis.clone();
        this.major = major.clone();
        this.minor = minor.clone();
        this.longitudinalHalfSpan = longitudinalHalfSpan;
        this.loopRadius = loopRadius;
        this.arcLengthDivisions = 256;
    }

    getPoint( input, target = new THREE.Vector3() )
    {
        const phase = THREE.MathUtils.clamp( input, 0, 1 );
        const q = phase * 2 - 1;
        const radial = this.loopRadius * Math.sin( phase * Math.PI * 2 );
        const angle = phase * Math.PI * 3
            + Math.sin( phase * Math.PI * 6 ) * 0.35;
        return target.copy( this.seed )
            .addScaledVector(
                this.axis,
                this.longitudinalHalfSpan * q
            )
            .addScaledVector( this.major, radial * Math.cos( angle ) )
            .addScaledVector( this.minor, radial * Math.sin( angle ) );
    }

    // TubeGeometry normally arc-length remaps its samples. The knot's authored
    // midpoint is the causal boundary, so retain the direct parameterisation:
    // phase 0.5 must be the exact D1/D2 seed rather than merely nearby.
    getPointAt( phase, target = new THREE.Vector3() )
    {
        return this.getPoint( phase, target );
    }

    getTangentAt( phase, target = new THREE.Vector3() )
    {
        const delta = 1e-4;
        const before = this.getPoint( Math.max( 0, phase - delta ) );
        const after = this.getPoint( Math.min( 1, phase + delta ) );
        return target.copy( after ).sub( before ).normalize();
    }
}

function createStableFrame( descriptor )
{
    const root = descriptor?.nodes?.find( ( node ) => node.parentId === null );
    const firstTier = descriptor?.nodes?.filter( ( node ) => node.tier === 1 )
        ?? [];
    if ( !root || firstTier.length < 3 )
    {
        throw new Error(
            'The D4 junction knot requires the D1 seed and first three branches.'
        );
    }
    const seed = new THREE.Vector3().fromArray( descriptor.seedPoint );
    const firstTierCentre = firstTier.reduce(
        ( sum, node ) => sum.add( node.point ),
        new THREE.Vector3()
    ).multiplyScalar( 1 / firstTier.length );
    const axis = firstTierCentre.sub( seed ).normalize();
    if ( axis.lengthSq() < 1e-10 )
    {
        throw new Error( 'The D4 junction knot has no stable longitudinal axis.' );
    }
    const firstOffset = firstTier[0].point.clone().sub( seed );
    const major = firstOffset.clone()
        .addScaledVector( axis, -firstOffset.dot( axis ) );
    if ( major.lengthSq() < 1e-10 )
    {
        const reference = Math.abs( axis.y ) < 0.9
            ? new THREE.Vector3( 0, 1, 0 )
            : new THREE.Vector3( 1, 0, 0 );
        major.crossVectors( axis, reference );
    }
    major.normalize();
    const minor = new THREE.Vector3().crossVectors( axis, major ).normalize();
    return { root, seed, axis, major, minor };
}

function smoothstep( value, minimum, maximum )
{
    return THREE.MathUtils.smoothstep( value, minimum, maximum );
}

function manifestationSignal( phase, headPhase )
{
    const style = internalRouterJunctionFormStyle;
    const delta = headPhase - phase;
    const head = Math.exp( -Math.pow(
        ( phase - headPhase ) / style.headWidth,
        2
    ) );
    const wake = delta >= 0
        ? ( 1 - smoothstep( delta, 0, style.wakeLength ) )
            * Math.exp( -delta * style.wakeDecay )
        : 0;
    return THREE.MathUtils.clamp(
        head + wake * style.wakeAmplitude,
        0,
        1
    );
}

function vectorFrom( value, label )
{
    if ( value?.isVector3 ) return value.clone();
    if ( Array.isArray( value ) || ArrayBuffer.isView( value ) )
    {
        return new THREE.Vector3().fromArray( value );
    }
    throw new Error( `The D4 junction knot requires a valid ${label}.` );
}

function normaliseTrunkEnvelope( envelope )
{
    if ( envelope === null || envelope === undefined ) return null;
    if ( !Array.isArray( envelope.stations ) || envelope.stations.length < 2 )
    {
        throw new Error(
            'The D4 junction knot requires at least two trunk-envelope stations.'
        );
    }
    const stations = envelope.stations.map( ( station, index ) => {
        const longitudinalStation = Number(
            station.longitudinalStation ?? station.stationIndex ?? index
        );
        const conservativeShellRadius = Number(
            station.conservativeShellRadius
        );
        if ( !Number.isFinite( longitudinalStation )
            || !Number.isFinite( conservativeShellRadius )
            || conservativeShellRadius <= 0 )
        {
            throw new Error(
                `The D4 junction knot received an invalid trunk-envelope station ${index}.`
            );
        }
        return {
            longitudinalStation,
            conservativeShellRadius,
            centre: vectorFrom( station.centre, `station ${index} centre` )
        };
    } ).sort( ( left, right ) =>
        left.longitudinalStation - right.longitudinalStation
    );
    for ( let index = 1; index < stations.length; index += 1 )
    {
        if ( stations[index].longitudinalStation
            <= stations[index - 1].longitudinalStation )
        {
            throw new Error(
                'The D4 junction knot requires ordered trunk-envelope stations.'
            );
        }
    }
    return stations;
}

function closestEnvelopeFrame( point, stations )
{
    let closest = null;
    let closestDistanceSquared = Number.POSITIVE_INFINITY;
    const span = new THREE.Vector3();
    const fromLeft = new THREE.Vector3();
    const centre = new THREE.Vector3();
    for ( let index = 0; index < stations.length - 1; index += 1 )
    {
        const left = stations[index];
        const right = stations[index + 1];
        span.subVectors( right.centre, left.centre );
        const spanLengthSquared = span.lengthSq();
        const amount = spanLengthSquared > Number.EPSILON
            ? THREE.MathUtils.clamp(
                fromLeft.subVectors( point, left.centre ).dot( span )
                    / spanLengthSquared,
                0,
                1
            )
            : 0;
        centre.copy( left.centre ).addScaledVector( span, amount );
        const distanceSquared = centre.distanceToSquared( point );
        if ( distanceSquared >= closestDistanceSquared ) continue;
        closestDistanceSquared = distanceSquared;
        closest = {
            centre: centre.clone(),
            distance: Math.sqrt( distanceSquared ),
            conservativeShellRadius: THREE.MathUtils.lerp(
                left.conservativeShellRadius,
                right.conservativeShellRadius,
                amount
            ),
            longitudinalStation: THREE.MathUtils.lerp(
                left.longitudinalStation,
                right.longitudinalStation,
                amount
            )
        };
    }
    return closest;
}

function resolveLoopDimensions(
    seed,
    axis,
    growthRadius,
    tubeRadius,
    wallMargin,
    circumferenceScale,
    envelopeStations
)
{
    const longitudinalHalfSpan = growthRadius
        * internalRouterJunctionFormStyle.longitudinalHalfSpanFraction;
    let maximumSafeLoopRadius;
    let minimumBaselineWallClearance = Number.POSITIVE_INFINITY;
    let minimumEnvelopeStation = Number.POSITIVE_INFINITY;
    let maximumEnvelopeStation = Number.NEGATIVE_INFINITY;
    const baseline = new THREE.Vector3();
    if ( envelopeStations )
    {
        maximumSafeLoopRadius = Number.POSITIVE_INFINITY;
        for ( let sample = 0;
            sample <= internalRouterJunctionFormStyle.tubularSegments;
            sample += 1 )
        {
            const phase = sample
                / internalRouterJunctionFormStyle.tubularSegments;
            baseline.copy( seed ).addScaledVector(
                axis,
                longitudinalHalfSpan * ( phase * 2 - 1 )
            );
            const frame = closestEnvelopeFrame( baseline, envelopeStations );
            const available = frame.conservativeShellRadius
                - frame.distance - tubeRadius - wallMargin
                - containmentSurfaceReserve;
            minimumBaselineWallClearance = Math.min(
                minimumBaselineWallClearance,
                available
            );
            minimumEnvelopeStation = Math.min(
                minimumEnvelopeStation,
                frame.longitudinalStation
            );
            maximumEnvelopeStation = Math.max(
                maximumEnvelopeStation,
                frame.longitudinalStation
            );
            if ( available < -containmentTolerance )
            {
                throw new Error(
                    'The D4 junction knot longitudinal span breached the trunk envelope.'
                );
            }
            const radialCoefficient = Math.abs(
                Math.sin( phase * Math.PI * 2 )
            );
            if ( radialCoefficient <= 1e-5 ) continue;
            maximumSafeLoopRadius = Math.min(
                maximumSafeLoopRadius,
                available / radialCoefficient
            );
        }
        maximumSafeLoopRadius *= containmentSafetyFactor;
    }
    else
    {
        maximumSafeLoopRadius = (
            growthRadius - tubeRadius - wallMargin
                - containmentSurfaceReserve
        ) * containmentSafetyFactor;
        minimumBaselineWallClearance = maximumSafeLoopRadius;
    }
    if ( !Number.isFinite( maximumSafeLoopRadius )
        || maximumSafeLoopRadius <= 0 )
    {
        throw new Error(
            'The D4 junction knot has no viable radial space inside the trunk.'
        );
    }
    return {
        longitudinalHalfSpan,
        maximumSafeLoopRadius,
        loopRadius: maximumSafeLoopRadius * circumferenceScale,
        minimumBaselineWallClearance,
        minimumEnvelopeStation: Number.isFinite( minimumEnvelopeStation )
            ? minimumEnvelopeStation
            : null,
        maximumEnvelopeStation: Number.isFinite( maximumEnvelopeStation )
            ? maximumEnvelopeStation
            : null
    };
}

export function createInternalRouterJunctionFormGeometry(
    descriptor,
    packetRadius,
    circumferenceScale = internalRouterJunctionFormCircumferenceRange
        .defaultValue,
    trunkEnvelope = null
)
{
    if ( !Number.isFinite( packetRadius ) || packetRadius <= 0 )
    {
        throw new Error( 'The D4 junction knot requires a positive packet radius.' );
    }
    const { root, seed, axis, major, minor } = createStableFrame( descriptor );
    const growthRadius = Number( root.growthEnvelopeRadius );
    if ( !Number.isFinite( growthRadius ) || growthRadius <= 0 )
    {
        throw new Error( 'The D4 junction knot requires a positive D1 growth radius.' );
    }
    const tubeRadius = packetRadius
        * internalRouterJunctionFormStyle.packetRadiusFraction;
    const appliedCircumferenceScale =
        normaliseInternalRouterJunctionFormCircumference(
            circumferenceScale
        );
    const envelopeStations = normaliseTrunkEnvelope( trunkEnvelope );
    const dimensions = resolveLoopDimensions(
        seed,
        axis,
        growthRadius,
        tubeRadius,
        descriptor.dimensions.wallMargin,
        appliedCircumferenceScale,
        envelopeStations
    );
    const curve = new AxialJunctionKnotCurve(
        seed,
        axis,
        major,
        minor,
        dimensions.longitudinalHalfSpan,
        dimensions.loopRadius
    );
    const geometry = new THREE.TubeGeometry(
        curve,
        internalRouterJunctionFormStyle.tubularSegments,
        tubeRadius,
        internalRouterJunctionFormStyle.radialSegments,
        false
    );
    const vertexCount = geometry.getAttribute( 'position' ).count;
    const ringStride = internalRouterJunctionFormStyle.radialSegments + 1;
    const phases = new Float32Array( vertexCount );
    const signals = new Float32Array( vertexCount );
    const warmth = new Float32Array( vertexCount );
    for ( let vertex = 0; vertex < vertexCount; vertex += 1 )
    {
        const ring = Math.min(
            internalRouterJunctionFormStyle.tubularSegments,
            Math.floor( vertex / ringStride )
        );
        const phase = ring / internalRouterJunctionFormStyle.tubularSegments;
        phases[vertex] = phase;
        warmth[vertex] = smoothstep(
            phase,
            internalRouterJunctionFormStyle.warmthStart,
            internalRouterJunctionFormStyle.warmthEnd
        );
    }
    geometry.setAttribute(
        'junctionPhase',
        new THREE.Float32BufferAttribute( phases, 1 )
    );
    geometry.setAttribute(
        'packetSignal',
        new THREE.Float32BufferAttribute( signals, 1 )
    );
    geometry.setAttribute(
        'packetWarmth',
        new THREE.Float32BufferAttribute( warmth, 1 )
    );
    geometry.getAttribute( 'packetSignal' ).setUsage( THREE.DynamicDrawUsage );
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    const position = geometry.getAttribute( 'position' );
    let maximumRadialExtent = 0;
    let minimumPhaseDistanceToSeed = Number.POSITIVE_INFINITY;
    let minimumTrunkWallClearance = Number.POSITIVE_INFINITY;
    let physicalTrunkBreachCount = 0;
    const relative = new THREE.Vector3();
    const vertexPosition = new THREE.Vector3();
    for ( let vertex = 0; vertex < vertexCount; vertex += 1 )
    {
        vertexPosition.fromBufferAttribute( position, vertex );
        relative.copy( vertexPosition ).sub( seed );
        const axial = relative.dot( axis );
        const radial = relative.clone().addScaledVector( axis, -axial ).length();
        maximumRadialExtent = Math.max( maximumRadialExtent, radial );
        if ( Math.abs( phases[vertex] - 0.5 ) <= 1e-7 )
        {
            minimumPhaseDistanceToSeed = Math.min(
                minimumPhaseDistanceToSeed,
                Math.abs( axial )
            );
        }
        if ( envelopeStations )
        {
            const frame = closestEnvelopeFrame(
                vertexPosition,
                envelopeStations
            );
            const clearance = frame.conservativeShellRadius
                - frame.distance - descriptor.dimensions.wallMargin
                - containmentSurfaceReserve;
            minimumTrunkWallClearance = Math.min(
                minimumTrunkWallClearance,
                clearance
            );
            if ( clearance < -containmentTolerance )
            {
                physicalTrunkBreachCount += 1;
            }
        }
    }
    const minimumGrowthWallClearance = growthRadius
        - maximumRadialExtent
        - descriptor.dimensions.wallMargin;
    if ( physicalTrunkBreachCount > 0 )
    {
        geometry.dispose();
        throw new Error( 'The D4 junction knot breached the physical trunk envelope.' );
    }
    const waist = curve.getPointAt( 0.5 );
    const waistToSeedDistance = waist.distanceTo( seed );
    geometry.userData.internalRouterJunctionForm = {
        candidateId: internalRouterJunctionFormCandidateId,
        reviewStatus: 'bounded-junction-form-experiment-awaiting-human-review',
        anchor: Object.freeze( seed.toArray() ),
        waistPoint: Object.freeze( waist.toArray() ),
        waistToSeedDistance,
        seedSite: descriptor.seedSite,
        objectSpace: true,
        cameraFacing: false,
        greaterDepth: false,
        surfaceExcursion: false,
        form: 'single-axial-asymmetric-double-loop-filament',
        strandCount: 1,
        tubeRadius,
        growthRadius,
        requestedCircumferenceScale: circumferenceScale,
        appliedCircumferenceScale,
        circumferenceRange: internalRouterJunctionFormCircumferenceRange,
        scaleSemantic: 'fraction-of-local-safe-trunk-circumference',
        loopRadius: dimensions.loopRadius,
        maximumSafeLoopRadius: dimensions.maximumSafeLoopRadius,
        maximumSafeOuterRadius: dimensions.maximumSafeLoopRadius + tubeRadius,
        actualOuterRadius: maximumRadialExtent,
        actualOuterDiameter: maximumRadialExtent * 2,
        approximateLoopCircumference: dimensions.loopRadius * Math.PI * 2,
        longitudinalHalfSpan: dimensions.longitudinalHalfSpan,
        maximumRadialExtent,
        minimumGrowthWallClearance,
        crossesD1GrowthEnvelope: minimumGrowthWallClearance
            < -containmentTolerance,
        minimumTrunkWallClearance: envelopeStations
            ? minimumTrunkWallClearance
            : null,
        physicalTrunkBreachCount,
        minimumBaselineWallClearance:
            dimensions.minimumBaselineWallClearance,
        containmentSurfaceReserve,
        containmentSafetyFactor,
        containmentAuditModel: envelopeStations
            ? 'longitudinally-sampled-conservative-trunk-envelope'
            : 'seed-growth-radius-fallback',
        longitudinalEnvelopeSampled: Boolean( envelopeStations ),
        envelopeStationCount: envelopeStations?.length ?? 0,
        auditedEnvelopeStationRange: Object.freeze( [
            dimensions.minimumEnvelopeStation,
            dimensions.maximumEnvelopeStation
        ] ),
        minimumPhaseDistanceToSeed,
        tubularSegments: internalRouterJunctionFormStyle.tubularSegments,
        radialSegments: internalRouterJunctionFormStyle.radialSegments,
        vertexCount,
        triangleCount: geometry.index.count / 3,
        persistentDisclosure: false,
        aggregation: false,
        overlapPolicy: internalRouterJunctionFormStyle.overlapPolicy
    };
    return geometry;
}

export function setInternalRouterJunctionFormManifestations(
    geometry,
    manifestations
)
{
    const metadata = geometry?.userData?.internalRouterJunctionForm;
    const phase = geometry?.getAttribute?.( 'junctionPhase' );
    const signal = geometry?.getAttribute?.( 'packetSignal' );
    if ( !metadata || !phase || !signal )
    {
        throw new Error( 'The D4 junction knot geometry is incomplete.' );
    }
    const active = manifestations.filter( ( manifestation ) =>
        Number.isFinite( manifestation.headPhase )
    );
    let maximumSignal = 0;
    let changed = false;
    for ( let vertex = 0; vertex < signal.count; vertex += 1 )
    {
        const vertexPhase = phase.getX( vertex );
        let nextSignal = 0;
        for ( const manifestation of active )
        {
            if ( manifestation.kind === 'cyan-approach'
                && vertexPhase > 0.500001 )
            {
                continue;
            }
            let causalSignal = manifestationSignal(
                vertexPhase,
                manifestation.headPhase
            );
            if ( manifestation.kind === 'cyan-approach' )
            {
                const approachStrength = THREE.MathUtils.clamp(
                    manifestation.headPhase / 0.5,
                    0,
                    1
                );
                const upperResponse = 0.12 + 0.22 * Math.exp( -Math.pow(
                    ( vertexPhase - 0.32 ) / 0.22,
                    2
                ) );
                causalSignal = Math.max(
                    causalSignal,
                    approachStrength * upperResponse
                );
            }
            else
            {
                // The knot is the trunk's response to the immutable D2 event,
                // not a decorative route travelled by the output. Briefly
                // reveal the complete woven volume while the genuine D3 head
                // departs, then let that response decay behind the moving head.
                const eventProgress = THREE.MathUtils.clamp(
                    ( manifestation.headPhase - 0.5 ) / 0.8,
                    0,
                    1
                );
                const eventEnvelope = Math.exp( -eventProgress * 0.82 )
                    * ( 1 - smoothstep(
                        manifestation.headPhase,
                        0.96,
                        1 + internalRouterJunctionFormStyle.wakeLength
                    ) );
                const wovenResponse = 0.24 + 0.5 * Math.exp( -Math.pow(
                    ( vertexPhase - 0.5 ) / 0.24,
                    2
                ) );
                causalSignal = Math.max(
                    causalSignal,
                    eventEnvelope * wovenResponse
                );
            }
            nextSignal = Math.max( nextSignal, causalSignal );
        }
        nextSignal = THREE.MathUtils.clamp( nextSignal, 0, 1 );
        maximumSignal = Math.max( maximumSignal, nextSignal );
        if ( Math.abs( signal.getX( vertex ) - nextSignal ) > 1e-6 )
        {
            signal.setX( vertex, nextSignal );
            changed = true;
        }
    }
    if ( changed ) signal.needsUpdate = true;
    return Object.freeze( {
        active: maximumSignal
            > internalRouterJunctionFormStyle.discardThreshold,
        maximumSignal,
        activeManifestationCount: active.length,
        activeManifestationIds: Object.freeze(
            active.map( ( manifestation ) => manifestation.id )
        )
    } );
}

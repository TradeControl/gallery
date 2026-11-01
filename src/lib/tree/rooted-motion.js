const defaultStructuralResponse = 0.22;
const defaultGustMix = 0;
const defaultGustIntervalBase = 0;

export const rootedMotionFieldId = 'engineered-tree-rooted-sway-v4';

export const rootedMotionProfile = Object.freeze( {
    driver: 'persistent-environmental',
    transientLoad: 0,
    growthCoupling: false,
    contactLockHeight: 2.05,
    lowerTrunkHandoffEnd: 6.25,
    crownStart: 5.8,
    crownEnd: 12.6,
    reachStart: 1.25,
    reachEnd: 10.5,
    coherentBase: 0.1,
    crownGain: 0.6,
    reachGain: 0.3,
    secondaryBase: 0.2,
    secondaryReachGain: 0.8,
    swayXRate: 0.58,
    swayZRate: 0.41,
    secondaryRate: 1.24,
    swayXAmplitude: 1.2,
    swayZAmplitude: 0.82,
    secondaryXAmplitude: 0.12,
    secondaryZAmplitude: 0.09,
    gustEventModulo: 257,
    gustIntervalBaseMinimum: 0,
    gustIntervalBaseMaximum: 13,
    gustIntervalSpanBase: 15,
    gustIntervalSpanGain: 1 / 13,
    gustEventJitterSalt: 7.31,
    gustWindowAttackMaximum: 0.25,
    gustWindowReleaseMaximum: 0.4,
    gustWindowMinimumLength: 0.45,
    gustWindowFullStrengthLength: 1.25,
    gustDirectionBase: -0.25,
    gustDirectionRange: Math.PI * 2,
    gustFrontOffsetBase: 15,
    gustFrontOffsetJitter: 2.5,
    gustFrontSpeedBase: 5.2,
    gustFrontSpeedJitter: 3.8,
    gustFrontCurvatureRange: 0.9,
    gustFrontMeanderBase: 0.15,
    gustFrontMeanderJitter: 0.5,
    gustFrontFrequencyBase: 0.12,
    gustFrontFrequencyJitter: 0.18,
    gustInertiaDelay: 0.3,
    gustAttackBase: 0.25,
    gustAttackJitter: 0.5,
    gustDurationBase: 1.6,
    gustDurationJitter: 2.4,
    gustStrengthBase: 0.58,
    gustStrengthJitter: 0.42,
    gustLaneOffsetRange: 12,
    gustLaneWidthBase: 3.8,
    gustLaneWidthJitter: 4.4,
    gustLaneFloor: 0.12,
    gustLaneGain: 0.88,
    gustSpatialBase: 0.78,
    gustSpatialGain: 0.22,
    gustMainAmplitude: 1.95,
    gustEddyAmplitude: 0.28,
    gustWhisperXAmplitude: 0.035,
    gustWhisperZAmplitude: 0.028,
    maximumResponse: 0.65,
    maximumDisplacement: 1.49
} );

function clamp( value, minimum, maximum )
{
    return Math.min( maximum, Math.max( minimum, value ) );
}

function smoothstep( minimum, maximum, value )
{
    const unit = clamp( ( value - minimum ) / ( maximum - minimum ), 0, 1 );
    return unit * unit * ( 3 - 2 * unit );
}

function positiveModulo( value, divisor )
{
    return ( value % divisor + divisor ) % divisor;
}

export function rootedMotionHash( value )
{
    const numericValue = Number( value );
    if ( !Number.isFinite( numericValue ) )
    {
        throw new TypeError( 'Rooted motion hash input must be finite.' );
    }

    const modulus = 4093;
    const token = positiveModulo(
        Math.floor( numericValue * 100 + 0.5 ),
        modulus
    );
    let state = positiveModulo( token * 251 + 1381, modulus );
    state = positiveModulo( state * state + 113, modulus );
    state = positiveModulo( state * state + 197, modulus );
    return Math.fround( state / modulus );
}

function rootedMotionEventStart(
    eventIndex,
    intervalMean,
    jitterAmplitude
)
{
    const serial = Math.max( 0, Math.floor( eventIndex ) );
    if ( serial === 0 ) return 0;

    const boundedEventIndex = positiveModulo(
        serial,
        rootedMotionProfile.gustEventModulo
    );
    return serial * intervalMean + (
        2 * rootedMotionHash(
            boundedEventIndex + rootedMotionProfile.gustEventJitterSalt
        ) - 1
    ) * jitterAmplitude;
}

function finiteComponent( position, property, index )
{
    const value = Number( Array.isArray( position )
        ? position[index]
        : position?.[property] );
    if ( !Number.isFinite( value ) )
    {
        throw new TypeError( `Rooted motion position ${property} must be finite.` );
    }
    return value;
}

export function createRootedMotionUniforms(
    response = defaultStructuralResponse,
    gustMix = defaultGustMix,
    gustIntervalBase = defaultGustIntervalBase
)
{
    const numericResponse = Number( response );
    const numericGustMix = Number( gustMix );
    const numericGustIntervalBase = Number( gustIntervalBase );
    if ( !Number.isFinite( numericResponse )
        || !Number.isFinite( numericGustMix )
        || !Number.isFinite( numericGustIntervalBase ) )
    {
        throw new TypeError(
            'Rooted motion response, gust mix and gust interval base must be finite.'
        );
    }
    return {
        time: { value: 0 },
        response: {
            value: clamp(
                numericResponse,
                0,
                rootedMotionProfile.maximumResponse
            )
        },
        gustMix: { value: clamp( numericGustMix, 0, 1 ) },
        intervalBase: {
            value: clamp(
                numericGustIntervalBase,
                rootedMotionProfile.gustIntervalBaseMinimum,
                rootedMotionProfile.gustIntervalBaseMaximum
            )
        }
    };
}

export function sampleRootedMotion(
    position,
    time,
    response = defaultStructuralResponse,
    weight = 1,
    gustMix = defaultGustMix,
    gustIntervalBase = defaultGustIntervalBase
)
{
    const x = finiteComponent( position, 'x', 0 );
    const y = finiteComponent( position, 'y', 1 );
    const z = finiteComponent( position, 'z', 2 );
    const numericTime = Number( time );
    const numericResponse = Number( response );
    const numericWeight = Number( weight );
    const numericGustMix = Number( gustMix );
    const numericGustIntervalBase = Number( gustIntervalBase );
    if ( !Number.isFinite( numericTime )
        || !Number.isFinite( numericResponse )
        || !Number.isFinite( numericWeight )
        || !Number.isFinite( numericGustMix )
        || !Number.isFinite( numericGustIntervalBase ) )
    {
        throw new TypeError(
            'Rooted motion time, response, attachment weight, gust mix and gust interval base must be finite.'
        );
    }

    const release = smoothstep(
        rootedMotionProfile.contactLockHeight,
        rootedMotionProfile.lowerTrunkHandoffEnd,
        y
    );
    const crown = smoothstep(
        rootedMotionProfile.crownStart,
        rootedMotionProfile.crownEnd,
        y
    );
    const reach = smoothstep(
        rootedMotionProfile.reachStart,
        rootedMotionProfile.reachEnd,
        Math.hypot( x, z )
    );
    const coherentFlex = release * clamp(
        rootedMotionProfile.coherentBase
            + rootedMotionProfile.crownGain * crown
            + rootedMotionProfile.reachGain * reach,
        0,
        1
    );
    const tipFlex = release * crown * (
        rootedMotionProfile.secondaryBase
            + rootedMotionProfile.secondaryReachGain * reach
    );
    const swayX = Math.sin(
        numericTime * rootedMotionProfile.swayXRate
            + y * 0.035 + z * 0.018
    );
    const swayZ = Math.sin(
        numericTime * rootedMotionProfile.swayZRate
            + y * 0.028 + x * 0.014 + 1.7
    );
    const secondary = Math.sin(
        numericTime * rootedMotionProfile.secondaryRate
            + y * 0.22 + x * 0.055 - z * 0.045
    );
    const boundedResponse = clamp(
        numericResponse,
        0,
        rootedMotionProfile.maximumResponse
    );
    const boundedWeight = clamp( numericWeight, 0, 1 );
    const boundedGustMix = clamp( numericGustMix, 0, 1 );
    const boundedGustIntervalBase = clamp(
        numericGustIntervalBase,
        rootedMotionProfile.gustIntervalBaseMinimum,
        rootedMotionProfile.gustIntervalBaseMaximum
    );
    const scale = boundedResponse * boundedWeight;
    const persistentX = (
        swayX * rootedMotionProfile.swayXAmplitude * coherentFlex
            + secondary * rootedMotionProfile.secondaryXAmplitude * tipFlex
    );
    const persistentZ = (
        swayZ * rootedMotionProfile.swayZAmplitude * coherentFlex
            + secondary * rootedMotionProfile.secondaryZAmplitude * tipFlex
    );

    if ( boundedGustMix === 0 )
    {
        const xOffset = persistentX * scale;
        const zOffset = persistentZ * scale;
        return Object.freeze( {
            x: xOffset === 0 ? 0 : xOffset,
            y: 0,
            z: zOffset === 0 ? 0 : zOffset,
            release,
            crown,
            reach,
            coherentFlex,
            tipFlex,
            gustMix: 0,
            gustEnvelope: 0,
            gustDirectionX: 0,
            gustDirectionZ: 0,
            gustLocalTime: 0
        } );
    }

    const branchFlex = release * clamp(
        0.025 + 0.35 * crown + 0.35 * reach
            + 0.275 * crown * reach,
        0,
        1
    );
    const gustTipFlex = release * crown * ( 0.15 + 0.85 * reach );
    const gustTime = Math.max( numericTime, 0 );
    const gustIntervalSpan = rootedMotionProfile.gustIntervalSpanBase
        + boundedGustIntervalBase
            * rootedMotionProfile.gustIntervalSpanGain;
    const gustIntervalMean = boundedGustIntervalBase
        + gustIntervalSpan * 0.5;
    const gustIntervalJitterAmplitude = gustIntervalSpan * 0.25;
    const estimatedEventIndex = Math.floor( gustTime / gustIntervalMean );
    let eventIndex = 0;
    let eventStart = 0;
    for ( let offset = -2; offset <= 2; offset += 1 )
    {
        const candidateIndex = Math.max( 0, estimatedEventIndex + offset );
        const candidateStart = rootedMotionEventStart(
            candidateIndex,
            gustIntervalMean,
            gustIntervalJitterAmplitude
        );
        if ( candidateStart <= gustTime && candidateIndex >= eventIndex )
        {
            eventIndex = candidateIndex;
            eventStart = candidateStart;
        }
    }
    const nextEventStart = rootedMotionEventStart(
        eventIndex + 1,
        gustIntervalMean,
        gustIntervalJitterAmplitude
    );
    const eventLength = nextEventStart - eventStart;
    const boundedEventIndex = (
        eventIndex % rootedMotionProfile.gustEventModulo
            + rootedMotionProfile.gustEventModulo
    ) % rootedMotionProfile.gustEventModulo;
    const eventPhase = gustTime - eventStart;
    const safeEventLength = Math.max( eventLength, 0.0001 );
    const eventWindowAttack = Math.min(
        rootedMotionProfile.gustWindowAttackMaximum,
        safeEventLength * 0.2
    );
    const eventWindowRelease = Math.min(
        rootedMotionProfile.gustWindowReleaseMaximum,
        safeEventLength * 0.25
    );
    const eventWindowEnvelope = smoothstep(
        0,
        eventWindowAttack,
        eventPhase
    ) * ( 1 - smoothstep(
        Math.max(
            eventWindowAttack,
            safeEventLength - eventWindowRelease
        ),
        safeEventLength,
        eventPhase
    ) );
    const eventWindowStrength = smoothstep(
        rootedMotionProfile.gustWindowMinimumLength,
        rootedMotionProfile.gustWindowFullStrengthLength,
        eventLength
    );
    const gustEventActive = eventWindowStrength > 0;
    const gustAngle = rootedMotionProfile.gustDirectionBase
        + ( rootedMotionHash( boundedEventIndex + 19.7 ) - 0.5 )
            * rootedMotionProfile.gustDirectionRange;
    const gustDirectionX = Math.cos( gustAngle );
    const gustDirectionZ = Math.sin( gustAngle );
    const gustPerpendicularX = -gustDirectionZ;
    const gustPerpendicularZ = gustDirectionX;
    const alongWind = x * gustDirectionX + z * gustDirectionZ;
    const acrossWind = x * gustPerpendicularX + z * gustPerpendicularZ;
    const gustFrontOffset = rootedMotionProfile.gustFrontOffsetBase
        + rootedMotionProfile.gustFrontOffsetJitter
            * rootedMotionHash( boundedEventIndex + 23.4 );
    const gustFrontSpeed = rootedMotionProfile.gustFrontSpeedBase
        + rootedMotionProfile.gustFrontSpeedJitter
            * rootedMotionHash( boundedEventIndex + 29.1 );
    const gustFrontCurvature = (
        rootedMotionHash( boundedEventIndex + 61.7 ) - 0.5
    ) * 2 * rootedMotionProfile.gustFrontCurvatureRange;
    const gustFrontMeander = rootedMotionProfile.gustFrontMeanderBase
        + rootedMotionProfile.gustFrontMeanderJitter
            * rootedMotionHash( boundedEventIndex + 67.9 );
    const gustFrontFrequency = rootedMotionProfile.gustFrontFrequencyBase
        + rootedMotionProfile.gustFrontFrequencyJitter
            * rootedMotionHash( boundedEventIndex + 73.6 );
    const gustFrontPhase = rootedMotionHash(
        boundedEventIndex + 79.4
    ) * Math.PI * 2;
    const normalisedAcrossWind = acrossWind / 14;
    const gustFrontWarp = gustFrontCurvature
            * normalisedAcrossWind * normalisedAcrossWind
        + gustFrontMeander * Math.sin(
            acrossWind * gustFrontFrequency + gustFrontPhase
        );
    const gustArrival = Math.max( 0, (
        alongWind + gustFrontOffset
    ) / gustFrontSpeed + gustFrontWarp )
        + ( 1 - branchFlex ) * rootedMotionProfile.gustInertiaDelay;
    const gustLocalTime = eventPhase - gustArrival;
    const gustAttack = rootedMotionProfile.gustAttackBase
        + rootedMotionProfile.gustAttackJitter
            * rootedMotionHash( boundedEventIndex + 33.8 );
    const gustDuration = rootedMotionProfile.gustDurationBase
        + rootedMotionProfile.gustDurationJitter
            * rootedMotionHash( boundedEventIndex + 37.2 );
    const gustEnvelope = eventWindowStrength * eventWindowEnvelope
        * smoothstep( 0, gustAttack, gustLocalTime )
        * ( 1 - smoothstep(
            Math.max( gustAttack + 0.15, gustDuration * 0.48 ),
            gustDuration,
            gustLocalTime
        ) );
    const gustStrength = rootedMotionProfile.gustStrengthBase
        + rootedMotionProfile.gustStrengthJitter
            * rootedMotionHash( boundedEventIndex + 53.1 );
    const gustLaneCentre = (
        rootedMotionHash( boundedEventIndex + 43.8 ) - 0.5
    ) * rootedMotionProfile.gustLaneOffsetRange;
    const gustLaneWidth = rootedMotionProfile.gustLaneWidthBase
        + rootedMotionProfile.gustLaneWidthJitter
            * rootedMotionHash( boundedEventIndex + 47.6 );
    const gustLaneDistance = (
        acrossWind - gustLaneCentre
    ) / gustLaneWidth;
    const gustLane = rootedMotionProfile.gustLaneFloor
        + rootedMotionProfile.gustLaneGain
            * Math.exp( -0.5 * gustLaneDistance * gustLaneDistance );
    const gustVariation = rootedMotionProfile.gustSpatialBase
        + rootedMotionProfile.gustSpatialGain * Math.sin(
            x * 0.23 + z * 0.29 + y * 0.16
                + rootedMotionHash( boundedEventIndex + 71.9 )
                    * Math.PI * 2
        );
    const gustPressure = gustEnvelope * gustStrength
        * gustLane * gustVariation;
    const gustEddy = Math.sin(
        gustLocalTime * 1.8 + x * 0.31 - z * 0.27 + y * 0.19
            + rootedMotionHash( boundedEventIndex + 91.3 )
                * Math.PI * 2
    );
    const whisperX = Math.sin(
        numericTime * 0.53 + y * 0.31 + z * 0.22
    ) * rootedMotionProfile.gustWhisperXAmplitude * gustTipFlex;
    const whisperZ = Math.sin(
        numericTime * 0.43 + y * 0.27 - x * 0.18 + 1.4
    ) * rootedMotionProfile.gustWhisperZAmplitude * gustTipFlex;
    const gustX = gustDirectionX * rootedMotionProfile.gustMainAmplitude
            * gustPressure * branchFlex
        + gustPerpendicularX * rootedMotionProfile.gustEddyAmplitude
            * gustPressure * gustTipFlex * gustEddy
        + whisperX;
    const gustZ = gustDirectionZ * rootedMotionProfile.gustMainAmplitude
            * gustPressure * branchFlex
        + gustPerpendicularZ * rootedMotionProfile.gustEddyAmplitude
            * gustPressure * gustTipFlex * gustEddy
        + whisperZ;
    const xOffset = (
        persistentX + ( gustX - persistentX ) * boundedGustMix
    ) * scale;
    const zOffset = (
        persistentZ + ( gustZ - persistentZ ) * boundedGustMix
    ) * scale;

    return Object.freeze( {
        x: xOffset === 0 ? 0 : xOffset,
        y: 0,
        z: zOffset === 0 ? 0 : zOffset,
        release,
        crown,
        reach,
        coherentFlex,
        tipFlex,
        gustMix: boundedGustMix,
        gustEnvelope,
        gustDirectionX,
        gustDirectionZ,
        gustLocalTime,
        gustEventIndex: eventIndex,
        gustEventActive,
        gustIntervalBase: boundedGustIntervalBase,
        gustIntervalSpan,
        gustIntervalMean,
        gustIntervalJitterAmplitude,
        gustEventStartedAt: eventStart,
        gustEventLength: eventLength,
        gustWindowStrength: eventWindowStrength,
        gustFrontSpeed,
        gustDuration,
        gustFrontWarp
    } );
}

export const rootedMotionShaderDeclarations = `
    #ifndef TREE_MOTION_WEIGHT
        #define TREE_MOTION_WEIGHT 1.0
    #endif

    uniform float treeTime;
    uniform float treeResponse;
    uniform float treeGustMix;
    uniform float treeGustIntervalBase;

    float rootedMotionHash( float value )
    {
        float token = mod( floor( value * 100.0 + 0.5 ), 4093.0 );
        float state = mod( token * 251.0 + 1381.0, 4093.0 );
        state = mod( state * state + 113.0, 4093.0 );
        state = mod( state * state + 197.0, 4093.0 );
        return state / 4093.0;
    }

    float rootedMotionEventStart(
        float eventIndex,
        float intervalMean,
        float jitterAmplitude
    )
    {
        if ( eventIndex < 0.5 ) return 0.0;
        float boundedEventIndex = mod( eventIndex, 257.0 );
        return eventIndex * intervalMean + (
            2.0 * rootedMotionHash( boundedEventIndex + 7.31 ) - 1.0
        ) * jitterAmplitude;
    }

    vec2 sampleRootedTreeMotion(
        vec3 rootedPosition,
        float rootedTime,
        float rootedResponse
    )
    {
        float release = smoothstep( 2.05, 6.25, rootedPosition.y );
        float crown = smoothstep( 5.8, 12.6, rootedPosition.y );
        float reach = smoothstep(
            1.25,
            10.5,
            length( rootedPosition.xz )
        );
        float coherentFlex = release * clamp(
            0.10 + 0.60 * crown + 0.30 * reach,
            0.0,
            1.0
        );
        float tipFlex = release * crown * ( 0.20 + 0.80 * reach );
        float swayX = sin(
            rootedTime * 0.58
                + rootedPosition.y * 0.035
                + rootedPosition.z * 0.018
        );
        float swayZ = sin(
            rootedTime * 0.41
                + rootedPosition.y * 0.028
                + rootedPosition.x * 0.014
                + 1.7
        );
        float secondary = sin(
            rootedTime * 1.24
                + rootedPosition.y * 0.22
                + rootedPosition.x * 0.055
                - rootedPosition.z * 0.045
        );
        float response = clamp( rootedResponse, 0.0, 0.65 );
        vec2 persistentOffset = vec2(
            swayX * 1.20 * coherentFlex
                + secondary * 0.12 * tipFlex,
            swayZ * 0.82 * coherentFlex
                + secondary * 0.09 * tipFlex
        );
        float gustMix = clamp( treeGustMix, 0.0, 1.0 );
        if ( gustMix <= 0.0001 ) return persistentOffset * response;

        float branchFlex = release * clamp(
            0.025 + 0.35 * crown + 0.35 * reach
                + 0.275 * crown * reach,
            0.0,
            1.0
        );
        float gustTipFlex = release * crown * ( 0.15 + 0.85 * reach );
        float gustIntervalBase = clamp( treeGustIntervalBase, 0.0, 13.0 );
        float gustTime = max( rootedTime, 0.0 );
        float gustIntervalSpan = 15.0 + gustIntervalBase / 13.0;
        float gustIntervalMean = gustIntervalBase
            + gustIntervalSpan * 0.50;
        float gustIntervalJitterAmplitude = gustIntervalSpan * 0.25;
        float estimatedEventIndex = floor( gustTime / gustIntervalMean );
        float eventIndex = 0.0;
        float eventStart = 0.0;
        for ( int candidateOffset = -2;
            candidateOffset <= 2;
            candidateOffset += 1 )
        {
            float candidateIndex = max(
                0.0,
                estimatedEventIndex + float( candidateOffset )
            );
            float candidateStart = rootedMotionEventStart(
                candidateIndex,
                gustIntervalMean,
                gustIntervalJitterAmplitude
            );
            if ( candidateStart <= gustTime && candidateIndex >= eventIndex )
            {
                eventIndex = candidateIndex;
                eventStart = candidateStart;
            }
        }
        float nextEventStart = rootedMotionEventStart(
            eventIndex + 1.0,
            gustIntervalMean,
            gustIntervalJitterAmplitude
        );
        float eventLength = nextEventStart - eventStart;
        float boundedEventIndex = mod( eventIndex, 257.0 );
        float eventPhase = gustTime - eventStart;
        float safeEventLength = max( eventLength, 0.0001 );
        float eventWindowAttack = min( 0.25, safeEventLength * 0.20 );
        float eventWindowRelease = min( 0.40, safeEventLength * 0.25 );
        float eventWindowEnvelope = smoothstep(
            0.0,
            eventWindowAttack,
            eventPhase
        ) * ( 1.0 - smoothstep(
            max(
                eventWindowAttack,
                safeEventLength - eventWindowRelease
            ),
            safeEventLength,
            eventPhase
        ) );
        float eventWindowStrength = smoothstep(
            0.45,
            1.25,
            eventLength
        );
        float gustAngle = -0.25
            + ( rootedMotionHash( boundedEventIndex + 19.7 ) - 0.5 )
                * 6.283185;
        vec2 gustDirection = vec2( cos( gustAngle ), sin( gustAngle ) );
        vec2 gustPerpendicular = vec2( -gustDirection.y, gustDirection.x );
        float alongWind = dot( rootedPosition.xz, gustDirection );
        float acrossWind = dot( rootedPosition.xz, gustPerpendicular );
        float gustFrontOffset = 15.0
            + 2.5 * rootedMotionHash( boundedEventIndex + 23.4 );
        float gustFrontSpeed = 5.2
            + 3.8 * rootedMotionHash( boundedEventIndex + 29.1 );
        float gustFrontCurvature = (
            rootedMotionHash( boundedEventIndex + 61.7 ) - 0.5
        ) * 1.8;
        float gustFrontMeander = 0.15
            + 0.50 * rootedMotionHash( boundedEventIndex + 67.9 );
        float gustFrontFrequency = 0.12
            + 0.18 * rootedMotionHash( boundedEventIndex + 73.6 );
        float gustFrontPhase = rootedMotionHash(
            boundedEventIndex + 79.4
        ) * 6.283185;
        float normalisedAcrossWind = acrossWind / 14.0;
        float gustFrontWarp = gustFrontCurvature
                * normalisedAcrossWind * normalisedAcrossWind
            + gustFrontMeander * sin(
                acrossWind * gustFrontFrequency + gustFrontPhase
            );
        float gustArrival = max( 0.0,
            ( alongWind + gustFrontOffset ) / gustFrontSpeed + gustFrontWarp
        )
            + ( 1.0 - branchFlex ) * 0.30;
        float gustLocalTime = eventPhase - gustArrival;
        float gustAttack = 0.25
            + 0.50 * rootedMotionHash( boundedEventIndex + 33.8 );
        float gustDuration = 1.60
            + 2.40 * rootedMotionHash( boundedEventIndex + 37.2 );
        float gustEnvelope = eventWindowStrength * eventWindowEnvelope
            * smoothstep( 0.0, gustAttack, gustLocalTime )
            * ( 1.0 - smoothstep(
                max( gustAttack + 0.15, gustDuration * 0.48 ),
                gustDuration,
                gustLocalTime
            ) );
        float gustStrength = 0.58
            + 0.42 * rootedMotionHash( boundedEventIndex + 53.1 );
        float gustLaneCentre = (
            rootedMotionHash( boundedEventIndex + 43.8 ) - 0.5
        ) * 12.0;
        float gustLaneWidth = 3.8
            + 4.4 * rootedMotionHash( boundedEventIndex + 47.6 );
        float gustLaneDistance = (
            acrossWind - gustLaneCentre
        ) / gustLaneWidth;
        float gustLane = 0.12
            + 0.88 * exp( -0.5 * gustLaneDistance * gustLaneDistance );
        float gustVariation = 0.78 + 0.22 * sin(
            rootedPosition.x * 0.23 + rootedPosition.z * 0.29
                + rootedPosition.y * 0.16
                + rootedMotionHash( boundedEventIndex + 71.9 ) * 6.283185
        );
        float gustPressure = gustEnvelope * gustStrength
            * gustLane * gustVariation;
        float gustEddy = sin(
            gustLocalTime * 1.8 + rootedPosition.x * 0.31
                - rootedPosition.z * 0.27 + rootedPosition.y * 0.19
                + rootedMotionHash( boundedEventIndex + 91.3 ) * 6.283185
        );
        vec2 whisper = vec2(
            sin( rootedTime * 0.53 + rootedPosition.y * 0.31
                + rootedPosition.z * 0.22 ) * 0.035,
            sin( rootedTime * 0.43 + rootedPosition.y * 0.27
                - rootedPosition.x * 0.18 + 1.4 ) * 0.028
        ) * gustTipFlex;
        vec2 gustOffset = gustDirection * 1.95 * gustPressure * branchFlex
            + gustPerpendicular * 0.28 * gustPressure
                * gustTipFlex * gustEddy
            + whisper;
        return mix( persistentOffset, gustOffset, gustMix ) * response;
    }
`;

export function rootedMotionShaderApplication(
    positionExpression = 'position'
)
{
    if ( typeof positionExpression !== 'string'
        || positionExpression.trim().length === 0 )
    {
        throw new TypeError(
            'Rooted motion shader position expression must be non-empty.'
        );
    }
    return `
        vec2 rootedMotionOffset = sampleRootedTreeMotion(
            ${positionExpression},
            treeTime,
            treeResponse
        ) * clamp( TREE_MOTION_WEIGHT, 0.0, 1.0 );
        transformed.x += rootedMotionOffset.x;
        transformed.z += rootedMotionOffset.y;
    `;
}

export function registerRootedMotionMaterial(
    material,
    uniforms,
    role = 'tree-manifestation'
)
{
    if ( !material?.userData || !uniforms?.time || !uniforms?.response
        || !uniforms?.gustMix || !uniforms?.intervalBase )
    {
        throw new TypeError(
            'Rooted motion material registration requires material and uniforms.'
        );
    }
    material.userData.deformationFieldId = rootedMotionFieldId;
    material.userData.deformationUniforms = Object.freeze( {
        time: uniforms.time,
        response: uniforms.response,
        gustMix: uniforms.gustMix,
        intervalBase: uniforms.intervalBase
    } );
    material.userData.rootedMotion = Object.freeze( {
        role,
        profile: rootedMotionProfile,
        modes: Object.freeze( [ 'persistent-sway', 'canopy-gust-front' ] ),
        mixUniform: uniforms.gustMix,
        intervalBaseUniform: uniforms.intervalBase
    } );
    return material;
}

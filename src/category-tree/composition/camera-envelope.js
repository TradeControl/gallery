const epsilon = 1e-9;

export const compositionCameraEnvelope = Object.freeze( {
    minDistance: 8,
    maxDistance: 56,
    minPolarAngle: 0.05,
    maxPolarAngle: 1.43,
    maxTargetRadius: 22,
    minTargetHeight: 0.5,
    maxTargetHeight: 5.5,
    maxCameraRadius: 54,
    minCameraHeight: 0.9
} );

function validateVector( value, label )
{
    if ( !Array.isArray( value ) || value.length !== 3 )
    {
        throw new TypeError( `${label} must be a three-component vector.` );
    }
    const vector = value.map( Number );
    if ( vector.some( ( component ) => !Number.isFinite( component ) ) )
    {
        throw new TypeError( `${label} must contain only finite values.` );
    }
    return vector;
}

function clamp( value, minimum, maximum )
{
    return Math.min( maximum, Math.max( minimum, value ) );
}

function clampHorizontalRadius( vector, maximumRadius )
{
    const radius = Math.hypot( vector[0], vector[2] );
    if ( radius <= maximumRadius || radius <= epsilon ) return vector;
    const scale = maximumRadius / radius;
    vector[0] *= scale;
    vector[2] *= scale;
    return vector;
}

function cameraMetrics( position, target )
{
    const offset = [
        position[0] - target[0],
        position[1] - target[1],
        position[2] - target[2]
    ];
    const distance = Math.hypot( ...offset );
    const polarAngle = distance <= epsilon
        ? 0
        : Math.acos( clamp( offset[1] / distance, -1, 1 ) );
    return { offset, distance, polarAngle };
}

function isInsideEnvelope( position, target, envelope )
{
    const { distance, polarAngle } = cameraMetrics( position, target );
    return Math.hypot( target[0], target[2] )
            <= envelope.maxTargetRadius + epsilon
        && target[1] >= envelope.minTargetHeight - epsilon
        && target[1] <= envelope.maxTargetHeight + epsilon
        && Math.hypot( position[0], position[2] )
            <= envelope.maxCameraRadius + epsilon
        && position[1] >= envelope.minCameraHeight - epsilon
        && distance >= envelope.minDistance - epsilon
        && distance <= envelope.maxDistance + epsilon
        && polarAngle >= envelope.minPolarAngle - epsilon
        && polarAngle <= envelope.maxPolarAngle + epsilon;
}

export function constrainCompositionCameraState(
    cameraState,
    envelope = compositionCameraEnvelope
)
{
    if ( !cameraState || typeof cameraState !== 'object' )
    {
        throw new TypeError( 'Composition camera state must be an object.' );
    }
    const position = validateVector(
        cameraState.position,
        'Composition camera position'
    );
    const originalTarget = validateVector(
        cameraState.target,
        'Composition camera target'
    );

    if ( isInsideEnvelope( position, originalTarget, envelope ) )
    {
        return {
            baseView: cameraState.baseView,
            position,
            target: originalTarget
        };
    }

    // Pan correction moves the target first and carries the camera with it,
    // retaining the viewer's framing until a genuine orbit/zoom limit is met.
    const originalOffset = position.map(
        ( component, index ) => component - originalTarget[index]
    );
    const target = clampHorizontalRadius(
        [ ...originalTarget ],
        envelope.maxTargetRadius
    );
    target[1] = clamp(
        target[1],
        envelope.minTargetHeight,
        envelope.maxTargetHeight
    );
    const carriedPosition = target.map(
        ( component, index ) => component + originalOffset[index]
    );
    clampHorizontalRadius( carriedPosition, envelope.maxCameraRadius );
    carriedPosition[1] = Math.max(
        envelope.minCameraHeight,
        carriedPosition[1]
    );

    let { offset, distance, polarAngle } = cameraMetrics(
        carriedPosition,
        target
    );
    if ( distance <= epsilon )
    {
        offset = [ 0, envelope.minDistance, 0 ];
        distance = envelope.minDistance;
        polarAngle = 0;
    }

    const constrainedDistance = clamp(
        distance,
        envelope.minDistance,
        envelope.maxDistance
    );
    const minimumVerticalOffset = envelope.minCameraHeight - target[1];
    const heightLimitedMaximumPolar = Math.acos( clamp(
        minimumVerticalOffset / constrainedDistance,
        -1,
        1
    ) );
    const maximumPolar = Math.min(
        envelope.maxPolarAngle,
        heightLimitedMaximumPolar
    );
    const constrainedPolar = clamp(
        polarAngle,
        envelope.minPolarAngle,
        maximumPolar
    );

    const horizontalLength = Math.hypot( offset[0], offset[2] );
    let horizontalX = 0;
    let horizontalZ = 1;
    if ( horizontalLength > epsilon )
    {
        horizontalX = offset[0] / horizontalLength;
        horizontalZ = offset[2] / horizontalLength;
    }
    const requestedHorizontal = constrainedDistance
        * Math.sin( constrainedPolar );
    const targetRadiusSquared = target[0] * target[0]
        + target[2] * target[2];
    const directionalDot = target[0] * horizontalX
        + target[2] * horizontalZ;
    const maximumHorizontal = -directionalDot + Math.sqrt( Math.max(
        0,
        directionalDot * directionalDot
            + envelope.maxCameraRadius * envelope.maxCameraRadius
            - targetRadiusSquared
    ) );
    const constrainedHorizontal = Math.min(
        requestedHorizontal,
        maximumHorizontal
    );
    const constrainedVertical = Math.sqrt( Math.max(
        0,
        constrainedDistance * constrainedDistance
            - constrainedHorizontal * constrainedHorizontal
    ) );
    const constrainedPosition = [
        target[0] + horizontalX * constrainedHorizontal,
        target[1] + constrainedVertical,
        target[2] + horizontalZ * constrainedHorizontal
    ];

    return {
        baseView: cameraState.baseView,
        position: constrainedPosition,
        target
    };
}

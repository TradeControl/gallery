import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
    compositionCameraEnvelope,
    constrainCompositionCameraState
} from '../../src/category-tree/composition/camera-envelope.js';
import {
    compositionScenes
} from '../../src/category-tree/composition/scene-catalog.js';

const epsilon = 1e-9;
const compositionMain = readFileSync( new URL(
    '../../src/category-tree/composition/main.js',
    import.meta.url
), 'utf8' );

function distance( left, right )
{
    return Math.hypot(
        left[0] - right[0],
        left[1] - right[1],
        left[2] - right[2]
    );
}

function polarAngle( position, target )
{
    const cameraDistance = distance( position, target );
    return Math.acos(
        Math.max( -1, Math.min( 1,
            ( position[1] - target[1] ) / cameraDistance
        ) )
    );
}

test( 'the production camera envelope is finite, immutable and scene-safe', () => {
    assert.ok( Object.isFrozen( compositionCameraEnvelope ) );
    assert.ok( compositionCameraEnvelope.minDistance > 0 );
    assert.ok(
        compositionCameraEnvelope.maxDistance
            > compositionCameraEnvelope.minDistance
    );
    assert.ok(
        compositionCameraEnvelope.maxDistance < 90,
        'the former 90-unit zoom exposed the finite substrate boundary'
    );
    assert.ok( compositionCameraEnvelope.maxTargetRadius > 0 );
    assert.ok(
        compositionCameraEnvelope.maxCameraRadius
            > compositionCameraEnvelope.maxTargetRadius
    );
    assert.ok(
        compositionCameraEnvelope.maxTargetHeight
            > compositionCameraEnvelope.minTargetHeight
    );
    assert.ok( compositionCameraEnvelope.minCameraHeight >= 0 );
    assert.ok( compositionCameraEnvelope.minPolarAngle >= 0 );
    assert.ok(
        compositionCameraEnvelope.maxPolarAngle < Math.PI / 2,
        'a production orbit must stay above its target'
    );
    assert.ok(
        compositionCameraEnvelope.maxPolarAngle
            > compositionCameraEnvelope.minPolarAngle
    );

    const furthestScene = Math.max( ...compositionScenes.map(
        ( scene ) => distance( scene.camera.position, scene.camera.target )
    ) );
    assert.ok(
        compositionCameraEnvelope.maxDistance >= furthestScene,
        'the envelope must retain every curated scene'
    );
} );

test( 'all curated scene cameras pass through the envelope unchanged', () => {
    for ( const scene of compositionScenes )
    {
        const constrained = constrainCompositionCameraState( scene.camera );
        assert.deepEqual(
            constrained,
            scene.camera,
            `${scene.label} must remain an exact reproducible composition`
        );
    }
} );

test( 'the envelope repairs excessive pan, zoom and below-world movement', () => {
    const unsafe = {
        baseView: 'composition',
        position: [ 145, -30, 135 ],
        target: [ 100, -18, 95 ]
    };
    const snapshot = structuredClone( unsafe );
    const constrained = constrainCompositionCameraState( unsafe );

    assert.deepEqual( unsafe, snapshot, 'camera input must not be mutated' );
    assert.equal( constrained.baseView, unsafe.baseView );
    assert.ok(
        Math.hypot( constrained.target[0], constrained.target[2] )
            <= compositionCameraEnvelope.maxTargetRadius + epsilon
    );
    assert.ok(
        constrained.target[1]
            >= compositionCameraEnvelope.minTargetHeight - epsilon
    );
    assert.ok(
        constrained.target[1]
            <= compositionCameraEnvelope.maxTargetHeight + epsilon
    );
    assert.ok(
        constrained.position[1]
            >= compositionCameraEnvelope.minCameraHeight - epsilon
    );
    assert.ok(
        Math.hypot( constrained.position[0], constrained.position[2] )
            <= compositionCameraEnvelope.maxCameraRadius + epsilon
    );
    assert.ok(
        distance( constrained.position, constrained.target )
            <= compositionCameraEnvelope.maxDistance + epsilon
    );
    assert.ok(
        polarAngle( constrained.position, constrained.target )
            <= compositionCameraEnvelope.maxPolarAngle + epsilon
    );
} );

test( 'the envelope keeps close cameras outside the clipping/collision zone', () => {
    const constrained = constrainCompositionCameraState( {
        baseView: 'composition',
        position: [ 0, 2.50001, 0.00001 ],
        target: [ 0, 2.5, 0 ]
    } );

    assert.ok(
        distance( constrained.position, constrained.target )
            >= compositionCameraEnvelope.minDistance - epsilon
    );
    assert.ok(
        polarAngle( constrained.position, constrained.target )
            >= compositionCameraEnvelope.minPolarAngle - epsilon
    );
} );

test( 'camera constraint is idempotent', () => {
    const once = constrainCompositionCameraState( {
        baseView: 'elevated',
        position: [ -120, -15, 140 ],
        target: [ 75, -9, -90 ]
    } );
    const twice = constrainCompositionCameraState( once );

    assert.deepEqual( twice, once );
} );

test( 'an oblique pan cannot escape the absolute camera radius after polar repair', () => {
    const constrained = constrainCompositionCameraState( {
        baseView: 'composition',
        position: [ 314.2544099845819, -240.57267022536365,
            -149.99821246089493 ],
        target: [ 256.5009418656641, 309.357087597097,
            -119.19016395988024 ]
    } );

    assert.ok(
        Math.hypot( constrained.position[0], constrained.position[2] )
            <= compositionCameraEnvelope.maxCameraRadius + epsilon
    );
    assert.deepEqual(
        constrainCompositionCameraState( constrained ),
        constrained,
        'one interaction must settle completely inside the envelope'
    );
} );

test( 'camera constraint rejects malformed and non-finite states', () => {
    const valid = {
        baseView: 'composition',
        position: [ 22, 9, 28 ],
        target: [ 0, 2.5, 0 ]
    };

    assert.throws(
        () => constrainCompositionCameraState( {
            ...valid,
            position: [ 22, Number.NaN, 28 ]
        } ),
        /finite/i
    );
    assert.throws(
        () => constrainCompositionCameraState( {
            ...valid,
            target: [ 0, 2.5, Number.POSITIVE_INFINITY ]
        } ),
        /finite/i
    );
    assert.throws(
        () => constrainCompositionCameraState( {
            ...valid,
            position: [ 22, 9 ]
        } ),
        /three|3|vector/i
    );
    assert.throws(
        () => constrainCompositionCameraState( null ),
        /camera|state|object/i
    );
} );

test( 'the composition enables the envelope unless its explicit development flag is changed', () => {
    assert.match(
        compositionMain,
        /const disableCameraEnvelopeForDevelopment = false;/
    );
    assert.match(
        compositionMain,
        /const cameraEnvelopeEnabled = !disableCameraEnvelopeForDevelopment;/
    );
    assert.match(
        compositionMain,
        /orbitControls\.minDistance = compositionCameraEnvelope\.minDistance;/
    );
    assert.match(
        compositionMain,
        /orbitControls\.maxDistance = compositionCameraEnvelope\.maxDistance;/
    );
    assert.match(
        compositionMain,
        /orbitControls\.screenSpacePanning = false;/
    );
    assert.match(
        compositionMain,
        /function enforceCompositionCameraEnvelope\(\)[\s\S]*?constrainCompositionCameraState/
    );
    assert.match(
        compositionMain,
        /orbitControls\.addEventListener\( 'change',[\s\S]*?enforceCompositionCameraEnvelope\(\);[\s\S]*?publishCompositionCameraState\(\);/
    );
} );

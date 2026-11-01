import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
    createHierarchy,
    representativeHierarchy,
    unfoldingHierarchy
} from '../../src/lib/tree/hierarchy.js';
import { createUnfoldingLayout } from '../../src/lib/tree/layout.js';
import { createEngineeredTreeLayer } from '../../src/lib/tree/engineered-tree-layer.js';
import {
    createRootedMotionUniforms,
    registerRootedMotionMaterial,
    rootedMotionFieldId,
    rootedMotionProfile,
    rootedMotionHash,
    rootedMotionShaderApplication,
    rootedMotionShaderDeclarations,
    sampleRootedMotion
} from '../../src/lib/tree/rooted-motion.js';

const engineUrl = new URL(
    '../../src/lib/tree/engineered-tree-layer.js',
    import.meta.url
);

function magnitude( offset )
{
    return Math.hypot( offset.x, offset.z );
}

function approxEqual( actual, expected, tolerance = 1e-10 )
{
    assert.ok( Math.abs( actual - expected ) <= tolerance,
        `${actual} should be within ${tolerance} of ${expected}` );
}

function maximumSample(
    position,
    response = 0.65,
    gustMix = 0,
    duration = 48
)
{
    let maximum = 0;
    for ( let time = 0; time <= duration; time += 0.05 )
    {
        maximum = Math.max(
            maximum,
            magnitude( sampleRootedMotion(
                position,
                time,
                response,
                1,
                gustMix
            ) )
        );
    }
    return maximum;
}

function trajectoryDiameter( position, response, gustMix = 0 )
{
    const samples = [];
    for ( let time = 0; time <= 40; time += 0.25 )
    {
        samples.push( sampleRootedMotion(
            position,
            time,
            response,
            1,
            gustMix
        ) );
    }
    let maximum = 0;
    for ( let left = 0; left < samples.length; left += 1 )
    {
        for ( let right = left + 1; right < samples.length; right += 1 )
        {
            maximum = Math.max( maximum, Math.hypot(
                samples[left].x - samples[right].x,
                samples[left].z - samples[right].z
            ) );
        }
    }
    return maximum;
}

function maximumStepDelta( position, response, duration = 1, gustMix = 0 )
{
    let maximum = 0;
    for ( let time = 0; time <= 40; time += 0.05 )
    {
        const before = sampleRootedMotion(
            position,
            time,
            response,
            1,
            gustMix
        );
        const after = sampleRootedMotion(
            position,
            time + duration,
            response,
            1,
            gustMix
        );
        maximum = Math.max( maximum, Math.hypot(
            after.x - before.x,
            after.z - before.z
        ) );
    }
    return maximum;
}

function scheduledGustEvents( intervalBase, eventCount = 32 )
{
    const point = { x: 0, y: 13, z: 0 };
    const events = [];
    let nextStart = 0;
    for ( let eventIndex = 0; eventIndex < eventCount; eventIndex += 1 )
    {
        const event = sampleRootedMotion(
            point,
            nextStart + ( eventIndex === 0 ? 0 : 0.000001 ),
            0.22,
            1,
            1,
            intervalBase
        );
        assert.equal( event.gustEventIndex, eventIndex );
        events.push( event );
        nextStart = event.gustEventStartedAt + event.gustEventLength;
    }
    return events;
}

function createFixture()
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

test( 'rooted motion holds the planting contact exactly still', () => {
    for ( const time of [ 0, 1.25, 9.7, 101.3 ] )
    {
        for ( const y of [ -4, 0, 2.049, 2.05 ] )
        {
            for ( const gustMix of [ 0, 0.5, 1 ] )
            {
                const offset = sampleRootedMotion(
                    { x: 12, y, z: -9 },
                    time,
                    rootedMotionProfile.maximumResponse,
                    1,
                    gustMix
                );
                assert.equal( offset.x, 0 );
                assert.equal( offset.y, 0 );
                assert.equal( offset.z, 0 );
                assert.equal( offset.release, 0 );
            }
        }
    }
} );

test( 'motion response and attachment weight can independently lock a point', () => {
    const point = { x: 8, y: 11, z: -5 };
    assert.equal( magnitude( sampleRootedMotion( point, 3.2, 0, 1 ) ), 0 );
    assert.equal( magnitude( sampleRootedMotion( point, 3.2, 0.65, 0 ) ), 0 );
    assert.equal( magnitude(
        sampleRootedMotion( point, 3.2, 0, 1, 1 )
    ), 0 );
    assert.equal( magnitude(
        sampleRootedMotion( point, 3.2, 0.65, 0, 1 )
    ), 0 );
    assert.deepEqual(
        sampleRootedMotion( point, 3.2, 0.42, 0.7 ),
        sampleRootedMotion( point, 3.2, 0.42, 0.7 )
    );
    assert.equal( createRootedMotionUniforms( 0.22, -1 ).gustMix.value, 0 );
    assert.equal( createRootedMotionUniforms( 0.22, 2 ).gustMix.value, 1 );
    assert.equal( createRootedMotionUniforms( 0.22, 1, -5 )
        .intervalBase.value, 0 );
    assert.equal( createRootedMotionUniforms( 0.22, 1, 30 )
        .intervalBase.value, 13 );
    assert.throws( () => createRootedMotionUniforms( 0.22, NaN ),
        /gust mix and gust interval base must be finite/ );
    assert.throws( () => createRootedMotionUniforms( 0.22, 1, NaN ),
        /gust interval base must be finite/ );
} );

test( 'the lower trunk yields less than the crown and all samples stay bounded', () => {
    const lowerTrunkMaximum = maximumSample( { x: 0.2, y: 3.1, z: 0.1 } );
    const crownMaximum = maximumSample( { x: 9, y: 12.6, z: 5 } );
    assert.ok( lowerTrunkMaximum > 0 );
    assert.ok( crownMaximum > lowerTrunkMaximum * 12 );

    for ( let y = -2; y <= 18; y += 1 )
    {
        for ( let radial = 0; radial <= 16; radial += 2 )
        {
            for ( let time = 0; time <= 30; time += 0.37 )
            {
                for ( const gustMix of [ 0, 0.5, 1 ] )
                {
                    const offset = sampleRootedMotion(
                        { x: radial, y, z: radial * -0.61 },
                        time,
                        rootedMotionProfile.maximumResponse,
                        1,
                        gustMix
                    );
                    assert.ok(
                        magnitude( offset )
                            <= rootedMotionProfile.maximumDisplacement + 1e-12
                    );
                }
            }
        }
    }
} );

test( 'the visible candidate keeps monumental mass while the crown clearly travels', () => {
    const outerCrown = { x: 12, y: 15, z: 4 };
    const defaultDiameter = trajectoryDiameter( outerCrown, 0.22 );
    const maximumDiameter = trajectoryDiameter( outerCrown, 0.65 );
    assert.ok( defaultDiameter > 0.6,
        `default crown travel ${defaultDiameter} should be visibly non-trivial` );
    assert.ok( maximumDiameter > 1.8,
        `maximum crown travel ${maximumDiameter} should be a clear stress test` );
    assert.ok( maximumStepDelta( outerCrown, 0.65 ) > 0.55,
        'maximum sway should move an outer crown point substantially in one second' );
    assert.ok( maximumSample( { x: 0, y: 3, z: 0 } ) < 0.02,
        'the first exposed trunk bay must retain monumental weight' );
} );

test( 'gust mix zero preserves the accepted v3 persistent field', () => {
    const samples = [
        [ { x: 12, y: 15, z: 4 }, 3.2, 0.22,
            [ 0.19401097637676937, -0.06014178178389425 ] ],
        [ { x: -8, y: 10, z: -5 }, 8.7, 0.65,
            [ -0.5021989239470676, -0.3091514406535955 ] ],
        [ { x: 0, y: 6.25, z: 0 }, 1.1, 0.41,
            [ 0.0400313688076424, 0.026360665472553117 ] ]
    ];
    for ( const [ point, time, response, expected ] of samples )
    {
        const implicit = sampleRootedMotion( point, time, response );
        const explicit = sampleRootedMotion( point, time, response, 1, 0 );
        assert.ok( Math.abs( implicit.x - expected[0] ) < 1e-14 );
        assert.ok( Math.abs( implicit.z - expected[1] ) < 1e-14 );
        assert.equal( explicit.x, implicit.x );
        assert.equal( explicit.z, implicit.z );
        assert.equal( explicit.gustMix, 0 );
    }
} );

test( 'an irregular gust crosses unequal canopy regions then genuinely rests', () => {
    const canopy = [
        { x: -14, y: 13, z: 0 },
        { x: 14, y: 13, z: 0 },
        { x: 0, y: 13, z: -14 },
        { x: 0, y: 13, z: 14 }
    ];
    let maximumEnvelopeDifference = 0;
    const firstArrivals = canopy.map( () => null );
    let firstVisibleGust = null;
    let currentCalm = 0;
    let longestCalm = 0;
    for ( let time = 0; time <= 60; time += 0.025 )
    {
        const offsets = canopy.map( ( point ) => sampleRootedMotion(
            point,
            time,
            0.22,
            1,
            1,
            13
        ) );
        const envelopes = offsets.map( ( offset ) => offset.gustEnvelope );
        maximumEnvelopeDifference = Math.max(
            maximumEnvelopeDifference,
            Math.max( ...envelopes ) - Math.min( ...envelopes )
        );
        for ( let index = 0; index < envelopes.length; index += 1 )
        {
            if ( firstArrivals[index] === null && envelopes[index] > 0.5 )
            {
                firstArrivals[index] = time;
            }
        }
        if ( firstVisibleGust === null
            && offsets.some( ( offset ) => magnitude( offset ) > 0.05 ) )
        {
            firstVisibleGust = time;
        }
        if ( Math.max( ...envelopes ) < 0.02 )
        {
            currentCalm += 0.025;
            longestCalm = Math.max( longestCalm, currentCalm );
        }
        else currentCalm = 0;
    }
    assert.ok( maximumEnvelopeDifference > 0.95,
        'one canopy region should be gust-loaded while another remains calm' );
    assert.ok( firstArrivals.every( Number.isFinite ) );
    assert.ok( Math.min( ...firstArrivals ) < 2 );
    assert.ok( Math.max( ...firstArrivals ) - Math.min( ...firstArrivals ) > 3,
        'the warped front must reach canopy regions at distinct phases' );
    assert.ok( firstVisibleGust < 2.5 );
    assert.ok( longestCalm >= 10,
        'the land-wind schedule must retain a substantial calm interval' );

    const deterministic = sampleRootedMotion(
        canopy[0],
        1.55,
        0.22,
        1,
        1,
        13
    );
    assert.deepEqual(
        deterministic,
        sampleRootedMotion( canopy[0], 1.55, 0.22, 1, 1, 13 )
    );
    assert.deepEqual(
        deterministic,
        sampleRootedMotion( { ...canopy[0] }, 1.55, 0.22, 1, 1, 13 )
    );
} );

test( 'land-wind events vary their gap, direction, speed and front shape', () => {
    const events = scheduledGustEvents( 13, 257 );
    const activeEvents = events.filter( ( event ) => event.gustEventActive );
    const starts = events.map( ( event ) => event.gustEventStartedAt );
    const gaps = starts.slice( 1 ).map(
        ( start, index ) => start - starts[index]
    );
    assert.ok( activeEvents.length >= events.length - 2 );
    assert.ok( Math.min( ...gaps ) >= 13 );
    assert.ok( Math.max( ...gaps ) <= 29 );
    assert.ok( Math.max( ...gaps ) - Math.min( ...gaps ) > 14 );

    let minimumDirectionDot = 1;
    for ( let left = 0; left < activeEvents.length; left += 1 )
    {
        for ( let right = left + 1; right < activeEvents.length; right += 1 )
        {
            minimumDirectionDot = Math.min(
                minimumDirectionDot,
                activeEvents[left].gustDirectionX
                    * activeEvents[right].gustDirectionX
                    + activeEvents[left].gustDirectionZ
                        * activeEvents[right].gustDirectionZ
            );
        }
    }
    assert.ok( minimumDirectionDot < -0.9,
        'successive land gusts must span substantially opposed directions' );
    assert.ok(
        Math.max( ...activeEvents.map( ( event ) => event.gustFrontSpeed ) )
            - Math.min( ...activeEvents.map( ( event ) => event.gustFrontSpeed ) )
            > 3
    );
    assert.ok(
        Math.max( ...activeEvents.map( ( event ) => event.gustDuration ) )
            - Math.min( ...activeEvents.map( ( event ) => event.gustDuration ) )
            > 1.8
    );

    const firstEventWarps = [
        { x: -14, y: 13, z: 0 },
        { x: 14, y: 13, z: 0 },
        { x: 0, y: 13, z: -14 },
        { x: 0, y: 13, z: 14 }
    ].map( ( point ) => sampleRootedMotion(
        point,
        0.01,
        0.22,
        1,
        1,
        13
    ).gustFrontWarp );
    assert.ok( Math.max( ...firstEventWarps )
        - Math.min( ...firstEventWarps ) > 0.5,
    'one gust front must be curved rather than a planar shoreline wave' );

    const reviewPoint = { x: -10, y: 14, z: 7 };
    const peakEventOffset = ( event ) => {
        let peak = { x: 0, z: 0 };
        for ( let elapsed = 0;
            elapsed <= event.gustEventLength;
            elapsed += 0.05 )
        {
            const candidate = sampleRootedMotion(
                reviewPoint,
                event.gustEventStartedAt + elapsed,
                0.65,
                1,
                1,
                13
            );
            if ( magnitude( candidate ) > magnitude( peak ) ) peak = candidate;
        }
        return peak;
    };
    const firstWindow = peakEventOffset( events[0] );
    const nextWindow = peakEventOffset( events[1] );
    assert.ok( Math.hypot(
        firstWindow.x - nextWindow.x,
        firstWindow.z - nextWindow.z
    ) > 0.2, 'event windows must not replay one periodic phase' );

    let maximumBoundaryStep = 0;
    const boundaryPoints = [
        { x: -14, y: 13, z: 0 },
        { x: 14, y: 13, z: 0 },
        { x: 0, y: 13, z: -14 },
        { x: 0, y: 13, z: 14 }
    ];
    for ( const boundaryEvent of events.slice( 1 ) )
    {
        const boundary = boundaryEvent.gustEventStartedAt;
        for ( const point of boundaryPoints )
        {
            const before = sampleRootedMotion(
                point,
                boundary - 0.001,
                0.65,
                1,
                1,
                13
            );
            const after = sampleRootedMotion(
                point,
                boundary + 0.001,
                0.65,
                1,
                1,
                13
            );
            maximumBoundaryStep = Math.max(
                maximumBoundaryStep,
                Math.hypot( after.x - before.x, after.z - before.z )
            );
        }
    }
    assert.ok( maximumBoundaryStep < 0.001,
        'gusts must recover before their review window ends' );
} );

test( 'modular rooted hash is float-stable, varied and reproducible', () => {
    const referenceHash = ( value ) => {
        const modulus = 4093;
        const modulo = ( item ) => ( item % modulus + modulus ) % modulus;
        const token = modulo( Math.floor( value * 100 + 0.5 ) );
        let state = modulo( token * 251 + 1381 );
        state = modulo( state * state + 113 );
        state = modulo( state * state + 197 );
        return Math.fround( state / modulus );
    };
    const knownValues = new Map( [
        [ 0, 0.048863913863897324 ],
        [ 7.31, 0.2132909893989563 ],
        [ 19.7, 0.9987784028053284 ],
        [ 37.2, 0.30442216992378235 ],
        [ 91.3, 0.2619105875492096 ],
        [ 263.31, 0.22184216976165771 ]
    ] );
    for ( const [ input, expected ] of knownValues )
    {
        assert.equal( rootedMotionHash( input ), expected );
        assert.equal( rootedMotionHash( input ), referenceHash( input ) );
    }

    const sequence = Array.from(
        { length: rootedMotionProfile.gustEventModulo },
        ( _, index ) => rootedMotionHash( index + 7.31 )
    );
    assert.ok( new Set( sequence ).size > 240 );
    const deltas = sequence.slice( 1 ).map(
        ( value, index ) => Math.fround( value - sequence[index] )
    );
    assert.ok( new Set( deltas ).size > 240,
        'the schedule hash must not collapse into a linear sequence' );
} );

test( 'gust interval base defines exact irregular event bands', () => {
    const schedules = [
        { base: 0, ceiling: 15 },
        { base: 13, ceiling: 29 }
    ];
    for ( const { base, ceiling } of schedules )
    {
        const events = scheduledGustEvents( base, 515 );
        const starts = events.map( ( event ) => event.gustEventStartedAt );
        const gaps = starts.slice( 1 ).map(
            ( start, index ) => start - starts[index]
        );
        for ( const gap of gaps )
        {
            assert.ok( gap >= base - 1e-9,
                `${gap} must not precede the ${base}s base` );
            assert.ok( gap <= ceiling + 1e-9,
                `${gap} must remain inside the ${ceiling}s ceiling` );
        }
        assert.ok( Math.min( ...gaps ) < base + 0.5 );
        assert.ok( Math.max( ...gaps ) > ceiling - 0.9 );
        const intervalSpan = 15 + base / 13;
        assert.ok( gaps[0] >= base + intervalSpan * 0.25 );
        assert.ok( gaps[0] <= base + intervalSpan * 0.75 );

        const successiveTwoGapSums = starts.slice( 2 ).map(
            ( start, index ) => start - starts[index]
        );
        assert.ok( new Set( successiveTwoGapSums.map(
            ( value ) => value.toFixed( 6 )
        ) ).size > 100,
        'independent jitter must not hide a fixed complementary-pair beat' );

        for ( const event of events.slice( 1 ) )
        {
            const boundary = event.gustEventStartedAt;
            const before = sampleRootedMotion(
                { x: 0, y: 13, z: 0 },
                boundary - 0.000001,
                0.22,
                1,
                1,
                base
            );
            const atBoundary = sampleRootedMotion(
                { x: 0, y: 13, z: 0 },
                boundary,
                0.22,
                1,
                1,
                base
            );
            const after = sampleRootedMotion(
                { x: 0, y: 13, z: 0 },
                boundary + 0.000001,
                0.22,
                1,
                1,
                base
            );
            assert.equal( before.gustEventIndex, event.gustEventIndex - 1 );
            assert.equal( atBoundary.gustEventIndex, event.gustEventIndex );
            assert.equal( after.gustEventIndex, event.gustEventIndex );
            assert.equal( atBoundary.gustEnvelope, 0,
                'each new event must start at zero load' );
        }
    }

    const firstEvent = sampleRootedMotion(
        { x: 0, y: 13, z: 0 },
        0,
        0.22,
        1,
        1,
        13
    );
    assert.equal( firstEvent.gustEventIndex, 0 );
    assert.equal( firstEvent.gustEventStartedAt, 0 );

    const baseZeroEvents = scheduledGustEvents( 0, 24 );
    const baseThirteenEvents = scheduledGustEvents( 13, 24 );
    for ( let index = 0; index < baseZeroEvents.length; index += 1 )
    {
        assert.equal(
            baseZeroEvents[index].gustEventIndex,
            baseThirteenEvents[index].gustEventIndex
        );
        approxEqual(
            baseZeroEvents[index].gustDirectionX,
            baseThirteenEvents[index].gustDirectionX
        );
        approxEqual(
            baseZeroEvents[index].gustDirectionZ,
            baseThirteenEvents[index].gustDirectionZ
        );
    }

    const point = { x: 12, y: 15, z: 4 };
    assert.deepEqual(
        sampleRootedMotion( point, 8.2, 0.65, 1, 0, 0 ),
        sampleRootedMotion( point, 8.2, 0.65, 1, 0, 13 ),
        'the Composition baseline must ignore the experimental interval'
    );

    for ( const intervalBase of [0, 13] )
    {
        for ( const event of scheduledGustEvents( intervalBase, 20 ).slice( 1 ) )
        {
            const before = sampleRootedMotion(
                point,
                event.gustEventStartedAt - 0.0001,
                0.65,
                1,
                1,
                intervalBase
            );
            const after = sampleRootedMotion(
                point,
                event.gustEventStartedAt + 0.0001,
                0.65,
                1,
                1,
                intervalBase
            );
            assert.ok( Math.hypot(
                after.x - before.x,
                after.z - before.z
            ) < 0.002, 'event boundaries must not snap' );
        }
    }
} );

test( 'gust compliance favours outer branches without loosening the trunk', () => {
    const outer = maximumSample(
        { x: 12, y: 15, z: 4 },
        0.65,
        1,
        160
    );
    const firstBay = maximumSample( { x: 0, y: 3, z: 0 }, 0.65, 1 );
    const handoff = maximumSample( { x: 0, y: 6.25, z: 0 }, 0.65, 1 );
    assert.ok( outer > 0.7 );
    assert.ok( firstBay < 0.005 );
    assert.ok( handoff < 0.04 );
    assert.ok( outer > handoff * 20 );

    const analyticGustBound = (
        rootedMotionProfile.gustMainAmplitude
            + rootedMotionProfile.gustEddyAmplitude
            + Math.hypot(
                rootedMotionProfile.gustWhisperXAmplitude,
                rootedMotionProfile.gustWhisperZAmplitude
            )
    ) * rootedMotionProfile.maximumResponse;
    const analyticPersistentBound = Math.hypot(
        rootedMotionProfile.swayXAmplitude
            + rootedMotionProfile.secondaryXAmplitude,
        rootedMotionProfile.swayZAmplitude
            + rootedMotionProfile.secondaryZAmplitude
    ) * rootedMotionProfile.maximumResponse;
    assert.ok( analyticGustBound <= rootedMotionProfile.maximumDisplacement );
    assert.ok( analyticPersistentBound <= rootedMotionProfile.maximumDisplacement );
} );

test( 'the CPU profile and GLSL contract publish the same rooted field', async () => {
    assert.equal( rootedMotionFieldId, 'engineered-tree-rooted-sway-v4' );
    assert.match( rootedMotionShaderDeclarations, /smoothstep\( 2\.05, 6\.25/ );
    assert.match( rootedMotionShaderDeclarations, /smoothstep\( 5\.8, 12\.6/ );
    assert.match( rootedMotionShaderDeclarations, /0\.10 \+ 0\.60 \* crown \+ 0\.30 \* reach/ );
    assert.match( rootedMotionShaderDeclarations,
        /release \* crown \* \( 0\.20 \+ 0\.80 \* reach \)/ );
    assert.match( rootedMotionShaderDeclarations, /rootedTime \* 0\.58/ );
    assert.match( rootedMotionShaderDeclarations, /rootedTime \* 0\.41/ );
    assert.match( rootedMotionShaderDeclarations, /rootedTime \* 1\.24/ );
    assert.match( rootedMotionShaderDeclarations,
        /swayX \* 1\.20 \* coherentFlex/ );
    assert.match( rootedMotionShaderDeclarations, /uniform float treeGustMix/ );
    assert.match( rootedMotionShaderDeclarations,
        /uniform float treeGustIntervalBase/ );
    assert.match( rootedMotionShaderDeclarations,
        /if \( gustMix <= 0\.0001 \) return persistentOffset \* response/ );
    assert.match( rootedMotionShaderDeclarations,
        /gustIntervalSpan = 15\.0 \+ gustIntervalBase \/ 13\.0/ );
    assert.match( rootedMotionShaderDeclarations,
        /gustIntervalMean = gustIntervalBase[\s\S]*?gustIntervalSpan \* 0\.50/ );
    assert.match( rootedMotionShaderDeclarations,
        /gustIntervalJitterAmplitude = gustIntervalSpan \* 0\.25/ );
    assert.match( rootedMotionShaderDeclarations,
        /estimatedEventIndex = floor\( gustTime \/ gustIntervalMean \)/ );
    assert.match( rootedMotionShaderDeclarations,
        /candidateOffset = -2[\s\S]*?candidateOffset <= 2/ );
    assert.match( rootedMotionShaderDeclarations,
        /rootedMotionEventStart\([\s\S]*?boundedEventIndex \+ 7\.31/ );
    assert.match( rootedMotionShaderDeclarations,
        /token = mod\( floor\( value \* 100\.0 \+ 0\.5 \), 4093\.0 \)/ );
    assert.match( rootedMotionShaderDeclarations,
        /state = mod\( token \* 251\.0 \+ 1381\.0, 4093\.0 \)/ );
    assert.match( rootedMotionShaderDeclarations,
        /state = mod\( state \* state \+ 113\.0, 4093\.0 \)[\s\S]*?state = mod\( state \* state \+ 197\.0, 4093\.0 \)/ );
    assert.doesNotMatch( rootedMotionShaderDeclarations,
        /fract\(\s*sin\(\s*value/ );
    assert.match( rootedMotionShaderDeclarations,
        /eventWindowStrength = smoothstep\([\s\S]*?0\.45,[\s\S]*?1\.25/ );
    assert.match( rootedMotionShaderDeclarations,
        /rootedMotionHash\( boundedEventIndex \+ 19\.7 \)[\s\S]*?\* 6\.283185/ );
    assert.match( rootedMotionShaderDeclarations,
        /float gustFrontSpeed = 5\.2[\s\S]*?\+ 3\.8/ );
    assert.match( rootedMotionShaderDeclarations,
        /float gustFrontWarp = gustFrontCurvature/ );
    assert.match( rootedMotionShaderDeclarations,
        /gustLane = 0\.12[\s\S]*?\+ 0\.88 \* exp/ );
    assert.doesNotMatch( rootedMotionShaderDeclarations,
        /gustTime \/ 12\.0|alongWind \+ 18\.0 \) \/ 6\.5/ );
    assert.match( rootedMotionShaderDeclarations,
        /gustDirection \* 1\.95 \* gustPressure \* branchFlex/ );
    assert.match( rootedMotionShaderDeclarations,
        /mix\( persistentOffset, gustOffset, gustMix \)/ );
    assert.match( rootedMotionShaderDeclarations, /clamp\( rootedResponse, 0\.0, 0\.65 \)/ );
    assert.match( rootedMotionShaderDeclarations, /#ifndef TREE_MOTION_WEIGHT/ );

    const application = rootedMotionShaderApplication( 'transformed' );
    assert.match( application, /sampleRootedTreeMotion\(\s*transformed,/ );
    assert.match( application, /TREE_MOTION_WEIGHT/ );

    const treeLibrary = await import( '../../src/lib/tree/index.js' );
    assert.equal( treeLibrary.rootedMotionFieldId, rootedMotionFieldId );
    assert.equal( treeLibrary.sampleRootedMotion, sampleRootedMotion );
} );

test( 'engine shader families share one rooted implementation', () => {
    const source = readFileSync( engineUrl, 'utf8' );
    const applications = source.match(
        /rootedMotionShaderApplication\( '(?:position|transformed)' \)/g
    ) ?? [];
    assert.equal( applications.length, 4 );
    assert.equal(
        applications.filter( ( call ) => call.includes( "'transformed'" ) ).length,
        1,
        'the instanced D2/D3 family samples its transformed coordinate'
    );
    assert.doesNotMatch( source, /treeTime \* 0\.72/ );
    assert.doesNotMatch( source, /engineered-tree-shared-sway-v1/ );
} );

test( 'uniform changes retain material, geometry and uniform resources', () => {
    const uniforms = createRootedMotionUniforms();
    const timeReference = uniforms.time;
    const responseReference = uniforms.response;
    const gustMixReference = uniforms.gustMix;
    const intervalBaseReference = uniforms.intervalBase;
    const registeredMaterial = { userData: {} };
    registerRootedMotionMaterial(
        registeredMaterial,
        uniforms,
        'test-manifestation'
    );
    uniforms.time.value = 4.5;
    uniforms.response.value = 0.41;
    uniforms.gustMix.value = 1;
    uniforms.intervalBase.value = 13;
    assert.equal(
        registeredMaterial.userData.deformationUniforms.time,
        timeReference
    );
    assert.equal(
        registeredMaterial.userData.deformationUniforms.response,
        responseReference
    );
    assert.equal(
        registeredMaterial.userData.deformationUniforms.gustMix,
        gustMixReference
    );
    assert.equal(
        registeredMaterial.userData.deformationUniforms.intervalBase,
        intervalBaseReference
    );
    assert.equal(
        registeredMaterial.userData.rootedMotion.intervalBaseUniform,
        intervalBaseReference
    );
    assert.deepEqual(
        registeredMaterial.userData.rootedMotion.modes,
        [ 'persistent-sway', 'canopy-gust-front' ]
    );

    const { form, hierarchy, positions } = createFixture();
    const layer = createEngineeredTreeLayer( hierarchy, positions, form );
    const trunk = layer.group.getObjectByName( 'monumental trunk' );
    const informationCore = layer.group.getObjectByName(
        'routed information core'
    );
    const trunkGeometry = trunk.geometry;
    const trunkMaterial = trunk.material;
    const coreGeometry = informationCore.geometry;
    const coreMaterial = informationCore.material;
    const trunkUniforms = trunk.material.userData.deformationUniforms;
    const coreUniforms = informationCore.material.userData.deformationUniforms;

    layer.update( 6.75, {
        ...form,
        structuralResponse: 0.41,
        canopyGustCandidate: true,
        gustIntervalBase: 7
    } );

    assert.equal( trunk.geometry, trunkGeometry );
    assert.equal( trunk.material, trunkMaterial );
    assert.equal( informationCore.geometry, coreGeometry );
    assert.equal( informationCore.material, coreMaterial );
    assert.equal( trunk.material.userData.deformationUniforms, trunkUniforms );
    assert.equal( informationCore.material.userData.deformationUniforms, coreUniforms );
    assert.equal( trunkUniforms.time.value, 6.75 );
    assert.equal( coreUniforms.time.value, 6.75 );
    assert.equal( trunkUniforms.response.value, 0.41 );
    assert.equal( coreUniforms.response.value, 0.41 );
    assert.equal( trunkUniforms.gustMix.value, 1 );
    assert.equal( coreUniforms.gustMix.value, 1 );
    assert.equal( trunkUniforms.intervalBase.value, 7 );
    assert.equal( coreUniforms.intervalBase.value, 7 );
} );

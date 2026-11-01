import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as THREE from 'three';
import {
    generateSluiceCapillaryLayout,
    generateSluiceSourceLayout,
    resolveSluiceCapillaryActiveSourceIndices,
    sluiceCapillaryDomainDefaults,
    sluiceMoltenDomainDefaults,
    snapshotSluiceSourceEmission
} from '../../src/lib/casting-pit/universe/sluice-gate-layer.js';

const sluiceSource = readFileSync(
    new URL(
        '../../src/lib/casting-pit/universe/sluice-gate-layer.js',
        import.meta.url
    ),
    'utf8'
);

function assertNear( actual, expected, tolerance = 1e-9 )
{
    assert.ok(
        Math.abs( actual - expected ) <= tolerance,
        `${actual} was not within ${tolerance} of ${expected}`
    );
}

const intersectionTolerance = 1e-9;

function pointsMatch( first, second )
{
    return Math.abs( first[0] - second[0] ) <= intersectionTolerance
        && Math.abs( first[1] - second[1] ) <= intersectionTolerance;
}

function segmentOrientation( start, end, point )
{
    return ( end[0] - start[0] ) * ( point[1] - start[1] )
        - ( end[1] - start[1] ) * ( point[0] - start[0] );
}

function pointOnSegment( point, start, end )
{
    return Math.abs( segmentOrientation( start, end, point ) )
            <= intersectionTolerance
        && point[0] >= Math.min( start[0], end[0] ) - intersectionTolerance
        && point[0] <= Math.max( start[0], end[0] ) + intersectionTolerance
        && point[1] >= Math.min( start[1], end[1] ) - intersectionTolerance
        && point[1] <= Math.max( start[1], end[1] ) + intersectionTolerance;
}

function hasForbiddenSegmentIntersection(
    firstStart,
    firstEnd,
    secondStart,
    secondEnd,
    allowedPoints = []
)
{
    const orientations = [
        segmentOrientation( firstStart, firstEnd, secondStart ),
        segmentOrientation( firstStart, firstEnd, secondEnd ),
        segmentOrientation( secondStart, secondEnd, firstStart ),
        segmentOrientation( secondStart, secondEnd, firstEnd )
    ];
    const properIntersection = orientations[0] * orientations[1]
            < -intersectionTolerance
        && orientations[2] * orientations[3] < -intersectionTolerance;
    if ( properIntersection ) return true;

    const candidates = [];
    const addCandidate = ( point ) => {
        if ( !candidates.some( ( candidate ) => pointsMatch( candidate, point ) ) )
        {
            candidates.push( point );
        }
    };
    if ( pointOnSegment( firstStart, secondStart, secondEnd ) )
    {
        addCandidate( firstStart );
    }
    if ( pointOnSegment( firstEnd, secondStart, secondEnd ) )
    {
        addCandidate( firstEnd );
    }
    if ( pointOnSegment( secondStart, firstStart, firstEnd ) )
    {
        addCandidate( secondStart );
    }
    if ( pointOnSegment( secondEnd, firstStart, firstEnd ) )
    {
        addCandidate( secondEnd );
    }
    if ( candidates.length === 0 ) return false;

    const collinear = orientations.every(
        ( orientation ) => Math.abs( orientation ) <= intersectionTolerance
    );
    if ( collinear )
    {
        const axis = Math.abs( firstEnd[0] - firstStart[0] )
                >= Math.abs( firstEnd[1] - firstStart[1] )
            ? 0
            : 1;
        const overlapStart = Math.max(
            Math.min( firstStart[axis], firstEnd[axis] ),
            Math.min( secondStart[axis], secondEnd[axis] )
        );
        const overlapEnd = Math.min(
            Math.max( firstStart[axis], firstEnd[axis] ),
            Math.max( secondStart[axis], secondEnd[axis] )
        );
        if ( overlapEnd - overlapStart > intersectionTolerance ) return true;
    }
    return candidates.some( ( candidate ) => !allowedPoints.some(
        ( allowed ) => pointsMatch( candidate, allowed )
    ) );
}

function polylinesHaveForbiddenIntersection(
    firstPoints,
    secondPoints,
    allowedPoints
)
{
    for ( let firstIndex = 0;
        firstIndex < firstPoints.length - 1;
        firstIndex += 1 )
    {
        for ( let secondIndex = 0;
            secondIndex < secondPoints.length - 1;
            secondIndex += 1 )
        {
            if ( hasForbiddenSegmentIntersection(
                firstPoints[firstIndex],
                firstPoints[firstIndex + 1],
                secondPoints[secondIndex],
                secondPoints[secondIndex + 1],
                allowedPoints
            ) ) return true;
        }
    }
    return false;
}

function createLayout( sourceSeed = 7 )
{
    const sourceLayout = generateSluiceSourceLayout( {
        gateCount: 4,
        streamCount: 12,
        sourceSeed,
        sourceRadius: 13
    } );
    return {
        sourceLayout,
        capillaryLayout: generateSluiceCapillaryLayout( {
            sourceLayout,
            sourceSeed
        } )
    };
}

test( 'the opt-in capillary domain expands without reducing field sampling', () => {
    assert.equal( Object.isFrozen( sluiceCapillaryDomainDefaults ), true );
    assert.deepEqual( sluiceCapillaryDomainDefaults, {
        radius: 27,
        size: 54,
        resolution: 384,
        geometrySegments: 320,
        maskLimitMin: 0.99,
        maskLimitMax: 0.995,
        maskFadeWidth: 0.055
    } );
    assert.ok(
        sluiceCapillaryDomainDefaults.radius
            > sluiceMoltenDomainDefaults.radius
    );
    assertNear(
        sluiceCapillaryDomainDefaults.size
            / sluiceCapillaryDomainDefaults.resolution,
        sluiceMoltenDomainDefaults.size
            / sluiceMoltenDomainDefaults.resolution
    );
} );

test( 'capillary graphs deterministically bifurcate terminals into primary trunks', () => {
    const first = createLayout( 11 );
    const second = createLayout( 11 );
    assert.deepEqual( first.capillaryLayout, second.capillaryLayout );
    assert.equal( Object.isFrozen( first.capillaryLayout ), true );
    assert.equal( Object.isFrozen( first.capillaryLayout.sources ), true );
    assert.equal( first.capillaryLayout.sourceCount, 12 );
    assert.equal(
        first.capillaryLayout.primaryTrunkCount,
        first.capillaryLayout.sources.reduce(
            ( total, source ) => total + source.primaryTrunks.length,
            0
        )
    );
    assert.equal(
        first.capillaryLayout.terminalCapillaryCount,
        first.capillaryLayout.sources.reduce(
            ( total, source ) => total + source.terminalCapillaries.length,
            0
        )
    );
    assert.equal(
        first.capillaryLayout.tributaryCount,
        first.capillaryLayout.terminalCapillaryCount
    );

    first.capillaryLayout.sources.forEach( ( source, sourceIndex ) => {
        const physical = first.sourceLayout.sources[sourceIndex];
        assert.equal( Object.isFrozen( source ), true );
        assert.equal( Object.isFrozen( source.primaryTrunks ), true );
        assert.equal( Object.isFrozen( source.terminalCapillaries ), true );
        assert.equal( Object.isFrozen( source.tributaries ), true );
        assert.ok( source.primaryTrunks.length === 2
            || source.primaryTrunks.length === 3 );
        assert.equal(
            source.terminalCapillaries.length,
            source.primaryTrunks.length * 2
        );
        assert.ok( source.terminalCapillaries.length === 4
            || source.terminalCapillaries.length === 6 );
        assert.strictEqual( source.tributaries, source.terminalCapillaries );
        assert.deepEqual( source.confluence, physical.position );

        source.primaryTrunks.forEach( ( primary, primaryIndex ) => {
            assert.equal( Object.isFrozen( primary ), true );
            assert.equal( Object.isFrozen( primary.terminalCapillaries ), true );
            assert.equal( primary.primaryIndex, primaryIndex );
            assert.equal( primary.terminalCapillaries.length, 2 );
            const [ firstTerminal, secondTerminal ] =
                primary.terminalCapillaries;
            assert.strictEqual(
                firstTerminal.branchPoint,
                secondTerminal.branchPoint,
                'sibling terminals must meet at one branch point'
            );
            assert.strictEqual(
                firstTerminal.approach,
                secondTerminal.approach,
                'sibling terminals must share the downstream primary trunk'
            );
            assert.strictEqual( firstTerminal.points[2], primary.branchPoint );
            assert.strictEqual( secondTerminal.points[2], primary.branchPoint );
            assert.strictEqual( firstTerminal.points[3], primary.approach );
            assert.strictEqual( secondTerminal.points[3], primary.approach );

            primary.terminalCapillaries.forEach(
                ( terminal, terminalIndex ) => {
                    assert.equal( Object.isFrozen( terminal ), true );
                    assert.equal( Object.isFrozen( terminal.points ), true );
                    assert.equal( terminal.sourceIndex, source.sourceIndex );
                    assert.equal( terminal.primaryIndex, primaryIndex );
                    assert.equal( terminal.terminalIndex, terminalIndex );
                    assert.equal(
                        terminal.tributaryIndex,
                        primaryIndex * 2 + terminalIndex
                    );
                    assert.equal( terminal.points.length, 5 );
                    assert.deepEqual( terminal.confluence, physical.position );
                    assert.strictEqual( terminal.points.at( -1 ), source.confluence );
                    for ( const point of terminal.points )
                    {
                        assert.equal( Object.isFrozen( point ), true );
                    }
                }
            );

            const dx = primary.confluence[0] - primary.approach[0];
            const dz = primary.confluence[1] - primary.approach[1];
            const distance = Math.hypot( dx, dz );
            const approachAlignment = dx / distance * physical.direction[0]
                + dz / distance * physical.direction[1];
            assert.ok(
                approachAlignment > 0.95,
                'each primary trunk must enter in the feed direction'
            );
        } );
        for ( let firstPrimaryIndex = 0;
            firstPrimaryIndex < source.primaryTrunks.length;
            firstPrimaryIndex += 1 )
        {
            for ( let secondPrimaryIndex = firstPrimaryIndex + 1;
                secondPrimaryIndex < source.primaryTrunks.length;
                secondPrimaryIndex += 1 )
            {
                const firstPrimary = source.primaryTrunks[firstPrimaryIndex];
                const secondPrimary = source.primaryTrunks[secondPrimaryIndex];
                assert.notDeepEqual(
                    firstPrimary.branchPoint,
                    secondPrimary.branchPoint,
                    'different trunks must not merge at an upstream branch'
                );
                assert.notDeepEqual(
                    firstPrimary.approach,
                    secondPrimary.approach,
                    'different trunks must remain distinct until the forge'
                );
            }
        }
    } );
} );

test( 'primary trunks never cross before their forge across deterministic layouts', () => {
    const layoutVariants = [
        { gateCount: 3, streamCount: 8, sourceRadius: 11 },
        { gateCount: 4, streamCount: 12, sourceRadius: 13 },
        { gateCount: 5, streamCount: 16, sourceRadius: 15 }
    ];
    let primaryPairCount = 0;
    let siblingPairCount = 0;
    let crossPrimaryTerminalPairCount = 0;

    for ( let sourceSeed = 1; sourceSeed <= 100; sourceSeed += 1 )
    {
        for ( const variant of layoutVariants )
        {
            const sourceLayout = generateSluiceSourceLayout( {
                ...variant,
                sourceSeed
            } );
            const capillaryLayout = generateSluiceCapillaryLayout( {
                sourceLayout,
                sourceSeed
            } );
            capillaryLayout.sources.forEach( ( source ) => {
                source.primaryTrunks.forEach( ( primary ) => {
                    const [ firstTerminal, secondTerminal ] =
                        primary.terminalCapillaries;
                    assert.equal(
                        polylinesHaveForbiddenIntersection(
                            firstTerminal.points.slice( 0, 3 ),
                            secondTerminal.points.slice( 0, 3 ),
                            [ primary.branchPoint ]
                        ),
                        false,
                        `seed ${sourceSeed}, source ${source.sourceIndex}, primary ${primary.primaryIndex}: sibling terminals crossed before their branch point`
                    );
                    siblingPairCount += 1;
                } );

                for ( let firstIndex = 0;
                    firstIndex < source.primaryTrunks.length;
                    firstIndex += 1 )
                {
                    const first = source.primaryTrunks[firstIndex];
                    for ( let secondIndex = firstIndex + 1;
                        secondIndex < source.primaryTrunks.length;
                        secondIndex += 1 )
                    {
                        const second = source.primaryTrunks[secondIndex];
                        assert.equal(
                            polylinesHaveForbiddenIntersection(
                                [
                                    first.branchPoint,
                                    first.approach,
                                    first.confluence
                                ],
                                [
                                    second.branchPoint,
                                    second.approach,
                                    second.confluence
                                ],
                                [ source.confluence ]
                            ),
                            false,
                            `seed ${sourceSeed}, source ${source.sourceIndex}: primary ${firstIndex} crossed primary ${secondIndex} before the forge`
                        );
                        primaryPairCount += 1;

                        first.terminalCapillaries.forEach(
                            ( firstTerminal ) => {
                                second.terminalCapillaries.forEach(
                                    ( secondTerminal ) => {
                                        assert.equal(
                                            polylinesHaveForbiddenIntersection(
                                                firstTerminal.points,
                                                secondTerminal.points,
                                                [ source.confluence ]
                                            ),
                                            false,
                                            `seed ${sourceSeed}, source ${source.sourceIndex}: ${firstTerminal.id} crossed ${secondTerminal.id}`
                                        );
                                        crossPrimaryTerminalPairCount += 1;
                                    }
                                );
                            }
                        );
                    }
                }
            } );
        }
    }
    assert.ok( primaryPairCount > 8000 );
    assert.ok( siblingPairCount > 8000 );
    assert.equal(
        crossPrimaryTerminalPairCount,
        primaryPairCount * 4
    );
    assert.ok( crossPrimaryTerminalPairCount > 33000 );
} );

test( 'capillary inlets emerge only through the hidden irregular fade band', () => {
    const { capillaryLayout } = createLayout( 19 );
    const fadeStart = (
        sluiceCapillaryDomainDefaults.maskLimitMin
            - sluiceCapillaryDomainDefaults.maskFadeWidth
    ) * sluiceCapillaryDomainDefaults.radius;
    const visibleEnd = sluiceCapillaryDomainDefaults.maskLimitMax
        * sluiceCapillaryDomainDefaults.radius;

    capillaryLayout.sources.forEach( ( source ) => {
        source.tributaries.forEach( ( tributary ) => {
            const inletRadius = Math.hypot( ...tributary.inlet );
            assert.ok( inletRadius > fadeStart );
            assert.ok( inletRadius < visibleEnd );
            assert.ok( inletRadius < sluiceCapillaryDomainDefaults.radius );
        } );
    } );
    assert.match(
        sluiceSource,
        /const moltenDomain = capillary\.enabled[\s\S]*?sluiceCapillaryDomainDefaults[\s\S]*?: sluiceMoltenDomainDefaults/
    );
    assert.match(
        sluiceSource,
        /coverage \*= perimeterCoverage;[\s\S]*?coverage < 0\.015/
    );
} );

test( 'a confluence event preserves the real parcel identity and provenance', () => {
    const source = {
        label: 'Feed 4',
        position: [ 12.5, -3.25 ],
        direction: [ -0.88, 0.475 ],
        color: new THREE.Color( 0xd77a48 )
    };
    const route = {
        id: 'source-3-primary-1-terminal-0',
        primaryIndex: 1,
        terminalIndex: 0,
        inlet: Object.freeze( [ 24.1, -8.5 ] ),
        branchPoint: Object.freeze( [ 19.2, -6.1 ] )
    };
    const parcel = {
        x: source.position[0],
        z: source.position[1],
        vx: -1.31,
        vz: 0.62,
        mass: 0.74,
        footprint: 0.41,
        temperature: 0.93,
        capillaryIdentity: 27,
        capillaryRoute: route
    };
    const event = snapshotSluiceSourceEmission( {
        source,
        sourceIndex: 3,
        parcel,
        simulationTime: 4.25
    } );
    assert.equal( event.parcelIdentity, 27 );
    assert.equal( event.capillaryRouteId, route.id );
    assert.equal( event.capillaryPrimaryIndex, 1 );
    assert.equal( event.capillaryTerminalIndex, 0 );
    assert.deepEqual( event.capillaryInlet, route.inlet );
    assert.deepEqual( event.capillaryBranchPoint, route.branchPoint );
    assert.deepEqual( event.confluence, source.position );
    assert.equal( event.mass, parcel.mass );
    assert.equal( event.identityPreserved, true );

    const acceptStart = sluiceSource.indexOf(
        'function acceptCapillaryParcel'
    );
    const acceptEnd = sluiceSource.indexOf(
        'function integrateCapillaryParcel',
        acceptStart
    );
    const acceptance = sluiceSource.slice( acceptStart, acceptEnd );
    assert.match( acceptance, /parcel\.capillaryPhase = null/ );
    assert.equal(
        Array.from( acceptance.matchAll(
            /onSourceEmission\( snapshotSluiceSourceEmission/g
        ) ).length,
        1
    );
    assert.doesNotMatch(
        acceptance,
        /parcel\.(?:mass|capillaryIdentity|capillaryRoute)\s*=/
    );
    const spawnStart = sluiceSource.indexOf( 'function spawnParcel' );
    const spawnEnd = sluiceSource.indexOf( 'function emitParcels', spawnStart );
    const spawn = sluiceSource.slice( spawnStart, spawnEnd );
    assert.match(
        spawn,
        /if \( onSourceEmission && !capillaryRoute \)/
    );
} );

test( 'cluster review activates the selected source and cyclic neighbours', () => {
    assert.deepEqual(
        resolveSluiceCapillaryActiveSourceIndices( {
            reviewMode: 'cluster',
            selectedSourceIndex: 0,
            sourceCount: 12
        } ),
        [ 11, 0, 1 ]
    );
    assert.deepEqual(
        resolveSluiceCapillaryActiveSourceIndices( {
            reviewMode: 'cluster',
            selectedSourceIndex: 11,
            sourceCount: 12
        } ),
        [ 10, 11, 0 ]
    );
    assert.deepEqual(
        resolveSluiceCapillaryActiveSourceIndices( {
            reviewMode: 'cluster',
            selectedSourceIndex: 1,
            sourceCount: 2
        } ),
        [ 0, 1 ]
    );
    assert.deepEqual(
        resolveSluiceCapillaryActiveSourceIndices( {
            reviewMode: 'selected',
            selectedSourceIndex: 4,
            sourceCount: 12
        } ),
        [ 4 ]
    );
    assert.equal(
        Object.isFrozen( resolveSluiceCapillaryActiveSourceIndices( {
            reviewMode: 'all',
            selectedSourceIndex: 4,
            sourceCount: 12
        } ) ),
        true
    );
    assert.match( sluiceSource, /'selected',\s*'cluster',\s*'all'/ );
    assert.match( sluiceSource, /activeSourceIndices/ );
    assert.match( sluiceSource, /activePrimaryTrunkCount/ );
    assert.match( sluiceSource, /activeTerminalCapillaryCount/ );
} );

test( 'changing the selected source preserves an unchanged all-source field', () => {
    const setterStart = sluiceSource.indexOf(
        'function setSelectedCapillarySourceIndex'
    );
    const setterEnd = sluiceSource.indexOf( '\nreturn {', setterStart );
    const setter = sluiceSource.slice( setterStart, setterEnd );
    assert.match(
        setter,
        /capillary\.selectedSourceIndex = resolved;[\s\S]*?if \( capillary\.reviewMode !== 'all' \) resetParcels\(\);/
    );
    assert.equal(
        Array.from( setter.matchAll( /resetParcels\(\)/g ) ).length,
        1
    );
} );

test( 'tributaries share the one flux, field and molten presentation', () => {
    const spawnStart = sluiceSource.indexOf( 'function spawnParcel' );
    const spawnEnd = sluiceSource.indexOf( 'function emitParcels', spawnStart );
    const spawn = sluiceSource.slice( spawnStart, spawnEnd );
    assert.match(
        spawn,
        /source\.capillaryCursor % source\.capillaryTributaries\.length/
    );
    assert.equal(
        Array.from( spawn.matchAll( /source\.capillaryCursor \+= 1/g ) ).length,
        1,
        'one accepted parcel must advance to one terminal route'
    );

    const emitStart = sluiceSource.indexOf( 'function emitParcels' );
    const emitEnd = sluiceSource.indexOf(
        'function setGateAppearance',
        emitStart
    );
    const emission = sluiceSource.slice( emitStart, emitEnd );
    assert.match(
        emission,
        /emissionRate \* source\.cadence \* timeStep \/ sourceDefinitions\.length/
    );
    assert.equal(
        Array.from( emission.matchAll( /spawnParcel\( source, sourceIndex \)/g ) )
            .length,
        1
    );
    assert.doesNotMatch( emission, /for \(.*tributar|tributaries\.forEach/ );

    assert.equal(
        Array.from(
            sluiceSource.matchAll(
                /const moltenSurface = new THREE\.Mesh/g
            )
        ).length,
        1
    );
    assert.equal(
        Array.from(
            sluiceSource.matchAll(
                /const moltenMaterial = new THREE\.ShaderMaterial/g
            )
        ).length,
        1
    );
    assert.match(
        sluiceSource,
        /capillaryPhase === 'upstream'[\s\S]*?depositTrail\( parcel, previousX, previousZ, timeStep \)/
    );
    assert.match(
        sluiceSource,
        /parcel\.capillaryPhase === 'upstream'[\s\S]*?return;[\s\S]*?applyPairInteraction/
    );
    assert.match(
        sluiceSource,
        /syntheticMass:\s*0/
    );
    assert.match(
        sluiceSource,
        /const massBalance = capillaryDiagnostics\.inletMass\s*- capillaryDiagnostics\.confluenceMass\s*- inTransitMass/
    );
} );

test( 'capillary parcels retain baseline downstream life after the confluence', () => {
    const spawnStart = sluiceSource.indexOf( 'function spawnParcel' );
    const spawnEnd = sluiceSource.indexOf( 'function emitParcels', spawnStart );
    const spawn = sluiceSource.slice( spawnStart, spawnEnd );
    assert.match(
        spawn,
        /lifetime:\s*THREE\.MathUtils\.lerp\( 18, 24, random\(\) \)/
    );
    assert.doesNotMatch( spawn, /capillaryRoute \? 12/ );

    const acceptStart = sluiceSource.indexOf(
        'function acceptCapillaryParcel'
    );
    const acceptEnd = sluiceSource.indexOf(
        'function integrateCapillaryParcel',
        acceptStart
    );
    const acceptance = sluiceSource.slice( acceptStart, acceptEnd );
    assert.match( acceptance, /parcel\.age = 0/ );

    const integrateStart = acceptEnd;
    const integrateEnd = sluiceSource.indexOf(
        'function integrateParcels',
        integrateStart
    );
    const integration = sluiceSource.slice( integrateStart, integrateEnd );
    assert.ok(
        integration.indexOf( 'parcel.age += timeStep' )
            < integration.indexOf( 'acceptCapillaryParcel( parcel )' ),
        'upstream ageing must happen before the exact confluence resets age'
    );
} );

test( 'capacity applies bounded lossless backpressure to capillary inflow', () => {
    assert.match(
        sluiceSource,
        /maximumParcels:\s*capillary\.enabled \? 1000 : 700/
    );

    const spawnStart = sluiceSource.indexOf( 'function spawnParcel' );
    const spawnEnd = sluiceSource.indexOf( 'function emitParcels', spawnStart );
    const spawn = sluiceSource.slice( spawnStart, spawnEnd );
    assert.match(
        spawn,
        /simulation\.parcels\.length >= simulation\.maximumParcels[\s\S]*?return null/
    );
    assert.match( spawn, /return parcel/ );

    const emitStart = spawnEnd;
    const emitEnd = sluiceSource.indexOf(
        'function setGateAppearance',
        emitStart
    );
    const emission = sluiceSource.slice( emitStart, emitEnd );
    const spawnCall = emission.indexOf(
        'const parcel = spawnParcel( source, sourceIndex )'
    );
    const decrement = emission.indexOf( 'source.emissionAccumulator -= 1' );
    assert.ok( spawnCall >= 0 && decrement > spawnCall );
    assert.match(
        emission,
        /if \( !parcel \)[\s\S]*?Math\.min\([\s\S]*?source\.emissionAccumulator,[\s\S]*?1[\s\S]*?\);[\s\S]*?break;/
    );
} );

test( 'the default shared Sluice remains a non-capillary 36 by 36 field', () => {
    assert.deepEqual( sluiceMoltenDomainDefaults, {
        radius: 18,
        size: 36,
        resolution: 256,
        geometrySegments: 240,
        maskLimitMin: 0.99,
        maskLimitMax: 0.995,
        maskFadeWidth: 0.055
    } );
    assert.match( sluiceSource, /capillaryNetwork = null/ );
    assert.match(
        sluiceSource,
        /if \( value === null \|\| value === undefined \|\| value === false \)[\s\S]*?enabled:\s*false/
    );
} );

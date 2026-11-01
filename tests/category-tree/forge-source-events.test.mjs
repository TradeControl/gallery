import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as THREE from 'three';
import {
    generateSluiceSourceLayout,
    sluiceGateDefaults,
    sluiceSourceRadiusRange,
    snapshotSluiceSourceEmission,
    snapshotSluiceSourceLayout
} from '../../src/lib/casting-pit/universe/sluice-gate-layer.js';

function inputRange( html, id )
{
    const escaped = id.replace( /[-/\\^$*+?.()|[\]{}]/g, '\\$&' );
    const tag = html.match( new RegExp(
        `<input\\s+id="${escaped}"[^>]*>`
    ) )?.[0];
    assert.ok( tag, `missing input #${id}` );
    return Object.fromEntries( [ 'min', 'max', 'step', 'value' ].map(
        ( attribute ) => [
            attribute,
            Number( tag.match(
                new RegExp( `\\b${attribute}="([^"]+)"` )
            )?.[1] )
        ]
    ) );
}

function createSource()
{
    return {
        label: 'Feed 3',
        position: [ 12.5, -3.25 ],
        direction: [ -0.88, 0.475 ],
        speedFactor: 1.04,
        cadence: 0.96,
        mass: 0.81,
        color: new THREE.Color( 0xd77a48 )
    };
}

test( 'source layout snapshots are deterministic detached immutable values', () => {
    const source = createSource();
    const first = snapshotSluiceSourceLayout( {
        sources: [ source ],
        sourceSeed: 7,
        streamCount: 1
    } );
    const second = snapshotSluiceSourceLayout( {
        sources: [ createSource() ],
        sourceSeed: 7,
        streamCount: 1
    } );

    assert.deepEqual( first, second );
    assert.equal( Object.isFrozen( first ), true );
    assert.equal( Object.isFrozen( first.sources ), true );
    assert.equal( Object.isFrozen( first.sources[0] ), true );
    assert.equal( Object.isFrozen( first.sources[0].position ), true );
    assert.equal( Object.isFrozen( first.sources[0].direction ), true );
    assert.equal( Object.isFrozen( first.sources[0].color ), true );
    assert.deepEqual( first.sources[0].position, [ 12.5, -3.25 ] );
    assert.deepEqual( first.sources[0].direction, [ -0.88, 0.475 ] );

    source.position[0] = 99;
    source.direction[1] = 99;
    source.color.set( 0xffffff );
    assert.deepEqual( first.sources[0].position, [ 12.5, -3.25 ] );
    assert.deepEqual( first.sources[0].direction, [ -0.88, 0.475 ] );
    assert.notDeepEqual( first.sources[0].color, [ 1, 1, 1 ] );
} );

test( 'source emission snapshots preserve the accepted parcel provenance', () => {
    const source = createSource();
    const parcel = {
        x: 12.42,
        z: -3.09,
        vx: -1.31,
        vz: 0.62,
        mass: 0.74,
        footprint: 0.41,
        temperature: 0.93
    };
    const event = snapshotSluiceSourceEmission( {
        source,
        sourceIndex: 2,
        parcel,
        simulationTime: 4.25
    } );

    assert.equal( Object.isFrozen( event ), true );
    for ( const property of [
        'sourcePosition',
        'sourceDirection',
        'position',
        'velocity',
        'color'
    ] )
    {
        assert.equal( Object.isFrozen( event[property] ), true );
    }
    assert.equal( event.sourceIndex, 2 );
    assert.equal( event.sourceLabel, 'Feed 3' );
    assert.deepEqual( event.position, [ 12.42, -3.09 ] );
    assert.deepEqual( event.velocity, [ -1.31, 0.62 ] );
    assert.equal( event.mass, parcel.mass );
    assert.equal( event.footprint, parcel.footprint );
    assert.equal( event.temperature, parcel.temperature );
    assert.equal( event.simulationTime, 4.25 );

    parcel.x = 0;
    source.position[0] = 0;
    assert.deepEqual( event.position, [ 12.42, -3.09 ] );
    assert.deepEqual( event.sourcePosition, [ 12.5, -3.25 ] );
} );

test( 'source radius translates the real deterministic feed ring', () => {
    assert.ok( Object.isFrozen( sluiceSourceRadiusRange ) );
    assert.equal( sluiceGateDefaults.sourceRadius, 13 );
    const inner = generateSluiceSourceLayout( {
        gateCount: 4,
        streamCount: 12,
        sourceSeed: 7,
        sourceRadius: 10
    } );
    const outer = generateSluiceSourceLayout( {
        gateCount: 4,
        streamCount: 12,
        sourceSeed: 7,
        sourceRadius: 15
    } );
    assert.equal( inner.sourceRadius, 10 );
    assert.equal( outer.sourceRadius, 15 );
    assert.equal( inner.sources.length, 12 );
    for ( let index = 0; index < inner.sources.length; index += 1 )
    {
        const innerPosition = inner.sources[index].position;
        const outerPosition = outer.sources[index].position;
        const innerRadius = Math.hypot( ...innerPosition );
        const outerRadius = Math.hypot( ...outerPosition );
        assert.ok(
            innerRadius >= 10 - sluiceSourceRadiusRange.variation
                && innerRadius <= 10 + sluiceSourceRadiusRange.variation
        );
        assert.ok(
            outerRadius >= 15 - sluiceSourceRadiusRange.variation
                && outerRadius <= 15 + sluiceSourceRadiusRange.variation
        );
        assert.ok( Math.abs( outerRadius - innerRadius - 5 ) < 1e-9 );
        assert.ok( Math.abs(
            innerPosition[0] / innerRadius
                - outerPosition[0] / outerRadius
        ) < 1e-9 );
        assert.ok( Math.abs(
            innerPosition[1] / innerRadius
                - outerPosition[1] / outerRadius
        ) < 1e-9 );
    }
    assert.throws(
        () => generateSluiceSourceLayout( { sourceRadius: 8.75 } ),
        /must be between 9 and 16/
    );
} );

test( 'every shared Sluice endpoint exposes the same physical source-radius control', () => {
    const endpoints = [
        [
            '../../src/category-tree/casting-pit/physical-layer/index.html',
            'source-radius',
            /Confluence ring radius/
        ],
        [
            '../../src/category-tree/casting-pit/universe-cosmos/index.html',
            'u-source-radius',
            /Lava-source ring radius/
        ],
        [
            '../../src/category-tree/composition/index.html',
            'u-source-radius',
            /Confluence ring radius/
        ]
    ];
    for ( const [ path, id, label ] of endpoints )
    {
        const html = readFileSync( new URL( path, import.meta.url ), 'utf8' );
        assert.deepEqual( inputRange( html, id ), {
            min: sluiceSourceRadiusRange.min,
            max: sluiceSourceRadiusRange.max,
            step: sluiceSourceRadiusRange.step,
            value: sluiceGateDefaults.sourceRadius
        } );
        assert.match( html, label );
    }
} );

test( 'callbacks observe generated layouts and only accepted parcel emissions', () => {
    const source = readFileSync(
        new URL(
            '../../src/lib/casting-pit/universe/sluice-gate-layer.js',
            import.meta.url
        ),
        'utf8'
    );
    assert.match( source, /onSourceLayoutChange = null/ );
    assert.match( source, /onSourceEmission = null/ );
    assert.match(
        source,
        /onSourceLayoutChange\( snapshotSluiceSourceLayout\( \{/
    );
    const spawnStart = source.indexOf( 'function spawnParcel' );
    const capacityGuard = source.indexOf(
        'simulation.parcels.length >= simulation.maximumParcels',
        spawnStart
    );
    const acceptedPush = source.indexOf(
        'simulation.parcels.push( parcel )',
        spawnStart
    );
    const emissionCallback = source.indexOf(
        'onSourceEmission( snapshotSluiceSourceEmission',
        spawnStart
    );
    assert.ok( capacityGuard > spawnStart );
    assert.ok( acceptedPush > capacityGuard );
    assert.ok( emissionCallback > acceptedPush );
    assert.doesNotMatch(
        source.slice( spawnStart, acceptedPush ),
        /onSourceEmission\(/
    );
} );

test( 'source heat alters only existing density in the depth-true molten presentation', () => {
    const source = readFileSync(
        new URL(
            '../../src/lib/casting-pit/universe/sluice-gate-layer.js',
            import.meta.url
        ),
        'utf8'
    );
    assert.match( source, /getSourceHeatState = null/ );
    assert.match(
        source,
        /const moltenMaterial = new THREE\.ShaderMaterial\( \{[\s\S]*?transparent:\s*true,[\s\S]*?depthWrite:\s*true/
    );
    assert.match(
        source,
        /function writeMoltenTexture\(\)[\s\S]*?field\.textureData\[textureOffset\] = field\.density\[index\][\s\S]*?writeSourceHeatPresentation\(\)[\s\S]*?field\.texture\.needsUpdate = true/
    );
    const presentationStart = source.indexOf(
        'function writeSourceHeatPresentation'
    );
    const textureWrite = source.indexOf(
        'function writeMoltenTexture',
        presentationStart
    );
    const presentation = source.slice( presentationStart, textureWrite );
    assert.match(
        presentation,
        /const density = field\.textureData\[textureOffset\]/
    );
    assert.match(
        presentation,
        /field\.textureData\[textureOffset \+ 1\] = Math\.max\([\s\S]*?density \* thermalRatio/
    );
    assert.doesNotMatch(
        presentation,
        /field\.textureData\[textureOffset\]\s*=/
    );
    assert.match( presentation, /const thermalFalloff = Math\.exp\(/ );
    assert.doesNotMatch( source, /vec3 forgeHot/ );
    assert.doesNotMatch(
        presentation,
        /field\.(?:density|heat|flowX|flowZ)\[[^\]]+\]\s*=/
    );
    assert.equal(
        Array.from( source.matchAll( /const moltenSurface = new THREE\.Mesh/g ) )
            .length,
        1
    );
    assert.match( source, /samplePresentation:\s*sampleMoltenPresentation/ );
} );

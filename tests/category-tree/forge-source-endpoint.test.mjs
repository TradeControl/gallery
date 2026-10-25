import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
    forgeSourceDefaults,
    forgeSourceRanges,
    sluiceGateDefaults,
    sluiceSourceRadiusRange
} from '../../src/lib/casting-pit/index.js';

const html = readFileSync(
    new URL(
        '../../src/category-tree/casting-pit/physical-layer/index.html',
        import.meta.url
    ),
    'utf8'
);
const main = readFileSync(
    new URL(
        '../../src/category-tree/casting-pit/physical-layer/main.js',
        import.meta.url
    ),
    'utf8'
);

function inputRange( id )
{
    const escaped = id.replace( /[-/\\^$*+?.()|[\]{}]/g, '\\$&' );
    const tag = html.match( new RegExp(
        `<input\\s+id="${escaped}"[^>]*>`
    ) )?.[0];
    assert.ok( tag, `missing input #${id}` );
    assert.match( tag, /\btype="range"/ );
    return Object.fromEntries( [ 'min', 'max', 'step', 'value' ].map(
        ( attribute ) => [
            attribute,
            Number( tag.match(
                new RegExp( `\\b${attribute}="([^"]+)"` )
            )?.[1] )
        ]
    ) );
}

test( 'the endpoint exposes bounded source-heat controls and the real ring radius', () => {
    const controls = {
        heatIntensity: 'forge-heat-intensity',
        heatReach: 'forge-heat-reach',
        settlingTime: 'forge-settling-time'
    };
    for ( const [ property, id ] of Object.entries( controls ) )
    {
        assert.deepEqual( inputRange( id ), {
            ...forgeSourceRanges[property],
            value: forgeSourceDefaults[property]
        } );
    }
    assert.deepEqual( inputRange( 'forge-source-index' ), {
        min: 1,
        max: 12,
        step: 1,
        value: 1
    } );
    assert.deepEqual( inputRange( 'source-radius' ), {
        min: sluiceSourceRadiusRange.min,
        max: sluiceSourceRadiusRange.max,
        step: sluiceSourceRadiusRange.step,
        value: sluiceGateDefaults.sourceRadius
    } );
    assert.match( html, />Lava-source ring radius</ );
    assert.doesNotMatch( html, /circumference|mini-henge/i );
    assert.doesNotMatch( html, /fountain|firework|spark|streak/i );
} );

test( 'the review defaults to one thermal origin per real feed', () => {
    assert.match(
        html,
        /data-forge-mode="all" aria-pressed="true"/
    );
    assert.match( html, /data-forge-mode="off"/ );
    assert.match( html, /data-forge-mode="all"/ );
    assert.match( html, /data-view="forge-ring"/ );
    assert.match( html, /data-view="forge-source"/ );
    assert.match( html, /Every real lava feed is its own forge/ );
    assert.match( html, /existing stream's/ );
    assert.match(
        html,
        /no[\s\S]*?separate source silhouette or material/i
    );
    assert.match( html, /Synthetic mass<\/dt><dd>0<\/dd>/ );
    assert.match(
        html,
        /adds no footprint,[\s\S]*?parcel or synthetic mass/
    );
    assert.doesNotMatch( html, /lake|bulb|source reservoirs/i );
} );

test( 'the endpoint joins source state to the Sluice molten field in one loop', () => {
    const forgeConstruction = main.indexOf( 'createForgeSourceLayer' );
    const universeConstruction = main.indexOf( 'createSluiceGateLayer' );
    assert.ok( forgeConstruction >= 0 );
    assert.ok( universeConstruction > forgeConstruction );
    assert.match( main, /onSourceLayoutChange:\s*handleSourceLayout/ );
    assert.match( main, /onSourceEmission:\s*forge\.consumeEmission/ );
    assert.match( main, /getSourceHeatState:\s*forge\.getFieldState/ );
    assert.match( main, /includeEnvironment:\s*false/ );
    assert.doesNotMatch(
        main,
        /membraneSurface\.visible|terrainApron\.visible|receiver\.visible/
    );
    assert.match(
        main,
        /world\.scene\.add\([\s\S]*?universe\.environment\.diagnostic,[\s\S]*?universe\.environment\.hemisphereLight,[\s\S]*?universe\.environment\.keyLight,[\s\S]*?universe\.environment\.rimLight/
    );
    assert.match( main, /world\.addFrameCallback[\s\S]*forge\.update\( time \)/ );
    assert.equal( Array.from( main.matchAll( /world\.start\(\)/g ) ).length, 1 );
    assert.equal( Array.from( main.matchAll( /setAnimationLoop/g ) ).length, 0 );
} );

test( 'layout changes rebuild and clear source-heat state deterministically', () => {
    assert.match(
        main,
        /function handleSourceLayout[\s\S]*forge\.setSourceLayout\( snapshot \)[\s\S]*forge\.setSelectedSourceIndex\( selected \)/
    );
    assert.match( main, /forge\.setSelectedSourceIndex\( selected \)/ );
    assert.match( main, /function refreshForgeCameras/ );
    assert.match( main, /activeCameraView === 'forge-ring'/ );
    assert.match( main, /activeCameraView === 'forge-source'/ );
    assert.match( main, /world\.orbitControls\.maxDistance = 50/ );

    const maximumSourceRadius = sluiceSourceRadiusRange.max
        + sluiceSourceRadiusRange.variation;
    const requestedDistance = Math.hypot(
        maximumSourceRadius * 1.55 - 0.9,
        maximumSourceRadius * 1.85
    );
    assert.ok( requestedDistance < 50 );
} );

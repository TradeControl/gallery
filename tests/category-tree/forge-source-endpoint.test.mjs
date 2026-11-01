import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
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

test( 'the standalone endpoint reviews a three-feed capillary cluster first', () => {
    assert.deepEqual( inputRange( 'capillary-source-index' ), {
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
    assert.match(
        html,
        /data-capillary-mode="selected" aria-pressed="false"/
    );
    assert.match(
        html,
        /data-capillary-mode="cluster" aria-pressed="true"/
    );
    assert.match( html, /data-capillary-mode="all"/ );
    assert.match( html, />Selected feed</ );
    assert.match( html, />Cluster</ );
    assert.match( html, />Whole system</ );
    assert.match( html, /data-view="cluster" aria-pressed="true"/ );
    assert.match( html, /data-view="capillary-field"/ );
    assert.match( html, /data-view="confluence"/ );
    assert.match( html, />Network</ );
    assert.match( html, /trunks → 0 tips/ );
    assert.match( html, />Review centre [/] confluence</ );
    assert.match( html, />Confluence ring radius</ );
    assert.match( html, /id="parcel-count">0 \/ 1000</ );
} );

test( 'the capillary study replaces the thermal source-ring presentation', () => {
    assert.match( html, /Real molten parcels enter through terminal capillaries/ );
    assert.match( html, /pair into[\s\S]*?primary trunks/ );
    assert.match( html, /continue into the\s+accepted stream/ );
    assert.match( html, /without changing[\s\S]*?identity or mass/ );
    assert.match( html, /Capillary and\s+downstream flow share one field/ );
    assert.match( html, /replaces the thermal source ring/ );
    assert.match(
        html,
        /no source[\s\S]*?bulb,[\s\S]*?separate material or synthetic parcel/i
    );
    assert.match( html, /Mass continuity/ );
    assert.match( html, /Molten domain/ );
    assert.doesNotMatch( html, /data-forge-mode|forge-heat|forge-source-index/ );
    assert.doesNotMatch( html, /fountain|firework|source lake|reservoir bulb/i );
} );

test( 'the endpoint opts one shared Sluice field into cluster capillary review', () => {
    assert.doesNotMatch(
        main,
        /createForgeSourceLayer|forgeSourceDefaults|forgeSourceRanges/
    );
    assert.match(
        main,
        /createSluiceGateLayer\( \{[\s\S]*?includeEnvironment:\s*false,[\s\S]*?capillaryNetwork:\s*\{[\s\S]*?enabled:\s*true,[\s\S]*?reviewMode:\s*capillaryReviewMode,[\s\S]*?selectedSourceIndex/
    );
    assert.match( main, /let capillaryReviewMode = 'cluster'/ );
    assert.match( main, /onSourceLayoutChange:\s*handleSourceLayout/ );
    assert.doesNotMatch( main, /onSourceEmission:|getSourceHeatState:/ );
    assert.match(
        main,
        /world\.scene\.add\([\s\S]*?universe\.environment\.diagnostic,[\s\S]*?universe\.environment\.hemisphereLight,[\s\S]*?universe\.environment\.keyLight,[\s\S]*?universe\.environment\.rimLight/
    );
    assert.equal( Array.from( main.matchAll( /world\.start\(\)/g ) ).length, 1 );
    assert.equal( Array.from( main.matchAll( /setAnimationLoop/g ) ).length, 0 );
} );

test( 'review controls change scope while retaining one simulation loop', () => {
    assert.match(
        main,
        /function setCapillaryMode[\s\S]*?setCapillaryReviewMode\( mode \)/
    );
    assert.match(
        main,
        /setSelectedCapillarySourceIndex\([\s\S]*?Number\( event\.currentTarget\.value \) - 1/
    );
    assert.match( main, /getCapillarySnapshot\(\)/ );
    assert.match( main, /activeCameraView === 'cluster'/ );
    assert.match( main, /activeCameraView === 'capillary-field'/ );
    assert.match( main, /activeCameraView === 'confluence'/ );
    assert.match( main, /setCameraView\( 'cluster' \)/ );
    assert.match( main, /activePrimaryTrunkCount/ );
    assert.match( main, /activeTerminalCapillaryCount/ );
    assert.match( main, /activeSourceIndices/ );
    assert.match( main, /trunks → \$\{activeTerminalCapillaryCount\} tips/ );
    assert.match( main, /world\.orbitControls\.maxDistance = 75/ );
    assert.match(
        main,
        /world\.addFrameCallback\([\s\S]*?updateCapillaryReadouts\(\)/
    );
    assert.doesNotMatch(
        main,
        /membraneSurface\.visible|terrainApron\.visible|receiver\.visible/
    );
} );

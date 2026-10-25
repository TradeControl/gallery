import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import {
    forgeSourceDefaults,
    forgeSourceRanges
} from '../../src/lib/casting-pit/index.js';

const compositionHtml = readFileSync(
    new URL( '../../src/category-tree/composition/index.html', import.meta.url ),
    'utf8'
);
const compositionMain = readFileSync(
    new URL( '../../src/category-tree/composition/main.js', import.meta.url ),
    'utf8'
);
const physicalHtml = readFileSync(
    new URL(
        '../../src/category-tree/casting-pit/physical-layer/index.html',
        import.meta.url
    ),
    'utf8'
);
const sharedIndex = readFileSync(
    new URL( '../../src/lib/casting-pit/index.js', import.meta.url ),
    'utf8'
);

function inputTag( html, id )
{
    const escaped = id.replace( /[-/\\^$*+?.()|[\]{}]/g, '\\$&' );
    const matches = Array.from( html.matchAll(
        new RegExp( `<input\\s+id="${escaped}"[^>]*>`, 'g' )
    ) );
    assert.equal( matches.length, 1, `expected one input #${id}` );
    return matches[0][0];
}

function rangeContract( html, id )
{
    const tag = inputTag( html, id );
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

test( 'the composition instantiates the shared forge before its physical source publisher', () => {
    assert.match( sharedIndex, /createForgeSourceLayer/ );
    assert.match(
        compositionMain,
        /createForgeSourceLayer[\s\S]*?const forge = createForgeSourceLayer/
    );
    assert.ok(
        compositionMain.indexOf( 'const forge = createForgeSourceLayer' )
        < compositionMain.indexOf( 'const universe = createSluiceGateLayer' )
    );
    assert.match(
        compositionMain,
        /onSourceLayoutChange:\s*handleForgeSourceLayout/
    );
    assert.match( compositionMain, /onSourceEmission:\s*forge\.consumeEmission/ );
    assert.equal(
        existsSync( new URL(
            '../../src/category-tree/composition/forge-source-layer.js',
            import.meta.url
        ) ),
        false
    );
} );

test( 'one physical radius owns both lava feeds and thermal origins', () => {
    assert.deepEqual(
        rangeContract( compositionHtml, 'u-source-radius' ),
        rangeContract( physicalHtml, 'source-radius' )
    );
    assert.match(
        compositionMain,
        /root:\s*document\.querySelector\( '#composition-controls' \)/
    );
    assert.doesNotMatch(
        compositionMain,
        /forge\.(?:group\.)?(?:position|scale)|forge\.group\.scale/
    );
    assert.match( compositionHtml, /data-view="source-ring"/ );
    assert.match(
        compositionMain,
        /'source-ring':\s*\{[\s\S]*?position:\s*new THREE\.Vector3\( 0, 46, 26 \)/
    );
} );

test( 'the composition source heat has a bounded review surface and immediate A/B switch', () => {
    const visible = inputTag(
        compositionHtml,
        'composition-source-heat-visible'
    );
    assert.match( visible, /\btype="checkbox"/ );
    assert.match( visible, /\bchecked\b/ );

    for ( const [ id, property ] of [
        [ 'composition-heat-intensity', 'heatIntensity' ],
        [ 'composition-heat-reach', 'heatReach' ],
        [ 'composition-settling-time', 'settlingTime' ]
    ] )
    {
        assert.deepEqual( rangeContract( compositionHtml, id ), {
            ...forgeSourceRanges[property],
            value: forgeSourceDefaults[property]
        } );
    }
    assert.match(
        compositionMain,
        /forge\.setVisible\([\s\S]*?mode\.universe[\s\S]*?#composition-source-heat-visible/
    );
    assert.match( compositionMain, /forge\.refreshSurface\(\)/ );
    assert.match( compositionMain, /forge\.clearActivity\(\)/ );
    assert.match(
        compositionMain,
        /getSourceHeatState:\s*forge\.getFieldState/
    );
    assert.match( compositionHtml, /existing stream/i );
    assert.doesNotMatch(
        compositionHtml,
        /basalt|rimmed|source bulb|source reservoirs|lake/i
    );
    assert.doesNotMatch(
        compositionHtml,
        /fountain|firework|spark|streak/i
    );
} );

test( 'the forge participates in the existing composition frame and creates no loop', () => {
    assert.match(
        compositionMain,
        /world\.addFrameCallback\([\s\S]*?forge\.update\( time \)/
    );
    assert.equal(
        Array.from( compositionMain.matchAll( /world\.start\(/g ) ).length,
        1
    );
    assert.doesNotMatch( compositionMain, /setAnimationLoop/ );
    assert.match(
        compositionMain,
        /world\.start\(\s*\(\)\s*=>\s*tree\.render\(\)\s*\)/
    );
} );

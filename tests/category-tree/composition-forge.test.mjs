import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
    sluiceGateDefaults,
    sluiceSourceRadiusRange
} from '../../src/lib/casting-pit/index.js';

const compositionHtml = readFileSync(
    new URL( '../../src/category-tree/composition/index.html', import.meta.url ),
    'utf8'
);
const compositionMain = readFileSync(
    new URL( '../../src/category-tree/composition/main.js', import.meta.url ),
    'utf8'
);
const compositionStyle = readFileSync(
    new URL( '../../src/category-tree/composition/style.css', import.meta.url ),
    'utf8'
);
const physicalHtml = readFileSync(
    new URL(
        '../../src/category-tree/casting-pit/physical-layer/index.html',
        import.meta.url
    ),
    'utf8'
);
const universeCosmosMain = readFileSync(
    new URL(
        '../../src/category-tree/casting-pit/universe-cosmos/main.js',
        import.meta.url
    ),
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

test( 'the composition opts its shared molten layer into the whole capillary plexus', () => {
    assert.match(
        compositionMain,
        /const universe = createSluiceGateLayer\( \{[\s\S]*?capillaryNetwork:\s*\{[\s\S]*?enabled:\s*true,[\s\S]*?reviewMode:\s*'all',[\s\S]*?selectedSourceIndex:\s*0[\s\S]*?\}[\s\S]*?\} \);/
    );
    assert.match(
        compositionMain,
        /const snapshot = universe\.getCapillarySnapshot\(\)/
    );
    assert.doesNotMatch(
        compositionMain,
        /createForgeSourceLayer|forgeSourceDefaults|forgeSourceRanges/
    );
    assert.doesNotMatch(
        compositionMain,
        /onSourceLayoutChange:\s*handleForgeSourceLayout|onSourceEmission:\s*forge\.|getSourceHeatState:\s*forge\.|\bforge\./
    );
} );

test( 'one physical radius owns both standalone and composition confluences', () => {
    const compositionRadius = rangeContract(
        compositionHtml,
        'u-source-radius'
    );
    assert.deepEqual(
        compositionRadius,
        rangeContract( physicalHtml, 'source-radius' )
    );
    assert.deepEqual( compositionRadius, {
        min: sluiceSourceRadiusRange.min,
        max: sluiceSourceRadiusRange.max,
        step: sluiceSourceRadiusRange.step,
        value: sluiceGateDefaults.sourceRadius
    } );
    assert.match(
        compositionHtml,
        /for="u-source-radius"><span>Confluence ring radius<\/span>/
    );
    assert.match(
        compositionMain,
        /root:\s*document\.querySelector\( '#composition-controls' \)/
    );
} );

test( 'the composition presents hierarchy and continuity without thermal controls', () => {
    assert.match( compositionHtml, /Composition · capillary supply/ );
    for ( const [ label, id ] of [
        [ 'Network', 'composition-capillary-network-state' ],
        [ 'Upstream parcels', 'composition-capillary-parcel-state' ],
        [ 'Handoffs', 'composition-capillary-handoff-state' ],
        [ 'Mass continuity', 'composition-capillary-mass-state' ],
        [ 'Molten domain', 'composition-capillary-domain-state' ]
    ] )
    {
        assert.match(
            compositionHtml,
            new RegExp( `<dt>${label}<\\/dt>[\\s\\S]*?id="${id}"` )
        );
        assert.match(
            compositionMain,
            new RegExp( `#${id}` )
        );
    }
    assert.match( compositionHtml, /whole hierarchical shared plexus/i );
    assert.match( compositionHtml, /crossings are accepted/i );
    assert.match( compositionHtml, /same parcels in the same molten field/i );
    assert.match( compositionHtml, /no synthetic mass or separate material/i );
    assert.match(
        compositionHtml,
        /id="u-parcel-count">0 \/ 1000</
    );

    assert.doesNotMatch(
        compositionHtml,
        /composition-source-heat-visible|composition-heat-intensity|composition-heat-reach|composition-settling-time|composition-source-ring-state|composition-source-heat-state|composition-source-event-state/
    );
    assert.doesNotMatch(
        compositionMain,
        /composition-source-heat-visible|composition-heat-intensity|composition-heat-reach|composition-settling-time|forge\.(?:refreshSurface|clearActivity|update)/
    );
} );

test( 'the supply-plexus review camera sees the widened capillary domain', () => {
    assert.match(
        compositionHtml,
        /data-view="supply-plexus">Supply plexus<\/button>/
    );
    assert.doesNotMatch( compositionHtml, /data-view="source-ring"/ );
    assert.match(
        compositionMain,
        /'supply-plexus':\s*\{[\s\S]*?position:\s*new THREE\.Vector3\( 0, 55, 35 \)[\s\S]*?target:\s*new THREE\.Vector3\( 0, 0\.9, 0 \)/
    );
    assert.match( compositionMain, /world\.camera\.far = 120/ );
    assert.match( compositionMain, /world\.camera\.updateProjectionMatrix\(\)/ );
} );

test( 'capillary readouts share the existing composition frame and world loop', () => {
    assert.match(
        compositionMain,
        /world\.addFrameCallback\( \( time \) => \{[\s\S]*?updateCompositionCapillaryReadoutClock\( time \)[\s\S]*?\} \);/
    );
    assert.match( compositionMain, /updateCompositionCapillaryReadouts\(\);/ );
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

test( 'the capillary expansion remains an explicit composition opt-in', () => {
    assert.match( compositionMain, /capillaryNetwork:\s*\{/ );
    assert.doesNotMatch( universeCosmosMain, /capillaryNetwork\s*:/ );
    assert.doesNotMatch(
        compositionMain,
        /new\s+(?:THREE\.)?(?:WebGLRenderer|Scene|Clock)\b/
    );
} );

test( 'the composition panel collapses without disturbing live scene state', () => {
    const collapseImplementation = compositionMain.match(
        /function setControlsCollapsed\( collapsed \)[\s\S]*?\n\}/
    )?.[0] ?? '';
    assert.match(
        compositionHtml,
        /id="composition-controls-toggle"[\s\S]*?aria-controls="composition-controls"[\s\S]*?aria-expanded="true"[\s\S]*?aria-label="Hide controls"/
    );
    assert.match(
        compositionMain,
        /function setControlsCollapsed\( collapsed \)[\s\S]*?classList\.toggle\( 'controls-collapsed', collapsed \)[\s\S]*?controlsPanel\.inert = collapsed[\s\S]*?aria-hidden[\s\S]*?aria-expanded/
    );
    assert.match(
        compositionMain,
        /event\.key === 'Escape'[\s\S]*?setControlsCollapsed\( false \)[\s\S]*?controlsToggle\.focus\(\)/
    );
    assert.match(
        compositionStyle,
        /body\.controls-collapsed \.controls \{[^}]*visibility: hidden;[^}]*pointer-events: none;[^}]*transform: translateX/
    );
    assert.match(
        compositionStyle,
        /@media \(prefers-reduced-motion: reduce\)[\s\S]*?transition: none/
    );
    assert.doesNotMatch(
        collapseImplementation,
        /world\.|universe\.|tree\.|compositionSubstrate\./
    );
} );

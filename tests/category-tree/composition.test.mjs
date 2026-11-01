import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import {
    resolvePlantingTransform,
    treeBaselineDefaults,
    treePlacementDefaults,
    treePlacementRanges
} from '../../src/category-tree/composition/tree-instance.js';

const compositionHtml = readFileSync(
    new URL( '../../src/category-tree/composition/index.html', import.meta.url ),
    'utf8'
);
const compositionMain = readFileSync(
    new URL( '../../src/category-tree/composition/main.js', import.meta.url ),
    'utf8'
);
const compositionTreeInstance = readFileSync(
    new URL(
        '../../src/category-tree/composition/tree-instance.js',
        import.meta.url
    ),
    'utf8'
);
const treeHtml = readFileSync(
    new URL( '../../src/category-tree/tree/index.html', import.meta.url ),
    'utf8'
);
const treeMain = readFileSync(
    new URL( '../../src/category-tree/tree/main.js', import.meta.url ),
    'utf8'
);
const pitHtml = readFileSync(
    new URL(
        '../../src/category-tree/casting-pit/universe-cosmos/index.html',
        import.meta.url
    ),
    'utf8'
);
const worldSource = readFileSync(
    new URL( '../../src/lib/casting-pit/world.js', import.meta.url ),
    'utf8'
);

function inputTag( html, id )
{
    const escaped = id.replace( /[-/\\^$*+?.()|[\]{}]/g, '\\$&' );
    const tag = html.match( new RegExp( `<input\\s+id="${escaped}"[^>]*>` ) )?.[0];
    assert.ok( tag, `missing input #${id}` );
    return tag;
}

function rangeContract( html, id )
{
    const tag = inputTag( html, id );
    assert.match( tag, /\btype="range"/ );
    return Object.fromEntries( [ 'min', 'max', 'step', 'value' ].map(
        ( attribute ) => [
            attribute,
            tag.match( new RegExp( `\\b${attribute}="([^"]+)"` ) )?.[1]
        ]
    ) );
}

test( 'the composition plants the unchanged local root within a bounded placement envelope', () => {
    assert.deepEqual( treePlacementDefaults, {
        scale: 1,
        embedDepth: 0,
        rotationDegrees: 0
    } );
    const baseline = resolvePlantingTransform( -5.5 );
    assert.deepEqual( baseline.position, [ 0, -5.5, 0 ] );
    assert.equal( baseline.scale, 1 );
    assert.equal( baseline.rotationY, 0 );
    const placementInputs = {
        scale: 'tree-scale',
        embedDepth: 'tree-root-depth',
        rotationDegrees: 'tree-orientation'
    };
    for ( const [ property, id ] of Object.entries( placementInputs ) )
    {
        const htmlRange = Object.fromEntries( Object.entries(
            rangeContract( compositionHtml, id )
        ).map( ( [ key, value ] ) => [ key, Number( value ) ] ) );
        assert.deepEqual( htmlRange, {
            ...treePlacementRanges[property],
            value: treePlacementDefaults[property]
        } );
        assert.ok(
            treePlacementDefaults[property] >= treePlacementRanges[property].min
            && treePlacementDefaults[property] <= treePlacementRanges[property].max
        );
        const defaultStep = (
            treePlacementDefaults[property] - treePlacementRanges[property].min
        ) / treePlacementRanges[property].step;
        assert.ok(
            Math.abs( defaultStep - Math.round( defaultStep ) ) < 1e-9,
            `${property} default must align with its declared step`
        );
    }

    const embedded = resolvePlantingTransform( -5.5, {
        scale: 0.9,
        embedDepth: 0.75,
        rotationDegrees: 180
    } );
    assert.deepEqual( embedded.position, [ 0, -6.25, 0 ] );
    assert.equal( embedded.scale, 0.9 );
    assert.ok( Math.abs( embedded.rotationY - Math.PI ) < 1e-12 );
    assert.throws(
        () => resolvePlantingTransform( -5.5, { scale: 0.89 } ),
        /scale must be between 0\.9 and 1\.3/
    );
    assert.throws(
        () => resolvePlantingTransform( -5.5, { embedDepth: -0.1 } ),
        /root settlement must be between 0 and 1/
    );
    assert.throws(
        () => resolvePlantingTransform( -5.5, { embedDepth: 1.05 } ),
        /root settlement must be between 0 and 1/
    );
    assert.throws(
        () => resolvePlantingTransform( -5.5, { rotationDegrees: 181 } ),
        /orientation must be between -180 and 180/
    );
    assert.match( compositionHtml, />Root settlement</ );
    assert.match( compositionMain, /treePlacementRanges/ );
} );

test( 'the composition carries the committed Tree baseline without importing its app', () => {
    assert.equal( treeBaselineDefaults.crownSpread, 0.8 );
    assert.equal( treeBaselineDefaults.packetFrequency, 4 );
    assert.equal( treeBaselineDefaults.packetSpeed, 1.55 );
    assert.equal( treeBaselineDefaults.windSweep, 0 );
    assert.equal( treeBaselineDefaults.growthTiers, 6 );
    assert.equal( treeBaselineDefaults.structuralResponse, 0.5 );
    assert.equal( treeBaselineDefaults.internalRouterTiers, 4 );
    assert.equal( treeBaselineDefaults.internalRouterPresentationEnabled, true );
    assert.equal( treeBaselineDefaults.internalRouterJunctionFormEnabled, true );
    assert.equal(
        treeBaselineDefaults.internalRouterJunctionFormCircumference,
        0.55
    );
    assert.equal( treeBaselineDefaults.trunkRunesVisible, false );
    assert.doesNotMatch( compositionMain, /tree\/main\.js/ );
    assert.match( compositionMain, /createCompositionTree/ );
    assert.match( compositionMain,
        /world\.start\(\s*\(\)\s*=>\s*tree\.render\(\)\s*\)/ );
} );

test( 'review sections start closed under the final Tree recursion identity', () => {
    const detailTags = Array.from(
        compositionHtml.matchAll( /<details\b[^>]*>/g ),
        ( match ) => match[0]
    );
    assert.equal( detailTags.length, 8 );
    detailTags.forEach( ( tag ) => assert.doesNotMatch( tag, /\bopen\b/ ) );
    assert.match( compositionHtml, /<summary>Tree · recursion<\/summary>/ );
    assert.match( compositionHtml, /<summary>Tree · physical uptake<\/summary>/ );
    assert.doesNotMatch( compositionHtml, /Tree · accepted baseline/i );
} );

test( 'every Tree baseline slider is retained with the same range and default', () => {
    const mappings = {
        'crown-spread': 'tree-crown-spread',
        'vertical-rise': 'tree-vertical-rise',
        asymmetry: 'tree-asymmetry',
        'conduit-weight': 'tree-conduit-weight',
        'wind-sweep': 'tree-wind-sweep',
        'surface-relief': 'tree-surface-relief',
        'structural-response': 'tree-structural-response',
        'gust-interval-base': 'tree-gust-interval-base',
        'packet-speed': 'tree-packet-speed',
        'packet-frequency': 'tree-packet-frequency',
        'junction-circumference': 'tree-junction-circumference',
        'growth-tiers': 'tree-growth-tiers',
        'internal-router-tiers': 'tree-internal-router-tiers'
    };
    for ( const [ baselineId, compositionId ] of Object.entries( mappings ) )
    {
        assert.deepEqual(
            rangeContract( compositionHtml, compositionId ),
            rangeContract( treeHtml, baselineId ),
            `${compositionId} must retain the Tree baseline contract`
        );
    }
    assert.deepEqual(
        rangeContract( treeHtml, 'wind-sweep' ),
        { min: '-1.20', max: '1.20', step: '0.01', value: '0' }
    );
    assert.match( treeMain, /windSweep: 0,/ );
} );

test( 'rooted sway keeps one bounded control and exact reset parity', () => {
    assert.deepEqual(
        rangeContract( compositionHtml, 'tree-structural-response' ),
        rangeContract( treeHtml, 'structural-response' )
    );
    assert.deepEqual(
        rangeContract( treeHtml, 'structural-response' ),
        { min: '0', max: '0.65', step: '0.01', value: '0.50' }
    );
    assert.match(
        treeHtml,
        /for="structural-response"><span>Rooted sway<\/span>/
    );
    assert.match(
        compositionHtml,
        /for="tree-structural-response"><span>Rooted sway<\/span>/
    );
    assert.match( treeHtml, /for="freeze-motion"><span>Freeze sway<\/span>/ );
    assert.match(
        compositionHtml,
        /for="tree-freeze-motion"><span>Freeze sway<\/span>/
    );
    assert.match(
        treeMain,
        /form\.motionFrozen = formDefaults\.motionFrozen;[\s\S]*?#freeze-motion'[\s\S]*?\.checked = form\.motionFrozen/
    );
    assert.match(
        compositionMain,
        /tree\.resetForm\(\)[\s\S]*?#tree-freeze-motion' \)\.checked = false/
    );
} );

test( 'the P8.1 moving-gust candidate is shared by Tree and Composition', () => {
    assert.match(
        treeMain,
        /const formDefaults = \{[\s\S]*?canopyGustCandidate: true,[\s\S]*?\};\s*const form = \{ \.\.\.formDefaults \};/
    );
    assert.equal( treeBaselineDefaults.canopyGustCandidate, true );
    assert.equal( treeBaselineDefaults.gustIntervalBase, 0 );
    assert.match(
        compositionTreeInstance,
        /const form = \{ \.\.\.treeBaselineDefaults \};/
    );
    assert.doesNotMatch( treeHtml, /canopy-gust|gust-candidate/i );
    assert.doesNotMatch( compositionHtml, /canopy-gust|gust-candidate/i );
    assert.deepEqual(
        rangeContract( treeHtml, 'gust-interval-base' ),
        { min: '0', max: '13', step: '1', value: '0' }
    );
    assert.match(
        treeHtml,
        /for="gust-interval-base"><span>Gust interval base<\/span><output id="gust-interval-base-value">0–15 s<\/output>/
    );
    assert.match(
        treeMain,
        /gustIntervalBase: 0,[\s\S]*?bindRange\(\s*'gust-interval-base',\s*'gustIntervalBase',[\s\S]*?base \+ 15 \+ base \/ 13/
    );
    assert.match(
        treeMain,
        /gustIntervalBase: 'gust-interval-base'/
    );
    assert.deepEqual(
        rangeContract( compositionHtml, 'tree-gust-interval-base' ),
        rangeContract( treeHtml, 'gust-interval-base' )
    );
    assert.match(
        compositionHtml,
        /for="tree-gust-interval-base"><span>Gust interval base<\/span><output id="tree-gust-interval-base-value">0–15 s<\/output>/
    );
    assert.match(
        compositionMain,
        /'tree-gust-interval-base': \{[\s\S]*?property: 'gustIntervalBase',[\s\S]*?base \+ 15 \+ base \/ 13/
    );
    assert.match(
        compositionMain,
        /tree\.resetForm\(\)[\s\S]*?treeBaselineDefaults\[descriptor\.property\][\s\S]*?displayTreeControlValue/
    );
    assert.doesNotMatch(
        compositionTreeInstance,
        /const layoutProperties = new Set\( \[[\s\S]*?'gustIntervalBase'/
    );
} );

test( 'every Universe and Cosmos baseline slider is retained unchanged', () => {
    const baselineIds = Array.from( pitHtml.matchAll(
        /<input\s+id="([uc]-[^"]+)"[^>]*\btype="range"[^>]*>/g
    ), ( match ) => match[1] );
    assert.ok( baselineIds.length > 20 );
    for ( const id of baselineIds )
    {
        assert.deepEqual(
            rangeContract( compositionHtml, id ),
            rangeContract( pitHtml, id ),
            `${id} must retain the Casting Pit baseline contract`
        );
    }
} );

test( 'the first planting block exposes all five bounded inspection modes', () => {
    for ( const mode of [
        'pit',
        'tree',
        'universe-tree',
        'cosmos-tree',
        'complete'
    ] )
    {
        assert.match( compositionHtml,
            new RegExp( `data-layer-mode="${mode}"` ) );
        assert.match( compositionMain,
            new RegExp( `'${mode}'|\\b${mode}:` ) );
    }
    assert.match( compositionMain, /universe\.setVisible\( mode\.universe \)/ );
    assert.match( compositionMain, /cosmos\.setVisible\( mode\.cosmos \)/ );
    assert.match( compositionMain, /tree\.setVisible\( mode\.tree \)/ );
} );

test( 'the rejected composition-bound P5 experiment is absent', () => {
    const rejectedModule = new URL(
        '../../src/category-tree/composition/dark-matter-sea.js',
        import.meta.url
    );
    assert.equal( existsSync( rejectedModule ), false );
    assert.doesNotMatch(
        compositionMain,
        /darkMatterSea|dark-matter-sea|mode\.substrate/
    );
    assert.doesNotMatch(
        compositionHtml,
        /id="dark-matter-|data-view="substrate"/
    );
    for ( const rejectedMode of [
        'substrate',
        'terrain-substrate',
        'tree-substrate',
        'complete-baseline'
    ] )
    {
        assert.doesNotMatch(
            compositionHtml,
            new RegExp( `data-layer-mode="${rejectedMode}"` )
        );
    }
} );

test( 'the Casting Pit render delegate preserves its old default and enables D4', () => {
    assert.match( worldSource,
        /stencil:\s*options\.stencil\s*\?\?\s*false/ );
    assert.match( worldSource,
        /if \( renderFrame \) renderFrame\( time \);\s*else renderer\.render\( scene, camera \);/ );
    assert.match( worldSource, /start\( render = null \)/ );
    assert.match( compositionMain,
        /background:\s*0x050607,\s*stencil:\s*true/ );
} );

test( 'the detached membrane preserves D4 terrain ownership without basin presentation', () => {
    assert.match( compositionMain,
        /createSluiceGateLayer\([\s\S]*?includeEnvironment:\s*false/ );
    assert.match( compositionMain,
        /world\.scene\.add\([\s\S]*?universe\.environment\.diagnostic,[\s\S]*?hemisphereLight,[\s\S]*?keyLight,[\s\S]*?rimLight/ );
    assert.match( compositionMain,
        /externalOccluders:\s*\[\s*universe\.environment\.membraneSurface/ );
    assert.doesNotMatch( compositionMain,
        /membraneSurface\.visible|terrainApron\.visible|receiver\.visible|mode\.terrain/ );
    assert.match( compositionTreeInstance,
        /externalOccluders\s*=\s*\[\]/ );
    assert.match( compositionTreeInstance,
        /createTrunkVisibilityRenderer\([\s\S]*?\{\s*externalOccluders\s*\}/ );
    const membraneDiagnostic = inputTag( compositionHtml, 'u-diagnostic' );
    assert.doesNotMatch( membraneDiagnostic, /\bchecked\b/ );
} );

test( 'the P2 planting envelope is live, inspectable and off by default', () => {
    const diagnostic = inputTag( compositionHtml, 'tree-planting-envelope' );
    assert.match( diagnostic, /\btype="checkbox"/ );
    assert.doesNotMatch( diagnostic, /\bchecked\b/ );
    assert.match( compositionHtml, /data-view="contact"/ );
    assert.match( compositionHtml, /data-view="subterrain"/ );
    assert.match( compositionHtml, /id="tree-contact-state"/ );
    assert.match( compositionHtml, /id="tree-contact-relief"/ );
    assert.match( compositionTreeInstance,
        /createPlantingEnvelope\(\s*\{\s*scene,\s*membrane\s*\}\s*\)/ );
    assert.match( compositionTreeInstance,
        /refreshPlantingEnvelope\(\s*true\s*\)/ );
    assert.match( compositionMain,
        /setPlantingEnvelopeDiagnosticVisible/ );
} );

test( 'the physical root prototype is inspectable and off by default', () => {
    const diagnostic = inputTag( compositionHtml, 'tree-root-guides' );
    assert.match( diagnostic, /\btype="checkbox"/ );
    assert.doesNotMatch( diagnostic, /\bchecked\b/ );
    assert.match( compositionHtml, /id="tree-root-system"/ );
    assert.match( compositionHtml, /id="tree-root-containment"/ );
    assert.match( compositionTreeInstance,
        /createCompositionRootSystem\(\s*\{/ );
    assert.match( compositionMain, /setPhysicalRootDiagnosticVisible/ );
} );

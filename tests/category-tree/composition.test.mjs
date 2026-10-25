import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
    resolvePlantingTransform,
    treeBaselineDefaults,
    treePlacementDefaults
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

test( 'the composition plants the unchanged local root at the Gaussian centre', () => {
    assert.deepEqual( treePlacementDefaults, {
        scale: 1,
        embedDepth: 0,
        rotationDegrees: 0
    } );
    const baseline = resolvePlantingTransform( -5.5 );
    assert.deepEqual( baseline.position, [ 0, -5.5, 0 ] );
    assert.equal( baseline.scale, 1 );
    assert.equal( baseline.rotationY, 0 );

    const embedded = resolvePlantingTransform( -5.5, {
        scale: 0.8,
        embedDepth: 1.25,
        rotationDegrees: 180
    } );
    assert.deepEqual( embedded.position, [ 0, -6.75, 0 ] );
    assert.equal( embedded.scale, 0.8 );
    assert.ok( Math.abs( embedded.rotationY - Math.PI ) < 1e-12 );
    assert.throws(
        () => resolvePlantingTransform( -5.5, { scale: 0 } ),
        /scale must be positive/
    );
    assert.throws(
        () => resolvePlantingTransform( -5.5, { embedDepth: -0.1 } ),
        /embed depth must be non-negative/
    );
} );

test( 'the composition carries the committed Tree baseline without importing its app', () => {
    assert.equal( treeBaselineDefaults.packetFrequency, 1 );
    assert.equal( treeBaselineDefaults.packetSpeed, 1.55 );
    assert.equal( treeBaselineDefaults.growthTiers, 3 );
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

test( 'every Tree baseline slider is retained with the same range and default', () => {
    const mappings = {
        'crown-spread': 'tree-crown-spread',
        'vertical-rise': 'tree-vertical-rise',
        asymmetry: 'tree-asymmetry',
        'conduit-weight': 'tree-conduit-weight',
        'wind-sweep': 'tree-wind-sweep',
        'surface-relief': 'tree-surface-relief',
        'structural-response': 'tree-structural-response',
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

test( 'the Casting Pit render delegate preserves its old default and enables D4', () => {
    assert.match( worldSource,
        /stencil:\s*options\.stencil\s*\?\?\s*false/ );
    assert.match( worldSource,
        /if \( renderFrame \) renderFrame\( time \);\s*else renderer\.render\( scene, camera \);/ );
    assert.match( worldSource, /start\( render = null \)/ );
    assert.match( compositionMain,
        /background:\s*0x050607,\s*stencil:\s*true/ );
} );

test( 'the composition gives terrain ownership over subsurface Tree overlays', () => {
    assert.match( compositionMain,
        /externalOccluders:\s*\[\s*universe\.environment\.membraneSurface\s*\]/ );
    assert.match( compositionTreeInstance,
        /externalOccluders\s*=\s*\[\]/ );
    assert.match( compositionTreeInstance,
        /createTrunkVisibilityRenderer\([\s\S]*?\{\s*externalOccluders\s*\}/ );
} );

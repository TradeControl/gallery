import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const endpointMainUrl = new URL(
    '../../src/category-tree/tree/main.js',
    import.meta.url
);
const compositionTreeUrl = new URL(
    '../../src/category-tree/composition/tree-instance.js',
    import.meta.url
);
const libraryRootUrl = new URL( '../../src/lib/tree/', import.meta.url );
const endpointRootUrl = new URL(
    '../../src/category-tree/tree/',
    import.meta.url
);

const engineModules = Object.freeze( [
    'hierarchy.js',
    'layout.js',
    'growth-cycle.js',
    'tree-layer.js',
    'engineered-tree-layer.js',
    'organic-tree-layer.js',
    'trunk-rune-layer.js',
    'trunk-visibility-renderer.js',
    'internal-router-tree.js',
    'internal-router-junction.js',
    'internal-router-junction-form.js',
    'internal-router-transport.js'
] );

test( 'the standalone Tree and composition consume one public Tree library', () => {
    const endpointMain = readFileSync( endpointMainUrl, 'utf8' );
    const compositionTree = readFileSync( compositionTreeUrl, 'utf8' );

    assert.match( endpointMain, /from '\.\.\/\.\.\/lib\/tree\/index\.js'/ );
    assert.match( compositionTree, /from '\.\.\/\.\.\/lib\/tree\/index\.js'/ );
    assert.doesNotMatch( endpointMain, /from '\.\/(?:hierarchy|layout|tree-layer)/ );
    assert.doesNotMatch( compositionTree, /from '\.\.\/tree\// );
} );

test( 'Tree engine modules live only under src/lib/tree', () => {
    for ( const moduleName of engineModules )
    {
        assert.equal(
            existsSync( new URL( moduleName, libraryRootUrl ) ),
            true,
            `${moduleName} should be owned by the Tree library`
        );
        assert.equal(
            existsSync( new URL( moduleName, endpointRootUrl ) ),
            false,
            `${moduleName} should not remain owned by the standalone endpoint`
        );
    }
} );

test( 'the Tree library stays independent of pages and the composition', () => {
    for ( const moduleName of engineModules )
    {
        const source = readFileSync( new URL( moduleName, libraryRootUrl ), 'utf8' );
        assert.doesNotMatch( source, /\bdocument\.|\bwindow\./, moduleName );
        assert.doesNotMatch( source, /category-tree\/composition/, moduleName );
    }
} );

test( 'the public Tree surface exposes the shared construction seams', async () => {
    const treeLibrary = await import( '../../src/lib/tree/index.js' );
    for ( const exportName of [
        'createHierarchy',
        'createUnfoldingLayout',
        'createTreeLayer',
        'createEngineeredTreeLayer',
        'createGrowthCycle',
        'createTrunkVisibilityRenderer'
    ] )
    {
        assert.equal( typeof treeLibrary[exportName], 'function', exportName );
    }
} );

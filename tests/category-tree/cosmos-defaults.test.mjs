import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { cosmicCircuitryDefaults } from '../../src/lib/casting-pit/index.js';

const informationHtml = readFileSync(
    new URL(
        '../../src/category-tree/casting-pit/information-layer/index.html',
        import.meta.url
    ),
    'utf8'
);
const informationMain = readFileSync(
    new URL(
        '../../src/category-tree/casting-pit/information-layer/main.js',
        import.meta.url
    ),
    'utf8'
);
const informationStyle = readFileSync(
    new URL(
        '../../src/category-tree/casting-pit/information-layer/style.css',
        import.meta.url
    ),
    'utf8'
);
const overlayHtml = readFileSync(
    new URL(
        '../../src/category-tree/casting-pit/universe-cosmos/index.html',
        import.meta.url
    ),
    'utf8'
);
const overlayMain = readFileSync(
    new URL(
        '../../src/category-tree/casting-pit/universe-cosmos/main.js',
        import.meta.url
    ),
    'utf8'
);
const compositionHtml = readFileSync(
    new URL( '../../src/category-tree/composition/index.html', import.meta.url ),
    'utf8'
);
const compositionMain = readFileSync(
    new URL( '../../src/category-tree/composition/main.js', import.meta.url ),
    'utf8'
);
const cosmosSource = readFileSync(
    new URL(
        '../../src/lib/casting-pit/cosmos/cosmic-circuitry-layer.js',
        import.meta.url
    ),
    'utf8'
);

const reviewDefaults = {
    intensity: 0.2,
    arterialConnectivity: 1,
    districtDensity: 0.6,
    intricacy: 7,
    districtFootprint: 1.87,
    territoryX: 0,
    territoryZ: 4,
    surfaceBinding: 1,
    signalDensity: 136,
    signalSpeed: 3.75,
    signalBrightness: 0.25
};

const controlIds = {
    intensity: 'intensity',
    arterialConnectivity: 'arterial-connectivity',
    districtDensity: 'district-density',
    intricacy: 'intricacy',
    districtFootprint: 'district-footprint',
    territoryX: 'territory-x',
    territoryZ: 'territory-z',
    surfaceBinding: 'surface-binding',
    signalDensity: 'signal-density',
    signalSpeed: 'signal-speed',
    signalBrightness: 'signal-brightness'
};

function escapePattern( value )
{
    return value.replace( /[-/\\^$*+?.()|[\]{}]/g, '\\$&' );
}

function inputContract( html, id )
{
    const escaped = escapePattern( id );
    const tag = html.match( new RegExp( `<input\\s+id="${escaped}"[^>]*>` ) )?.[0];
    assert.ok( tag, `missing input #${id}` );
    const attributes = Object.fromEntries( [ 'min', 'max', 'step', 'value' ].map(
        ( attribute ) => [
            attribute,
            Number( tag.match( new RegExp( `\\b${attribute}="([^"]+)"` ) )?.[1] )
        ]
    ) );
    for ( const [ attribute, value ] of Object.entries( attributes ) )
    {
        assert.ok( Number.isFinite( value ), `${id} has no numeric ${attribute}` );
    }
    return attributes;
}

function outputValue( html, id )
{
    const escaped = escapePattern( id );
    const value = html.match(
        new RegExp( `<output\\s+id="${escaped}-value">([^<]+)</output>` )
    )?.[1];
    assert.notEqual( value, undefined, `missing output #${id}-value` );
    return Number( value );
}

test( 'the shared Cosmos defaults carry the subdued clean-line review settings', () => {
    for ( const [ property, expected ] of Object.entries( reviewDefaults ) )
    {
        assert.equal( cosmicCircuitryDefaults[property], expected, property );
    }
} );

test( 'every active Cosmos surface opens on the same review settings', () => {
    const surfaces = [
        [ 'information layer', informationHtml, '' ],
        [ 'Universe/Cosmos', overlayHtml, 'c-' ],
        [ 'composition', compositionHtml, 'c-' ]
    ];

    for ( const [ surface, html, prefix ] of surfaces )
    {
        for ( const [ property, controlId ] of Object.entries( controlIds ) )
        {
            const id = `${prefix}${controlId}`;
            const contract = inputContract( html, id );
            const expected = reviewDefaults[property];
            assert.equal( contract.value, expected, `${surface} #${id}` );
            assert.equal( outputValue( html, id ), expected, `${surface} #${id}-value` );
            assert.ok( expected >= contract.min && expected <= contract.max );
            const offset = ( expected - contract.min ) / contract.step;
            assert.ok(
                Math.abs( offset - Math.round( offset ) ) < 1e-9,
                `${surface} #${id} default must align with its step`
            );
        }
    }
} );

test( 'the rejected jagged-ribbon presentation is absent', () => {
    assert.doesNotMatch(
        informationHtml,
        /P6-A|selective mineral disclosure|data-presentation-mode|Material study/i
    );
    assert.doesNotMatch(
        informationMain,
        /setPresentationMode|presentationNames|data-presentation-mode/
    );
    assert.doesNotMatch(
        informationStyle,
        /presentation-switch|presentation-readout|button\.active/
    );
    assert.doesNotMatch(
        cosmosSource,
        /presentationMode|setPresentationMode|getPresentationMode|materialGrooveMaterial|materialEmberMaterial|presentationColorAttributes/
    );
} );

test( 'standalone and combined studies still consume the one shared Cosmos factory', () => {
    for ( const consumer of [ informationMain, overlayMain, compositionMain ] )
    {
        assert.match( consumer, /createCosmicCircuitryLayer/ );
        assert.doesNotMatch(
            consumer,
            /Mesh(?:Basic|Standard)Material|LineBasicMaterial|PointsMaterial/
        );
    }
    assert.match(
        compositionMain,
        /createCosmicCircuitryLayer\s*\([\s\S]*?includeEnvironment:\s*false/
    );
} );

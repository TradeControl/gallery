import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
    createForgeSourceLayer,
    forgeSourceDefaults,
    forgeSourceModes,
    forgeSourceRanges
} from '../../src/lib/casting-pit/index.js';

const sourceLayout = Object.freeze( {
    sources: Object.freeze( [
        Object.freeze( {
            sourceIndex: 0,
            id: 'feed-1',
            label: 'Feed 1',
            position: Object.freeze( [ 10, 0 ] ),
            direction: Object.freeze( [ -1, 0 ] )
        } ),
        Object.freeze( {
            sourceIndex: 1,
            id: 'feed-2',
            label: 'Feed 2',
            position: Object.freeze( [ -8, 4 ] ),
            direction: Object.freeze( [ 0.8, -0.6 ] )
        } )
    ] )
} );

function createFixture( overrides = {} )
{
    const forge = createForgeSourceLayer( {
        parameters: overrides,
        maxSources: 3
    } );
    forge.setSourceLayout( sourceLayout );
    return forge;
}

test( 'forge defaults expose only bounded stream-origin heat controls', () => {
    assert.ok( Object.isFrozen( forgeSourceDefaults ) );
    assert.ok( Object.isFrozen( forgeSourceRanges ) );
    assert.deepEqual( forgeSourceModes, [ 'off', 'selected', 'all' ] );
    assert.deepEqual( Object.keys( forgeSourceRanges ), [
        'heatIntensity',
        'heatReach',
        'settlingTime'
    ] );
    for ( const [ property, range ] of Object.entries( forgeSourceRanges ) )
    {
        assert.ok( Object.isFrozen( range ) );
        assert.ok(
            forgeSourceDefaults[property] >= range.min
                && forgeSourceDefaults[property] <= range.max
        );
    }
} );

test( 'the forge publishes immutable field contributions and owns no render object', () => {
    const forge = createFixture();
    const field = forge.getFieldState();
    const snapshot = forge.getSnapshot();
    assert.ok( Object.isFrozen( field ) );
    assert.ok( Object.isFrozen( field.sources ) );
    assert.equal( field.sources.length, 2 );
    assert.deepEqual( field.sources[0].position, [ 10, 0 ] );
    assert.deepEqual( field.sources[0].direction, [ -1, 0 ] );
    assert.equal( field.sources[0].manifested, true );
    assert.equal( snapshot.renderMeshCount, 0 );
    assert.deepEqual( snapshot.geometryUuids, [] );
    assert.deepEqual( snapshot.materialUuids, [] );
    assert.equal( snapshot.visualMassCreated, 0 );
    assert.equal( snapshot.ownsAnimationLoop, false );
    assert.equal( snapshot.fixedSourceCapacity, 3 );
    assert.equal( 'group' in forge, false );
    assert.equal( 'lakeRimMesh' in forge, false );
    assert.equal( 'lakeSurfaceMesh' in forge, false );
    assert.equal( 'pumpThroatMesh' in forge, false );
    forge.dispose();
} );

test( 'source pressure exists only after its exact feed accepts an emission', () => {
    const forge = createFixture();
    forge.update( 0 );
    for ( let time = 100; time <= 500; time += 100 ) forge.update( time );
    assert.equal( forge.getSnapshot().activeSourceCount, 0 );
    assert.equal( forge.getFieldState().sources[0].pressure, 0 );

    assert.equal( forge.consumeEmission( {
        sourceIndex: 0,
        sequence: 7,
        temperature: 0.9,
        mass: 1
    } ), true );
    const active = forge.getFieldState();
    assert.ok( active.sources[0].pressure > 0 );
    assert.equal( active.sources[1].pressure, 0 );
    assert.equal( forge.getSnapshot().activeSourceCount, 1 );
    assert.equal( forge.getSnapshot().manifestedEmissionCount, 1 );

    for ( let time = 600; time <= 1800; time += 100 ) forge.update( time );
    assert.equal( forge.getSnapshot().activeSourceCount, 0 );
    assert.equal( forge.getSnapshot().maximumPressure, 0 );
    forge.dispose();
} );

test( 'all, selected and off modes filter field contributions without replay', () => {
    const forge = createFixture();
    const secondEvent = { sourceIndex: 1, sequence: 1, temperature: 1 };
    assert.equal( forge.consumeEmission( secondEvent ), true );
    forge.setMode( 'selected' );
    assert.equal( forge.getSnapshot().manifestedSourceCount, 1 );
    assert.equal( forge.getSnapshot().activeSourceCount, 0 );
    assert.equal( forge.getFieldState().sources[1].manifested, false );
    assert.equal( forge.consumeEmission( secondEvent ), false );
    forge.setSelectedSourceIndex( 1 );
    assert.equal( forge.getFieldState().sources[1].manifested, true );
    assert.equal( forge.consumeEmission( { ...secondEvent, sequence: 2 } ), true );
    forge.setMode( 'off' );
    assert.ok( forge.getFieldState().sources.every(
        ( source ) => source.manifested === false
    ) );
    forge.setMode( 'all' );
    assert.equal( forge.getSnapshot().activeSourceCount, 0 );
    assert.equal( forge.getSnapshot().manifestedEmissionCount, 2 );
    forge.dispose();
} );

test( 'repeated emissions remain bounded without allocating render resources', () => {
    const forge = createFixture();
    for ( let sequence = 0; sequence < 100; sequence += 1 )
    {
        forge.consumeEmission( {
            sourceIndex: sequence % 2,
            sequence,
            temperature: 1
        } );
    }
    const snapshot = forge.getSnapshot();
    assert.equal( snapshot.activeSourceCount, 2 );
    assert.equal( snapshot.maximumPressure, 1 );
    assert.equal( snapshot.acceptedEmissionCount, 100 );
    assert.equal( snapshot.renderMeshCount, 0 );
    assert.deepEqual( snapshot.geometryUuids, [] );
    assert.deepEqual( snapshot.materialUuids, [] );
    forge.clearActivity();
    assert.equal( forge.getSnapshot().acceptedEmissionCount, 0 );
    assert.equal( forge.getSnapshot().maximumPressure, 0 );
    forge.dispose();
} );

test( 'the field-state engine contains no bulb, shield, texture, DOM, light, timer or loop', () => {
    const source = readFileSync(
        new URL(
            '../../src/lib/casting-pit/universe/forge-source-layer.js',
            import.meta.url
        ),
        'utf8'
    );
    assert.doesNotMatch(
        source,
        /TorusGeometry|CylinderGeometry|ShaderMaterial|MeshStandardMaterial|InstancedMesh/
    );
    assert.doesNotMatch(
        source,
        /document|querySelector|TextureLoader|DataTexture|setTimeout|setInterval|setAnimationLoop|requestAnimationFrame|new THREE\..*Light/
    );
    assert.match( source, /renderMeshCount:\s*0/ );
    assert.match( source, /visualMassCreated:\s*0/ );
} );

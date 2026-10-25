import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as THREE from 'three';
import {
    createEnergeticSeaLayer,
    energeticSeaDefaults,
    energeticSeaRanges
} from '../../src/lib/substrate/index.js';

function createFixture( options = {} )
{
    const scene = new THREE.Scene();
    const sea = createEnergeticSeaLayer( {
        scene,
        extent: 30,
        segments: 12,
        ...options
    } );
    return { scene, sea };
}

function assertNear( actual, expected, tolerance = 1e-10 )
{
    assert.ok(
        Math.abs( actual - expected ) <= tolerance,
        `${actual} must be within ${tolerance} of ${expected}`
    );
}

test( 'energetic sea defaults and ranges are frozen bounded studies', () => {
    assert.ok( Object.isFrozen( energeticSeaDefaults ) );
    assert.ok( Object.isFrozen( energeticSeaRanges ) );
    assert.deepEqual(
        Object.keys( energeticSeaDefaults ),
        Object.keys( energeticSeaRanges )
    );
    for ( const [ property, value ] of Object.entries( energeticSeaDefaults ) )
    {
        const range = energeticSeaRanges[property];
        assert.ok( Object.isFrozen( range ) );
        assert.ok( value >= range.min && value <= range.max );
        const step = ( value - range.min ) / range.step;
        assert.ok( Math.abs( step - Math.round( step ) ) < 1e-9 );
    }
} );

test( 'the public engine builds one fixed opaque textureless surface', () => {
    const fixture = createFixture();
    const { sea } = fixture;
    const snapshot = sea.getSnapshot();
    assert.equal( fixture.scene.children.includes( sea.mesh ), true );
    assert.equal( snapshot.vertexCount, 13 * 13 );
    assert.equal( snapshot.triangleCount, 12 * 12 * 2 );
    assert.equal( snapshot.textureInputCount, 0 );
    assert.equal( snapshot.geometricBandCount, 2 );
    assert.equal( snapshot.opticalBandCount, 3 );
    assert.equal( snapshot.packetCount, 2 );
    assert.ok( sea.mesh.material.isMeshStandardMaterial );
    assert.equal( sea.mesh.material.transparent, false );
    assert.equal( sea.mesh.material.depthTest, true );
    assert.equal( sea.mesh.material.depthWrite, true );
    for ( const property of [
        'map',
        'alphaMap',
        'bumpMap',
        'displacementMap',
        'emissiveMap',
        'envMap',
        'metalnessMap',
        'normalMap',
        'roughnessMap'
    ] )
    {
        assert.equal( sea.mesh.material[property], null );
    }
    sea.dispose();
} );

test( 'the shader contains real multi-band geometry and optical compression', () => {
    const fixture = createFixture();
    const shader = {
        uniforms: {},
        vertexShader: [
            '#include <common>',
            '#include <beginnormal_vertex>',
            '#include <begin_vertex>'
        ].join( '\n' ),
        fragmentShader: [
            '#include <common>',
            '#include <color_fragment>',
            '#include <roughnessmap_fragment>',
            '#include <normal_fragment_maps>',
            '#include <lights_fragment_end>'
        ].join( '\n' )
    };
    fixture.sea.mesh.material.onBeforeCompile( shader );
    assert.match( shader.vertexShader, /substratePacketEnergy/ );
    assert.match( shader.vertexShader, /substrateCrestWave/ );
    assert.match( shader.vertexShader, /firstSwell/ );
    assert.match( shader.vertexShader, /firstFold/ );
    assert.match( shader.vertexShader, /substrateLaplacian/ );
    assert.match( shader.fragmentShader, /substrateFinePressure/ );
    assert.match( shader.fragmentShader, /fwidth/ );
    assert.match( shader.fragmentShader, /vSubstrateCompression/ );
    assert.match(
        shader.fragmentShader,
        /reflectedLight\.indirectSpecular\s*\+=/
    );
    const source = readFileSync(
        new URL(
            '../../src/lib/substrate/energetic-sea-layer.js',
            import.meta.url
        ),
        'utf8'
    );
    assert.doesNotMatch(
        source,
        /TextureLoader|DataTexture|sampler(?:2D|Cube)|texture2D\s*\(/
    );
    fixture.sea.dispose();
} );

test( 'parameter endpoints update uniforms without replacing resources', () => {
    const fixture = createFixture();
    const { sea } = fixture;
    const geometry = sea.mesh.geometry;
    const material = sea.mesh.material;
    const shader = {
        uniforms: {},
        vertexShader: '#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>',
        fragmentShader: '#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <normal_fragment_maps>\n#include <lights_fragment_end>'
    };
    material.onBeforeCompile( shader );
    for ( const [ property, range ] of Object.entries( energeticSeaRanges ) )
    {
        assert.equal( sea.setParameter( property, range.min ), range.min );
        assert.equal( sea.setParameter( property, range.max ), range.max );
    }
    assert.equal( sea.mesh.geometry, geometry );
    assert.equal( sea.mesh.material, material );
    assert.equal(
        shader.uniforms.substrateSwellHeight.value,
        energeticSeaRanges.swellHeight.max
    );
    assert.equal(
        shader.uniforms.substrateEnergy.value,
        energeticSeaRanges.energy.max
    );
    assert.equal(
        shader.uniforms.substrateCrestTension.value,
        energeticSeaRanges.crestTension.max
    );
    assert.equal(
        shader.uniforms.substrateCrossCurrent.value,
        energeticSeaRanges.crossCurrent.max
    );
    assert.equal(
        shader.uniforms.substrateFineActivity.value,
        energeticSeaRanges.fineActivity.max
    );
    assert.equal(
        shader.uniforms.substrateReflection.value,
        energeticSeaRanges.reflection.max
    );
    assert.throws(
        () => sea.setParameter( 'energy', 2.01 ),
        /must be between/
    );
    assert.throws(
        () => sea.setParameter( 'unknown', 1 ),
        /Unknown energetic sea parameter/
    );
    sea.dispose();
} );

test( 'motion is deterministic, bounded and can freeze without phase jumps', () => {
    const fixture = createFixture();
    const { sea } = fixture;
    sea.update( 0 );
    for ( let index = 1; index <= 20; index += 1 )
    {
        sea.update( index * 50 );
    }
    assertNear( sea.getPhase(), 1.76 );
    sea.setFrozen( true );
    const frozenPhase = sea.getPhase();
    sea.update( 5000 );
    assert.equal( sea.getPhase(), frozenPhase );
    sea.setFrozen( false );
    sea.update( 5050 );
    assertNear(
        sea.getPhase(),
        frozenPhase + 0.05 * energeticSeaDefaults.currentSpeed * 1.6
    );
    sea.reset();
    assert.equal( sea.getPhase(), 0 );
    assert.equal( sea.getSnapshot().frozen, false );
    assert.throws( () => sea.update( Number.NaN ), /must be finite/ );
    assert.throws( () => sea.update( -1 ), /cannot be negative/ );
    sea.dispose();
} );

test( 'visibility and disposal remain layer-local and idempotent', () => {
    const fixture = createFixture();
    const retained = new THREE.Group();
    fixture.scene.add( retained );
    assert.equal( fixture.sea.setVisible( false ), false );
    assert.equal( fixture.sea.mesh.visible, false );
    assert.equal( fixture.sea.getSnapshot().status, 'hidden' );
    fixture.sea.dispose();
    fixture.sea.dispose();
    assert.ok( fixture.scene.children.includes( retained ) );
    assert.ok( !fixture.scene.children.includes( fixture.sea.mesh ) );
} );

test( 'the library is disconnected from page and composition ownership', () => {
    const source = readFileSync(
        new URL(
            '../../src/lib/substrate/energetic-sea-layer.js',
            import.meta.url
        ),
        'utf8'
    );
    assert.doesNotMatch(
        source,
        /document\.|window\.|querySelector|WebGLRenderer|OrbitControls/
    );
    assert.doesNotMatch(
        source,
        /plantingEnvelope|membrane|gravity|root system|composition/i
    );
    assert.equal( Array.from( source.matchAll( /setAnimationLoop/g ) ).length, 0 );
} );

test( 'the standalone endpoint is a thin owner of controls and one loop', () => {
    const html = readFileSync(
        new URL(
            '../../src/category-tree/substrate/index.html',
            import.meta.url
        ),
        'utf8'
    );
    const main = readFileSync(
        new URL(
            '../../src/category-tree/substrate/main.js',
            import.meta.url
        ),
        'utf8'
    );
    assert.match( html, /id="scene"/ );
    assert.match( html, /aria-label="Energetic substrate controls"/ );
    assert.match( html, /id="reset"/ );
    assert.match( html, /src="\.\/main\.js"/ );
    const idByProperty = {
        swellHeight: 'swell-height',
        energy: 'energy',
        crestTension: 'crest-tension',
        crossCurrent: 'cross-current',
        fineActivity: 'fine-activity',
        currentSpeed: 'current-speed',
        reflection: 'reflection'
    };
    for ( const [ property, id ] of Object.entries( idByProperty ) )
    {
        const input = html.match(
            new RegExp( `<input id="${id}"[^>]+>` )
        )?.[0];
        assert.ok( input, `${id} input must exist` );
        const attribute = ( name ) => Number(
            input.match( new RegExp( `${name}="([^"]+)"` ) )?.[1]
        );
        assert.equal( attribute( 'min' ), energeticSeaRanges[property].min );
        assert.equal( attribute( 'max' ), energeticSeaRanges[property].max );
        assert.equal( attribute( 'step' ), energeticSeaRanges[property].step );
        assert.equal( attribute( 'value' ), energeticSeaDefaults[property] );
        assert.match( html, new RegExp( `id="${id}-value"` ) );
    }
    assert.match( main, /from '\.\.\/\.\.\/lib\/substrate\/index\.js'/ );
    assert.doesNotMatch( main, /composition|plantingEnvelope|membrane|gravity/i );
    assert.equal( Array.from( main.matchAll( /setAnimationLoop/g ) ).length, 1 );
    assert.ok( main.indexOf( 'sea.update( time )' ) < main.indexOf( 'renderer.render' ) );
    assert.match( main, /window\.addEventListener\( 'resize'/ );
} );

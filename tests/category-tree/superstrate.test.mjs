import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as THREE from 'three';
import {
    createEmergentSuperstrateLayer,
    evaluateSuperstrateBreath,
    superstrateDefaults,
    superstrateFieldViews,
    superstrateMagnetDefinitions,
    superstrateRanges,
    superstrateSourceDefinitions
} from '../../src/lib/superstrate/index.js';

const librarySource = readFileSync(
    new URL(
        '../../src/lib/superstrate/emergent-field-layer.js',
        import.meta.url
    ),
    'utf8'
);

function createFixture( options = {} )
{
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera( 50, 1, 0.1, 100 );
    const superstrate = createEmergentSuperstrateLayer( {
        scene,
        observer: camera,
        radius: 30,
        widthSegments: 12,
        heightSegments: 8,
        ...options
    } );
    return { scene, camera, superstrate };
}

function assertNear( actual, expected, tolerance = 1e-10 )
{
    assert.ok(
        Math.abs( actual - expected ) <= tolerance,
        `${actual} must be within ${tolerance} of ${expected}`
    );
}

test( 'superstrate publishes four localized sources and five field views', () => {
    assert.ok( Object.isFrozen( superstrateDefaults ) );
    assert.ok( Object.isFrozen( superstrateRanges ) );
    assert.ok( Object.isFrozen( superstrateMagnetDefinitions ) );
    assert.deepEqual(
        Object.keys( superstrateDefaults ),
        Object.keys( superstrateRanges )
    );
    for ( const [ property, value ] of Object.entries( superstrateDefaults ) )
    {
        const range = superstrateRanges[property];
        assert.ok( Object.isFrozen( range ) );
        assert.ok( value >= range.min && value <= range.max );
        const step = ( value - range.min ) / range.step;
        assert.ok( Math.abs( step - Math.round( step ) ) < 1e-9 );
    }
    assert.deepEqual(
        Object.keys( superstrateMagnetDefinitions ),
        [ 'substrate', 'physical', 'information', 'living' ]
    );
    for ( const definition of Object.values( superstrateMagnetDefinitions ) )
    {
        assert.ok( Object.isFrozen( definition ) );
        assert.ok( definition.parameter in superstrateDefaults );
        assert.match( definition.parameter, /Magnet$/ );
    }
    assert.ok( Object.isFrozen( superstrateSourceDefinitions ) );
    assert.deepEqual(
        Object.keys( superstrateSourceDefinitions ),
        [ 'substrate', 'physical', 'information', 'living' ]
    );
    const directions = [];
    const rates = [];
    for ( const definition of Object.values( superstrateSourceDefinitions ) )
    {
        assert.ok( Object.isFrozen( definition ) );
        assert.ok( Object.isFrozen( definition.direction ) );
        assertNear(
            Math.hypot( ...definition.direction ),
            1,
            0.02
        );
        assert.ok( definition.angularRadius >= 0.18 );
        assert.ok( definition.angularRadius <= 1.45 );
        directions.push( definition.direction.join( ',' ) );
        rates.push( definition.phaseRate );
    }
    assert.equal( new Set( directions ).size, 4 );
    assert.equal( new Set( rates ).size, 4 );
    assert.ok( Object.isFrozen( superstrateFieldViews ) );
    assert.deepEqual( superstrateFieldViews, {
        complete: 0,
        substrate: 1,
        physical: 2,
        information: 3,
        living: 4,
        confluence: 5
    } );
} );

test( 'the public engine builds one fixed observer-relative textureless shell', () => {
    const fixture = createFixture();
    const { superstrate } = fixture;
    const snapshot = superstrate.getSnapshot();
    assert.ok( fixture.scene.children.includes( superstrate.mesh ) );
    assert.ok( superstrate.mesh.material.isShaderMaterial );
    assert.equal( superstrate.mesh.material.side, THREE.BackSide );
    assert.equal( superstrate.mesh.material.depthTest, false );
    assert.equal( superstrate.mesh.material.depthWrite, false );
    assert.equal( superstrate.mesh.material.transparent, false );
    assert.equal( superstrate.mesh.frustumCulled, false );
    assert.equal( superstrate.mesh.renderOrder, -1000 );
    assert.equal( snapshot.drawCallCount, 1 );
    assert.equal( snapshot.textureInputCount, 0 );
    assert.equal( snapshot.astronomicalObjectCount, 0 );
    assert.equal( snapshot.starCount, 0 );
    assert.equal( snapshot.lightCount, 0 );
    assert.equal( snapshot.fieldLayerCount, 5 );
    assert.equal( snapshot.sourceFieldCount, 4 );
    assert.equal( snapshot.confluenceFieldCount, 1 );
    assert.equal( snapshot.noiseBandCount, 4 );
    assert.equal( snapshot.pulseBandCount, 4 );
    assert.equal( snapshot.magnetCount, 4 );
    assert.equal( snapshot.observerRelative, true );
    assert.equal(
        snapshot.parallaxModel,
        'camera-centred-directional-shell'
    );
    assert.equal( snapshot.sourceLocalizationModel, 'directional-lobes' );
    assert.equal( snapshot.interactionModel, 'pairwise-confluence' );
    assert.equal( snapshot.fieldView, 'complete' );
    assert.ok( snapshot.vertexCount > 0 );
    assert.ok( snapshot.triangleCount > 0 );
    superstrate.dispose();
} );

test( 'the shader localizes four moving causes and nonlinear Confluence', () => {
    const fixture = createFixture();
    const material = fixture.superstrate.material;
    assert.match( material.fragmentShader, /superstrateFbm/ );
    assert.match( material.fragmentShader, /superstrateDirectionalLobe/ );
    assert.match( material.fragmentShader, /dot\( direction, normalize\( sourceDirection \) \)/ );
    assert.match( material.fragmentShader, /substrateNoise/ );
    assert.match( material.fragmentShader, /physicalNoise/ );
    assert.match( material.fragmentShader, /informationNoise/ );
    assert.match( material.fragmentShader, /livingNoise/ );
    assert.match( material.fragmentShader, /superstratePulse/ );
    assert.match( material.fragmentShader, /superstrateFieldPhases/ );
    assert.match( material.fragmentShader, /superstratePresence/ );
    assert.match( material.fragmentShader, /superstrateBreath/ );
    assert.match( material.fragmentShader, /superstrateCoherence/ );
    assert.match( material.fragmentShader, /superstratePairwiseConfluence/ );
    assert.match( material.fragmentShader, /pairOverlap/ );
    for ( const pair of [
        /substrateField \* physicalField/,
        /substrateField \* informationField/,
        /substrateField \* livingField/,
        /physicalField \* informationField/,
        /physicalField \* livingField/,
        /informationField \* livingField/
    ] )
    {
        assert.match( material.fragmentShader, pair );
    }
    for ( const name of [
        'superstrateSubstrateMagnet',
        'superstratePhysicalMagnet',
        'superstrateInformationMagnet',
        'superstrateLivingMagnet'
    ] )
    {
        assert.ok(
            Array.from( material.fragmentShader.matchAll(
                new RegExp( name, 'g' )
            ) ).length >= 2,
            `${name} must shape the field, not merely be declared`
        );
    }
    for ( const name of [
        'superstrateSubstrateDirection',
        'superstratePhysicalDirection',
        'superstrateInformationDirection',
        'superstrateLivingDirection',
        'superstrateSubstrateAngularRadius',
        'superstratePhysicalAngularRadius',
        'superstrateInformationAngularRadius',
        'superstrateLivingAngularRadius'
    ] )
    {
        assert.ok(
            Array.from( material.fragmentShader.matchAll(
                new RegExp( name, 'g' )
            ) ).length >= 2,
            `${name} must localize its causal field`
        );
    }
    assert.doesNotMatch(
        librarySource,
        /TextureLoader|DataTexture|CubeTexture|sampler(?:2D|Cube)|texture2D\s*\(/
    );
    assert.doesNotMatch(
        librarySource,
        /PointsMaterial|new THREE\.Points|new THREE\..*Light|envMap/
    );
    fixture.superstrate.dispose();
} );

test( 'parameters and causal magnets update uniforms without replacing resources', () => {
    const fixture = createFixture();
    const { superstrate } = fixture;
    const geometry = superstrate.mesh.geometry;
    const material = superstrate.mesh.material;
    for ( const [ property, range ] of Object.entries( superstrateRanges ) )
    {
        assert.equal(
            superstrate.setParameter( property, range.min ),
            range.min
        );
        assert.equal(
            superstrate.setParameter( property, range.max ),
            range.max
        );
    }
    assert.equal( superstrate.mesh.geometry, geometry );
    assert.equal( superstrate.mesh.material, material );
    const magnets = superstrate.setMagnets( {
        substrate: 0.11,
        physical: 0.22,
        information: 0.33,
        living: 0.44
    } );
    assert.deepEqual( magnets, {
        substrateMagnet: 0.11,
        physicalMagnet: 0.22,
        informationMagnet: 0.33,
        livingMagnet: 0.44
    } );
    assert.equal(
        material.uniforms.superstrateSubstrateMagnet.value,
        0.11
    );
    assert.equal(
        material.uniforms.superstratePhysicalMagnet.value,
        0.22
    );
    assert.equal(
        material.uniforms.superstrateInformationMagnet.value,
        0.33
    );
    assert.equal(
        material.uniforms.superstrateLivingMagnet.value,
        0.44
    );
    const beforeInvalid = { ...superstrate.parameters };
    assert.throws(
        () => superstrate.setMagnets( {
            substrate: 0.5,
            unknown: 0.2
        } ),
        /Unknown superstrate magnet/
    );
    assert.deepEqual( superstrate.parameters, beforeInvalid );
    assert.throws(
        () => superstrate.setParameter( 'presence', 1.41 ),
        /must be between/
    );
    assert.throws(
        () => superstrate.setParameter( 'unknown', 1 ),
        /Unknown superstrate parameter/
    );
    superstrate.dispose();
} );

test( 'localized source updates are normalized, atomic and resource-stable', () => {
    const fixture = createFixture();
    const { superstrate } = fixture;
    const geometry = superstrate.mesh.geometry;
    const material = superstrate.mesh.material;
    const updated = superstrate.setSources( {
        substrate: {
            direction: [ 2, 0, 0 ],
            angularRadius: 0.61
        },
        living: {
            direction: new THREE.Vector3( 0, 3, 4 )
        }
    } );
    assert.ok( Object.isFrozen( updated ) );
    assert.ok( Object.isFrozen( updated.substrate ) );
    assert.ok( Object.isFrozen( updated.substrate.direction ) );
    assert.deepEqual( updated.substrate.direction, [ 1, 0, 0 ] );
    assert.equal( updated.substrate.angularRadius, 0.61 );
    updated.living.direction.forEach( ( component, index ) => {
        assertNear( component, [ 0, 0.6, 0.8 ][index] );
    } );
    assert.deepEqual(
        material.uniforms.superstrateSubstrateDirection.value.toArray(),
        [ 1, 0, 0 ]
    );
    assert.equal(
        material.uniforms.superstrateSubstrateAngularRadius.value,
        0.61
    );
    const beforeInvalid = superstrate.getSnapshot();
    assert.throws(
        () => superstrate.setSources( {
            physical: { direction: [ 1, 0, 0 ] },
            living: { direction: [ 0, 0, 0 ] }
        } ),
        /zero-length/
    );
    assert.deepEqual(
        superstrate.getSnapshot().sources,
        beforeInvalid.sources
    );
    assert.equal(
        superstrate.getSnapshot().revision,
        beforeInvalid.revision
    );
    assert.throws(
        () => superstrate.setSource( 'unknown', {
            direction: [ 0, 0, -1 ]
        } ),
        /Unknown superstrate source/
    );
    assert.throws(
        () => superstrate.setSource( 'physical', {
            angularRadius: 1.46
        } ),
        /must be between/
    );
    assert.equal( superstrate.mesh.geometry, geometry );
    assert.equal( superstrate.mesh.material, material );
    superstrate.dispose();
} );

test( 'diagnostic views isolate five fields without replacing resources', () => {
    const fixture = createFixture();
    const { superstrate } = fixture;
    const geometry = superstrate.mesh.geometry;
    const material = superstrate.mesh.material;
    for ( const [ viewId, uniformValue ] of Object.entries(
        superstrateFieldViews
    ) )
    {
        assert.equal( superstrate.setFieldView( viewId ), viewId );
        assert.equal( superstrate.getFieldView(), viewId );
        assert.equal(
            material.uniforms.superstrateDiagnosticView.value,
            uniformValue
        );
    }
    const beforeInvalid = superstrate.getSnapshot();
    assert.throws(
        () => superstrate.setFieldView( 'averaged-fog' ),
        /Unknown superstrate field view/
    );
    assert.equal( superstrate.getSnapshot(), beforeInvalid );
    assert.equal( superstrate.mesh.geometry, geometry );
    assert.equal( superstrate.mesh.material, material );
    superstrate.dispose();
} );

test( 'the breath is deterministic, bounded and not a simple period-one sine', () => {
    const phases = [ 0, 1, 2.5, 9, 17.25 ];
    const first = phases.map( ( phase ) =>
        evaluateSuperstrateBreath( phase, 1 ) );
    const repeated = phases.map( ( phase ) =>
        evaluateSuperstrateBreath( phase, 1 ) );
    assert.deepEqual( first, repeated );
    assert.ok( first.every( ( value ) => value >= 0 && value <= 1 ) );
    assert.ok( new Set( first.map( ( value ) => value.toFixed( 8 ) ) ).size > 3 );
    assert.notEqual(
        evaluateSuperstrateBreath( 1, 1 ),
        evaluateSuperstrateBreath( 1 + Math.PI * 2, 1 )
    );
    assert.equal( evaluateSuperstrateBreath( 12, 0 ), 0.5 );
} );

test( 'four intrinsic phases move without Breath and freeze without jumps', () => {
    const fixture = createFixture( {
        parameters: { breath: 0 }
    } );
    const { superstrate, camera } = fixture;
    const initialFieldPhases = superstrate.getFieldPhases();
    superstrate.update( 0, camera );
    for ( let index = 1; index <= 20; index += 1 )
    {
        superstrate.update( index * 50, camera );
    }
    assertNear( superstrate.getPhase(), 0.72 );
    const movingFieldPhases = superstrate.getFieldPhases();
    for ( const sourceId of Object.keys( superstrateSourceDefinitions ) )
    {
        assertNear(
            movingFieldPhases[sourceId],
            initialFieldPhases[sourceId]
                + 0.72 * superstrateSourceDefinitions[sourceId].phaseRate
        );
    }
    assert.equal(
        new Set( Object.values( movingFieldPhases ).map(
            ( value ) => value.toFixed( 6 )
        ) ).size,
        4
    );
    camera.position.set( 4, 5, 6 );
    superstrate.update( 1050, camera );
    assert.deepEqual( superstrate.mesh.position.toArray(), [ 4, 5, 6 ] );
    superstrate.setFrozen( true );
    const frozenPhase = superstrate.getPhase();
    const frozenFieldPhases = superstrate.getFieldPhases();
    superstrate.update( 5000, camera );
    assert.equal( superstrate.getPhase(), frozenPhase );
    assert.deepEqual( superstrate.getFieldPhases(), frozenFieldPhases );
    superstrate.setFrozen( false );
    superstrate.update( 5050, camera );
    assertNear( superstrate.getPhase(), frozenPhase + 0.05 * 0.72 );
    superstrate.setObserverPosition( new THREE.Vector3( -2, 1, 3 ) );
    assert.deepEqual( superstrate.mesh.position.toArray(), [ -2, 1, 3 ] );
    superstrate.reset();
    assert.equal( superstrate.getPhase(), 0 );
    assert.deepEqual( superstrate.getFieldPhases(), initialFieldPhases );
    assert.equal( superstrate.getFieldView(), 'complete' );
    assert.equal( superstrate.getSnapshot().frozen, false );
    assert.equal( superstrate.getSnapshot().status, 'active' );
    assert.throws( () => superstrate.update( Number.NaN ), /must be finite/ );
    assert.throws( () => superstrate.update( -1 ), /cannot be negative/ );
    superstrate.dispose();
} );

test( 'visibility and disposal remain local and idempotent', () => {
    const fixture = createFixture();
    const retained = new THREE.Group();
    fixture.scene.add( retained );
    assert.equal( fixture.superstrate.setVisible( false ), false );
    assert.equal( fixture.superstrate.mesh.visible, false );
    assert.equal( fixture.superstrate.getSnapshot().status, 'hidden' );
    fixture.superstrate.dispose();
    fixture.superstrate.dispose();
    assert.ok( fixture.scene.children.includes( retained ) );
    assert.ok( !fixture.scene.children.includes( fixture.superstrate.mesh ) );
    assert.throws(
        () => fixture.superstrate.setVisible( true ),
        /disposed/
    );
} );

test( 'the library has no page, renderer or lower-layer ownership', () => {
    assert.doesNotMatch(
        librarySource,
        /document\.|window\.|querySelector|WebGLRenderer|OrbitControls/
    );
    assert.doesNotMatch(
        librarySource,
        /\.\.\/substrate|\.\.\/tree|\.\.\/casting-pit|composition/i
    );
    assert.equal(
        Array.from( librarySource.matchAll( /setAnimationLoop/g ) ).length,
        0
    );
} );

test( 'the standalone endpoint is a thin owner of controls and one live loop', () => {
    const html = readFileSync(
        new URL(
            '../../src/category-tree/superstrate/index.html',
            import.meta.url
        ),
        'utf8'
    );
    const main = readFileSync(
        new URL(
            '../../src/category-tree/superstrate/main.js',
            import.meta.url
        ),
        'utf8'
    );
    assert.match( html, /id="scene"/ );
    assert.match( html, /aria-label="Metaphysical superstrate controls"/ );
    assert.match( html, /id="freeze-emergence"/ );
    assert.match( html, /id="reset"/ );
    assert.match( html, /0 textures · 0 stars · 0 lights/ );
    const idByProperty = {
        presence: 'presence',
        breath: 'breath',
        coherence: 'coherence',
        confluence: 'confluence',
        substrateMagnet: 'substrate-magnet',
        physicalMagnet: 'physical-magnet',
        informationMagnet: 'information-magnet',
        livingMagnet: 'living-magnet'
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
        assert.equal( attribute( 'min' ), superstrateRanges[property].min );
        assert.equal( attribute( 'max' ), superstrateRanges[property].max );
        assert.equal( attribute( 'step' ), superstrateRanges[property].step );
        assert.equal( attribute( 'value' ), superstrateDefaults[property] );
        assert.match( html, new RegExp( `id="${id}-value"` ) );
    }
    assert.equal(
        Array.from( html.matchAll( /data-field-view="[^"]+"/g ) ).length,
        6
    );
    for ( const viewId of Object.keys( superstrateFieldViews ) )
    {
        assert.match(
            html,
            new RegExp( `data-field-view="${viewId}"` )
        );
    }
    assert.match(
        main,
        /from '\.\.\/\.\.\/lib\/superstrate\/index\.js'/
    );
    assert.doesNotMatch(
        main,
        /ShaderMaterial|SphereGeometry|TextureLoader|DataTexture|new THREE\..*Light/
    );
    assert.match( main, /superstrate\.setFieldView\( viewId \)/ );
    assert.equal(
        Array.from( main.matchAll( /setAnimationLoop\( animate \)/g ) ).length,
        1
    );
    assert.ok(
        main.indexOf( 'superstrate.update( time, camera )' )
            < main.indexOf( 'renderer.render' )
    );
    assert.match( main, /window\.addEventListener\( 'resize'/ );
    assert.match( main, /renderer\.setAnimationLoop\( null \)/ );
} );

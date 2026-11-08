import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as THREE from 'three';
import {
    compositionSuperstrateDefaults,
    compositionSuperstrateSourceRadii,
    createCompositionSuperstrate,
    superstrateFieldViews,
    superstrateRanges
} from '../../src/category-tree/composition/superstrate-instance.js';

const adapterSource = readFileSync(
    new URL(
        '../../src/category-tree/composition/superstrate-instance.js',
        import.meta.url
    ),
    'utf8'
);
const compositionHtml = readFileSync(
    new URL(
        '../../src/category-tree/composition/index.html',
        import.meta.url
    ),
    'utf8'
);
const compositionMain = readFileSync(
    new URL(
        '../../src/category-tree/composition/main.js',
        import.meta.url
    ),
    'utf8'
);

const sourceIds = Object.freeze( [
    'substrate',
    'physical',
    'information',
    'living'
] );

function assertVectorNear( actual, expected, tolerance = 1e-10 )
{
    assert.equal( actual.length, expected.length );
    actual.forEach( ( value, index ) => {
        assert.ok(
            Math.abs( value - expected[index] ) <= tolerance,
            `${value} must be within ${tolerance} of ${expected[index]}`
        );
    } );
}

function createFixture()
{
    const scene = new THREE.Scene();
    const retained = new THREE.Group();
    retained.name = 'Unrelated composition component';
    scene.add( retained );

    const camera = new THREE.PerspectiveCamera( 50, 1, 0.1, 120 );
    camera.position.set( 5, 6, 18 );

    const physical = new THREE.Object3D();
    physical.position.set( 8, -1, 2 );
    scene.add( physical );

    const livingParent = new THREE.Group();
    livingParent.position.set( 1, 0.5, -2 );
    const living = new THREE.Object3D();
    living.position.set( 0, 9, 1 );
    livingParent.add( living );
    scene.add( livingParent );

    const anchors = {
        substrate: new THREE.Vector3( -8, -4, 6 ),
        physical,
        information: { x: -5, y: 1.5, z: -7 },
        living
    };
    const sourceProviders = {
        substrate: anchors.substrate,
        physical: () => anchors.physical,
        information: () => anchors.information,
        living: () => anchors.living
    };
    const childCountBefore = scene.children.length;
    const superstrate = createCompositionSuperstrate( {
        scene,
        camera,
        sourceProviders
    } );

    return {
        anchors,
        camera,
        childCountBefore,
        livingParent,
        retained,
        scene,
        sourceProviders,
        superstrate
    };
}

function providerWorldPoint( provider )
{
    const value = typeof provider === 'function' ? provider() : provider;
    if ( value.isObject3D )
    {
        value.updateWorldMatrix( true, false );
        return value.getWorldPosition( new THREE.Vector3() );
    }
    if ( value.isVector3 ) return value.clone();
    return new THREE.Vector3( value.x, value.y, value.z );
}

function expectedDirections( fixture )
{
    fixture.camera.updateWorldMatrix( true, false );
    const cameraPosition = fixture.camera.getWorldPosition(
        new THREE.Vector3()
    );
    return Object.fromEntries( sourceIds.map( ( sourceId ) => {
        const point = providerWorldPoint( fixture.sourceProviders[sourceId] );
        return [ sourceId, point.sub( cameraPosition ).normalize().toArray() ];
    } ) );
}

function inputTag( id )
{
    const escaped = id.replace( /[-/\\^$*+?.()|[\]{}]/g, '\\$&' );
    const tag = compositionHtml.match(
        new RegExp( `<input\\s+id="${escaped}"[^>]*>` )
    )?.[0];
    assert.ok( tag, `missing composition input #${id}` );
    return tag;
}

function numericRange( id )
{
    const tag = inputTag( id );
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

test( 'composition owns one shared metaphysical shell and four distinct causes', () => {
    assert.ok( Object.isFrozen( compositionSuperstrateDefaults ) );
    assert.ok( Object.isFrozen( compositionSuperstrateSourceRadii ) );
    assert.deepEqual(
        Object.keys( compositionSuperstrateDefaults ),
        Object.keys( superstrateRanges )
    );
    for ( const [ property, value ] of Object.entries(
        compositionSuperstrateDefaults
    ) )
    {
        const range = superstrateRanges[property];
        assert.ok( value >= range.min && value <= range.max );
    }

    const fixture = createFixture();
    const { superstrate } = fixture;
    const snapshot = superstrate.getSnapshot();
    assert.equal( fixture.scene.children.length, fixture.childCountBefore + 1 );
    assert.equal( fixture.scene.children.includes( superstrate.group ), true );
    assert.equal( superstrate.group, superstrate.layer.group );
    assert.equal( snapshot.drawCallCount, 1 );
    assert.equal( snapshot.fieldLayerCount, 5 );
    assert.equal( snapshot.sourceFieldCount, 4 );
    assert.equal( snapshot.confluenceFieldCount, 1 );
    assert.equal( snapshot.textureInputCount, 0 );
    assert.equal( snapshot.lightCount, 0 );
    assert.equal( snapshot.sourcePlacement, 'composition-space-poles' );
    assert.deepEqual(
        snapshot.parameters,
        compositionSuperstrateDefaults
    );
    assert.equal(
        new Set( sourceIds.map(
            ( sourceId ) => snapshot.sources[sourceId].direction.join( ',' )
        ) ).size,
        4
    );
    for ( const sourceId of sourceIds )
    {
        assert.equal(
            snapshot.sources[sourceId].angularRadius,
            compositionSuperstrateSourceRadii[sourceId]
        );
    }
    superstrate.dispose();
} );

test( 'composition source poles track accepted world anchors and camera movement', () => {
    const fixture = createFixture();
    const { superstrate } = fixture;
    let expected = expectedDirections( fixture );
    let snapshot = superstrate.getSnapshot();
    for ( const sourceId of sourceIds )
    {
        assertVectorNear(
            snapshot.sources[sourceId].direction,
            expected[sourceId]
        );
        assertVectorNear(
            snapshot.sourceWorldPoints[sourceId],
            providerWorldPoint(
                fixture.sourceProviders[sourceId]
            ).toArray()
        );
    }

    const firstDirections = Object.fromEntries( sourceIds.map(
        ( sourceId ) => [
            sourceId,
            snapshot.sources[sourceId].direction.slice()
        ]
    ) );
    fixture.camera.position.set( -4, 7, 15 );
    fixture.anchors.physical.position.set( 11, 2, -3 );
    fixture.livingParent.position.set( -2, 1, -4 );
    fixture.anchors.information.x = -9;
    superstrate.update( 0 );

    expected = expectedDirections( fixture );
    snapshot = superstrate.getSnapshot();
    for ( const sourceId of sourceIds )
    {
        assertVectorNear(
            snapshot.sources[sourceId].direction,
            expected[sourceId]
        );
    }
    assert.notDeepEqual(
        snapshot.sources.physical.direction,
        firstDirections.physical
    );
    assert.notDeepEqual(
        snapshot.sources.information.direction,
        firstDirections.information
    );
    assert.notDeepEqual(
        snapshot.sources.living.direction,
        firstDirections.living
    );
    assertVectorNear(
        superstrate.group.position.toArray(),
        fixture.camera.position.toArray()
    );
    superstrate.dispose();
} );

test( 'freeze, visibility and reset preserve one resource-owning adapter', () => {
    const fixture = createFixture();
    const { superstrate } = fixture;
    const geometry = superstrate.layer.mesh.geometry;
    const material = superstrate.layer.mesh.material;
    const childCount = fixture.scene.children.length;

    superstrate.update( 0 );
    superstrate.update( 50 );
    const movingPhase = superstrate.layer.getPhase();
    assert.ok( movingPhase > 0 );
    assert.equal( superstrate.setFrozen( true ), true );
    superstrate.update( 5000 );
    assert.equal( superstrate.layer.getPhase(), movingPhase );
    assert.equal( superstrate.setFrozen( false ), false );
    superstrate.update( 5050 );
    assert.ok( superstrate.layer.getPhase() > movingPhase );

    assert.equal( superstrate.setPresentationVisible( false ), false );
    assert.equal( superstrate.getSnapshot().presentationRequested, false );
    assert.equal( superstrate.setModeVisible( false ), false );
    assert.equal( superstrate.setPresentationVisible( true ), false );
    assert.equal( superstrate.getSnapshot().effectiveVisible, false );

    superstrate.setParameter( 'presence', superstrateRanges.presence.max );
    superstrate.setMagnets( {
        substrate: 0.11,
        physical: 0.22,
        information: 0.33,
        living: 0.44
    } );
    superstrate.setFieldView( 'physical' );
    fixture.anchors.physical.position.set( 12, 3, -5 );
    superstrate.refreshSources();
    const compositionDirection = superstrate.getSnapshot()
        .sources.physical.direction.slice();

    const resetSnapshot = superstrate.reset();
    assert.deepEqual(
        { ...superstrate.parameters },
        compositionSuperstrateDefaults
    );
    assert.equal( resetSnapshot.fieldView, 'complete' );
    assert.equal( resetSnapshot.frozen, false );
    assert.equal( resetSnapshot.presentationRequested, true );
    assert.equal( resetSnapshot.modeVisible, false );
    assert.equal( resetSnapshot.effectiveVisible, false );
    assertVectorNear(
        resetSnapshot.sources.physical.direction,
        compositionDirection
    );
    assert.equal( superstrate.layer.mesh.geometry, geometry );
    assert.equal( superstrate.layer.mesh.material, material );
    assert.equal( fixture.scene.children.length, childCount );
    assert.equal( superstrate.setModeVisible( true ), true );
    assert.equal( superstrate.getSnapshot().effectiveVisible, true );
    superstrate.dispose();
} );

test( 'composition superstrate disposal is local and idempotent', () => {
    const fixture = createFixture();
    const { superstrate } = fixture;
    superstrate.dispose();
    superstrate.dispose();
    assert.equal( fixture.scene.children.includes( superstrate.group ), false );
    assert.equal( fixture.scene.children.includes( fixture.retained ), true );
    assert.equal( fixture.retained.visible, true );
    assert.throws( () => superstrate.update( 100 ), /disposed/ );
    assert.throws( () => superstrate.getSnapshot(), /disposed/ );
    assert.throws(
        () => superstrate.setPresentationVisible( true ),
        /disposed/
    );
} );

test( 'the adapter adds no second shader, light, camera or render loop', () => {
    assert.equal(
        Array.from( adapterSource.matchAll(
            /createEmergentSuperstrateLayer\s*\(/g
        ) ).length,
        1
    );
    assert.match( adapterSource, /layer\.setSources\( resolved \)/ );
    assert.doesNotMatch(
        adapterSource,
        /ShaderMaterial|SphereGeometry|vertexShader|fragmentShader|TextureLoader|DataTexture|Mesh\w*Material|onBeforeCompile/
    );
    assert.doesNotMatch(
        adapterSource,
        /AmbientLight|DirectionalLight|HemisphereLight|PointLight|SpotLight/
    );
    assert.doesNotMatch(
        adapterSource,
        /WebGLRenderer|PerspectiveCamera|OrbitControls|requestAnimationFrame|setAnimationLoop|world\.start/
    );
    assert.doesNotMatch(
        adapterSource,
        /substrate-instance|tree-instance|casting-pit|cosmic-circuitry/
    );
} );

test( 'the composition exposes shared superstrate controls and one live update', () => {
    const idByProperty = {
        presence: 'composition-superstrate-presence',
        breath: 'composition-superstrate-breath',
        coherence: 'composition-superstrate-coherence',
        confluence: 'composition-superstrate-confluence',
        substrateMagnet: 'composition-superstrate-substrate-magnet',
        physicalMagnet: 'composition-superstrate-physical-magnet',
        informationMagnet: 'composition-superstrate-information-magnet',
        livingMagnet: 'composition-superstrate-living-magnet'
    };
    assert.match(
        compositionHtml,
        /<details>\s*<summary>Superstrate · causal confluence<\/summary>/
    );
    for ( const [ property, id ] of Object.entries( idByProperty ) )
    {
        assert.deepEqual( numericRange( id ), {
            ...superstrateRanges[property],
            value: compositionSuperstrateDefaults[property]
        } );
        assert.match(
            compositionMain,
            new RegExp( `'${id}':[\\s\\S]*?property: '${property}'` )
        );
    }

    const visible = inputTag( 'composition-superstrate-visible' );
    assert.match( visible, /\btype="checkbox"/ );
    assert.match( visible, /\bchecked\b/ );
    const freeze = inputTag( 'composition-superstrate-freeze-motion' );
    assert.match( freeze, /\btype="checkbox"/ );
    assert.doesNotMatch( freeze, /\bchecked\b/ );
    assert.equal(
        Array.from( compositionHtml.matchAll(
            /data-superstrate-field-view="[^"]+"/g
        ) ).length,
        Object.keys( superstrateFieldViews ).length
    );
    for ( const viewId of Object.keys( superstrateFieldViews ) )
    {
        assert.match(
            compositionHtml,
            new RegExp( `data-superstrate-field-view="${viewId}"` )
        );
    }
    assert.match(
        compositionMain,
        /compositionSuperstrate\.setPresentationVisible\(/
    );
    assert.match( compositionMain, /compositionSuperstrate\.setFrozen\(/ );
    assert.match( compositionMain, /compositionSuperstrate\.setFieldView\(/ );
    assert.match( compositionMain, /compositionSuperstrate\.reset\(\)/ );
    assert.equal(
        Array.from( compositionMain.matchAll(
            /createCompositionSuperstrate\s*\(\s*\{/g
        ) ).length,
        1
    );
    assert.equal(
        Array.from( compositionMain.matchAll(
            /compositionSuperstrate\.update\( time \)/g
        ) ).length,
        1
    );
    assert.match(
        compositionMain,
        /world\.addFrameCallback\( \( time \) => \{[\s\S]*?compositionSuperstrate\.update\( time \)[\s\S]*?\} \);/
    );
    assert.equal(
        Array.from( compositionMain.matchAll( /world\.start\(/g ) ).length,
        1
    );
    assert.doesNotMatch( compositionMain, /setAnimationLoop/ );
} );

test( 'component poles and inspection modes remain composition-owned', () => {
    assert.match(
        compositionMain,
        /sourceProviders:\s*\{[\s\S]*?substrate:[\s\S]*?physical:[\s\S]*?information:[\s\S]*?living:/
    );
    assert.match(
        compositionMain,
        /compositionSubstrate\.getSnapshot\(\)\.outerSurfaceLevel/
    );
    assert.match( compositionMain, /membrane\.height\( 7, 0 \)/ );
    assert.match( compositionMain, /membrane\.height\( -6, 4 \)/ );
    assert.match(
        compositionMain,
        /tree\.group\.localToWorld\([\s\S]*?treeCrownLocal/
    );
    for ( const modeId of [
        'pit',
        'tree',
        'universe-tree',
        'cosmos-tree'
    ] )
    {
        const escapedMode = modeId.replace( '-', '\\-' );
        assert.match(
            compositionMain,
            new RegExp(
                `(?:'${escapedMode}'|${escapedMode}): Object\\.freeze\\( \\{[\\s\\S]*?superstrate: false[\\s\\S]*?\\} \\)`
            )
        );
    }
    assert.match(
        compositionMain,
        /complete: Object\.freeze\( \{[\s\S]*?superstrate: true[\s\S]*?\} \)/
    );
    assert.match(
        compositionMain,
        /compositionSuperstrate\.setModeVisible\( mode\.superstrate \)/
    );
} );

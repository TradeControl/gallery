import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
    cosmicCircuitryDefaults,
    sluiceGateDefaults
} from '../../src/lib/casting-pit/index.js';
import {
    applyCompositionScene,
    compositionScenes,
    compositionSceneSchemaVersion,
    createCompositionSceneCatalog,
    defaultCompositionSceneId,
    getCompositionScene
} from '../../src/category-tree/composition/scene-catalog.js';
import {
    treeBaselineDefaults,
    treePlacementDefaults
} from '../../src/category-tree/composition/tree-instance.js';
import {
    compositionSubstrateDefaults,
    compositionSubstrateSurfaceDefaults
} from '../../src/category-tree/composition/substrate-instance.js';
import {
    compositionSuperstrateDefaults
} from '../../src/category-tree/composition/superstrate-instance.js';

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
const sceneConfig = JSON.parse( readFileSync(
    new URL(
        '../../src/category-tree/composition/scenes.json',
        import.meta.url
    ),
    'utf8'
) );

function attribute( tag, name )
{
    return tag.match( new RegExp( `\\b${name}="([^"]+)"` ) )?.[1];
}

const rangeControls = Array.from(
    compositionHtml.matchAll(
        /<input\s+id="([^"]+)"[^>]*\btype="range"[^>]*>/g
    ),
    ( match ) => Object.freeze( {
        id: match[1],
        min: Number( attribute( match[0], 'min' ) ),
        max: Number( attribute( match[0], 'max' ) ),
        step: Number( attribute( match[0], 'step' ) ),
        value: Number( attribute( match[0], 'value' ) )
    } )
);
const checkboxControls = Array.from(
    compositionHtml.matchAll(
        /<input\s+id="([^"]+)"[^>]*\btype="checkbox"[^>]*>/g
    ),
    ( match ) => Object.freeze( {
        id: match[1],
        checked: /\schecked(?:\s|>)/.test( match[0] )
    } )
);

class FakeEvent
{
    constructor( type, options = {} )
    {
        this.type = type;
        this.bubbles = Boolean( options.bubbles );
    }
}

function createFakeRoot()
{
    const callbacks = new Map();
    const controls = rangeControls.map( ( contract ) => ( {
        ...contract,
        value: String( contract.value ),
        ownerDocument: {
            defaultView: { Event: FakeEvent }
        },
        dispatchEvent( event ) {
            const calls = callbacks.get( this.id ) ?? [];
            calls.push( Object.freeze( {
                type: event.type,
                bubbles: event.bubbles,
                value: Number( this.value )
            } ) );
            callbacks.set( this.id, calls );
            return true;
        }
    } ) );
    const toggles = checkboxControls.map( ( contract ) => ( {
        ...contract,
        ownerDocument: {
            defaultView: { Event: FakeEvent }
        },
        dispatchEvent( event ) {
            const calls = callbacks.get( this.id ) ?? [];
            calls.push( Object.freeze( {
                type: event.type,
                bubbles: event.bubbles,
                checked: this.checked
            } ) );
            callbacks.set( this.id, calls );
            return true;
        }
    } ) );
    return {
        body: { dataset: {} },
        callbacks,
        controls,
        toggles,
        querySelectorAll( selector ) {
            if ( selector === 'input[type="range"]' ) return controls;
            if ( selector === 'input[type="checkbox"]' ) return toggles;
            assert.fail( `Unexpected selector '${selector}'.` );
        }
    };
}

function cloneScene( scene, sliders = scene.sliders )
{
    return {
        ...scene,
        sliders: { ...sliders }
    };
}

test( 'the JSON scene catalog is immutable, versioned and addressable', () => {
    assert.equal( compositionSceneSchemaVersion, 1 );
    assert.ok( Object.isFrozen( compositionScenes ) );
    assert.deepEqual(
        compositionScenes.map( ( scene ) => [ scene.id, scene.label ] ),
        [
            [ 'default', 'Default' ],
            [ 'scene-1-landscape', 'Scene 1 - Landscape' ],
            [ 'scene-2-aerial', 'Scene 2 - Aerial' ],
            [ 'scene-3-transpiration', 'Scene 3 - Transpiration' ],
            [ 'scene-4-number-11', 'Scene 4 - number 11' ]
        ]
    );
    assert.deepEqual(
        sceneConfig.scenes.map( ( scene ) => scene.id ),
        compositionScenes.map( ( scene ) => scene.id )
    );
    assert.equal(
        new Set( compositionScenes.map( ( scene ) => scene.id ) ).size,
        compositionScenes.length
    );
    for ( const scene of compositionScenes )
    {
        assert.ok( Object.isFrozen( scene ) );
        assert.ok( Object.isFrozen( scene.sliders ) );
        assert.ok( Object.isFrozen( scene.toggles ) );
        assert.ok( Object.isFrozen( scene.camera ) );
        assert.ok( Object.isFrozen( scene.camera.position ) );
        assert.ok( Object.isFrozen( scene.camera.target ) );
        assert.equal( scene.schemaVersion, compositionSceneSchemaVersion );
        assert.match( scene.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/ );
        assert.ok( scene.label.length > 0 );
        assert.deepEqual(
            JSON.parse( JSON.stringify( scene ) ),
            scene
        );
    }
    assert.equal( getCompositionScene().id, defaultCompositionSceneId );
    assert.equal(
        getCompositionScene( defaultCompositionSceneId ),
        compositionScenes[0]
    );
    assert.throws(
        () => getCompositionScene( 'missing-scene' ),
        /Unknown composition scene/
    );
} );

test( 'every scene owns every bounded composition slider exactly once', () => {
    const controlIds = rangeControls.map( ( control ) => control.id ).sort();
    assert.equal( rangeControls.length, 63 );
    for ( const scene of compositionScenes )
    {
        assert.deepEqual( Object.keys( scene.sliders ).sort(), controlIds );
        for ( const control of rangeControls )
        {
            const value = scene.sliders[control.id];
            assert.ok( Number.isFinite( value ), `${scene.id}: ${control.id}` );
            assert.ok(
                value >= control.min,
                `${scene.id}: ${control.id} is below range`
            );
            assert.ok(
                value <= control.max,
                `${scene.id}: ${control.id} is above range`
            );
            const stepIndex = ( value - control.min ) / control.step;
            assert.ok(
                Math.abs( stepIndex - Math.round( stepIndex ) ) < 1e-8,
                `${scene.id}: ${control.id} must align with its declared step`
            );
        }
    }
} );

test( 'every scene restores every presentation toggle and field view', () => {
    const toggleIds = checkboxControls.map( ( control ) => control.id ).sort();
    assert.equal( checkboxControls.length, 12 );
    for ( const scene of compositionScenes )
    {
        assert.deepEqual( Object.keys( scene.toggles ).sort(), toggleIds );
        assert.equal( scene.superstrateFieldView, 'complete' );
        for ( const value of Object.values( scene.toggles ) )
        {
            assert.equal( typeof value, 'boolean' );
        }
    }
} );

test( 'Default reconstructs the committed composition baseline', () => {
    const scene = getCompositionScene( 'default' );
    assert.equal( defaultCompositionSceneId, 'default' );
    assert.equal( scene.layerMode, 'complete' );
    assert.deepEqual( scene.camera, {
        baseView: 'composition',
        position: [ 22, 9, 28 ],
        target: [ 0, 2.5, 0 ]
    } );
    assert.deepEqual(
        scene.sliders,
        Object.fromEntries( rangeControls.map( ( control ) => [
            control.id,
            control.value
        ] ) )
    );
    assert.deepEqual(
        scene.toggles,
        Object.fromEntries( checkboxControls.map( ( control ) => [
            control.id,
            control.checked
        ] ) )
    );
} );

test( 'Scene 1 retains the accepted landscape treatment', () => {
    const scene = getCompositionScene( 'scene-1-landscape' );
    assert.deepEqual( scene.camera, {
        baseView: 'composition',
        position: [ 11.7, 13.5, 48.8 ],
        target: [ -16.5, 5.2, 13 ]
    } );
    assert.deepEqual( Object.fromEntries( [
        'composition-substrate-level',
        'composition-substrate-energy',
        'composition-substrate-crest-tension',
        'composition-substrate-fine-activity',
        'composition-substrate-reflection',
        'composition-substrate-current-speed',
        'tree-vertical-rise',
        'tree-junction-circumference',
        'tree-growth-tiers',
        'composition-superstrate-coherence',
        'composition-superstrate-confluence',
        'composition-superstrate-physical-magnet',
        'composition-superstrate-information-magnet',
        'composition-superstrate-living-magnet'
    ].map( ( id ) => [ id, scene.sliders[id] ] ) ), {
        'composition-substrate-level': 1.85,
        'composition-substrate-energy': 1.65,
        'composition-substrate-crest-tension': 0.55,
        'composition-substrate-fine-activity': 1.3,
        'composition-substrate-reflection': 1.15,
        'composition-substrate-current-speed': 1.3,
        'tree-vertical-rise': 1.07,
        'tree-junction-circumference': 1,
        'tree-growth-tiers': 8,
        'composition-superstrate-coherence': 0.78,
        'composition-superstrate-confluence': 0.76,
        'composition-superstrate-physical-magnet': 0.64,
        'composition-superstrate-information-magnet': 0.53,
        'composition-superstrate-living-magnet': 0.38
    } );
} );

test( 'Scene 2 retains the captured aerial treatment', () => {
    const scene = getCompositionScene( 'scene-2-aerial' );
    assert.deepEqual( scene.camera, {
        baseView: 'elevated',
        position: [ -7.089016, 52.783539, 3.493866 ],
        target: [ 0, 0.8, 0 ]
    } );
    assert.deepEqual( Object.fromEntries( [
        'composition-substrate-swell-height',
        'composition-substrate-energy',
        'composition-substrate-cross-current',
        'composition-substrate-current-speed',
        'tree-crown-spread',
        'tree-wind-sweep',
        'tree-packet-frequency',
        'tree-growth-tiers',
        'u-key-light',
        'u-gate-count',
        'u-stream-count',
        'u-lava-velocity',
        'u-gate-cycle',
        'u-persistence',
        'u-deposition',
        'u-molten-intensity'
    ].map( ( id ) => [ id, scene.sliders[id] ] ) ), {
        'composition-substrate-swell-height': 1.4,
        'composition-substrate-energy': 2,
        'composition-substrate-cross-current': 1.35,
        'composition-substrate-current-speed': 0.8,
        'tree-crown-spread': 1.45,
        'tree-wind-sweep': 0.77,
        'tree-packet-frequency': 8.81,
        'tree-growth-tiers': 4,
        'u-key-light': 5,
        'u-gate-count': 3,
        'u-stream-count': 15,
        'u-lava-velocity': 1.85,
        'u-gate-cycle': 9.5,
        'u-persistence': 3.5,
        'u-deposition': 1.45,
        'u-molten-intensity': 0.95
    } );
} );

test( 'Scene 3 retains the authored transpiration treatment', () => {
    const scene = getCompositionScene( 'scene-3-transpiration' );
    assert.equal( scene.layerMode, 'complete' );
    assert.equal( scene.superstrateFieldView, 'complete' );
    assert.deepEqual( scene.camera, {
        baseView: 'composition',
        position: [ -20, 16, 49 ],
        target: [ 13, 5.2, 10 ]
    } );
    assert.deepEqual( Object.fromEntries( [
        'composition-substrate-energy',
        'composition-substrate-fine-activity',
        'tree-scale',
        'tree-orientation',
        'tree-crown-spread',
        'tree-vertical-rise',
        'tree-asymmetry',
        'tree-wind-sweep',
        'tree-structural-response',
        'tree-growth-tiers',
        'c-intensity',
        'c-signal-density',
        'composition-superstrate-presence',
        'composition-superstrate-breath',
        'composition-superstrate-coherence',
        'composition-superstrate-confluence',
        'composition-superstrate-substrate-magnet',
        'composition-superstrate-physical-magnet',
        'composition-superstrate-information-magnet',
        'composition-superstrate-living-magnet'
    ].map( ( id ) => [ id, scene.sliders[id] ] ) ), {
        'composition-substrate-energy': 1,
        'composition-substrate-fine-activity': 0.65,
        'tree-scale': 0.94,
        'tree-orientation': -22,
        'tree-crown-spread': 0.92,
        'tree-vertical-rise': 1.15,
        'tree-asymmetry': 0.82,
        'tree-wind-sweep': -0.18,
        'tree-structural-response': 0.58,
        'tree-growth-tiers': 7,
        'c-intensity': 0.15,
        'c-signal-density': 96,
        'composition-superstrate-presence': 0.72,
        'composition-superstrate-breath': 0.72,
        'composition-superstrate-coherence': 0.44,
        'composition-superstrate-confluence': 0.84,
        'composition-superstrate-substrate-magnet': 0.12,
        'composition-superstrate-physical-magnet': 0.42,
        'composition-superstrate-information-magnet': 0.58,
        'composition-superstrate-living-magnet': 0.92
    } );
} );

test( 'Scene 4 retains the captured Number 11 treatment', () => {
    const scene = getCompositionScene( 'scene-4-number-11' );
    assert.equal( scene.layerMode, 'complete' );
    assert.equal( scene.superstrateFieldView, 'complete' );
    assert.deepEqual( scene.camera, {
        baseView: 'composition',
        position: [ 32.38047, 13.194223, -7.566232 ],
        target: [ -2.376218, 4.627146, 14.082579 ]
    } );
    assert.deepEqual( Object.fromEntries( [
        'composition-substrate-swell-height',
        'composition-substrate-cross-current',
        'composition-substrate-current-speed',
        'tree-vertical-rise',
        'tree-gust-interval-base',
        'tree-packet-frequency',
        'tree-growth-tiers',
        'tree-internal-router-tiers',
        'u-stream-count',
        'u-emission-rate',
        'u-opening-duration',
        'u-release-threshold',
        'u-gravity',
        'u-interaction',
        'u-deposition',
        'u-molten-intensity',
        'c-signal-density',
        'c-signal-speed',
        'c-signal-brightness',
        'composition-superstrate-coherence',
        'composition-superstrate-physical-magnet',
        'composition-superstrate-information-magnet'
    ].map( ( id ) => [ id, scene.sliders[id] ] ) ), {
        'composition-substrate-swell-height': 1.5,
        'composition-substrate-cross-current': 1.4,
        'composition-substrate-current-speed': 1.85,
        'tree-vertical-rise': 1.24,
        'tree-gust-interval-base': 3,
        'tree-packet-frequency': 11,
        'tree-growth-tiers': 8,
        'tree-internal-router-tiers': 5,
        'u-stream-count': 17,
        'u-emission-rate': 69,
        'u-opening-duration': 1.75,
        'u-release-threshold': 22,
        'u-gravity': 5.3,
        'u-interaction': 1.65,
        'u-deposition': 1.7,
        'u-molten-intensity': 1.15,
        'c-signal-density': 136,
        'c-signal-speed': 10,
        'c-signal-brightness': 0.9,
        'composition-superstrate-coherence': 0.92,
        'composition-superstrate-physical-magnet': 0.89,
        'composition-superstrate-information-magnet': 0.6
    } );
} );

test( 'scene application dispatches only changed slider inputs', () => {
    const root = createFakeRoot();
    const layerModes = [];
    const cameraStates = [];
    const fieldViews = [];
    const scene = getCompositionScene( 'scene-1-landscape' );
    root.toggles[0].checked = !scene.toggles[root.toggles[0].id];
    const expectedChangedIds = rangeControls.filter( ( control ) =>
        control.value !== scene.sliders[control.id]
    ).map( ( control ) => control.id );

    const result = applyCompositionScene( {
        root,
        scene,
        setLayerMode: ( value ) => layerModes.push( value ),
        setCameraState: ( value ) => cameraStates.push( value ),
        setSuperstrateFieldView: ( value ) => fieldViews.push( value )
    } );

    assert.equal( result.sceneId, scene.id );
    assert.equal( result.controlCount, 63 );
    assert.deepEqual( result.changedControlIds, expectedChangedIds );
    assert.ok( Object.isFrozen( result ) );
    assert.ok( Object.isFrozen( result.changedControlIds ) );
    assert.equal( result.toggleCount, 12 );
    assert.deepEqual( result.changedToggleIds, [ root.toggles[0].id ] );
    assert.ok( Object.isFrozen( result.changedToggleIds ) );
    assert.deepEqual( layerModes, [ 'complete' ] );
    assert.deepEqual( cameraStates, [ scene.camera ] );
    assert.deepEqual( fieldViews, [ 'complete' ] );
    assert.equal( root.body.dataset.compositionScene, scene.id );

    for ( const control of root.controls )
    {
        assert.equal( Number( control.value ), scene.sliders[control.id] );
        const calls = root.callbacks.get( control.id ) ?? [];
        assert.equal(
            calls.length,
            expectedChangedIds.includes( control.id ) ? 1 : 0,
            control.id
        );
        if ( calls.length === 1 )
        {
            assert.deepEqual( calls[0], {
                type: 'input',
                bubbles: true,
                value: scene.sliders[control.id]
            } );
        }
    }
    for ( const control of root.toggles )
    {
        assert.equal( control.checked, scene.toggles[control.id] );
        const calls = root.callbacks.get( control.id ) ?? [];
        assert.equal(
            calls.length,
            control.id === root.toggles[0].id ? 1 : 0,
            control.id
        );
        if ( calls.length === 1 )
        {
            assert.deepEqual( calls[0], {
                type: 'change',
                bubbles: true,
                checked: scene.toggles[control.id]
            } );
        }
    }
} );

test( 'the catalog factory rejects invalid external configuration', () => {
    const duplicate = structuredClone( sceneConfig );
    duplicate.scenes[1].id = duplicate.scenes[0].id;
    assert.throws(
        () => createCompositionSceneCatalog( duplicate ),
        /ids must be unique/
    );

    const absentDefault = structuredClone( sceneConfig );
    absentDefault.defaultSceneId = 'missing';
    assert.throws(
        () => createCompositionSceneCatalog( absentDefault ),
        /Unknown default composition scene/
    );

    const malformedCamera = structuredClone( sceneConfig );
    malformedCamera.scenes[0].camera.position = [ 1, 2 ];
    assert.throws(
        () => createCompositionSceneCatalog( malformedCamera ),
        /camera position/
    );
} );

test( 'scene application rejects incomplete, non-finite and off-grid values', () => {
    const scene = getCompositionScene();
    const firstId = rangeControls[0].id;
    const missing = { ...scene.sliders };
    delete missing[firstId];
    assert.throws(
        () => applyCompositionScene( {
            root: createFakeRoot(),
            scene: cloneScene( scene, missing ),
            setLayerMode() {},
            setCameraState() {},
            setSuperstrateFieldView() {}
        } ),
        /slider contract mismatch.*missing/
    );
    assert.throws(
        () => applyCompositionScene( {
            root: createFakeRoot(),
            scene: { ...scene, sliders: undefined },
            setLayerMode() {},
            setCameraState() {},
            setSuperstrateFieldView() {}
        } ),
        /must provide a slider value map/
    );

    for ( const [ value, pattern ] of [
        [ Number.NaN, /must be finite/ ],
        [ rangeControls[0].max + rangeControls[0].step, /must be between/ ],
        [ rangeControls[0].min + rangeControls[0].step / 2, /must align/ ]
    ] )
    {
        const root = createFakeRoot();
        const initialValues = root.controls.map( ( control ) => control.value );
        assert.throws(
            () => applyCompositionScene( {
                root,
                scene: cloneScene( scene, {
                    ...scene.sliders,
                    [firstId]: value
                } ),
                setLayerMode() {},
                setCameraState() {},
                setSuperstrateFieldView() {}
            } ),
            pattern
        );
        assert.deepEqual(
            root.controls.map( ( control ) => control.value ),
            initialValues,
            'an invalid scene must not be applied partially'
        );
        assert.equal( root.callbacks.size, 0 );
    }
} );

test( 'scene application rejects malformed cameras before changing controls', () => {
    const scene = getCompositionScene();
    const invalidCameras = [
        undefined,
        { baseView: 'composition', position: [ 1, 2 ], target: [ 0, 0, 0 ] },
        {
            baseView: 'composition',
            position: [ 1, Number.NaN, 3 ],
            target: [ 0, 0, 0 ]
        },
        {
            baseView: 'composition',
            position: [ 1, 2, 3 ],
            target: [ 1, 2, 3 ]
        }
    ];
    for ( const camera of invalidCameras )
    {
        const root = createFakeRoot();
        assert.throws( () => applyCompositionScene( {
            root,
            scene: { ...scene, camera },
            setLayerMode() {},
            setCameraState() {},
            setSuperstrateFieldView() {}
        } ), /camera/ );
        assert.equal( root.callbacks.size, 0 );
    }
} );

test( 'scene application rejects incomplete presentation state atomically', () => {
    const scene = getCompositionScene();
    const firstToggleId = checkboxControls[0].id;
    const missing = { ...scene.toggles };
    delete missing[firstToggleId];
    for ( const candidate of [
        { ...scene, toggles: missing },
        {
            ...scene,
            toggles: { ...scene.toggles, [firstToggleId]: 'yes' }
        },
        { ...scene, superstrateFieldView: 'unknown' }
    ] )
    {
        const root = createFakeRoot();
        assert.throws( () => applyCompositionScene( {
            root,
            scene: candidate,
            setLayerMode() {},
            setCameraState() {},
            setSuperstrateFieldView() {}
        } ), /toggle|field view/ );
        assert.equal( root.callbacks.size, 0 );
    }
} );

test( 'main generates JSON scenes and replays growth before its one world loop', () => {
    const applyCalls = Array.from( compositionMain.matchAll(
        /applyCompositionScene\s*\(\s*\{/g
    ) );
    assert.equal( applyCalls.length, 1 );
    const applyIndex = compositionMain.indexOf( 'applyCompositionScene( {' );
    const replayIndex = compositionMain.indexOf( 'tree.replayGrowth();' );
    const startIndex = compositionMain.indexOf( 'world.start(' );
    assert.ok( applyIndex >= 0 );
    assert.ok( replayIndex > applyIndex );
    assert.ok( startIndex > replayIndex );
    assert.match(
        compositionMain,
        /function setCompositionScene\( sceneId \)[\s\S]*?const scene = getCompositionScene\( sceneId \);[\s\S]*?applyCompositionScene\( \{[\s\S]*?scene,[\s\S]*?setLayerMode,[\s\S]*?setCameraState,[\s\S]*?setSuperstrateFieldView[\s\S]*?\} \);[\s\S]*?tree\.replayGrowth\(\);/
    );
    assert.match(
        compositionMain,
        /for \( const scene of compositionScenes \)[\s\S]*?document\.createElement\( 'button' \)[\s\S]*?button\.dataset\.compositionScene = scene\.id;/
    );
    assert.match(
        compositionMain,
        /querySelectorAll\( 'button\[data-composition-scene\]' \)/
    );
    assert.match(
        compositionHtml,
        /<fieldset id="composition-scene-controls" class="scene-controls">\s*<legend>Scenes<\/legend>\s*<\/fieldset>/
    );
    const initialSceneIndex = compositionMain.indexOf(
        'setCompositionScene( defaultCompositionSceneId );'
    );
    assert.ok( initialSceneIndex > replayIndex );
    assert.ok( startIndex > initialSceneIndex );
    assert.equal(
        Array.from( compositionMain.matchAll( /tree\.replayGrowth\(\)/g ) ).length,
        1
    );
    assert.doesNotMatch( compositionMain, /tree\.finishGrowth\(\)/ );
    assert.equal(
        Array.from( compositionMain.matchAll( /world\.start\(/g ) ).length,
        1
    );
    assert.doesNotMatch( compositionMain, /setAnimationLoop/ );
} );

test( 'scene promotion leaves every shared baseline unchanged', () => {
    assert.deepEqual( treePlacementDefaults, {
        scale: 1,
        embedDepth: 0,
        rotationDegrees: 0
    } );
    assert.equal( treeBaselineDefaults.verticalRise, 0.95 );
    assert.equal( treeBaselineDefaults.growthTiers, 6 );
    assert.equal(
        treeBaselineDefaults.internalRouterJunctionFormCircumference,
        0.55
    );
    assert.equal( sluiceGateDefaults.sourceRadius, 13 );
    assert.equal( sluiceGateDefaults.depth, 5.5 );
    assert.equal( cosmicCircuitryDefaults.intensity, 0.2 );
    assert.equal( cosmicCircuitryDefaults.intricacy, 7 );
    assert.equal( compositionSubstrateDefaults.outerDepth, 1.55 );
    assert.equal( compositionSubstrateSurfaceDefaults.energy, 1.25 );
    assert.equal( compositionSubstrateSurfaceDefaults.reflection, 0.8 );
    assert.equal( compositionSuperstrateDefaults.coherence, 0.56 );
    assert.equal( compositionSuperstrateDefaults.confluence, 0.54 );
    assert.equal( compositionSuperstrateDefaults.physicalMagnet, 0.2 );
} );

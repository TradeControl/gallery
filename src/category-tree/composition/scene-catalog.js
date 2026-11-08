import sceneConfig from './scenes.json' with { type: 'json' };

export const compositionSceneSchemaVersion = 1;

const sceneIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const layerModeIds = new Set( [
    'pit',
    'tree',
    'universe-tree',
    'cosmos-tree',
    'complete'
] );
const cameraBaseViewIds = new Set( [
    'composition',
    'elevated',
    'root',
    'contact',
    'subterrain',
    'supply-plexus'
] );
const superstrateFieldViewIds = new Set( [
    'complete',
    'substrate',
    'physical',
    'information',
    'living',
    'confluence'
] );

function normaliseCompositionScene( source, schemaVersion )
{
    if ( !source || typeof source !== 'object'
        || !sceneIdPattern.test( source.id ?? '' ) )
    {
        throw new TypeError( 'Composition scenes require a slug-form id.' );
    }
    if ( typeof source.label !== 'string' || source.label.trim() === '' )
    {
        throw new TypeError(
            `Scene '${source.id}' requires a presentation label.`
        );
    }
    if ( !layerModeIds.has( source.layerMode ) )
    {
        throw new RangeError(
            `Scene '${source.id}' has unknown layer mode '${source.layerMode}'.`
        );
    }
    validateCamera( source.camera, source.id );
    if ( !superstrateFieldViewIds.has( source.superstrateFieldView ) )
    {
        throw new RangeError(
            `Scene '${source.id}' has unknown superstrate field view `
            + `'${source.superstrateFieldView}'.`
        );
    }
    if ( !source.toggles || typeof source.toggles !== 'object'
        || Array.isArray( source.toggles ) )
    {
        throw new TypeError(
            `Scene '${source.id}' must provide a toggle value map.`
        );
    }
    const toggles = Object.fromEntries( Object.entries( source.toggles ).map(
        ( [ id, value ] ) => {
            if ( typeof value !== 'boolean' )
            {
                throw new TypeError(
                    `Scene '${source.id}' toggle '${id}' must be boolean.`
                );
            }
            return [ id, value ];
        }
    ) );
    if ( !source.sliders || typeof source.sliders !== 'object'
        || Array.isArray( source.sliders ) )
    {
        throw new TypeError(
            `Scene '${source.id}' must provide a slider value map.`
        );
    }
    const sliders = Object.fromEntries( Object.entries( source.sliders ).map(
        ( [ id, value ] ) => {
            if ( !Number.isFinite( value ) )
            {
                throw new TypeError(
                    `Scene '${source.id}' slider '${id}' must be finite.`
                );
            }
            return [ id, value ];
        }
    ) );
    return Object.freeze( {
        schemaVersion,
        id: source.id,
        label: source.label,
        layerMode: source.layerMode,
        superstrateFieldView: source.superstrateFieldView,
        camera: Object.freeze( {
            baseView: source.camera.baseView,
            position: Object.freeze( [ ...source.camera.position ] ),
            target: Object.freeze( [ ...source.camera.target ] )
        } ),
        toggles: Object.freeze( toggles ),
        sliders: Object.freeze( sliders )
    } );
}

export function createCompositionSceneCatalog( source )
{
    if ( !source || typeof source !== 'object'
        || source.schemaVersion !== compositionSceneSchemaVersion )
    {
        throw new Error(
            `Unsupported composition scene schema '${source?.schemaVersion}'.`
        );
    }
    if ( !Array.isArray( source.scenes ) || source.scenes.length === 0 )
    {
        throw new TypeError( 'Composition scene config requires scenes.' );
    }
    const scenes = source.scenes.map( ( scene ) =>
        normaliseCompositionScene( scene, source.schemaVersion ) );
    const sceneIds = scenes.map( ( scene ) => scene.id );
    if ( new Set( sceneIds ).size !== sceneIds.length )
    {
        throw new Error( 'Composition scene ids must be unique.' );
    }
    if ( !sceneIds.includes( source.defaultSceneId ) )
    {
        throw new Error(
            `Unknown default composition scene '${source.defaultSceneId}'.`
        );
    }
    return Object.freeze( {
        schemaVersion: source.schemaVersion,
        defaultSceneId: source.defaultSceneId,
        scenes: Object.freeze( scenes )
    } );
}

const compositionSceneCatalog = createCompositionSceneCatalog( sceneConfig );

export const compositionScenes = compositionSceneCatalog.scenes;
export const defaultCompositionSceneId =
    compositionSceneCatalog.defaultSceneId;

export function getCompositionScene( sceneId = defaultCompositionSceneId )
{
    const scene = compositionScenes.find( ( candidate ) =>
        candidate.id === sceneId );
    if ( !scene )
    {
        throw new Error( `Unknown composition scene '${sceneId}'.` );
    }
    return scene;
}

function validateSliderValue( control, value, sceneId )
{
    if ( !Number.isFinite( value ) )
    {
        throw new TypeError(
            `Scene '${sceneId}' control '${control.id}' must be finite.`
        );
    }
    const minimum = Number( control.min );
    const maximum = Number( control.max );
    const step = Number( control.step );
    if ( value < minimum || value > maximum )
    {
        throw new RangeError(
            `Scene '${sceneId}' control '${control.id}' must be between `
            + `${minimum} and ${maximum}.`
        );
    }
    const stepIndex = ( value - minimum ) / step;
    if ( Math.abs( stepIndex - Math.round( stepIndex ) ) > 1e-8 )
    {
        throw new RangeError(
            `Scene '${sceneId}' control '${control.id}' must align to step ${step}.`
        );
    }
}

function validateCamera( camera, sceneId )
{
    if ( !camera || typeof camera !== 'object'
        || !cameraBaseViewIds.has( camera.baseView ) )
    {
        throw new TypeError(
            `Scene '${sceneId}' must provide a camera with a base view.`
        );
    }
    for ( const property of [ 'position', 'target' ] )
    {
        const vector = camera[property];
        if ( !Array.isArray( vector ) || vector.length !== 3
            || vector.some( ( value ) => !Number.isFinite( value ) ) )
        {
            throw new TypeError(
                `Scene '${sceneId}' camera ${property} must contain three finite values.`
            );
        }
    }
    const separationSquared = camera.position.reduce(
        ( total, value, index ) =>
            total + ( value - camera.target[index] ) ** 2,
        0
    );
    if ( separationSquared <= 1e-8 )
    {
        throw new RangeError(
            `Scene '${sceneId}' camera position and target must be distinct.`
        );
    }
}

export function applyCompositionScene( {
    root = document,
    scene,
    setLayerMode,
    setCameraState,
    setSuperstrateFieldView
} )
{
    if ( !scene || typeof scene !== 'object' )
    {
        throw new TypeError( 'A composition scene is required.' );
    }
    if ( scene.schemaVersion !== compositionSceneSchemaVersion )
    {
        throw new Error(
            `Unsupported composition scene schema '${scene.schemaVersion}'.`
        );
    }
    validateCamera( scene.camera, scene.id );
    if ( !superstrateFieldViewIds.has( scene.superstrateFieldView ) )
    {
        throw new RangeError(
            `Scene '${scene.id}' has unknown superstrate field view `
            + `'${scene.superstrateFieldView}'.`
        );
    }
    const sliders = scene.sliders;
    if ( !sliders || typeof sliders !== 'object' || Array.isArray( sliders ) )
    {
        throw new TypeError(
            `Scene '${scene.id}' must provide a slider value map.`
        );
    }
    const controls = Array.from( root.querySelectorAll(
        'input[type="range"]'
    ) );
    const controlIds = new Set( controls.map( ( control ) => control.id ) );
    const sceneControlIds = Object.keys( sliders );
    const missing = controls.filter( ( control ) =>
        !( control.id in sliders ) );
    const unknown = sceneControlIds.filter( ( id ) => !controlIds.has( id ) );
    if ( missing.length > 0 || unknown.length > 0 )
    {
        throw new Error(
            `Scene '${scene.id}' slider contract mismatch`
            + `${missing.length > 0
                ? ` · missing ${missing.map( ( control ) => control.id ).join( ', ' )}`
                : ''}`
            + `${unknown.length > 0 ? ` · unknown ${unknown.join( ', ' )}` : ''}`
        );
    }

    for ( const control of controls )
    {
        validateSliderValue( control, Number( sliders[control.id] ), scene.id );
    }

    const toggles = scene.toggles;
    if ( !toggles || typeof toggles !== 'object' || Array.isArray( toggles ) )
    {
        throw new TypeError(
            `Scene '${scene.id}' must provide a toggle value map.`
        );
    }
    const toggleControls = Array.from( root.querySelectorAll(
        'input[type="checkbox"]'
    ) );
    const toggleControlIds = new Set( toggleControls.map(
        ( control ) => control.id
    ) );
    const sceneToggleIds = Object.keys( toggles );
    const missingToggles = toggleControls.filter( ( control ) =>
        !( control.id in toggles ) );
    const unknownToggles = sceneToggleIds.filter( ( id ) =>
        !toggleControlIds.has( id ) );
    if ( missingToggles.length > 0 || unknownToggles.length > 0 )
    {
        throw new Error(
            `Scene '${scene.id}' toggle contract mismatch`
            + `${missingToggles.length > 0
                ? ` · missing ${missingToggles.map(
                    ( control ) => control.id
                ).join( ', ' )}`
                : ''}`
            + `${unknownToggles.length > 0
                ? ` · unknown ${unknownToggles.join( ', ' )}`
                : ''}`
        );
    }
    for ( const control of toggleControls )
    {
        if ( typeof toggles[control.id] !== 'boolean' )
        {
            throw new TypeError(
                `Scene '${scene.id}' toggle '${control.id}' must be boolean.`
            );
        }
    }

    const changed = [];
    for ( const control of controls )
    {
        const value = Number( sliders[control.id] );
        if ( Number( control.value ) === value ) continue;
        control.value = String( value );
        const EventConstructor = control.ownerDocument.defaultView.Event;
        control.dispatchEvent( new EventConstructor( 'input', {
            bubbles: true
        } ) );
        changed.push( control.id );
    }

    const changedToggles = [];
    for ( const control of toggleControls )
    {
        const checked = toggles[control.id];
        if ( control.checked === checked ) continue;
        control.checked = checked;
        const EventConstructor = control.ownerDocument.defaultView.Event;
        control.dispatchEvent( new EventConstructor( 'change', {
            bubbles: true
        } ) );
        changedToggles.push( control.id );
    }

    setLayerMode( scene.layerMode );
    setSuperstrateFieldView( scene.superstrateFieldView );
    setCameraState( scene.camera );
    root.body.dataset.compositionScene = scene.id;
    return Object.freeze( {
        sceneId: scene.id,
        controlCount: controls.length,
        changedControlIds: Object.freeze( changed ),
        toggleCount: toggleControls.length,
        changedToggleIds: Object.freeze( changedToggles )
    } );
}

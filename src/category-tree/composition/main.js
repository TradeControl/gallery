import * as THREE from 'three';
import {
    cosmicCircuitryDefaults,
    createCastingPitWorld,
    createCosmicCircuitryLayer,
    createGaussianMembrane,
    createSluiceGateLayer,
    sluiceGateDefaults
} from '../../lib/casting-pit/index.js';
import {
    createCompositionTree,
    treeBaselineDefaults,
    treePlacementDefaults,
    treePlacementRanges
} from './tree-instance.js';
import { createCompositionMoltenContact } from './molten-contact.js';
import {
    compositionSubstrateDefaults,
    compositionSubstrateRanges,
    compositionSubstrateSurfaceDefaults,
    compositionSubstrateSurfaceRanges,
    createCompositionSubstrate
} from './substrate-instance.js';
import {
    createCompositionTerrainDepthOwner
} from './terrain-depth-owner.js';
import {
    compositionSuperstrateDefaults,
    createCompositionSuperstrate,
    superstrateFieldViews,
    superstrateRanges
} from './superstrate-instance.js';
import {
    applyCompositionScene,
    compositionScenes,
    defaultCompositionSceneId,
    getCompositionScene
} from './scene-catalog.js';
import {
    compositionCameraEnvelope,
    constrainCompositionCameraState
} from './camera-envelope.js';

// Set this to true only while diagnosing geometry outside the public artwork.
// The shipped composition should retain its bounded production camera.
const disableCameraEnvelopeForDevelopment = false;
const cameraEnvelopeEnabled = !disableCameraEnvelopeForDevelopment;

const parameters = {
    ...cosmicCircuitryDefaults,
    ...sluiceGateDefaults,
    depth: sluiceGateDefaults.depth,
    width: sluiceGateDefaults.width,
    surfaceBinding: 1
};

const world = createCastingPitWorld(
    document.querySelector( '#scene' ),
    { background: 0x050607, stencil: true }
);
if ( cameraEnvelopeEnabled )
{
    world.orbitControls.minDistance = compositionCameraEnvelope.minDistance;
    world.orbitControls.maxDistance = compositionCameraEnvelope.maxDistance;
    world.orbitControls.minPolarAngle =
        compositionCameraEnvelope.minPolarAngle;
    world.orbitControls.maxPolarAngle =
        compositionCameraEnvelope.maxPolarAngle;
    world.orbitControls.cursor.set( 0, 0, 0 );
    world.orbitControls.maxTargetRadius = Math.hypot(
        compositionCameraEnvelope.maxTargetRadius,
        compositionCameraEnvelope.maxTargetHeight
    );
    world.orbitControls.screenSpacePanning = false;
}
else
{
    world.orbitControls.maxDistance = 90;
}
world.camera.far = 120;
world.camera.updateProjectionMatrix();
const membrane = createGaussianMembrane( parameters );

const controlsPanel = document.querySelector( '#composition-controls' );
const controlsToggle = document.querySelector( '#composition-controls-toggle' );
const controlsToggleGlyph = controlsToggle.querySelector( '[aria-hidden="true"]' );

function setControlsCollapsed( collapsed )
{
    document.body.classList.toggle( 'controls-collapsed', collapsed );
    controlsPanel.inert = collapsed;
    controlsPanel.setAttribute( 'aria-hidden', collapsed ? 'true' : 'false' );
    controlsToggle.setAttribute( 'aria-expanded', collapsed ? 'false' : 'true' );
    const label = collapsed ? 'Show controls' : 'Hide controls';
    controlsToggle.setAttribute( 'aria-label', label );
    controlsToggle.title = label;
    controlsToggleGlyph.textContent = collapsed ? '\u203a' : '\u2039';
}

controlsToggle.addEventListener( 'click', () => {
    setControlsCollapsed(
        !document.body.classList.contains( 'controls-collapsed' )
    );
} );
document.addEventListener( 'keydown', ( event ) => {
    if ( event.key === 'Escape'
        && document.body.classList.contains( 'controls-collapsed' ) )
    {
        setControlsCollapsed( false );
        controlsToggle.focus();
    }
} );
setControlsCollapsed( true );

let tree = null;
const universe = createSluiceGateLayer( {
    world,
    membrane,
    parameters,
    root: document.querySelector( '#composition-controls' ),
    controlPrefix: 'u-',
    moltenRenderOrder: 5,
    includeEnvironment: false,
    capillaryNetwork: {
        enabled: true,
        reviewMode: 'all',
        selectedSourceIndex: 0
    },
    onMoltenUptake: ( event ) => tree?.acceptPhysicalUptake( event )
} );
world.scene.add(
    universe.environment.diagnostic,
    universe.environment.hemisphereLight,
    universe.environment.keyLight,
    universe.environment.rimLight
);

let capillaryReadoutElapsed = 0;
let previousCapillaryReadoutTime = null;

function updateCompositionCapillaryReadouts()
{
    const snapshot = universe.getCapillarySnapshot();
    const measuredMassBalance = Number.isFinite( snapshot.massBalance )
        ? snapshot.massBalance
        : 0;
    const massBalance = Math.abs( measuredMassBalance ) < 0.0005
        ? 0
        : measuredMassBalance;
    const massBalanceText = `${massBalance >= 0 ? '+' : ''}${massBalance.toFixed( 3 )}`;
    document.querySelector( '#composition-capillary-network-state' ).value =
        `${snapshot.activePrimaryTrunkCount} trunks`
        + ` → ${snapshot.activeTerminalCapillaryCount} tips`
        + ` · ${snapshot.activeSourceCount}/${snapshot.sourceCount} feeds`;
    document.querySelector( '#composition-capillary-parcel-state' ).value =
        `${snapshot.activeCapillaryParcelCount} upstream`;
    document.querySelector( '#composition-capillary-handoff-state' ).value =
        `${snapshot.confluenceEventCount}/${snapshot.inletEmissionCount} accepted`;
    document.querySelector( '#composition-capillary-mass-state' ).value =
        `Δ ${massBalanceText} · synthetic ${snapshot.syntheticMass}`;
    document.querySelector( '#composition-capillary-domain-state' ).value =
        `${snapshot.domain.size} × ${snapshot.domain.size}`
        + ` · ${snapshot.domain.resolution}²`;
}

function updateCompositionCapillaryReadoutClock( time )
{
    if ( previousCapillaryReadoutTime === null )
    {
        previousCapillaryReadoutTime = time;
    }
    capillaryReadoutElapsed += Math.min(
        ( time - previousCapillaryReadoutTime ) / 1000,
        0.1
    );
    previousCapillaryReadoutTime = time;
    if ( capillaryReadoutElapsed >= 0.25 )
    {
        updateCompositionCapillaryReadouts();
        capillaryReadoutElapsed = 0;
    }
}

const cosmos = createCosmicCircuitryLayer( {
    world,
    membrane,
    parameters,
    root: document.querySelector( '#cosmos-controls' ),
    includeEnvironment: false,
    bindEnvironmentControls: false,
    controlPrefix: 'c-',
    manifestationLiftScale: 0.45
} );

tree = createCompositionTree( {
    scene: world.scene,
    renderer: world.renderer,
    camera: world.camera,
    membrane,
    externalOccluders: [ universe.environment.membraneSurface ]
} );

document.querySelector( '#tree-physical-uptake-visible' ).addEventListener(
    'change',
    ( event ) => tree.setPhysicalUptakeVisible( event.currentTarget.checked )
);
for ( const id of [ 'u-reset', 'u-reseed' ] )
{
    document.querySelector( `#${id}` ).addEventListener(
        'click',
        tree.resetPhysicalUptake
    );
}

const compositionSubstrate = createCompositionSubstrate( {
    scene: world.scene,
    membrane,
    plantingEnvelope: tree.plantingEnvelope
} );

const compositionTerrainDepth = createCompositionTerrainDepthOwner( {
    scene: world.scene,
    terrainSurface: universe.environment.membraneSurface
} );

tree.group.updateWorldMatrix( true, true );
const treeCrownBounds = new THREE.Box3().setFromObject( tree.layer.group );
const treeCrownWorld = treeCrownBounds.getCenter( new THREE.Vector3() );
treeCrownWorld.y = THREE.MathUtils.lerp(
    treeCrownWorld.y,
    treeCrownBounds.max.y,
    0.72
);
const treeCrownLocal = tree.group.worldToLocal( treeCrownWorld.clone() );
const superstrateSourcePoints = Object.freeze( {
    substrate: new THREE.Vector3(),
    physical: new THREE.Vector3(),
    information: new THREE.Vector3(),
    living: new THREE.Vector3()
} );
const compositionSuperstrate = createCompositionSuperstrate( {
    scene: world.scene,
    camera: world.camera,
    sourceProviders: {
        substrate: () => superstrateSourcePoints.substrate.set(
            -8,
            compositionSubstrate.getSnapshot().outerSurfaceLevel,
            6
        ),
        physical: () => superstrateSourcePoints.physical.set(
            7,
            membrane.height( 7, 0 ) + 0.65,
            0
        ),
        information: () => superstrateSourcePoints.information.set(
            -6,
            membrane.height( -6, 4 ) + 2,
            4
        ),
        living: () => {
            tree.group.updateWorldMatrix( true, false );
            return tree.group.localToWorld(
                superstrateSourcePoints.living.copy( treeCrownLocal )
            );
        }
    }
} );

function updateTerrainDepthReadouts()
{
    const snapshot = compositionTerrainDepth.getSnapshot();
    document.querySelector( '#composition-terrain-depth-state' ).value =
        `${snapshot.status} · ordinary depth`;
    document.querySelector( '#composition-terrain-depth-coverage' ).value =
        `live membrane · ${snapshot.vertexCount} vertices`;
    document.querySelector( '#composition-terrain-depth-construction' ).value =
        `0 colour · ${snapshot.triangleCount} borrowed triangles`;
}

document.querySelector( '#composition-terrain-depth-visible' ).addEventListener(
    'change',
    ( event ) => {
        compositionTerrainDepth.setVisible( event.currentTarget.checked );
        updateTerrainDepthReadouts();
    }
);

function updateSubstrateReadouts()
{
    const snapshot = compositionSubstrate.getSnapshot();
    document.querySelector( '#composition-substrate-state' ).value =
        `${snapshot.status} · ${snapshot.depthSource}`;
    document.querySelector( '#composition-substrate-boundary' ).value =
        `outer ${snapshot.outerSurfaceLevel.toFixed( 2 )}`
        + ` · deep ≥${snapshot.deepMediumDepth.toFixed( 2 )}`;
    document.querySelector( '#composition-substrate-construction' ).value =
        `${snapshot.vertexCount} vertices · 0 textures`;
}

document.querySelector( '#composition-substrate-visible' ).addEventListener(
    'change',
    ( event ) => {
        compositionSubstrate.setVisible( event.currentTarget.checked );
        updateSubstrateReadouts();
    }
);

const substrateLevelControl = document.querySelector(
    '#composition-substrate-level'
);
const substrateLevelOutput = document.querySelector(
    '#composition-substrate-level-value'
);
const substrateLevelRange = compositionSubstrateRanges.outerDepth;
substrateLevelControl.min = substrateLevelRange.min;
substrateLevelControl.max = substrateLevelRange.max;
substrateLevelControl.step = substrateLevelRange.step;
substrateLevelControl.value = compositionSubstrateDefaults.outerDepth;
substrateLevelOutput.value = Number( substrateLevelControl.value ).toFixed( 2 );
substrateLevelControl.addEventListener( 'input', () => {
    const value = compositionSubstrate.setOuterDepth(
        Number( substrateLevelControl.value )
    );
    substrateLevelOutput.value = value.toFixed( 2 );
    updateSubstrateReadouts();
} );

const substrateControlDescriptors = Object.freeze( {
    'composition-substrate-swell-height': Object.freeze( {
        property: 'swellHeight',
        decimals: 2
    } ),
    'composition-substrate-energy': Object.freeze( {
        property: 'energy',
        decimals: 2
    } ),
    'composition-substrate-crest-tension': Object.freeze( {
        property: 'crestTension',
        decimals: 2
    } ),
    'composition-substrate-cross-current': Object.freeze( {
        property: 'crossCurrent',
        decimals: 2
    } ),
    'composition-substrate-fine-activity': Object.freeze( {
        property: 'fineActivity',
        decimals: 2
    } ),
    'composition-substrate-reflection': Object.freeze( {
        property: 'reflection',
        decimals: 2
    } ),
    'composition-substrate-current-speed': Object.freeze( {
        property: 'currentSpeed',
        decimals: 2
    } )
} );

function setSubstrateControlPresentation( id, descriptor, value )
{
    const control = document.querySelector( `#${id}` );
    control.value = value;
    document.querySelector( `#${id}-value` ).value = Number( value ).toFixed(
        descriptor.decimals
    );
}

for ( const [ id, descriptor ] of Object.entries(
    substrateControlDescriptors
) )
{
    const control = document.querySelector( `#${id}` );
    const range = compositionSubstrateSurfaceRanges[descriptor.property];
    control.min = range.min;
    control.max = range.max;
    control.step = range.step;
    setSubstrateControlPresentation(
        id,
        descriptor,
        compositionSubstrateSurfaceDefaults[descriptor.property]
    );
    control.addEventListener( 'input', () => {
        const value = compositionSubstrate.setParameter(
            descriptor.property,
            Number( control.value )
        );
        setSubstrateControlPresentation( id, descriptor, value );
        updateSubstrateReadouts();
    } );
}

const substrateFreezeControl = document.querySelector(
    '#composition-substrate-freeze-motion'
);
substrateFreezeControl.addEventListener( 'change', ( event ) => {
    compositionSubstrate.setFrozen( event.currentTarget.checked );
    updateSubstrateReadouts();
} );

document.querySelector( '#composition-substrate-reset' ).addEventListener(
    'click',
    () => {
        const resetParameters = compositionSubstrate.reset();
        for ( const [ id, descriptor ] of Object.entries(
            substrateControlDescriptors
        ) )
        {
            setSubstrateControlPresentation(
                id,
                descriptor,
                resetParameters[descriptor.property]
            );
        }
        substrateFreezeControl.checked = false;
        updateSubstrateReadouts();
    }
);

const superstrateControlDescriptors = Object.freeze( {
    'composition-superstrate-presence': Object.freeze( {
        property: 'presence',
        decimals: 2
    } ),
    'composition-superstrate-breath': Object.freeze( {
        property: 'breath',
        decimals: 2
    } ),
    'composition-superstrate-coherence': Object.freeze( {
        property: 'coherence',
        decimals: 2
    } ),
    'composition-superstrate-confluence': Object.freeze( {
        property: 'confluence',
        decimals: 2
    } ),
    'composition-superstrate-substrate-magnet': Object.freeze( {
        property: 'substrateMagnet',
        decimals: 2
    } ),
    'composition-superstrate-physical-magnet': Object.freeze( {
        property: 'physicalMagnet',
        decimals: 2
    } ),
    'composition-superstrate-information-magnet': Object.freeze( {
        property: 'informationMagnet',
        decimals: 2
    } ),
    'composition-superstrate-living-magnet': Object.freeze( {
        property: 'livingMagnet',
        decimals: 2
    } )
} );

function setSuperstrateControlPresentation( id, descriptor, value )
{
    const control = document.querySelector( `#${id}` );
    control.value = value;
    document.querySelector( `#${id}-value` ).value = Number( value ).toFixed(
        descriptor.decimals
    );
}

function setSuperstrateFieldViewPresentation( viewId )
{
    document.querySelectorAll( '[data-superstrate-field-view]' ).forEach(
        ( button ) => {
            const active = button.dataset.superstrateFieldView === viewId;
            button.classList.toggle( 'active', active );
            button.setAttribute( 'aria-pressed', active ? 'true' : 'false' );
        }
    );
}

function setSuperstrateFieldView( viewId )
{
    compositionSuperstrate.setFieldView( viewId );
    setSuperstrateFieldViewPresentation( viewId );
    updateSuperstrateReadouts();
}

function updateSuperstrateReadouts()
{
    const snapshot = compositionSuperstrate.getSnapshot();
    document.querySelector( '#composition-superstrate-state' ).value =
        snapshot.effectiveVisible
            ? `${snapshot.frozen ? 'held' : 'emerging'} · ${snapshot.fieldView}`
            : ( snapshot.presentationRequested ? 'Complete view only' : 'withheld' );
    document.querySelector( '#composition-superstrate-fields' ).value =
        `${snapshot.sourceFieldCount} causes`
        + ` + ${snapshot.confluenceFieldCount} confluence`;
    document.querySelector( '#composition-superstrate-construction' ).value =
        `${snapshot.drawCallCount} shell`
        + ` · ${snapshot.textureInputCount} textures`
        + ` · ${snapshot.lightCount} lights`;
}

for ( const [ id, descriptor ] of Object.entries(
    superstrateControlDescriptors
) )
{
    const control = document.querySelector( `#${id}` );
    const range = superstrateRanges[descriptor.property];
    control.min = range.min;
    control.max = range.max;
    control.step = range.step;
    setSuperstrateControlPresentation(
        id,
        descriptor,
        compositionSuperstrateDefaults[descriptor.property]
    );
    control.addEventListener( 'input', () => {
        const value = compositionSuperstrate.setParameter(
            descriptor.property,
            Number( control.value )
        );
        setSuperstrateControlPresentation( id, descriptor, value );
        updateSuperstrateReadouts();
    } );
}

const superstrateVisibleControl = document.querySelector(
    '#composition-superstrate-visible'
);
superstrateVisibleControl.addEventListener( 'change', ( event ) => {
    compositionSuperstrate.setPresentationVisible(
        event.currentTarget.checked
    );
    updateSuperstrateReadouts();
} );

const superstrateFreezeControl = document.querySelector(
    '#composition-superstrate-freeze-motion'
);
superstrateFreezeControl.addEventListener( 'change', ( event ) => {
    compositionSuperstrate.setFrozen( event.currentTarget.checked );
    updateSuperstrateReadouts();
} );

document.querySelectorAll( '[data-superstrate-field-view]' ).forEach(
    ( button ) => {
        button.addEventListener( 'click', () => {
            setSuperstrateFieldView(
                button.dataset.superstrateFieldView
            );
        } );
    }
);

document.querySelector( '#composition-superstrate-reset' ).addEventListener(
    'click',
    () => {
        compositionSuperstrate.reset();
        for ( const [ id, descriptor ] of Object.entries(
            superstrateControlDescriptors
        ) )
        {
            setSuperstrateControlPresentation(
                id,
                descriptor,
                compositionSuperstrateDefaults[descriptor.property]
            );
        }
        superstrateVisibleControl.checked = true;
        superstrateFreezeControl.checked = false;
        setSuperstrateFieldView( 'complete' );
    }
);

for ( const viewId of Object.keys( superstrateFieldViews ) )
{
    if ( !document.querySelector(
        `[data-superstrate-field-view="${viewId}"]`
    ) )
    {
        throw new Error( `Missing superstrate field view '${viewId}'.` );
    }
}

const moltenContact = createCompositionMoltenContact( {
    scene: world.scene,
    membrane,
    plantingEnvelope: tree.plantingEnvelope,
    moltenField: universe.moltenField,
    getContactDiagnostics: universe.getMoltenContactDiagnostics,
    threshold: () => parameters.threshold
} );
universe.setMoltenContactBoundary( moltenContact.boundary );

const cameraViews = {
    composition: {
        position: new THREE.Vector3( 22, 9, 28 ),
        target: new THREE.Vector3( 0, 2.5, 0 )
    },
    elevated: {
        position: new THREE.Vector3( 18, 23, 20 ),
        target: new THREE.Vector3( 0, 0.8, 0 )
    },
    root: {
        position: new THREE.Vector3( 10.5, 0.8, 14.5 ),
        target: new THREE.Vector3( 0, -4.2, 0 )
    },
    contact: {
        position: new THREE.Vector3( 8, 8, 11.5 ),
        target: new THREE.Vector3( 0, -4.65, 0 )
    },
    subterrain: {
        position: new THREE.Vector3( 6, -8.5, 9.5 ),
        target: new THREE.Vector3( 0, -5.7, 0 )
    },
    'supply-plexus': {
        position: new THREE.Vector3( 0, 55, 35 ),
        target: new THREE.Vector3( 0, 0.9, 0 )
    }
};

let activeCameraViewId = 'composition';
const sceneSurface = document.querySelector( '#scene' );
sceneSurface.dataset.cameraEnvelope = cameraEnvelopeEnabled
    ? 'production'
    : 'unrestricted-development';

function publishCompositionCameraState()
{
    sceneSurface.dataset.cameraView = activeCameraViewId;
    sceneSurface.dataset.cameraPosition = world.camera.position.toArray()
        .map( ( value ) => value.toFixed( 6 ) ).join( ',' );
    sceneSurface.dataset.cameraTarget = world.orbitControls.target.toArray()
        .map( ( value ) => value.toFixed( 6 ) ).join( ',' );
}

let applyingCameraEnvelope = false;

function enforceCompositionCameraEnvelope()
{
    if ( !cameraEnvelopeEnabled || applyingCameraEnvelope ) return false;
    const constrained = constrainCompositionCameraState( {
        baseView: activeCameraViewId,
        position: world.camera.position.toArray(),
        target: world.orbitControls.target.toArray()
    } );
    const constrainedPosition = new THREE.Vector3().fromArray(
        constrained.position
    );
    const constrainedTarget = new THREE.Vector3().fromArray(
        constrained.target
    );
    const changed = !world.camera.position.equals( constrainedPosition )
        || !world.orbitControls.target.equals( constrainedTarget );
    if ( !changed ) return false;

    applyingCameraEnvelope = true;
    try
    {
        world.camera.position.copy( constrainedPosition );
        world.orbitControls.target.copy( constrainedTarget );
        world.orbitControls.update();
    }
    finally
    {
        applyingCameraEnvelope = false;
    }
    return true;
}

world.orbitControls.addEventListener( 'change', () => {
    enforceCompositionCameraEnvelope();
    publishCompositionCameraState();
} );

function setCameraState( cameraState )
{
    if ( !cameraViews[cameraState.baseView] )
    {
        throw new Error(
            `Unknown camera view '${cameraState.baseView}'.`
        );
    }
    activeCameraViewId = cameraState.baseView;
    world.setCameraView( {
        position: new THREE.Vector3().fromArray( cameraState.position ),
        target: new THREE.Vector3().fromArray( cameraState.target )
    } );
    publishCompositionCameraState();
    document.querySelectorAll( '[data-view]' ).forEach( ( button ) => {
        const active = button.dataset.view === activeCameraViewId;
        button.classList.toggle( 'active', active );
        button.setAttribute( 'aria-pressed', active ? 'true' : 'false' );
    } );
}

function setCameraView( viewId )
{
    const view = cameraViews[viewId];
    if ( !view ) throw new Error( `Unknown camera view '${viewId}'.` );
    setCameraState( {
        baseView: viewId,
        position: view.position.toArray(),
        target: view.target.toArray()
    } );
}

document.querySelectorAll( '[data-view]' ).forEach( ( button ) => {
    button.addEventListener( 'click', () => {
        setCameraView( button.dataset.view );
    } );
} );

const layerModes = Object.freeze( {
    pit: Object.freeze( {
        label: 'Casting Pit only',
        universe: true,
        cosmos: true,
        tree: false,
        superstrate: false
    } ),
    tree: Object.freeze( {
        label: 'Tree planting baseline',
        universe: false,
        cosmos: false,
        tree: true,
        superstrate: false
    } ),
    'universe-tree': Object.freeze( {
        label: 'Universe + Tree',
        universe: true,
        cosmos: false,
        tree: true,
        superstrate: false
    } ),
    'cosmos-tree': Object.freeze( {
        label: 'Cosmos + Tree',
        universe: false,
        cosmos: true,
        tree: true,
        superstrate: false
    } ),
    complete: Object.freeze( {
        label: 'Complete composition',
        universe: true,
        cosmos: true,
        tree: true,
        superstrate: true
    } )
} );
let activeLayerModeId = 'complete';

function setLayerMode( modeId )
{
    const mode = layerModes[modeId];
    if ( !mode ) throw new Error( `Unknown composition mode '${modeId}'.` );
    activeLayerModeId = modeId;
    universe.setVisible( mode.universe );
    cosmos.setVisible( mode.cosmos );
    tree.setVisible( mode.tree );
    compositionSuperstrate.setModeVisible( mode.superstrate );
    universe.environment.diagnostic.visible = mode.universe
        && document.querySelector( '#u-diagnostic' ).checked;
    const contactVisible = mode.universe && mode.tree;
    moltenContact.setActive( contactVisible );
    moltenContact.setVisible( contactVisible );
    document.querySelector( '#active-mode' ).value = mode.label;
    document.querySelectorAll( '[data-layer-mode]' ).forEach( ( button ) => {
        const active = button.dataset.layerMode === modeId;
        button.classList.toggle( 'active', active );
        button.setAttribute( 'aria-pressed', active ? 'true' : 'false' );
    } );
    updateSuperstrateReadouts();
}

document.querySelectorAll( '[data-layer-mode]' ).forEach( ( button ) => {
    button.addEventListener( 'click', () => {
        setLayerMode( button.dataset.layerMode );
    } );
} );

document.querySelector( '#u-diagnostic' ).addEventListener( 'change', ( event ) => {
    const mode = layerModes[activeLayerModeId];
    universe.environment.diagnostic.visible = mode.universe
        && event.currentTarget.checked;
} );

const treeRangeControls = Object.freeze( {
    'tree-crown-spread': {
        property: 'crownSpread',
        decimals: 2
    },
    'tree-vertical-rise': {
        property: 'verticalRise',
        decimals: 2
    },
    'tree-asymmetry': {
        property: 'asymmetry',
        decimals: 2
    },
    'tree-conduit-weight': {
        property: 'conduitWeight',
        decimals: 2
    },
    'tree-wind-sweep': {
        property: 'windSweep',
        decimals: 2
    },
    'tree-surface-relief': {
        property: 'surfaceRelief',
        decimals: 2
    },
    'tree-structural-response': {
        property: 'structuralResponse',
        decimals: 2
    },
    'tree-gust-interval-base': {
        property: 'gustIntervalBase',
        format: ( value ) => {
            const base = Math.round( value );
            const ceiling = Math.round( base + 15 + base / 13 );
            return `${base}–${ceiling} s`;
        }
    },
    'tree-packet-speed': {
        property: 'packetSpeed',
        decimals: 2
    },
    'tree-packet-frequency': {
        property: 'packetFrequency',
        decimals: 2
    },
    'tree-junction-circumference': {
        property: 'internalRouterJunctionFormCircumference',
        format: ( value ) => `${Math.round( value * 100 )}%`
    },
    'tree-growth-tiers': {
        property: 'growthTiers',
        decimals: 0
    },
    'tree-internal-router-tiers': {
        property: 'internalRouterTiers',
        decimals: 0
    }
} );

function displayTreeControlValue( id, descriptor, value )
{
    document.querySelector( `#${id}-value` ).value = descriptor.format
        ? descriptor.format( value )
        : Number( value ).toFixed( descriptor.decimals );
}

for ( const [ id, descriptor ] of Object.entries( treeRangeControls ) )
{
    const control = document.querySelector( `#${id}` );
    control.addEventListener( 'input', () => {
        const value = tree.setFormValue(
            descriptor.property,
            Number( control.value )
        );
        displayTreeControlValue( id, descriptor, value );
    } );
    displayTreeControlValue(
        id,
        descriptor,
        tree.form[descriptor.property]
    );
}

const placementControls = Object.freeze( {
    'tree-scale': { property: 'scale', decimals: 2 },
    'tree-root-depth': { property: 'embedDepth', decimals: 2 },
    'tree-orientation': {
        property: 'rotationDegrees',
        format: ( value ) => `${Math.round( value )}°`
    }
} );

function updateAnchorReadout()
{
    const [ x, y, z ] = tree.getState().anchor;
    document.querySelector( '#tree-root-anchor' ).value =
        `${x.toFixed( 2 )}, ${y.toFixed( 2 )}, ${z.toFixed( 2 )}`;
    updatePlantingReadouts();
}

function updatePlantingReadouts()
{
    const envelope = tree.plantingEnvelope.getSnapshot();
    if ( !envelope ) return;
    document.querySelector( '#tree-contact-state' ).value =
        `${envelope.status} · ${envelope.contactCount}`
        + `/${envelope.radialSegments}`;
    const heights = envelope.contactLine.map( ( point ) => point[1] );
    document.querySelector( '#tree-contact-relief' ).value = heights.length > 0
        ? `${Math.min( ...heights ).toFixed( 2 )}`
            + `…${Math.max( ...heights ).toFixed( 2 )}`
        : 'unresolved';
    const roots = tree.physicalRootSystem.getSnapshot();
    document.querySelector( '#tree-root-system' ).value = roots?.status === 'attached'
        ? `${roots.principalRootCount} principal`
            + ` · ${roots.continuationCount} fine`
        : 'unavailable';
    document.querySelector( '#tree-root-containment' ).value =
        roots?.status === 'attached'
            ? `${roots.endpointBands.every( ( band ) => band === 'deep-medium' )
                ? 'deep-medium ends'
                : 'mixed ends'}`
                + ` · surface well ≥${roots.minimumRootSurfaceWellInfluence
                    .toFixed( 2 )}`
                + ` · ${roots.preferredWellBudgetRetained
                    ? 'preferred budget'
                    : 'contact-fitted budget'}`
            : 'unavailable';
}

for ( const [ id, descriptor ] of Object.entries( placementControls ) )
{
    const control = document.querySelector( `#${id}` );
    const range = treePlacementRanges[descriptor.property];
    control.min = range.min;
    control.max = range.max;
    control.step = range.step;
    control.addEventListener( 'input', () => {
        const value = Number( control.value );
        tree.setPlacementValue( descriptor.property, value );
        compositionSubstrate.refreshSurface();
        document.querySelector( `#${id}-value` ).value = descriptor.format
            ? descriptor.format( value )
            : value.toFixed( descriptor.decimals );
        updateAnchorReadout();
    } );
}

document.querySelector( '#tree-planting-envelope' ).addEventListener(
    'change',
    ( event ) => tree.setPlantingEnvelopeDiagnosticVisible(
        event.currentTarget.checked
    )
);

document.querySelector( '#tree-root-guides' ).addEventListener(
    'change',
    ( event ) => tree.setPhysicalRootDiagnosticVisible(
        event.currentTarget.checked
    )
);

document.querySelector( '#tree-freeze-motion' ).addEventListener(
    'change',
    ( event ) => tree.setFormValue( 'motionFrozen', event.currentTarget.checked )
);
document.querySelector( '#tree-replay-growth' ).addEventListener(
    'click',
    tree.replayGrowth
);
document.querySelector( '#tree-reset' ).addEventListener( 'click', () => {
    tree.resetForm();
    for ( const [ id, descriptor ] of Object.entries( treeRangeControls ) )
    {
        const value = treeBaselineDefaults[descriptor.property];
        document.querySelector( `#${id}` ).value = value;
        displayTreeControlValue( id, descriptor, value );
    }
    document.querySelector( '#tree-freeze-motion' ).checked = false;
} );

for ( const controlId of [ 'u-depth', 'u-width' ] )
{
    document.querySelector( `#${controlId}` ).addEventListener( 'input', () => {
        cosmos.updateSurface();
        tree.updatePlacement();
        compositionSubstrate.refreshSurface();
        updateAnchorReadout();
    } );
}

function updateTreeReadouts()
{
    const state = tree.getState();
    const routed = tree.layer.group.userData.routedLight;
    const junction = tree.layer.group.userData.internalRouterJunction;
    const transport = tree.layer.group.userData.internalRouterTransport;
    const render = tree.visibilityRenderer.getDiagnostics();
    document.querySelector( '#tree-state' ).value = state.unfoldingActive
        ? `growing · ${Math.round( state.growthViability * 100 )}%`
        : 'mature';
    document.querySelector( '#tree-packet-state' ).value =
        `${routed?.packetCount ?? 0} canopy`
        + ` · ${transport?.activePacketCount ?? 0} rootward`;
    document.querySelector( '#tree-junction-state' ).value =
        junction?.outputCount > 0
            ? `${junction.consumptionCount} cyan → ${junction.releasedOutputCount} gold`
                + ` · balance ${junction.conservation.handoffBalance}`
            : 'waiting for cyan input';
    document.querySelector( '#tree-render-state' ).value =
        `${render.passCount} pass${render.passCount === 1 ? '' : 'es'}`
        + ` · ${render.cpuSubmissionEmaMs.toFixed( 1 )} ms`;
    const uptake = tree.physicalUptake.getSnapshot();
    document.querySelector( '#tree-physical-uptake-state' ).value =
        uptake.acceptedTransferCount === 0
            ? 'waiting for root contact'
            : ( uptake.activePacketCount > 0
                ? `${uptake.activeXylemCount} xylem`
                    + ` · ${uptake.activeBranchPacketCount} branch`
                : 'absorbed · vessels quiet' );
    document.querySelector( '#tree-physical-uptake-accounting' ).value =
        `${uptake.acceptedTransferCount} events`
        + ` · mass ${uptake.acceptedMass.toFixed( 3 )}`
        + ` · Δ ${( Math.abs( uptake.massBalance ) < 0.0005
            ? 0
            : uptake.massBalance ).toFixed( 3 )}`;
    const activeRoutes = new Set( uptake.activePackets.map(
        ( packet ) => packet.routeTerminalId
    ) ).size;
    document.querySelector( '#tree-physical-uptake-traffic' ).value =
        `${uptake.activePacketCount} wakes`
        + ` · ${activeRoutes}/${uptake.routeCount} routes`
        + ` · ${uptake.unvisualisedTransferCount} unshown`;
    const contact = moltenContact.getSnapshot();
    document.querySelector( '#molten-contact-state' ).value =
        `${contact.status} · ${contact.activeSectorCount} arcs`
        + ` · +${contact.maximumLift.toFixed( 2 )}`;
    document.querySelector( '#molten-contact-accounting' ).value =
        `${contact.divertedParcelCount} diverted`
        + ` · ${contact.settledParcelCount} settled`
        + ` · ${contact.activeContactParcelCount} resident`;
    updatePlantingReadouts();
}

world.addFrameCallback( ( time ) => {
    tree.update( time );
    compositionSubstrate.update( time );
    compositionSuperstrate.update( time );
    moltenContact.update( time );
    updateCompositionCapillaryReadoutClock( time );
    updateTreeReadouts();
} );

updateAnchorReadout();
updateTerrainDepthReadouts();
updateSubstrateReadouts();
setSuperstrateFieldViewPresentation( 'complete' );
updateSuperstrateReadouts();
updateCompositionCapillaryReadouts();

const compositionSceneControls = document.querySelector(
    '#composition-scene-controls'
);
const activeSceneOutput = document.querySelector( '#active-scene' );

function updateCompositionScenePresentation( scene )
{
    activeSceneOutput.value = scene.label;
    document.querySelectorAll( 'button[data-composition-scene]' ).forEach(
        ( button ) => {
            const active = button.dataset.compositionScene === scene.id;
            button.classList.toggle( 'active', active );
            button.setAttribute( 'aria-pressed', active ? 'true' : 'false' );
        }
    );
}

function setCompositionScene( sceneId )
{
    const scene = getCompositionScene( sceneId );
    const result = applyCompositionScene( {
        scene,
        setLayerMode,
        setCameraState,
        setSuperstrateFieldView
    } );
    tree.replayGrowth();
    updateCompositionScenePresentation( scene );
    return result;
}

for ( const scene of compositionScenes )
{
    const button = document.createElement( 'button' );
    button.type = 'button';
    button.dataset.compositionScene = scene.id;
    button.setAttribute( 'aria-pressed', 'false' );
    button.textContent = scene.label;
    button.addEventListener( 'click', () => setCompositionScene( scene.id ) );
    compositionSceneControls.appendChild( button );
}

setCompositionScene( defaultCompositionSceneId );
world.start( () => tree.render() );

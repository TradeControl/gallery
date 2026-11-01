import * as THREE from 'three';
import {
    cosmicCircuitryDefaults,
    createCastingPitWorld,
    createCosmicCircuitryLayer,
    createForgeSourceLayer,
    createGaussianMembrane,
    createSluiceGateLayer,
    forgeSourceDefaults,
    forgeSourceRanges,
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
world.orbitControls.maxDistance = 60;
const membrane = createGaussianMembrane( parameters );
const forge = createForgeSourceLayer( {
    parameters: forgeSourceDefaults,
    maxSources: 18
} );

function updateForgeReadouts()
{
    const snapshot = forge.getSnapshot();
    document.querySelector( '#composition-source-ring-state' ).value =
        `${snapshot.manifestedSourceCount}/${snapshot.sourceCount} sources`
        + ` · actual r ${snapshot.sourceRingRadius.toFixed( 2 )}`;
    document.querySelector( '#composition-source-heat-state' ).value =
        `${snapshot.activeSourceCount}/${snapshot.manifestedSourceCount} active`
        + ` · p ${snapshot.maximumPressure.toFixed( 2 )}`;
    document.querySelector( '#composition-source-event-state' ).value =
        `${snapshot.manifestedEmissionCount}`
        + ` / ${snapshot.emissionEventCount} manifested`;
}

function handleForgeSourceLayout( snapshot )
{
    forge.setSourceLayout( snapshot );
    updateForgeReadouts();
}

const universe = createSluiceGateLayer( {
    world,
    membrane,
    parameters,
    root: document.querySelector( '#composition-controls' ),
    controlPrefix: 'u-',
    moltenRenderOrder: 5,
    includeEnvironment: false,
    onSourceLayoutChange: handleForgeSourceLayout,
    onSourceEmission: forge.consumeEmission,
    getSourceHeatState: forge.getFieldState
} );
world.scene.add(
    universe.environment.diagnostic,
    universe.environment.hemisphereLight,
    universe.environment.keyLight,
    universe.environment.rimLight
);

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

const tree = createCompositionTree( {
    scene: world.scene,
    renderer: world.renderer,
    camera: world.camera,
    membrane,
    externalOccluders: [ universe.environment.membraneSurface ]
} );

const compositionSubstrate = createCompositionSubstrate( {
    scene: world.scene,
    membrane,
    plantingEnvelope: tree.plantingEnvelope
} );

const compositionTerrainDepth = createCompositionTerrainDepthOwner( {
    scene: world.scene,
    terrainSurface: universe.environment.membraneSurface
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
    'source-ring': {
        position: new THREE.Vector3( 0, 46, 26 ),
        target: new THREE.Vector3( 0, 0.9, 0 )
    }
};

let activeCameraViewId = 'composition';
function setCameraView( viewId )
{
    const view = cameraViews[viewId];
    if ( !view ) throw new Error( `Unknown camera view '${viewId}'.` );
    activeCameraViewId = viewId;
    world.setCameraView( view );
    document.querySelectorAll( '[data-view]' ).forEach( ( button ) => {
        const active = button.dataset.view === activeCameraViewId;
        button.classList.toggle( 'active', active );
        button.setAttribute( 'aria-pressed', active ? 'true' : 'false' );
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
        tree: false
    } ),
    tree: Object.freeze( {
        label: 'Tree planting baseline',
        universe: false,
        cosmos: false,
        tree: true
    } ),
    'universe-tree': Object.freeze( {
        label: 'Universe + Tree',
        universe: true,
        cosmos: false,
        tree: true
    } ),
    'cosmos-tree': Object.freeze( {
        label: 'Cosmos + Tree',
        universe: false,
        cosmos: true,
        tree: true
    } ),
    complete: Object.freeze( {
        label: 'Complete composition',
        universe: true,
        cosmos: true,
        tree: true
    } )
} );
let activeLayerModeId = 'complete';

function setLayerMode( modeId )
{
    const mode = layerModes[modeId];
    if ( !mode ) throw new Error( `Unknown composition mode '${modeId}'.` );
    activeLayerModeId = modeId;
    universe.setVisible( mode.universe );
    forge.setVisible(
        mode.universe
        && document.querySelector( '#composition-source-heat-visible' ).checked
    );
    cosmos.setVisible( mode.cosmos );
    tree.setVisible( mode.tree );
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

document.querySelector( '#composition-source-heat-visible' ).addEventListener(
    'change',
    ( event ) => {
        const mode = layerModes[activeLayerModeId];
        forge.setVisible( mode.universe && event.currentTarget.checked );
        updateForgeReadouts();
    }
);

const forgeRangeControls = Object.freeze( {
    'composition-heat-intensity': { property: 'heatIntensity', decimals: 2 },
    'composition-heat-reach': { property: 'heatReach', decimals: 2 },
    'composition-settling-time': { property: 'settlingTime', decimals: 2 }
} );

for ( const [ id, descriptor ] of Object.entries( forgeRangeControls ) )
{
    const control = document.querySelector( `#${id}` );
    const output = document.querySelector( `#${id}-value` );
    const range = forgeSourceRanges[descriptor.property];
    control.min = range.min;
    control.max = range.max;
    control.step = range.step;
    control.value = forgeSourceDefaults[descriptor.property];
    output.value = Number( control.value ).toFixed( descriptor.decimals );
    control.addEventListener( 'input', () => {
        const value = forge.setParameter(
            descriptor.property,
            Number( control.value )
        );
        output.value = value.toFixed( descriptor.decimals );
        updateForgeReadouts();
    } );
}

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
        forge.refreshSurface();
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
    forge.update( time );
    tree.update( time );
    compositionSubstrate.update( time );
    moltenContact.update( time );
    updateForgeReadouts();
    updateTreeReadouts();
} );

updateAnchorReadout();
updateTerrainDepthReadouts();
updateSubstrateReadouts();
setLayerMode( 'complete' );
document.querySelector( '#u-reset' ).addEventListener( 'click', () => {
    forge.clearActivity();
    updateForgeReadouts();
} );
setCameraView( 'composition' );
world.start( () => tree.render() );

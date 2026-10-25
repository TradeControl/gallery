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
import {
    createDarkMatterSea,
    darkMatterSeaDefaults,
    darkMatterSeaRanges
} from './dark-matter-sea.js';
import { createCompositionMoltenContact } from './molten-contact.js';

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

const universe = createSluiceGateLayer( {
    world,
    membrane,
    parameters,
    root: document.querySelector( '#universe-controls' ),
    controlPrefix: 'u-',
    moltenRenderOrder: 5
} );

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

const darkMatterSea = createDarkMatterSea( {
    scene: world.scene,
    membrane,
    plantingEnvelope: tree.plantingEnvelope
} );

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
    substrate: {
        position: new THREE.Vector3( 20, 2.8, 25 ),
        target: new THREE.Vector3( 0, -2.3, 0 )
    },
    subterrain: {
        position: new THREE.Vector3( 6, -8.5, 9.5 ),
        target: new THREE.Vector3( 0, -5.7, 0 )
    }
};

document.querySelectorAll( '[data-view]' ).forEach( ( button ) => {
    button.addEventListener( 'click', () => {
        world.setCameraView( cameraViews[button.dataset.view] );
    } );
} );

const layerModes = Object.freeze( {
    substrate: Object.freeze( {
        label: 'Dark-matter sea alone',
        terrain: false,
        universe: false,
        cosmos: false,
        tree: false,
        substrate: true
    } ),
    'terrain-substrate': Object.freeze( {
        label: 'Terrain + dark-matter sea',
        terrain: true,
        universe: false,
        cosmos: false,
        tree: false,
        substrate: true
    } ),
    pit: Object.freeze( {
        label: 'Casting Pit only',
        terrain: true,
        universe: true,
        cosmos: true,
        tree: false,
        substrate: false
    } ),
    tree: Object.freeze( {
        label: 'Tree planting baseline',
        terrain: true,
        universe: false,
        cosmos: false,
        tree: true,
        substrate: false
    } ),
    'tree-substrate': Object.freeze( {
        label: 'Tree + dark-matter sea',
        terrain: true,
        universe: false,
        cosmos: false,
        tree: true,
        substrate: true
    } ),
    'universe-tree': Object.freeze( {
        label: 'Universe + Tree',
        terrain: true,
        universe: true,
        cosmos: false,
        tree: true,
        substrate: false
    } ),
    'cosmos-tree': Object.freeze( {
        label: 'Cosmos + Tree',
        terrain: true,
        universe: false,
        cosmos: true,
        tree: true,
        substrate: false
    } ),
    'complete-baseline': Object.freeze( {
        label: 'Pre-substrate complete comparison',
        terrain: true,
        universe: true,
        cosmos: true,
        tree: true,
        substrate: false
    } ),
    complete: Object.freeze( {
        label: 'Complete composition',
        terrain: true,
        universe: true,
        cosmos: true,
        tree: true,
        substrate: true
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
    darkMatterSea.setVisible( mode.substrate );
    const isolatedSubstrate = modeId === 'substrate';
    universe.environment.hemisphereLight.visible = !isolatedSubstrate;
    universe.environment.keyLight.visible = !isolatedSubstrate;
    universe.environment.rimLight.visible = !isolatedSubstrate;
    universe.environment.membraneSurface.visible = mode.terrain;
    universe.environment.receiver.visible = mode.terrain && mode.universe;
    universe.environment.diagnostic.visible = mode.terrain
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
    universe.environment.diagnostic.visible = mode.terrain
        && event.currentTarget.checked;
} );

const darkMatterControls = Object.freeze( {
    'dark-matter-level': {
        property: 'outerDepth',
        decimals: 2
    },
    'dark-matter-relief': {
        property: 'relief',
        decimals: 2
    },
    'dark-matter-drift': {
        property: 'drift',
        decimals: 2
    },
    'dark-matter-reveal': {
        property: 'grazingReveal',
        decimals: 2
    }
} );

function displayDarkMatterControlValue( id, descriptor, value )
{
    document.querySelector( `#${id}-value` ).value = Number( value ).toFixed(
        descriptor.decimals
    );
}

function updateDarkMatterReadouts()
{
    const state = darkMatterSea.getSnapshot();
    if ( !state ) return;
    document.querySelector( '#dark-matter-boundary' ).value =
        `${state.depthSource} · ${state.deepMediumDepth.toFixed( 2 )}`
        + ` + ${state.guaranteedDeepClearance.toFixed( 2 )}`;
    document.querySelector( '#dark-matter-extent' ).value =
        `${state.extent.toFixed( 0 )} across · sunk perimeter`;
    document.querySelector( '#dark-matter-construction' ).value =
        `${state.broadPressureModeCount} mass + `
        + `${state.finePressureModeCount} light · 0 textures`;
}

for ( const [ id, descriptor ] of Object.entries( darkMatterControls ) )
{
    const control = document.querySelector( `#${id}` );
    const range = darkMatterSeaRanges[descriptor.property];
    control.min = range.min;
    control.max = range.max;
    control.step = range.step;
    control.value = darkMatterSea.parameters[descriptor.property];
    control.addEventListener( 'input', () => {
        const value = darkMatterSea.setParameter(
            descriptor.property,
            Number( control.value )
        );
        displayDarkMatterControlValue( id, descriptor, value );
        updateDarkMatterReadouts();
    } );
    displayDarkMatterControlValue(
        id,
        descriptor,
        darkMatterSea.parameters[descriptor.property]
    );
}

document.querySelector( '#dark-matter-reset' ).addEventListener( 'click', () => {
    darkMatterSea.reset();
    for ( const [ id, descriptor ] of Object.entries( darkMatterControls ) )
    {
        const value = darkMatterSeaDefaults[descriptor.property];
        document.querySelector( `#${id}` ).value = value;
        displayDarkMatterControlValue( id, descriptor, value );
    }
    updateDarkMatterReadouts();
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
    darkMatterSea.updateSurface();
    updateDarkMatterReadouts();
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
    tree.update( time );
    darkMatterSea.update( time );
    moltenContact.update( time );
    updateTreeReadouts();
} );

updateAnchorReadout();
setLayerMode( 'complete' );
world.setCameraView( cameraViews.composition );
world.start( () => tree.render() );

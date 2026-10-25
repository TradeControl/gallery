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
    treePlacementDefaults
} from './tree-instance.js';

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
    }
};

document.querySelectorAll( '[data-view]' ).forEach( ( button ) => {
    button.addEventListener( 'click', () => {
        world.setCameraView( cameraViews[button.dataset.view] );
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
        label: 'Tree in the shared field',
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

function setLayerMode( modeId )
{
    const mode = layerModes[modeId];
    if ( !mode ) throw new Error( `Unknown composition mode '${modeId}'.` );
    universe.setVisible( mode.universe );
    cosmos.setVisible( mode.cosmos );
    tree.setVisible( mode.tree );
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
}

for ( const [ id, descriptor ] of Object.entries( placementControls ) )
{
    const control = document.querySelector( `#${id}` );
    control.addEventListener( 'input', () => {
        const value = Number( control.value );
        tree.setPlacementValue( descriptor.property, value );
        document.querySelector( `#${id}-value` ).value = descriptor.format
            ? descriptor.format( value )
            : value.toFixed( descriptor.decimals );
        updateAnchorReadout();
    } );
}

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
}

world.addFrameCallback( ( time ) => {
    tree.update( time );
    updateTreeReadouts();
} );

updateAnchorReadout();
setLayerMode( 'complete' );
world.setCameraView( cameraViews.composition );
world.start( () => tree.render() );

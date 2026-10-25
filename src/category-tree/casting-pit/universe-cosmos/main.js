import {
    bindCameraControls,
    castingPitCameraViews,
    cosmicCircuitryDefaults,
    createCastingPitWorld,
    createCosmicCircuitryLayer,
    createGaussianMembrane,
    createSluiceGateLayer,
    sluiceGateDefaults
} from '../../../lib/casting-pit/index.js';

const parameters = {
    ...cosmicCircuitryDefaults,
    ...sluiceGateDefaults,
    depth: sluiceGateDefaults.depth,
    width: sluiceGateDefaults.width,
    surfaceBinding: 1
};

const world = createCastingPitWorld( document.querySelector( '#scene' ), { background: 0x050607 } );
const membrane = createGaussianMembrane( parameters );

const universe = createSluiceGateLayer( {
    world,
    membrane,
    parameters,
    root: document.querySelector( '#universe-controls' ),
    controlPrefix: 'u-',
    moltenRenderOrder: 5,
    includeEnvironment: false
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

for ( const controlId of [ 'u-depth', 'u-width' ] )
{
    document.querySelector( `#${controlId}` ).addEventListener( 'input', cosmos.updateSurface );
}

const modeNames = {
    universe: 'Universe only',
    cosmos: 'Cosmos only',
    combined: 'Universe + Cosmos'
};

function setLayerMode( mode )
{
    universe.setVisible( mode !== 'cosmos' );
    cosmos.setVisible( mode !== 'universe' );
    document.querySelector( '#active-mode' ).value = modeNames[mode];
    document.querySelectorAll( '[data-layer-mode]' ).forEach( ( button ) => {
        button.classList.toggle( 'active', button.dataset.layerMode === mode );
        button.setAttribute( 'aria-pressed', button.dataset.layerMode === mode ? 'true' : 'false' );
    } );
}

document.querySelectorAll( '[data-layer-mode]' ).forEach( ( button ) => {
    button.addEventListener( 'click', () => setLayerMode( button.dataset.layerMode ) );
} );

bindCameraControls( document, world, castingPitCameraViews );
setLayerMode( 'combined' );
world.setCameraView( castingPitCameraViews.elevated );
world.start();

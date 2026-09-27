import {
    bindCameraControls,
    castingPitCameraViews,
    cosmicCircuitryDefaults,
    createCastingPitWorld,
    createCosmicCircuitryLayer,
    createGaussianMembrane
} from '../../../lib/casting-pit/index.js';

const parameters = { ...cosmicCircuitryDefaults };
const world = createCastingPitWorld( document.querySelector( '#scene' ), { background: 0x030405 } );
const membrane = createGaussianMembrane( parameters );

createCosmicCircuitryLayer( { world, membrane, parameters, root: document } );
bindCameraControls( document, world, castingPitCameraViews );
world.setCameraView( castingPitCameraViews.elevated );
world.start();

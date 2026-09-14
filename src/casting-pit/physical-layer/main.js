import {
    bindCameraControls,
    castingPitCameraViews,
    createCastingPitWorld,
    createGaussianMembrane,
    createSluiceGateLayer,
    sluiceGateDefaults
} from '../../lib/casting-pit/index.js';

const parameters = { ...sluiceGateDefaults };
const world = createCastingPitWorld( document.querySelector( '#scene' ), { background: 0x050607 } );
const membrane = createGaussianMembrane( parameters );

createSluiceGateLayer( { world, membrane, parameters, root: document } );
bindCameraControls( document, world, castingPitCameraViews );
world.setCameraView( castingPitCameraViews.elevated );
world.start();

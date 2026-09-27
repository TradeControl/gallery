import {
    bindCameraControls,
    bindRangeControl,
    castingPitCameraViews,
    createCastingPitWorld,
    sluiceGateDefaults
} from '../../../../lib/casting-pit/index.js';
import { createErodedThroatMembrane } from '../lib/universe/eroded-throat-membrane.js';
import { createSluiceGateLayer } from '../lib/universe/sluice-gate-layer.js';

const parameters = {
    ...sluiceGateDefaults,
    mouthScale: 0.82,
    backgroundErosion: 0.72,
    flowImprint: 0.78,
    throatConstriction: 0.62,
    throatDepth: 2.25,
    historySeed: 1
};

const world = createCastingPitWorld( document.querySelector( '#scene' ), { background: 0x050607 } );
const membrane = createErodedThroatMembrane( parameters );
let physicalLayer;

physicalLayer = createSluiceGateLayer( {
    world,
    membrane,
    parameters,
    root: document,
    onGateLayoutChange( gates ) {
        membrane.setHistoricalApproaches( gates );
        if ( physicalLayer ) physicalLayer.updateSurface();
    }
} );

function bindThroatControl( inputId, outputId, property, decimals = 2 )
{
    bindRangeControl( document, inputId, outputId, ( value ) => {
        parameters[property] = value;
        physicalLayer.updateSurface();
    }, decimals );
}

bindThroatControl( 'mouth-scale', 'mouth-scale-value', 'mouthScale' );
bindThroatControl( 'background-erosion', 'background-erosion-value', 'backgroundErosion' );
bindThroatControl( 'flow-imprint', 'flow-imprint-value', 'flowImprint' );
bindThroatControl( 'throat-constriction', 'throat-constriction-value', 'throatConstriction' );
bindThroatControl( 'throat-depth', 'throat-depth-value', 'throatDepth' );

const historySeedOutput = document.querySelector( '#history-seed-value' );
document.querySelector( '#reseed-history' ).addEventListener( 'click', () => {
    parameters.historySeed += 1;
    historySeedOutput.value = parameters.historySeed.toString();
    membrane.reseedHistory();
    physicalLayer.updateSurface();
} );

bindCameraControls( document, world, castingPitCameraViews );
world.setCameraView( castingPitCameraViews.elevated );
world.start();


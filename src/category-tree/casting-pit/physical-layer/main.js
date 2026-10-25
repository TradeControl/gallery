import * as THREE from 'three';
import {
    castingPitCameraViews,
    createCastingPitWorld,
    createForgeSourceLayer,
    createGaussianMembrane,
    createSluiceGateLayer,
    forgeSourceDefaults,
    forgeSourceRanges,
    sluiceGateDefaults
} from '../../../lib/casting-pit/index.js';

const parameters = { ...sluiceGateDefaults };
const world = createCastingPitWorld( document.querySelector( '#scene' ), { background: 0x050607 } );
world.orbitControls.maxDistance = 50;
const membrane = createGaussianMembrane( parameters );
const forge = createForgeSourceLayer( {
    maxSources: 18
} );

const forgeSourceCameraView = {
    position: new THREE.Vector3( 0, 5.6, 18 ),
    target: new THREE.Vector3( 0, 1.4, 12 )
};
const forgeRingCameraView = {
    position: new THREE.Vector3( 0, 17, 20 ),
    target: new THREE.Vector3( 0, 0.9, 0 )
};
const cameraViews = {
    ...castingPitCameraViews,
    'forge-ring': forgeRingCameraView,
    'forge-source': forgeSourceCameraView
};
let activeCameraView = 'forge-ring';
let latestSourceLayout = null;
let readoutElapsed = 0;
let previousReadoutTime = null;

function selectedSource()
{
    return forge.getSources().find(
        ( source ) => source.sourceIndex === forge.parameters.selectedSourceIndex
    ) ?? null;
}

function refreshForgeCameras()
{
    const source = selectedSource();
    if ( source )
    {
        const [ x, z ] = source.position;
        const [ directionX, directionZ ] = source.direction;
        const lateralX = -directionZ;
        const lateralZ = directionX;
        const sourceHeight = membrane.height( x, z );
        forgeSourceCameraView.position.set(
            x - directionX * 8 + lateralX * 1.8,
            sourceHeight + 6.8,
            z - directionZ * 8 + lateralZ * 1.8
        );
        forgeSourceCameraView.target.set(
            x + directionX * 0.75,
            sourceHeight + 1.8,
            z + directionZ * 0.75
        );
    }
    const ringRadius = Math.max(
        forge.getSnapshot().maximumSourceRadius,
        parameters.sourceRadius
    );
    forgeRingCameraView.position.set(
        0,
        Math.max( 16, ringRadius * 1.55 ),
        Math.max( 21, ringRadius * 1.85 )
    );
    forgeRingCameraView.target.set( 0, 0.9, 0 );
    if ( activeCameraView === 'forge-source' && source )
    {
        world.setCameraView( forgeSourceCameraView );
    }
    else if ( activeCameraView === 'forge-ring' )
    {
        world.setCameraView( forgeRingCameraView );
    }
}

function setCameraView( viewId )
{
    const view = cameraViews[viewId];
    if ( !view ) throw new Error( `Unknown Casting Pit camera '${viewId}'.` );
    activeCameraView = viewId;
    if ( viewId === 'forge-source' || viewId === 'forge-ring' )
    {
        refreshForgeCameras();
    }
    else world.setCameraView( view );
    document.querySelectorAll( '[data-view]' ).forEach( ( button ) => {
        const active = button.dataset.view === viewId;
        button.classList.toggle( 'active', active );
        button.setAttribute( 'aria-pressed', active ? 'true' : 'false' );
    } );
}

function updateForgeReadouts()
{
    const snapshot = forge.getSnapshot();
    const source = selectedSource();
    document.querySelector( '#forge-selected-readout' ).value = source
        ? `${source.label} · ${snapshot.selectedSourceIndex + 1}/${snapshot.sourceCount}`
        : 'no source';
    document.querySelector( '#forge-heat-readout' ).value =
        `${snapshot.activeSourceCount}/${snapshot.manifestedSourceCount} active`
        + ` · p ${snapshot.maximumPressure.toFixed( 2 )}`;
    document.querySelector( '#forge-emission-readout' ).value =
        `${snapshot.manifestedEmissionCount}/${snapshot.emissionEventCount} manifested`;
    document.querySelector( '#forge-ring-readout' ).value =
        `${snapshot.manifestedSourceCount}/${snapshot.sourceCount} sources`
        + ` · r ${snapshot.sourceRingRadius.toFixed( 2 )}`;
}

function setForgeMode( mode )
{
    forge.setMode( mode );
    document.querySelectorAll( '[data-forge-mode]' ).forEach( ( button ) => {
        const active = button.dataset.forgeMode === mode;
        button.classList.toggle( 'active', active );
        button.setAttribute( 'aria-pressed', active ? 'true' : 'false' );
    } );
    updateForgeReadouts();
}

function handleSourceLayout( snapshot )
{
    latestSourceLayout = snapshot;
    forge.setSourceLayout( snapshot );
    const control = document.querySelector( '#forge-source-index' );
    control.max = Math.max( 1, snapshot.sources.length );
    const selected = Math.min(
        forge.parameters.selectedSourceIndex,
        Math.max( 0, snapshot.sources.length - 1 )
    );
    forge.setSelectedSourceIndex( selected );
    control.value = selected + 1;
    document.querySelector( '#forge-source-index-value' ).value =
        `${selected + 1} / ${snapshot.sources.length}`;
    refreshForgeCameras();
    updateForgeReadouts();
}

const universe = createSluiceGateLayer( {
    world,
    membrane,
    parameters,
    root: document,
    onSourceLayoutChange: handleSourceLayout,
    onSourceEmission: forge.consumeEmission,
    getSourceHeatState: forge.getFieldState,
    includeEnvironment: false
} );
world.scene.add(
    universe.environment.diagnostic,
    universe.environment.hemisphereLight,
    universe.environment.keyLight,
    universe.environment.rimLight
);

const forgeControls = Object.freeze( {
    'forge-heat-intensity': Object.freeze( {
        property: 'heatIntensity',
        decimals: 2
    } ),
    'forge-heat-reach': Object.freeze( {
        property: 'heatReach',
        decimals: 2
    } ),
    'forge-settling-time': Object.freeze( {
        property: 'settlingTime',
        decimals: 2
    } )
} );

for ( const [ id, descriptor ] of Object.entries( forgeControls ) )
{
    const control = document.querySelector( `#${id}` );
    const output = document.querySelector( `#${id}-value` );
    const range = forgeSourceRanges[descriptor.property];
    control.min = range.min;
    control.max = range.max;
    control.step = range.step;
    control.value = forgeSourceDefaults[descriptor.property];
    output.value = forgeSourceDefaults[descriptor.property].toFixed(
        descriptor.decimals
    );
    control.addEventListener( 'input', () => {
        const value = forge.setParameter(
            descriptor.property,
            Number( control.value )
        );
        output.value = value.toFixed( descriptor.decimals );
        updateForgeReadouts();
    } );
}

document.querySelectorAll( '[data-forge-mode]' ).forEach( ( button ) => {
    button.addEventListener( 'click', () => setForgeMode(
        button.dataset.forgeMode
    ) );
} );

document.querySelector( '#forge-source-index' ).addEventListener(
    'input',
    ( event ) => {
        const selected = Number( event.currentTarget.value ) - 1;
        forge.setSelectedSourceIndex( selected );
        document.querySelector( '#forge-source-index-value' ).value =
            `${selected + 1} / ${latestSourceLayout?.sources.length ?? 0}`;
        refreshForgeCameras();
        updateForgeReadouts();
    }
);

document.querySelectorAll( '[data-view]' ).forEach( ( button ) => {
    button.addEventListener( 'click', () => setCameraView(
        button.dataset.view
    ) );
} );

for ( const id of [ 'depth', 'width' ] )
{
    document.querySelector( `#${id}` ).addEventListener( 'input', () => {
        forge.refreshSurface();
        refreshForgeCameras();
    } );
}
document.querySelector( '#reset' ).addEventListener(
    'click',
    () => forge.clearActivity()
);

world.addFrameCallback( ( time ) => {
    forge.update( time );
    if ( previousReadoutTime === null ) previousReadoutTime = time;
    readoutElapsed += Math.min( ( time - previousReadoutTime ) / 1000, 0.1 );
    previousReadoutTime = time;
    if ( readoutElapsed >= 0.25 )
    {
        updateForgeReadouts();
        readoutElapsed = 0;
    }
} );

setForgeMode( forgeSourceDefaults.mode );
setCameraView( 'forge-ring' );
updateForgeReadouts();
world.start();

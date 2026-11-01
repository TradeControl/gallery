import * as THREE from 'three';
import {
    castingPitCameraViews,
    createCastingPitWorld,
    createGaussianMembrane,
    createSluiceGateLayer,
    sluiceGateDefaults
} from '../../../lib/casting-pit/index.js';

const parameters = { ...sluiceGateDefaults };
const world = createCastingPitWorld( document.querySelector( '#scene' ), { background: 0x050607 } );
world.orbitControls.maxDistance = 75;
const membrane = createGaussianMembrane( parameters );

const confluenceCameraView = {
    position: new THREE.Vector3( 0, 8.5, 23 ),
    target: new THREE.Vector3( 0, 1.2, 13 )
};
const clusterCameraView = {
    position: new THREE.Vector3( 0, 28, 37 ),
    target: new THREE.Vector3( 0, 0.9, 19 )
};
const capillaryFieldCameraView = {
    position: new THREE.Vector3( 0, 34, 42 ),
    target: new THREE.Vector3( 0, 0.9, 0 )
};
const cameraViews = {
    ...castingPitCameraViews,
    cluster: clusterCameraView,
    'capillary-field': capillaryFieldCameraView,
    confluence: confluenceCameraView
};
let activeCameraView = 'cluster';
let latestSourceLayout = null;
let selectedSourceIndex = 0;
let capillaryReviewMode = 'cluster';
let readoutElapsed = 0;
let previousReadoutTime = null;
let universe = null;

function selectedSource()
{
    return latestSourceLayout?.sources.find(
        ( source ) => source.sourceIndex === selectedSourceIndex
    ) ?? null;
}

function refreshCapillaryCameras()
{
    const source = selectedSource();
    const capillarySnapshot = universe?.getCapillarySnapshot();
    const domainRadius = capillarySnapshot?.domain.radius ?? 27;
    if ( source )
    {
        const [ x, z ] = source.position;
        const [ directionX, directionZ ] = source.direction;
        const lateralX = -directionZ;
        const lateralZ = directionX;
        const sourceHeight = membrane.height( x, z );
        const sourceRadius = Math.max( Math.hypot( x, z ), 0.001 );
        const outwardX = x / sourceRadius;
        const outwardZ = z / sourceRadius;
        const clusterTargetOffset = Math.max(
            4.5,
            ( domainRadius - sourceRadius ) * 0.48
        );
        const clusterTargetX = x + outwardX * clusterTargetOffset;
        const clusterTargetZ = z + outwardZ * clusterTargetOffset;
        confluenceCameraView.position.set(
            x - directionX * 5.5 + lateralX * 8.5,
            sourceHeight + 8.2,
            z - directionZ * 5.5 + lateralZ * 8.5
        );
        confluenceCameraView.target.set(
            x - directionX * 1.5,
            sourceHeight + 1.2,
            z - directionZ * 1.5
        );
        clusterCameraView.position.set(
            clusterTargetX + outwardX * 18,
            sourceHeight + 28,
            clusterTargetZ + outwardZ * 18
        );
        clusterCameraView.target.set(
            clusterTargetX,
            sourceHeight + 0.9,
            clusterTargetZ
        );
    }
    capillaryFieldCameraView.position.set(
        0,
        Math.max( 30, domainRadius * 1.2 ),
        Math.max( 38, domainRadius * 1.55 )
    );
    capillaryFieldCameraView.target.set( 0, 0.9, 0 );
    if ( activeCameraView === 'confluence' && source )
    {
        world.setCameraView( confluenceCameraView );
    }
    else if ( activeCameraView === 'cluster' && source )
    {
        world.setCameraView( clusterCameraView );
    }
    else if ( activeCameraView === 'capillary-field' )
    {
        world.setCameraView( capillaryFieldCameraView );
    }
}

function setCameraView( viewId )
{
    const view = cameraViews[viewId];
    if ( !view ) throw new Error( `Unknown Casting Pit camera '${viewId}'.` );
    activeCameraView = viewId;
    if (
        viewId === 'confluence'
        || viewId === 'cluster'
        || viewId === 'capillary-field'
    )
    {
        refreshCapillaryCameras();
    }
    else world.setCameraView( view );
    document.querySelectorAll( '[data-view]' ).forEach( ( button ) => {
        const active = button.dataset.view === viewId;
        button.classList.toggle( 'active', active );
        button.setAttribute( 'aria-pressed', active ? 'true' : 'false' );
    } );
}

function updateCapillaryReadouts()
{
    if ( !universe ) return;
    const snapshot = universe.getCapillarySnapshot();
    const source = selectedSource();
    const selectedTributaryCount = snapshot.selectedTributaries?.length ?? 0;
    const sourceCount = Number.isFinite( snapshot.sourceCount )
        ? snapshot.sourceCount
        : latestSourceLayout?.sources.length ?? 0;
    const activeSourceCount = Array.isArray( snapshot.activeSourceIndices )
        ? snapshot.activeSourceIndices.length
        : snapshot.activeSourceCount ?? 0;
    const activePrimaryTrunkCount = Number.isFinite( snapshot.activePrimaryTrunkCount )
        ? snapshot.activePrimaryTrunkCount
        : activeSourceCount;
    const activeTerminalCapillaryCount = Number.isFinite( snapshot.activeTerminalCapillaryCount )
        ? snapshot.activeTerminalCapillaryCount
        : snapshot.activeTributaryCount ?? selectedTributaryCount;
    const measuredMassBalance = Number.isFinite( snapshot.massBalance )
        ? snapshot.massBalance
        : 0;
    const massBalance = Math.abs( measuredMassBalance ) < 0.0005
        ? 0
        : measuredMassBalance;
    const massBalanceText = `${massBalance >= 0 ? '+' : ''}${massBalance.toFixed( 3 )}`;
    document.querySelector( '#capillary-selected-readout' ).value = source
        ? `${source.label} · ${snapshot.selectedSourceIndex + 1}/${sourceCount}`
        : 'no confluence';
    document.querySelector( '#capillary-branch-readout' ).value =
        `${activePrimaryTrunkCount} trunks → ${activeTerminalCapillaryCount} tips`
        + ` · ${activeSourceCount}/${sourceCount} feeds`;
    document.querySelector( '#capillary-parcel-readout' ).value =
        `${snapshot.activeCapillaryParcelCount} travelling`;
    document.querySelector( '#capillary-handoff-readout' ).value =
        `${snapshot.confluenceEventCount}/${snapshot.inletEmissionCount} accepted`;
    document.querySelector( '#capillary-mass-readout' ).value =
        `Δ ${massBalanceText} · synthetic ${snapshot.syntheticMass}`;
    document.querySelector( '#capillary-domain-readout' ).value =
        `${snapshot.domain.size} × ${snapshot.domain.size}`
        + ` · ${snapshot.domain.resolution}²`;
}

function setCapillaryMode( mode )
{
    capillaryReviewMode = universe.setCapillaryReviewMode( mode );
    document.querySelectorAll( '[data-capillary-mode]' ).forEach( ( button ) => {
        const active = button.dataset.capillaryMode === capillaryReviewMode;
        button.classList.toggle( 'active', active );
        button.setAttribute( 'aria-pressed', active ? 'true' : 'false' );
    } );
    refreshCapillaryCameras();
    updateCapillaryReadouts();
}

function handleSourceLayout( snapshot )
{
    latestSourceLayout = snapshot;
    const control = document.querySelector( '#capillary-source-index' );
    control.max = Math.max( 1, snapshot.sources.length );
    selectedSourceIndex = Math.min(
        selectedSourceIndex,
        Math.max( 0, snapshot.sources.length - 1 )
    );
    control.value = selectedSourceIndex + 1;
    document.querySelector( '#capillary-source-index-value' ).value =
        `${selectedSourceIndex + 1} / ${snapshot.sources.length}`;
    if ( universe )
    {
        universe.setSelectedCapillarySourceIndex( selectedSourceIndex );
        updateCapillaryReadouts();
    }
    refreshCapillaryCameras();
}

universe = createSluiceGateLayer( {
    world,
    membrane,
    parameters,
    root: document,
    onSourceLayoutChange: handleSourceLayout,
    includeEnvironment: false,
    capillaryNetwork: {
        enabled: true,
        reviewMode: capillaryReviewMode,
        selectedSourceIndex
    }
} );
world.scene.add(
    universe.environment.diagnostic,
    universe.environment.hemisphereLight,
    universe.environment.keyLight,
    universe.environment.rimLight
);

document.querySelectorAll( '[data-capillary-mode]' ).forEach( ( button ) => {
    button.addEventListener( 'click', () => setCapillaryMode(
        button.dataset.capillaryMode
    ) );
} );

document.querySelector( '#capillary-source-index' ).addEventListener(
    'input',
    ( event ) => {
        selectedSourceIndex = universe.setSelectedCapillarySourceIndex(
            Number( event.currentTarget.value ) - 1
        );
        document.querySelector( '#capillary-source-index-value' ).value =
            `${selectedSourceIndex + 1} / ${latestSourceLayout?.sources.length ?? 0}`;
        refreshCapillaryCameras();
        updateCapillaryReadouts();
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
        refreshCapillaryCameras();
    } );
}

world.addFrameCallback( ( time ) => {
    if ( previousReadoutTime === null ) previousReadoutTime = time;
    readoutElapsed += Math.min( ( time - previousReadoutTime ) / 1000, 0.1 );
    previousReadoutTime = time;
    if ( readoutElapsed >= 0.25 )
    {
        updateCapillaryReadouts();
        readoutElapsed = 0;
    }
} );

setCapillaryMode( capillaryReviewMode );
universe.setSelectedCapillarySourceIndex( selectedSourceIndex );
setCameraView( 'cluster' );
updateCapillaryReadouts();
world.start();

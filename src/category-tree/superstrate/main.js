import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
    createEmergentSuperstrateLayer,
    superstrateDefaults,
    superstrateFieldViews,
    superstrateRanges
} from '../../lib/superstrate/index.js';

const sceneElement = document.querySelector( '#scene' );
const controlsPanel = document.querySelector( '#superstrate-controls' );
const controlsToggle = document.querySelector( '#controls-toggle' );
const scene = new THREE.Scene();
scene.background = new THREE.Color( 0x000103 );

const camera = new THREE.PerspectiveCamera( 50, 1, 0.1, 200 );
const renderer = new THREE.WebGLRenderer( {
    antialias: true,
    powerPreference: 'high-performance'
} );
renderer.setPixelRatio( Math.min( window.devicePixelRatio, 1.75 ) );
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
sceneElement.appendChild( renderer.domElement );

const orbitControls = new OrbitControls( camera, renderer.domElement );
orbitControls.enableDamping = true;
orbitControls.dampingFactor = 0.06;
orbitControls.enablePan = false;
orbitControls.enableZoom = false;
orbitControls.rotateSpeed = 0.24;

const viewDirections = Object.freeze( {
    composition: new THREE.Vector3( -0.28, 0.12, -1 ),
    veil: new THREE.Vector3( -0.64, 0.27, -1 ),
    void: new THREE.Vector3( 0.74, 0.08, -1 )
} );

function setView( viewId )
{
    const direction = viewDirections[viewId];
    if ( !direction ) throw new Error( `Unknown superstrate view '${viewId}'.` );
    camera.position.set( 0, 0, 0 );
    orbitControls.target.copy( direction ).normalize();
    camera.lookAt( orbitControls.target );
    orbitControls.update();
    document.querySelectorAll( '[data-view]' ).forEach( ( button ) => {
        const active = button.dataset.view === viewId;
        button.classList.toggle( 'active', active );
        button.setAttribute( 'aria-pressed', active ? 'true' : 'false' );
    } );
}

const superstrate = createEmergentSuperstrateLayer( {
    scene,
    observer: camera
} );

const controlDescriptors = Object.freeze( {
    presence: Object.freeze( { property: 'presence', decimals: 2 } ),
    breath: Object.freeze( { property: 'breath', decimals: 2 } ),
    coherence: Object.freeze( { property: 'coherence', decimals: 2 } ),
    confluence: Object.freeze( { property: 'confluence', decimals: 2 } ),
    'substrate-magnet': Object.freeze( {
        property: 'substrateMagnet',
        decimals: 2
    } ),
    'physical-magnet': Object.freeze( {
        property: 'physicalMagnet',
        decimals: 2
    } ),
    'information-magnet': Object.freeze( {
        property: 'informationMagnet',
        decimals: 2
    } ),
    'living-magnet': Object.freeze( {
        property: 'livingMagnet',
        decimals: 2
    } )
} );

function setControlPresentation( id, descriptor, value )
{
    document.querySelector( `#${id}` ).value = value;
    document.querySelector( `#${id}-value` ).value = Number( value ).toFixed(
        descriptor.decimals
    );
}

for ( const [ id, descriptor ] of Object.entries( controlDescriptors ) )
{
    const control = document.querySelector( `#${id}` );
    const range = superstrateRanges[descriptor.property];
    control.min = range.min;
    control.max = range.max;
    control.step = range.step;
    setControlPresentation(
        id,
        descriptor,
        superstrateDefaults[descriptor.property]
    );
    control.addEventListener( 'input', () => {
        const value = superstrate.setParameter(
            descriptor.property,
            Number( control.value )
        );
        setControlPresentation( id, descriptor, value );
    } );
}

document.querySelector( '#freeze-emergence' ).addEventListener(
    'change',
    ( event ) => superstrate.setFrozen( event.currentTarget.checked )
);
document.querySelectorAll( '[data-view]' ).forEach( ( button ) => {
    button.addEventListener( 'click', () => setView( button.dataset.view ) );
} );

function setFieldView( viewId )
{
    superstrate.setFieldView( viewId );
    document.querySelectorAll( '[data-field-view]' ).forEach( ( button ) => {
        const active = button.dataset.fieldView === viewId;
        button.classList.toggle( 'active', active );
        button.setAttribute( 'aria-pressed', active ? 'true' : 'false' );
    } );
}

document.querySelectorAll( '[data-field-view]' ).forEach( ( button ) => {
    button.addEventListener( 'click', () => setFieldView(
        button.dataset.fieldView
    ) );
} );

function setControlsCollapsed( collapsed )
{
    document.body.classList.toggle( 'controls-collapsed', collapsed );
    controlsPanel.inert = collapsed;
    controlsPanel.setAttribute( 'aria-hidden', collapsed ? 'true' : 'false' );
    controlsToggle.setAttribute( 'aria-expanded', collapsed ? 'false' : 'true' );
    controlsToggle.setAttribute(
        'aria-label',
        collapsed ? 'Show controls' : 'Hide controls'
    );
    controlsToggle.textContent = collapsed ? '›' : '‹';
}

controlsToggle.addEventListener( 'click', () => {
    setControlsCollapsed( !document.body.classList.contains(
        'controls-collapsed'
    ) );
} );

document.querySelector( '#reset' ).addEventListener( 'click', () => {
    superstrate.reset();
    for ( const [ id, descriptor ] of Object.entries( controlDescriptors ) )
    {
        setControlPresentation(
            id,
            descriptor,
            superstrateDefaults[descriptor.property]
        );
    }
    document.querySelector( '#freeze-emergence' ).checked = false;
    setFieldView( 'complete' );
    setView( 'composition' );
} );

const snapshot = superstrate.getSnapshot();
document.querySelector( '#field-stats' ).value =
    `${snapshot.sourceFieldCount} sources · ${snapshot.confluenceFieldCount} confluence · ${snapshot.drawCallCount} draw`;

function resize()
{
    const width = sceneElement.clientWidth;
    const height = sceneElement.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio( Math.min( window.devicePixelRatio, 1.75 ) );
    renderer.setSize( width, height );
}

function animate( time )
{
    superstrate.update( time, camera );
    orbitControls.update();
    document.querySelector( '#phase-value' ).value =
        superstrate.getPhase().toFixed( 2 );
    document.querySelector( '#pulse-value' ).value =
        superstrate.getPulse().toFixed( 2 );
    renderer.render( scene, camera );
}

window.addEventListener( 'resize', resize );
window.addEventListener( 'pagehide', () => {
    renderer.setAnimationLoop( null );
    superstrate.dispose();
    renderer.dispose();
}, { once: true } );

setControlsCollapsed( false );
if ( Object.keys( superstrateFieldViews ).length !== 6 )
{
    throw new Error( 'The superstrate field-view contract is incomplete.' );
}
setFieldView( 'complete' );
setView( 'composition' );
resize();
renderer.setAnimationLoop( animate );

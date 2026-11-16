import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
    createEnergeticSeaLayer,
    energeticSeaDefaults,
    energeticSeaRanges
} from '../../lib/substrate/index.js';

const sceneElement = document.querySelector( '#scene' );
const scene = new THREE.Scene();
scene.background = new THREE.Color( 0x02060a );

const camera = new THREE.PerspectiveCamera( 48, 1, 0.1, 140 );
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
orbitControls.dampingFactor = 0.065;
orbitControls.minDistance = 3;
orbitControls.maxDistance = 90;
orbitControls.maxPolarAngle = Math.PI * 0.495;

const cameraViews = Object.freeze( {
    horizon: Object.freeze( {
        position: new THREE.Vector3( 0, 8, 24 ),
        target: new THREE.Vector3( 0, -0.2, -22 )
    } ),
    elevated: Object.freeze( {
        position: new THREE.Vector3( 26, 30, 28 ),
        target: new THREE.Vector3( 0, 0, -12 )
    } ),
    close: Object.freeze( {
        position: new THREE.Vector3( -8, 4.5, 12 ),
        target: new THREE.Vector3( 0, 0.1, -6 )
    } )
} );

function setCameraView( viewId )
{
    const view = cameraViews[viewId];
    if ( !view ) throw new Error( `Unknown substrate camera '${viewId}'.` );
    camera.position.copy( view.position );
    orbitControls.target.copy( view.target );
    orbitControls.update();
    document.querySelectorAll( '[data-view]' ).forEach( ( button ) => {
        const active = button.dataset.view === viewId;
        button.classList.toggle( 'active', active );
        button.setAttribute( 'aria-pressed', active ? 'true' : 'false' );
    } );
}

const sea = createEnergeticSeaLayer( { scene } );

const controlDescriptors = Object.freeze( {
    'swell-height': Object.freeze( { property: 'swellHeight', decimals: 2 } ),
    energy: Object.freeze( { property: 'energy', decimals: 2 } ),
    'crest-tension': Object.freeze( { property: 'crestTension', decimals: 2 } ),
    'cross-current': Object.freeze( { property: 'crossCurrent', decimals: 2 } ),
    'fine-activity': Object.freeze( { property: 'fineActivity', decimals: 2 } ),
    'current-speed': Object.freeze( { property: 'currentSpeed', decimals: 2 } ),
    reflection: Object.freeze( { property: 'reflection', decimals: 2 } )
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
    const range = energeticSeaRanges[descriptor.property];
    control.min = range.min;
    control.max = range.max;
    control.step = range.step;
    setControlPresentation(
        id,
        descriptor,
        energeticSeaDefaults[descriptor.property]
    );
    control.addEventListener( 'input', () => {
        const value = sea.setParameter(
            descriptor.property,
            Number( control.value )
        );
        setControlPresentation( id, descriptor, value );
    } );
}

document.querySelector( '#freeze-motion' ).addEventListener(
    'change',
    ( event ) => sea.setFrozen( event.currentTarget.checked )
);
document.querySelector( '#wireframe' ).addEventListener( 'change', ( event ) => {
    sea.mesh.material.wireframe = event.currentTarget.checked;
} );
document.querySelectorAll( '[data-view]' ).forEach( ( button ) => {
    button.addEventListener( 'click', () => setCameraView( button.dataset.view ) );
} );

document.querySelector( '#reset' ).addEventListener( 'click', () => {
    sea.reset();
    for ( const [ id, descriptor ] of Object.entries( controlDescriptors ) )
    {
        setControlPresentation(
            id,
            descriptor,
            energeticSeaDefaults[descriptor.property]
        );
    }
    document.querySelector( '#freeze-motion' ).checked = false;
    document.querySelector( '#wireframe' ).checked = false;
    sea.mesh.material.wireframe = false;
    setCameraView( 'horizon' );
} );

const snapshot = sea.getSnapshot();
document.querySelector( '#surface-stats' ).value =
    `${snapshot.vertexCount.toLocaleString()} vertices · ${snapshot.triangleCount.toLocaleString()} triangles`;
document.querySelector( '#energy-stats' ).value =
    `${snapshot.geometricBandCount} geometry bands · ${snapshot.opticalBandCount} optical bands · ${snapshot.packetCount} packets`;

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
    sea.update( time );
    orbitControls.update();
    document.querySelector( '#phase-value' ).value = sea.getPhase().toFixed( 2 );
    renderer.render( scene, camera );
}

window.addEventListener( 'resize', resize );
setCameraView( 'horizon' );
resize();
renderer.setAnimationLoop( animate );

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { createHierarchy, representativeHierarchy, unfoldingHierarchy } from './hierarchy.js';
import { createUnfoldingLayout } from './layout.js';
import { createTreeLayer } from './tree-layer.js';
import { createEngineeredTreeLayer } from './engineered-tree-layer.js';
import { createGrowthCycle } from './growth-cycle.js';

const sceneElement = document.querySelector( '#scene' );
const scene = new THREE.Scene();
const darkBackground = new THREE.Color( 0x0d1113 );
const neutralBackground = new THREE.Color( 0x777a76 );
scene.background = darkBackground;

const camera = new THREE.PerspectiveCamera( 48, 1, 0.1, 80 );
const renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setPixelRatio( Math.min( window.devicePixelRatio, 2 ) );
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
sceneElement.appendChild( renderer.domElement );

const composer = new EffectComposer( renderer );
composer.addPass( new RenderPass( scene, camera ) );
const bloom = new UnrealBloomPass( new THREE.Vector2( 1, 1 ), 0.72, 0.58, 0.82 );
composer.addPass( bloom );

const orbitControls = new OrbitControls( camera, renderer.domElement );
orbitControls.enableDamping = true;
orbitControls.dampingFactor = 0.07;
orbitControls.minDistance = 4;
orbitControls.maxDistance = 60;
orbitControls.maxPolarAngle = Math.PI * 0.56;

scene.add( new THREE.HemisphereLight( 0x82939a, 0x120d0a, 0.72 ) );
const keyLight = new THREE.DirectionalLight( 0xffd89b, 2.4 );
keyLight.position.set( -8, 14, 8 );
keyLight.castShadow = true;
scene.add( keyLight );
const edgeLight = new THREE.DirectionalLight( 0x8eb8c5, 1.45 );
edgeLight.position.set( 10, 9, -11 );
scene.add( edgeLight );

const datum = new THREE.GridHelper( 30, 30, 0x485056, 0x252b2f );
datum.position.y = -0.02;
scene.add( datum );

const establishedHierarchy = createHierarchy( representativeHierarchy );
const hierarchy = createHierarchy( unfoldingHierarchy );
const formDefaults = {
    crownSpread: 1.14,
    verticalRise: 0.95,
    asymmetry: 0.68,
    conduitWeight: 1.34,
    windSweep: 0.48,
    surfaceRelief: 0.1,
    structuralResponse: 0.22,
    emergenceIntensity: 0.86,
    emergenceSpeed: 0.58,
    goldPresence: 0.2,
    motionFrozen: false
};
const form = { ...formDefaults };

function createPositions()
{
    return createUnfoldingLayout( establishedHierarchy, hierarchy, {
        trunkRise: 2.05 * form.verticalRise,
        branchRise: 1.45 * form.verticalRise,
        principalReach: 2.8 * form.crownSpread,
        asymmetry: form.asymmetry,
        windSweep: form.windSweep
    } );
}

let positions = createPositions();
const diagnostics = createTreeLayer( hierarchy, positions, form );
diagnostics.setNodesVisible( false );
diagnostics.setEdgesVisible( false );
diagnostics.setRoleColoursVisible( true );
scene.add( diagnostics.group );

const engineeredTree = createEngineeredTreeLayer( hierarchy, positions, form );
scene.add( engineeredTree.group );
const growthCycle = createGrowthCycle( hierarchy, 2 );
let unfoldingElapsed = 0;
let unfoldingActive = true;
let previousAnimationTime = null;

function rebuildTree()
{
    positions = createPositions();
    diagnostics.update( positions, form );
    engineeredTree.rebuild( positions, form );
}

function bindRange( id, property, decimals = 2, rebuild = true )
{
    const control = document.querySelector( `#${id}` );
    const output = document.querySelector( `#${id}-value` );
    function apply()
    {
        form[property] = Number( control.value );
        output.value = form[property].toFixed( decimals );
        if ( rebuild ) rebuildTree();
    }
    control.addEventListener( 'input', apply );
    output.value = form[property].toFixed( decimals );
}

bindRange( 'crown-spread', 'crownSpread' );
bindRange( 'vertical-rise', 'verticalRise' );
bindRange( 'asymmetry', 'asymmetry' );
bindRange( 'conduit-weight', 'conduitWeight' );
bindRange( 'wind-sweep', 'windSweep' );
bindRange( 'surface-relief', 'surfaceRelief', 2, false );
bindRange( 'structural-response', 'structuralResponse', 2, false );
bindRange( 'emergence-intensity', 'emergenceIntensity', 2, false );
bindRange( 'emergence-speed', 'emergenceSpeed', 2, false );
bindRange( 'gold-presence', 'goldPresence', 2, false );

document.querySelector( '#reset-form' ).addEventListener( 'click', () => {
    const ids = {
        crownSpread: 'crown-spread',
        verticalRise: 'vertical-rise',
        asymmetry: 'asymmetry',
        conduitWeight: 'conduit-weight',
        windSweep: 'wind-sweep',
        surfaceRelief: 'surface-relief',
        structuralResponse: 'structural-response',
        emergenceIntensity: 'emergence-intensity',
        emergenceSpeed: 'emergence-speed',
        goldPresence: 'gold-presence'
    };
    for ( const [ property, id ] of Object.entries( ids ) )
    {
        const control = document.querySelector( `#${id}` );
        control.value = formDefaults[property];
        control.dispatchEvent( new Event( 'input' ) );
    }
} );

document.querySelector( '#replay-unfolding' ).addEventListener( 'click', () => {
    unfoldingElapsed = 0;
    unfoldingActive = true;
} );

const cameraViews = {
    silhouette: {
        position: new THREE.Vector3( 12.5, 9, 21 ),
        target: new THREE.Vector3( -0.8, 6.4, 0 )
    },
    elevated: {
        position: new THREE.Vector3( 0.5, 28.5, 8.5 ),
        target: new THREE.Vector3( -0.8, 6.4, 0 )
    },
    structure: {
        position: new THREE.Vector3( 7.5, 8.2, 11.5 ),
        target: new THREE.Vector3( -0.6, 6.5, 0 )
    }
};

function setCameraView( view )
{
    camera.position.copy( view.position );
    orbitControls.target.copy( view.target );
    orbitControls.update();
}

document.querySelectorAll( '[data-view]' ).forEach( ( button ) => {
    button.addEventListener( 'click', () => setCameraView( cameraViews[button.dataset.view] ) );
} );

function bindSwitch( id, apply )
{
    const control = document.querySelector( `#${id}` );
    control.addEventListener( 'change', () => apply( control.checked ) );
    apply( control.checked );
}

bindSwitch( 'show-surface', engineeredTree.setVisible );
bindSwitch( 'show-nodes', diagnostics.setNodesVisible );
bindSwitch( 'show-edges', diagnostics.setEdgesVisible );
bindSwitch( 'show-axes', diagnostics.setAxesVisible );
bindSwitch( 'role-colours', diagnostics.setRoleColoursVisible );
bindSwitch( 'freeze-motion', ( frozen ) => { form.motionFrozen = frozen; } );
bindSwitch( 'neutral-background', ( neutral ) => {
    scene.background = neutral ? neutralBackground : darkBackground;
    datum.visible = !neutral;
} );

document.querySelector( '#validation-state' ).value = 'passed';
document.querySelector( '#node-count' ).value = hierarchy.nodes.length;
document.querySelector( '#edge-count' ).value = hierarchy.edges.length;
document.querySelector( '#root-count' ).value = hierarchy.roots.length;
document.querySelector( '#terminal-count' ).value = hierarchy.terminals.length;
document.querySelector( '#depth-count' ).value = hierarchy.maxDepth;

function resize()
{
    const width = sceneElement.clientWidth;
    const height = sceneElement.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio( Math.min( window.devicePixelRatio, 2 ) );
    renderer.setSize( width, height, false );
    composer.setSize( width, height );
}

const animationStart = performance.now();
function animate( now )
{
    const elapsed = ( now - animationStart ) / 1000;
    const frameDelta = previousAnimationTime === null
        ? 0
        : Math.min( ( now - previousAnimationTime ) / 1000, 0.1 );
    previousAnimationTime = now;
    if ( unfoldingActive )
    {
        unfoldingElapsed += frameDelta;
        const growth = growthCycle.sample( unfoldingElapsed, 0.72 );
        engineeredTree.setGrowthProgress( growth.progress );
        diagnostics.setGrowthProgress( growth.progress );
        document.querySelector( '#recursive-complexity' ).value = `${Math.round( growth.viability * 100 )}%`;
        if ( growth.viability >= 0.999 ) unfoldingActive = false;
    }
    engineeredTree.update( elapsed, form );
    orbitControls.update();
    composer.render();
}

window.addEventListener( 'resize', resize );
resize();
setCameraView( cameraViews.silhouette );
renderer.setAnimationLoop( animate );

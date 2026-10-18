import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createHierarchy, representativeHierarchy, unfoldingHierarchy } from './hierarchy.js';
import { createUnfoldingLayout } from './layout.js';
import { createTreeLayer } from './tree-layer.js';
import { createEngineeredTreeLayer } from './engineered-tree-layer.js';
import { createGrowthCycle } from './growth-cycle.js';
import { createTrunkVisibilityRenderer } from './trunk-visibility-renderer.js';

const sceneElement = document.querySelector( '#scene' );
const scene = new THREE.Scene();
const darkBackground = new THREE.Color( 0x0d1113 );
const neutralBackground = new THREE.Color( 0x777a76 );
scene.background = darkBackground;

const camera = new THREE.PerspectiveCamera( 48, 1, 0.1, 80 );
const renderer = new THREE.WebGLRenderer( { antialias: true, stencil: true } );
renderer.setPixelRatio( Math.min( window.devicePixelRatio, 2 ) );
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
sceneElement.appendChild( renderer.domElement );

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
    packetSpeed: 1.55,
    packetFrequency: 0.2,
    growthTiers: 3,
    internalRouterTiers: 3,
    internalRouterJunctionEnabled: true,
    internalRouterTransportEnabled: true,
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
        windSweep: form.windSweep,
        growthTiers: form.growthTiers
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
const trunkVisibilityRenderer = createTrunkVisibilityRenderer(
    renderer,
    scene,
    camera,
    engineeredTree
);
const growthCycle = createGrowthCycle( hierarchy, 2 );
let unfoldingElapsed = 0;
let unfoldingActive = true;
let previousAnimationTime = null;

function rebuildTree()
{
    positions = createPositions();
    diagnostics.update( positions, form );
    engineeredTree.rebuild( positions, form );
    updateConstraintStats();
}

function updateConstraintStats()
{
    const manifestedOutput = document.querySelector( '#manifested-count' );
    const dormantOutput = document.querySelector( '#dormant-count' );
    if ( !manifestedOutput || !dormantOutput ) return;
    const manifested = hierarchy.nodes.filter( ( node ) => node.growthEligible !== false ).length;
    manifestedOutput.value = manifested;
    dormantOutput.value = hierarchy.nodes.length - manifested;
}

function bindRange(
    id,
    property,
    decimals = 2,
    rebuild = true,
    restartGrowth = false,
    applyValue = null
)
{
    const control = document.querySelector( `#${id}` );
    const output = document.querySelector( `#${id}-value` );
    function apply()
    {
        form[property] = Number( control.value );
        output.value = form[property].toFixed( decimals );
        if ( applyValue ) applyValue( form[property] );
        else if ( rebuild ) rebuildTree();
        if ( restartGrowth )
        {
            unfoldingElapsed = 0;
            unfoldingActive = true;
        }
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
bindRange( 'packet-speed', 'packetSpeed', 2, false );
bindRange( 'packet-frequency', 'packetFrequency', 2, false );
bindRange( 'growth-tiers', 'growthTiers', 0, true, true );
bindRange(
    'internal-router-tiers',
    'internalRouterTiers',
    0,
    false,
    false,
    engineeredTree.setInternalRouterTiers
);

document.querySelector( '#reset-form' ).addEventListener( 'click', () => {
    const ids = {
        crownSpread: 'crown-spread',
        verticalRise: 'vertical-rise',
        asymmetry: 'asymmetry',
        conduitWeight: 'conduit-weight',
        windSweep: 'wind-sweep',
        surfaceRelief: 'surface-relief',
        structuralResponse: 'structural-response',
        packetSpeed: 'packet-speed',
        packetFrequency: 'packet-frequency',
        growthTiers: 'growth-tiers',
        internalRouterTiers: 'internal-router-tiers'
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
    },
    router: {
        position: new THREE.Vector3( 5.2, 3.7, 8.2 ),
        target: new THREE.Vector3( 0, 2.55, 0 )
    },
    junction: {
        position: new THREE.Vector3( 4.1, 5.4, 7.1 ),
        target: new THREE.Vector3( 0, 4.2, 0 )
    },
    transport: {
        position: new THREE.Vector3( 5.2, 3.7, 8.2 ),
        target: new THREE.Vector3( 0, 2.55, 0 )
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

const surfaceControl = document.querySelector( '#show-surface' );
const interiorInspectionControl = document.querySelector( '#inspect-trunk-interior' );
const routerInspectionControl = document.querySelector( '#inspect-internal-router' );
const junctionInspectionControl = document.querySelector( '#inspect-router-junction' );
const transportInspectionControl = document.querySelector( '#inspect-router-transport' );
const trunkVisibilityControl = document.querySelector( '#trunk-visibility-mode' );
let surfaceVisibleBeforeInspection = surfaceControl.checked;
function applyEngineeredVisibility()
{
    const mode = trunkVisibilityControl.value;
    const inspectingInterior = mode === 'isolated';
    const inspectingRouter = routerInspectionControl.checked;
    const inspectingJunction = junctionInspectionControl.checked;
    const inspectingTransport = transportInspectionControl.checked;
    const inspectingInternal = inspectingRouter
        || inspectingJunction
        || inspectingTransport;
    interiorInspectionControl.checked = inspectingInterior;
    surfaceControl.disabled = inspectingInterior || inspectingInternal;
    engineeredTree.setVisible(
        surfaceControl.checked && !inspectingInterior && !inspectingInternal
    );
    engineeredTree.setTrunkVisibilityMode( mode );
    engineeredTree.setInternalRouterDiagnosticVisible( inspectingInternal );
    engineeredTree.setInternalRouterJunctionDiagnosticVisible(
        inspectingJunction
    );
    if ( inspectingTransport )
    {
        engineeredTree.setInternalRouterJunctionDiagnosticVisible( true );
    }
    engineeredTree.setInternalRouterTransportDiagnosticVisible(
        inspectingTransport
    );
}
surfaceControl.addEventListener( 'change', () => {
    surfaceVisibleBeforeInspection = surfaceControl.checked;
    applyEngineeredVisibility();
} );
interiorInspectionControl.addEventListener( 'change', () => {
    if ( interiorInspectionControl.checked )
    {
        if ( !routerInspectionControl.checked
            && !junctionInspectionControl.checked
            && !transportInspectionControl.checked )
        {
            surfaceVisibleBeforeInspection = surfaceControl.checked;
        }
        routerInspectionControl.checked = false;
        junctionInspectionControl.checked = false;
        transportInspectionControl.checked = false;
        surfaceControl.checked = false;
        trunkVisibilityControl.value = 'isolated';
    }
    else
    {
        surfaceControl.checked = surfaceVisibleBeforeInspection;
        trunkVisibilityControl.value = 'off';
    }
    applyEngineeredVisibility();
} );
routerInspectionControl.addEventListener( 'change', () => {
    if ( routerInspectionControl.checked )
    {
        if ( trunkVisibilityControl.value !== 'isolated'
            && !junctionInspectionControl.checked
            && !transportInspectionControl.checked )
        {
            surfaceVisibleBeforeInspection = surfaceControl.checked;
        }
        junctionInspectionControl.checked = false;
        transportInspectionControl.checked = false;
        surfaceControl.checked = false;
        interiorInspectionControl.checked = false;
        trunkVisibilityControl.value = 'off';
    }
    else
    {
        surfaceControl.checked = surfaceVisibleBeforeInspection;
    }
    applyEngineeredVisibility();
} );
junctionInspectionControl.addEventListener( 'change', () => {
    if ( junctionInspectionControl.checked )
    {
        if ( trunkVisibilityControl.value !== 'isolated'
            && !routerInspectionControl.checked
            && !transportInspectionControl.checked )
        {
            surfaceVisibleBeforeInspection = surfaceControl.checked;
        }
        routerInspectionControl.checked = false;
        transportInspectionControl.checked = false;
        surfaceControl.checked = false;
        interiorInspectionControl.checked = false;
        trunkVisibilityControl.value = 'off';
    }
    else
    {
        surfaceControl.checked = surfaceVisibleBeforeInspection;
    }
    applyEngineeredVisibility();
} );
transportInspectionControl.addEventListener( 'change', () => {
    if ( transportInspectionControl.checked )
    {
        if ( trunkVisibilityControl.value !== 'isolated'
            && !routerInspectionControl.checked
            && !junctionInspectionControl.checked )
        {
            surfaceVisibleBeforeInspection = surfaceControl.checked;
        }
        routerInspectionControl.checked = false;
        junctionInspectionControl.checked = false;
        surfaceControl.checked = false;
        interiorInspectionControl.checked = false;
        trunkVisibilityControl.value = 'off';
    }
    else
    {
        surfaceControl.checked = surfaceVisibleBeforeInspection;
    }
    applyEngineeredVisibility();
} );
trunkVisibilityControl.addEventListener( 'change', () => {
    if ( routerInspectionControl.checked )
    {
        routerInspectionControl.checked = false;
    }
    if ( junctionInspectionControl.checked )
    {
        junctionInspectionControl.checked = false;
    }
    if ( transportInspectionControl.checked )
    {
        transportInspectionControl.checked = false;
    }
    if ( trunkVisibilityControl.value === 'isolated' )
    {
        surfaceVisibleBeforeInspection = surfaceControl.checked;
        surfaceControl.checked = false;
    }
    else if ( !surfaceControl.checked )
    {
        surfaceControl.checked = surfaceVisibleBeforeInspection;
    }
    applyEngineeredVisibility();
} );
applyEngineeredVisibility();
bindSwitch( 'show-nodes', diagnostics.setNodesVisible );
bindSwitch( 'show-edges', diagnostics.setEdgesVisible );
bindSwitch( 'show-axes', diagnostics.setAxesVisible );
bindSwitch( 'role-colours', diagnostics.setRoleColoursVisible );
bindSwitch( 'show-trunk-runes', engineeredTree.setTrunkRunesVisible );
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
updateConstraintStats();

function resize()
{
    const width = sceneElement.clientWidth;
    const height = sceneElement.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio( Math.min( window.devicePixelRatio, 2 ) );
    renderer.setSize( width, height, false );
    trunkVisibilityRenderer.resize();
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
        const growth = growthCycle.sample( unfoldingElapsed, 0.42 );
        engineeredTree.setGrowthProgress( growth.progress );
        diagnostics.setGrowthProgress( growth.progress );
        document.querySelector( '#recursive-complexity' ).value = `${Math.round( growth.viability * 100 )}%`;
        if ( growth.complete ) unfoldingActive = false;
    }
    engineeredTree.update( elapsed, form );
    orbitControls.update();
    trunkVisibilityRenderer.render();
    const runeActivity = document.querySelector( '#trunk-rune-activity' );
    if ( runeActivity )
    {
        const runes = engineeredTree.group.userData.trunkRunes;
        if ( runes?.causalProfileActive === false )
        {
            runeActivity.value = 'preserved evidence · inactive in D2/D3';
        }
        else if ( !runes?.enabled ) runeActivity.value = 'off';
        else if ( runes.visibilityMode !== 'off' ) runeActivity.value = 'hidden for diagnostic';
        else if ( runes.activeTraversalCount > 0 )
        {
            runeActivity.value = `${runes.activeTraversalCount} transducing`
                + ` · ${runes.outputCount}/${runes.entryCount} outputs`;
        }
        else if ( runes.entryCount > 0 )
        {
            runeActivity.value = `quiet · ${runes.outputCount}`
                + `/${runes.entryCount} outputs`;
        }
        else runeActivity.value = 'waiting for input';
    }
    const junctionActivity = document.querySelector(
        '#internal-router-junction-activity'
    );
    if ( junctionActivity )
    {
        const junction = engineeredTree.group.userData.internalRouterJunction;
        if ( !junction?.enabled ) junctionActivity.value = 'inactive';
        else if ( junction.outputCount > 0 )
        {
            if ( junction.transportImplemented )
            {
                junctionActivity.value = `${junction.consumptionCount} cyan consumed`
                    + ` · ${junction.releasedOutputCount} gold routed`
                    + ` · pending ${junction.parkedOutputCount}`
                    + ` · balance ${junction.conservation.handoffBalance}`;
            }
            else
            {
                const balance = junction.consumptionCount - junction.outputCount;
                junctionActivity.value = `${junction.consumptionCount} cyan consumed`
                    + ` · ${junction.outputCount} gold parked · balance ${balance}`;
            }
        }
        else junctionActivity.value = 'waiting for cyan input';
    }
    const transportActivity = document.querySelector(
        '#internal-router-transport-activity'
    );
    if ( transportActivity )
    {
        const transport = engineeredTree.group.userData.internalRouterTransport;
        if ( !transport?.enabled ) transportActivity.value = 'inactive';
        else if ( transport.dispatchCount > 0 )
        {
            transportActivity.value = `${transport.activePacketCount} active`
                + ` · ${transport.arrivalCount} arrived`
                + ` · ${transport.currentSelectedRouteCount}`
                    + `/${transport.currentRouteCapacity} routes`
                + ` · peak ${transport.maximumConcurrentPacketCount}`
                + ` · overflow ${transport.visualOverflowCount}`
                + ` · balance ${transport.conservation.lifecycleBalance}`;
        }
        else transportActivity.value = 'waiting for gold output';
    }
    const visibilityCost = document.querySelector( '#trunk-visibility-cost' );
    if ( visibilityCost )
    {
        const cost = trunkVisibilityRenderer.getDiagnostics();
        const target = cost.renderTargetWidth > 0
            ? ` · ${cost.renderTargetWidth}×${cost.renderTargetHeight}`
            : '';
        visibilityCost.value = `${cost.passCount} pass${cost.passCount === 1 ? '' : 'es'}`
            + ` · ${cost.cpuSubmissionEmaMs.toFixed( 1 )} ms${target}`;
    }
}

window.addEventListener( 'resize', resize );
resize();
setCameraView( cameraViews.silhouette );
renderer.setAnimationLoop( animate );

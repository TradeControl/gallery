import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
    createEngineeredTreeLayer,
    createGrowthCycle,
    createHierarchy,
    createPhysicalUptakeLayer,
    createTreeLayer,
    createTrunkVisibilityRenderer,
    createUnfoldingLayout,
    representativeHierarchy,
    unfoldingHierarchy
} from '../../lib/tree/index.js';

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
    crownSpread: 0.8,
    verticalRise: 0.95,
    asymmetry: 0.68,
    conduitWeight: 1.34,
    windSweep: 0,
    surfaceRelief: 0.1,
    structuralResponse: 0.5,
    canopyGustCandidate: true,
    gustIntervalBase: 0,
    packetSpeed: 1.55,
    packetFrequency: 4,
    growthTiers: 6,
    internalRouterTiers: 4,
    internalRouterJunctionEnabled: true,
    internalRouterTransportEnabled: true,
    internalRouterPresentationEnabled: true,
    internalRouterJunctionFormEnabled: true,
    internalRouterJunctionFormCircumference: 0.55,
    trunkRunesVisible: false,
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
const physicalUptake = createPhysicalUptakeLayer( hierarchy, positions, form );
scene.add( physicalUptake.group );
const trunkVisibilityRenderer = createTrunkVisibilityRenderer(
    renderer,
    scene,
    camera,
    engineeredTree,
    {
        externalDepthConsumers: [ physicalUptake.externalDepthConsumer ]
    }
);
const growthCycle = createGrowthCycle( hierarchy, 2 );
const matureGrowth = growthCycle.sample( Number.MAX_SAFE_INTEGER, 0.42 );
let activeGrowthProgress = matureGrowth.progress;
engineeredTree.setGrowthProgress( matureGrowth.progress );
diagnostics.setGrowthProgress( matureGrowth.progress );
physicalUptake.setGrowthProgress( matureGrowth.progress );
let unfoldingElapsed = 0;
let unfoldingActive = false;
let previousAnimationTime = null;

function rebuildTree()
{
    positions = createPositions();
    diagnostics.update( positions, form );
    engineeredTree.rebuild( positions, form );
    physicalUptake.rebuild( positions, form );
    physicalUptake.setGrowthProgress( activeGrowthProgress );
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
    applyValue = null,
    formatValue = null
)
{
    const control = document.querySelector( `#${id}` );
    const output = document.querySelector( `#${id}-value` );
    function apply()
    {
        form[property] = Number( control.value );
        output.value = formatValue
            ? formatValue( form[property] )
            : form[property].toFixed( decimals );
        if ( applyValue ) applyValue( form[property] );
        else if ( rebuild ) rebuildTree();
        if ( restartGrowth )
        {
            unfoldingElapsed = 0;
            unfoldingActive = true;
        }
    }
    control.addEventListener( 'input', apply );
    output.value = formatValue
        ? formatValue( form[property] )
        : form[property].toFixed( decimals );
}

bindRange( 'crown-spread', 'crownSpread' );
bindRange( 'vertical-rise', 'verticalRise' );
bindRange( 'asymmetry', 'asymmetry' );
bindRange( 'conduit-weight', 'conduitWeight' );
bindRange( 'wind-sweep', 'windSweep' );
bindRange( 'surface-relief', 'surfaceRelief', 2, false );
bindRange( 'structural-response', 'structuralResponse', 2, false );
bindRange(
    'gust-interval-base',
    'gustIntervalBase',
    0,
    false,
    false,
    null,
    ( value ) => {
        const base = Math.round( value );
        const ceiling = Math.round( base + 15 + base / 13 );
        return `${base}–${ceiling} s`;
    }
);
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
bindRange(
    'junction-circumference',
    'internalRouterJunctionFormCircumference',
    2,
    false,
    false,
    engineeredTree.setInternalRouterJunctionFormCircumference,
    ( value ) => `${Math.round( value * 100 )}% trunk max`
);

let manualUptakeSequence = 0;
let latestAnimationElapsed = 0;

function updatePhysicalUptakeReadout()
{
    const uptake = physicalUptake.getSnapshot();
    const output = document.querySelector( '#physical-uptake-activity' );
    if ( uptake.acceptedTransferCount === 0 )
    {
        output.value = 'idle · manual test only';
        return;
    }
    output.value = `${uptake.activeXylemCount} xylem`
        + ` · ${uptake.activeBranchPacketCount} branch`
        + ` · ${uptake.completedVisualCount} faded`
        + ` · ${uptake.acceptedTransferCount} admitted`
        + ` · mass ${uptake.acceptedMass.toFixed( 2 )}`;
}

document.querySelector( '#reset-form' ).addEventListener( 'click', () => {
    const ids = {
        crownSpread: 'crown-spread',
        verticalRise: 'vertical-rise',
        asymmetry: 'asymmetry',
        conduitWeight: 'conduit-weight',
        windSweep: 'wind-sweep',
        surfaceRelief: 'surface-relief',
        structuralResponse: 'structural-response',
        gustIntervalBase: 'gust-interval-base',
        packetSpeed: 'packet-speed',
        packetFrequency: 'packet-frequency',
        growthTiers: 'growth-tiers',
        internalRouterTiers: 'internal-router-tiers',
        internalRouterJunctionFormCircumference: 'junction-circumference'
    };
    for ( const [ property, id ] of Object.entries( ids ) )
    {
        const control = document.querySelector( `#${id}` );
        control.value = formDefaults[property];
        control.dispatchEvent( new Event( 'input' ) );
    }
    form.motionFrozen = formDefaults.motionFrozen;
    document.querySelector( '#freeze-motion' ).checked = form.motionFrozen;
    manualUptakeSequence = 0;
    physicalUptake.reset();
    updatePhysicalUptakeReadout();
} );

document.querySelector( '#admit-physical-uptake' ).addEventListener(
    'click',
    () => {
        const sequence = ++manualUptakeSequence;
        physicalUptake.acceptPhysicalUptake( {
            transferId: `standalone-review-${sequence}`,
            sourceParcelId: `manual-parcel-${sequence}`,
            sourceId: 'standalone-tree-review',
            mass: 0.82,
            energy: 0.74,
            temperature: 0.74,
            contactPosition: [ 0, 0, 0 ],
            contactTime: latestAnimationElapsed,
            presentationTime: latestAnimationElapsed
        } );
        physicalUptake.update( latestAnimationElapsed, form );
        updatePhysicalUptakeReadout();
    }
);

document.querySelector( '#replay-unfolding' ).addEventListener( 'click', () => {
    unfoldingElapsed = 0;
    unfoldingActive = true;
    const initial = growthCycle.reset();
    activeGrowthProgress = initial.progress;
    engineeredTree.setGrowthProgress( initial.progress );
    diagnostics.setGrowthProgress( initial.progress );
    physicalUptake.setGrowthProgress( initial.progress );
    document.querySelector( '#recursive-complexity' ).value = '0%';
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
    },
    presentation: {
        position: new THREE.Vector3( 4.6, 3.55, 7.4 ),
        target: new THREE.Vector3( 0, 2.45, 0 )
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
const routerInspectionControl = document.querySelector( '#inspect-internal-router' );
const junctionInspectionControl = document.querySelector( '#inspect-router-junction' );
const transportInspectionControl = document.querySelector( '#inspect-router-transport' );
let surfaceVisibleBeforeInspection = surfaceControl.checked;
function applyEngineeredVisibility()
{
    const inspectingRouter = routerInspectionControl.checked;
    const inspectingJunction = junctionInspectionControl.checked;
    const inspectingTransport = transportInspectionControl.checked;
    const inspectingInternal = inspectingRouter
        || inspectingJunction
        || inspectingTransport;
    surfaceControl.disabled = inspectingInternal;
    engineeredTree.setVisible( surfaceControl.checked && !inspectingInternal );
    physicalUptake.setVisible( surfaceControl.checked && !inspectingInternal );
    engineeredTree.setTrunkVisibilityMode( 'off' );
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
routerInspectionControl.addEventListener( 'change', () => {
    if ( routerInspectionControl.checked )
    {
        if ( !junctionInspectionControl.checked
            && !transportInspectionControl.checked )
        {
            surfaceVisibleBeforeInspection = surfaceControl.checked;
        }
        junctionInspectionControl.checked = false;
        transportInspectionControl.checked = false;
        surfaceControl.checked = false;
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
        if ( !routerInspectionControl.checked
            && !transportInspectionControl.checked )
        {
            surfaceVisibleBeforeInspection = surfaceControl.checked;
        }
        routerInspectionControl.checked = false;
        transportInspectionControl.checked = false;
        surfaceControl.checked = false;
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
        if ( !routerInspectionControl.checked
            && !junctionInspectionControl.checked )
        {
            surfaceVisibleBeforeInspection = surfaceControl.checked;
        }
        routerInspectionControl.checked = false;
        junctionInspectionControl.checked = false;
        surfaceControl.checked = false;
    }
    else
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
document.querySelector( '#recursive-complexity' ).value = '100%';
updateConstraintStats();

function resize()
{
    const width = sceneElement.clientWidth;
    const height = sceneElement.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio( Math.min( window.devicePixelRatio, 2 ) );
    renderer.setSize( width, height );
    trunkVisibilityRenderer.resize();
}

let animationStart = null;
function animate( now )
{
    if ( animationStart === null ) animationStart = now;
    const elapsed = Math.max( 0, ( now - animationStart ) / 1000 );
    latestAnimationElapsed = elapsed;
    const frameDelta = previousAnimationTime === null
        ? 0
        : Math.min( ( now - previousAnimationTime ) / 1000, 0.1 );
    previousAnimationTime = now;
    if ( unfoldingActive )
    {
        unfoldingElapsed += frameDelta;
        const growth = growthCycle.sample( unfoldingElapsed, 0.42 );
        activeGrowthProgress = growth.progress;
        engineeredTree.setGrowthProgress( growth.progress );
        diagnostics.setGrowthProgress( growth.progress );
        physicalUptake.setGrowthProgress( growth.progress );
        document.querySelector( '#recursive-complexity' ).value = `${Math.round( growth.viability * 100 )}%`;
        if ( growth.complete ) unfoldingActive = false;
    }
    engineeredTree.update( elapsed, form );
    physicalUptake.update( elapsed, form );
    updatePhysicalUptakeReadout();
    orbitControls.update();
    trunkVisibilityRenderer.render();
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
    const presentationActivity = document.querySelector(
        '#internal-router-presentation-activity'
    );
    if ( presentationActivity )
    {
        const presentation = engineeredTree.group.userData
            .internalRouterPresentation;
        if ( !presentation?.enabled ) presentationActivity.value = 'off';
        else if ( presentation.rendererActive )
        {
            presentationActivity.value = presentation.submittedTrailCount > 0
                ? `${presentation.submittedTrailCount}`
                    + ' route-local gold head+wake packet trails'
                    + ` · ${presentation.submittedSampleCount ?? 0} samples`
                    + ' · depth occluded'
                : 'junction response only · no active gold trail'
                    + ' · depth occluded';
        }
        else if ( presentation.activePacketCount > 0 )
        {
            presentationActivity.value = 'not rendered in current view';
        }
        else presentationActivity.value = 'waiting for gold passage';
    }
    const junctionFormActivity = document.querySelector(
        '#internal-router-junction-form-activity'
    );
    if ( junctionFormActivity )
    {
        const junctionForm = engineeredTree.group.userData
            .internalRouterJunctionForm;
        if ( !junctionForm?.enabled ) junctionFormActivity.value = 'off';
        else if ( !junctionForm.effectiveEnabled )
        {
            junctionFormActivity.value = 'packet passage unavailable';
        }
        else if ( junctionForm.rendererActive )
        {
            const cyan = junctionForm.activeManifestations.filter(
                ( manifestation ) => manifestation.kind === 'cyan-approach'
            ).length;
            const gold = junctionForm.activeManifestations.filter(
                ( manifestation ) => manifestation.kind === 'gold-departure'
            ).length;
            junctionFormActivity.value = `${cyan} cyan approach`
                + ` · ${gold} gold departure · depth occluded`;
        }
        else junctionFormActivity.value = 'waiting for boundary event';
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
setCameraView( cameraViews.presentation );
renderer.setAnimationLoop( animate );

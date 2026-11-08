import * as THREE from 'three';
import {
    createEngineeredTreeLayer,
    createGrowthCycle,
    createHierarchy,
    createPhysicalUptakeLayer,
    createTrunkVisibilityRenderer,
    createUnfoldingLayout,
    representativeHierarchy,
    unfoldingHierarchy
} from '../../lib/tree/index.js';
import { createPlantingEnvelope } from './planting-envelope.js';
import { createCompositionRootSystem } from './root-system.js';

export const treeBaselineDefaults = Object.freeze( {
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
} );

export const treePlacementDefaults = Object.freeze( {
    scale: 1,
    embedDepth: 0,
    rotationDegrees: 0
} );

export const treePlacementRanges = Object.freeze( {
    scale: Object.freeze( { min: 0.9, max: 1.3, step: 0.01 } ),
    embedDepth: Object.freeze( { min: 0, max: 1, step: 0.05 } ),
    rotationDegrees: Object.freeze( { min: -180, max: 180, step: 1 } )
} );

const placementRangeLabels = Object.freeze( {
    scale: 'scale',
    embedDepth: 'root settlement',
    rotationDegrees: 'orientation'
} );

function assertPlacementRange( property, value )
{
    const range = treePlacementRanges[property];
    const label = placementRangeLabels[property];
    if ( !Number.isFinite( value ) )
    {
        throw new TypeError( `Tree ${label} must be finite.` );
    }
    if ( value < range.min || value > range.max )
    {
        throw new RangeError(
            `Tree ${label} must be between ${range.min} and ${range.max}.`
        );
    }
}

const layoutProperties = new Set( [
    'crownSpread',
    'verticalRise',
    'asymmetry',
    'conduitWeight',
    'windSweep',
    'growthTiers'
] );

export function resolvePlantingTransform( membraneHeight, placement = {} )
{
    const scale = Number( placement.scale ?? treePlacementDefaults.scale );
    const embedDepth = Number(
        placement.embedDepth ?? treePlacementDefaults.embedDepth
    );
    const rotationDegrees = Number(
        placement.rotationDegrees ?? treePlacementDefaults.rotationDegrees
    );
    if ( !Number.isFinite( membraneHeight ) )
    {
        throw new TypeError( 'Tree planting height must be finite.' );
    }
    assertPlacementRange( 'scale', scale );
    assertPlacementRange( 'embedDepth', embedDepth );
    assertPlacementRange( 'rotationDegrees', rotationDegrees );
    return Object.freeze( {
        position: Object.freeze( [ 0, membraneHeight - embedDepth, 0 ] ),
        scale,
        rotationY: THREE.MathUtils.degToRad( rotationDegrees )
    } );
}

export function createCompositionTree( {
    scene,
    renderer,
    camera,
    membrane,
    externalOccluders = []
} )
{
    const establishedHierarchy = createHierarchy( representativeHierarchy );
    const hierarchy = createHierarchy( unfoldingHierarchy );
    const form = { ...treeBaselineDefaults };
    const placement = { ...treePlacementDefaults };

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
    const layer = createEngineeredTreeLayer( hierarchy, positions, form );
    const physicalUptake = createPhysicalUptakeLayer(
        hierarchy,
        positions,
        form
    );
    const plantingGroup = new THREE.Group();
    plantingGroup.name = 'Category Tree planting transform';
    plantingGroup.add( layer.group, physicalUptake.group );
    scene.add( plantingGroup );

    const growthCycle = createGrowthCycle( hierarchy, 2 );
    let growthState = growthCycle.sample( Number.MAX_SAFE_INTEGER, 0.42 );
    let growthElapsed = 0;
    let unfoldingActive = false;
    let startTime = null;
    let previousTime = null;
    layer.setGrowthProgress( growthState.progress );
    physicalUptake.setGrowthProgress( growthState.progress );

    const visibilityRenderer = createTrunkVisibilityRenderer(
        renderer,
        scene,
        camera,
        layer,
        {
            externalOccluders,
            externalDepthConsumers: [
                physicalUptake.externalDepthConsumer
            ]
        }
    );
    const plantingEnvelope = createPlantingEnvelope( { scene, membrane } );
    const physicalRootSystem = createCompositionRootSystem( {
        plantingGroup,
        membrane,
        plantingEnvelope,
        hierarchy
    } );
    let plantingEnvelopeResourceRevision = -1;
    let plantingEnvelopeDiagnosticRequested = false;
    let physicalRootDiagnosticRequested = false;
    let treeVisible = true;
    let physicalUptakePresentationRequested = true;
    let physicalUptakeEventSequence = 0;

    function refreshPlantingEnvelope( force = false )
    {
        const resources = layer.getTrunkVisibilityResources();
        if ( !resources.trunkMesh ) return plantingEnvelope.getSnapshot();
        if ( !force
            && resources.revision === plantingEnvelopeResourceRevision )
        {
            return plantingEnvelope.getSnapshot();
        }
        plantingGroup.updateWorldMatrix( true, true );
        const snapshot = plantingEnvelope.update( resources.trunkMesh );
        physicalRootSystem.update( resources.trunkMesh, snapshot );
        plantingEnvelopeResourceRevision = resources.revision;
        return snapshot;
    }

    function applyPlantingEnvelopeDiagnosticVisibility()
    {
        return plantingEnvelope.setDiagnosticVisible(
            treeVisible && plantingEnvelopeDiagnosticRequested
        );
    }

    function applyPhysicalRootDiagnosticVisibility()
    {
        return physicalRootSystem.setDiagnosticVisible(
            treeVisible && physicalRootDiagnosticRequested
        );
    }

    function rebuild()
    {
        positions = createPositions();
        layer.rebuild( positions, form );
        physicalUptake.rebuild( positions, form );
        layer.setGrowthProgress( growthState.progress );
        physicalUptake.setGrowthProgress( growthState.progress );
        refreshPlantingEnvelope();
    }

    function setMature()
    {
        growthState = growthCycle.sample( Number.MAX_SAFE_INTEGER, 0.42 );
        growthElapsed = 0;
        unfoldingActive = false;
        layer.setGrowthProgress( growthState.progress );
        physicalUptake.setGrowthProgress( growthState.progress );
        refreshPlantingEnvelope();
    }

    function replayGrowth()
    {
        growthElapsed = 0;
        unfoldingActive = true;
        growthState = growthCycle.reset();
        layer.setGrowthProgress( growthState.progress );
        physicalUptake.setGrowthProgress( growthState.progress );
        refreshPlantingEnvelope();
    }

    function setFormValue( property, value )
    {
        if ( !( property in treeBaselineDefaults ) )
        {
            throw new Error( `Unknown Tree parameter '${property}'.` );
        }
        form[property] = property === 'motionFrozen'
            ? Boolean( value )
            : Number( value );
        if ( property === 'internalRouterTiers' )
        {
            layer.setInternalRouterTiers( form[property] );
        }
        else if ( property === 'internalRouterJunctionFormCircumference' )
        {
            layer.setInternalRouterJunctionFormCircumference( form[property] );
        }
        else if ( layoutProperties.has( property ) )
        {
            rebuild();
            if ( property === 'growthTiers' ) replayGrowth();
        }
        return form[property];
    }

    function resetForm()
    {
        Object.assign( form, treeBaselineDefaults );
        positions = createPositions();
        layer.rebuild( positions, form );
        physicalUptake.rebuild( positions, form );
        physicalUptake.reset();
        physicalUptakeEventSequence = 0;
        setMature();
    }

    function acceptPhysicalUptake( event )
    {
        if ( !event || event.type !== 'molten-root-uptake'
            || !Array.isArray( event.contact?.position )
            || event.contact.position.length !== 2 )
        {
            throw new TypeError(
                'Composition Tree uptake requires a molten root-contact event.'
            );
        }
        const [ worldX, worldZ ] = event.contact.position;
        plantingGroup.updateWorldMatrix( true, true );
        const localContact = plantingGroup.worldToLocal( new THREE.Vector3(
            worldX,
            membrane.height( worldX, worldZ ),
            worldZ
        ) );
        physicalUptakeEventSequence += 1;
        return physicalUptake.acceptPhysicalUptake( {
            transferId: `composition-uptake-${physicalUptakeEventSequence}`,
            sourceParcelId: Number.isInteger( event.parcelIdentity )
                ? `parcel-${event.parcelIdentity}`
                : `unidentified-${physicalUptakeEventSequence}`,
            sourceId: `feed-${event.sourceIndex}`,
            mass: event.mass,
            energy: Math.max( event.temperature, 0.001 ),
            temperature: Math.max( event.temperature, 0.001 ),
            contactPosition: localContact.toArray(),
            contactTime: event.simulationTime,
            presentationTime: startTime === null
                ? 0
                : Math.max( 0, ( performance.now() - startTime ) / 1000 )
        } );
    }

    function resetPhysicalUptake()
    {
        physicalUptakeEventSequence = 0;
        return physicalUptake.reset();
    }

    function applyPlacementTransform( transform )
    {
        plantingGroup.position.fromArray( transform.position );
        plantingGroup.rotation.set( 0, transform.rotationY, 0 );
        plantingGroup.scale.setScalar( transform.scale );
        plantingGroup.updateWorldMatrix( true, true );
        refreshPlantingEnvelope( true );
        return transform;
    }

    function updatePlacement()
    {
        return applyPlacementTransform( resolvePlantingTransform(
            membrane.height( 0, 0 ),
            placement
        ) );
    }

    function setPlacementValue( property, value )
    {
        if ( !Object.hasOwn( treePlacementDefaults, property ) )
        {
            throw new Error( `Unknown Tree placement parameter '${property}'.` );
        }
        const candidate = {
            ...placement,
            [property]: Number( value )
        };
        const transform = resolvePlantingTransform(
            membrane.height( 0, 0 ),
            candidate
        );
        placement[property] = candidate[property];
        return applyPlacementTransform( transform );
    }

    function update( time )
    {
        if ( startTime === null )
        {
            startTime = time;
            previousTime = time;
        }
        const elapsed = ( time - startTime ) / 1000;
        const frameDelta = Math.min( ( time - previousTime ) / 1000, 0.1 );
        previousTime = time;
        if ( unfoldingActive )
        {
            growthElapsed += frameDelta;
            growthState = growthCycle.sample( growthElapsed, 0.42 );
            layer.setGrowthProgress( growthState.progress );
            physicalUptake.setGrowthProgress( growthState.progress );
            refreshPlantingEnvelope();
            if ( growthState.complete ) unfoldingActive = false;
        }
        layer.update( elapsed, form );
        physicalUptake.update( elapsed, form );
    }

    updatePlacement();
    return {
        form,
        placement,
        hierarchy,
        group: plantingGroup,
        layer,
        physicalUptake,
        visibilityRenderer,
        plantingEnvelope,
        physicalRootSystem,
        update,
        render: visibilityRenderer.render,
        resize: visibilityRenderer.resize,
        replayGrowth,
        resetForm,
        resetPhysicalUptake,
        acceptPhysicalUptake,
        setFormValue,
        setPlacementValue,
        updatePlacement,
        setPlantingEnvelopeDiagnosticVisible( visible ) {
            plantingEnvelopeDiagnosticRequested = Boolean( visible );
            return applyPlantingEnvelopeDiagnosticVisibility();
        },
        setPhysicalRootDiagnosticVisible( visible ) {
            physicalRootDiagnosticRequested = Boolean( visible );
            return applyPhysicalRootDiagnosticVisibility();
        },
        setPhysicalUptakeVisible( visible ) {
            physicalUptakePresentationRequested = Boolean( visible );
            return physicalUptake.setVisible(
                treeVisible && physicalUptakePresentationRequested
            );
        },
        setVisible( visible ) {
            treeVisible = Boolean( visible );
            layer.setVisible( treeVisible );
            physicalUptake.setVisible(
                treeVisible && physicalUptakePresentationRequested
            );
            physicalRootSystem.setVisible( treeVisible );
            applyPlantingEnvelopeDiagnosticVisibility();
            applyPhysicalRootDiagnosticVisibility();
        },
        getState() {
            const envelope = plantingEnvelope.getSnapshot();
            return {
                growthViability: growthState.viability,
                growthComplete: growthState.complete,
                unfoldingActive,
                anchor: envelope
                    ? envelope.anchor.slice()
                    : plantingGroup.position.toArray(),
                scale: plantingGroup.scale.x,
                rotationY: plantingGroup.rotation.y
            };
        }
    };
}

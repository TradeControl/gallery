import * as THREE from 'three';
import {
    createEmergentSuperstrateLayer,
    superstrateFieldViews,
    superstrateRanges
} from '../../lib/superstrate/index.js';

const sourceIds = Object.freeze( [
    'substrate',
    'physical',
    'information',
    'living'
] );
const directionChangeThreshold = 1e-10;

export const compositionSuperstrateDefaults = Object.freeze( {
    presence: 0.52,
    breath: 0.36,
    coherence: 0.56,
    confluence: 0.54,
    substrateMagnet: 0.24,
    physicalMagnet: 0.20,
    informationMagnet: 0.28,
    livingMagnet: 0.26
} );

export const compositionSuperstrateSourceRadii = Object.freeze( {
    substrate: 0.78,
    physical: 0.58,
    information: 0.60,
    living: 0.62
} );

export { superstrateFieldViews, superstrateRanges };

function sourceValue( provider, sourceId )
{
    const value = typeof provider === 'function' ? provider() : provider;
    if ( !value )
    {
        throw new TypeError(
            `Composition superstrate source '${sourceId}' has no world anchor.`
        );
    }
    return value;
}

function resolveWorldPoint( provider, sourceId, target )
{
    const value = sourceValue( provider, sourceId );
    if ( value?.isObject3D )
    {
        value.updateWorldMatrix( true, false );
        return value.getWorldPosition( target );
    }
    if ( value?.isVector3 ) return target.copy( value );
    if ( typeof value === 'object'
        && [ value.x, value.y, value.z ].every( Number.isFinite ) )
    {
        return target.set( value.x, value.y, value.z );
    }
    throw new TypeError(
        `Composition superstrate source '${sourceId}' must resolve to a world point.`
    );
}

function validateSourceProviders( sourceProviders )
{
    if ( !sourceProviders || typeof sourceProviders !== 'object' )
    {
        throw new TypeError(
            'Composition superstrate source providers are required.'
        );
    }
    for ( const sourceId of sourceIds )
    {
        if ( !sourceProviders[sourceId] )
        {
            throw new TypeError(
                `Composition superstrate requires a '${sourceId}' source provider.`
            );
        }
    }
}

export function createCompositionSuperstrate( {
    scene,
    camera,
    sourceProviders,
    parameters = compositionSuperstrateDefaults,
    sourceRadii = compositionSuperstrateSourceRadii
} )
{
    if ( !camera?.isCamera )
    {
        throw new TypeError( 'Composition superstrate requires a Three.js camera.' );
    }
    validateSourceProviders( sourceProviders );

    const cameraPosition = new THREE.Vector3();
    const workingPoint = new THREE.Vector3();
    const workingDirection = new THREE.Vector3();
    const sourceWorldPoints = Object.fromEntries(
        sourceIds.map( ( sourceId ) => [ sourceId, new THREE.Vector3() ] )
    );

    function resolveDirections()
    {
        camera.updateWorldMatrix( true, false );
        camera.getWorldPosition( cameraPosition );
        return Object.fromEntries( sourceIds.map( ( sourceId ) => {
            const point = resolveWorldPoint(
                sourceProviders[sourceId],
                sourceId,
                workingPoint
            );
            sourceWorldPoints[sourceId].copy( point );
            workingDirection.subVectors( point, cameraPosition );
            if ( workingDirection.lengthSq() < 1e-12 )
            {
                throw new RangeError(
                    `Composition superstrate source '${sourceId}' coincides with the camera.`
                );
            }
            return [ sourceId, {
                direction: workingDirection.normalize().clone(),
                angularRadius: sourceRadii[sourceId]
            } ];
        } ) );
    }

    const initialSources = resolveDirections();
    const layer = createEmergentSuperstrateLayer( {
        scene,
        observer: camera,
        parameters,
        sources: initialSources
    } );
    const cachedDirections = Object.fromEntries( sourceIds.map(
        ( sourceId ) => [
            sourceId,
            initialSources[sourceId].direction.clone()
        ]
    ) );

    let presentationRequested = true;
    let modeVisible = true;
    let disposed = false;

    function assertActive()
    {
        if ( disposed )
        {
            throw new Error( 'The composition superstrate is disposed.' );
        }
    }

    function applyVisibility()
    {
        return layer.setVisible( presentationRequested && modeVisible );
    }

    function refreshSources( force = false )
    {
        assertActive();
        const resolved = resolveDirections();
        const changed = force || sourceIds.some( ( sourceId ) =>
            cachedDirections[sourceId].distanceToSquared(
                resolved[sourceId].direction
            ) > directionChangeThreshold );
        if ( !changed ) return false;
        layer.setSources( resolved );
        for ( const sourceId of sourceIds )
        {
            cachedDirections[sourceId].copy(
                resolved[sourceId].direction
            );
        }
        return true;
    }

    function getSnapshot()
    {
        const snapshot = layer.getSnapshot();
        return Object.freeze( {
            ...snapshot,
            presentationRequested,
            modeVisible,
            effectiveVisible: presentationRequested && modeVisible,
            sourcePlacement: 'composition-space-poles',
            sourceWorldPoints: Object.freeze( Object.fromEntries(
                sourceIds.map( ( sourceId ) => [
                    sourceId,
                    Object.freeze( sourceWorldPoints[sourceId].toArray() )
                ] )
            ) )
        } );
    }

    function reset()
    {
        assertActive();
        layer.reset();
        for ( const [ property, value ] of Object.entries(
            compositionSuperstrateDefaults
        ) )
        {
            layer.setParameter( property, value );
        }
        presentationRequested = true;
        refreshSources( true );
        layer.setFieldView( 'complete' );
        layer.setFrozen( false );
        applyVisibility();
        return getSnapshot();
    }

    return {
        group: layer.group,
        layer,
        parameters: layer.parameters,
        update( time ) {
            assertActive();
            refreshSources();
            layer.update( time, camera );
            return getSnapshot();
        },
        refreshSources,
        setParameter( property, value ) {
            assertActive();
            return layer.setParameter( property, value );
        },
        setMagnets( values ) {
            assertActive();
            return layer.setMagnets( values );
        },
        setFieldView( viewId ) {
            assertActive();
            return layer.setFieldView( viewId );
        },
        getFieldView() {
            assertActive();
            return layer.getFieldView();
        },
        setFrozen( frozen ) {
            assertActive();
            return layer.setFrozen( frozen );
        },
        setPresentationVisible( visible ) {
            assertActive();
            presentationRequested = Boolean( visible );
            return applyVisibility();
        },
        setModeVisible( visible ) {
            assertActive();
            modeVisible = Boolean( visible );
            return applyVisibility();
        },
        reset,
        getSnapshot() {
            assertActive();
            return getSnapshot();
        },
        dispose() {
            if ( disposed ) return;
            disposed = true;
            layer.dispose();
        }
    };
}

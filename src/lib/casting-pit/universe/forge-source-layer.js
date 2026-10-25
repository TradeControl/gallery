const defaultMaxSources = 18;

export const forgeSourceModes = Object.freeze( [
    'off',
    'selected',
    'all'
] );

export const forgeSourceDefaults = Object.freeze( {
    mode: 'all',
    selectedSourceIndex: 0,
    heatIntensity: 0.4,
    heatReach: 2.25,
    settlingTime: 1.25
} );

export const forgeSourceRanges = Object.freeze( {
    heatIntensity: Object.freeze( { min: 0, max: 1, step: 0.05 } ),
    heatReach: Object.freeze( { min: 0.5, max: 5, step: 0.05 } ),
    settlingTime: Object.freeze( { min: 0.4, max: 2.5, step: 0.05 } )
} );

function clamp( value, minimum, maximum )
{
    return Math.min( maximum, Math.max( minimum, value ) );
}

function validateFinite( value, label )
{
    if ( !Number.isFinite( value ) )
    {
        throw new TypeError( `${label} must be finite.` );
    }
    return value;
}

function validatePositiveInteger( value, label, minimum = 1 )
{
    if ( !Number.isInteger( value ) || value < minimum )
    {
        throw new RangeError(
            `${label} must be an integer of at least ${minimum}.`
        );
    }
    return value;
}

function validateParameter( property, value )
{
    const range = forgeSourceRanges[property];
    if ( !range ) throw new Error( `Unknown forge parameter '${property}'.` );
    const resolved = validateFinite( Number( value ), `Forge ${property}` );
    if ( resolved < range.min || resolved > range.max )
    {
        throw new RangeError(
            `Forge ${property} must be between ${range.min} and ${range.max}.`
        );
    }
    return resolved;
}

function validateMode( mode )
{
    if ( !forgeSourceModes.includes( mode ) )
    {
        throw new Error( `Unknown forge source mode '${mode}'.` );
    }
    return mode;
}

function resolvePair( value, label )
{
    const pair = Array.isArray( value ) || ArrayBuffer.isView( value )
        ? value
        : value && Number.isFinite( value.x ) && Number.isFinite( value.z )
            ? [ value.x, value.z ]
            : null;
    if ( !pair || pair.length < 2 )
    {
        throw new TypeError( `${label} must contain finite x and z values.` );
    }
    return Object.freeze( [
        validateFinite( Number( pair[0] ), `${label} x` ),
        validateFinite( Number( pair[1] ), `${label} z` )
    ] );
}

function resolveDirection( value )
{
    const direction = resolvePair( value ?? [ 0, -1 ], 'Forge direction' );
    const length = Math.hypot( direction[0], direction[1] );
    if ( length <= Number.EPSILON )
    {
        throw new RangeError( 'Forge direction must have non-zero length.' );
    }
    return Object.freeze( [
        direction[0] / length,
        direction[1] / length
    ] );
}

function resolveLayoutSources( snapshot )
{
    const candidates = Array.isArray( snapshot )
        ? snapshot
        : snapshot?.sources;
    if ( !Array.isArray( candidates ) )
    {
        throw new TypeError( 'Forge source layout must provide a sources array.' );
    }
    return Object.freeze( candidates.map( ( source, fallbackIndex ) => {
        const sourceIndex = Number.isInteger( source.sourceIndex )
            ? source.sourceIndex
            : Number.isInteger( source.index )
                ? source.index
                : fallbackIndex;
        return Object.freeze( {
            sourceIndex,
            id: String( source.id ?? `source-${sourceIndex}` ),
            label: String( source.label ?? `Source ${sourceIndex + 1}` ),
            position: resolvePair(
                source.position ?? source.sourcePosition,
                'Forge source position'
            ),
            direction: resolveDirection( source.direction )
        } );
    } ) );
}

export function createForgeSourceLayer( {
    parameters: parameterOverrides = {},
    maxSources = defaultMaxSources
} = {} )
{
    validatePositiveInteger( maxSources, 'Forge maximum sources' );

    const parameters = {
        mode: validateMode(
            parameterOverrides.mode ?? forgeSourceDefaults.mode
        ),
        selectedSourceIndex: Number(
            parameterOverrides.selectedSourceIndex
                ?? forgeSourceDefaults.selectedSourceIndex
        ),
        heatIntensity: validateParameter(
            'heatIntensity',
            parameterOverrides.heatIntensity
                ?? forgeSourceDefaults.heatIntensity
        ),
        heatReach: validateParameter(
            'heatReach',
            parameterOverrides.heatReach ?? forgeSourceDefaults.heatReach
        ),
        settlingTime: validateParameter(
            'settlingTime',
            parameterOverrides.settlingTime
                ?? forgeSourceDefaults.settlingTime
        )
    };
    if ( !Number.isInteger( parameters.selectedSourceIndex )
        || parameters.selectedSourceIndex < 0
        || parameters.selectedSourceIndex >= maxSources )
    {
        throw new RangeError(
            `Forge selected source index must be between 0 and ${maxSources - 1}.`
        );
    }

    let sources = Object.freeze( [] );
    const sourceStates = new Map();
    let visible = true;
    let disposed = false;
    let revision = 1;
    let previousUpdateTime = null;
    let surfacePhase = 0;
    let acceptedEmissionCount = 0;
    let manifestedEmissionCount = 0;
    let snapshot = null;
    let fieldState = null;

    function isSourceManifested( sourceIndex )
    {
        if ( !visible || parameters.mode === 'off' ) return false;
        if ( parameters.mode === 'all' ) return true;
        return sourceIndex === parameters.selectedSourceIndex;
    }

    function manifestedSourceCount()
    {
        if ( !visible || parameters.mode === 'off' ) return 0;
        if ( parameters.mode === 'all' ) return sources.length;
        return sources.some(
            ( source ) => source.sourceIndex === parameters.selectedSourceIndex
        ) ? 1 : 0;
    }

    function activeSourceCount()
    {
        return sources.reduce( ( count, source ) => {
            const pressure = sourceStates.get( source.sourceIndex )?.pressure ?? 0;
            return count + (
                isSourceManifested( source.sourceIndex ) && pressure > 0.001
                    ? 1
                    : 0
            );
        }, 0 );
    }

    function sourceRingStatistics()
    {
        if ( sources.length === 0 )
        {
            return { average: 0, minimum: 0, maximum: 0 };
        }
        const radii = sources.map( ( source ) => Math.hypot(
            source.position[0],
            source.position[1]
        ) );
        return {
            average: radii.reduce( ( total, radius ) => total + radius, 0 )
                / radii.length,
            minimum: Math.min( ...radii ),
            maximum: Math.max( ...radii )
        };
    }

    function refreshState()
    {
        const ring = sourceRingStatistics();
        const thermalSources = Object.freeze( sources.map( ( source ) => {
            const pressure = sourceStates.get( source.sourceIndex )?.pressure ?? 0;
            return Object.freeze( {
                sourceIndex: source.sourceIndex,
                position: source.position,
                direction: source.direction,
                pressure,
                manifested: isSourceManifested( source.sourceIndex )
            } );
        } ) );
        const sourcePressures = Object.freeze( thermalSources.map( ( source ) =>
            Object.freeze( {
                sourceIndex: source.sourceIndex,
                pressure: source.pressure
            } )
        ) );
        fieldState = Object.freeze( {
            revision,
            visible,
            mode: parameters.mode,
            heatIntensity: parameters.heatIntensity,
            heatReach: parameters.heatReach,
            surfacePhase,
            sources: thermalSources
        } );
        const activeCount = activeSourceCount();
        snapshot = Object.freeze( {
            revision,
            status: visible ? 'active' : 'hidden',
            mode: parameters.mode,
            sourceCount: sources.length,
            selectedSourceIndex: parameters.selectedSourceIndex,
            manifestedSourceCount: manifestedSourceCount(),
            fixedSourceCapacity: maxSources,
            activeSourceCount: activeCount,
            acceptedEmissionCount,
            emissionEventCount: acceptedEmissionCount,
            manifestedEmissionCount,
            sourcePressures,
            maximumPressure: sourcePressures.reduce(
                ( maximum, state ) => Math.max( maximum, state.pressure ),
                0
            ),
            sourceRingRadius: ring.average,
            minimumSourceRadius: ring.minimum,
            maximumSourceRadius: ring.maximum,
            visualMassCreated: 0,
            ownsAnimationLoop: false,
            renderMeshCount: 0,
            geometryUuids: Object.freeze( [] ),
            materialUuids: Object.freeze( [] )
        } );
        return snapshot;
    }

    function clearPressures()
    {
        for ( const state of sourceStates.values() ) state.pressure = 0;
        previousUpdateTime = null;
    }

    function clearActivity()
    {
        clearPressures();
        acceptedEmissionCount = 0;
        manifestedEmissionCount = 0;
        revision += 1;
        return refreshState();
    }

    function setSourceLayout( layoutSnapshot )
    {
        if ( disposed ) throw new Error( 'The forge source layer is disposed.' );
        const resolved = resolveLayoutSources( layoutSnapshot );
        if ( resolved.length > maxSources )
        {
            throw new RangeError(
                `Forge source layout exceeds the fixed capacity of ${maxSources}.`
            );
        }
        sources = resolved;
        sourceStates.clear();
        for ( const source of sources )
        {
            sourceStates.set( source.sourceIndex, { pressure: 0 } );
        }
        if ( sources.length > 0 && !sources.some(
            ( source ) => source.sourceIndex === parameters.selectedSourceIndex
        ) )
        {
            parameters.selectedSourceIndex = sources[0].sourceIndex;
        }
        acceptedEmissionCount = 0;
        manifestedEmissionCount = 0;
        previousUpdateTime = null;
        revision += 1;
        return refreshState();
    }

    function consumeEmission( event )
    {
        if ( disposed ) throw new Error( 'The forge source layer is disposed.' );
        if ( !event || !Number.isInteger( event.sourceIndex ) )
        {
            throw new TypeError(
                'Forge emission events require an integer sourceIndex.'
            );
        }
        acceptedEmissionCount += 1;
        if ( !isSourceManifested( event.sourceIndex ) )
        {
            revision += 1;
            refreshState();
            return false;
        }
        const state = sourceStates.get( event.sourceIndex );
        if ( !state )
        {
            revision += 1;
            refreshState();
            return false;
        }
        const temperature = Number.isFinite( event.temperature )
            ? clamp( Number( event.temperature ), 0, 1 )
            : 1;
        state.pressure = Math.min(
            1,
            state.pressure + 0.1 + temperature * 0.08
        );
        manifestedEmissionCount += 1;
        revision += 1;
        refreshState();
        return true;
    }

    function setParameter( property, value )
    {
        if ( disposed ) throw new Error( 'The forge source layer is disposed.' );
        const resolved = validateParameter( property, value );
        parameters[property] = resolved;
        revision += 1;
        refreshState();
        return resolved;
    }

    refreshState();

    return {
        parameters,
        setSourceLayout,
        consumeEmission,
        setParameter,
        setMode( mode ) {
            if ( disposed ) throw new Error( 'The forge source layer is disposed.' );
            parameters.mode = validateMode( mode );
            clearPressures();
            revision += 1;
            refreshState();
            return parameters.mode;
        },
        setSelectedSourceIndex( sourceIndex ) {
            if ( disposed ) throw new Error( 'The forge source layer is disposed.' );
            if ( !Number.isInteger( sourceIndex )
                || sourceIndex < 0
                || sourceIndex >= maxSources )
            {
                throw new RangeError(
                    `Forge selected source index must be between 0 and ${maxSources - 1}.`
                );
            }
            parameters.selectedSourceIndex = sourceIndex;
            clearPressures();
            revision += 1;
            refreshState();
            return sourceIndex;
        },
        setVisible( nextVisible ) {
            if ( disposed ) throw new Error( 'The forge source layer is disposed.' );
            visible = Boolean( nextVisible );
            clearPressures();
            revision += 1;
            refreshState();
            return visible;
        },
        update( time ) {
            if ( disposed ) throw new Error( 'The forge source layer is disposed.' );
            validateFinite( time, 'Forge update time' );
            if ( time < 0 ) throw new RangeError( 'Forge update time cannot be negative.' );
            const delta = previousUpdateTime === null
                ? 0
                : clamp( ( time - previousUpdateTime ) / 1000, 0, 0.1 );
            previousUpdateTime = time;
            surfacePhase = time / 1000;
            let pressureChanged = false;
            if ( delta > 0 )
            {
                const release = delta / parameters.settlingTime;
                for ( const state of sourceStates.values() )
                {
                    const previous = state.pressure;
                    state.pressure = Math.max( 0, state.pressure - release );
                    pressureChanged ||= state.pressure !== previous;
                }
            }
            if ( pressureChanged ) revision += 1;
            refreshState();
            return snapshot;
        },
        refreshSurface() {
            if ( disposed ) throw new Error( 'The forge source layer is disposed.' );
            revision += 1;
            return refreshState();
        },
        clearActivity,
        getSnapshot() {
            return snapshot;
        },
        getFieldState() {
            return fieldState;
        },
        getSources() {
            return sources;
        },
        dispose() {
            if ( disposed ) return;
            disposed = true;
            snapshot = null;
            fieldState = null;
        }
    };
}

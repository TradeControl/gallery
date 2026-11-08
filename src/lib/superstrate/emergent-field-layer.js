import * as THREE from 'three';

const defaultRadius = 72;
const defaultWidthSegments = 64;
const defaultHeightSegments = 40;
const phaseRateScale = 0.72;
const sourceIds = Object.freeze( [
    'substrate',
    'physical',
    'information',
    'living'
] );

export const superstrateDefaults = Object.freeze( {
    presence: 0.68,
    breath: 0.42,
    coherence: 0.56,
    confluence: 0.72,
    substrateMagnet: 0.34,
    physicalMagnet: 0.28,
    informationMagnet: 0.42,
    livingMagnet: 0.36
} );

export const superstrateRanges = Object.freeze( {
    presence: Object.freeze( { min: 0, max: 1.4, step: 0.01 } ),
    breath: Object.freeze( { min: 0, max: 1.2, step: 0.01 } ),
    coherence: Object.freeze( { min: 0, max: 1, step: 0.01 } ),
    confluence: Object.freeze( { min: 0, max: 1, step: 0.01 } ),
    substrateMagnet: Object.freeze( { min: 0, max: 1, step: 0.01 } ),
    physicalMagnet: Object.freeze( { min: 0, max: 1, step: 0.01 } ),
    informationMagnet: Object.freeze( { min: 0, max: 1, step: 0.01 } ),
    livingMagnet: Object.freeze( { min: 0, max: 1, step: 0.01 } )
} );

export const superstrateMagnetDefinitions = Object.freeze( {
    substrate: Object.freeze( {
        parameter: 'substrateMagnet',
        influence: 'depth-and-horizon-pressure'
    } ),
    physical: Object.freeze( {
        parameter: 'physicalMagnet',
        influence: 'condensation-and-warmth'
    } ),
    information: Object.freeze( {
        parameter: 'informationMagnet',
        influence: 'coherence-and-filament-order'
    } ),
    living: Object.freeze( {
        parameter: 'livingMagnet',
        influence: 'recursive-reach-and-phase-divergence'
    } )
} );

function frozenSourceDefinition( {
    direction,
    angularRadius,
    phaseOffset,
    phaseRate,
    influence
} )
{
    return Object.freeze( {
        direction: Object.freeze( direction ),
        angularRadius,
        phaseOffset,
        phaseRate,
        influence
    } );
}

export const superstrateSourceDefinitions = Object.freeze( {
    substrate: frozenSourceDefinition( {
        direction: [ -0.52, -0.22, -0.82 ],
        angularRadius: 0.92,
        phaseOffset: 0.4,
        phaseRate: 0.73,
        influence: 'low-frequency-depth-pressure'
    } ),
    physical: frozenSourceDefinition( {
        direction: [ 0.38, -0.08, -0.92 ],
        angularRadius: 0.74,
        phaseOffset: 2.0,
        phaseRate: 1.07,
        influence: 'warm-source-condensation'
    } ),
    information: frozenSourceDefinition( {
        direction: [ -0.18, 0.38, -0.91 ],
        angularRadius: 0.72,
        phaseOffset: 3.7,
        phaseRate: 0.89,
        influence: 'ordered-filament-articulation'
    } ),
    living: frozenSourceDefinition( {
        direction: [ 0.32, 0.32, -0.89 ],
        angularRadius: 0.72,
        phaseOffset: 5.1,
        phaseRate: 1.31,
        influence: 'recursive-living-reach'
    } )
} );

export const superstrateFieldViews = Object.freeze( {
    complete: 0,
    substrate: 1,
    physical: 2,
    information: 3,
    living: 4,
    confluence: 5
} );

function validateFinite( value, label )
{
    if ( !Number.isFinite( value ) )
    {
        throw new TypeError( `${label} must be finite.` );
    }
    return value;
}

function validateParameter( property, value )
{
    const range = superstrateRanges[property];
    if ( !range )
    {
        throw new Error( `Unknown superstrate parameter '${property}'.` );
    }
    validateFinite( value, `Superstrate ${property}` );
    if ( value < range.min || value > range.max )
    {
        throw new RangeError(
            `Superstrate ${property} must be between ${range.min} and ${range.max}.`
        );
    }
    return value;
}

function resolveParameters( values )
{
    return Object.fromEntries( Object.keys( superstrateDefaults ).map(
        ( property ) => [
            property,
            validateParameter(
                property,
                Number( values[property] ?? superstrateDefaults[property] )
            )
        ]
    ) );
}

function resolveDirection( value, label )
{
    let components;
    if ( value?.isVector3 )
    {
        components = [ value.x, value.y, value.z ];
    }
    else if ( Array.isArray( value ) || ArrayBuffer.isView( value ) )
    {
        components = Array.from( value );
    }
    else if ( value && typeof value === 'object' )
    {
        components = [ value.x, value.y, value.z ];
    }
    else
    {
        throw new TypeError( `${label} must be a three-component direction.` );
    }
    if ( components.length !== 3 )
    {
        throw new TypeError( `${label} must contain exactly three components.` );
    }
    const direction = new THREE.Vector3(
        ...components.map( ( component, index ) =>
            validateFinite( Number( component ), `${label}[${index}]` ) )
    );
    if ( direction.lengthSq() < 1e-12 )
    {
        throw new RangeError( `${label} cannot be a zero-length direction.` );
    }
    return direction.normalize();
}

function resolveAngularRadius( value, label )
{
    const radius = validateFinite( Number( value ), label );
    if ( radius < 0.18 || radius > 1.45 )
    {
        throw new RangeError( `${label} must be between 0.18 and 1.45.` );
    }
    return radius;
}

function resolveSource( sourceId, override = {}, fallback = null )
{
    const definition = superstrateSourceDefinitions[sourceId];
    if ( !definition )
    {
        throw new Error( `Unknown superstrate source '${sourceId}'.` );
    }
    if ( !override || typeof override !== 'object' )
    {
        throw new TypeError( `Superstrate source '${sourceId}' requires an object.` );
    }
    const baseDirection = fallback?.direction ?? definition.direction;
    const baseRadius = fallback?.angularRadius ?? definition.angularRadius;
    return {
        direction: resolveDirection(
            override.direction ?? baseDirection,
            `Superstrate ${sourceId} direction`
        ),
        angularRadius: resolveAngularRadius(
            override.angularRadius ?? baseRadius,
            `Superstrate ${sourceId} angular radius`
        )
    };
}

function resolveSources( overrides = {} )
{
    if ( !overrides || typeof overrides !== 'object' )
    {
        throw new TypeError( 'Superstrate sources require an object.' );
    }
    for ( const sourceId of Object.keys( overrides ) )
    {
        if ( !superstrateSourceDefinitions[sourceId] )
        {
            throw new Error( `Unknown superstrate source '${sourceId}'.` );
        }
    }
    return Object.fromEntries( sourceIds.map( ( sourceId ) => [
        sourceId,
        resolveSource( sourceId, overrides[sourceId] ?? {} )
    ] ) );
}

function sourceSnapshot( sources )
{
    return Object.freeze( Object.fromEntries( sourceIds.map( ( sourceId ) => {
        const source = sources[sourceId];
        return [ sourceId, Object.freeze( {
            direction: Object.freeze( source.direction.toArray() ),
            angularRadius: source.angularRadius
        } ) ];
    } ) ) );
}

export function evaluateSuperstrateBreath( phase, breath = 1 )
{
    validateFinite( phase, 'Superstrate phase' );
    const resolvedBreath = validateParameter( 'breath', Number( breath ) );
    const irregular = THREE.MathUtils.clamp(
        0.52
            + Math.sin( phase * 0.113 + 0.7 ) * 0.19
            + Math.sin( phase * 0.173 + 2.1 ) * 0.12
            + Math.sin( phase * 0.047 + 4.2 ) * 0.08,
        0,
        1
    );
    return THREE.MathUtils.clamp(
        0.5 + ( irregular - 0.5 ) * resolvedBreath,
        0,
        1
    );
}

const vertexShader = /* glsl */`
    varying vec3 vSuperstrateDirection;

    void main()
    {
        vSuperstrateDirection = normalize( position );
        gl_Position = projectionMatrix * modelViewMatrix
            * vec4( position, 1.0 );
    }
`;

const fragmentShader = /* glsl */`
    uniform float superstrateTime;
    uniform float superstratePresence;
    uniform float superstrateBreath;
    uniform float superstrateCoherence;
    uniform float superstrateConfluence;
    uniform float superstrateSubstrateMagnet;
    uniform float superstratePhysicalMagnet;
    uniform float superstrateInformationMagnet;
    uniform float superstrateLivingMagnet;
    uniform vec3 superstrateSubstrateDirection;
    uniform vec3 superstratePhysicalDirection;
    uniform vec3 superstrateInformationDirection;
    uniform vec3 superstrateLivingDirection;
    uniform float superstrateSubstrateAngularRadius;
    uniform float superstratePhysicalAngularRadius;
    uniform float superstrateInformationAngularRadius;
    uniform float superstrateLivingAngularRadius;
    uniform vec4 superstrateFieldPhases;
    uniform int superstrateDiagnosticView;
    varying vec3 vSuperstrateDirection;

    float superstrateHash( vec3 point )
    {
        point = fract( point * 0.1031 );
        point += dot( point, point.yzx + 33.33 );
        return fract( ( point.x + point.y ) * point.z );
    }

    float superstrateNoise( vec3 point )
    {
        vec3 cell = floor( point );
        vec3 local = fract( point );
        local = local * local * ( 3.0 - 2.0 * local );

        float n000 = superstrateHash( cell + vec3( 0.0, 0.0, 0.0 ) );
        float n100 = superstrateHash( cell + vec3( 1.0, 0.0, 0.0 ) );
        float n010 = superstrateHash( cell + vec3( 0.0, 1.0, 0.0 ) );
        float n110 = superstrateHash( cell + vec3( 1.0, 1.0, 0.0 ) );
        float n001 = superstrateHash( cell + vec3( 0.0, 0.0, 1.0 ) );
        float n101 = superstrateHash( cell + vec3( 1.0, 0.0, 1.0 ) );
        float n011 = superstrateHash( cell + vec3( 0.0, 1.0, 1.0 ) );
        float n111 = superstrateHash( cell + vec3( 1.0, 1.0, 1.0 ) );

        float n00 = mix( n000, n100, local.x );
        float n10 = mix( n010, n110, local.x );
        float n01 = mix( n001, n101, local.x );
        float n11 = mix( n011, n111, local.x );
        float n0 = mix( n00, n10, local.y );
        float n1 = mix( n01, n11, local.y );
        return mix( n0, n1, local.z );
    }

    float superstrateFbm( vec3 point )
    {
        mat3 turn = mat3(
             0.00,  0.80,  0.60,
            -0.80,  0.36, -0.48,
            -0.60, -0.48,  0.64
        );
        float value = 0.0;
        float amplitude = 0.52;
        for ( int band = 0; band < 4; band += 1 )
        {
            value += superstrateNoise( point ) * amplitude;
            point = turn * point * 2.03 + vec3( 0.71, -0.43, 0.29 );
            amplitude *= 0.49;
        }
        return value;
    }

    float superstratePulse( float phase )
    {
        return clamp(
            0.54
                + sin( phase ) * 0.19
                + sin( phase * 0.43 + 1.7 ) * 0.12
                + sin( phase * 0.17 + 4.1 ) * 0.07,
            0.0,
            1.0
        );
    }

    float superstrateDirectionalLobe(
        vec3 direction,
        vec3 sourceDirection,
        float angularRadius
    )
    {
        float outerEdge = cos( angularRadius );
        float innerEdge = cos( angularRadius * 0.28 );
        return smoothstep(
            outerEdge,
            innerEdge,
            dot( direction, normalize( sourceDirection ) )
        );
    }

    float superstrateSourceRadius(
        vec3 direction,
        vec3 sourceDirection
    )
    {
        return sqrt( max(
            0.0,
            2.0 * (
                1.0 - dot( direction, normalize( sourceDirection ) )
            )
        ) );
    }

    float superstratePairwiseConfluence(
        float substrateField,
        float physicalField,
        float informationField,
        float livingField
    )
    {
        float pairOverlap =
              substrateField * physicalField * 0.82
            + substrateField * informationField * 0.68
            + substrateField * livingField * 0.76
            + physicalField * informationField * 1.08
            + physicalField * livingField * 0.91
            + informationField * livingField * 1.14;
        return pairOverlap;
    }

    void main()
    {
        vec3 direction = normalize( vSuperstrateDirection );
        float time = superstrateTime;
        float breathAmount = clamp(
            superstrateBreath / 1.2,
            0.0,
            1.0
        );
        float substratePulse = superstratePulse(
            superstrateFieldPhases.x
        );
        float physicalPulse = superstratePulse(
            superstrateFieldPhases.y
        );
        float informationPulse = superstratePulse(
            superstrateFieldPhases.z
        );
        float livingPulse = superstratePulse(
            superstrateFieldPhases.w
        );
        float substrateEnvelope = mix(
            1.0,
            mix( 0.82, 1.18, substratePulse ),
            breathAmount
        );
        float physicalEnvelope = mix(
            1.0,
            mix( 0.80, 1.20, physicalPulse ),
            breathAmount
        );
        float informationEnvelope = mix(
            1.0,
            mix( 0.84, 1.16, informationPulse ),
            breathAmount
        );
        float livingEnvelope = mix(
            1.0,
            mix( 0.78, 1.22, livingPulse ),
            breathAmount
        );

        vec3 point = direction * (
            2.45 + superstrateCoherence * 0.78
        );
        float warpA = superstrateFbm(
            point * 0.73
                + vec3( time * 0.041, -time * 0.029, time * 0.023 )
        );
        float warpB = superstrateFbm(
            point.yzx * 0.86
                + vec3( -time * 0.033, time * 0.047, time * 0.018 )
        );
        vec3 warpedPoint = point + vec3(
            warpA - 0.5,
            warpB - 0.5,
            warpA - warpB
        ) * 0.38;

        float substrateNoise = superstrateFbm(
            warpedPoint * 0.82
                + vec3( time * 0.045, -time * 0.022, time * 0.028 )
        );
        float physicalNoise = superstrateFbm(
            warpedPoint * 1.17
                + vec3( -time * 0.083, time * 0.112, time * 0.047 )
                + vec3( 1.7, -0.4, 0.8 )
        );
        float informationNoise = superstrateFbm(
            warpedPoint * 1.91
                + vec3( time * 0.096, time * 0.037, -time * 0.071 )
                + vec3( -0.3, 1.9, -0.7 )
        );
        float livingNoise = superstrateFbm(
            warpedPoint * 1.34
                + vec3( -time * 0.052, time * 0.079, -time * 0.104 )
                + vec3(
                    substrateNoise,
                    physicalNoise,
                    informationNoise
                ) * 0.22
        );

        float substrateLobe = superstrateDirectionalLobe(
            direction,
            superstrateSubstrateDirection,
            superstrateSubstrateAngularRadius
        );
        float physicalLobe = superstrateDirectionalLobe(
            direction,
            superstratePhysicalDirection,
            superstratePhysicalAngularRadius
        );
        float informationLobe = superstrateDirectionalLobe(
            direction,
            superstrateInformationDirection,
            superstrateInformationAngularRadius
        );
        float livingLobe = superstrateDirectionalLobe(
            direction,
            superstrateLivingDirection,
            superstrateLivingAngularRadius
        );

        float informationRidge = pow(
            1.0 - abs( informationNoise * 2.0 - 1.0 ),
            mix( 2.0, 5.2, superstrateCoherence )
        );
        float livingRidge = pow(
            1.0 - abs( livingNoise * 2.0 - 1.0 ),
            3.0
        );
        float physicalFront = 0.84 + sin(
            superstrateSourceRadius(
                direction,
                superstratePhysicalDirection
            ) * 13.0 - superstrateFieldPhases.y * 1.07
        ) * 0.16;
        float livingFront = 0.87 + sin(
            superstrateSourceRadius(
                direction,
                superstrateLivingDirection
            ) * 11.0 - superstrateFieldPhases.w * 0.83
        ) * 0.13;

        float substrateField = substrateLobe
            * superstrateSubstrateMagnet
            * ( 0.16 + smoothstep( 0.27, 0.74, substrateNoise ) * 0.84 )
            * substrateEnvelope;
        float physicalField = physicalLobe
            * superstratePhysicalMagnet
            * ( 0.12 + smoothstep( 0.39, 0.81, physicalNoise ) * 0.88 )
            * physicalEnvelope
            * physicalFront;
        float informationField = informationLobe
            * superstrateInformationMagnet
            * ( 0.10 + informationRidge * 0.90 )
            * informationEnvelope;
        float livingField = livingLobe
            * superstrateLivingMagnet
            * ( 0.10
                + smoothstep( 0.29, 0.72, livingNoise ) * 0.55
                + livingRidge * 0.35 )
            * livingEnvelope
            * livingFront;

        float pairEnergy = superstratePairwiseConfluence(
            substrateField,
            physicalField,
            informationField,
            livingField
        );
        float confluenceNoise = superstrateFbm(
            warpedPoint * 2.23
                + vec3( time * 0.061, -time * 0.047, time * 0.083 )
                + vec3(
                    substrateNoise,
                    informationNoise,
                    livingNoise
                ) * 0.27
        );
        float confluenceRidge = pow(
            1.0 - abs( confluenceNoise * 2.0 - 1.0 ),
            2.7
        );
        float confluenceField = smoothstep( 0.018, 0.22, pairEnergy )
            * ( 0.46 + confluenceRidge * 0.54 )
            * superstrateConfluence;

        vec3 voidColour = vec3( 0.0005, 0.0007, 0.0013 );
        vec3 indigo = vec3( 0.025, 0.018, 0.061 );
        vec3 substrateColour = vec3( 0.036, 0.073, 0.116 );
        vec3 physicalColour = vec3( 0.132, 0.052, 0.027 );
        vec3 informationColour = vec3( 0.145, 0.178, 0.208 );
        vec3 livingColour = vec3( 0.082, 0.035, 0.105 );
        vec3 confluenceColour = vec3( 0.175, 0.197, 0.218 );

        float sourceEnvelope = substrateLobe * superstrateSubstrateMagnet
            + physicalLobe * superstratePhysicalMagnet
            + informationLobe * superstrateInformationMagnet
            + livingLobe * superstrateLivingMagnet;
        vec3 substrateContribution = substrateColour
            * substrateField * 0.42;
        vec3 physicalContribution = physicalColour
            * physicalField * 0.48;
        vec3 informationContribution = informationColour
            * informationField * 0.46;
        vec3 livingContribution = livingColour
            * livingField * 0.54;
        vec3 confluenceContribution = confluenceColour
            * confluenceField * 0.62;
        vec3 completeColour = voidColour
            + indigo * sourceEnvelope * 0.025
            + substrateContribution
            + physicalContribution
            + informationContribution
            + livingContribution
            + confluenceContribution;
        vec3 colour = completeColour;
        if ( superstrateDiagnosticView == 1 )
        {
            colour = voidColour + substrateContribution * 5.0;
        }
        else if ( superstrateDiagnosticView == 2 )
        {
            colour = voidColour + physicalContribution * 5.5;
        }
        else if ( superstrateDiagnosticView == 3 )
        {
            colour = voidColour + informationContribution * 2.2;
        }
        else if ( superstrateDiagnosticView == 4 )
        {
            colour = voidColour + livingContribution * 5.5;
        }
        else if ( superstrateDiagnosticView == 5 )
        {
            colour = voidColour + confluenceContribution * 2.0;
        }
        colour *= 0.30 + superstratePresence * 0.92;

        float stableGrain = superstrateHash(
            vec3( gl_FragCoord.xy, 17.0 )
        ) - 0.5;
        colour += stableGrain * 0.0014;
        gl_FragColor = vec4( max( colour, vec3( 0.0 ) ), 1.0 );
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
    }
`;

function createMaterial( uniforms )
{
    const material = new THREE.ShaderMaterial( {
        uniforms,
        vertexShader,
        fragmentShader,
        side: THREE.BackSide,
        depthTest: false,
        depthWrite: false,
        transparent: false,
        fog: false,
        toneMapped: true,
        dithering: true
    } );
    material.name = 'Metaphysical superstrate emergent field';
    material.userData.emergentSuperstrate = Object.freeze( {
        fieldModel: 'supervenient-directional-field',
        parallaxModel: 'camera-centred-directional-shell',
        textureInputCount: 0,
        astronomicalObjectCount: 0,
        starCount: 0,
        lightCount: 0,
        fieldLayerCount: 5,
        sourceFieldCount: 4,
        confluenceFieldCount: 1,
        noiseBandCount: 4,
        pulseBandCount: 4,
        magnetCount: Object.keys( superstrateMagnetDefinitions ).length,
        sourceLocalizationModel: 'directional-lobes',
        interactionModel: 'pairwise-confluence'
    } );
    return material;
}

function observerPosition( observer )
{
    if ( observer?.isVector3 ) return observer;
    if ( observer?.position?.isVector3 ) return observer.position;
    return null;
}

export function createEmergentSuperstrateLayer( {
    scene,
    observer = null,
    parameters: parameterOverrides = {},
    sources: sourceOverrides = {},
    radius = defaultRadius,
    widthSegments = defaultWidthSegments,
    heightSegments = defaultHeightSegments,
    renderOrder = -1000
} )
{
    if ( !scene?.isObject3D || typeof scene.add !== 'function' )
    {
        throw new TypeError( 'An emergent superstrate requires a Three.js scene.' );
    }
    validateFinite( radius, 'Superstrate radius' );
    if ( radius <= 0 )
    {
        throw new RangeError( 'Superstrate radius must be positive.' );
    }
    if ( !Number.isInteger( widthSegments ) || widthSegments < 3 )
    {
        throw new RangeError(
            'Superstrate width segments must be an integer of at least 3.'
        );
    }
    if ( !Number.isInteger( heightSegments ) || heightSegments < 2 )
    {
        throw new RangeError(
            'Superstrate height segments must be an integer of at least 2.'
        );
    }
    if ( !Number.isFinite( renderOrder ) )
    {
        throw new TypeError( 'Superstrate render order must be finite.' );
    }

    const parameters = resolveParameters( parameterOverrides );
    const sources = resolveSources( sourceOverrides );
    const geometry = new THREE.SphereGeometry(
        radius,
        widthSegments,
        heightSegments
    );
    geometry.name = 'Emergent superstrate directional shell';
    const uniforms = {
        superstrateTime: { value: 0 },
        superstratePresence: { value: parameters.presence },
        superstrateBreath: { value: parameters.breath },
        superstrateCoherence: { value: parameters.coherence },
        superstrateConfluence: { value: parameters.confluence },
        superstrateSubstrateMagnet: {
            value: parameters.substrateMagnet
        },
        superstratePhysicalMagnet: {
            value: parameters.physicalMagnet
        },
        superstrateInformationMagnet: {
            value: parameters.informationMagnet
        },
        superstrateLivingMagnet: {
            value: parameters.livingMagnet
        },
        superstrateSubstrateDirection: {
            value: sources.substrate.direction.clone()
        },
        superstratePhysicalDirection: {
            value: sources.physical.direction.clone()
        },
        superstrateInformationDirection: {
            value: sources.information.direction.clone()
        },
        superstrateLivingDirection: {
            value: sources.living.direction.clone()
        },
        superstrateSubstrateAngularRadius: {
            value: sources.substrate.angularRadius
        },
        superstratePhysicalAngularRadius: {
            value: sources.physical.angularRadius
        },
        superstrateInformationAngularRadius: {
            value: sources.information.angularRadius
        },
        superstrateLivingAngularRadius: {
            value: sources.living.angularRadius
        },
        superstrateFieldPhases: {
            value: new THREE.Vector4(
                superstrateSourceDefinitions.substrate.phaseOffset,
                superstrateSourceDefinitions.physical.phaseOffset,
                superstrateSourceDefinitions.information.phaseOffset,
                superstrateSourceDefinitions.living.phaseOffset
            )
        },
        superstrateDiagnosticView: {
            value: superstrateFieldViews.complete
        }
    };
    const material = createMaterial( uniforms );
    const mesh = new THREE.Mesh( geometry, material );
    mesh.name = 'Disconnected metaphysical superstrate';
    mesh.frustumCulled = false;
    mesh.renderOrder = renderOrder;
    const initialObserverPosition = observerPosition( observer );
    if ( initialObserverPosition ) mesh.position.copy( initialObserverPosition );
    scene.add( mesh );

    const uniformByProperty = Object.freeze( {
        presence: 'superstratePresence',
        breath: 'superstrateBreath',
        coherence: 'superstrateCoherence',
        confluence: 'superstrateConfluence',
        substrateMagnet: 'superstrateSubstrateMagnet',
        physicalMagnet: 'superstratePhysicalMagnet',
        informationMagnet: 'superstrateInformationMagnet',
        livingMagnet: 'superstrateLivingMagnet'
    } );
    const sourceUniforms = Object.freeze( {
        substrate: Object.freeze( {
            direction: 'superstrateSubstrateDirection',
            angularRadius: 'superstrateSubstrateAngularRadius'
        } ),
        physical: Object.freeze( {
            direction: 'superstratePhysicalDirection',
            angularRadius: 'superstratePhysicalAngularRadius'
        } ),
        information: Object.freeze( {
            direction: 'superstrateInformationDirection',
            angularRadius: 'superstrateInformationAngularRadius'
        } ),
        living: Object.freeze( {
            direction: 'superstrateLivingDirection',
            angularRadius: 'superstrateLivingAngularRadius'
        } )
    } );

    let disposed = false;
    let visible = true;
    let frozen = false;
    let revision = 1;
    let previousUpdateTime = null;
    let accumulatedPhase = 0;
    let fieldView = 'complete';
    let snapshot = null;

    function assertActive()
    {
        if ( disposed ) throw new Error( 'The emergent superstrate is disposed.' );
    }

    function refreshSnapshot()
    {
        snapshot = Object.freeze( {
            revision,
            status: visible ? 'active' : 'hidden',
            frozen,
            radius,
            widthSegments,
            heightSegments,
            vertexCount: geometry.getAttribute( 'position' ).count,
            triangleCount: geometry.getIndex().count / 3,
            drawCallCount: 1,
            textureInputCount: 0,
            astronomicalObjectCount: 0,
            starCount: 0,
            lightCount: 0,
            fieldLayerCount: 5,
            sourceFieldCount: 4,
            confluenceFieldCount: 1,
            noiseBandCount: 4,
            pulseBandCount: 4,
            magnetCount: Object.keys( superstrateMagnetDefinitions ).length,
            observerRelative: true,
            fieldModel: 'supervenient-directional-field',
            parallaxModel: 'camera-centred-directional-shell',
            sourceLocalizationModel: 'directional-lobes',
            interactionModel: 'pairwise-confluence',
            fieldView,
            renderOrder,
            parameters: Object.freeze( { ...parameters } ),
            sources: sourceSnapshot( sources ),
            geometryUuid: geometry.uuid,
            materialUuid: material.uuid
        } );
        mesh.userData.emergentSuperstrate = snapshot;
        return snapshot;
    }

    function updateFieldPhases()
    {
        uniforms.superstrateFieldPhases.value.set(
            superstrateSourceDefinitions.substrate.phaseOffset
                + accumulatedPhase
                    * superstrateSourceDefinitions.substrate.phaseRate,
            superstrateSourceDefinitions.physical.phaseOffset
                + accumulatedPhase
                    * superstrateSourceDefinitions.physical.phaseRate,
            superstrateSourceDefinitions.information.phaseOffset
                + accumulatedPhase
                    * superstrateSourceDefinitions.information.phaseRate,
            superstrateSourceDefinitions.living.phaseOffset
                + accumulatedPhase
                    * superstrateSourceDefinitions.living.phaseRate
        );
    }

    function applySourceUniforms( sourceId )
    {
        const source = sources[sourceId];
        const names = sourceUniforms[sourceId];
        uniforms[names.direction].value.copy( source.direction );
        uniforms[names.angularRadius].value = source.angularRadius;
    }

    function setParameter( property, value )
    {
        assertActive();
        const resolved = validateParameter( property, Number( value ) );
        parameters[property] = resolved;
        uniforms[uniformByProperty[property]].value = resolved;
        revision += 1;
        refreshSnapshot();
        return resolved;
    }

    function setMagnets( values )
    {
        assertActive();
        if ( !values || typeof values !== 'object' )
        {
            throw new TypeError( 'Superstrate magnets require an object.' );
        }
        const resolved = [];
        for ( const [ magnetId, value ] of Object.entries( values ) )
        {
            const definition = superstrateMagnetDefinitions[magnetId];
            if ( !definition )
            {
                throw new Error( `Unknown superstrate magnet '${magnetId}'.` );
            }
            resolved.push( [
                definition.parameter,
                validateParameter( definition.parameter, Number( value ) )
            ] );
        }
        for ( const [ property, value ] of resolved )
        {
            parameters[property] = value;
            uniforms[uniformByProperty[property]].value = value;
        }
        revision += 1;
        refreshSnapshot();
        return Object.freeze( Object.fromEntries( resolved ) );
    }

    function setSources( values )
    {
        assertActive();
        if ( !values || typeof values !== 'object' )
        {
            throw new TypeError( 'Superstrate sources require an object.' );
        }
        const resolved = [];
        for ( const [ sourceId, value ] of Object.entries( values ) )
        {
            if ( !superstrateSourceDefinitions[sourceId] )
            {
                throw new Error( `Unknown superstrate source '${sourceId}'.` );
            }
            resolved.push( [
                sourceId,
                resolveSource( sourceId, value, sources[sourceId] )
            ] );
        }
        for ( const [ sourceId, source ] of resolved )
        {
            sources[sourceId].direction.copy( source.direction );
            sources[sourceId].angularRadius = source.angularRadius;
            applySourceUniforms( sourceId );
        }
        revision += 1;
        refreshSnapshot();
        return snapshot.sources;
    }

    function setSource( sourceId, value )
    {
        return setSources( { [sourceId]: value } )[sourceId];
    }

    function setFieldView( viewId )
    {
        assertActive();
        if ( !Object.prototype.hasOwnProperty.call(
            superstrateFieldViews,
            viewId
        ) )
        {
            throw new Error( `Unknown superstrate field view '${viewId}'.` );
        }
        fieldView = viewId;
        uniforms.superstrateDiagnosticView.value =
            superstrateFieldViews[viewId];
        revision += 1;
        refreshSnapshot();
        return fieldView;
    }

    function reset()
    {
        assertActive();
        for ( const [ property, value ] of Object.entries(
            superstrateDefaults
        ) )
        {
            parameters[property] = value;
            uniforms[uniformByProperty[property]].value = value;
        }
        for ( const sourceId of sourceIds )
        {
            const source = resolveSource( sourceId );
            sources[sourceId].direction.copy( source.direction );
            sources[sourceId].angularRadius = source.angularRadius;
            applySourceUniforms( sourceId );
        }
        accumulatedPhase = 0;
        previousUpdateTime = null;
        uniforms.superstrateTime.value = 0;
        updateFieldPhases();
        fieldView = 'complete';
        uniforms.superstrateDiagnosticView.value =
            superstrateFieldViews.complete;
        frozen = false;
        visible = true;
        mesh.visible = true;
        revision += 1;
        refreshSnapshot();
        return Object.freeze( { ...parameters } );
    }

    refreshSnapshot();

    return {
        group: mesh,
        mesh,
        material,
        parameters,
        update( time, nextObserver = observer ) {
            assertActive();
            validateFinite( time, 'Superstrate time' );
            if ( time < 0 )
            {
                throw new RangeError( 'Superstrate time cannot be negative.' );
            }
            const nextPosition = observerPosition( nextObserver );
            if ( nextPosition ) mesh.position.copy( nextPosition );
            const frameDelta = previousUpdateTime === null
                ? 0
                : THREE.MathUtils.clamp(
                    ( time - previousUpdateTime ) / 1000,
                    0,
                    0.05
                );
            previousUpdateTime = time;
            if ( visible && !frozen )
            {
                accumulatedPhase = (
                    accumulatedPhase + frameDelta * phaseRateScale
                ) % 1048576;
                uniforms.superstrateTime.value = accumulatedPhase;
                updateFieldPhases();
            }
            return snapshot;
        },
        setParameter,
        setMagnets,
        setSource,
        setSources,
        setFieldView,
        setObserverPosition( position ) {
            assertActive();
            const nextPosition = observerPosition( position );
            if ( !nextPosition )
            {
                throw new TypeError(
                    'Superstrate observer position must be a Three.js Vector3 or camera.'
                );
            }
            mesh.position.copy( nextPosition );
            return mesh.position;
        },
        setFrozen( nextFrozen ) {
            assertActive();
            frozen = Boolean( nextFrozen );
            revision += 1;
            refreshSnapshot();
            return frozen;
        },
        setVisible( nextVisible ) {
            assertActive();
            visible = Boolean( nextVisible );
            mesh.visible = visible;
            revision += 1;
            refreshSnapshot();
            return visible;
        },
        reset,
        getPhase() {
            return uniforms.superstrateTime.value;
        },
        getPulse() {
            return evaluateSuperstrateBreath(
                uniforms.superstrateTime.value,
                parameters.breath
            );
        },
        getFieldPhases() {
            const phases = uniforms.superstrateFieldPhases.value;
            return Object.freeze( {
                substrate: phases.x,
                physical: phases.y,
                information: phases.z,
                living: phases.w
            } );
        },
        getFieldView() {
            return fieldView;
        },
        getSnapshot() {
            return snapshot;
        },
        dispose() {
            if ( disposed ) return;
            disposed = true;
            scene.remove( mesh );
            geometry.dispose();
            material.dispose();
            snapshot = null;
        }
    };
}

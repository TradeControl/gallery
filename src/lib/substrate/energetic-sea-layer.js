import * as THREE from 'three';

const defaultExtent = 300;
const defaultSegments = 260;
const phaseRateScale = 1.6;

export const energeticSeaDefaults = Object.freeze( {
    swellHeight: 1.1,
    energy: 1.25,
    crestTension: 0.7,
    crossCurrent: 1,
    fineActivity: 0.9,
    currentSpeed: 1.1,
    reflection: 1.15
} );

export const energeticSeaRanges = Object.freeze( {
    swellHeight: Object.freeze( { min: 0.2, max: 1.6, step: 0.05 } ),
    energy: Object.freeze( { min: 0.25, max: 2, step: 0.05 } ),
    crestTension: Object.freeze( { min: 0, max: 1, step: 0.05 } ),
    crossCurrent: Object.freeze( { min: 0, max: 1.5, step: 0.05 } ),
    fineActivity: Object.freeze( { min: 0, max: 2, step: 0.05 } ),
    currentSpeed: Object.freeze( { min: 0, max: 2.5, step: 0.05 } ),
    reflection: Object.freeze( { min: 0, max: 2, step: 0.05 } )
} );

const surfaceVertexShader = /* glsl */`
    uniform float substrateTime;
    uniform float substrateSwellHeight;
    uniform float substrateEnergy;
    uniform float substrateCrestTension;
    uniform float substrateCrossCurrent;
    varying vec2 vSubstratePoint;
    varying float vSubstrateEnergy;
    varying float vSubstrateCompression;
    varying float vSubstrateHeight;

    mat2 substrateRotation( float angle )
    {
        float cosine = cos( angle );
        float sine = sin( angle );
        return mat2( cosine, -sine, sine, cosine );
    }

    float substratePacketEnergy( vec2 point, float time )
    {
        vec2 firstCentre = vec2(
            sin( time * 0.17 ) * 31.0 + cos( time * 0.071 ) * 9.0,
            cos( time * 0.11 ) * 23.0
        );
        vec2 secondCentre = vec2(
            cos( time * 0.083 + 1.7 ) * 35.0,
            sin( time * 0.137 + 0.8 ) * 27.0
        );
        vec2 firstLocal = substrateRotation( 0.61 )
            * ( point - firstCentre );
        vec2 secondLocal = substrateRotation( -0.47 )
            * ( point - secondCentre );
        float firstPacket = exp( -(
            firstLocal.x * firstLocal.x * 0.0015
            + firstLocal.y * firstLocal.y * 0.0048
        ) );
        float secondPacket = exp( -(
            secondLocal.x * secondLocal.x * 0.0021
            + secondLocal.y * secondLocal.y * 0.0035
        ) );
        float travellingShear = 0.5 + 0.5 * sin(
            dot( point, vec2( 0.041, -0.029 ) ) + time * 0.21
        );
        float packetMix = clamp(
            firstPacket * 0.72
            + secondPacket * 0.61
            + travellingShear * 0.16,
            0.0,
            1.0
        );
        return mix( 0.52, 1.48, packetMix );
    }

    float substrateCrestWave( float phase, float tension )
    {
        float wave = sin( phase );
        float asymmetry = wave
            + tension * 0.28 * ( wave * wave - 0.5 );
        return asymmetry / ( 1.0 + tension * 0.14 );
    }

    float substrateHeight( vec2 point, float time )
    {
        vec2 primary = vec2( 0.873, 0.488 );
        vec2 counter = vec2( -0.416, 0.909 );
        vec2 transverse = vec2( 0.188, -0.982 );
        vec2 domainWarp = vec2(
            sin( dot( point, vec2( 0.033, 0.047 ) ) - time * 0.19 ),
            sin( dot( point, vec2( -0.052, 0.028 ) ) + time * 0.14 )
        );
        vec2 currentPoint = point
            + domainWarp * substrateCrossCurrent * 2.8;

        float firstSwell = substrateCrestWave(
            dot( currentPoint, primary ) * 0.18 + time * 0.31,
            substrateCrestTension
        );
        float secondSwell = substrateCrestWave(
            dot( currentPoint, counter ) * 0.27 - time * 0.23
                + firstSwell * substrateCrossCurrent * 0.31,
            substrateCrestTension
        );
        float thirdSwell = substrateCrestWave(
            dot( currentPoint, transverse ) * 0.13 + time * 0.16
                - secondSwell * substrateCrossCurrent * 0.27,
            substrateCrestTension
        );
        float macroPressure = firstSwell * 0.43
            + secondSwell * 0.35
            + thirdSwell * 0.22;

        float firstFold = substrateCrestWave(
            dot( currentPoint, vec2( -0.738, 0.675 ) ) * 0.62
                - time * 0.73 + secondSwell * 0.44,
            substrateCrestTension
        );
        float secondFold = substrateCrestWave(
            dot( currentPoint, vec2( 0.529, 0.849 ) ) * 0.84
                + time * 0.61 + firstFold * 0.39,
            substrateCrestTension
        );
        float thirdFold = substrateCrestWave(
            dot( currentPoint, vec2( 0.954, -0.299 ) ) * 1.13
                - time * 0.49 + secondFold * 0.33,
            substrateCrestTension
        );
        float crossingPressure = (
            firstFold * 0.37
            + secondFold * 0.34
            + thirdFold * 0.29
            + firstFold * secondFold * 0.13
        ) / 1.13;

        float localEnergy = substratePacketEnergy( point, time );
        float energyGain = 0.28 + substrateEnergy * 0.72;
        float crossingGain = substrateCrossCurrent / 1.5;
        return substrateSwellHeight * energyGain * (
            macroPressure * 0.7
            + crossingPressure * localEnergy * crossingGain * 0.3
        );
    }
`;

const surfaceFragmentShader = /* glsl */`
    uniform float substrateTime;
    uniform float substrateFineActivity;
    uniform float substrateReflection;
    uniform float substrateCrossCurrent;
    uniform float substrateIlluminationScale;
    uniform float substrateWarmthScale;
    varying vec2 vSubstratePoint;
    varying float vSubstrateEnergy;
    varying float vSubstrateCompression;
    varying float vSubstrateHeight;

    float substrateFinePressure( vec2 point, float time )
    {
        vec2 fineWarp = vec2(
            sin( dot( point, vec2( 0.119, -0.173 ) ) + time * 0.47 ),
            sin( dot( point, vec2( 0.157, 0.091 ) ) - time * 0.39 )
        );
        vec2 currentPoint = point
            + fineWarp * ( 0.35 + substrateCrossCurrent * 0.42 );
        float firstPhase = dot(
            currentPoint,
            vec2( -0.913, 0.408 )
        ) * 1.37 - time * 1.17
            + sin( dot( point, vec2( 0.071, 0.109 ) ) - time * 0.13 )
                * 0.72;
        float first = sin( firstPhase ) * (
            1.0 - smoothstep( 0.42, 1.35, fwidth( firstPhase ) )
        );
        float secondPhase = dot(
            currentPoint,
            vec2( 0.367, 0.930 )
        ) * 2.09 + time * 0.91
            + first * 0.31
            + sin( dot( point, vec2( -0.096, 0.044 ) ) + time * 0.17 )
                * 0.61;
        float second = sin( secondPhase ) * (
            1.0 - smoothstep( 0.42, 1.35, fwidth( secondPhase ) )
        );
        float thirdPhase = dot(
            currentPoint,
            vec2( 0.784, -0.621 )
        ) * 3.17 - time * 0.79
            + second * 0.24
            + sin( dot( point, vec2( 0.052, -0.137 ) ) - time * 0.11 )
                * 0.53;
        float third = sin( thirdPhase ) * (
            1.0 - smoothstep( 0.42, 1.35, fwidth( thirdPhase ) )
        );
        return clamp( (
            first * 0.47
            + second * 0.33
            + third * 0.20
        ), -1.0, 1.0 );
    }

    vec3 substratePerturbNormal(
        vec3 surfacePosition,
        vec3 surfaceNormal,
        float height,
        float faceDirection
    )
    {
        vec3 sigmaX = dFdx( surfacePosition );
        vec3 sigmaY = dFdy( surfacePosition );
        vec3 firstCross = cross( sigmaY, surfaceNormal );
        vec3 secondCross = cross( surfaceNormal, sigmaX );
        float determinant = dot( sigmaX, firstCross ) * faceDirection;
        vec2 heightDerivative = vec2( dFdx( height ), dFdy( height ) );
        vec3 gradient = sign( determinant ) * (
            heightDerivative.x * firstCross
            + heightDerivative.y * secondCross
        );
        return normalize(
            abs( determinant ) * surfaceNormal - gradient
        );
    }
`;

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
    const range = energeticSeaRanges[property];
    if ( !range ) throw new Error( `Unknown energetic sea parameter '${property}'.` );
    validateFinite( value, `Energetic sea ${property}` );
    if ( value < range.min || value > range.max )
    {
        throw new RangeError(
            `Energetic sea ${property} must be between ${range.min} and ${range.max}.`
        );
    }
    return value;
}

function resolveParameters( values )
{
    return Object.fromEntries( Object.keys( energeticSeaDefaults ).map(
        ( property ) => [
            property,
            validateParameter(
                property,
                Number( values[property] ?? energeticSeaDefaults[property] )
            )
        ]
    ) );
}

function createMaterial( uniforms )
{
    const material = new THREE.MeshStandardMaterial( {
        color: 0x07131c,
        emissive: 0x000102,
        emissiveIntensity: 0.28,
        metalness: 0.04,
        roughness: 0.42,
        side: THREE.FrontSide,
        depthTest: true,
        depthWrite: true,
        transparent: false,
        dithering: true
    } );
    material.name = 'Energetic substrate pressure material';
    material.customProgramCacheKey = () => 'energetic-substrate-sea-v3-local-light';
    material.onBeforeCompile = ( shader ) => {
        Object.assign( shader.uniforms, uniforms );
        shader.vertexShader = shader.vertexShader
            .replace( '#include <common>', `
                #include <common>
                ${surfaceVertexShader}
            ` )
            .replace( '#include <beginnormal_vertex>', `
                #include <beginnormal_vertex>
                const float substrateNormalStep = 0.22;
                float substrateCentreHeight = substrateHeight(
                    position.xz,
                    substrateTime
                );
                float substrateLeftHeight = substrateHeight(
                    position.xz - vec2( substrateNormalStep, 0.0 ),
                    substrateTime
                );
                float substrateRightHeight = substrateHeight(
                    position.xz + vec2( substrateNormalStep, 0.0 ),
                    substrateTime
                );
                float substrateDownHeight = substrateHeight(
                    position.xz - vec2( 0.0, substrateNormalStep ),
                    substrateTime
                );
                float substrateUpHeight = substrateHeight(
                    position.xz + vec2( 0.0, substrateNormalStep ),
                    substrateTime
                );
                vec2 substrateGradient = vec2(
                    substrateRightHeight - substrateLeftHeight,
                    substrateUpHeight - substrateDownHeight
                ) / ( 2.0 * substrateNormalStep );
                objectNormal = normalize(
                    objectNormal
                    + vec3(
                        -substrateGradient.x,
                        0.0,
                        -substrateGradient.y
                    )
                );
            ` )
            .replace( '#include <begin_vertex>', `
                #include <begin_vertex>
                transformed.y += substrateCentreHeight;
                vSubstratePoint = position.xz;
                vSubstrateHeight = substrateCentreHeight;
                vSubstrateEnergy = substratePacketEnergy(
                    position.xz,
                    substrateTime
                );
                float substrateLaplacian = abs(
                    substrateLeftHeight
                    + substrateRightHeight
                    + substrateDownHeight
                    + substrateUpHeight
                    - 4.0 * substrateCentreHeight
                ) / ( substrateNormalStep * substrateNormalStep );
                vSubstrateCompression = smoothstep(
                    0.055,
                    0.82,
                    substrateLaplacian
                );
            ` );
        shader.fragmentShader = shader.fragmentShader
            .replace( '#include <common>', `
                #include <common>
                ${surfaceFragmentShader}
            ` )
            .replace( '#include <color_fragment>', `
                #include <color_fragment>
                float substrateFineMaterial = substrateFinePressure(
                    vSubstratePoint,
                    substrateTime
                );
                float substratePixelFootprint = max(
                    length( dFdx( vSubstratePoint ) ),
                    length( dFdy( vSubstratePoint ) )
                );
                float substrateFineFade = 1.0 - smoothstep(
                    0.09,
                    1.1,
                    substratePixelFootprint
                );
                substrateFineMaterial *= substrateFineFade;
                float substrateEnergySignal = clamp(
                    ( vSubstrateEnergy - 0.52 ) / 0.96,
                    0.0,
                    1.0
                );
                diffuseColor.rgb *= mix(
                    0.68,
                    1.28,
                    substrateEnergySignal
                );
                diffuseColor.rgb *= 1.0 + substrateFineMaterial * 0.045;
            ` )
            .replace( '#include <roughnessmap_fragment>', `
                #include <roughnessmap_fragment>
                roughnessFactor = clamp(
                    roughnessFactor
                    - vSubstrateCompression * substrateReflection * 0.16
                    + substrateFineMaterial * 0.018,
                    0.18,
                    0.68
                );
            ` )
            .replace( '#include <normal_fragment_maps>', `
                #include <normal_fragment_maps>
                float substrateFineHeight = substrateFineActivity
                    * 0.032
                    * substrateFineMaterial
                    * ( 0.72 + vSubstrateEnergy * 0.28 );
                normal = substratePerturbNormal(
                    -vViewPosition,
                    normal,
                    substrateFineHeight,
                    faceDirection
                );
            ` )
            .replace( '#include <lights_fragment_end>', `
                #include <lights_fragment_end>
                reflectedLight.directDiffuse = vec3( 0.0 );
                reflectedLight.directSpecular = vec3( 0.0 );
                reflectedLight.indirectDiffuse = vec3( 0.0 );
                reflectedLight.indirectSpecular = vec3( 0.0 );

                vec3 substrateViewDirection = geometryViewDir;
                vec3 substrateKeyDirection = normalize(
                    mat3( viewMatrix ) * normalize( vec3( -13.0, 18.0, 9.0 ) )
                );
                vec3 substrateCrossDirection = normalize(
                    mat3( viewMatrix ) * normalize( vec3( 15.0, 7.0, -12.0 ) )
                );
                vec3 substrateWarmDirection = normalize(
                    mat3( viewMatrix ) * normalize( vec3( -9.0, 5.0, -18.0 ) )
                );
                vec3 substrateKeyColour = vec3( 0.807, 0.905, 1.0 ) * 4.03;
                vec3 substrateCrossColour = vec3( 0.266, 0.497, 0.658 ) * 2.35;
                vec3 substrateWarmColour = vec3( 0.680, 0.254, 0.098 )
                    * 1.29 * substrateWarmthScale;
                directLight.visible = true;
                directLight.direction = substrateKeyDirection;
                directLight.color = substrateKeyColour;
                RE_Direct(
                    directLight,
                    geometryPosition,
                    geometryNormal,
                    geometryViewDir,
                    geometryClearcoatNormal,
                    material,
                    reflectedLight
                );
                directLight.direction = substrateCrossDirection;
                directLight.color = substrateCrossColour;
                RE_Direct(
                    directLight,
                    geometryPosition,
                    geometryNormal,
                    geometryViewDir,
                    geometryClearcoatNormal,
                    material,
                    reflectedLight
                );
                directLight.direction = substrateWarmDirection;
                directLight.color = substrateWarmColour;
                RE_Direct(
                    directLight,
                    geometryPosition,
                    geometryNormal,
                    geometryViewDir,
                    geometryClearcoatNormal,
                    material,
                    reflectedLight
                );
                reflectedLight.indirectDiffuse += material.diffuseColor
                    * vec3( 0.267, 0.461, 0.580 )
                    * 1.18;

                float substrateFacing = clamp(
                    abs( dot( normal, substrateViewDirection ) ),
                    0.0,
                    1.0
                );
                float substrateFresnel = pow(
                    1.0 - substrateFacing,
                    2.45
                );
                vec3 substrateColdReflection = vec3( 0.035, 0.086, 0.132 );
                vec3 substrateWarmReflection = vec3( 0.092, 0.046, 0.021 );
                vec3 substrateReflectionColour = mix(
                    substrateWarmReflection,
                    substrateColdReflection,
                    clamp(
                        substrateEnergySignal * 0.72
                            + substrateFineMaterial * 0.14
                            + 0.18,
                        0.0,
                        1.0
                    )
                );
                float substrateReflectionEnergy = substrateReflection
                    * ( 0.08 + substrateFresnel * 0.76 )
                    * ( 0.54 + substrateEnergySignal * 0.46 );
                reflectedLight.indirectSpecular += substrateReflectionColour
                    * substrateReflectionEnergy;
                reflectedLight.indirectSpecular += vec3( 0.09, 0.12, 0.15 )
                    * vSubstrateCompression
                    * substrateReflection
                    * ( 0.07 + substrateFresnel * 0.93 );
                reflectedLight.directDiffuse *= substrateIlluminationScale;
                reflectedLight.directSpecular *= substrateIlluminationScale;
                reflectedLight.indirectDiffuse *= substrateIlluminationScale;
                reflectedLight.indirectSpecular *= substrateIlluminationScale;
            ` );
        material.userData.compiledShader = shader;
    };
    material.userData.energeticSea = Object.freeze( {
        textureInputCount: 0,
        geometricBandCount: 2,
        opticalBandCount: 3,
        packetCount: 2,
        lightingModel: 'material-local',
        sceneLightDependencyCount: 0,
        phaseRateScale
    } );
    return material;
}

export function createEnergeticSeaLayer( {
    scene,
    parameters: parameterOverrides = {},
    extent = defaultExtent,
    segments = defaultSegments,
    illuminationScale = 1,
    warmthScale = 1
} )
{
    if ( !scene?.isObject3D || typeof scene.add !== 'function' )
    {
        throw new TypeError( 'An energetic sea requires a Three.js scene.' );
    }
    validateFinite( extent, 'Energetic sea extent' );
    if ( extent <= 0 ) throw new RangeError( 'Energetic sea extent must be positive.' );
    if ( !Number.isInteger( segments ) || segments < 2 )
    {
        throw new RangeError( 'Energetic sea segments must be an integer of at least 2.' );
    }
    validateFinite( illuminationScale, 'Energetic sea illumination scale' );
    if ( illuminationScale < 0 || illuminationScale > 1 )
    {
        throw new RangeError(
            'Energetic sea illumination scale must be between 0 and 1.'
        );
    }
    validateFinite( warmthScale, 'Energetic sea warmth scale' );
    if ( warmthScale < 0 || warmthScale > 1 )
    {
        throw new RangeError(
            'Energetic sea warmth scale must be between 0 and 1.'
        );
    }

    const parameters = resolveParameters( parameterOverrides );
    const geometry = new THREE.PlaneGeometry(
        extent,
        extent,
        segments,
        segments
    );
    geometry.rotateX( -Math.PI / 2 );
    geometry.name = 'Energetic substrate study surface';

    const uniforms = {
        substrateTime: { value: 0 },
        substrateSwellHeight: { value: parameters.swellHeight },
        substrateEnergy: { value: parameters.energy },
        substrateCrestTension: { value: parameters.crestTension },
        substrateCrossCurrent: { value: parameters.crossCurrent },
        substrateFineActivity: { value: parameters.fineActivity },
        substrateReflection: { value: parameters.reflection },
        substrateIlluminationScale: { value: illuminationScale },
        substrateWarmthScale: { value: warmthScale }
    };
    const material = createMaterial( uniforms );
    const mesh = new THREE.Mesh( geometry, material );
    mesh.name = 'Disconnected energetic substrate';
    mesh.frustumCulled = false;
    scene.add( mesh );

    let disposed = false;
    let visible = true;
    let frozen = false;
    let revision = 1;
    let previousUpdateTime = null;
    let accumulatedPhase = 0;
    let snapshot = null;

    function refreshSnapshot()
    {
        snapshot = Object.freeze( {
            revision,
            status: visible ? 'active' : 'hidden',
            frozen,
            extent,
            segments,
            vertexCount: geometry.getAttribute( 'position' ).count,
            triangleCount: geometry.getIndex().count / 3,
            textureInputCount: 0,
            geometricBandCount: 2,
            opticalBandCount: 3,
            packetCount: 2,
            lightingModel: 'material-local',
            sceneLightDependencyCount: 0,
            illuminationScale,
            warmthScale,
            phaseRateScale,
            geometryUuid: geometry.uuid,
            materialUuid: material.uuid
        } );
        mesh.userData.energeticSea = snapshot;
        return snapshot;
    }

    function setParameter( property, value )
    {
        if ( disposed ) throw new Error( 'The energetic sea is disposed.' );
        const resolved = validateParameter( property, Number( value ) );
        parameters[property] = resolved;
        const uniformByProperty = {
            swellHeight: 'substrateSwellHeight',
            energy: 'substrateEnergy',
            crestTension: 'substrateCrestTension',
            crossCurrent: 'substrateCrossCurrent',
            fineActivity: 'substrateFineActivity',
            reflection: 'substrateReflection'
        };
        const uniformName = uniformByProperty[property];
        if ( uniformName ) uniforms[uniformName].value = resolved;
        revision += 1;
        refreshSnapshot();
        return resolved;
    }

    function reset()
    {
        if ( disposed ) throw new Error( 'The energetic sea is disposed.' );
        for ( const [ property, value ] of Object.entries(
            energeticSeaDefaults
        ) )
        {
            parameters[property] = value;
        }
        uniforms.substrateSwellHeight.value = parameters.swellHeight;
        uniforms.substrateEnergy.value = parameters.energy;
        uniforms.substrateCrestTension.value = parameters.crestTension;
        uniforms.substrateCrossCurrent.value = parameters.crossCurrent;
        uniforms.substrateFineActivity.value = parameters.fineActivity;
        uniforms.substrateReflection.value = parameters.reflection;
        uniforms.substrateTime.value = 0;
        previousUpdateTime = null;
        accumulatedPhase = 0;
        frozen = false;
        revision += 1;
        refreshSnapshot();
        return Object.freeze( { ...parameters } );
    }

    refreshSnapshot();

    return {
        group: mesh,
        mesh,
        parameters,
        update( time ) {
            if ( disposed ) throw new Error( 'The energetic sea is disposed.' );
            validateFinite( time, 'Energetic sea time' );
            if ( time < 0 )
            {
                throw new RangeError( 'Energetic sea time cannot be negative.' );
            }
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
                    accumulatedPhase
                        + frameDelta
                            * parameters.currentSpeed
                            * phaseRateScale
                ) % 1048576;
                uniforms.substrateTime.value = accumulatedPhase;
            }
            return snapshot;
        },
        setParameter,
        reset,
        setFrozen( nextFrozen ) {
            if ( disposed ) throw new Error( 'The energetic sea is disposed.' );
            frozen = Boolean( nextFrozen );
            revision += 1;
            refreshSnapshot();
            return frozen;
        },
        setVisible( nextVisible ) {
            if ( disposed ) throw new Error( 'The energetic sea is disposed.' );
            visible = Boolean( nextVisible );
            mesh.visible = visible;
            revision += 1;
            refreshSnapshot();
            return visible;
        },
        getPhase() {
            return uniforms.substrateTime.value;
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

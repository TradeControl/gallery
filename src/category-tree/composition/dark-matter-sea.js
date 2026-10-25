import * as THREE from 'three';

const fallbackMembraneSize = 24;
const geometrySegments = 220;
const extentScale = 6;
const minimumExtent = 300;
const transitionSoftness = 0.52;
const coordinateConcentration = 4;
const interpolationSafety = 0.02;
const grazingResponseExponent = 2.2;
const driftPhaseScale = 5;

export const darkMatterSeaDefaults = Object.freeze( {
    outerDepth: 1.55,
    deepClearance: 0.04,
    relief: 0.06,
    drift: 0.12,
    grazingReveal: 0.7
} );

export const darkMatterSeaRanges = Object.freeze( {
    outerDepth: Object.freeze( { min: 1.2, max: 2.4, step: 0.05 } ),
    deepClearance: Object.freeze( { min: 0.04, max: 0.35, step: 0.01 } ),
    relief: Object.freeze( { min: 0, max: 0.14, step: 0.01 } ),
    drift: Object.freeze( { min: 0, max: 0.35, step: 0.01 } ),
    grazingReveal: Object.freeze( { min: 0, max: 1.2, step: 0.05 } )
} );

const pressureShader = /* glsl */`
    uniform float darkMatterTime;
    uniform float darkMatterRelief;
    uniform float darkMatterExtent;
    varying vec2 vDarkMatterPosition;
    varying float vDarkMatterPressure;

    float darkMatterEdgeMask( vec2 point )
    {
        float radius = length( point );
        return 1.0 - smoothstep(
            darkMatterExtent * 0.37,
            darkMatterExtent * 0.48,
            radius
        );
    }

    float darkMatterPressure( vec2 point, float time )
    {
        vec2 primary = vec2( 0.842, 0.539 );
        vec2 counter = vec2( -0.361, 0.933 );
        vec2 crossFlow = vec2( 0.227, -0.974 );
        vec2 flowWarp = vec2(
            sin( dot( point, vec2( 0.105, 0.071 ) ) - time * 0.083 ),
            sin( dot( point, vec2( -0.063, 0.119 ) ) + time * 0.067 )
        );
        vec2 currentPoint = point + flowWarp * 1.4;
        float first = sin(
            dot( currentPoint, primary ) * 0.29
            + 0.38 * sin(
                dot( currentPoint, counter ) * 0.17 - time * 0.11
            )
            + time * 0.23
        );
        float second = sin(
            dot( currentPoint, counter ) * 0.43
            - time * 0.19
            + first * 0.42
        );
        float third = sin(
            dot( currentPoint, crossFlow ) * 0.22
            + time * 0.13
            + second * 0.35
        );
        float pressure = (
            first * 0.38
            + second * 0.34
            + third * 0.28
            + first * second * 0.14
            - second * third * 0.10
        ) / 1.24;
        return clamp( pressure, -1.0, 1.0 );
    }

    vec2 darkMatterPressureGradient( vec2 point, float time )
    {
        const float epsilon = 0.035;
        float left = darkMatterPressure(
            point - vec2( epsilon, 0.0 ), time
        );
        float right = darkMatterPressure(
            point + vec2( epsilon, 0.0 ), time
        );
        float down = darkMatterPressure(
            point - vec2( 0.0, epsilon ), time
        );
        float up = darkMatterPressure(
            point + vec2( 0.0, epsilon ), time
        );
        return vec2( right - left, up - down ) / ( 2.0 * epsilon );
    }
`;

const pressureFragmentShader = /* glsl */`
    uniform float darkMatterTime;
    uniform float darkMatterRelief;
    uniform float darkMatterReveal;
    varying vec2 vDarkMatterPosition;
    varying float vDarkMatterPressure;

    float darkMatterFinePressure( vec2 point, float time )
    {
        vec2 fineWarp = vec2(
            sin( dot( point, vec2( 0.173, -0.097 ) ) + time * 0.12 ),
            sin( dot( point, vec2( 0.081, 0.157 ) ) - time * 0.093 )
        );
        vec2 currentPoint = point + fineWarp * 0.78;
        float first = sin(
            dot( currentPoint, vec2( -0.918, 0.397 ) ) * 0.72
            + 0.48 * sin(
                dot( currentPoint, vec2( 0.263, 0.965 ) ) * 0.29
                + time * 0.061
            )
            - time * 0.31
        );
        float second = sin(
            dot( currentPoint, vec2( 0.438, 0.899 ) ) * 1.03
            + time * 0.27
            + first * 0.55
        );
        float third = sin(
            dot( currentPoint, vec2( 0.731, -0.682 ) ) * 1.31
            - time * 0.22
            + second * 0.48
        );
        float pressure = (
            first * 0.38
            + second * 0.34
            + third * 0.28
            + first * second * 0.16
            - second * third * 0.12
        ) / 1.28;
        return clamp( pressure, -1.0, 1.0 );
    }

    vec3 darkMatterPerturbNormal(
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
    const range = darkMatterSeaRanges[property];
    if ( !range ) throw new Error( `Unknown dark-matter sea parameter '${property}'.` );
    validateFinite( value, `Dark-matter sea ${property}` );
    if ( value < range.min || value > range.max )
    {
        throw new RangeError(
            `Dark-matter sea ${property} must be between ${range.min} and ${range.max}.`
        );
    }
    return value;
}

export function evaluateDarkMatterGrazingReveal( reveal, normalViewDot )
{
    const resolvedReveal = validateParameter(
        'grazingReveal',
        Number( reveal )
    );
    validateFinite( normalViewDot, 'Dark-matter sea normal/view dot' );
    const facing = THREE.MathUtils.clamp(
        Math.abs( normalViewDot ),
        0,
        1
    );
    return resolvedReveal * Math.pow(
        1 - facing,
        grazingResponseExponent
    );
}

function resolveParameters( values )
{
    return Object.fromEntries( Object.keys( darkMatterSeaDefaults ).map(
        ( property ) => [
            property,
            validateParameter(
                property,
                values[property] ?? darkMatterSeaDefaults[property]
            )
        ]
    ) );
}

function smoothMinimum( first, second, softness )
{
    const blend = THREE.MathUtils.clamp(
        0.5 + 0.5 * ( second - first ) / softness,
        0,
        1
    );
    return THREE.MathUtils.lerp( second, first, blend )
        - softness * blend * ( 1 - blend );
}

function fallbackDeepMediumDepth( membrane )
{
    const anchorDepth = Math.abs( validateFinite(
        Number( membrane.height( 0, 0 ) ),
        'Dark-matter sea anchor height'
    ) );
    return THREE.MathUtils.clamp( anchorDepth * 0.12, 0.42, 1.2 );
}

function resolveDeepMediumDepth( plantingEnvelope, membrane )
{
    const envelope = plantingEnvelope?.getSnapshot?.();
    const validEnvelope = envelope
        && envelope.status !== 'detached'
        && Number.isFinite( envelope.deepMediumDepth )
        && envelope.deepMediumDepth > 0;
    return {
        depth: validEnvelope
            ? envelope.deepMediumDepth
            : fallbackDeepMediumDepth( membrane ),
        envelopeRevision: validEnvelope ? envelope.revision : null,
        source: validEnvelope ? 'planting-envelope' : 'membrane-fallback'
    };
}

function createMaterial( uniforms )
{
    const material = new THREE.MeshStandardMaterial( {
        color: 0x111820,
        emissive: 0x010203,
        emissiveIntensity: 0.55,
        metalness: 0.06,
        roughness: 0.5,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: true,
        transparent: false,
        dithering: true
    } );
    material.name = 'Dark-matter sea pressure material';
    material.customProgramCacheKey = () => 'category-tree-dark-matter-sea-v11';
    material.onBeforeCompile = ( shader ) => {
        Object.assign( shader.uniforms, uniforms );
        shader.vertexShader = shader.vertexShader
            .replace( '#include <common>', `
                #include <common>
                ${pressureShader}
            ` )
            .replace( '#include <beginnormal_vertex>', `
                #include <beginnormal_vertex>
                vec2 darkMatterGradient = darkMatterPressureGradient(
                    position.xz,
                    darkMatterTime
                ) * darkMatterRelief * darkMatterEdgeMask( position.xz );
                objectNormal = normalize(
                    objectNormal
                    + vec3( -darkMatterGradient.x, 0.0, -darkMatterGradient.y )
                );
            ` )
            .replace( '#include <begin_vertex>', `
                #include <begin_vertex>
                vDarkMatterPosition = position.xz;
                vDarkMatterPressure = darkMatterPressure(
                    position.xz,
                    darkMatterTime
                );
                transformed.y += darkMatterRelief
                    * vDarkMatterPressure
                    * darkMatterEdgeMask( position.xz );
            ` );
        shader.fragmentShader = shader.fragmentShader
            .replace( '#include <common>', `
                #include <common>
                ${pressureFragmentShader}
            ` )
            .replace( '#include <color_fragment>', `
                #include <color_fragment>
                float darkMatterFineMaterial = darkMatterFinePressure(
                    vDarkMatterPosition,
                    darkMatterTime
                );
                float darkMatterPixelFootprint = max(
                    length( dFdx( vDarkMatterPosition ) ),
                    length( dFdy( vDarkMatterPosition ) )
                );
                float darkMatterMaterialFade = 1.0 - smoothstep(
                    0.18,
                    1.4,
                    darkMatterPixelFootprint
                );
                darkMatterFineMaterial *= darkMatterMaterialFade;
                diffuseColor.rgb *= mix(
                    0.88,
                    1.14,
                    clamp( vDarkMatterPressure * 0.5 + 0.5, 0.0, 1.0 )
                );
                diffuseColor.rgb *= 1.0 + darkMatterFineMaterial * 0.03;
            ` )
            .replace( '#include <roughnessmap_fragment>', `
                #include <roughnessmap_fragment>
                roughnessFactor = clamp(
                    roughnessFactor
                    - darkMatterReveal
                        * ( 0.02 + abs( vDarkMatterPressure ) * 0.03 ),
                    0.46,
                    0.74
                );
                roughnessFactor = clamp(
                    roughnessFactor + darkMatterFineMaterial * 0.008,
                    0.46,
                    0.74
                );
            ` )
            .replace( '#include <normal_fragment_maps>', `
                #include <normal_fragment_maps>
                float darkMatterFineHeight = darkMatterRelief * 0.48
                    * darkMatterFinePressure(
                        vDarkMatterPosition,
                        darkMatterTime
                    ) * darkMatterMaterialFade;
                normal = darkMatterPerturbNormal(
                    -vViewPosition,
                    normal,
                    darkMatterFineHeight,
                    faceDirection
                );
            ` )
            .replace( '#include <lights_fragment_end>', `
                #include <lights_fragment_end>
                reflectedLight.directDiffuse *= 0.08;
                reflectedLight.directSpecular *= 0.05;
                reflectedLight.indirectDiffuse *= 0.10;
                reflectedLight.indirectSpecular *= 0.06;
                float darkMatterFacing = clamp(
                    abs( dot( normal, normalize( vViewPosition ) ) ),
                    0.0,
                    1.0
                );
                float darkMatterGrazing = pow(
                    1.0 - darkMatterFacing,
                    ${grazingResponseExponent.toFixed( 1 )}
                );
                float darkMatterMassReveal = clamp(
                    vDarkMatterPressure * 0.5 + 0.5,
                    0.0,
                    1.0
                );
                float darkMatterFineReveal = clamp(
                    darkMatterFineMaterial * 0.5 + 0.5,
                    0.0,
                    1.0
                );
                vec3 darkMatterWarmGraphite = vec3( 0.075, 0.052, 0.040 );
                vec3 darkMatterCoolGraphite = vec3( 0.042, 0.078, 0.110 );
                vec3 darkMatterRevealColour = mix(
                    darkMatterWarmGraphite,
                    darkMatterCoolGraphite,
                    darkMatterFineReveal * 0.44
                );
                float darkMatterRevealEnergy = darkMatterReveal
                    * darkMatterGrazing
                    * ( 0.76 + darkMatterMassReveal * 0.24 )
                    * ( 0.92 + darkMatterFineReveal * 0.08 );
                reflectedLight.indirectSpecular += darkMatterRevealColour
                    * darkMatterRevealEnergy;
            ` );
        material.userData.compiledShader = shader;
    };
    material.userData.darkMatterSea = Object.freeze( {
        textureInputCount: 0,
        broadPressureModeCount: 3,
        finePressureModeCount: 3,
        visibilityModel: 'angle-dependent graphite reflection',
        externalLightResponse: 0.08,
        viewResponseFloor: 0,
        viewResponseExponent: grazingResponseExponent
    } );
    return material;
}

export function createDarkMatterSea( {
    scene,
    membrane,
    plantingEnvelope = null,
    parameters: parameterOverrides = {}
} )
{
    if ( !scene?.isObject3D || typeof scene.add !== 'function' )
    {
        throw new TypeError( 'A dark-matter sea requires a Three.js scene.' );
    }
    if ( typeof membrane?.height !== 'function' )
    {
        throw new TypeError( 'A dark-matter sea requires a membrane height function.' );
    }
    const membraneSize = Number( membrane.size ?? fallbackMembraneSize );
    validateFinite( membraneSize, 'Dark-matter sea membrane size' );
    if ( membraneSize <= 0 )
    {
        throw new RangeError( 'Dark-matter sea membrane size must be positive.' );
    }

    const parameters = resolveParameters( parameterOverrides );
    const extent = Math.max( minimumExtent, membraneSize * extentScale );
    const geometry = new THREE.PlaneGeometry(
        extent,
        extent,
        geometrySegments,
        geometrySegments
    );
    geometry.rotateX( -Math.PI / 2 );
    const geometryPosition = geometry.getAttribute( 'position' );
    const halfExtent = extent * 0.5;
    for ( let index = 0; index < geometryPosition.count; index += 1 )
    {
        const x = geometryPosition.getX( index );
        const z = geometryPosition.getZ( index );
        const concentratedX = Math.sign( x ) * halfExtent * Math.pow(
            Math.abs( x ) / halfExtent,
            coordinateConcentration
        );
        const concentratedZ = Math.sign( z ) * halfExtent * Math.pow(
            Math.abs( z ) / halfExtent,
            coordinateConcentration
        );
        geometryPosition.setX( index, concentratedX );
        geometryPosition.setZ( index, concentratedZ );
    }
    geometry.name = 'Dark-matter sea gravity-depressed surface';

    const uniforms = {
        darkMatterTime: { value: 0 },
        darkMatterRelief: { value: parameters.relief },
        darkMatterExtent: { value: extent },
        darkMatterReveal: { value: parameters.grazingReveal }
    };
    const material = createMaterial( uniforms );
    const mesh = new THREE.Mesh( geometry, material );
    mesh.name = 'Category Tree dark-matter sea';
    mesh.renderOrder = 1;
    mesh.frustumCulled = false;
    scene.add( mesh );

    let disposed = false;
    let visible = true;
    let revision = 0;
    let snapshot = null;
    let lastEnvelopeRevision = Symbol( 'unresolved' );
    let previousUpdateTime = null;
    let accumulatedPhase = 0;

    function updateSurface( force = false )
    {
        if ( disposed ) throw new Error( 'The dark-matter sea is disposed.' );
        const boundary = resolveDeepMediumDepth( plantingEnvelope, membrane );
        if ( !force && boundary.envelopeRevision === lastEnvelopeRevision )
        {
            return snapshot;
        }
        lastEnvelopeRevision = boundary.envelopeRevision;
        const position = geometry.getAttribute( 'position' );
        const outerDatum = -parameters.outerDepth - parameters.relief;
        const edgeStart = extent * 0.37;
        const edgeEnd = extent * 0.49;
        const edgeDrop = extent * 0.34;
        let minimumHeight = Infinity;
        let maximumHeight = -Infinity;
        for ( let index = 0; index < position.count; index += 1 )
        {
            const x = position.getX( index );
            const z = position.getZ( index );
            const terrainHeight = validateFinite(
                Number( membrane.height( x, z ) ),
                'Dark-matter sea terrain height'
            );
            const deepBandSurface = terrainHeight
                - boundary.depth
                - parameters.deepClearance
                - parameters.relief
                - interpolationSafety;
            const radius = Math.hypot( x, z );
            const edge = THREE.MathUtils.smoothstep(
                radius,
                edgeStart,
                edgeEnd
            );
            const height = smoothMinimum(
                outerDatum,
                deepBandSurface,
                transitionSoftness
            ) - edge * edge * edgeDrop;
            position.setY( index, height );
            minimumHeight = Math.min( minimumHeight, height );
            maximumHeight = Math.max( maximumHeight, height );
        }
        position.needsUpdate = true;
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        revision += 1;
        snapshot = Object.freeze( {
            revision,
            status: visible ? 'active' : 'hidden',
            envelopeRevision: boundary.envelopeRevision,
            depthSource: boundary.source,
            deepMediumDepth: boundary.depth,
            outerSurfaceLevel: -parameters.outerDepth,
            guaranteedDeepClearance: parameters.deepClearance,
            interpolationSafety,
            maximumRelief: parameters.relief,
            extent,
            edgeDrop,
            driftPhaseScale,
            minimumHeight,
            maximumHeight,
            vertexCount: position.count,
            triangleCount: geometry.getIndex().count / 3,
            coordinateConcentration,
            geometryUuid: geometry.uuid,
            materialUuid: material.uuid,
            textureInputCount: 0,
            broadPressureModeCount: 3,
            finePressureModeCount: 3
        } );
        mesh.userData.darkMatterSea = snapshot;
        return snapshot;
    }

    function refreshSnapshotStatus()
    {
        if ( !snapshot ) return;
        snapshot = Object.freeze( {
            ...snapshot,
            status: visible ? 'active' : 'hidden'
        } );
        mesh.userData.darkMatterSea = snapshot;
    }

    function setParameter( property, value )
    {
        if ( disposed ) throw new Error( 'The dark-matter sea is disposed.' );
        const resolved = validateParameter( property, Number( value ) );
        parameters[property] = resolved;
        if ( property === 'relief' )
        {
            uniforms.darkMatterRelief.value = resolved;
        }
        else if ( property === 'grazingReveal' )
        {
            uniforms.darkMatterReveal.value = resolved;
        }
        if ( [ 'outerDepth', 'deepClearance', 'relief' ].includes( property ) )
        {
            updateSurface( true );
        }
        return resolved;
    }

    function reset()
    {
        for ( const [ property, value ] of Object.entries(
            darkMatterSeaDefaults
        ) )
        {
            parameters[property] = value;
        }
        uniforms.darkMatterRelief.value = parameters.relief;
        uniforms.darkMatterReveal.value = parameters.grazingReveal;
        uniforms.darkMatterTime.value = 0;
        previousUpdateTime = null;
        accumulatedPhase = 0;
        updateSurface( true );
        return Object.freeze( { ...parameters } );
    }

    updateSurface( true );

    return {
        group: mesh,
        mesh,
        parameters,
        update( time ) {
            if ( disposed ) throw new Error( 'The dark-matter sea is disposed.' );
            validateFinite( time, 'Dark-matter sea time' );
            if ( time < 0 )
            {
                throw new RangeError( 'Dark-matter sea time cannot be negative.' );
            }
            const boundary = resolveDeepMediumDepth(
                plantingEnvelope,
                membrane
            );
            if ( boundary.envelopeRevision !== lastEnvelopeRevision )
            {
                updateSurface( true );
            }
            const frameDelta = previousUpdateTime === null
                ? 0
                : THREE.MathUtils.clamp(
                    ( time - previousUpdateTime ) / 1000,
                    0,
                    0.05
                );
            previousUpdateTime = time;
            if ( visible )
            {
                accumulatedPhase = (
                    accumulatedPhase
                        + frameDelta * parameters.drift * driftPhaseScale
                ) % 1048576;
                uniforms.darkMatterTime.value = accumulatedPhase;
            }
            return snapshot;
        },
        updateSurface() {
            return updateSurface( true );
        },
        setParameter,
        reset,
        setVisible( nextVisible ) {
            if ( disposed ) throw new Error( 'The dark-matter sea is disposed.' );
            visible = Boolean( nextVisible );
            mesh.visible = visible;
            refreshSnapshotStatus();
            return visible;
        },
        getTime() {
            return uniforms.darkMatterTime.value;
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

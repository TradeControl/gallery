import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
    getInformationSignal,
    informationPacketVisualProfile,
    internalRouterPresentationCandidateId
} from './engineered-tree-layer.js';
import {
    registerRootedMotionMaterial,
    rootedMotionShaderApplication,
    rootedMotionShaderDeclarations
} from './rooted-motion.js';

function registerRendererOwnedMotion( material, role )
{
    return registerRootedMotionMaterial(
        material,
        {
            time: material.uniforms.treeTime,
            response: material.uniforms.treeResponse,
            gustMix: material.uniforms.treeGustMix,
            intervalBase: material.uniforms.treeGustIntervalBase
        },
        role
    );
}

const swayedVertexBody = `
    vec3 transformed = position;
    float brushed = sin( position.y * 23.0 + position.x * 7.0 + position.z * 5.0 );
    transformed += normalize( normal ) * brushed * treeRelief * 0.004;
    ${rootedMotionShaderApplication( 'position' )}
`;

function createProxyMaterial( side, packedDepth = false )
{
    const material = new THREE.ShaderMaterial( {
        uniforms: {
            treeTime: { value: 0 },
            treeRelief: { value: 0.1 },
            treeResponse: { value: 0.22 },
            treeGustMix: { value: 0 },
            treeGustIntervalBase: { value: 0 }
        },
        vertexShader: `
            uniform float treeRelief;
            ${rootedMotionShaderDeclarations}
            void main()
            {
                ${swayedVertexBody}
                gl_Position = projectionMatrix * modelViewMatrix
                    * vec4( transformed, 1.0 );
            }
        `,
        fragmentShader: packedDepth
            ? `
                #include <packing>
                void main()
                {
                    gl_FragColor = packDepthToRGBA( gl_FragCoord.z );
                }
            `
            : `
                void main()
                {
                    gl_FragColor = vec4( 0.0 );
                }
            `,
        side,
        depthTest: true,
        depthWrite: packedDepth,
        depthFunc: packedDepth ? THREE.LessEqualDepth : THREE.EqualDepth,
        colorWrite: packedDepth,
        toneMapped: false,
        blending: THREE.NoBlending
    } );
    registerRendererOwnedMotion(
        material,
        packedDepth ? 'trunk-shell-depth' : 'trunk-shell-ownership'
    );
    return material;
}

function createCarrierOverlayMaterial( attenuation )
{
    const material = new THREE.ShaderMaterial( {
        uniforms: {
            treeTime: { value: 0 },
            treeResponse: { value: 0.22 },
            treeGustMix: { value: 0 },
            treeGustIntervalBase: { value: 0 },
            frontDepth: { value: null },
            backDepth: { value: null },
            viewport: { value: new THREE.Vector2( 1, 1 ) },
            cameraNear: { value: 0.1 },
            cameraFar: { value: 80 },
            proxyStart: { value: new THREE.Vector3() },
            proxyAxis: { value: new THREE.Vector3( 0, 1, 0 ) },
            proxyLength: { value: 1 }
        },
        vertexShader: `
            ${rootedMotionShaderDeclarations}
            uniform vec3 proxyStart;
            uniform vec3 proxyAxis;
            attribute float carrierVisibility;
            varying float visibleCarrier;
            varying float longitudinalPosition;
            void main()
            {
                visibleCarrier = carrierVisibility;
                longitudinalPosition = dot( position - proxyStart, proxyAxis );
                vec3 transformed = position;
                ${rootedMotionShaderApplication( 'position' )}
                gl_Position = projectionMatrix * modelViewMatrix
                    * vec4( transformed, 1.0 );
            }
        `,
        fragmentShader: attenuation
            ? `
                #include <packing>
                uniform sampler2D frontDepth;
                uniform sampler2D backDepth;
                uniform vec2 viewport;
                uniform float cameraNear;
                uniform float cameraFar;
                uniform float proxyLength;
                varying float visibleCarrier;
                varying float longitudinalPosition;

                float viewDistance( float depth )
                {
                    float clipZ = depth * 2.0 - 1.0;
                    return ( 2.0 * cameraNear * cameraFar )
                        / ( cameraFar + cameraNear
                            - clipZ * ( cameraFar - cameraNear ) );
                }

                void main()
                {
                    if ( visibleCarrier < 0.5
                        || longitudinalPosition < 0.0
                        || longitudinalPosition > proxyLength ) discard;
                    vec2 uv = gl_FragCoord.xy / viewport;
                    float front = unpackRGBAToDepth( texture2D( frontDepth, uv ) );
                    float back = unpackRGBAToDepth( texture2D( backDepth, uv ) );
                    if ( front >= 0.99999 || back >= 0.99999
                        || gl_FragCoord.z <= front + 0.00004
                        || gl_FragCoord.z >= back - 0.00004 ) discard;
                    float thickness = abs(
                        viewDistance( back ) - viewDistance( front )
                    );
                    float transmission = clamp(
                        0.18 + exp( -thickness * 0.72 ) * 0.58,
                        0.18,
                        0.68
                    );
                    gl_FragColor = vec4(
                        vec3( 0.72, 0.75, 0.73 ),
                        transmission
                    );
                }
            `
            : `
                uniform float proxyLength;
                varying float visibleCarrier;
                varying float longitudinalPosition;
                void main()
                {
                    if ( visibleCarrier < 0.5
                        || longitudinalPosition < 0.0
                        || longitudinalPosition > proxyLength ) discard;
                    gl_FragColor = vec4( 0.72, 0.75, 0.73, 0.58 );
                }
            `,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.NormalBlending,
        toneMapped: true,
        side: THREE.DoubleSide,
        stencilWrite: true,
        stencilRef: 1,
        stencilFunc: THREE.EqualStencilFunc,
        stencilFail: THREE.KeepStencilOp,
        stencilZFail: THREE.KeepStencilOp,
        stencilZPass: THREE.KeepStencilOp
    } );
    material.name = attenuation
        ? 'C2 linearized trunk attenuation overlay'
        : 'C2 trunk stencil diagnostic overlay';
    registerRendererOwnedMotion(
        material,
        attenuation ? 'carrier-attenuation' : 'carrier-stencil-diagnostic'
    );
    return material;
}

const runeVertexShader = `
    ${rootedMotionShaderDeclarations}
    attribute float runeSignal;
    attribute float runeWarmth;
    varying float internalRuneSignal;
    varying float internalRuneWarmth;

    void main()
    {
        internalRuneSignal = runeSignal;
        internalRuneWarmth = runeWarmth;
        vec3 transformed = position;
        ${rootedMotionShaderApplication( 'position' )}
        gl_Position = projectionMatrix * modelViewMatrix
            * vec4( transformed, 1.0 );
    }
`;

function createRuneDepthMaterial()
{
    const material = new THREE.ShaderMaterial( {
        uniforms: {
            treeTime: { value: 0 },
            treeResponse: { value: 0.22 },
            treeGustMix: { value: 0 },
            treeGustIntervalBase: { value: 0 }
        },
        vertexShader: runeVertexShader,
        fragmentShader: `
            #include <packing>
            varying float internalRuneSignal;
            void main()
            {
                if ( internalRuneSignal <= 0.004 ) discard;
                gl_FragColor = packDepthToRGBA( gl_FragCoord.z );
            }
        `,
        side: THREE.FrontSide,
        depthTest: true,
        depthFunc: THREE.LessEqualDepth,
        depthWrite: true,
        transparent: false,
        toneMapped: false,
        blending: THREE.NoBlending
    } );
    material.name = 'internal rune nearest-signal depth';
    registerRendererOwnedMotion( material, 'internal-rune-depth' );
    return material;
}

function createRuneSubsurfaceMaterial()
{
    const material = new THREE.ShaderMaterial( {
        uniforms: {
            treeTime: { value: 0 },
            treeResponse: { value: 0.22 },
            treeGustMix: { value: 0 },
            treeGustIntervalBase: { value: 0 },
            frontDepth: { value: null },
            backDepth: { value: null },
            runeDepth: { value: null },
            viewport: { value: new THREE.Vector2( 1, 1 ) },
            cameraNear: { value: 0.1 },
            cameraFar: { value: 80 },
            runeRadius: { value: 0.026 },
            sourceColour: {
                value: new THREE.Color( 0x249cff ).multiplyScalar( 1.75 )
            },
            outputColour: {
                value: new THREE.Color( 0xffc451 ).multiplyScalar( 1.65 )
            }
        },
        vertexShader: runeVertexShader,
        fragmentShader: `
            #include <packing>
            uniform sampler2D frontDepth;
            uniform sampler2D backDepth;
            uniform sampler2D runeDepth;
            uniform vec2 viewport;
            uniform float cameraNear;
            uniform float cameraFar;
            uniform float runeRadius;
            uniform vec3 sourceColour;
            uniform vec3 outputColour;
            varying float internalRuneSignal;
            varying float internalRuneWarmth;

            float viewDistance( float depth )
            {
                float clipZ = depth * 2.0 - 1.0;
                return ( 2.0 * cameraNear * cameraFar )
                    / ( cameraFar + cameraNear
                        - clipZ * ( cameraFar - cameraNear ) );
            }

            void main()
            {
                if ( internalRuneSignal <= 0.004 ) discard;
                vec2 uv = gl_FragCoord.xy / viewport;
                float front = unpackRGBAToDepth( texture2D( frontDepth, uv ) );
                float back = unpackRGBAToDepth( texture2D( backDepth, uv ) );
                float nearestRune = unpackRGBAToDepth(
                    texture2D( runeDepth, uv )
                );
                if ( front >= 0.99999 || back >= 0.99999
                    || nearestRune >= 0.99999 ) discard;

                float frontDistance = viewDistance( front );
                float backDistance = viewDistance( back );
                float fragmentDistance = viewDistance( gl_FragCoord.z );
                float nearestRuneDistance = viewDistance( nearestRune );
                float shellThickness = backDistance - frontDistance;
                if ( shellThickness <= 0.0001
                    || fragmentDistance <= frontDistance + 0.0005
                    || fragmentDistance >= backDistance - 0.0005 ) discard;

                // A separate nearest-signal depth pass gives stable crossing
                // order before this translucent composite is evaluated.
                float nearestTolerance = max(
                    runeRadius * 1.7,
                    fragmentDistance * 0.0012
                );
                if ( abs( fragmentDistance - nearestRuneDistance )
                    > nearestTolerance ) discard;

                float burial = fragmentDistance - frontDistance;
                float burialFraction = clamp(
                    burial / shellThickness,
                    0.0,
                    1.0
                );
                float transmission = clamp(
                    exp( -burial * 1.55 )
                        * ( 1.0 - burialFraction * 0.28 ),
                    0.12,
                    0.82
                );
                float signal = pow( internalRuneSignal, 0.78 );
                vec3 colour = mix(
                    sourceColour,
                    outputColour,
                    internalRuneWarmth
                );
                gl_FragColor = vec4(
                    colour,
                    signal * transmission * 0.82
                );
            }
        `,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        side: THREE.FrontSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        stencilWrite: true,
        stencilRef: 1,
        stencilFunc: THREE.EqualStencilFunc,
        stencilFail: THREE.KeepStencilOp,
        stencilZFail: THREE.KeepStencilOp,
        stencilZPass: THREE.KeepStencilOp
    } );
    material.name = 'internal rune depth-aware subsurface transmission';
    material.userData.depthAware = true;
    material.userData.cameraFacing = false;
    material.userData.greaterDepth = false;
    registerRendererOwnedMotion( material, 'internal-rune-subsurface' );
    return material;
}

export const internalRouterPresentationStyle = Object.freeze( {
    packetCoreRadius: informationPacketVisualProfile.coreRadius,
    headWidth: informationPacketVisualProfile.headWidth,
    trailLength: informationPacketVisualProfile.trailLength,
    wakeAmplitude: informationPacketVisualProfile.wakeAmplitude,
    wakeDecay: informationPacketVisualProfile.wakeDecay,
    discardThreshold: informationPacketVisualProfile.discardThreshold,
    outputColour: informationPacketVisualProfile.outputColour,
    outputIntensity: informationPacketVisualProfile.outputIntensity,
    internalTransmissionCompensation:
        informationPacketVisualProfile.internalTransmissionCompensation,
    overlapPolicy: 'physical-occlusion-no-semantic-aggregation'
} );

const packetTrailVertexShader = `
    ${rootedMotionShaderDeclarations}
    attribute float packetSignal;
    attribute float packetWarmth;
    varying float internalPacketSignal;
    varying float internalPacketWarmth;

    void main()
    {
        internalPacketSignal = packetSignal;
        internalPacketWarmth = packetWarmth;
        vec3 transformed = position;
        #ifdef USE_INSTANCING
            transformed = ( instanceMatrix * vec4( transformed, 1.0 ) ).xyz;
        #endif
        ${rootedMotionShaderApplication( 'transformed' )}
        gl_Position = projectionMatrix * modelViewMatrix
            * vec4( transformed, 1.0 );
    }
`;

function createPacketTrailDepthMaterial()
{
    const material = new THREE.ShaderMaterial( {
        uniforms: {
            treeTime: { value: 0 },
            treeResponse: { value: 0.22 },
            treeGustMix: { value: 0 },
            treeGustIntervalBase: { value: 0 }
        },
        vertexShader: packetTrailVertexShader,
        fragmentShader: `
            #include <packing>
            varying float internalPacketSignal;
            void main()
            {
                if ( internalPacketSignal <= ${informationPacketVisualProfile.discardThreshold.toFixed( 3 )} ) discard;
                gl_FragColor = packDepthToRGBA( gl_FragCoord.z );
            }
        `,
        side: THREE.DoubleSide,
        depthTest: true,
        depthFunc: THREE.LessEqualDepth,
        depthWrite: true,
        transparent: false,
        toneMapped: false,
        blending: THREE.NoBlending
    } );
    material.name = 'D4 nearest route-local packet-trail depth';
    material.userData.presentationCandidateId =
        internalRouterPresentationCandidateId;
    registerRendererOwnedMotion( material, 'route-local-packet-depth' );
    return material;
}

function createPacketTrailSubsurfaceMaterial()
{
    const material = new THREE.ShaderMaterial( {
        uniforms: {
            treeTime: { value: 0 },
            treeResponse: { value: 0.22 },
            treeGustMix: { value: 0 },
            treeGustIntervalBase: { value: 0 },
            frontDepth: { value: null },
            backDepth: { value: null },
            trailDepth: { value: null },
            externalDepth: { value: null },
            externalOcclusionEnabled: { value: 0 },
            viewport: { value: new THREE.Vector2( 1, 1 ) },
            cameraNear: { value: 0.1 },
            cameraFar: { value: 80 },
            packetRadius: {
                value: informationPacketVisualProfile.coreRadius
            },
            sourceColour: {
                value: new THREE.Vector3().fromArray(
                    informationPacketVisualProfile.sourceColour
                )
            },
            outputColour: {
                value: new THREE.Color(
                    informationPacketVisualProfile.outputColour
                ).multiplyScalar(
                    informationPacketVisualProfile.outputIntensity
                )
            }
        },
        vertexShader: packetTrailVertexShader,
        fragmentShader: `
            #include <packing>
            uniform sampler2D frontDepth;
            uniform sampler2D backDepth;
            uniform sampler2D trailDepth;
            uniform sampler2D externalDepth;
            uniform float externalOcclusionEnabled;
            uniform vec2 viewport;
            uniform float cameraNear;
            uniform float cameraFar;
            uniform float packetRadius;
            uniform vec3 sourceColour;
            uniform vec3 outputColour;
            varying float internalPacketSignal;
            varying float internalPacketWarmth;

            float viewDistance( float depth )
            {
                float clipZ = depth * 2.0 - 1.0;
                return ( 2.0 * cameraNear * cameraFar )
                    / ( cameraFar + cameraNear
                        - clipZ * ( cameraFar - cameraNear ) );
            }

            void main()
            {
                if ( internalPacketSignal <= ${informationPacketVisualProfile.discardThreshold.toFixed( 3 )} ) discard;
                vec2 uv = gl_FragCoord.xy / viewport;
                float front = unpackRGBAToDepth( texture2D( frontDepth, uv ) );
                float back = unpackRGBAToDepth( texture2D( backDepth, uv ) );
                float nearestTrail = unpackRGBAToDepth(
                    texture2D( trailDepth, uv )
                );
                float externalTerrainDepth = externalOcclusionEnabled > 0.5
                    ? unpackRGBAToDepth( texture2D( externalDepth, uv ) )
                    : 1.0;
                if ( front >= 0.99999 || back >= 0.99999
                    || nearestTrail >= 0.99999 ) discard;

                // The packed terrain depth is independent of ordinary scene
                // depth. This preserves a packet genuinely in front of the
                // terrain while rejecting one behind the near well wall,
                // even when nearer lava has already written the main depth
                // buffer. The small clip-depth tolerance prevents a
                // coplanar packet from flickering at the contact boundary.
                if ( externalTerrainDepth < 0.99999
                    && gl_FragCoord.z > externalTerrainDepth + 0.00004 )
                {
                    discard;
                }

                float frontDistance = viewDistance( front );
                float backDistance = viewDistance( back );
                float fragmentDistance = viewDistance( gl_FragCoord.z );
                float nearestTrailDistance = viewDistance( nearestTrail );
                float shellThickness = backDistance - frontDistance;
                if ( shellThickness <= 0.0001
                    || fragmentDistance <= frontDistance + 0.0005
                    || fragmentDistance >= backDistance - 0.0005 ) discard;

                float nearestTolerance = max(
                    packetRadius * 2.0,
                    fragmentDistance * 0.00025
                );
                if ( abs( fragmentDistance - nearestTrailDistance )
                    > nearestTolerance ) discard;

                float burial = fragmentDistance - frontDistance;
                float burialFraction = clamp(
                    burial / shellThickness,
                    0.0,
                    1.0
                );
                float transmission = exp( -burial )
                    * max( 0.0, 1.0 - burialFraction );
                if ( transmission <= 0.005 ) discard;
                vec3 packetColour = mix(
                    sourceColour,
                    outputColour,
                    clamp( internalPacketWarmth, 0.0, 1.0 )
                );
                gl_FragColor = vec4(
                    packetColour,
                    min(
                        1.0,
                        internalPacketSignal
                            * ${informationPacketVisualProfile.alpha.toFixed( 2 )}
                            * transmission * 2.2
                            * ${informationPacketVisualProfile.internalTransmissionCompensation.toFixed( 1 )}
                    )
                );
            }
        `,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending,
        toneMapped: false,
        stencilWrite: false
    } );
    material.name = 'D4 route-local gold head-and-wake transmission';
    material.userData.presentationCandidateId =
        internalRouterPresentationCandidateId;
    registerRendererOwnedMotion( material, 'route-local-packet-subsurface' );
    material.userData.depthAware = true;
    material.userData.cameraFacing = false;
    material.userData.greaterDepth = false;
    material.userData.persistentDisclosure = false;
    material.userData.colourBoundary =
        'cyan-input-to-cosmos-gold-output-at-rune';
    material.userData.morphology = 'canopy-equivalent-head-and-wake';
    return material;
}

export function createInternalRouterPacketTrailGeometry(
    packetTrails,
    packetRadius = informationPacketVisualProfile.coreRadius,
    junctionFormGeometry = null
)
{
    if ( !Number.isFinite( packetRadius ) || packetRadius <= 0 )
    {
        throw new Error( 'D4 packet radius must be positive and finite.' );
    }
    const sources = [];
    const ownedSources = [];
    const radialSegments = 8;
    let submittedSampleCount = 0;
    for ( const trail of packetTrails )
    {
        const visibleSamples = trail.samples.filter( ( sample ) =>
            getInformationSignal( sample.distance, trail.headDistance )
                > informationPacketVisualProfile.discardThreshold
        );
        submittedSampleCount += visibleSamples.length;
        if ( visibleSamples.length === 0 ) continue;
        if ( visibleSamples.length === 1 )
        {
            const sample = visibleSamples[0];
            const geometry = new THREE.SphereGeometry(
                packetRadius,
                radialSegments,
                6
            );
            geometry.translate( ...sample.position );
            geometry.setAttribute(
                'packetSignal',
                new THREE.Float32BufferAttribute(
                    new Float32Array(
                        geometry.getAttribute( 'position' ).count
                    ).fill( getInformationSignal(
                        sample.distance,
                        trail.headDistance
                    ) ),
                    1
                )
            );
            geometry.setAttribute(
                'packetWarmth',
                new THREE.Float32BufferAttribute(
                    new Float32Array(
                        geometry.getAttribute( 'position' ).count
                    ).fill( 1 ),
                    1
                )
            );
            geometry.setAttribute(
                'junctionPhase',
                new THREE.Float32BufferAttribute(
                    new Float32Array(
                        geometry.getAttribute( 'position' ).count
                    ).fill( -1 ),
                    1
                )
            );
            sources.push( geometry );
            ownedSources.push( geometry );
            continue;
        }

        const routePoints = visibleSamples.map( ( sample ) =>
            new THREE.Vector3().fromArray( sample.position )
        );
        const routeCurve = new THREE.CurvePath();
        for ( let index = 1; index < routePoints.length; index += 1 )
        {
            routeCurve.add( new THREE.LineCurve3(
                routePoints[index - 1],
                routePoints[index]
            ) );
        }
        const tubularSegments = Math.max(
            4,
            visibleSamples.length - 1
        );
        const geometry = new THREE.TubeGeometry(
            routeCurve,
            tubularSegments,
            packetRadius,
            radialSegments,
            false
        );
        const packetSignal = new Float32Array(
            geometry.getAttribute( 'position' ).count
        );
        const ringStride = radialSegments + 1;
        const firstDistance = visibleSamples[0].distance;
        const lastDistance = visibleSamples.at( -1 ).distance;
        for ( let vertex = 0; vertex < packetSignal.length; vertex += 1 )
        {
            const ring = Math.min(
                tubularSegments,
                Math.floor( vertex / ringStride )
            );
            const routeDistance = THREE.MathUtils.lerp(
                firstDistance,
                lastDistance,
                ring / tubularSegments
            );
            packetSignal[vertex] = getInformationSignal(
                routeDistance,
                trail.headDistance
            );
        }
        geometry.setAttribute(
            'packetSignal',
            new THREE.Float32BufferAttribute( packetSignal, 1 )
        );
        geometry.setAttribute(
            'packetWarmth',
            new THREE.Float32BufferAttribute(
                new Float32Array( packetSignal.length ).fill( 1 ),
                1
            )
        );
        geometry.setAttribute(
            'junctionPhase',
            new THREE.Float32BufferAttribute(
                new Float32Array( packetSignal.length ).fill( -1 ),
                1
            )
        );
        sources.push( geometry );
        ownedSources.push( geometry );
    }
    if ( junctionFormGeometry ) sources.push( junctionFormGeometry );
    const geometry = sources.length > 0
        ? mergeGeometries( sources, false )
        : new THREE.BufferGeometry();
    for ( const source of ownedSources ) source.dispose();
    if ( !geometry )
    {
        throw new Error( 'D4 packet trails could not be merged.' );
    }
    if ( geometry.getAttribute( 'position' ) )
    {
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
    }
    geometry.userData.internalRouterPresentation = {
        candidateId: internalRouterPresentationCandidateId,
        packetCount: packetTrails.length,
        submittedSampleCount,
        vertexCount: geometry.getAttribute( 'position' )?.count ?? 0,
        packetTrailVertexCount:
            ( geometry.getAttribute( 'position' )?.count ?? 0 )
                - ( junctionFormGeometry
                    ?.getAttribute( 'position' )?.count ?? 0 ),
        packetRadius,
        junctionFormIncluded: junctionFormGeometry !== null,
        junctionFormVertexCount: junctionFormGeometry
            ?.getAttribute( 'position' )?.count ?? 0,
        centreline: 'piecewise-authored-route-samples',
        objectSpace: true,
        cameraFacing: false
    };
    return geometry;
}

function createPackedDepthTarget()
{
    const target = new THREE.WebGLRenderTarget( 1, 1, {
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        depthBuffer: true,
        stencilBuffer: false
    } );
    target.texture.colorSpace = THREE.NoColorSpace;
    target.texture.generateMipmaps = false;
    return target;
}

function createExternalOccluderDepthMaterial( source )
{
    const sourceMaterial = Array.isArray( source.material )
        ? source.material[0]
        : source.material;
    const material = new THREE.ShaderMaterial( {
        vertexShader: `
            void main()
            {
                gl_Position = projectionMatrix * modelViewMatrix
                    * vec4( position, 1.0 );
            }
        `,
        fragmentShader: `
            #include <packing>
            void main()
            {
                gl_FragColor = packDepthToRGBA( gl_FragCoord.z );
            }
        `,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: true,
        depthFunc: THREE.LessEqualDepth,
        colorWrite: true,
        polygonOffset: sourceMaterial?.polygonOffset ?? false,
        polygonOffsetFactor: sourceMaterial?.polygonOffsetFactor ?? 0,
        polygonOffsetUnits: sourceMaterial?.polygonOffsetUnits ?? 0,
        toneMapped: false,
        blending: THREE.NoBlending
    } );
    material.name = 'external Tree occluder packed terrain depth';
    return material;
}

export function createTrunkVisibilityRenderer(
    renderer,
    scene,
    camera,
    engineeredTree,
    { externalOccluders = [] } = {}
)
{
    if ( !Array.isArray( externalOccluders ) )
    {
        throw new TypeError( 'External Tree occluders must be an array.' );
    }
    for ( const occluder of externalOccluders )
    {
        if ( !occluder?.isMesh )
        {
            throw new TypeError( 'Every external Tree occluder must be a mesh.' );
        }
    }
    const stencilAvailable = renderer.getContext()
        .getContextAttributes().stencil;
    const proxyScene = new THREE.Scene();
    const ownershipScene = new THREE.Scene();
    const carrierScene = new THREE.Scene();
    const runeScene = new THREE.Scene();
    const packetLocusScene = new THREE.Scene();
    const externalOccluderScene = new THREE.Scene();
    const placeholder = new THREE.BufferGeometry();
    const packetTrailPlaceholder = new THREE.BufferGeometry();
    const frontDepthMaterial = createProxyMaterial( THREE.FrontSide, true );
    const backDepthMaterial = createProxyMaterial( THREE.BackSide, true );
    const ownershipMaterial = createProxyMaterial( THREE.FrontSide, false );
    ownershipMaterial.stencilWrite = true;
    ownershipMaterial.stencilRef = 1;
    ownershipMaterial.stencilFunc = THREE.AlwaysStencilFunc;
    ownershipMaterial.stencilFail = THREE.KeepStencilOp;
    ownershipMaterial.stencilZFail = THREE.KeepStencilOp;
    ownershipMaterial.stencilZPass = THREE.ReplaceStencilOp;
    const attenuationMaterial = createCarrierOverlayMaterial( true );
    const stencilMaterial = createCarrierOverlayMaterial( false );
    const runeDepthMaterial = createRuneDepthMaterial();
    const runeSubsurfaceMaterial = createRuneSubsurfaceMaterial();
    const packetLocusDepthMaterial = createPacketTrailDepthMaterial();
    const packetLocusSubsurfaceMaterial =
        createPacketTrailSubsurfaceMaterial();
    const proxyMesh = new THREE.Mesh( placeholder, ownershipMaterial );
    const ownershipMesh = new THREE.Mesh( placeholder, ownershipMaterial );
    const carrierMesh = new THREE.Mesh( placeholder, attenuationMaterial );
    const runeMesh = new THREE.Mesh( placeholder, runeSubsurfaceMaterial );
    const packetLocusMesh = new THREE.Mesh(
        packetTrailPlaceholder,
        packetLocusSubsurfaceMaterial
    );
    proxyMesh.matrixAutoUpdate = false;
    ownershipMesh.matrixAutoUpdate = false;
    carrierMesh.matrixAutoUpdate = false;
    runeMesh.matrixAutoUpdate = false;
    packetLocusMesh.matrixAutoUpdate = false;
    packetLocusMesh.frustumCulled = false;
    proxyScene.add( proxyMesh );
    ownershipScene.add( ownershipMesh );
    carrierScene.add( carrierMesh );
    runeScene.add( runeMesh );
    packetLocusScene.add( packetLocusMesh );
    const externalOccluderProxies = externalOccluders.map(
        ( source, index ) => {
            const proxy = new THREE.Mesh(
                source.geometry,
                createExternalOccluderDepthMaterial( source )
            );
            proxy.name = `External Tree occluder ${index + 1}`;
            proxy.matrixAutoUpdate = false;
            proxy.frustumCulled = source.frustumCulled;
            externalOccluderScene.add( proxy );
            return { source, proxy };
        }
    );
    const frontDepthTarget = createPackedDepthTarget();
    const backDepthTarget = createPackedDepthTarget();
    const runeDepthTarget = createPackedDepthTarget();
    const externalDepthTarget = externalOccluders.length > 0
        ? createPackedDepthTarget()
        : null;
    const drawingBufferSize = new THREE.Vector2();
    let resourceRevision = -1;
    let runeResourceRevision = -1;
    let cpuSubmissionEmaMs = 0;
    let diagnostics = {
        mode: 'off',
        passCount: 1,
        cpuSubmissionMs: 0,
        packedDepthPasses: 0,
        ownershipPasses: 0,
        carrierOverlayPasses: 0,
        runeDepthPasses: 0,
        runeOverlayPasses: 0,
        packetLocusDepthPasses: 0,
        packetLocusOverlayPasses: 0,
        externalOccluderCount: 0,
        externalOcclusionPasses: 0,
        externalDepthPasses: 0,
        subsurfaceActive: false,
        renderTargetPixels: 0,
        renderTargetWidth: 0,
        renderTargetHeight: 0,
        estimatedRenderTargetBytes: 0,
        cpuSubmissionEmaMs: 0,
        stencilAvailable
    };

    function resize( scale = 0.5 )
    {
        renderer.getDrawingBufferSize( drawingBufferSize );
        const width = Math.max( 1, Math.floor( drawingBufferSize.x * scale ) );
        const height = Math.max( 1, Math.floor( drawingBufferSize.y * scale ) );
        if ( frontDepthTarget.width === width
            && frontDepthTarget.height === height ) return;
        frontDepthTarget.setSize( width, height );
        backDepthTarget.setSize( width, height );
        runeDepthTarget.setSize( width, height );
        externalDepthTarget?.setSize( width, height );
    }

    function isHierarchyVisible( object )
    {
        let current = object;
        while ( current )
        {
            if ( !current.visible ) return false;
            current = current.parent;
        }
        return true;
    }

    function updateExternalOccluders()
    {
        let visibleCount = 0;
        for ( const { source, proxy } of externalOccluderProxies )
        {
            source.updateWorldMatrix( true, false );
            proxy.geometry = source.geometry;
            proxy.matrix.copy( source.matrixWorld );
            proxy.visible = isHierarchyVisible( source );
            if ( proxy.visible ) visibleCount += 1;
        }
        return visibleCount;
    }

    function updateResources( resources )
    {
        proxyMesh.geometry = resources.proxyGeometry;
        carrierMesh.geometry = resources.skeletonMesh.geometry;
        if ( resources.revision !== resourceRevision )
        {
            resourceRevision = resources.revision;
        }
        ownershipMesh.geometry = resources.ownershipGeometry;
        resources.trunkMesh.updateWorldMatrix( true, false );
        resources.skeletonMesh.updateWorldMatrix( true, false );
        proxyMesh.matrix.copy( resources.trunkMesh.matrixWorld );
        ownershipMesh.matrix.copy( resources.trunkMesh.matrixWorld );
        carrierMesh.matrix.copy( resources.skeletonMesh.matrixWorld );

        const source = resources.deformationUniforms;
        for ( const material of [
            frontDepthMaterial,
            backDepthMaterial,
            ownershipMaterial
        ] )
        {
            material.uniforms.treeTime.value = source.time.value;
            material.uniforms.treeRelief.value = source.relief.value;
            material.uniforms.treeResponse.value = source.response.value;
            material.uniforms.treeGustMix.value = source.gustMix.value;
            material.uniforms.treeGustIntervalBase.value =
                source.intervalBase.value;
        }
        for ( const material of [ attenuationMaterial, stencilMaterial ] )
        {
            material.uniforms.treeTime.value = source.time.value;
            material.uniforms.treeResponse.value = source.response.value;
            material.uniforms.treeGustMix.value = source.gustMix.value;
            material.uniforms.treeGustIntervalBase.value =
                source.intervalBase.value;
            material.uniforms.cameraNear.value = camera.near;
            material.uniforms.cameraFar.value = camera.far;
        }
        const patch = resources.ownershipGeometry.userData
            .trunkVisibilityOwnershipPatch;
        const start = new THREE.Vector3().fromArray( patch.startCentre );
        const axis = new THREE.Vector3().fromArray( patch.axis );
        for ( const material of [ attenuationMaterial, stencilMaterial ] )
        {
            material.uniforms.proxyStart.value.copy( start );
            material.uniforms.proxyAxis.value.copy( axis );
            material.uniforms.proxyLength.value = patch.axisLength;
        }
    }

    function updateRuneResources( visibilityResources, runeResources )
    {
        proxyMesh.geometry = runeResources.proxyGeometry;
        if ( visibilityResources.revision !== resourceRevision )
        {
            resourceRevision = visibilityResources.revision;
        }
        if ( runeResources.revision !== runeResourceRevision )
        {
            runeMesh.geometry = runeResources.geometry;
            runeResourceRevision = runeResources.revision;
        }
        ownershipMesh.geometry = runeResources.ownershipGeometry;
        visibilityResources.trunkMesh.updateWorldMatrix( true, false );
        runeResources.mesh.updateWorldMatrix( true, false );
        proxyMesh.matrix.copy( visibilityResources.trunkMesh.matrixWorld );
        ownershipMesh.matrix.copy( visibilityResources.trunkMesh.matrixWorld );
        runeMesh.matrix.copy( runeResources.mesh.matrixWorld );

        const source = runeResources.deformationUniforms;
        for ( const material of [
            frontDepthMaterial,
            backDepthMaterial,
            ownershipMaterial
        ] )
        {
            material.uniforms.treeTime.value = source.time.value;
            material.uniforms.treeRelief.value = source.relief.value;
            material.uniforms.treeResponse.value = source.response.value;
            material.uniforms.treeGustMix.value = source.gustMix.value;
            material.uniforms.treeGustIntervalBase.value =
                source.intervalBase.value;
        }
        for ( const material of [ runeDepthMaterial, runeSubsurfaceMaterial ] )
        {
            material.uniforms.treeTime.value = source.time.value;
            material.uniforms.treeResponse.value = source.response.value;
            material.uniforms.treeGustMix.value = source.gustMix.value;
            material.uniforms.treeGustIntervalBase.value =
                source.intervalBase.value;
        }
        runeSubsurfaceMaterial.uniforms.cameraNear.value = camera.near;
        runeSubsurfaceMaterial.uniforms.cameraFar.value = camera.far;
        runeSubsurfaceMaterial.uniforms.runeRadius.value =
            runeResources.geometry.userData.trunkRunes.tubeRadius;
    }

    function updatePacketLocusResources( resources, junctionFormResources )
    {
        proxyMesh.geometry = resources.proxyGeometry;
        resources.trunkMesh.updateWorldMatrix( true, false );
        proxyMesh.matrix.copy( resources.trunkMesh.matrixWorld );
        packetLocusMesh.matrix.copy( resources.trunkMesh.matrixWorld );
        const previousGeometry = packetLocusMesh.geometry;
        packetLocusMesh.geometry = createInternalRouterPacketTrailGeometry(
            resources.packetTrails,
            resources.packetRadius,
            junctionFormResources.active
                ? junctionFormResources.geometry
                : null
        );
        if ( previousGeometry !== packetTrailPlaceholder )
        {
            previousGeometry.dispose();
        }
        if ( resources.diagnostics )
        {
            const metadata = packetLocusMesh.geometry.userData
                .internalRouterPresentation;
            resources.diagnostics.submittedSampleCount =
                metadata.submittedSampleCount;
            resources.diagnostics.submittedVertexCount =
                metadata.packetTrailVertexCount;
            resources.diagnostics.sampleOverflowCount = 0;
        }

        const source = resources.deformationUniforms;
        for ( const material of [
            frontDepthMaterial,
            backDepthMaterial,
            ownershipMaterial
        ] )
        {
            material.uniforms.treeTime.value = source.time.value;
            material.uniforms.treeRelief.value = source.relief.value;
            material.uniforms.treeResponse.value = source.response.value;
            material.uniforms.treeGustMix.value = source.gustMix.value;
            material.uniforms.treeGustIntervalBase.value =
                source.intervalBase.value;
        }
        for ( const material of [
            packetLocusDepthMaterial,
            packetLocusSubsurfaceMaterial
        ] )
        {
            material.uniforms.treeTime.value = source.time.value;
            material.uniforms.treeResponse.value = source.response.value;
            material.uniforms.treeGustMix.value = source.gustMix.value;
            material.uniforms.treeGustIntervalBase.value =
                source.intervalBase.value;
        }
        packetLocusSubsurfaceMaterial.uniforms.cameraNear.value = camera.near;
        packetLocusSubsurfaceMaterial.uniforms.cameraFar.value = camera.far;
        packetLocusSubsurfaceMaterial.uniforms.packetRadius.value =
            resources.packetRadius;
    }

    function renderPackedDepth( target, material )
    {
        renderer.setRenderTarget( target );
        renderer.setClearColor( 0xffffff, 1 );
        renderer.clear( true, true, false );
        proxyMesh.material = material;
        renderer.render( proxyScene, camera );
    }

    function renderOwnershipMask()
    {
        renderer.setRenderTarget( null );
        renderer.clear( false, false, true );
        ownershipMesh.material = ownershipMaterial;
        renderer.render( ownershipScene, camera );
    }

    function renderExternalDepth()
    {
        const visibleCount = updateExternalOccluders();
        if ( visibleCount === 0 ) return { visibleCount, passCount: 0 };
        renderer.setRenderTarget( externalDepthTarget );
        renderer.setClearColor( 0xffffff, 1 );
        renderer.clear( true, true, false );
        renderer.render( externalOccluderScene, camera );
        return { visibleCount, passCount: 1 };
    }

    function renderRuneDepth()
    {
        renderer.setRenderTarget( runeDepthTarget );
        renderer.setClearColor( 0xffffff, 1 );
        renderer.clear( true, true, false );
        runeMesh.material = runeDepthMaterial;
        renderer.render( runeScene, camera );
    }

    function renderRuneSubsurface()
    {
        renderer.setRenderTarget( null );
        runeMesh.material = runeSubsurfaceMaterial;
        renderer.render( runeScene, camera );
    }

    function renderPacketLocusDepth()
    {
        renderer.setRenderTarget( runeDepthTarget );
        renderer.setClearColor( 0xffffff, 1 );
        renderer.clear( true, true, false );
        packetLocusMesh.material = packetLocusDepthMaterial;
        renderer.render( packetLocusScene, camera );
    }

    function renderPacketLocusSubsurface()
    {
        renderer.setRenderTarget( null );
        packetLocusMesh.material = packetLocusSubsurfaceMaterial;
        renderer.render( packetLocusScene, camera );
    }

    function render( mode = engineeredTree.getTrunkVisibilityMode() )
    {
        const started = performance.now();
        const resources = engineeredTree.getTrunkVisibilityResources();
        const runeResources = engineeredTree.getTrunkRuneResources();
        const packetLocusResources = engineeredTree
            .getInternalRouterPresentationResources();
        const junctionFormResources = engineeredTree
            .getInternalRouterJunctionFormResources();
        const packetTrailsActive = Boolean(
            packetLocusResources.packetTrails?.length > 0
            && packetLocusResources.trailSampleCount > 0
        );
        const junctionFormActive = Boolean(
            junctionFormResources.effectiveEnabled
            && junctionFormResources.active
            && junctionFormResources.geometry
            && junctionFormResources.diagnostics?.productionVisible === true
        );
        const packetLocusActive = Boolean( mode === 'off'
            && packetLocusResources.enabled
            && packetLocusResources.trunkMesh
            && ( packetTrailsActive || junctionFormActive )
            && packetLocusResources.proxyGeometry );
        const runeActive = Boolean( !packetLocusActive
            && mode === 'off'
            && runeResources.enabled
            && runeResources.diagnostics?.rendererEligible === true
            && runeResources.mesh
            && runeResources.geometry
            && runeResources.ownershipGeometry
            && runeResources.proxyGeometry
            && runeResources.activeTraversals.length > 0
            && diagnostics.stencilAvailable );
        renderer.setRenderTarget( null );
        renderer.autoClear = true;
        renderer.render( scene, camera );
        if ( mode !== 'attenuation' && mode !== 'stencil'
            && !packetLocusActive && !runeActive )
        {
            const cpuSubmissionMs = performance.now() - started;
            cpuSubmissionEmaMs = cpuSubmissionEmaMs === 0
                ? cpuSubmissionMs
                : cpuSubmissionEmaMs * 0.9 + cpuSubmissionMs * 0.1;
            diagnostics = {
                ...diagnostics,
                mode,
                requestedMode: mode,
                passCount: 1,
                cpuSubmissionMs,
                cpuSubmissionEmaMs,
                packedDepthPasses: 0,
                ownershipPasses: 0,
                carrierOverlayPasses: 0,
                runeDepthPasses: 0,
                runeOverlayPasses: 0,
                packetLocusDepthPasses: 0,
                packetLocusOverlayPasses: 0,
                externalOccluderCount: 0,
                externalOcclusionPasses: 0,
                externalDepthPasses: 0,
                subsurfaceActive: false,
                activeTraversalCount: 0,
                activePacketTrailCount: 0,
                activePacketTrailSampleCount: 0,
                activePacketTrailVertexCount: 0,
                junctionFormActive: false,
                activeJunctionFormManifestationCount: 0,
                junctionFormVertexCount: 0,
                opticalModel: null,
                crossingOrder: null,
                renderTargetPixels: 0,
                renderTargetWidth: 0,
                renderTargetHeight: 0,
                estimatedRenderTargetBytes: 0
            };
            engineeredTree.group.userData.trunkVisibilityRenderer = diagnostics;
            if ( runeResources.diagnostics )
            {
                runeResources.diagnostics.rendererActive = false;
                runeResources.diagnostics.activeDrawCalls = 0;
            }
            if ( packetLocusResources.diagnostics )
            {
                packetLocusResources.diagnostics.rendererActive = false;
                packetLocusResources.diagnostics.activeDrawCalls = 0;
            }
            if ( junctionFormResources.diagnostics )
            {
                junctionFormResources.diagnostics.rendererActive = false;
                junctionFormResources.diagnostics.activeDrawCalls = 0;
            }
            return;
        }

        if ( packetLocusActive )
        {
            // The canopy core is only a few pixels wide. D4 therefore needs
            // full-resolution packed depth to retain the same continuous
            // visual grammar through the graphite shell.
            resize( 1 );
            updatePacketLocusResources(
                packetLocusResources,
                junctionFormResources
            );
            const previousClearColour = renderer.getClearColor(
                new THREE.Color()
            );
            const previousClearAlpha = renderer.getClearAlpha();
            renderer.autoClear = false;
            renderPackedDepth( frontDepthTarget, frontDepthMaterial );
            renderPackedDepth( backDepthTarget, backDepthMaterial );
            renderPacketLocusDepth();
            const externalDepth = renderExternalDepth();
            packetLocusSubsurfaceMaterial.uniforms.frontDepth.value =
                frontDepthTarget.texture;
            packetLocusSubsurfaceMaterial.uniforms.backDepth.value =
                backDepthTarget.texture;
            packetLocusSubsurfaceMaterial.uniforms.trailDepth.value =
                runeDepthTarget.texture;
            packetLocusSubsurfaceMaterial.uniforms.externalDepth.value =
                externalDepthTarget?.texture ?? frontDepthTarget.texture;
            packetLocusSubsurfaceMaterial.uniforms
                .externalOcclusionEnabled.value =
                    externalDepth.passCount > 0 ? 1 : 0;
            packetLocusSubsurfaceMaterial.uniforms.viewport.value.copy(
                drawingBufferSize
            );
            renderPacketLocusSubsurface();
            renderer.setClearColor( previousClearColour, previousClearAlpha );
            renderer.autoClear = true;
            const targetPixels = frontDepthTarget.width
                * frontDepthTarget.height;
            const renderTargetCount = 3 + ( externalDepthTarget ? 1 : 0 );
            const cpuSubmissionMs = performance.now() - started;
            cpuSubmissionEmaMs = cpuSubmissionEmaMs === 0
                ? cpuSubmissionMs
                : cpuSubmissionEmaMs * 0.9 + cpuSubmissionMs * 0.1;
            diagnostics = {
                ...diagnostics,
                mode: 'd4-packet-subsurface',
                requestedMode: mode,
                passCount: 5 + externalDepth.passCount,
                cpuSubmissionMs,
                cpuSubmissionEmaMs,
                packedDepthPasses: 2,
                ownershipPasses: 0,
                carrierOverlayPasses: 0,
                runeDepthPasses: 0,
                runeOverlayPasses: 0,
                packetLocusDepthPasses: 1,
                packetLocusOverlayPasses: 1,
                externalOccluderCount: externalDepth.visibleCount,
                externalOcclusionPasses: externalDepth.passCount,
                externalDepthPasses: externalDepth.passCount,
                subsurfaceActive: true,
                activeTraversalCount: 0,
                activePacketTrailCount:
                    packetLocusResources.activePackets.length,
                activePacketTrailSampleCount:
                    packetLocusMesh.geometry.userData
                        .internalRouterPresentation.submittedSampleCount,
                activePacketTrailVertexCount:
                    packetLocusMesh.geometry.userData
                        .internalRouterPresentation.packetTrailVertexCount,
                junctionFormActive,
                activeJunctionFormManifestationCount: junctionFormActive
                    ? junctionFormResources.manifestations.length
                    : 0,
                junctionFormVertexCount: junctionFormActive
                    ? packetLocusMesh.geometry.userData
                        .internalRouterPresentation.junctionFormVertexCount
                    : 0,
                opticalModel:
                    'route-local head-and-wake shell and terrain-depth attenuation',
                crossingOrder: 'nearest active packet trail depth',
                renderTargetPixels: targetPixels * renderTargetCount,
                renderTargetWidth: frontDepthTarget.width,
                renderTargetHeight: frontDepthTarget.height,
                estimatedRenderTargetBytes:
                    targetPixels * 8 * renderTargetCount
            };
            engineeredTree.group.userData.trunkVisibilityRenderer = diagnostics;
            packetLocusResources.diagnostics.rendererActive = true;
            packetLocusResources.diagnostics.activeDrawCalls = 1;
            packetLocusResources.diagnostics.renderer = {
                technique: 'route-local-depth-aware-subsurface-head-and-wake',
                shellDepthPasses: 2,
                nearestSignalDepthPasses: 1,
                ownershipPasses: 0,
                externalOcclusionPasses: externalDepth.passCount,
                externalDepthPasses: externalDepth.passCount,
                externalOccluderCount: externalDepth.visibleCount,
                overlayPasses: 1,
                burialDependent: true,
                rearTransmissionFloor: 0,
                crossingOrderDepthResolved: true,
                oneSubmittedTrailPerPacket: true,
                trailCount: packetLocusResources.activePackets.length,
                trailSampleCount:
                    packetLocusMesh.geometry.userData
                        .internalRouterPresentation.submittedSampleCount,
                trailVertexCount:
                    packetLocusMesh.geometry.userData
                        .internalRouterPresentation.packetTrailVertexCount,
                trailLength: informationPacketVisualProfile.trailLength,
                headWidth: informationPacketVisualProfile.headWidth,
                wakeAmplitude: informationPacketVisualProfile.wakeAmplitude,
                wakeDecay: informationPacketVisualProfile.wakeDecay,
                packetRadius: packetLocusResources.packetRadius,
                internalTransmissionCompensation:
                    informationPacketVisualProfile
                        .internalTransmissionCompensation,
                signalClass: 'output',
                colour: 'cosmos-gold',
                overlapPolicy: 'physical occlusion; no additive fusion',
                greaterDepth: false,
                cameraFacing: false,
                persistentDisclosure: false
            };
            if ( junctionFormResources.diagnostics )
            {
                junctionFormResources.diagnostics.rendererActive =
                    junctionFormActive;
                junctionFormResources.diagnostics.activeDrawCalls =
                    junctionFormActive ? 1 : 0;
                junctionFormResources.diagnostics.renderer = {
                    technique:
                        'shared-d4-depth-aware-subsurface-junction-knot',
                    shellDepthPasses: 2,
                    nearestSignalDepthPasses: 1,
                    externalOcclusionPasses: externalDepth.passCount,
                    externalDepthPasses: externalDepth.passCount,
                    externalOccluderCount: externalDepth.visibleCount,
                    overlayPasses: 1,
                    burialDependent: true,
                    rearTransmissionFloor: 0,
                    crossingOrderDepthResolved: true,
                    sharedPacketTrailDraw: true,
                    greaterDepth: false,
                    cameraFacing: false,
                    persistentDisclosure: false
                };
            }
            if ( runeResources.diagnostics )
            {
                runeResources.diagnostics.rendererActive = false;
                runeResources.diagnostics.activeDrawCalls = 0;
            }
            return;
        }

        if ( runeActive )
        {
            resize();
            updateRuneResources( resources, runeResources );
            const previousClearColour = renderer.getClearColor(
                new THREE.Color()
            );
            const previousClearAlpha = renderer.getClearAlpha();
            renderer.autoClear = false;
            renderPackedDepth( frontDepthTarget, frontDepthMaterial );
            renderPackedDepth( backDepthTarget, backDepthMaterial );
            renderRuneDepth();
            renderOwnershipMask();
            runeSubsurfaceMaterial.uniforms.frontDepth.value =
                frontDepthTarget.texture;
            runeSubsurfaceMaterial.uniforms.backDepth.value =
                backDepthTarget.texture;
            runeSubsurfaceMaterial.uniforms.runeDepth.value =
                runeDepthTarget.texture;
            runeSubsurfaceMaterial.uniforms.viewport.value.copy(
                drawingBufferSize
            );
            renderRuneSubsurface();
            renderer.setClearColor( previousClearColour, previousClearAlpha );
            renderer.autoClear = true;
            const targetPixels = frontDepthTarget.width
                * frontDepthTarget.height;
            const cpuSubmissionMs = performance.now() - started;
            cpuSubmissionEmaMs = cpuSubmissionEmaMs === 0
                ? cpuSubmissionMs
                : cpuSubmissionEmaMs * 0.9 + cpuSubmissionMs * 0.1;
            diagnostics = {
                ...diagnostics,
                mode: 'rune-subsurface',
                requestedMode: mode,
                passCount: 6,
                cpuSubmissionMs,
                cpuSubmissionEmaMs,
                packedDepthPasses: 2,
                ownershipPasses: 1,
                carrierOverlayPasses: 0,
                runeDepthPasses: 1,
                runeOverlayPasses: 1,
                packetLocusDepthPasses: 0,
                packetLocusOverlayPasses: 0,
                externalOccluderCount: 0,
                externalOcclusionPasses: 0,
                externalDepthPasses: 0,
                subsurfaceActive: true,
                activePacketTrailCount: 0,
                activePacketTrailSampleCount: 0,
                activePacketTrailVertexCount: 0,
                junctionFormActive: false,
                activeJunctionFormManifestationCount: 0,
                junctionFormVertexCount: 0,
                activeTraversalCount:
                    runeResources.diagnostics.activeTraversalCount,
                opticalModel: 'front-depth burial attenuation',
                crossingOrder: 'nearest active rune depth',
                renderTargetPixels: targetPixels * 3,
                renderTargetWidth: frontDepthTarget.width,
                renderTargetHeight: frontDepthTarget.height,
                estimatedRenderTargetBytes: targetPixels * 8 * 3
            };
            engineeredTree.group.userData.trunkVisibilityRenderer = diagnostics;
            runeResources.diagnostics.rendererActive = true;
            runeResources.diagnostics.activeDrawCalls = 1;
            runeResources.diagnostics.renderer = {
                technique: 'depth-aware-subsurface-transmission',
                shellDepthPasses: 2,
                nearestSignalDepthPasses: 1,
                ownershipPasses: 1,
                overlayPasses: 1,
                burialDependent: true,
                crossingOrderDepthResolved: true,
                greaterDepth: false,
                cameraFacing: false,
                persistentDisclosure: false
            };
            if ( packetLocusResources.diagnostics )
            {
                packetLocusResources.diagnostics.rendererActive = false;
                packetLocusResources.diagnostics.activeDrawCalls = 0;
            }
            if ( junctionFormResources.diagnostics )
            {
                junctionFormResources.diagnostics.rendererActive = false;
                junctionFormResources.diagnostics.activeDrawCalls = 0;
            }
            return;
        }
        if ( !resources.proxyGeometry
            || !resources.ownershipGeometry
            || !resources.skeletonMesh ) return;

        resize();
        updateResources( resources );
        const previousClearColour = renderer.getClearColor( new THREE.Color() );
        const previousClearAlpha = renderer.getClearAlpha();
        renderer.autoClear = false;
        let packedDepthPasses = 0;
        if ( mode === 'attenuation' )
        {
            renderPackedDepth( frontDepthTarget, frontDepthMaterial );
            renderPackedDepth( backDepthTarget, backDepthMaterial );
            packedDepthPasses = 2;
            attenuationMaterial.uniforms.frontDepth.value = frontDepthTarget.texture;
            attenuationMaterial.uniforms.backDepth.value = backDepthTarget.texture;
            attenuationMaterial.uniforms.viewport.value.copy( drawingBufferSize );
        }
        renderOwnershipMask();
        renderer.setRenderTarget( null );
        carrierMesh.material = mode === 'attenuation'
            ? attenuationMaterial
            : stencilMaterial;
        renderer.render( carrierScene, camera );
        renderer.setClearColor( previousClearColour, previousClearAlpha );
        renderer.autoClear = true;
        const targetPixels = frontDepthTarget.width * frontDepthTarget.height;
        const renderTargetPixels = mode === 'attenuation'
            ? targetPixels * 2
            : 0;
        const cpuSubmissionMs = performance.now() - started;
        cpuSubmissionEmaMs = cpuSubmissionEmaMs === 0
            ? cpuSubmissionMs
            : cpuSubmissionEmaMs * 0.9 + cpuSubmissionMs * 0.1;
        diagnostics = {
            ...diagnostics,
            mode,
            requestedMode: mode,
            passCount: 3 + packedDepthPasses,
            cpuSubmissionMs,
            cpuSubmissionEmaMs,
            packedDepthPasses,
            ownershipPasses: 1,
            carrierOverlayPasses: 1,
            runeDepthPasses: 0,
            runeOverlayPasses: 0,
            packetLocusDepthPasses: 0,
            packetLocusOverlayPasses: 0,
            externalOccluderCount: 0,
            externalOcclusionPasses: 0,
            externalDepthPasses: 0,
            subsurfaceActive: false,
            activeTraversalCount: 0,
            activePacketTrailCount: 0,
            activePacketTrailSampleCount: 0,
            activePacketTrailVertexCount: 0,
            junctionFormActive: false,
            activeJunctionFormManifestationCount: 0,
            junctionFormVertexCount: 0,
            opticalModel: null,
            crossingOrder: null,
            renderTargetPixels,
            renderTargetWidth: mode === 'attenuation'
                ? frontDepthTarget.width
                : 0,
            renderTargetHeight: mode === 'attenuation'
                ? frontDepthTarget.height
                : 0,
            // Two RGBA8 packed-depth colours plus conservative 32-bit depth
            // storage per target. This is an estimate, not a GPU query.
            estimatedRenderTargetBytes: mode === 'attenuation'
                ? targetPixels * 8 * 2
                : 0
        };
        engineeredTree.group.userData.trunkVisibilityRenderer = diagnostics;
        if ( runeResources.diagnostics )
        {
            runeResources.diagnostics.rendererActive = false;
            runeResources.diagnostics.activeDrawCalls = 0;
        }
        if ( packetLocusResources.diagnostics )
        {
            packetLocusResources.diagnostics.rendererActive = false;
            packetLocusResources.diagnostics.activeDrawCalls = 0;
        }
        if ( junctionFormResources.diagnostics )
        {
            junctionFormResources.diagnostics.rendererActive = false;
            junctionFormResources.diagnostics.activeDrawCalls = 0;
        }
    }

    return {
        render,
        resize,
        getDiagnostics() {
            return { ...diagnostics };
        },
        dispose() {
            frontDepthTarget.dispose();
            backDepthTarget.dispose();
            runeDepthTarget.dispose();
            externalDepthTarget?.dispose();
            frontDepthMaterial.dispose();
            backDepthMaterial.dispose();
            ownershipMaterial.dispose();
            attenuationMaterial.dispose();
            stencilMaterial.dispose();
            runeDepthMaterial.dispose();
            runeSubsurfaceMaterial.dispose();
            packetLocusDepthMaterial.dispose();
            packetLocusSubsurfaceMaterial.dispose();
            for ( const { proxy } of externalOccluderProxies )
            {
                proxy.material.dispose();
            }
            if ( packetLocusMesh.geometry !== packetTrailPlaceholder )
            {
                packetLocusMesh.geometry.dispose();
            }
            packetTrailPlaceholder.dispose();
            placeholder.dispose();
        }
    };
}

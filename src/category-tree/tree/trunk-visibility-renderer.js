import * as THREE from 'three';

const swayedVertexBody = `
    vec3 transformed = position;
    float brushed = sin( position.y * 23.0 + position.x * 7.0 + position.z * 5.0 );
    float motionReach = smoothstep( 0.25, 5.6, max( position.y, 0.0 ) );
    float swayX = sin( treeTime * 0.72 + position.y * 0.38 + position.z * 0.12 );
    float swayZ = sin( treeTime * 0.56 + position.y * 0.31 + position.x * 0.10 + 1.7 );
    float flutter = sin( treeTime * 1.17 + position.y * 0.81 + position.z * 0.19 );
    transformed += normalize( normal ) * brushed * treeRelief * 0.004;
    transformed.x += ( swayX * 0.25 + flutter * 0.035 )
        * treeResponse * motionReach;
    transformed.z += ( swayZ * 0.19 + flutter * 0.028 )
        * treeResponse * motionReach;
`;

function createProxyMaterial( side, packedDepth = false )
{
    return new THREE.ShaderMaterial( {
        uniforms: {
            treeTime: { value: 0 },
            treeRelief: { value: 0.1 },
            treeResponse: { value: 0.22 }
        },
        vertexShader: `
            uniform float treeTime;
            uniform float treeRelief;
            uniform float treeResponse;
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
}

function createCarrierOverlayMaterial( attenuation )
{
    const material = new THREE.ShaderMaterial( {
        uniforms: {
            treeTime: { value: 0 },
            treeResponse: { value: 0.22 },
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
            uniform float treeTime;
            uniform float treeResponse;
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
                float motionReach = smoothstep( 0.25, 5.6, max( position.y, 0.0 ) );
                float swayX = sin( treeTime * 0.72 + position.y * 0.38 + position.z * 0.12 );
                float swayZ = sin( treeTime * 0.56 + position.y * 0.31 + position.x * 0.10 + 1.7 );
                float flutter = sin( treeTime * 1.17 + position.y * 0.81 + position.z * 0.19 );
                transformed.x += ( swayX * 0.25 + flutter * 0.035 )
                    * treeResponse * motionReach;
                transformed.z += ( swayZ * 0.19 + flutter * 0.028 )
                    * treeResponse * motionReach;
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
    return material;
}

const runeVertexShader = `
    uniform float treeTime;
    uniform float treeResponse;
    attribute float runeSignal;
    attribute float runeWarmth;
    varying float internalRuneSignal;
    varying float internalRuneWarmth;

    void main()
    {
        internalRuneSignal = runeSignal;
        internalRuneWarmth = runeWarmth;
        vec3 transformed = position;
        float motionReach = smoothstep( 0.25, 5.6, max( position.y, 0.0 ) );
        float swayX = sin( treeTime * 0.72 + position.y * 0.38 + position.z * 0.12 );
        float swayZ = sin( treeTime * 0.56 + position.y * 0.31 + position.x * 0.10 + 1.7 );
        float flutter = sin( treeTime * 1.17 + position.y * 0.81 + position.z * 0.19 );
        transformed.x += ( swayX * 0.25 + flutter * 0.035 )
            * treeResponse * motionReach;
        transformed.z += ( swayZ * 0.19 + flutter * 0.028 )
            * treeResponse * motionReach;
        gl_Position = projectionMatrix * modelViewMatrix
            * vec4( transformed, 1.0 );
    }
`;

function createRuneDepthMaterial()
{
    const material = new THREE.ShaderMaterial( {
        uniforms: {
            treeTime: { value: 0 },
            treeResponse: { value: 0.22 }
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
    return material;
}

function createRuneSubsurfaceMaterial()
{
    const material = new THREE.ShaderMaterial( {
        uniforms: {
            treeTime: { value: 0 },
            treeResponse: { value: 0.22 },
            frontDepth: { value: null },
            backDepth: { value: null },
            runeDepth: { value: null },
            viewport: { value: new THREE.Vector2( 1, 1 ) },
            cameraNear: { value: 0.1 },
            cameraFar: { value: 80 },
            runeRadius: { value: 0.026 },
            sourceColour: {
                value: new THREE.Color( 0x46a9ff ).multiplyScalar( 1.20 )
            },
            outputColour: {
                value: new THREE.Color( 0xfff2bf ).multiplyScalar( 1.18 )
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
                    exp( -burial * 1.72 )
                        * ( 1.0 - burialFraction * 0.34 ),
                    0.08,
                    0.78
                );
                float signal = pow( internalRuneSignal, 0.78 );
                vec3 colour = mix(
                    sourceColour,
                    outputColour,
                    internalRuneWarmth
                );
                gl_FragColor = vec4(
                    colour,
                    signal * transmission * 0.72
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
    return material;
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

export function createTrunkVisibilityRenderer(
    renderer,
    scene,
    camera,
    engineeredTree
)
{
    const proxyScene = new THREE.Scene();
    const ownershipScene = new THREE.Scene();
    const carrierScene = new THREE.Scene();
    const runeScene = new THREE.Scene();
    const placeholder = new THREE.BufferGeometry();
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
    const proxyMesh = new THREE.Mesh( placeholder, ownershipMaterial );
    const ownershipMesh = new THREE.Mesh( placeholder, ownershipMaterial );
    const carrierMesh = new THREE.Mesh( placeholder, attenuationMaterial );
    const runeMesh = new THREE.Mesh( placeholder, runeSubsurfaceMaterial );
    proxyMesh.matrixAutoUpdate = false;
    ownershipMesh.matrixAutoUpdate = false;
    carrierMesh.matrixAutoUpdate = false;
    runeMesh.matrixAutoUpdate = false;
    proxyScene.add( proxyMesh );
    ownershipScene.add( ownershipMesh );
    carrierScene.add( carrierMesh );
    runeScene.add( runeMesh );
    const frontDepthTarget = createPackedDepthTarget();
    const backDepthTarget = createPackedDepthTarget();
    const runeDepthTarget = createPackedDepthTarget();
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
        subsurfaceActive: false,
        renderTargetPixels: 0,
        renderTargetWidth: 0,
        renderTargetHeight: 0,
        estimatedRenderTargetBytes: 0,
        cpuSubmissionEmaMs: 0,
        stencilAvailable: renderer.getContext().getContextAttributes().stencil
    };

    function resize()
    {
        renderer.getDrawingBufferSize( drawingBufferSize );
        const width = Math.max( 1, Math.floor( drawingBufferSize.x * 0.5 ) );
        const height = Math.max( 1, Math.floor( drawingBufferSize.y * 0.5 ) );
        if ( frontDepthTarget.width === width
            && frontDepthTarget.height === height ) return;
        frontDepthTarget.setSize( width, height );
        backDepthTarget.setSize( width, height );
        runeDepthTarget.setSize( width, height );
    }

    function updateResources( resources )
    {
        if ( resources.revision !== resourceRevision )
        {
            proxyMesh.geometry = resources.proxyGeometry;
            carrierMesh.geometry = resources.skeletonMesh.geometry;
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
        }
        for ( const material of [ attenuationMaterial, stencilMaterial ] )
        {
            material.uniforms.treeTime.value = source.time.value;
            material.uniforms.treeResponse.value = source.response.value;
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
        if ( visibilityResources.revision !== resourceRevision )
        {
            proxyMesh.geometry = visibilityResources.proxyGeometry;
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
        }
        for ( const material of [ runeDepthMaterial, runeSubsurfaceMaterial ] )
        {
            material.uniforms.treeTime.value = source.time.value;
            material.uniforms.treeResponse.value = source.response.value;
        }
        runeSubsurfaceMaterial.uniforms.cameraNear.value = camera.near;
        runeSubsurfaceMaterial.uniforms.cameraFar.value = camera.far;
        runeSubsurfaceMaterial.uniforms.runeRadius.value =
            runeResources.geometry.userData.trunkRunes.tubeRadius;
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

    function render( mode = engineeredTree.getTrunkVisibilityMode() )
    {
        const started = performance.now();
        const resources = engineeredTree.getTrunkVisibilityResources();
        const runeResources = engineeredTree.getTrunkRuneResources();
        const runeActive = Boolean( mode === 'off'
            && runeResources.enabled
            && runeResources.diagnostics?.rendererEligible === true
            && runeResources.mesh
            && runeResources.geometry
            && runeResources.ownershipGeometry
            && resources.proxyGeometry );
        renderer.setRenderTarget( null );
        renderer.autoClear = true;
        renderer.render( scene, camera );
        if ( mode !== 'attenuation' && mode !== 'stencil' && !runeActive )
        {
            const cpuSubmissionMs = performance.now() - started;
            cpuSubmissionEmaMs = cpuSubmissionEmaMs === 0
                ? cpuSubmissionMs
                : cpuSubmissionEmaMs * 0.9 + cpuSubmissionMs * 0.1;
            diagnostics = {
                ...diagnostics,
                mode,
                passCount: 1,
                cpuSubmissionMs,
                cpuSubmissionEmaMs,
                packedDepthPasses: 0,
                ownershipPasses: 0,
                carrierOverlayPasses: 0,
                runeDepthPasses: 0,
                runeOverlayPasses: 0,
                subsurfaceActive: false,
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
                subsurfaceActive: true,
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
            passCount: 3 + packedDepthPasses,
            cpuSubmissionMs,
            cpuSubmissionEmaMs,
            packedDepthPasses,
            ownershipPasses: 1,
            carrierOverlayPasses: 1,
            runeDepthPasses: 0,
            runeOverlayPasses: 0,
            subsurfaceActive: false,
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
            frontDepthMaterial.dispose();
            backDepthMaterial.dispose();
            ownershipMaterial.dispose();
            attenuationMaterial.dispose();
            stencilMaterial.dispose();
            runeDepthMaterial.dispose();
            runeSubsurfaceMaterial.dispose();
            placeholder.dispose();
        }
    };
}

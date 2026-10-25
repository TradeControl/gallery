import * as THREE from 'three';
import { bindRangeControl } from '../controls.js';
import { seededGenerator } from '../random.js';

export const sluiceSourceRadiusRange = Object.freeze( {
    min: 9,
    max: 16,
    step: 0.25,
    variation: 0.75
} );

export const sluiceMoltenDomainDefaults = Object.freeze( {
    radius: 18,
    size: 36,
    resolution: 256,
    geometrySegments: 240,
    maskLimitMin: 0.99,
    maskLimitMax: 0.995,
    maskFadeWidth: 0.055
} );

export const sluiceGateDefaults = {
    depth: 5.5,
    width: 3.8,
    emissionRate: 48,
    gateCount: 4,
    streamCount: 12,
    lavaVelocity: 1.4,
    gravity: 3.2,
    drag: 0.32,
    interaction: 1.4,
    sourceSeed: 1,
    sourceRadius: 13,
    gateCycle: 11,
    phaseSpread: 0.78,
    openingDuration: 2.5,
    releaseThreshold: 12,
    persistence: 5,
    deposition: 1,
    moltenIntensity: 0.85,
    threshold: 0.1
};

export function snapshotSluiceSourceLayout( {
    sources,
    sourceSeed,
    streamCount,
    sourceRadius = null
} )
{
    const sourceSnapshots = sources.map( ( source, sourceIndex ) =>
        Object.freeze( {
            sourceIndex,
            label: source.label,
            position: Object.freeze( [ ...source.position ] ),
            direction: Object.freeze( [ ...source.direction ] ),
            speedFactor: source.speedFactor,
            cadence: source.cadence,
            mass: source.mass,
            color: Object.freeze( [
                source.color.r,
                source.color.g,
                source.color.b
            ] ),
            colorHex: source.color.getHex()
        } )
    );
    return Object.freeze( {
        sourceSeed,
        streamCount,
        sourceRadius,
        sources: Object.freeze( sourceSnapshots )
    } );
}

export function generateSluiceSourceLayout( {
    gateCount = sluiceGateDefaults.gateCount,
    streamCount = sluiceGateDefaults.streamCount,
    sourceSeed = sluiceGateDefaults.sourceSeed,
    sourceRadius = sluiceGateDefaults.sourceRadius
} = {} )
{
    if ( !Number.isFinite( sourceRadius )
        || sourceRadius < sluiceSourceRadiusRange.min
        || sourceRadius > sluiceSourceRadiusRange.max )
    {
        throw new RangeError(
            `Sluice source radius must be between ${sluiceSourceRadiusRange.min} and ${sluiceSourceRadiusRange.max}.`
        );
    }
    const generated = generateGateSystem(
        gateCount,
        streamCount,
        sourceSeed,
        sourceRadius
    );
    return snapshotSluiceSourceLayout( {
        sources: generated.sources,
        sourceSeed,
        streamCount,
        sourceRadius
    } );
}

export function snapshotSluiceSourceEmission( {
    source,
    sourceIndex,
    parcel,
    simulationTime
} )
{
    return Object.freeze( {
        sourceIndex,
        sourceLabel: source.label,
        sourcePosition: Object.freeze( [ ...source.position ] ),
        sourceDirection: Object.freeze( [ ...source.direction ] ),
        position: Object.freeze( [ parcel.x, parcel.z ] ),
        velocity: Object.freeze( [ parcel.vx, parcel.vz ] ),
        mass: parcel.mass,
        footprint: parcel.footprint,
        temperature: parcel.temperature,
        color: Object.freeze( [
            source.color.r,
            source.color.g,
            source.color.b
        ] ),
        colorHex: source.color.getHex(),
        simulationTime
    } );
}

function generateGateSystem(
    gateCount,
    streamCount,
    seed,
    nominalSourceRadius = sluiceGateDefaults.sourceRadius
)
{
    const generatedRandom = seededGenerator( 0x9e3779b9 ^ seed ^ ( gateCount * 0x85ebca6b ) ^ streamCount );
    const startAngle = generatedRandom() * Math.PI * 2;
    const sources = [];
    const generatedGates = [];

    for ( let index = 0; index < gateCount; index += 1 )
    {
        const sector = Math.PI * 2 / gateCount;
        const angle = startAngle + index * sector + ( generatedRandom() - 0.5 ) * sector * 0.62;
        const radius = THREE.MathUtils.lerp( 5.35, 6.15, generatedRandom() );
        const color = new THREE.Color().setHSL( ( index / gateCount + generatedRandom() * 0.035 ) % 1, 0.55, 0.64 );

        generatedGates.push( {
            label: `Gate ${index + 1}`,
            angle,
            radius,
            phaseBase: index / gateCount + THREE.MathUtils.lerp( -0.08, 0.08, generatedRandom() ),
            outletBias: THREE.MathUtils.lerp( -0.34, 0.34, generatedRandom() ),
            releaseAccumulator: 0,
            state: 'filling',
            latchedOpen: false,
            color
        } );
    }

    for ( let index = 0; index < streamCount; index += 1 )
    {
        const sector = Math.PI * 2 / streamCount;
        const sourceAngle = startAngle + index * sector + THREE.MathUtils.lerp( -0.32, 0.32, generatedRandom() ) * sector;
        const targetAngle = startAngle + ( ( index * 0.61803398875 + 0.21 ) % 1 ) * Math.PI * 2
            + THREE.MathUtils.lerp( -0.09, 0.09, generatedRandom() );
        const sourceRadius = nominalSourceRadius + THREE.MathUtils.lerp(
            -sluiceSourceRadiusRange.variation,
            sluiceSourceRadiusRange.variation,
            generatedRandom()
        );
        const catchmentRadius = THREE.MathUtils.lerp( 6.25, 6.65, generatedRandom() );
        const catchmentX = Math.cos( targetAngle ) * catchmentRadius;
        const catchmentZ = Math.sin( targetAngle ) * catchmentRadius;
        const sourceX = Math.cos( sourceAngle ) * sourceRadius;
        const sourceZ = Math.sin( sourceAngle ) * sourceRadius;
        const approachAngle = Math.atan2( catchmentZ - sourceZ, catchmentX - sourceX )
            + THREE.MathUtils.lerp( -0.12, 0.12, generatedRandom() );
        const speedFactor = THREE.MathUtils.lerp( 0.9, 1.1, generatedRandom() );
        const color = new THREE.Color().setHSL( ( index / streamCount + generatedRandom() * 0.025 ) % 1, 0.5, 0.62 );

        sources.push( {
            label: `Feed ${index + 1}`,
            position: [ sourceX, sourceZ ],
            direction: [ Math.cos( approachAngle ), Math.sin( approachAngle ) ],
            speedFactor,
            cadence: THREE.MathUtils.lerp( 0.84, 1.16, generatedRandom() ),
            mass: THREE.MathUtils.lerp( 0.72, 0.94, generatedRandom() ),
            color
        } );
    }

    const cadenceTotal = sources.reduce( ( total, source ) => total + source.cadence, 0 );
    sources.forEach( ( source ) => { source.cadence *= streamCount / cadenceTotal; } );
    return { sources, generatedGates };
}

export function resolveMoltenBoundaryContact( {
    parcel,
    previousX,
    previousZ,
    boundary,
    timeStep,
    minimumResidence = 0.65,
    minimumTangentialTravel = 0.25,
    maximumResidence = 2.4
} )
{
    if ( !boundary || typeof boundary.sample !== 'function' ) return null;
    const clearance = 0.055 + parcel.footprint * 0.14;
    const current = boundary.sample( parcel.x, parcel.z );
    if ( current.signedDistance >= clearance )
    {
        if ( parcel.contactResidence === undefined ) return null;
        parcel.contactResidence += timeStep;
        parcel.contactTangentialTravel = ( parcel.contactTangentialTravel ?? 0 )
            + Math.hypot( parcel.vx, parcel.vz ) * timeStep;
        const settled = (
            parcel.contactResidence >= minimumResidence
                && parcel.contactTangentialTravel >= minimumTangentialTravel
                && current.drainEligible === true
        ) || parcel.contactResidence >= maximumResidence;
        if ( !settled ) return null;
        parcel.settledAtContact = true;
        return Object.freeze( {
            settled: true,
            inwardImpulse: 0,
            residence: parcel.contactResidence,
            tangentialTravel: parcel.contactTangentialTravel,
            x: parcel.x,
            z: parcel.z,
            normalX: current.normalX,
            normalZ: current.normalZ
        } );
    }

    const previous = boundary.sample( previousX, previousZ );
    let resolvedX = parcel.x;
    let resolvedZ = parcel.z;
    let resolved = current;
    if ( previous.signedDistance >= clearance )
    {
        let outside = 0;
        let inside = 1;
        for ( let attempt = 0; attempt < 24; attempt += 1 )
        {
            const progress = ( outside + inside ) * 0.5;
            const x = THREE.MathUtils.lerp( previousX, parcel.x, progress );
            const z = THREE.MathUtils.lerp( previousZ, parcel.z, progress );
            const sample = boundary.sample( x, z );
            if ( sample.signedDistance >= clearance ) outside = progress;
            else inside = progress;
        }
        resolvedX = THREE.MathUtils.lerp( previousX, parcel.x, outside );
        resolvedZ = THREE.MathUtils.lerp( previousZ, parcel.z, outside );
        resolved = boundary.sample( resolvedX, resolvedZ );
    }
    parcel.x = resolved.closestX + resolved.normalX * clearance;
    parcel.z = resolved.closestZ + resolved.normalZ * clearance;

    const incomingSpeed = Math.hypot( parcel.vx, parcel.vz );
    const inwardVelocity = parcel.vx * resolved.normalX
        + parcel.vz * resolved.normalZ;
    if ( inwardVelocity < 0 )
    {
        parcel.vx -= resolved.normalX * inwardVelocity;
        parcel.vz -= resolved.normalZ * inwardVelocity;
    }
    const tangentX = -resolved.normalZ;
    const tangentZ = resolved.normalX;
    const tangentVelocity = parcel.vx * tangentX + parcel.vz * tangentZ;
    const side = Math.abs( tangentVelocity ) > 0.08
        ? Math.sign( tangentVelocity )
        : ( Math.sin(
            ( parcel.sourceIndex + 1 ) * 12.9898
                + resolvedX * 3.17
                - resolvedZ * 2.31
        ) >= 0 ? 1 : -1 );
    const diversion = Math.min(
        0.42,
        0.14 + Math.max( 0, -inwardVelocity ) * 0.32
    );
    parcel.vx += tangentX * side * diversion;
    parcel.vz += tangentZ * side * diversion;
    const divertedSpeed = Math.hypot( parcel.vx, parcel.vz );
    if ( divertedSpeed > incomingSpeed && divertedSpeed > 0 )
    {
        const scale = incomingSpeed / divertedSpeed;
        parcel.vx *= scale;
        parcel.vz *= scale;
    }
    parcel.contactResidence = ( parcel.contactResidence ?? 0 )
        + timeStep * ( 1 + Math.max( 0, -inwardVelocity ) * 0.28 );
    const tangentialSpeed = Math.abs(
        parcel.vx * tangentX + parcel.vz * tangentZ
    );
    parcel.contactTangentialTravel = ( parcel.contactTangentialTravel ?? 0 )
        + tangentialSpeed * timeStep;
    const settled = (
        parcel.contactResidence >= minimumResidence
            && parcel.contactTangentialTravel >= minimumTangentialTravel
            && resolved.drainEligible === true
    ) || parcel.contactResidence >= maximumResidence;
    if ( settled ) parcel.settledAtContact = true;
    return Object.freeze( {
        settled,
        inwardImpulse: Math.max( 0, -inwardVelocity ) * parcel.mass,
        residence: parcel.contactResidence,
        tangentialTravel: parcel.contactTangentialTravel,
        x: parcel.x,
        z: parcel.z,
        normalX: resolved.normalX,
        normalZ: resolved.normalZ
    } );
}

export function createSluiceGateLayer( {
    world,
    membrane,
    parameters,
    root = document,
    includeEnvironment = true,
    controlPrefix = '',
    moltenRenderOrder = 2,
    onGateLayoutChange = null,
    onSourceLayoutChange = null,
    onSourceEmission = null,
    getSourceHeatState = null,
    moltenContactBoundary: initialMoltenContactBoundary = null
} )
{
const { scene, renderer } = world;
const ownerDocument = root.ownerDocument ?? root;
const controlId = ( id ) => `${controlPrefix}${id}`;
const control = ( id ) => root.querySelector( `#${controlId( id )}` );
const membraneHeight = membrane.height;
const membraneGradient = membrane.gradient;
const createMembraneGeometry = membrane.createGeometry;
const deformMembrane = membrane.deform;
const hasOpening = typeof membrane.isInsideOpening === 'function';
if ( getSourceHeatState !== null && typeof getSourceHeatState !== 'function' )
{
    throw new TypeError( 'Source heat state must be supplied by a function.' );
}

const parcelCountElement = control( 'parcel-count' );
const interactionCountElement = control( 'interaction-count' );
const crossSourceCountElement = control( 'cross-source-count' );
const simulationTimeElement = control( 'simulation-time' );
const reconstructionTimeElement = control( 'reconstruction-time' );
const sourceKeyElement = control( 'source-key' );
const seedValueElement = control( 'seed-value' );
const reservoirCountElement = control( 'reservoir-count' );

const simulation = {
    fixedStep: 1 / 60,
    accumulator: 0,
    previousTime: 0,
    maximumParcels: 700,
    interactionRadius: 0.78,
    separationRadius: 0.16,
    receiverRadius: 0.34,
    parcels: [],
    lastStepMilliseconds: 0,
    lastInteractionCount: 0,
    lastCrossSourceInteractionCount: 0,
    lastReconstructionMilliseconds: 0,
    reconstructionAccumulator: 0,
    randomState: 0x2f6e2b1,
    statisticsElapsed: 0,
    elapsed: 0
};

function random()
{
    simulation.randomState ^= simulation.randomState << 13;
    simulation.randomState ^= simulation.randomState >>> 17;
    simulation.randomState ^= simulation.randomState << 5;
    return ( simulation.randomState >>> 0 ) / 4294967296;
}

const membraneGeometry = membrane.createTerrainCoreGeometry?.()
    ?? createMembraneGeometry( 180 );
const membraneMaterial = new THREE.MeshStandardMaterial( {
    color: 0x313538,
    metalness: 0.2,
    roughness: 0.72,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1
} );
const membraneSurface = new THREE.Mesh( membraneGeometry, membraneMaterial );
membraneSurface.name = 'Casting pit membrane surface';
const terrainApronGeometry = membrane.createTerrainApronGeometry?.() ?? null;
const terrainApron = terrainApronGeometry
    ? new THREE.Mesh( terrainApronGeometry, membraneMaterial )
    : null;
if ( terrainApron ) terrainApron.name = 'Casting terrain perimeter apron';
if ( includeEnvironment )
{
    if ( terrainApron ) scene.add( terrainApron );
    scene.add( membraneSurface );
}

const fieldCellCount = sluiceMoltenDomainDefaults.resolution
    * sluiceMoltenDomainDefaults.resolution;
const field = {
    resolution: sluiceMoltenDomainDefaults.resolution,
    radius: sluiceMoltenDomainDefaults.radius,
    size: sluiceMoltenDomainDefaults.size,
    density: new Float32Array( fieldCellCount ),
    heat: new Float32Array( fieldCellCount ),
    flowX: new Float32Array( fieldCellCount ),
    flowZ: new Float32Array( fieldCellCount ),
    densityScratch: new Float32Array( fieldCellCount ),
    heatScratch: new Float32Array( fieldCellCount ),
    flowXScratch: new Float32Array( fieldCellCount ),
    flowZScratch: new Float32Array( fieldCellCount ),
    textureData: new Float32Array( fieldCellCount * 4 ),
    contactMask: new Uint8Array( fieldCellCount ),
    contactNormalX: new Float32Array( fieldCellCount ),
    contactNormalZ: new Float32Array( fieldCellCount ),
    contactDistance: new Float32Array( fieldCellCount ),
    contactBoundaryRevision: Number.NaN,
    revision: 0
};
let moltenContactBoundary = initialMoltenContactBoundary;
const contactDiagnostics = {
    divertedParcelCount: 0,
    contactStepCount: 0,
    settledParcelCount: 0,
    settledMass: 0,
    divertedImpulse: 0
};

field.brushes = new Map();
for ( let radius = 2; radius <= 4; radius += 1 )
{
    const samples = [];
    let totalWeight = 0;
    const falloff = 1.7 / ( radius * radius );

    for ( let offsetY = -radius; offsetY <= radius; offsetY += 1 )
    {
        for ( let offsetX = -radius; offsetX <= radius; offsetX += 1 )
        {
            const distanceSquared = offsetX * offsetX + offsetY * offsetY;
            if ( distanceSquared > radius * radius ) continue;
            const weight = Math.exp( -distanceSquared * falloff );
            samples.push( { offsetX, offsetY, weight } );
            totalWeight += weight;
        }
    }

    samples.forEach( ( sample ) => { sample.weight /= totalWeight; } );
    field.brushes.set( radius, samples );
}

field.texture = new THREE.DataTexture(
    field.textureData,
    field.resolution,
    field.resolution,
    THREE.RGBAFormat,
    THREE.FloatType
);
field.texture.minFilter = THREE.LinearFilter;
field.texture.magFilter = THREE.LinearFilter;
field.texture.wrapS = THREE.ClampToEdgeWrapping;
field.texture.wrapT = THREE.ClampToEdgeWrapping;
field.texture.needsUpdate = true;

const surfaceMaskData = new Uint8Array( field.resolution * field.resolution );
const surfaceMaskTexture = new THREE.DataTexture(
    surfaceMaskData,
    field.resolution,
    field.resolution,
    THREE.RedFormat,
    THREE.UnsignedByteType
);
surfaceMaskTexture.minFilter = THREE.LinearFilter;
surfaceMaskTexture.magFilter = THREE.LinearFilter;
surfaceMaskTexture.wrapS = THREE.ClampToEdgeWrapping;
surfaceMaskTexture.wrapT = THREE.ClampToEdgeWrapping;

function updateSurfaceMask()
{
    if ( !hasOpening )
    {
        surfaceMaskData.fill( 255 );
        surfaceMaskTexture.needsUpdate = true;
        return;
    }
    for ( let y = 0; y < field.resolution; y += 1 )
    {
        const z = field.radius
            - y / ( field.resolution - 1 ) * field.size;
        for ( let x = 0; x < field.resolution; x += 1 )
        {
            const worldX = x / ( field.resolution - 1 ) * field.size
                - field.radius;
            surfaceMaskData[y * field.resolution + x] = hasOpening && membrane.isInsideOpening( worldX, z ) ? 0 : 255;
        }
    }
    surfaceMaskTexture.needsUpdate = true;
}

updateSurfaceMask();

const moltenGeometry = createMembraneGeometry(
    sluiceMoltenDomainDefaults.geometrySegments,
    { size: field.size }
);
const moltenMaterial = new THREE.ShaderMaterial( {
    transparent: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    uniforms: {
        moltenField: { value: field.texture },
        surfaceMask: { value: surfaceMaskTexture },
        intensity: { value: parameters.moltenIntensity },
        threshold: { value: parameters.threshold }
    },
    vertexShader: `
        uniform sampler2D moltenField;
        varying vec2 vUv;
        varying float vDensity;
        varying float vForgeEnergy;

        void main()
        {
            vUv = uv;
            vec4 molten = texture2D( moltenField, uv );
            vDensity = molten.r;
            float heatRatio = molten.g / max( molten.r, 0.001 );
            vForgeEnergy = smoothstep( 1.01, 1.32, heatRatio );
            vec3 displaced = position;
            displaced.y += 0.035
                + min( vDensity, 1.5 ) * 0.055
                + vForgeEnergy * 0.015;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( displaced, 1.0 );
        }
    `,
    fragmentShader: `
        uniform sampler2D moltenField;
        ${hasOpening ? 'uniform sampler2D surfaceMask;' : ''}
        uniform float intensity;
        uniform float threshold;
        varying vec2 vUv;
        varying float vDensity;
        varying float vForgeEnergy;

        float hash( vec2 point )
        {
            return fract( sin( dot( point, vec2( 127.1, 311.7 ) ) ) * 43758.5453 );
        }

        float noise( vec2 point )
        {
            vec2 cell = floor( point );
            vec2 local = fract( point );
            local = local * local * ( 3.0 - 2.0 * local );
            return mix(
                mix( hash( cell ), hash( cell + vec2( 1.0, 0.0 ) ), local.x ),
                mix( hash( cell + vec2( 0.0, 1.0 ) ), hash( cell + vec2( 1.0, 1.0 ) ), local.x ),
                local.y
            );
        }

        void main()
        {
            ${hasOpening ? 'if ( texture2D( surfaceMask, vUv ).r < 0.5 ) discard;' : ''}
            vec3 material = texture2D( moltenField, vUv ).rgb;
            if ( material.b > 0.5 ) discard;
            float density = material.r;
            float heat = clamp( material.g / max( density, 0.001 ), 0.0, 1.4 );
            float materialHeat = min( heat, 1.0 );
            float edgeNoise = noise( vUv * 92.0 + vec2( 4.3, 11.7 ) ) * 0.65
                + noise( vUv * 31.0 ) * 0.35;
            float localThreshold = threshold * mix( 0.72, 1.32, edgeNoise );
            float coverage = smoothstep( localThreshold, localThreshold + 0.16, density );
            vec2 perimeterPoint = vUv * 2.0 - 1.0;
            float perimeterAngle = atan( perimeterPoint.y, perimeterPoint.x );
            float perimeterNoise = noise( vec2(
                perimeterAngle * 1.7 + 8.2,
                perimeterAngle * 0.63 + 3.4
            ) );
            float perimeterLimit = mix(
                ${sluiceMoltenDomainDefaults.maskLimitMin.toFixed( 3 )},
                ${sluiceMoltenDomainDefaults.maskLimitMax.toFixed( 3 )},
                perimeterNoise
            );
            float perimeterCoverage = 1.0 - smoothstep(
                perimeterLimit - ${sluiceMoltenDomainDefaults.maskFadeWidth.toFixed( 3 )},
                perimeterLimit,
                length( perimeterPoint )
            );
            coverage *= perimeterCoverage;
            if ( coverage < 0.015 ) discard;

            float body = smoothstep( threshold, 0.85, density );
            float breakup = noise( vUv * 135.0 ) * 0.65 + noise( vUv * 48.0 + 9.7 ) * 0.35;
            float crust = smoothstep( 0.48, 0.82, breakup )
                * ( 1.0 - materialHeat * 0.55 )
                * ( 1.0 - vForgeEnergy * 0.2 );
            float core = smoothstep( 0.48, 1.5, density ) * smoothstep( 0.42, 0.95, materialHeat );
            float edge = clamp( length( vec2( dFdx( density ), dFdy( density ) ) ) * 2.5, 0.0, 1.0 );
            vec3 cooled = vec3( 0.055, 0.009, 0.004 );
            vec3 warm = vec3( 0.46, 0.038, 0.006 );
            vec3 hot = vec3( 0.95, 0.25, 0.018 );
            vec3 color = mix( cooled, warm, body * ( 0.32 + materialHeat * 0.48 ) );
            color = mix( color, hot, core * ( 0.48 + breakup * 0.2 ) );
            color = mix(
                color,
                hot * 1.06,
                vForgeEnergy * ( 0.06 + breakup * 0.08 )
            );
            color *= 1.0 + vForgeEnergy * ( 0.06 + breakup * 0.08 );
            color *= mix( 1.0, 0.36, crust );
            color *= mix( 1.0, 0.55, edge );
            color *= intensity * ( 0.72 + min( density, 1.4 ) * 0.2 );
            gl_FragColor = vec4( color, coverage * 0.94 );
        }
    `
} );
const moltenSurface = new THREE.Mesh( moltenGeometry, moltenMaterial );
moltenSurface.renderOrder = moltenRenderOrder;
scene.add( moltenSurface );

const diagnosticGeometry = createMembraneGeometry( membrane.diagnosticSegments ?? 32 );
const diagnosticMaterial = new THREE.MeshBasicMaterial( {
    color: 0x83949b,
    transparent: true,
    opacity: 0.36,
    wireframe: true,
    depthWrite: false
} );
const diagnostic = new THREE.Mesh( diagnosticGeometry, diagnosticMaterial );
diagnostic.visible = false;
diagnostic.renderOrder = 1;
if ( includeEnvironment ) scene.add( diagnostic );

let throatSurface = null;
let throatDiagnostic = null;
let historyGuides = null;
let alignmentGuides = null;

if ( includeEnvironment && typeof membrane.createThroatGeometry === 'function' )
{
    throatSurface = new THREE.Mesh(
        membrane.createThroatGeometry(),
        new THREE.MeshStandardMaterial( {
            color: 0x313538,
            metalness: 0.2,
            roughness: 0.72,
            side: THREE.FrontSide
        } )
    );
    scene.add( throatSurface );

    throatDiagnostic = new THREE.LineSegments(
        new THREE.WireframeGeometry( throatSurface.geometry ),
        new THREE.LineBasicMaterial( { color: 0x83949b, transparent: true, opacity: 0.36, depthWrite: false } )
    );
    throatDiagnostic.visible = false;
    throatDiagnostic.renderOrder = 1;
    scene.add( throatDiagnostic );

    if ( typeof membrane.createHistoryGuideGeometry === 'function' )
    {
        historyGuides = new THREE.LineSegments(
            membrane.createHistoryGuideGeometry(),
            new THREE.LineBasicMaterial( { color: 0xffb34e, transparent: true, opacity: 0.9, depthWrite: false } )
        );
        historyGuides.visible = false;
        historyGuides.renderOrder = 4;
        scene.add( historyGuides );
    }

    if ( typeof membrane.createAlignmentGuideGeometry === 'function' )
    {
        alignmentGuides = new THREE.LineSegments(
            membrane.createAlignmentGuideGeometry(),
            new THREE.LineBasicMaterial( { color: 0x5de1ff, transparent: true, opacity: 0.95, depthWrite: false } )
        );
        alignmentGuides.visible = false;
        alignmentGuides.renderOrder = 5;
        scene.add( alignmentGuides );
    }
}

const hemisphereLight = new THREE.HemisphereLight( 0x8795a1, 0x17110d, 1.25 );
if ( includeEnvironment ) scene.add( hemisphereLight );

const keyLight = new THREE.DirectionalLight( 0xffd3aa, 4 );
keyLight.position.set( -5, 9, 6 );
if ( includeEnvironment ) scene.add( keyLight );

const rimLight = new THREE.DirectionalLight( 0x6688aa, 1.5 );
rimLight.position.set( 7, 3, -6 );
if ( includeEnvironment ) scene.add( rimLight );

const receiver = new THREE.Mesh(
    new THREE.CircleGeometry( simulation.receiverRadius, 48 ).rotateX( -Math.PI / 2 ),
    new THREE.MeshBasicMaterial( { color: 0x020303, side: THREE.DoubleSide } )
);
if ( includeEnvironment && !hasOpening ) scene.add( receiver );

let sourceDefinitions = [];
let rimReservoir = [];

let gates = [];
const gateGroup = new THREE.Group();
gateGroup.visible = false;
scene.add( gateGroup );

function buildGateMeshes()
{
    gateGroup.traverse( ( object ) => {
        if ( object.isMesh )
        {
            object.geometry.dispose();
            object.material.dispose();
        }
    } );
    gateGroup.clear();

    gates.forEach( ( gate ) => {
        const material = new THREE.MeshStandardMaterial( {
            color: 0x35393a,
            metalness: 0.72,
            roughness: 0.48,
            emissive: 0x000000
        } );
        const bar = new THREE.Mesh( new THREE.BoxGeometry( 1.65, 0.24, 0.34 ), material );
        const postGeometry = new THREE.BoxGeometry( 0.22, 0.72, 0.46 );
        const firstPost = new THREE.Mesh( postGeometry, material );
        const secondPost = new THREE.Mesh( postGeometry, material );
        const group = new THREE.Group();
        group.add( bar, firstPost, secondPost );
        group.rotation.y = Math.PI / 2 - ( gate.angle + gate.outletBias * 0.45 );
        gate.group = group;
        gate.bar = bar;
        gate.material = material;
        gate.posts = [ firstPost, secondPost ];
        gateGroup.add( group );
    } );

    updateGateGeometry();
}

function updateGateGeometry()
{
    gates.forEach( ( gate ) => {
        const x = Math.cos( gate.angle ) * gate.radius;
        const z = Math.sin( gate.angle ) * gate.radius;
        const height = membraneHeight( x, z );
        gate.group.position.set( x, height + 0.12, z );
        gate.posts[0].position.set( -0.95, 0.25, 0 );
        gate.posts[1].position.set( 0.95, 0.25, 0 );
    } );
}

const sourceMarkerGeometry = new THREE.BufferGeometry();
const sourceMarkers = new THREE.LineSegments(
    sourceMarkerGeometry,
    new THREE.LineBasicMaterial( { vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false } )
);
sourceMarkers.renderOrder = 3;
sourceMarkers.visible = false;
scene.add( sourceMarkers );

function rebuildSourcePresentation()
{
    sourceKeyElement.replaceChildren();

    sourceDefinitions.forEach( ( source ) => {
        source.emissionAccumulator = random();
        source.colorObject = source.color;
        source.captured = 0;
        source.lost = 0;
    } );

    gates.forEach( ( gate ) => {

        const item = ownerDocument.createElement( 'li' );
        const swatch = ownerDocument.createElement( 'i' );
        swatch.style.setProperty( '--source-color', `#${gate.color.getHexString()}` );
        const label = ownerDocument.createElement( 'span' );
        label.textContent = gate.label;
        gate.resultElement = ownerDocument.createElement( 'output' );
        gate.resultElement.textContent = 'filling';
        item.append( swatch, label, gate.resultElement );
        sourceKeyElement.append( item );
    } );

    updateSourceMarkerGeometry();
}

function updateSourceMarkerGeometry()
{
    const positions = [];
    const colors = [];

    sourceDefinitions.forEach( ( source ) => {
        const [ x, z ] = source.position;
        const scale = 0.55;
        const endX = x + source.direction[0] * source.speedFactor * parameters.lavaVelocity * scale;
        const endZ = z + source.direction[1] * source.speedFactor * parameters.lavaVelocity * scale;
        positions.push( x, membraneHeight( x, z ) + 0.12, z );
        positions.push( endX, membraneHeight( endX, endZ ) + 0.12, endZ );
        for ( let vertex = 0; vertex < 2; vertex += 1 ) colors.push( source.color.r, source.color.g, source.color.b );
    } );

    sourceMarkerGeometry.setAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
    sourceMarkerGeometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
}

function regenerateSources()
{
    simulation.randomState = ( 0x2f6e2b1 ^ parameters.sourceSeed ^ parameters.streamCount ^ ( parameters.gateCount << 8 ) ) >>> 0;
    const generated = generateGateSystem(
        parameters.gateCount,
        parameters.streamCount,
        parameters.sourceSeed,
        parameters.sourceRadius
    );
    sourceDefinitions = generated.sources;
    gates = generated.generatedGates;
    buildGateMeshes();
    rebuildSourcePresentation();
    seedValueElement.value = parameters.sourceSeed.toString();
    if ( onGateLayoutChange ) onGateLayoutChange( gates );
    if ( onSourceLayoutChange )
    {
        onSourceLayoutChange( snapshotSluiceSourceLayout( {
            sources: sourceDefinitions,
            sourceSeed: parameters.sourceSeed,
            streamCount: parameters.streamCount,
            sourceRadius: parameters.sourceRadius
        } ) );
    }
}

const parcelPositions = new Float32Array( simulation.maximumParcels * 3 );
const parcelColors = new Float32Array( simulation.maximumParcels * 3 );
const parcelGeometry = new THREE.BufferGeometry();
parcelGeometry.setAttribute( 'position', new THREE.BufferAttribute( parcelPositions, 3 ).setUsage( THREE.DynamicDrawUsage ) );
parcelGeometry.setAttribute( 'color', new THREE.BufferAttribute( parcelColors, 3 ).setUsage( THREE.DynamicDrawUsage ) );
parcelGeometry.setDrawRange( 0, 0 );

const parcelMaterial = new THREE.PointsMaterial( {
    size: 0.14,
    sizeAttenuation: true,
    vertexColors: true,
    depthWrite: true
} );
const parcelPoints = new THREE.Points( parcelGeometry, parcelMaterial );
parcelPoints.renderOrder = 2;
parcelPoints.visible = false;
scene.add( parcelPoints );

const vectorPositions = new Float32Array( simulation.maximumParcels * 2 * 3 );
const vectorColors = new Float32Array( simulation.maximumParcels * 2 * 3 );
const vectorGeometry = new THREE.BufferGeometry();
vectorGeometry.setAttribute( 'position', new THREE.BufferAttribute( vectorPositions, 3 ).setUsage( THREE.DynamicDrawUsage ) );
vectorGeometry.setAttribute( 'color', new THREE.BufferAttribute( vectorColors, 3 ).setUsage( THREE.DynamicDrawUsage ) );
vectorGeometry.setDrawRange( 0, 0 );
const velocityVectors = new THREE.LineSegments(
    vectorGeometry,
    new THREE.LineBasicMaterial( { vertexColors: true, transparent: true, opacity: 0.72, depthWrite: false } )
);
velocityVectors.visible = false;
velocityVectors.renderOrder = 3;
scene.add( velocityVectors );

function spawnParcel( source, sourceIndex )
{
    if ( simulation.parcels.length >= simulation.maximumParcels )
    {
        return;
    }

    const speed = parameters.lavaVelocity * source.speedFactor;
    const perpendicularX = -source.direction[1];
    const perpendicularZ = source.direction[0];
    const positionJitter = ( random() - 0.5 ) * 0.5;
    const velocityJitter = ( random() - 0.5 ) * 0.34;
    const massVariation = random();

    const parcel = {
        x: source.position[0] + perpendicularX * positionJitter,
        z: source.position[1] + perpendicularZ * positionJitter,
        vx: source.direction[0] * speed + perpendicularX * velocityJitter,
        vz: source.direction[1] * speed + perpendicularZ * velocityJitter,
        mass: source.mass * THREE.MathUtils.lerp( 0.72, 1.02, massVariation ),
        footprint: THREE.MathUtils.lerp( 0.34, 0.52, massVariation ),
        temperature: THREE.MathUtils.lerp( 0.85, 1, random() ),
        age: 0,
        lifetime: THREE.MathUtils.lerp( 18, 24, random() ),
        sourceIndex,
        heldByGate: -1,
        storageSlot: -1,
        ax: 0,
        az: 0
    };
    simulation.parcels.push( parcel );
    if ( onSourceEmission )
    {
        onSourceEmission( snapshotSluiceSourceEmission( {
            source,
            sourceIndex,
            parcel,
            simulationTime: simulation.elapsed
        } ) );
    }
    return parcel;
}

function emitParcels( timeStep )
{
    sourceDefinitions.forEach( ( source, sourceIndex ) => {
        source.emissionAccumulator += parameters.emissionRate * source.cadence * timeStep / sourceDefinitions.length;

        while ( source.emissionAccumulator >= 1 )
        {
            spawnParcel( source, sourceIndex );
            source.emissionAccumulator -= 1;
        }
    } );
}

function setGateAppearance( gate, openness )
{
    gate.bar.position.y = 0.06 + openness * 0.82;
    const colors = {
        filling: [ 0x35393a, 0x000000 ],
        opening: [ 0x66513a, 0x2a1202 ],
        releasing: [ 0x806044, 0x5a1b02 ],
        closing: [ 0x514b43, 0x1b0901 ]
    };
    const [ color, emissive ] = colors[gate.state];
    gate.material.color.setHex( color );
    gate.material.emissive.setHex( emissive );
}

function angleDistance( first, second )
{
    return Math.abs( Math.atan2( Math.sin( first - second ), Math.cos( first - second ) ) );
}

function releaseParcel( gate )
{
    if ( rimReservoir.length === 0 ) return;

    let selectedIndex = 0;
    let selectedDistance = Infinity;
    rimReservoir.forEach( ( parcel, index ) => {
        const distance = angleDistance( parcel.reservoirAngle, gate.angle );
        if ( distance < selectedDistance )
        {
            selectedIndex = index;
            selectedDistance = distance;
        }
    } );
    if ( selectedDistance > 0.72 ) return false;

    const [ parcel ] = rimReservoir.splice( selectedIndex, 1 );

    const radialX = Math.cos( gate.angle );
    const radialZ = Math.sin( gate.angle );
    const tangentX = -radialZ;
    const tangentZ = radialX;
    const lateral = Math.sin( ( parcel.storageSlot + 1 ) * 2.399 ) * 0.28;
    parcel.x = radialX * ( gate.radius - 0.38 ) + tangentX * lateral;
    parcel.z = radialZ * ( gate.radius - 0.38 ) + tangentZ * lateral;
    const releaseSpeed = parameters.lavaVelocity * ( 0.8 + Math.min( rimReservoir.length * 0.002, 0.26 ) );
    const outletAngle = gate.angle + Math.PI + gate.outletBias;
    parcel.vx = Math.cos( outletAngle ) * releaseSpeed + tangentX * lateral * 0.18;
    parcel.vz = Math.sin( outletAngle ) * releaseSpeed + tangentZ * lateral * 0.18;
    parcel.heldByGate = -1;
    parcel.storageSlot = -1;
    parcel.age = 0;
    parcel.temperature = Math.max( parcel.temperature, 0.72 );
    return true;
}

function updateGates( timeStep )
{
    const cycle = parameters.gateCycle;
    const transition = 0.4;
    const openingDuration = Math.min( parameters.openingDuration, cycle - transition * 2 - 0.5 );
    const releaseStart = cycle - openingDuration - transition * 2;

    gates.forEach( ( gate ) => {
        const offset = gate.phaseBase * parameters.phaseSpread * cycle;
        const phase = ( ( simulation.elapsed + offset ) % cycle + cycle ) % cycle;
        let openness = 0;

        if ( phase < releaseStart )
        {
            gate.latchedOpen = false;
            gate.state = 'filling';
        }
        else
        {
            if ( rimReservoir.length >= parameters.releaseThreshold * gates.length ) gate.latchedOpen = true;

            if ( !gate.latchedOpen )
            {
                gate.state = 'filling';
            }
            else if ( phase < releaseStart + transition )
            {
                gate.state = 'opening';
                openness = ( phase - releaseStart ) / transition;
            }
            else if ( phase < cycle - transition )
            {
                gate.state = 'releasing';
                openness = 1;
                const releaseRate = parameters.emissionRate / gates.length * cycle / openingDuration * 1.18;
                gate.releaseAccumulator += releaseRate * timeStep;
                while ( gate.releaseAccumulator >= 1 && rimReservoir.length > 0 )
                {
                    if ( !releaseParcel( gate ) )
                    {
                        gate.releaseAccumulator = Math.min( gate.releaseAccumulator, 1 );
                        break;
                    }
                    gate.releaseAccumulator -= 1;
                }
            }
            else
            {
                gate.state = 'closing';
                openness = ( cycle - phase ) / transition;
            }
        }

        setGateAppearance( gate, openness );
    } );
}

function storeParcel( parcel )
{
    parcel.heldByGate = -2;
    parcel.storageSlot = rimReservoir.length;
    parcel.reservoirAngle = Math.atan2( parcel.z, parcel.x );
    parcel.reservoirRadius = THREE.MathUtils.lerp( 5.55, 6.35, random() );
    parcel.orbitRate = THREE.MathUtils.lerp( 0.18, 0.34, random() );
    parcel.vx = 0;
    parcel.vz = 0;
    rimReservoir.push( parcel );
}

function positionStoredParcel( parcel, timeStep )
{
    parcel.reservoirAngle += parcel.orbitRate * timeStep;
    const pulse = Math.sin( parcel.reservoirAngle * 3 + parcel.storageSlot * 1.7 ) * 0.12;
    const radius = parcel.reservoirRadius + pulse;
    parcel.x = Math.cos( parcel.reservoirAngle ) * radius;
    parcel.z = Math.sin( parcel.reservoirAngle ) * radius;
}

function tryCaptureAtReservoir( parcel, previousRadius )
{
    const radius = Math.hypot( parcel.x, parcel.z );
    if ( previousRadius > 6.55 && radius <= 6.55 ) storeParcel( parcel );
}

function hashKey( x, z )
{
    const size = simulation.interactionRadius;
    return `${Math.floor( x / size )},${Math.floor( z / size )}`;
}

function buildSpatialHash()
{
    const hash = new Map();

    simulation.parcels.forEach( ( parcel, index ) => {
        if ( parcel.heldByGate !== -1 ) return;
        const key = hashKey( parcel.x, parcel.z );
        if ( !hash.has( key ) )
        {
            hash.set( key, [] );
        }
        hash.get( key ).push( index );
    } );

    return hash;
}

function applySurfaceForces()
{
    simulation.parcels.forEach( ( parcel ) => {
        if ( parcel.heldByGate !== -1 )
        {
            parcel.ax = 0;
            parcel.az = 0;
            return;
        }
        const gradient = membraneGradient( parcel.x, parcel.z );
        const gradientSquared = gradient.x * gradient.x + gradient.z * gradient.z;
        parcel.ax = -parameters.gravity * gradient.x / ( 1 + gradientSquared );
        parcel.az = -parameters.gravity * gradient.z / ( 1 + gradientSquared );
    } );
}

function applyPairInteraction( first, second )
{
    if ( first.heldByGate !== -1 || second.heldByGate !== -1 ) return;
    const dx = second.x - first.x;
    const dz = second.z - first.z;
    const distanceSquared = dx * dx + dz * dz;
    const radius = simulation.interactionRadius;

    if ( distanceSquared <= 0.000001 || distanceSquared >= radius * radius )
    {
        return;
    }

    const distance = Math.sqrt( distanceSquared );
    const nx = dx / distance;
    const nz = dz / distance;
    const proximity = 1 - distance / radius;
    const strength = parameters.interaction;
    simulation.lastInteractionCount += 1;
    if ( first.sourceIndex !== second.sourceIndex )
    {
        simulation.lastCrossSourceInteractionCount += 1;
    }
    const relativeVx = second.vx - first.vx;
    const relativeVz = second.vz - first.vz;
    const viscosity = strength * proximity * 1.8;
    first.ax += relativeVx * viscosity / first.mass;
    first.az += relativeVz * viscosity / first.mass;
    second.ax -= relativeVx * viscosity / second.mass;
    second.az -= relativeVz * viscosity / second.mass;

    const sharedRestDistance = simulation.separationRadius * Math.sqrt( ( first.mass + second.mass ) * 0.5 );
    let radialForce;

    if ( distance < sharedRestDistance )
    {
        radialForce = -strength * 11 * ( sharedRestDistance - distance ) / sharedRestDistance;
    }
    else
    {
        radialForce = strength * 0.5 * proximity * proximity;
    }

    first.ax += nx * radialForce / first.mass;
    first.az += nz * radialForce / first.mass;
    second.ax -= nx * radialForce / second.mass;
    second.az -= nz * radialForce / second.mass;
}

function applyNeighbourForces( spatialHash )
{
    const cellSize = simulation.interactionRadius;

    simulation.parcels.forEach( ( parcel, parcelIndex ) => {
        const cellX = Math.floor( parcel.x / cellSize );
        const cellZ = Math.floor( parcel.z / cellSize );

        for ( let offsetX = -1; offsetX <= 1; offsetX += 1 )
        {
            for ( let offsetZ = -1; offsetZ <= 1; offsetZ += 1 )
            {
                const neighbours = spatialHash.get( `${cellX + offsetX},${cellZ + offsetZ}` );
                if ( !neighbours )
                {
                    continue;
                }

                neighbours.forEach( ( neighbourIndex ) => {
                    if ( neighbourIndex > parcelIndex )
                    {
                        applyPairInteraction( parcel, simulation.parcels[neighbourIndex] );
                    }
                } );
            }
        }
    } );
}

function depositAt( x, z, amount, temperature, velocityX, velocityZ, footprint )
{
    const normalizedX = ( x + field.radius ) / field.size;
    const normalizedY = ( field.radius - z ) / field.size;
    const centerX = Math.round( normalizedX * ( field.resolution - 1 ) );
    const centerY = Math.round( normalizedY * ( field.resolution - 1 ) );

    if ( centerX < 0 || centerX >= field.resolution || centerY < 0 || centerY >= field.resolution )
    {
        return;
    }

    const centerIndex = centerY * field.resolution + centerX;
    const localDensity = field.density[centerIndex];
    const speed = Math.hypot( velocityX, velocityZ );
    const materialVariation = Math.sin( x * 1.31 + z * 0.73 ) * 0.5
        + Math.sin( x * 0.47 - z * 1.63 + 1.8 ) * 0.32;
    const width = 2 + ( 1 - Math.min( speed / 3.2, 1 ) ) * 0.75
        + Math.min( Math.sqrt( localDensity ) * 0.55, 0.8 )
        + ( footprint - 1 ) * 0.8
        + materialVariation * 0.72;
    const brushRadius = THREE.MathUtils.clamp( Math.round( width ), 2, 4 );
    const brush = field.brushes.get( brushRadius );

    for ( const sample of brush )
    {
        const pixelY = centerY + sample.offsetY;
        if ( pixelY < 0 || pixelY >= field.resolution ) continue;
        const pixelX = centerX + sample.offsetX;
        if ( pixelX < 0 || pixelX >= field.resolution ) continue;

        const index = pixelY * field.resolution + pixelX;
        if ( field.contactMask[index] ) continue;
        const contribution = amount * sample.weight * 6.15;
        field.density[index] = Math.min( 3, field.density[index] + contribution );
        field.heat[index] = Math.min( 3, field.heat[index] + contribution * temperature );
        field.flowX[index] += contribution * velocityX;
        field.flowZ[index] += contribution * velocityZ;
    }
}

function depositTrail( parcel, previousX, previousZ, timeStep )
{
    const distance = Math.hypot( parcel.x - previousX, parcel.z - previousZ );
    const spacing = field.size / field.resolution * 0.7;
    const samples = Math.max( 1, Math.ceil( distance / spacing ) );
    const amount = parameters.deposition * parcel.mass * timeStep * 0.9 / samples;

    for ( let sample = 0; sample <= samples; sample += 1 )
    {
        const ratio = sample / samples;
        depositAt(
            THREE.MathUtils.lerp( previousX, parcel.x, ratio ),
            THREE.MathUtils.lerp( previousZ, parcel.z, ratio ),
            amount,
            parcel.temperature,
            parcel.vx,
            parcel.vz,
            parcel.footprint
        );
    }
}

function sampleField( values, x, y )
{
    const maximum = field.resolution - 1;
    const clampedX = THREE.MathUtils.clamp( x, 0, maximum );
    const clampedY = THREE.MathUtils.clamp( y, 0, maximum );
    const x0 = Math.floor( clampedX );
    const y0 = Math.floor( clampedY );
    const x1 = Math.min( x0 + 1, maximum );
    const y1 = Math.min( y0 + 1, maximum );
    const fractionX = clampedX - x0;
    const fractionY = clampedY - y0;
    const lower = THREE.MathUtils.lerp( values[y0 * field.resolution + x0], values[y0 * field.resolution + x1], fractionX );
    const upper = THREE.MathUtils.lerp( values[y1 * field.resolution + x0], values[y1 * field.resolution + x1], fractionX );
    return THREE.MathUtils.lerp( lower, upper, fractionY );
}

function smoothRange( lower, upper, value )
{
    const progress = THREE.MathUtils.clamp(
        ( value - lower ) / Math.max( upper - lower, Number.EPSILON ),
        0,
        1
    );
    return progress * progress * ( 3 - 2 * progress );
}

function writeSourceHeatPresentation()
{
    const state = getSourceHeatState?.();
    if ( !state?.visible || state.mode === 'off'
        || !Array.isArray( state.sources ) )
    {
        return;
    }

    const heatIntensity = Number( state.heatIntensity );
    const heatReach = Number( state.heatReach );
    const phase = Number.isFinite( state.surfacePhase )
        ? state.surfacePhase
        : 0;
    if ( !Number.isFinite( heatIntensity ) || heatIntensity <= 0
        || !Number.isFinite( heatReach ) || heatReach <= 0 )
    {
        return;
    }

    const maximum = field.resolution - 1;
    const cellSize = field.size / maximum;
    for ( const source of state.sources )
    {
        if ( source?.manifested !== true ) continue;
        const sourceX = Number( source.position?.[0] );
        const sourceZ = Number( source.position?.[1] );
        const directionX = Number( source.direction?.[0] );
        const directionZ = Number( source.direction?.[1] );
        if ( ![
            sourceX,
            sourceZ,
            directionX,
            directionZ
        ].every( Number.isFinite ) )
        {
            continue;
        }

        const pressure = THREE.MathUtils.clamp(
            Number( source.pressure ) || 0,
            0,
            1
        );
        const reach = heatReach * ( 0.9 + pressure * 0.2 );
        const gradientExtent = reach * 1.55;
        const halfWidth = 0.48 + pressure * 0.1;
        const lateralExtent = halfWidth * 2.4;
        const rearExtent = Math.min( 0.8, reach * 0.35 );
        const endX = sourceX + directionX * gradientExtent;
        const endZ = sourceZ + directionZ * gradientExtent;
        const margin = Math.max( lateralExtent, rearExtent * 2 )
            + cellSize * 2;
        const minimumWorldX = Math.min( sourceX, endX ) - margin;
        const maximumWorldX = Math.max( sourceX, endX ) + margin;
        const minimumWorldZ = Math.min( sourceZ, endZ ) - margin;
        const maximumWorldZ = Math.max( sourceZ, endZ ) + margin;
        const minimumX = THREE.MathUtils.clamp(
            Math.floor(
                ( minimumWorldX + field.radius ) / field.size * maximum
            ),
            0,
            maximum
        );
        const maximumX = THREE.MathUtils.clamp(
            Math.ceil(
                ( maximumWorldX + field.radius ) / field.size * maximum
            ),
            0,
            maximum
        );
        const minimumY = THREE.MathUtils.clamp(
            Math.floor(
                ( field.radius - maximumWorldZ ) / field.size * maximum
            ),
            0,
            maximum
        );
        const maximumY = THREE.MathUtils.clamp(
            Math.ceil(
                ( field.radius - minimumWorldZ ) / field.size * maximum
            ),
            0,
            maximum
        );

        for ( let y = minimumY; y <= maximumY; y += 1 )
        {
            const worldZ = field.radius - y / maximum * field.size;
            for ( let x = minimumX; x <= maximumX; x += 1 )
            {
                const index = y * field.resolution + x;
                if ( field.contactMask[index] ) continue;
                const textureOffset = index * 4;
                const density = field.textureData[textureOffset];
                if ( density <= Number.EPSILON ) continue;

                const worldX = x / maximum * field.size - field.radius;
                const offsetX = worldX - sourceX;
                const offsetZ = worldZ - sourceZ;
                const along = offsetX * directionX + offsetZ * directionZ;
                const across = -offsetX * directionZ + offsetZ * directionX;
                if ( along < -rearExtent * 2
                    || along > gradientExtent
                    || Math.abs( across ) > lateralExtent )
                {
                    continue;
                }

                const downstreamProgress = Math.max( along, 0 ) / reach;
                const rearProgress = Math.max( -along, 0 ) / rearExtent;
                const lateralProgress = across / halfWidth;
                const thermalFalloff = Math.exp(
                    -3 * downstreamProgress * downstreamProgress
                    -3 * rearProgress * rearProgress
                    -2.6 * lateralProgress * lateralProgress
                );
                const pulse = 1 + Math.sin(
                    phase * 0.75
                        - downstreamProgress * 1.2
                        + source.sourceIndex * 1.37
                ) * 0.015;
                const sourceEnergy = thermalFalloff
                    * heatIntensity
                    * ( 0.82 + pressure * 0.28 )
                    * pulse;
                if ( sourceEnergy <= 0.0005 ) continue;
                const thermalRatio = 1 + sourceEnergy * 0.3;
                field.textureData[textureOffset + 1] = Math.max(
                    field.textureData[textureOffset + 1],
                    density * thermalRatio
                );
            }
        }
    }
}

function writeMoltenTexture()
{
    for ( let index = 0; index < field.density.length; index += 1 )
    {
        const textureOffset = index * 4;
        field.textureData[textureOffset] = field.density[index];
        field.textureData[textureOffset + 1] = field.heat[index];
        field.textureData[textureOffset + 2] = field.contactMask[index];
        field.textureData[textureOffset + 3] = 1;
    }
    writeSourceHeatPresentation();
    field.texture.needsUpdate = true;
}

function sampleMoltenPresentation( x, z )
{
    const fieldX = THREE.MathUtils.clamp(
        ( x + field.radius ) / field.size * ( field.resolution - 1 ),
        0,
        field.resolution - 1
    );
    const fieldY = THREE.MathUtils.clamp(
        ( field.radius - z ) / field.size * ( field.resolution - 1 ),
        0,
        field.resolution - 1
    );
    const x0 = Math.floor( fieldX );
    const y0 = Math.floor( fieldY );
    const x1 = Math.min( x0 + 1, field.resolution - 1 );
    const y1 = Math.min( y0 + 1, field.resolution - 1 );
    const fractionX = fieldX - x0;
    const fractionY = fieldY - y0;
    const channel = ( channelIndex ) => {
        const first = field.textureData[( y0 * field.resolution + x0 ) * 4 + channelIndex];
        const second = field.textureData[( y0 * field.resolution + x1 ) * 4 + channelIndex];
        const third = field.textureData[( y1 * field.resolution + x0 ) * 4 + channelIndex];
        const fourth = field.textureData[( y1 * field.resolution + x1 ) * 4 + channelIndex];
        return THREE.MathUtils.lerp(
            THREE.MathUtils.lerp( first, second, fractionX ),
            THREE.MathUtils.lerp( third, fourth, fractionX ),
            fractionY
        );
    };
    const density = channel( 0 );
    const heatMass = channel( 1 );
    return Object.freeze( {
        density,
        heat: THREE.MathUtils.clamp(
            heatMass / Math.max( density, 0.001 ),
            0,
            1
        )
    } );
}

function refreshContactMask( force = false )
{
    const boundaryRevision = moltenContactBoundary?.revision ?? -1;
    if ( !force && Object.is( boundaryRevision, field.contactBoundaryRevision ) ) return;
    field.contactBoundaryRevision = boundaryRevision;
    field.contactMask.fill( 0 );
    field.contactNormalX.fill( 0 );
    field.contactNormalZ.fill( 0 );
    field.contactDistance.fill( Number.POSITIVE_INFINITY );
    if ( moltenContactBoundary && typeof moltenContactBoundary.sample === 'function' )
    {
        const maximum = field.resolution - 1;
        const bounds = moltenContactBoundary.bounds;
        if ( bounds === null )
        {
            writeMoltenTexture();
            return;
        }
        const margin = 3;
        const minimumX = bounds
            ? THREE.MathUtils.clamp(
                Math.floor(
                    ( bounds.minX + field.radius )
                        / field.size
                        * maximum
                ) - margin,
                0,
                maximum
            )
            : 0;
        const maximumX = bounds
            ? THREE.MathUtils.clamp(
                Math.ceil(
                    ( bounds.maxX + field.radius )
                        / field.size
                        * maximum
                ) + margin,
                0,
                maximum
            )
            : maximum;
        const minimumY = bounds
            ? THREE.MathUtils.clamp(
                Math.floor(
                    ( field.radius - bounds.maxZ )
                        / field.size
                        * maximum
                ) - margin,
                0,
                maximum
            )
            : 0;
        const maximumY = bounds
            ? THREE.MathUtils.clamp(
                Math.ceil(
                    ( field.radius - bounds.minZ )
                        / field.size
                        * maximum
                ) + margin,
                0,
                maximum
            )
            : maximum;
        for ( let y = minimumY; y <= maximumY; y += 1 )
        {
            const z = field.radius - y / maximum * field.size;
            for ( let x = minimumX; x <= maximumX; x += 1 )
            {
                const worldX = x / maximum * field.size - field.radius;
                const index = y * field.resolution + x;
                const sample = moltenContactBoundary.sample( worldX, z );
                if ( !Number.isFinite( sample?.signedDistance ) ) continue;
                field.contactDistance[index] = sample.signedDistance;
                field.contactNormalX[index] = sample.normalX;
                field.contactNormalZ[index] = sample.normalZ;
                field.contactMask[index] = sample.signedDistance <= 0 ? 1 : 0;
            }
        }
    }
    writeMoltenTexture();
}

function isContactBlockedAt( x, y )
{
    const maximum = field.resolution - 1;
    const column = Math.round( THREE.MathUtils.clamp( x, 0, maximum ) );
    const row = Math.round( THREE.MathUtils.clamp( y, 0, maximum ) );
    return field.contactMask[row * field.resolution + column] === 1;
}

function neighbouringAverage( values, first, second, third, fourth, fallback )
{
    let total = 0;
    let count = 0;
    if ( !field.contactMask[first] )
    {
        total += values[first];
        count += 1;
    }
    if ( !field.contactMask[second] )
    {
        total += values[second];
        count += 1;
    }
    if ( !field.contactMask[third] )
    {
        total += values[third];
        count += 1;
    }
    if ( !field.contactMask[fourth] )
    {
        total += values[fourth];
        count += 1;
    }
    return count > 0 ? total / count : fallback;
}

function sampleMoltenState( x, z )
{
    const fieldX = ( x + field.radius )
        / field.size
        * ( field.resolution - 1 );
    const fieldY = ( field.radius - z )
        / field.size
        * ( field.resolution - 1 );
    const density = sampleField( field.density, fieldX, fieldY );
    const heatMass = sampleField( field.heat, fieldX, fieldY );
    return Object.freeze( {
        density,
        heat: THREE.MathUtils.clamp( heatMass / Math.max( density, 0.001 ), 0, 1 ),
        flowX: sampleField( field.flowX, fieldX, fieldY ) / Math.max( density, 0.03 ),
        flowZ: sampleField( field.flowZ, fieldX, fieldY ) / Math.max( density, 0.03 ),
        revision: field.revision
    } );
}

function updateMoltenField( timeStep )
{
    const start = performance.now();
    refreshContactMask();
    const resolution = field.resolution;
    const densityDecay = Math.exp( -timeStep / parameters.persistence );
    const heatDecay = Math.exp( -timeStep / ( parameters.persistence * 0.62 ) );
    const spread = Math.min( 0.12, timeStep * 2.2 );

    for ( let y = 0; y < resolution; y += 1 )
    {
        for ( let x = 0; x < resolution; x += 1 )
        {
            const index = y * resolution + x;
            if ( field.contactMask[index] )
            {
                field.densityScratch[index] = 0;
                field.heatScratch[index] = 0;
                field.flowXScratch[index] = 0;
                field.flowZScratch[index] = 0;
                continue;
            }
            const left = x > 0 ? index - 1 : index;
            const right = x < resolution - 1 ? index + 1 : index;
            const below = y > 0 ? index - resolution : index;
            const above = y < resolution - 1 ? index + resolution : index;
            const density = field.density[index];
            const velocityX = field.flowX[index] / Math.max( density, 0.03 );
            const velocityZ = field.flowZ[index] / Math.max( density, 0.03 );
            const pixelScale = resolution / field.size;
            const backtraceX = x - velocityX * timeStep * pixelScale * 0.58;
            const backtraceY = y + velocityZ * timeStep * pixelScale * 0.58;
            const blockedBacktrace = isContactBlockedAt( backtraceX, backtraceY );
            const advectedDensity = blockedBacktrace
                ? density
                : sampleField( field.density, backtraceX, backtraceY );
            const advectedHeat = blockedBacktrace
                ? field.heat[index]
                : sampleField( field.heat, backtraceX, backtraceY );
            const densityAverage = neighbouringAverage(
                field.density, left, right, below, above, density
            );
            const heatAverage = neighbouringAverage(
                field.heat, left, right, below, above, field.heat[index]
            );
            const flowXAverage = neighbouringAverage(
                field.flowX, left, right, below, above, field.flowX[index]
            );
            const flowZAverage = neighbouringAverage(
                field.flowZ, left, right, below, above, field.flowZ[index]
            );
            field.densityScratch[index] = THREE.MathUtils.lerp( advectedDensity, densityAverage, spread ) * densityDecay;
            field.heatScratch[index] = THREE.MathUtils.lerp( advectedHeat, heatAverage, spread * 1.25 ) * heatDecay;
            let nextFlowX = THREE.MathUtils.lerp( field.flowX[index], flowXAverage, spread ) * densityDecay * 0.92;
            let nextFlowZ = THREE.MathUtils.lerp( field.flowZ[index], flowZAverage, spread ) * densityDecay * 0.92;
            if ( field.contactDistance[index]
                < field.size / resolution * 2.5 )
            {
                const inward = nextFlowX * field.contactNormalX[index]
                    + nextFlowZ * field.contactNormalZ[index];
                if ( inward < 0 )
                {
                    nextFlowX -= field.contactNormalX[index] * inward;
                    nextFlowZ -= field.contactNormalZ[index] * inward;
                }
            }
            field.flowXScratch[index] = nextFlowX;
            field.flowZScratch[index] = nextFlowZ;
        }
    }

    [ field.density, field.densityScratch ] = [ field.densityScratch, field.density ];
    [ field.heat, field.heatScratch ] = [ field.heatScratch, field.heat ];
    [ field.flowX, field.flowXScratch ] = [ field.flowXScratch, field.flowX ];
    [ field.flowZ, field.flowZScratch ] = [ field.flowZScratch, field.flowZ ];

    field.revision += 1;
    writeMoltenTexture();
    simulation.lastReconstructionMilliseconds = performance.now() - start;
}

function clearMoltenField()
{
    field.density.fill( 0 );
    field.heat.fill( 0 );
    field.densityScratch.fill( 0 );
    field.heatScratch.fill( 0 );
    field.flowX.fill( 0 );
    field.flowZ.fill( 0 );
    field.flowXScratch.fill( 0 );
    field.flowZScratch.fill( 0 );
    field.revision += 1;
    writeMoltenTexture();
    simulation.reconstructionAccumulator = 0;
}

function integrateParcels( timeStep )
{
    simulation.parcels.forEach( ( parcel ) => {
        const previousX = parcel.x;
        const previousZ = parcel.z;

        if ( parcel.heldByGate !== -1 )
        {
            positionStoredParcel( parcel, timeStep );
            parcel.temperature = Math.max( 0.58, parcel.temperature - timeStep * 0.006 );
            depositTrail( parcel, previousX, previousZ, timeStep * 0.7 );
            return;
        }

        const radiusBeforeIntegration = Math.hypot( parcel.x, parcel.z );
        const localDrag = radiusBeforeIntegration > 6.55 ? parameters.drag * 0.08 : parameters.drag;
        const dragFactor = Math.exp( -localDrag * timeStep );
        parcel.vx = ( parcel.vx + parcel.ax * timeStep ) * dragFactor;
        parcel.vz = ( parcel.vz + parcel.az * timeStep ) * dragFactor;

        const speed = Math.hypot( parcel.vx, parcel.vz );
        if ( speed > 4.5 )
        {
            parcel.vx *= 4.5 / speed;
            parcel.vz *= 4.5 / speed;
        }

        parcel.x += parcel.vx * timeStep;
        parcel.z += parcel.vz * timeStep;
        parcel.temperature = Math.max( 0, parcel.temperature - timeStep * 0.012 );
        parcel.age += timeStep;
        const contact = resolveMoltenBoundaryContact( {
            parcel,
            previousX,
            previousZ,
            boundary: moltenContactBoundary,
            timeStep
        } );
        if ( contact )
        {
            contactDiagnostics.contactStepCount += 1;
            contactDiagnostics.divertedImpulse += contact.inwardImpulse;
            if ( !parcel.hasContactedBoundary )
            {
                parcel.hasContactedBoundary = true;
                contactDiagnostics.divertedParcelCount += 1;
            }
            if ( contact.settled && !parcel.contactSettlementCounted )
            {
                parcel.contactSettlementCounted = true;
                contactDiagnostics.settledParcelCount += 1;
                contactDiagnostics.settledMass += parcel.mass;
            }
        }
        tryCaptureAtReservoir( parcel, radiusBeforeIntegration );
        depositTrail( parcel, previousX, previousZ, timeStep );
        if ( parcel.heldByGate === -1 && hasOpening )
        {
            parcel.enteredOpening = membrane.crossesOpening( previousX, previousZ, parcel.x, parcel.z );
        }
    } );

    simulation.parcels = simulation.parcels.filter( ( parcel ) => {
        if ( parcel.heldByGate !== -1 ) return true;
        const radius = Math.hypot( parcel.x, parcel.z );
        const source = sourceDefinitions[parcel.sourceIndex];

        if (
            parcel.settledAtContact
                || parcel.enteredOpening
                || ( !hasOpening && radius <= simulation.receiverRadius )
        )
        {
            source.captured += 1;
            return false;
        }

        const outerCullRadius = Math.max( 17, parameters.sourceRadius + 2 );
        if ( radius >= outerCullRadius
            || parcel.age >= parcel.lifetime
            || parcel.temperature <= 0.1 )
        {
            source.lost += 1;
            return false;
        }

        return true;
    } );
}

function stepSimulation( timeStep )
{
    const start = performance.now();
    refreshContactMask();
    simulation.lastInteractionCount = 0;
    simulation.lastCrossSourceInteractionCount = 0;
    simulation.elapsed += timeStep;
    updateGates( timeStep );
    emitParcels( timeStep );
    applySurfaceForces();
    applyNeighbourForces( buildSpatialHash() );
    integrateParcels( timeStep );
    simulation.reconstructionAccumulator += timeStep;
    if ( simulation.reconstructionAccumulator >= 1 / 30 )
    {
        updateMoltenField( simulation.reconstructionAccumulator );
        simulation.reconstructionAccumulator = 0;
    }
    simulation.lastStepMilliseconds = performance.now() - start;
}

function updateDiagnosticGeometry()
{
    simulation.parcels.forEach( ( parcel, index ) => {
        const sourceColor = sourceDefinitions[parcel.sourceIndex].colorObject;
        const height = membraneHeight( parcel.x, parcel.z ) + 0.08;
        const positionOffset = index * 3;

        parcelPositions[positionOffset] = parcel.x;
        parcelPositions[positionOffset + 1] = height;
        parcelPositions[positionOffset + 2] = parcel.z;
        parcelColors[positionOffset] = sourceColor.r;
        parcelColors[positionOffset + 1] = sourceColor.g;
        parcelColors[positionOffset + 2] = sourceColor.b;

        const vectorOffset = index * 6;
        const vectorEndX = parcel.x + parcel.vx * 0.16;
        const vectorEndZ = parcel.z + parcel.vz * 0.16;
        vectorPositions[vectorOffset] = parcel.x;
        vectorPositions[vectorOffset + 1] = height + 0.02;
        vectorPositions[vectorOffset + 2] = parcel.z;
        vectorPositions[vectorOffset + 3] = vectorEndX;
        vectorPositions[vectorOffset + 4] = membraneHeight( vectorEndX, vectorEndZ ) + 0.1;
        vectorPositions[vectorOffset + 5] = vectorEndZ;

        for ( let component = 0; component < 2; component += 1 )
        {
            const colorOffset = vectorOffset + component * 3;
            vectorColors[colorOffset] = sourceColor.r;
            vectorColors[colorOffset + 1] = sourceColor.g;
            vectorColors[colorOffset + 2] = sourceColor.b;
        }
    } );

    parcelGeometry.attributes.position.needsUpdate = true;
    parcelGeometry.attributes.color.needsUpdate = true;
    parcelGeometry.setDrawRange( 0, simulation.parcels.length );
    vectorGeometry.attributes.position.needsUpdate = true;
    vectorGeometry.attributes.color.needsUpdate = true;
    vectorGeometry.setDrawRange( 0, simulation.parcels.length * 2 );
}

function resetParcels()
{
    simulation.parcels = [];
    rimReservoir = [];
    simulation.accumulator = 0;
    simulation.elapsed = 0;
    contactDiagnostics.divertedParcelCount = 0;
    contactDiagnostics.contactStepCount = 0;
    contactDiagnostics.settledParcelCount = 0;
    contactDiagnostics.settledMass = 0;
    contactDiagnostics.divertedImpulse = 0;
    simulation.randomState = ( 0x2f6e2b1 ^ parameters.sourceSeed ^ parameters.streamCount ^ ( parameters.gateCount << 8 ) ) >>> 0;
    sourceDefinitions.forEach( ( source ) => {
        source.emissionAccumulator = random();
        source.captured = 0;
        source.lost = 0;
    } );
    gates.forEach( ( gate ) => {
        gate.state = 'filling';
        gate.latchedOpen = false;
        gate.releaseAccumulator = 0;
        gate.resultElement.value = 'filling';
        setGateAppearance( gate, 0 );
    } );
    clearMoltenField();
    updateDiagnosticGeometry();
}

function updateSurface()
{
    deformMembrane( membraneGeometry );
    if ( terrainApronGeometry ) deformMembrane( terrainApronGeometry );
    deformMembrane( moltenGeometry );
    deformMembrane( diagnosticGeometry );
    if ( receiver.parent ) receiver.position.y = membraneHeight( 0, 0 ) + 0.04;
    updateSurfaceMask();
    if ( throatSurface )
    {
        throatSurface.geometry.dispose();
        throatSurface.geometry = membrane.createThroatGeometry();
        throatDiagnostic.geometry.dispose();
        throatDiagnostic.geometry = new THREE.WireframeGeometry( throatSurface.geometry );
        if ( historyGuides )
        {
            historyGuides.geometry.dispose();
            historyGuides.geometry = membrane.createHistoryGuideGeometry();
        }
        if ( alignmentGuides )
        {
            alignmentGuides.geometry.dispose();
            alignmentGuides.geometry = membrane.createAlignmentGuideGeometry();
        }
    }
    updateGateGeometry();
    updateSourceMarkerGeometry();
    updateDiagnosticGeometry();
}

const connectSlider = ( inputId, outputId, onInput, decimals = 2 ) => bindRangeControl(
    root,
    controlId( inputId ),
    controlId( outputId ),
    onInput,
    decimals
);

connectSlider( 'depth', 'depth-value', ( value ) => { parameters.depth = value; updateSurface(); } );
connectSlider( 'width', 'width-value', ( value ) => { parameters.width = value; updateSurface(); } );
connectSlider( 'key-light', 'key-light-value', ( value ) => { keyLight.intensity = value; } );
connectSlider( 'exposure', 'exposure-value', ( value ) => { renderer.toneMappingExposure = value; } );
connectSlider( 'emission-rate', 'emission-rate-value', ( value ) => { parameters.emissionRate = value; }, 0 );
connectSlider( 'gate-count', 'gate-count-value', ( value ) => {
    parameters.gateCount = value;
    regenerateSources();
    resetParcels();
}, 0 );
connectSlider( 'stream-count', 'stream-count-value', ( value ) => {
    parameters.streamCount = value;
    regenerateSources();
    resetParcels();
}, 0 );
connectSlider( 'source-radius', 'source-radius-value', ( value ) => {
    parameters.sourceRadius = value;
    regenerateSources();
    resetParcels();
}, 2 );
connectSlider( 'lava-velocity', 'lava-velocity-value', ( value ) => {
    const velocityScale = value / parameters.lavaVelocity;
    simulation.parcels.forEach( ( parcel ) => {
        if ( parcel.heldByGate !== -1 ) return;
        parcel.vx *= velocityScale;
        parcel.vz *= velocityScale;
    } );
    parameters.lavaVelocity = value;
    updateSourceMarkerGeometry();
}, 2 );
connectSlider( 'gate-cycle', 'gate-cycle-value', ( value ) => { parameters.gateCycle = value; resetParcels(); } );
connectSlider( 'phase-spread', 'phase-spread-value', ( value ) => { parameters.phaseSpread = value; resetParcels(); } );
connectSlider( 'opening-duration', 'opening-duration-value', ( value ) => { parameters.openingDuration = value; resetParcels(); } );
connectSlider( 'release-threshold', 'release-threshold-value', ( value ) => { parameters.releaseThreshold = value; resetParcels(); }, 0 );
connectSlider( 'gravity', 'gravity-value', ( value ) => { parameters.gravity = value; } );
connectSlider( 'drag', 'drag-value', ( value ) => { parameters.drag = value; } );
connectSlider( 'interaction', 'interaction-value', ( value ) => { parameters.interaction = value; } );
connectSlider( 'persistence', 'persistence-value', ( value ) => { parameters.persistence = value; } );
connectSlider( 'deposition', 'deposition-value', ( value ) => { parameters.deposition = value; } );
connectSlider( 'molten-intensity', 'molten-intensity-value', ( value ) => {
    parameters.moltenIntensity = value;
    moltenMaterial.uniforms.intensity.value = value;
} );
connectSlider( 'threshold', 'threshold-value', ( value ) => {
    parameters.threshold = value;
    moltenMaterial.uniforms.threshold.value = value;
} );

control( 'diagnostic' ).addEventListener( 'change', ( event ) => {
    diagnostic.visible = event.currentTarget.checked;
    if ( throatDiagnostic ) throatDiagnostic.visible = event.currentTarget.checked;
    if ( historyGuides ) historyGuides.visible = event.currentTarget.checked;
    if ( alignmentGuides ) alignmentGuides.visible = event.currentTarget.checked;
} );

let layerVisible = true;

control( 'velocity-vectors' ).addEventListener( 'change', ( event ) => {
    velocityVectors.visible = layerVisible && event.currentTarget.checked && parcelPoints.visible;
} );

control( 'packet-diagnostics' ).addEventListener( 'change', ( event ) => {
    const visible = event.currentTarget.checked;
    parcelPoints.visible = layerVisible && visible;
    sourceMarkers.visible = layerVisible && visible;
    velocityVectors.visible = layerVisible && visible && control( 'velocity-vectors' ).checked;
} );

control( 'reset' ).addEventListener( 'click', resetParcels );
control( 'reseed' ).addEventListener( 'click', () => {
    parameters.sourceSeed += 1;
    regenerateSources();
    resetParcels();
} );

function animate( time )
{
    if ( simulation.previousTime === 0 )
    {
        simulation.previousTime = time;
    }

    const frameTime = Math.min( ( time - simulation.previousTime ) / 1000, 0.05 );
    simulation.previousTime = time;
    simulation.accumulator += frameTime;

    let steps = 0;
    while ( simulation.accumulator >= simulation.fixedStep && steps < 3 )
    {
        stepSimulation( simulation.fixedStep );
        simulation.accumulator -= simulation.fixedStep;
        steps += 1;
    }

    if ( steps === 3 )
    {
        simulation.accumulator = 0;
    }

    updateDiagnosticGeometry();
    simulation.statisticsElapsed += frameTime;
    if ( simulation.statisticsElapsed >= 0.25 )
    {
        parcelCountElement.textContent = `${simulation.parcels.length} / ${simulation.maximumParcels}`;
        interactionCountElement.textContent = simulation.lastInteractionCount.toString();
        crossSourceCountElement.textContent = simulation.lastCrossSourceInteractionCount.toString();
        reconstructionTimeElement.textContent = `${simulation.lastReconstructionMilliseconds.toFixed( 2 )} ms`;
        gates.forEach( ( gate ) => {
            gate.resultElement.value = gate.state;
        } );
        reservoirCountElement.value = rimReservoir.length.toString();
        simulationTimeElement.textContent = `${simulation.lastStepMilliseconds.toFixed( 2 )} ms`;
        simulation.statisticsElapsed = 0;
    }

}

regenerateSources();
resetParcels();
updateSurface();
world.addFrameCallback( animate );

function setMoltenContactBoundary( boundary )
{
    moltenContactBoundary = boundary ?? null;
    field.contactBoundaryRevision = Number.NaN;
    refreshContactMask( true );
}

function getMoltenContactDiagnostics()
{
    return Object.freeze( {
        ...contactDiagnostics,
        activeContactParcelCount: simulation.parcels.filter(
            ( parcel ) => parcel.hasContactedBoundary
        ).length,
        boundaryRevision: field.contactBoundaryRevision
    } );
}

return {
    parameters,
    simulation,
    environment: {
        membraneSurface,
        terrainApron,
        diagnostic,
        throatSurface,
        throatDiagnostic,
        historyGuides,
        alignmentGuides,
        hemisphereLight,
        keyLight,
        rimLight,
        receiver
    },
    moltenField: Object.freeze( {
        domain: sluiceMoltenDomainDefaults,
        sample: sampleMoltenState,
        samplePresentation: sampleMoltenPresentation,
        surface: moltenSurface,
        texture: field.texture,
        get revision() { return field.revision; }
    } ),
    setMoltenContactBoundary,
    getMoltenContactDiagnostics,
    updateSurface,
    setVisible( visible ) {
        layerVisible = visible;
        moltenSurface.visible = visible;
        const diagnosticsVisible = visible && control( 'packet-diagnostics' ).checked;
        parcelPoints.visible = diagnosticsVisible;
        sourceMarkers.visible = diagnosticsVisible;
        velocityVectors.visible = diagnosticsVisible && control( 'velocity-vectors' ).checked;
    },
    reset: resetParcels,
    reseed() {
        parameters.sourceSeed += 1;
        regenerateSources();
        resetParcels();
    }
};
}

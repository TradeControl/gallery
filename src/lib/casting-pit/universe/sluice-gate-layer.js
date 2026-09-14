import * as THREE from 'three';
import { bindRangeControl } from '../controls.js';
import { seededGenerator } from '../random.js';

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
    gateCycle: 11,
    phaseSpread: 0.78,
    openingDuration: 2.5,
    releaseThreshold: 12,
    persistence: 5,
    deposition: 1,
    moltenIntensity: 0.85,
    threshold: 0.1
};

export function createSluiceGateLayer( { world, membrane, parameters, root = document, includeEnvironment = true } )
{
const { scene, renderer } = world;
const ownerDocument = root.ownerDocument ?? root;
const membraneHeight = membrane.height;
const membraneGradient = membrane.gradient;
const createMembraneGeometry = membrane.createGeometry;
const deformMembrane = membrane.deform;

const parcelCountElement = root.querySelector( '#parcel-count' );
const interactionCountElement = root.querySelector( '#interaction-count' );
const crossSourceCountElement = root.querySelector( '#cross-source-count' );
const simulationTimeElement = root.querySelector( '#simulation-time' );
const reconstructionTimeElement = root.querySelector( '#reconstruction-time' );
const sourceKeyElement = root.querySelector( '#source-key' );
const seedValueElement = root.querySelector( '#seed-value' );
const reservoirCountElement = root.querySelector( '#reservoir-count' );

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

const membraneGeometry = createMembraneGeometry( 180 );
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
if ( includeEnvironment ) scene.add( membraneSurface );

const field = {
    resolution: 224,
    density: new Float32Array( 224 * 224 ),
    heat: new Float32Array( 224 * 224 ),
    flowX: new Float32Array( 224 * 224 ),
    flowZ: new Float32Array( 224 * 224 ),
    densityScratch: new Float32Array( 224 * 224 ),
    heatScratch: new Float32Array( 224 * 224 ),
    flowXScratch: new Float32Array( 224 * 224 ),
    flowZScratch: new Float32Array( 224 * 224 ),
    textureData: new Float32Array( 224 * 224 * 4 )
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

const moltenGeometry = createMembraneGeometry( 180 );
const moltenMaterial = new THREE.ShaderMaterial( {
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
        moltenField: { value: field.texture },
        intensity: { value: parameters.moltenIntensity },
        threshold: { value: parameters.threshold }
    },
    vertexShader: `
        uniform sampler2D moltenField;
        varying vec2 vUv;
        varying float vDensity;

        void main()
        {
            vUv = uv;
            vDensity = texture2D( moltenField, uv ).r;
            vec3 displaced = position;
            displaced.y += 0.035 + min( vDensity, 1.5 ) * 0.055;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( displaced, 1.0 );
        }
    `,
    fragmentShader: `
        uniform sampler2D moltenField;
        uniform float intensity;
        uniform float threshold;
        varying vec2 vUv;
        varying float vDensity;

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
            vec2 material = texture2D( moltenField, vUv ).rg;
            float density = material.r;
            float heat = clamp( material.g / max( density, 0.001 ), 0.0, 1.0 );
            float edgeNoise = noise( vUv * 92.0 + vec2( 4.3, 11.7 ) ) * 0.65
                + noise( vUv * 31.0 ) * 0.35;
            float localThreshold = threshold * mix( 0.72, 1.32, edgeNoise );
            float coverage = smoothstep( localThreshold, localThreshold + 0.16, density );
            if ( coverage < 0.015 ) discard;

            float body = smoothstep( threshold, 0.85, density );
            float breakup = noise( vUv * 135.0 ) * 0.65 + noise( vUv * 48.0 + 9.7 ) * 0.35;
            float crust = smoothstep( 0.48, 0.82, breakup ) * ( 1.0 - heat * 0.55 );
            float core = smoothstep( 0.48, 1.5, density ) * smoothstep( 0.42, 0.95, heat );
            float edge = clamp( length( vec2( dFdx( density ), dFdy( density ) ) ) * 2.5, 0.0, 1.0 );
            vec3 cooled = vec3( 0.055, 0.009, 0.004 );
            vec3 warm = vec3( 0.46, 0.038, 0.006 );
            vec3 hot = vec3( 0.95, 0.25, 0.018 );
            vec3 color = mix( cooled, warm, body * ( 0.32 + heat * 0.48 ) );
            color = mix( color, hot, core * ( 0.48 + breakup * 0.2 ) );
            color *= mix( 1.0, 0.36, crust );
            color *= mix( 1.0, 0.55, edge );
            color *= intensity * ( 0.72 + min( density, 1.4 ) * 0.2 );
            gl_FragColor = vec4( color, coverage * 0.94 );
        }
    `
} );
const moltenSurface = new THREE.Mesh( moltenGeometry, moltenMaterial );
moltenSurface.renderOrder = 2;
scene.add( moltenSurface );

const diagnosticGeometry = createMembraneGeometry( 32 );
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
if ( includeEnvironment ) scene.add( receiver );

let sourceDefinitions = [];
let rimReservoir = [];

let gates = [];
const gateGroup = new THREE.Group();
gateGroup.visible = false;
scene.add( gateGroup );

function generateGateSystem( gateCount, streamCount, seed )
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
        const sourceRadius = THREE.MathUtils.lerp( 12.1, 13.6, generatedRandom() );
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
    const generated = generateGateSystem( parameters.gateCount, parameters.streamCount, parameters.sourceSeed );
    sourceDefinitions = generated.sources;
    gates = generated.generatedGates;
    buildGateMeshes();
    rebuildSourcePresentation();
    seedValueElement.value = parameters.sourceSeed.toString();
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

    simulation.parcels.push( {
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
    } );
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
    const normalizedX = ( x + 12 ) / 24;
    const normalizedY = ( 12 - z ) / 24;
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
    const spacing = 24 / field.resolution * 0.7;
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

function updateMoltenField( timeStep )
{
    const start = performance.now();
    const resolution = field.resolution;
    const densityDecay = Math.exp( -timeStep / parameters.persistence );
    const heatDecay = Math.exp( -timeStep / ( parameters.persistence * 0.62 ) );
    const spread = Math.min( 0.12, timeStep * 2.2 );

    for ( let y = 0; y < resolution; y += 1 )
    {
        for ( let x = 0; x < resolution; x += 1 )
        {
            const index = y * resolution + x;
            const left = x > 0 ? index - 1 : index;
            const right = x < resolution - 1 ? index + 1 : index;
            const below = y > 0 ? index - resolution : index;
            const above = y < resolution - 1 ? index + resolution : index;
            const density = field.density[index];
            const velocityX = field.flowX[index] / Math.max( density, 0.03 );
            const velocityZ = field.flowZ[index] / Math.max( density, 0.03 );
            const pixelScale = resolution / 24;
            const backtraceX = x - velocityX * timeStep * pixelScale * 0.58;
            const backtraceY = y + velocityZ * timeStep * pixelScale * 0.58;
            const advectedDensity = sampleField( field.density, backtraceX, backtraceY );
            const advectedHeat = sampleField( field.heat, backtraceX, backtraceY );
            const densityAverage = ( field.density[left] + field.density[right] + field.density[below] + field.density[above] ) * 0.25;
            const heatAverage = ( field.heat[left] + field.heat[right] + field.heat[below] + field.heat[above] ) * 0.25;
            const flowXAverage = ( field.flowX[left] + field.flowX[right] + field.flowX[below] + field.flowX[above] ) * 0.25;
            const flowZAverage = ( field.flowZ[left] + field.flowZ[right] + field.flowZ[below] + field.flowZ[above] ) * 0.25;
            field.densityScratch[index] = THREE.MathUtils.lerp( advectedDensity, densityAverage, spread ) * densityDecay;
            field.heatScratch[index] = THREE.MathUtils.lerp( advectedHeat, heatAverage, spread * 1.25 ) * heatDecay;
            field.flowXScratch[index] = THREE.MathUtils.lerp( field.flowX[index], flowXAverage, spread ) * densityDecay * 0.92;
            field.flowZScratch[index] = THREE.MathUtils.lerp( field.flowZ[index], flowZAverage, spread ) * densityDecay * 0.92;
        }
    }

    [ field.density, field.densityScratch ] = [ field.densityScratch, field.density ];
    [ field.heat, field.heatScratch ] = [ field.heatScratch, field.heat ];
    [ field.flowX, field.flowXScratch ] = [ field.flowXScratch, field.flowX ];
    [ field.flowZ, field.flowZScratch ] = [ field.flowZScratch, field.flowZ ];

    for ( let index = 0; index < field.density.length; index += 1 )
    {
        const textureOffset = index * 4;
        field.textureData[textureOffset] = field.density[index];
        field.textureData[textureOffset + 1] = field.heat[index];
        field.textureData[textureOffset + 2] = 0;
        field.textureData[textureOffset + 3] = 1;
    }

    field.texture.needsUpdate = true;
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
    field.textureData.fill( 0 );
    field.texture.needsUpdate = true;
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
        tryCaptureAtReservoir( parcel, radiusBeforeIntegration );
        depositTrail( parcel, previousX, previousZ, timeStep );
    } );

    simulation.parcels = simulation.parcels.filter( ( parcel ) => {
        if ( parcel.heldByGate !== -1 ) return true;
        const radius = Math.hypot( parcel.x, parcel.z );
        const source = sourceDefinitions[parcel.sourceIndex];

        if ( radius <= simulation.receiverRadius )
        {
            source.captured += 1;
            return false;
        }

        if ( radius >= 17 || parcel.age >= parcel.lifetime || parcel.temperature <= 0.1 )
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
    deformMembrane( moltenGeometry );
    deformMembrane( diagnosticGeometry );
    receiver.position.y = membraneHeight( 0, 0 ) + 0.04;
    updateGateGeometry();
    updateSourceMarkerGeometry();
    updateDiagnosticGeometry();
}

const connectSlider = ( inputId, outputId, onInput, decimals = 2 ) => bindRangeControl( root, inputId, outputId, onInput, decimals );

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

root.querySelector( '#diagnostic' ).addEventListener( 'change', ( event ) => {
    diagnostic.visible = event.currentTarget.checked;
} );

root.querySelector( '#velocity-vectors' ).addEventListener( 'change', ( event ) => {
    velocityVectors.visible = event.currentTarget.checked && parcelPoints.visible;
} );

root.querySelector( '#packet-diagnostics' ).addEventListener( 'change', ( event ) => {
    const visible = event.currentTarget.checked;
    parcelPoints.visible = visible;
    sourceMarkers.visible = visible;
    velocityVectors.visible = visible && root.querySelector( '#velocity-vectors' ).checked;
} );

root.querySelector( '#reset' ).addEventListener( 'click', resetParcels );
root.querySelector( '#reseed' ).addEventListener( 'click', () => {
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

return {
    parameters,
    simulation,
    environment: { membraneSurface, diagnostic, hemisphereLight, keyLight, rimLight, receiver },
    updateSurface,
    reset: resetParcels,
    reseed() {
        parameters.sourceSeed += 1;
        regenerateSources();
        resetParcels();
    }
};
}

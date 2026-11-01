import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
    createInformationRoute,
    getInformationPacketRadius,
    getInformationSignal,
    informationPacketVisualProfile,
    selectInformationTrafficTerminals
} from './engineered-tree-layer.js';
import {
    createTaperedTubeGeometry,
    getConduitRadii
} from './tree-layer.js';
import {
    createRootedMotionUniforms,
    registerRootedMotionMaterial,
    rootedMotionShaderApplication,
    rootedMotionShaderDeclarations,
    rootedMotionFieldId
} from './rooted-motion.js';

export const physicalUptakeCandidateId =
    'p10-2-contact-bound-peripheral-liquid-uptake-v4';

export const physicalUptakeVisualProfile = Object.freeze( {
    colour: 0x5e1805,
    cooledColour: Object.freeze( [ 0.055, 0.009, 0.004 ] ),
    bodyColour: Object.freeze( [ 0.46, 0.038, 0.006 ] ),
    headColour: Object.freeze( [ 0.95, 0.25, 0.018 ] ),
    headIntensity: 0.95,
    tailIntensity: 0.42,
    bodyMixMaximum: 0.28,
    headMixMaximum: 0.34,
    bodyIntensityMinimum: 0.58,
    bodyIntensityMaximum: 0.88,
    opacity: 0.92,
    maximumActivePackets: 96,
    maximumPendingTransfers: 1,
    auditCapacity: 256,
    selectedRouteCount: 12,
    trafficSamples: 64,
    laneCount: 3,
    laneOffsetFraction: 0.85,
    laneRadiusFraction: 0.14,
    laneRadiusMinimum: 0.0018,
    laneRadiusMaximum: 0.075,
    laneCoreRadiusMultiple: 1.875,
    laneClearanceFraction: 0.01,
    laneClearanceMinimum: 0.0002,
    reachMinimum: 0.9,
    reachMaximum: 1,
    headWidth: informationPacketVisualProfile.headWidth,
    trailLength: informationPacketVisualProfile.trailLength,
    wakeAmplitude: informationPacketVisualProfile.wakeAmplitude,
    wakeDecay: informationPacketVisualProfile.wakeDecay,
    discardThreshold: informationPacketVisualProfile.discardThreshold,
    defaultSpeed: 1.55,
    defaultFrequency: 0.2,
    maximumFrequency: 20
} );

const epsilon = 1e-9;

function stableHash( value )
{
    const text = String( value );
    let hash = 2166136261;
    for ( let index = 0; index < text.length; index += 1 )
    {
        hash ^= text.charCodeAt( index );
        hash = Math.imul( hash, 16777619 );
    }
    return hash >>> 0;
}

function hashUnit( value )
{
    return stableHash( value ) / 4294967295;
}

function finitePositive( value, label )
{
    const numeric = Number( value );
    if ( !Number.isFinite( numeric ) || numeric <= 0 )
    {
        throw new TypeError( `Physical uptake ${label} must be finite and positive.` );
    }
    return numeric;
}

function finiteNonNegative( value, label )
{
    const numeric = Number( value );
    if ( !Number.isFinite( numeric ) || numeric < 0 )
    {
        throw new TypeError(
            `Physical uptake ${label} must be finite and non-negative.`
        );
    }
    return numeric;
}

function frozenPosition( value )
{
    if ( !Array.isArray( value ) || value.length !== 3
        || value.some( ( component ) => !Number.isFinite( component ) ) )
    {
        throw new TypeError(
            'Physical uptake contact position must contain three finite values.'
        );
    }
    return Object.freeze( value.slice() );
}

function requiredIdentifier( value, label )
{
    if ( typeof value !== 'string' || value.trim().length === 0 )
    {
        throw new TypeError( `Physical uptake ${label} must be a non-empty string.` );
    }
    return value.trim();
}

function normaliseTransfer( input, sequence )
{
    if ( !input || typeof input !== 'object' )
    {
        throw new TypeError( 'Physical uptake requires a transfer event.' );
    }
    return Object.freeze( {
        transferId: requiredIdentifier( input.transferId, 'transfer id' ),
        sourceParcelId: requiredIdentifier(
            input.sourceParcelId,
            'source parcel id'
        ),
        sourceId: requiredIdentifier( input.sourceId, 'source id' ),
        mass: finitePositive( input.mass, 'mass' ),
        energy: finitePositive( input.energy, 'energy' ),
        temperature: finitePositive(
            input.temperature ?? input.energy,
            'temperature'
        ),
        contactPosition: frozenPosition( input.contactPosition ?? [ 0, 0, 0 ] ),
        contactTime: finiteNonNegative( input.contactTime ?? 0, 'contact time' ),
        sequence
    } );
}

export function selectPhysicalUptakeTerminals(
    hierarchy,
    maximum = physicalUptakeVisualProfile.selectedRouteCount
)
{
    const limit = Math.max( 1, Math.floor( Number( maximum ) || 1 ) );
    const candidates = selectInformationTrafficTerminals( hierarchy );
    const groups = new Map();
    for ( const terminal of candidates )
    {
        const key = terminal.limb ?? 'unassigned';
        if ( !groups.has( key ) ) groups.set( key, [] );
        groups.get( key ).push( terminal );
    }
    const preferred = [ 'operations', 'finance', 'resources', 'unassigned' ];
    const keys = [
        ...preferred.filter( ( key ) => groups.has( key ) ),
        ...Array.from( groups.keys() )
            .filter( ( key ) => !preferred.includes( key ) )
            .sort()
    ];
    const selected = [];
    let offset = 0;
    while ( selected.length < limit )
    {
        let added = false;
        for ( const key of keys )
        {
            const candidate = groups.get( key )[offset];
            if ( !candidate ) continue;
            selected.push( candidate );
            added = true;
            if ( selected.length === limit ) break;
        }
        if ( !added ) break;
        offset += 1;
    }
    return Object.freeze( selected );
}

function createLiquidMaterial()
{
    const profile = physicalUptakeVisualProfile;
    const uniforms = {
        ...createRootedMotionUniforms(),
        trafficTexture: { value: null },
        cooledColour: {
            value: new THREE.Vector3().fromArray( profile.cooledColour )
        },
        bodyColour: {
            value: new THREE.Vector3().fromArray( profile.bodyColour )
        },
        headColour: {
            value: new THREE.Vector3().fromArray( profile.headColour )
                .multiplyScalar( profile.headIntensity )
        },
        opacity: { value: profile.opacity }
    };
    const material = new THREE.ShaderMaterial( {
        uniforms: {
            treeTime: uniforms.time,
            treeResponse: uniforms.response,
            treeGustMix: uniforms.gustMix,
            treeGustIntervalBase: uniforms.intervalBase,
            trafficTexture: uniforms.trafficTexture,
            lavaCooledColour: uniforms.cooledColour,
            lavaBodyColour: uniforms.bodyColour,
            lavaHeadColour: uniforms.headColour,
            uptakeOpacity: uniforms.opacity
        },
        vertexShader: `
            ${rootedMotionShaderDeclarations}
            attribute vec2 trafficUv;
            varying vec2 physicalTrafficUv;

            void main()
            {
                physicalTrafficUv = trafficUv;
                vec3 transformed = position;
                ${rootedMotionShaderApplication( 'position' )}
                gl_Position = projectionMatrix * modelViewMatrix
                    * vec4( transformed, 1.0 );
            }
        `,
        fragmentShader: `
            uniform sampler2D trafficTexture;
            uniform vec3 lavaCooledColour;
            uniform vec3 lavaBodyColour;
            uniform vec3 lavaHeadColour;
            uniform float uptakeOpacity;
            varying vec2 physicalTrafficUv;

            void main()
            {
                float signal = texture2D(
                    trafficTexture,
                    physicalTrafficUv
                ).r;
                if ( signal < ${profile.discardThreshold.toFixed( 6 )} ) discard;
                float bodyHeat = smoothstep( 0.18, 0.90, signal );
                float headHeat = smoothstep( 0.82, 1.0, signal );
                vec3 colour = mix(
                    lavaCooledColour * ${profile.tailIntensity.toFixed( 3 )},
                    lavaBodyColour,
                    bodyHeat * ${profile.bodyMixMaximum.toFixed( 3 )}
                );
                colour = mix(
                    colour,
                    lavaHeadColour,
                    headHeat * ${profile.headMixMaximum.toFixed( 3 )}
                );
                colour *= mix(
                    ${profile.bodyIntensityMinimum.toFixed( 3 )},
                    ${profile.bodyIntensityMaximum.toFixed( 3 )},
                    bodyHeat
                );
                gl_FragColor = vec4( colour, signal * uptakeOpacity );
            }
        `,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        depthFunc: THREE.GreaterDepth,
        side: THREE.DoubleSide,
        blending: THREE.NormalBlending,
        toneMapped: true,
        lights: false
    } );
    material.name = 'P10.2 routed molten uptake';
    registerRootedMotionMaterial(
        material,
        uniforms,
        'routed-physical-xylem'
    );
    material.userData.physicalUptake = Object.freeze( {
        candidateId: physicalUptakeCandidateId,
        representation: 'connected-head-and-wake',
        placement: 'three-peripheral-bark-lanes',
        cadenceSource: 'information-packet-frequency',
        cooledColour: profile.cooledColour,
        bodyColour: profile.bodyColour,
        headColour: profile.headColour,
        lightCount: 0,
        bloom: false,
        autonomousEmission: false,
        sugarReturn: false
    } );
    return { material, uniforms };
}

function createTrafficTexture( width, height )
{
    const data = new Uint8Array( width * height * 4 );
    const texture = new THREE.DataTexture(
        data,
        width,
        height,
        THREE.RGBAFormat,
        THREE.UnsignedByteType
    );
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return { data, texture, width, height };
}

function smoothstep01( value )
{
    const bounded = THREE.MathUtils.clamp( value, 0, 1 );
    return bounded * bounded * ( 3 - 2 * bounded );
}

function laneKey( childId, laneIndex )
{
    return `${childId}:${laneIndex}`;
}

function routeLaneIndex( route )
{
    const principalBranch = route.nodes.find( ( node ) =>
        node.parentId === 'meaning'
    );
    const authored = {
        operations: 0,
        finance: 1,
        resources: 2
    }[principalBranch?.id];
    return authored ?? stableHash( route.terminalId )
        % physicalUptakeVisualProfile.laneCount;
}

function getTrunkNodes( hierarchy )
{
    const root = hierarchy.roots?.[0]
        ?? hierarchy.nodes.find( ( node ) => !node.parentId );
    if ( !root ) return [];
    const nodes = [ root ];
    let cursor = root;
    while ( cursor )
    {
        const child = cursor.children.find( ( candidate ) =>
            candidate.kind === 'trunk' && candidate.growthEligible !== false
        );
        if ( !child ) break;
        nodes.push( child );
        cursor = child;
    }
    return nodes;
}

function setMaximumRadius( radii, nodeId, radius )
{
    radii.set( nodeId, Math.max( radii.get( nodeId ) ?? 0, radius ) );
}

function createNodeRadiusMap( hierarchy, segments, conduitWeight )
{
    const radii = new Map();
    for ( const segment of segments )
    {
        const edgeRadii = getConduitRadii( segment.edge, conduitWeight );
        setMaximumRadius( radii, segment.parentId, edgeRadii.start );
        setMaximumRadius( radii, segment.childId, edgeRadii.end );
    }

    const trunkNodes = getTrunkNodes( hierarchy );
    const meaningIndex = Math.max(
        1,
        trunkNodes.findIndex( ( node ) => node.id === 'meaning' )
    );
    const weightScale = conduitWeight / 1.34;
    trunkNodes.forEach( ( node, index ) => {
        const radius = index <= meaningIndex
            ? THREE.MathUtils.lerp(
                1.42,
                0.84,
                Math.pow( index / meaningIndex, 0.86 )
            ) * weightScale
            : Math.max(
                0.84 * Math.pow( 0.8, index - meaningIndex ) * weightScale,
                ( node.supportRadius ?? 0.2 ) * conduitWeight
            );
        setMaximumRadius( radii, node.id, radius );
    } );
    return radii;
}

function positionVector( positions, nodeId )
{
    const position = positions.get( nodeId );
    if ( !position )
    {
        throw new Error( `Physical uptake node '${nodeId}' has no position.` );
    }
    return new THREE.Vector3( position.x, position.y, position.z );
}

function createNodeTangentMap( hierarchy, positions, nodeIds )
{
    const tangents = new Map();
    for ( const nodeId of nodeIds )
    {
        const node = hierarchy.byId.get( nodeId );
        const point = positionVector( positions, nodeId );
        const parent = node?.parentId ? hierarchy.byId.get( node.parentId ) : null;
        const trunkChild = node?.children.find( ( child ) =>
            child.kind === 'trunk' && nodeIds.has( child.id )
        );
        const child = trunkChild ?? node?.children.find( ( candidate ) =>
            nodeIds.has( candidate.id )
        );
        let tangent;
        if ( parent && nodeIds.has( parent.id ) && child )
        {
            tangent = positionVector( positions, child.id )
                .sub( positionVector( positions, parent.id ) );
        }
        else if ( parent && nodeIds.has( parent.id ) )
        {
            tangent = point.clone().sub( positionVector( positions, parent.id ) );
        }
        else if ( child )
        {
            tangent = positionVector( positions, child.id ).sub( point );
        }
        else tangent = new THREE.Vector3( 0, 1, 0 );
        if ( tangent.lengthSq() < epsilon ) tangent.set( 0, 1, 0 );
        tangents.set( nodeId, tangent.normalize() );
    }
    return tangents;
}

function projectDirectionToTangent( direction, tangent )
{
    const projected = direction.clone().addScaledVector(
        tangent,
        -direction.dot( tangent )
    );
    if ( projected.lengthSq() >= 1e-8 ) return projected.normalize();
    const fallback = Math.abs( tangent.y ) < 0.9
        ? new THREE.Vector3( 0, 1, 0 )
        : new THREE.Vector3( 1, 0, 0 );
    return fallback.addScaledVector(
        tangent,
        -fallback.dot( tangent )
    ).normalize();
}

function createNodeLaneDirections( hierarchy, nodeIds, tangents )
{
    const directions = Array.from(
        { length: physicalUptakeVisualProfile.laneCount },
        () => new Map()
    );
    function resolve( nodeId, laneIndex )
    {
        const laneDirections = directions[laneIndex];
        if ( laneDirections.has( nodeId ) ) return laneDirections.get( nodeId );
        const angle = laneIndex / physicalUptakeVisualProfile.laneCount
            * Math.PI * 2;
        const anchor = new THREE.Vector3(
            Math.cos( angle ),
            0,
            Math.sin( angle )
        );
        const direction = projectDirectionToTangent(
            anchor,
            tangents.get( nodeId )
        );
        const node = hierarchy.byId.get( nodeId );
        if ( node?.parentId && nodeIds.has( node.parentId ) )
        {
            const parentDirection = resolve( node.parentId, laneIndex );
            if ( direction.dot( parentDirection ) < 0 ) direction.negate();
        }
        laneDirections.set( nodeId, direction );
        return direction;
    }
    for ( const nodeId of nodeIds )
    {
        for ( let laneIndex = 0;
            laneIndex < physicalUptakeVisualProfile.laneCount;
            laneIndex += 1 ) resolve( nodeId, laneIndex );
    }
    return directions;
}

function getLaneTubeRadius( structuralRadius, centralCoreRadius )
{
    const profile = physicalUptakeVisualProfile;
    const desiredRadius = THREE.MathUtils.clamp(
        structuralRadius * physicalUptakeVisualProfile.laneRadiusFraction,
        physicalUptakeVisualProfile.laneRadiusMinimum,
        Math.min(
            physicalUptakeVisualProfile.laneRadiusMaximum,
            centralCoreRadius * profile.laneCoreRadiusMultiple
        )
    );
    const clearance = Math.max(
        profile.laneClearanceMinimum,
        structuralRadius * profile.laneClearanceFraction
    );
    const safeMaximum = Math.min(
        structuralRadius * profile.laneOffsetFraction
            - centralCoreRadius - clearance,
        structuralRadius * ( 1 - profile.laneOffsetFraction )
            - clearance
    );
    if ( safeMaximum <= 0 )
    {
        throw new RangeError(
            'Physical uptake has no clearance between cyan core and bark.'
        );
    }
    return Math.min( desiredRadius, safeMaximum );
}

function createLaneCurve(
    segment,
    laneIndex,
    nodeRadii,
    laneDirections,
    centralCoreRadius
)
{
    const parentRadius = nodeRadii.get( segment.parentId );
    const childRadius = nodeRadii.get( segment.childId );
    const parentDirection = laneDirections[laneIndex].get( segment.parentId );
    const childDirection = laneDirections[laneIndex].get( segment.childId );
    const parentTubeRadius = getLaneTubeRadius(
        parentRadius,
        centralCoreRadius
    );
    const childTubeRadius = getLaneTubeRadius(
        childRadius,
        centralCoreRadius
    );
    const sampleCount = Math.max( 8, Math.ceil( segment.length * 8 ) );
    const points = [];
    let previousDirection = parentDirection;
    for ( let sample = 0; sample <= sampleCount; sample += 1 )
    {
        const progress = sample / sampleCount;
        const blend = smoothstep01( progress );
        const tangent = segment.curve.getTangentAt( progress ).normalize();
        let direction = parentDirection.clone().lerp(
            childDirection,
            blend
        );
        direction = projectDirectionToTangent( direction, tangent );
        if ( direction.dot( previousDirection ) < 0 ) direction.negate();
        previousDirection = direction;
        const structuralRadius = THREE.MathUtils.lerp(
            parentRadius,
            childRadius,
            blend
        );
        points.push( segment.curve.getPointAt( progress ).addScaledVector(
            direction,
            structuralRadius * physicalUptakeVisualProfile.laneOffsetFraction
        ) );
    }
    points[0] = segment.curve.v0.clone().addScaledVector(
        parentDirection,
        parentRadius * physicalUptakeVisualProfile.laneOffsetFraction
    );
    points[points.length - 1] = segment.curve.v3.clone().addScaledVector(
        childDirection,
        childRadius * physicalUptakeVisualProfile.laneOffsetFraction
    );
    return {
        curve: new THREE.CatmullRomCurve3(
            points,
            false,
            'centripetal',
            0.5
        ),
        parentRadius,
        childRadius,
        parentTubeRadius,
        childTubeRadius,
        parentPoint: points[0],
        childPoint: points[points.length - 1]
    };
}

function createPeripheralUptakeGeometry(
    hierarchy,
    positions,
    routeRecords,
    conduitWeight,
    samplesPerEdge
)
{
    const segmentsByChildId = new Map();
    const lanesByChildId = new Map();
    for ( const record of routeRecords )
    {
        for ( const segment of record.route.segments )
        {
            segmentsByChildId.set( segment.childId, segment );
            if ( !lanesByChildId.has( segment.childId ) )
            {
                lanesByChildId.set( segment.childId, new Set() );
            }
            lanesByChildId.get( segment.childId ).add( record.laneIndex );
        }
    }
    const segments = Array.from( segmentsByChildId.values() ).sort(
        ( left, right ) => left.childId.localeCompare( right.childId )
    );
    const nodeRadii = createNodeRadiusMap(
        hierarchy,
        segments,
        conduitWeight
    );
    const nodeIds = new Set( nodeRadii.keys() );
    const tangents = createNodeTangentMap( hierarchy, positions, nodeIds );
    const laneDirections = createNodeLaneDirections(
        hierarchy,
        nodeIds,
        tangents
    );
    const pairs = segments.flatMap( ( segment ) => Array.from(
        lanesByChildId.get( segment.childId )
    ).sort().map( ( laneIndex ) => ( { segment, laneIndex } ) ) );
    const radialSegments = 6;
    const centralCoreRadius = getInformationPacketRadius( conduitWeight );
    const laneRecords = [];
    const geometries = pairs.map( ( pair, row ) => {
        const lane = createLaneCurve(
            pair.segment,
            pair.laneIndex,
            nodeRadii,
            laneDirections,
            centralCoreRadius
        );
        const tubularSegments = Math.max(
            12,
            Math.ceil( pair.segment.length * 20 )
        );
        const geometry = createTaperedTubeGeometry(
            lane.curve,
            lane.parentTubeRadius,
            lane.childTubeRadius,
            tubularSegments,
            radialSegments
        );
        const trafficUvs = new Float32Array(
            geometry.getAttribute( 'position' ).count * 2
        );
        for ( let index = 0; index < trafficUvs.length / 2; index += 1 )
        {
            const ring = Math.floor( index / radialSegments );
            trafficUvs[index * 2] = 1 - ring / tubularSegments;
            trafficUvs[index * 2 + 1] = ( row + 0.5 ) / pairs.length;
        }
        geometry.setAttribute(
            'trafficUv',
            new THREE.Float32BufferAttribute( trafficUvs, 2 )
        );
        const parentOffset = lane.parentRadius
            * physicalUptakeVisualProfile.laneOffsetFraction;
        const childOffset = lane.childRadius
            * physicalUptakeVisualProfile.laneOffsetFraction;
        laneRecords.push( {
            childId: pair.segment.childId,
            parentId: pair.segment.parentId,
            laneIndex: pair.laneIndex,
            row,
            length: pair.segment.length,
            segment: pair.segment,
            parentPoint: lane.parentPoint.toArray(),
            childPoint: lane.childPoint.toArray(),
            parentOffset,
            childOffset,
            parentTubeRadius: lane.parentTubeRadius,
            childTubeRadius: lane.childTubeRadius,
            minimumCoreClearance: Math.min(
                parentOffset - lane.parentTubeRadius,
                childOffset - lane.childTubeRadius
            ) - centralCoreRadius,
            minimumBarkClearance: Math.min(
                lane.parentRadius - parentOffset - lane.parentTubeRadius,
                lane.childRadius - childOffset - lane.childTubeRadius
            )
        } );
        return geometry;
    } );
    const geometry = mergeGeometries( geometries, false );
    geometries.forEach( ( source ) => source.dispose() );
    if ( !geometry )
    {
        throw new Error( 'Physical uptake requires at least one peripheral lane.' );
    }
    geometry.computeBoundingSphere();
    geometry.userData.physicalUptake = {
        laneCount: physicalUptakeVisualProfile.laneCount,
        centralLaneCount: 0,
        radialSegments,
        samplesPerEdge,
        trafficEdges: laneRecords,
        minimumCoreClearance: Math.min(
            ...laneRecords.map( ( record ) => record.minimumCoreClearance )
        ),
        minimumBarkClearance: Math.min(
            ...laneRecords.map( ( record ) => record.minimumBarkClearance )
        )
    };
    return geometry;
}

function createLiquidResources()
{
    const liquid = createLiquidMaterial();
    const mesh = new THREE.Mesh(
        new THREE.BufferGeometry(),
        liquid.material
    );
    mesh.name = 'P10.2 rooted xylem liquid and crown packets';
    mesh.frustumCulled = false;
    mesh.renderOrder = 2;
    mesh.userData.physicalUptake = true;
    return {
        mesh,
        material: liquid.material,
        uniforms: liquid.uniforms,
        traffic: null,
        trafficEdges: [],
        trafficEdgeByLaneKey: new Map(),
        illuminatedSampleCount: 0,
        illuminatedSampleRatio: 0,
        occupiedEdgeCount: 0,
        xylemOccupiedEdgeCount: 0,
        branchOccupiedEdgeCount: 0,
        tubeRadius: 0,
        minimumCoreClearance: 0,
        minimumBarkClearance: 0,
        trunkLaneCount: 0,
        branchLaneCount: 0
    };
}

function nodeIsManifested( node, growthProgress )
{
    if ( node.growthEligible === false ) return false;
    if ( !growthProgress || !node.latent ) return true;
    return ( growthProgress.get( node.id ) ?? 0 ) >= 0.98;
}

function routeIsManifested( route, growthProgress )
{
    return route.nodes.every( ( node ) => nodeIsManifested(
        node,
        growthProgress
    ) );
}

function getXylemBoundaryDistance( route )
{
    const segment = route.byChildId.get( 'meaning' );
    if ( !segment ) return route.totalDistance * 0.3;
    return route.totalDistance - segment.childDistance;
}

function closestCurveProgress( curve, point )
{
    const sampleCount = 32;
    let bestProgress = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for ( let sample = 0; sample <= sampleCount; sample += 1 )
    {
        const progress = sample / sampleCount;
        const distance = curve.getPointAt( progress ).distanceToSquared( point );
        if ( distance < bestDistance )
        {
            bestDistance = distance;
            bestProgress = progress;
        }
    }
    if ( bestProgress === 0 || bestProgress === 1 ) return bestProgress;
    let lower = Math.max( 0, bestProgress - 1 / sampleCount );
    let upper = Math.min( 1, bestProgress + 1 / sampleCount );
    for ( let iteration = 0; iteration < 14; iteration += 1 )
    {
        const first = lower + ( upper - lower ) / 3;
        const second = upper - ( upper - lower ) / 3;
        const firstDistance = curve.getPointAt( first ).distanceToSquared( point );
        const secondDistance = curve.getPointAt( second ).distanceToSquared( point );
        if ( firstDistance <= secondDistance ) upper = second;
        else lower = first;
    }
    return ( lower + upper ) * 0.5;
}

export function projectPhysicalUptakeEntryDistance( route, contactPosition )
{
    const point = Array.isArray( contactPosition )
        ? new THREE.Vector3().fromArray( contactPosition )
        : contactPosition?.isVector3
            ? contactPosition.clone()
            : null;
    if ( !point || ![ point.x, point.y, point.z ].every( Number.isFinite ) )
    {
        throw new TypeError(
            'Physical uptake entry projection requires a finite contact position.'
        );
    }
    const trunkSegments = route.segments.filter( ( segment ) =>
        segment.edge.child.kind === 'trunk'
            && [ 'root', 'trunk' ].includes( segment.edge.parent.kind )
    );
    const candidates = trunkSegments.length > 0
        ? trunkSegments
        : route.segments.slice( -1 );
    let closestDistance = Number.POSITIVE_INFINITY;
    let entryDistance = 0;
    for ( const segment of candidates )
    {
        const progress = closestCurveProgress( segment.curve, point );
        const curvePoint = segment.curve.getPointAt( progress );
        const distance = curvePoint.distanceToSquared( point );
        if ( distance >= closestDistance ) continue;
        closestDistance = distance;
        entryDistance = route.totalDistance - segment.parentDistance
            + progress * segment.length;
    }
    return THREE.MathUtils.clamp( entryDistance, 0, route.totalDistance );
}

function freezeSnapshotArray( values )
{
    return Object.freeze( values.map( ( value ) => Object.freeze( value ) ) );
}

export function createPhysicalUptakeLayer(
    hierarchy,
    initialPositions,
    initialParameters = {}
)
{
    if ( !hierarchy?.byId || !Array.isArray( hierarchy.terminals ) )
    {
        throw new TypeError( 'Physical uptake requires a validated hierarchy.' );
    }
    const group = new THREE.Group();
    group.name = 'P10.2 routed liquid physical uptake layer';
    const resources = createLiquidResources();
    group.add( resources.mesh );

    let routeRecords = [];
    let growthProgress = null;
    let pendingTransfers = [];
    const pendingPresentationTimes = new Map();
    let activePackets = [];
    let acceptedTransfers = new Map();
    let visualisedTransferIds = [];
    let unvisualisedTransferIds = [];
    let acceptedTransferCount = 0;
    let duplicateTransferCount = 0;
    let visualisedTransferCount = 0;
    let unvisualisedTransferCount = 0;
    let completedVisualCount = 0;
    let acceptedMass = 0;
    let acceptedEnergy = 0;
    let visualisedMass = 0;
    let unvisualisedMass = 0;
    let evictedAcceptedTransferCount = 0;
    let auditTruncated = false;
    let routeCursor = 0;
    let latestElapsed = 0;
    let latestParameters = initialParameters;
    let nextDispatchAt = null;
    let lastFrequency = null;
    let disposed = false;
    let resourceRevision = 0;

    function assertActive()
    {
        if ( disposed ) throw new Error( 'Physical uptake layer is disposed.' );
    }

    function updateSnapshot()
    {
        const snapshot = Object.freeze( {
            candidateId: physicalUptakeCandidateId,
            deformationFieldId: rootedMotionFieldId,
            eventDriven: true,
            autonomousEmission: false,
            sugarReturn: false,
            direction: 'root-to-branch-tip',
            representation: 'routed-liquid-head-and-wake',
            cadenceSource: 'packetFrequency',
            acceptedTransferCount,
            duplicateTransferCount,
            visualisedTransferCount,
            unvisualisedTransferCount,
            completedVisualCount,
            acceptedMass,
            acceptedEnergy,
            visualisedMass,
            unvisualisedMass,
            lifecycleBalance: acceptedTransferCount
                - visualisedTransferCount - unvisualisedTransferCount
                - pendingTransfers.length,
            massBalance: acceptedMass - visualisedMass - unvisualisedMass
                - pendingTransfers.reduce(
                    ( total, transfer ) => total + transfer.mass,
                    0
                ),
            pendingTransferCount: pendingTransfers.length,
            activePacketCount: activePackets.length,
            activeXylemCount: activePackets.filter( ( packet ) =>
                packet.headDistance <= packet.routeRecord.xylemBoundaryDistance
            ).length,
            activeBranchPacketCount: activePackets.filter( ( packet ) =>
                packet.headDistance > packet.routeRecord.xylemBoundaryDistance
            ).length,
            maximumActivePackets:
                physicalUptakeVisualProfile.maximumActivePackets,
            maximumPendingTransfers:
                physicalUptakeVisualProfile.maximumPendingTransfers,
            routeCount: routeRecords.length,
            selectedTerminalIds: Object.freeze( routeRecords.map(
                ( record ) => record.route.terminalId
            ) ),
            visualisedTransferIds: Object.freeze(
                visualisedTransferIds.slice()
            ),
            unvisualisedTransferIds: Object.freeze(
                unvisualisedTransferIds.slice()
            ),
            activePackets: freezeSnapshotArray( activePackets.map(
                ( packet ) => ( {
                    transferId: packet.transfer.transferId,
                    sourceParcelId: packet.transfer.sourceParcelId,
                    sourceId: packet.transfer.sourceId,
                    mass: packet.transfer.mass,
                    energy: packet.transfer.energy,
                    temperature: packet.transfer.temperature,
                    contactPosition: packet.transfer.contactPosition,
                    contactTime: packet.transfer.contactTime,
                    routeTerminalId: packet.routeRecord.route.terminalId,
                    laneIndex: packet.routeRecord.laneIndex,
                    entryDistance: packet.entryDistance,
                    headDistance: packet.headDistance,
                    targetDistance: packet.routeRecord.targetDistance,
                    xylemBoundaryDistance:
                        packet.routeRecord.xylemBoundaryDistance,
                    phase: packet.headDistance
                        <= packet.routeRecord.xylemBoundaryDistance
                        ? 'xylem-stream'
                        : 'outward-branch-packet',
                    startedAt: packet.startedAt,
                    motionSpeed: packet.motionSpeed
                } )
            ) ),
            packetSpeed: Number(
                latestParameters.packetSpeed
                    ?? physicalUptakeVisualProfile.defaultSpeed
            ),
            packetFrequency: Number(
                latestParameters.packetFrequency
                    ?? physicalUptakeVisualProfile.defaultFrequency
            ),
            nextDispatchAt,
            audit: Object.freeze( {
                capacity: physicalUptakeVisualProfile.auditCapacity,
                retainedTransferCount: acceptedTransfers.size,
                retainedVisualisedIdCount: visualisedTransferIds.length,
                retainedUnvisualisedIdCount: unvisualisedTransferIds.length,
                evictedTransferCount: evictedAcceptedTransferCount,
                truncated: auditTruncated
            } ),
            resources: Object.freeze( {
                revision: resourceRevision,
                drawCallCount: group.children.filter(
                    ( child ) => child.isMesh
                ).length,
                representation: 'one-routed-liquid-tube-mesh',
                pointCount: 0,
                vertexCount: resources.mesh.geometry.getAttribute( 'position' )
                    ?.count ?? 0,
                textureWidth: resources.traffic?.width ?? 0,
                textureHeight: resources.traffic?.height ?? 0,
                illuminatedSampleCount: resources.illuminatedSampleCount,
                illuminatedSampleRatio: resources.illuminatedSampleRatio,
                occupiedEdgeCount: resources.occupiedEdgeCount,
                xylemOccupiedEdgeCount: resources.xylemOccupiedEdgeCount,
                branchOccupiedEdgeCount: resources.branchOccupiedEdgeCount,
                uniqueEdgeCount: new Set( resources.trafficEdges.map(
                    ( edge ) => edge.childId
                ) ).size,
                laneEdgeCount: resources.trafficEdges.length,
                laneCount: physicalUptakeVisualProfile.laneCount,
                centralLaneCount: 0,
                trunkLaneCount: resources.trunkLaneCount,
                branchLaneCount: resources.branchLaneCount,
                tubeRadius: resources.tubeRadius,
                laneOffsetFraction:
                    physicalUptakeVisualProfile.laneOffsetFraction,
                minimumCoreClearance: resources.minimumCoreClearance,
                minimumBarkClearance: resources.minimumBarkClearance,
                colour: physicalUptakeVisualProfile.colour,
                cooledColour: physicalUptakeVisualProfile.cooledColour,
                bodyColour: physicalUptakeVisualProfile.bodyColour,
                headColour: physicalUptakeVisualProfile.headColour,
                depthTest: resources.material.depthTest,
                depthWrite: resources.material.depthWrite,
                depthFunc: resources.material.depthFunc,
                blending: resources.material.blending,
                renderOrder: resources.mesh.renderOrder,
                lightCount: 0
            } ),
            disposed
        } );
        group.userData.physicalUptake = snapshot;
        return snapshot;
    }

    function retainIdentifier( records, identifier )
    {
        records.push( identifier );
        if ( records.length <= physicalUptakeVisualProfile.auditCapacity ) return;
        records.shift();
        auditTruncated = true;
    }

    function retainTransfer( transfer )
    {
        acceptedTransfers.set( transfer.transferId, transfer );
        if ( acceptedTransfers.size
            <= physicalUptakeVisualProfile.auditCapacity ) return;
        acceptedTransfers.delete( acceptedTransfers.keys().next().value );
        evictedAcceptedTransferCount += 1;
        auditTruncated = true;
    }

    function clearVisualState( clearLedger )
    {
        if ( !clearLedger )
        {
            for ( const transfer of pendingTransfers )
            {
                unvisualisedTransferCount += 1;
                unvisualisedMass += transfer.mass;
                retainIdentifier(
                    unvisualisedTransferIds,
                    transfer.transferId
                );
            }
            completedVisualCount += activePackets.length;
        }
        pendingTransfers = [];
        pendingPresentationTimes.clear();
        activePackets = [];
        routeCursor = 0;
        nextDispatchAt = null;
        lastFrequency = null;
        if ( resources.traffic )
        {
            resources.traffic.data.fill( 0 );
            resources.traffic.texture.needsUpdate = true;
        }
        resources.illuminatedSampleCount = 0;
        resources.illuminatedSampleRatio = 0;
        resources.occupiedEdgeCount = 0;
        resources.xylemOccupiedEdgeCount = 0;
        resources.branchOccupiedEdgeCount = 0;
        if ( clearLedger )
        {
            acceptedTransfers = new Map();
            visualisedTransferIds = [];
            unvisualisedTransferIds = [];
            acceptedTransferCount = 0;
            duplicateTransferCount = 0;
            visualisedTransferCount = 0;
            unvisualisedTransferCount = 0;
            completedVisualCount = 0;
            acceptedMass = 0;
            acceptedEnergy = 0;
            visualisedMass = 0;
            unvisualisedMass = 0;
            evictedAcceptedTransferCount = 0;
            auditTruncated = false;
        }
    }

    function rebuild( positions, parameters = latestParameters )
    {
        assertActive();
        if ( !( positions instanceof Map ) )
        {
            throw new TypeError( 'Physical uptake positions must be a Map.' );
        }
        latestParameters = parameters;
        const terminals = selectPhysicalUptakeTerminals( hierarchy );
        routeRecords = terminals.map( ( terminal ) => {
            const route = createInformationRoute(
                hierarchy,
                positions,
                terminal.id,
                parameters.asymmetry ?? 0.55
            );
            const hash = hashUnit( terminal.id );
            const reach = THREE.MathUtils.lerp(
                physicalUptakeVisualProfile.reachMinimum,
                physicalUptakeVisualProfile.reachMaximum,
                hash
            );
            return Object.freeze( {
                route,
                laneIndex: routeLaneIndex( route ),
                targetDistance: route.totalDistance * reach,
                xylemBoundaryDistance: getXylemBoundaryDistance( route )
            } );
        } );
        clearVisualState( false );
        resources.mesh.geometry.dispose();
        resources.traffic?.texture.dispose();
        const geometry = createPeripheralUptakeGeometry(
            hierarchy,
            positions,
            routeRecords,
            parameters.conduitWeight ?? 1.34,
            physicalUptakeVisualProfile.trafficSamples
        );
        resources.mesh.geometry = geometry;
        resources.trafficEdges =
            geometry.userData.physicalUptake.trafficEdges;
        resources.trafficEdgeByLaneKey = new Map(
            resources.trafficEdges.map( ( edge ) => [
                laneKey( edge.childId, edge.laneIndex ),
                edge
            ] )
        );
        resources.tubeRadius = Math.max( ...resources.trafficEdges.flatMap(
            ( edge ) => [ edge.parentTubeRadius, edge.childTubeRadius ]
        ) );
        resources.minimumCoreClearance =
            geometry.userData.physicalUptake.minimumCoreClearance;
        resources.minimumBarkClearance =
            geometry.userData.physicalUptake.minimumBarkClearance;
        resources.trunkLaneCount = resources.trafficEdges.filter( ( edge ) =>
            edge.segment.edge.child.kind === 'trunk'
                && [ 'root', 'trunk' ].includes(
                    edge.segment.edge.parent.kind
                )
        ).length;
        resources.branchLaneCount = resources.trafficEdges.length
            - resources.trunkLaneCount;
        resources.traffic = createTrafficTexture(
            physicalUptakeVisualProfile.trafficSamples,
            resources.trafficEdges.length
        );
        resources.uniforms.trafficTexture.value = resources.traffic.texture;
        resourceRevision += 1;
        updateSnapshot();
        return routeRecords.length;
    }

    function acceptPhysicalUptake( input )
    {
        assertActive();
        const candidateId = requiredIdentifier(
            input?.transferId,
            'transfer id'
        );
        const existing = acceptedTransfers.get( candidateId );
        if ( existing )
        {
            duplicateTransferCount += 1;
            updateSnapshot();
            return Object.freeze( {
                accepted: false,
                duplicate: true,
                transfer: existing
            } );
        }
        const transfer = normaliseTransfer( input, acceptedTransferCount );
        const presentationTime = finiteNonNegative(
            input.presentationTime ?? latestElapsed,
            'presentation time'
        );
        retainTransfer( transfer );
        acceptedTransferCount += 1;
        acceptedMass += transfer.mass;
        acceptedEnergy += transfer.energy;
        if ( pendingTransfers.length
            < physicalUptakeVisualProfile.maximumPendingTransfers )
        {
            pendingTransfers.push( transfer );
            pendingPresentationTimes.set(
                transfer.transferId,
                presentationTime
            );
        }
        else
        {
            unvisualisedTransferCount += 1;
            unvisualisedMass += transfer.mass;
            retainIdentifier(
                unvisualisedTransferIds,
                transfer.transferId
            );
        }
        updateSnapshot();
        return Object.freeze( {
            accepted: true,
            duplicate: false,
            transfer
        } );
    }

    function getContactLaneIndex( transfer )
    {
        const [ x, , z ] = transfer.contactPosition;
        if ( Math.hypot( x, z ) < 1e-5 )
        {
            return transfer.sequence % physicalUptakeVisualProfile.laneCount;
        }
        const angle = Math.atan2( z, x );
        let selectedLane = 0;
        let selectedDifference = Number.POSITIVE_INFINITY;
        for ( let laneIndex = 0;
            laneIndex < physicalUptakeVisualProfile.laneCount;
            laneIndex += 1 )
        {
            const laneAngle = laneIndex
                / physicalUptakeVisualProfile.laneCount * Math.PI * 2;
            const difference = Math.abs( Math.atan2(
                Math.sin( angle - laneAngle ),
                Math.cos( angle - laneAngle )
            ) );
            if ( difference < selectedDifference )
            {
                selectedDifference = difference;
                selectedLane = laneIndex;
            }
        }
        return selectedLane;
    }

    function chooseRoute( transfer )
    {
        const manifested = routeRecords.filter( ( record ) =>
            routeIsManifested( record.route, growthProgress )
        );
        if ( manifested.length === 0 ) return null;
        const contactLaneIndex = getContactLaneIndex( transfer );
        const laneCandidates = manifested.filter( ( record ) =>
            record.laneIndex === contactLaneIndex
        );
        const candidates = laneCandidates.length > 0
            ? laneCandidates
            : manifested;
        const selected = candidates[routeCursor % candidates.length];
        routeCursor += 1;
        return selected;
    }

    function markUnvisualised( transfer )
    {
        unvisualisedTransferCount += 1;
        unvisualisedMass += transfer.mass;
        retainIdentifier(
            unvisualisedTransferIds,
            transfer.transferId
        );
    }

    function dispatchAt( emittedAt, speed )
    {
        const transfer = pendingTransfers[0];
        // Acceptance itself is the clock-domain handoff. Composition's molten
        // simulation time and Tree animation time need not share an origin.
        if ( !transfer ) return false;
        pendingTransfers.shift();
        pendingPresentationTimes.delete( transfer.transferId );
        const routeRecord = activePackets.length
            < physicalUptakeVisualProfile.maximumActivePackets
            ? chooseRoute( transfer )
            : null;
        if ( !routeRecord )
        {
            markUnvisualised( transfer );
            return false;
        }
        const entryDistance = Math.min(
            routeRecord.targetDistance,
            projectPhysicalUptakeEntryDistance(
                routeRecord.route,
                transfer.contactPosition
            )
        );
        activePackets.push( {
            transfer,
            routeRecord,
            startedAt: emittedAt,
            entryDistance,
            headDistance: entryDistance,
            motionAnchorTime: emittedAt,
            motionAnchorDistance: entryDistance,
            motionSpeed: speed
        } );
        visualisedTransferCount += 1;
        visualisedMass += transfer.mass;
        retainIdentifier(
            visualisedTransferIds,
            transfer.transferId
        );
        return true;
    }

    function dispatchDue( elapsed, frequency, speed )
    {
        if ( nextDispatchAt === null ) nextDispatchAt = elapsed;
        const period = 1 / frequency;
        const pending = pendingTransfers[0];
        const acceptedAt = pending
            ? pendingPresentationTimes.get( pending.transferId ) ?? 0
            : 0;
        if ( pending && nextDispatchAt + epsilon < acceptedAt )
        {
            const skippedSlots = Math.ceil(
                ( acceptedAt - nextDispatchAt - epsilon ) / period
            );
            nextDispatchAt += skippedSlots * period;
        }
        let safety = 0;
        while ( nextDispatchAt <= elapsed + epsilon && safety < 10000 )
        {
            dispatchAt( nextDispatchAt, speed );
            nextDispatchAt += period;
            safety += 1;
        }
        if ( safety === 10000 && nextDispatchAt <= elapsed + epsilon )
        {
            const remainingSlots = Math.floor(
                ( elapsed - nextDispatchAt ) / period
            ) + 1;
            nextDispatchAt += remainingSlots * period;
        }
    }

    function advancePackets( elapsed, speed, intervalStart )
    {
        const retained = [];
        for ( const packet of activePackets )
        {
            if ( !routeIsManifested(
                packet.routeRecord.route,
                growthProgress
            ) )
            {
                completedVisualCount += 1;
                continue;
            }
            if ( packet.motionSpeed !== speed )
            {
                packet.motionAnchorTime = intervalStart;
                packet.motionAnchorDistance = packet.headDistance;
                packet.motionSpeed = speed;
            }
            packet.headDistance = packet.motionAnchorDistance
                + Math.max( 0, elapsed - packet.motionAnchorTime ) * speed;
            if ( packet.headDistance
                <= packet.routeRecord.targetDistance
                    + physicalUptakeVisualProfile.trailLength )
            {
                retained.push( packet );
            }
            else
            {
                completedVisualCount += 1;
            }
        }
        activePackets = retained;
    }

    function stampLiquidTraffic()
    {
        if ( !resources.traffic ) return;
        const { data, width, height, texture } = resources.traffic;
        data.fill( 0 );
        const occupiedEdges = new Set();
        const xylemEdges = new Set();
        const branchEdges = new Set();

        for ( const packet of activePackets )
        {
            const { route, targetDistance, xylemBoundaryDistance } =
                packet.routeRecord;
            for ( const segment of route.segments )
            {
                const edge = resources.trafficEdgeByLaneKey.get( laneKey(
                    segment.childId,
                    packet.routeRecord.laneIndex
                ) );
                if ( !edge ) continue;
                for ( let sample = 0; sample < width; sample += 1 )
                {
                    const edgeProgress = sample / ( width - 1 );
                    const informationDistance = segment.childDistance
                        + edgeProgress * segment.length;
                    const rootDistance = route.totalDistance
                        - informationDistance;
                    if ( rootDistance < packet.entryDistance - epsilon
                        || rootDistance > targetDistance + epsilon )
                    {
                        continue;
                    }
                    const signal = getInformationSignal(
                        rootDistance,
                        packet.headDistance
                    );
                    const byte = Math.round( signal * 255 );
                    if ( byte < 2 ) continue;
                    const index = ( edge.row * width + sample ) * 4;
                    if ( byte > data[index] )
                    {
                        data[index] = byte;
                        data[index + 3] = 255;
                    }
                    occupiedEdges.add( edge.row );
                    if ( rootDistance <= xylemBoundaryDistance + epsilon )
                    {
                        xylemEdges.add( edge.row );
                    }
                    else branchEdges.add( edge.row );
                }
            }
        }

        let illuminatedSampleCount = 0;
        for ( let index = 0; index < data.length; index += 4 )
        {
            if ( data[index] >= 2 ) illuminatedSampleCount += 1;
        }
        texture.needsUpdate = true;
        resources.illuminatedSampleCount = illuminatedSampleCount;
        resources.illuminatedSampleRatio = height === 0
            ? 0
            : illuminatedSampleCount / ( width * height );
        resources.occupiedEdgeCount = occupiedEdges.size;
        resources.xylemOccupiedEdgeCount = xylemEdges.size;
        resources.branchOccupiedEdgeCount = branchEdges.size;
    }

    function updateRootedMotion( elapsed, parameters )
    {
        resources.uniforms.time.value = elapsed;
        resources.uniforms.response.value = parameters.motionFrozen
            ? 0
            : ( parameters.structuralResponse ?? 0.22 );
        resources.uniforms.gustMix.value =
            parameters.canopyGustCandidate === true ? 1 : 0;
        resources.uniforms.intervalBase.value =
            parameters.gustIntervalBase ?? 0;
    }

    function update( elapsed, parameters = latestParameters )
    {
        assertActive();
        const nextElapsed = Number( elapsed );
        if ( !Number.isFinite( nextElapsed ) || nextElapsed < 0 )
        {
            throw new TypeError(
                'Physical uptake elapsed time must be finite and non-negative.'
            );
        }
        const requestedSpeed = Number( parameters.packetSpeed
            ?? physicalUptakeVisualProfile.defaultSpeed );
        if ( !Number.isFinite( requestedSpeed ) || requestedSpeed <= 0 )
        {
            throw new TypeError(
                'Physical uptake packet speed must be finite and positive.'
            );
        }
        const requestedFrequency = Number( parameters.packetFrequency
            ?? physicalUptakeVisualProfile.defaultFrequency );
        if ( !Number.isFinite( requestedFrequency )
            || requestedFrequency <= 0 )
        {
            throw new TypeError(
                'Physical uptake packet frequency must be finite and positive.'
            );
        }
        const speed = THREE.MathUtils.clamp( requestedSpeed, 0.05, 8 );
        const frequency = THREE.MathUtils.clamp(
            requestedFrequency,
            0.01,
            physicalUptakeVisualProfile.maximumFrequency
        );
        const intervalStart = latestElapsed;
        latestElapsed = nextElapsed;
        latestParameters = parameters;

        advancePackets( nextElapsed, speed, intervalStart );
        if ( lastFrequency === null )
        {
            lastFrequency = frequency;
            nextDispatchAt = nextElapsed;
        }
        else if ( lastFrequency !== frequency )
        {
            dispatchDue( nextElapsed, lastFrequency, speed );
            const remaining = Math.max( 0, nextDispatchAt - nextElapsed );
            nextDispatchAt = nextElapsed
                + remaining * lastFrequency / frequency;
            lastFrequency = frequency;
        }
        dispatchDue( nextElapsed, frequency, speed );
        advancePackets( nextElapsed, speed, intervalStart );
        updateRootedMotion( nextElapsed, parameters );
        stampLiquidTraffic();
        return updateSnapshot();
    }

    function setGrowthProgress( progress )
    {
        assertActive();
        if ( progress !== null && !( progress instanceof Map ) )
        {
            throw new TypeError(
                'Physical uptake growth progress must be a Map or null.'
            );
        }
        growthProgress = progress ? new Map( progress ) : null;
        return updateSnapshot();
    }

    function reset()
    {
        assertActive();
        clearVisualState( true );
        return updateSnapshot();
    }

    function dispose()
    {
        if ( disposed ) return false;
        clearVisualState( true );
        group.remove( resources.mesh );
        resources.mesh.geometry.dispose();
        resources.traffic?.texture.dispose();
        resources.material.dispose();
        disposed = true;
        updateSnapshot();
        return true;
    }

    rebuild( initialPositions, initialParameters );
    return {
        group,
        mesh: resources.mesh,
        rebuild,
        setGrowthProgress,
        update,
        acceptPhysicalUptake,
        setVisible( visible ) {
            assertActive();
            group.visible = Boolean( visible );
            return group.visible;
        },
        reset,
        getSnapshot() {
            return group.userData.physicalUptake;
        },
        dispose
    };
}

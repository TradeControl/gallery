import * as THREE from 'three';
import { createBranchCurve, createTaperedTubeGeometry, getConduitRadii } from './tree-layer.js';

const routedTerminalId = 'process-readiness-state';
const defaultInformationSpeed = 1.55;
const informationTrailLength = 2.2;
const informationPause = 2.6;
const informationCoreRadius = 0.032;

function createMaterial( colour, roughness, metalness )
{
    const material = new THREE.MeshPhysicalMaterial( {
        color: colour,
        roughness,
        metalness,
        clearcoat: 0.32,
        clearcoatRoughness: 0.4
    } );
    const uniforms = {
        time: { value: 0 },
        relief: { value: 0.1 },
        response: { value: 0.22 }
    };
    material.onBeforeCompile = ( shader ) => {
        shader.uniforms.treeTime = uniforms.time;
        shader.uniforms.treeRelief = uniforms.relief;
        shader.uniforms.treeResponse = uniforms.response;
        shader.vertexShader = `
            uniform float treeTime;
            uniform float treeRelief;
            uniform float treeResponse;
        ` + shader.vertexShader.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
            float brushed = sin( position.y * 23.0 + position.x * 7.0 + position.z * 5.0 );
            // A shared deformation field keeps coincident branch junctions
            // coincident while allowing the mature crown to remain alive.
            // Motion grows with height so the trunk foot stays planted.
            float motionReach = smoothstep( 0.25, 5.6, max( position.y, 0.0 ) );
            float swayX = sin( treeTime * 0.72 + position.y * 0.38 + position.z * 0.12 );
            float swayZ = sin( treeTime * 0.56 + position.y * 0.31 + position.x * 0.10 + 1.7 );
            float flutter = sin( treeTime * 1.17 + position.y * 0.81 + position.z * 0.19 );
            transformed += normalize( objectNormal ) * brushed * treeRelief * 0.004;
            transformed.x += ( swayX * 0.25 + flutter * 0.035 )
                * treeResponse * motionReach;
            transformed.z += ( swayZ * 0.19 + flutter * 0.028 )
                * treeResponse * motionReach;`
        );
        material.userData.shader = shader;
    };
    material.customProgramCacheKey = () => `engineered-tree-${colour}`;
    return { material, uniforms };
}

function createInformationCoreMaterial()
{
    const uniforms = {
        time: { value: 0 },
        response: { value: 0.22 },
        informationHead: { value: -100 },
        informationTrail: { value: informationTrailLength }
    };
    const material = new THREE.ShaderMaterial( {
        uniforms: {
            treeTime: uniforms.time,
            treeResponse: uniforms.response,
            informationHead: uniforms.informationHead,
            informationTrail: uniforms.informationTrail
        },
        vertexShader: `
            uniform float treeTime;
            uniform float treeResponse;
            attribute float informationDistance;
            varying float routedInformationDistance;

            void main()
            {
                routedInformationDistance = informationDistance;
                vec3 transformed = position;
                float motionReach = smoothstep( 0.25, 5.6, max( position.y, 0.0 ) );
                float swayX = sin( treeTime * 0.72 + position.y * 0.38 + position.z * 0.12 );
                float swayZ = sin( treeTime * 0.56 + position.y * 0.31 + position.x * 0.10 + 1.7 );
                float flutter = sin( treeTime * 1.17 + position.y * 0.81 + position.z * 0.19 );
                transformed.x += ( swayX * 0.25 + flutter * 0.035 )
                    * treeResponse * motionReach;
                transformed.z += ( swayZ * 0.19 + flutter * 0.028 )
                    * treeResponse * motionReach;
                gl_Position = projectionMatrix * modelViewMatrix * vec4( transformed, 1.0 );
            }
        `,
        fragmentShader: `
            uniform float informationHead;
            uniform float informationTrail;
            varying float routedInformationDistance;

            void main()
            {
                float routedDelta = informationHead - routedInformationDistance;
                float routedHead = exp( -pow(
                    ( routedInformationDistance - informationHead ) / 0.46, 2.0 ) );
                float routedWake = step( 0.0, routedDelta )
                    * ( 1.0 - smoothstep( 0.0, informationTrail, routedDelta ) )
                    * exp( -routedDelta * 0.42 );
                float routedSignal = clamp( routedHead + routedWake * 0.42, 0.0, 1.0 );
                if ( routedSignal < 0.004 ) discard;
                gl_FragColor = vec4( 0.02, 0.48, 1.45, routedSignal * 0.95 );
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: true,
        depthFunc: THREE.GreaterDepth,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false
    } );
    return { material, uniforms };
}

export function createInformationRoute(
    hierarchy,
    positions,
    terminalId = routedTerminalId,
    asymmetry = 0.55
)
{
    const terminal = hierarchy.byId.get( terminalId );
    if ( !terminal || terminal.kind !== 'terminal' )
    {
        throw new Error( `Routed information terminal '${terminalId}' is not an authored terminal.` );
    }

    const nodes = [];
    let cursor = terminal;
    while ( cursor )
    {
        nodes.push( cursor );
        cursor = cursor.parentId ? hierarchy.byId.get( cursor.parentId ) : null;
    }

    const edgesByChildId = new Map( hierarchy.edges.map( ( edge ) => [ edge.child.id, edge ] ) );
    const segments = [];
    const byChildId = new Map();
    let childDistance = 0;
    for ( let index = 0; index < nodes.length - 1; index += 1 )
    {
        const child = nodes[index];
        const parent = nodes[index + 1];
        const edge = edgesByChildId.get( child.id );
        if ( !edge || edge.parent.id !== parent.id )
        {
            throw new Error( `Routed information edge '${child.id}' is not an authored parent relationship.` );
        }
        const startData = positions.get( parent.id );
        const endData = positions.get( child.id );
        const curve = createBranchCurve(
            new THREE.Vector3( startData.x, startData.y, startData.z ),
            new THREE.Vector3( endData.x, endData.y, endData.z ),
            edge,
            asymmetry
        );
        const length = curve.getLength();
        const segment = {
            edge,
            childId: child.id,
            parentId: parent.id,
            childDistance,
            parentDistance: childDistance + length,
            length,
            curve
        };
        segments.push( segment );
        byChildId.set( child.id, segment );
        childDistance = segment.parentDistance;
    }

    return {
        terminal,
        terminalId,
        nodes,
        nodeIds: nodes.map( ( node ) => node.id ),
        segments,
        byChildId,
        totalDistance: childDistance
    };
}

export function selectInformationTerminalForTier( hierarchy, requestedTier = 1 )
{
    const tier = Math.max( 1, Math.round( Number( requestedTier ) || 1 ) );
    const authoredCandidates = hierarchy.terminals.filter( ( node ) =>
        node.supportTier === true && node.growthTier === tier
    );
    if ( authoredCandidates.length === 0 )
    {
        throw new Error( `Growth tier '${tier}' has no authored information terminal.` );
    }

    const firstState = ( candidates ) => candidates.find( ( node ) =>
        node.id.endsWith( '-state' )
    ) ?? candidates[0];
    const eligibleCandidates = authoredCandidates.filter( ( node ) =>
        node.growthEligible !== false
    );
    return firstState( eligibleCandidates.length > 0
        ? eligibleCandidates
        : authoredCandidates );
}

export function createInformationCoreGeometry(
    informationRoute,
    conduitWeight = 1.34
)
{
    const path = new THREE.CurvePath();
    for ( const segment of informationRoute.segments )
    {
        const curve = segment.curve;
        path.add( new THREE.CubicBezierCurve3(
            curve.v3.clone(),
            curve.v2.clone(),
            curve.v1.clone(),
            curve.v0.clone()
        ) );
    }

    const tubularSegments = Math.max(
        96,
        Math.ceil( informationRoute.totalDistance * 20 )
    );
    const radialSegments = 8;
    const radius = THREE.MathUtils.clamp(
        informationCoreRadius * conduitWeight / 1.34,
        0.014,
        0.04
    );
    const geometry = new THREE.TubeGeometry(
        path,
        tubularSegments,
        radius,
        radialSegments,
        false
    );
    const ringSize = radialSegments + 1;
    const distances = new Float32Array( geometry.getAttribute( 'position' ).count );
    for ( let index = 0; index < distances.length; index += 1 )
    {
        const ring = Math.floor( index / ringSize );
        distances[index] = ring / tubularSegments * informationRoute.totalDistance;
    }
    geometry.setAttribute(
        'informationDistance',
        new THREE.Float32BufferAttribute( distances, 1 )
    );
    geometry.userData.informationCore = {
        radius,
        radialSegments,
        tubularSegments,
        terminal: path.getPoint( 0 ).clone(),
        root: path.getPoint( 1 ).clone(),
        totalDistance: informationRoute.totalDistance
    };
    return geometry;
}

function applyInformationRouteAttributes( geometry, segment )
{
    const progress = geometry.getAttribute( 'branchProgress' );
    const distances = new Float32Array( progress.count );
    const masks = new Float32Array( progress.count );
    for ( let index = 0; index < progress.count; index += 1 )
    {
        distances[index] = THREE.MathUtils.lerp(
            segment.parentDistance,
            segment.childDistance,
            progress.getX( index )
        );
        masks[index] = 1;
    }
    geometry.setAttribute( 'informationDistance', new THREE.Float32BufferAttribute( distances, 1 ) );
    geometry.setAttribute( 'informationRoute', new THREE.Float32BufferAttribute( masks, 1 ) );
}

function isTrunkEdge( edge )
{
    return ( edge.parent.kind === 'root' || edge.parent.kind === 'trunk' )
        && edge.child.kind === 'trunk';
}

function getActiveTrunkNodes( hierarchy )
{
    const nodes = [ hierarchy.root ];
    let cursor = hierarchy.root;
    while ( cursor )
    {
        const child = cursor.children.find( ( candidate ) => candidate.kind === 'trunk' );
        if ( !child || child.growthEligible === false ) break;
        nodes.push( child );
        cursor = child;
    }
    return nodes;
}

function getCrownLoadDirection( hierarchy, positions )
{
    const crownCentre = new THREE.Vector3();
    let terminalCount = 0;
    for ( const node of hierarchy.terminals )
    {
        if ( node.growthEligible === false ) continue;
        const position = positions.get( node.id );
        crownCentre.x += position.x;
        crownCentre.z += position.z;
        terminalCount += 1;
    }

    if ( terminalCount > 0 ) crownCentre.multiplyScalar( 1 / terminalCount );
    crownCentre.y = 0;
    if ( crownCentre.lengthSq() < 0.0001 ) crownCentre.set( 1, 0, 0.25 );
    return crownCentre.normalize();
}

function getMonumentalRadii( trunkNodes, conduitWeight )
{
    const referenceWeight = 1.34;
    const weightScale = conduitWeight / referenceWeight;
    const meaningIndex = Math.max( 1, trunkNodes.findIndex( ( node ) => node.id === 'meaning' ) );

    return trunkNodes.map( ( node, index ) => {
        if ( index <= meaningIndex )
        {
            const progress = index / meaningIndex;
            return THREE.MathUtils.lerp( 1.42, 0.84, Math.pow( progress, 0.86 ) )
                * weightScale;
        }

        const stage = index - meaningIndex;
        const deliberateTaper = 0.84 * Math.pow( 0.8, stage ) * weightScale;
        const structuralMinimum = ( node.supportRadius ?? 0.2 ) * conduitWeight;
        return Math.max( deliberateTaper, structuralMinimum );
    } );
}

export function createMonumentalTrunkGeometry(
    trunkNodes,
    positions,
    {
        asymmetry = 0.55,
        conduitWeight = 1,
        loadDirection = new THREE.Vector3( 1, 0, 0 ),
        informationRoute = null,
        nodeScales = trunkNodes.map( () => 1 ),
        samplesPerSpan = 10,
        radialSegments = 18
    } = {}
)
{
    const points = [];
    const stations = [];
    for ( let span = 0; span < trunkNodes.length - 1; span += 1 )
    {
        const parent = trunkNodes[span];
        const child = trunkNodes[span + 1];
        const startData = positions.get( parent.id );
        const endData = positions.get( child.id );
        const curve = createBranchCurve(
            new THREE.Vector3( startData.x, startData.y, startData.z ),
            new THREE.Vector3( endData.x, endData.y, endData.z ),
            { parent, child },
            asymmetry
        );

        for ( let step = span === 0 ? 0 : 1; step <= samplesPerSpan; step += 1 )
        {
            const localProgress = step / samplesPerSpan;
            points.push( curve.getPoint( localProgress ) );
            stations.push( { span, localProgress } );
        }
    }

    // Continue the same volume below the planting datum so the temporary study
    // reads as embedded mass rather than an exposed pipe end or a pair of roots.
    const plantedBase = points[0].clone();
    plantedBase.y -= 0.18;
    points.unshift( plantedBase );
    stations.unshift( { span: 0, localProgress: 0 } );

    const radii = getMonumentalRadii( trunkNodes, conduitWeight );
    const vertices = [];
    const informationDistances = [];
    const informationMasks = [];
    const bodyIndices = [];
    const previousMajor = new THREE.Vector3();
    const loadAxis = loadDirection.clone().setY( 0 ).normalize();
    const ellipseMajor = 1.06 + asymmetry * 0.035;
    const ellipseMinor = 0.92;
    const loadReinforcement = 0.035 + asymmetry * 0.035;

    for ( let ring = 0; ring < points.length; ring += 1 )
    {
        const previous = points[Math.max( 0, ring - 1 )];
        const next = points[Math.min( points.length - 1, ring + 1 )];
        const tangent = next.clone().sub( previous ).normalize();
        const major = loadAxis.clone().addScaledVector( tangent, -loadAxis.dot( tangent ) );
        if ( major.lengthSq() < 0.0001 ) major.set( 1, 0, 0 );
        major.normalize();
        const minor = new THREE.Vector3().crossVectors( tangent, major ).normalize();
        if ( ring > 0 && major.dot( previousMajor ) < 0 )
        {
            major.negate();
            minor.negate();
        }
        previousMajor.copy( major );

        const station = stations[ring];
        const routeSegment = informationRoute?.byChildId.get(
            trunkNodes[station.span + 1].id
        );
        const routeDistance = routeSegment
            ? THREE.MathUtils.lerp(
                routeSegment.parentDistance,
                routeSegment.childDistance,
                station.localProgress
            )
            : 0;
        const routeMask = routeSegment ? 1 : 0;
        const blend = station.localProgress * station.localProgress
            * ( 3 - 2 * station.localProgress );
        const radius = THREE.MathUtils.lerp(
            radii[station.span],
            radii[station.span + 1],
            blend
        ) * THREE.MathUtils.lerp(
            nodeScales[station.span],
            nodeScales[station.span + 1],
            blend
        );

        for ( let side = 0; side < radialSegments; side += 1 )
        {
            const angle = side / radialSegments * Math.PI * 2;
            const reinforcement = 1 + Math.cos( angle ) * loadReinforcement;
            const offset = major.clone().multiplyScalar(
                Math.cos( angle ) * radius * ellipseMajor * reinforcement
            ).addScaledVector(
                minor,
                Math.sin( angle ) * radius * ellipseMinor * reinforcement
            );
            vertices.push(
                points[ring].x + offset.x,
                points[ring].y + offset.y,
                points[ring].z + offset.z
            );
            informationDistances.push( routeDistance );
            informationMasks.push( routeMask );
        }
    }

    for ( let ring = 0; ring < points.length - 1; ring += 1 )
    {
        for ( let side = 0; side < radialSegments; side += 1 )
        {
            const nextSide = ( side + 1 ) % radialSegments;
            const a = ring * radialSegments + side;
            const b = ( ring + 1 ) * radialSegments + side;
            const c = ( ring + 1 ) * radialSegments + nextSide;
            const d = ring * radialSegments + nextSide;
            bodyIndices.push( a, d, b, b, d, c );
        }
    }

    const firstRingDistances = informationDistances.slice( 0, radialSegments );
    const firstRingMasks = informationMasks.slice( 0, radialSegments );
    const lastRingStart = ( points.length - 1 ) * radialSegments;
    const lastRingDistances = informationDistances.slice(
        lastRingStart, lastRingStart + radialSegments
    );
    const lastRingMasks = informationMasks.slice(
        lastRingStart, lastRingStart + radialSegments
    );

    const baseCentre = vertices.length / 3;
    vertices.push( points[0].x, points[0].y, points[0].z );
    informationDistances.push( firstRingDistances[0] );
    informationMasks.push( firstRingMasks[0] );
    const baseRing = vertices.length / 3;
    vertices.push( ...vertices.slice( 0, radialSegments * 3 ) );
    informationDistances.push( ...firstRingDistances );
    informationMasks.push( ...firstRingMasks );
    const topCentre = vertices.length / 3;
    const topPoint = points.at( -1 );
    vertices.push( topPoint.x, topPoint.y, topPoint.z );
    informationDistances.push( lastRingDistances[0] );
    informationMasks.push( lastRingMasks[0] );
    const topRing = vertices.length / 3;
    vertices.push( ...vertices.slice(
        ( points.length - 1 ) * radialSegments * 3,
        points.length * radialSegments * 3
    ) );
    informationDistances.push( ...lastRingDistances );
    informationMasks.push( ...lastRingMasks );

    const baseIndices = [];
    const topIndices = [];
    for ( let side = 0; side < radialSegments; side += 1 )
    {
        const nextSide = ( side + 1 ) % radialSegments;
        // The study is viewed from above its temporary planting plane. Face the
        // buried closure upward so it cannot read as an exposed hollow pipe.
        baseIndices.push( baseCentre, baseRing + side, baseRing + nextSide );
        topIndices.push( topCentre, topRing + side, topRing + nextSide );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
    geometry.setAttribute(
        'informationDistance',
        new THREE.Float32BufferAttribute( informationDistances, 1 )
    );
    geometry.setAttribute(
        'informationRoute',
        new THREE.Float32BufferAttribute( informationMasks, 1 )
    );
    geometry.setIndex( [ ...baseIndices, ...bodyIndices, ...topIndices ] );
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    geometry.userData.monumentalTrunk = {
        baseIndexCount: baseIndices.length,
        bodyIndexCount: bodyIndices.length,
        topIndexCount: topIndices.length,
        bodySegmentCount: points.length - 1,
        sideVertexCount: points.length * radialSegments,
        plantingSegmentCount: 1,
        radialSegments,
        samplesPerSpan,
        nodeRadii: radii
    };
    return geometry;
}

export function createEngineeredTreeLayer( hierarchy, initialPositions, initialParameters = {} )
{
    const group = new THREE.Group();
    group.name = 'engineered-tree-body';
    const trunk = createMaterial( 0x160f0c, 0.38, 0.62 );
    const limb = createMaterial( 0x121517, 0.34, 0.68 );
    const terminal = createMaterial( 0x1b1e1e, 0.3, 0.61 );
    const informationCore = createInformationCoreMaterial();
    const materialEntries = [ trunk, limb, terminal ];
    let growthProgress = new Map();
    let informationRoute = null;
    let informationReady = false;
    let informationStartElapsed = null;
    let informationLastSpeed = null;

    function rebuild( positions, parameters = {} )
    {
        while ( group.children.length > 0 )
        {
            const child = group.children.at( -1 );
            group.remove( child );
            child.geometry.dispose();
        }

        const asymmetry = parameters.asymmetry ?? 0.55;
        const selectedTerminalId = parameters.informationTerminalId
            ?? selectInformationTerminalForTier(
                hierarchy,
                parameters.informationStartTier ?? 1
            ).id;
        informationRoute = createInformationRoute(
            hierarchy,
            positions,
            selectedTerminalId,
            asymmetry
        );
        informationReady = false;
        informationStartElapsed = null;
        informationLastSpeed = null;
        const trunkNodes = getActiveTrunkNodes( hierarchy );
        const loadDirection = getCrownLoadDirection( hierarchy, positions );
        const trunkGeometry = createMonumentalTrunkGeometry( trunkNodes, positions, {
            asymmetry,
            conduitWeight: parameters.conduitWeight ?? 1,
            loadDirection,
            informationRoute
        } );
        const trunkMesh = new THREE.Mesh( trunkGeometry, trunk.material );
        trunkMesh.name = 'monumental trunk';
        trunkMesh.userData.monumentalTrunk = {
            nodes: trunkNodes,
            positions,
            asymmetry,
            conduitWeight: parameters.conduitWeight ?? 1,
            loadDirection,
            informationRoute,
            growthSignature: null
        };
        group.add( trunkMesh );

        for ( const edge of hierarchy.edges )
        {
            if ( isTrunkEdge( edge ) ) continue;
            const startData = positions.get( edge.parent.id );
            const endData = positions.get( edge.child.id );
            const start = new THREE.Vector3( startData.x, startData.y, startData.z );
            const end = new THREE.Vector3( endData.x, endData.y, endData.z );
            const curve = createBranchCurve( start, end, edge, asymmetry );
            const radii = getConduitRadii( edge, parameters.conduitWeight ?? 1 );
            const routeSegment = informationRoute.byChildId.get( edge.child.id );
            const entry = edge.child.kind === 'terminal' ? terminal : limb;
            const geometry = createTaperedTubeGeometry(
                curve,
                radii.start,
                Math.max( radii.end, 0.045 ),
                28,
                14
            );
            if ( routeSegment ) applyInformationRouteAttributes( geometry, routeSegment );
            const mesh = new THREE.Mesh( geometry, entry.material );
            mesh.name = `${edge.parent.id} -> ${edge.child.id}`;
            mesh.userData.node = edge.child;
            if ( routeSegment ) mesh.userData.informationRoute = routeSegment;
            group.add( mesh );
        }

        const coreGeometry = createInformationCoreGeometry(
            informationRoute,
            parameters.conduitWeight ?? 1.34
        );
        const coreMesh = new THREE.Mesh( coreGeometry, informationCore.material );
        coreMesh.name = 'routed information core';
        coreMesh.renderOrder = 3;
        coreMesh.userData.informationCore = informationRoute;
        group.add( coreMesh );
        applyGrowthProgress();
    }

    function applyGrowthProgress()
    {
        const eligibleLatent = hierarchy.nodes.filter( ( node ) => node.latent && node.growthEligible !== false );
        const crownProgress = eligibleLatent.length > 0
            ? eligibleLatent.reduce( ( sum, node ) => sum + ( growthProgress.get( node.id ) ?? 0 ), 0 ) / eligibleLatent.length
            : 1;
        for ( const mesh of group.children )
        {
            if ( mesh.userData.informationCore )
            {
                mesh.visible = true;
                continue;
            }
            const monumentalTrunk = mesh.userData.monumentalTrunk;
            if ( monumentalTrunk )
            {
                const crownStep = Math.round( crownProgress * 28 ) / 28;
                const nodeSteps = monumentalTrunk.nodes.map( ( node ) => node.latent
                    ? Math.round( ( growthProgress.get( node.id ) ?? 0 ) * 28 ) / 28
                    : crownStep );
                const signature = nodeSteps.join( ':' );
                if ( signature !== monumentalTrunk.growthSignature )
                {
                    monumentalTrunk.growthSignature = signature;
                    const nodeScales = monumentalTrunk.nodes.map( ( node, index ) => node.latent
                        ? 0.48 + nodeSteps[index] * 0.52
                        : 0.58 + crownStep * 0.42 );
                    mesh.geometry.dispose();
                    mesh.geometry = createMonumentalTrunkGeometry(
                        monumentalTrunk.nodes,
                        monumentalTrunk.positions,
                        {
                            asymmetry: monumentalTrunk.asymmetry,
                            conduitWeight: monumentalTrunk.conduitWeight,
                            loadDirection: monumentalTrunk.loadDirection,
                            informationRoute: monumentalTrunk.informationRoute,
                            nodeScales
                        }
                    );
                }

                const metadata = mesh.geometry.userData.monumentalTrunk;
                const firstLatentIndex = monumentalTrunk.nodes.findIndex( ( node ) => node.latent );
                let visibleSegments = metadata.plantingSegmentCount + ( firstLatentIndex < 0
                    ? monumentalTrunk.nodes.length - 1
                    : firstLatentIndex - 1 ) * metadata.samplesPerSpan;
                let complete = firstLatentIndex < 0;
                if ( firstLatentIndex >= 0 )
                {
                    complete = true;
                    for ( let index = firstLatentIndex; index < monumentalTrunk.nodes.length; index += 1 )
                    {
                        const progress = growthProgress.get( monumentalTrunk.nodes[index].id ) ?? 0;
                        const spanSegments = Math.floor( progress * metadata.samplesPerSpan );
                        visibleSegments += spanSegments;
                        if ( spanSegments < metadata.samplesPerSpan )
                        {
                            complete = false;
                            break;
                        }
                    }
                }
                const indexCount = metadata.baseIndexCount
                    + visibleSegments * metadata.radialSegments * 6
                    + ( complete ? metadata.topIndexCount : 0 );
                mesh.geometry.setDrawRange( 0, Math.min( mesh.geometry.index.count, indexCount ) );
                mesh.visible = true;
                continue;
            }

            const node = mesh.userData.node;
            const progress = node.growthEligible === false
                ? 0
                : node.latent ? ( growthProgress.get( node.id ) ?? 0 ) : 1;
            const indexCount = mesh.geometry.index.count;
            const segmentSize = 14 * 6;
            const visibleCount = Math.floor( indexCount * progress / segmentSize ) * segmentSize;
            mesh.geometry.setDrawRange( 0, Math.min( indexCount, visibleCount ) );
            mesh.visible = progress > 0;
        }

        informationReady = informationRoute.nodes.every( ( node ) =>
            node.growthEligible !== false
            && ( !node.latent || ( growthProgress.get( node.id ) ?? 0 ) >= 0.999 )
        );
        if ( !informationReady )
        {
            informationStartElapsed = null;
            informationLastSpeed = null;
        }
    }

    rebuild( initialPositions, initialParameters );
    return {
        group,
        rebuild,
        update( elapsed, parameters = {} ) {
            let informationHead = -100;
            let packetCount = 0;
            const packetSpeed = Math.max(
                0.05,
                parameters.packetSpeed ?? defaultInformationSpeed
            );
            if ( informationReady )
            {
                if ( informationStartElapsed === null || informationLastSpeed !== packetSpeed )
                {
                    informationStartElapsed = elapsed;
                    informationLastSpeed = packetSpeed;
                }
                const travelDuration = ( informationRoute.totalDistance
                    + informationTrailLength ) / packetSpeed;
                const cycleDuration = travelDuration + informationPause;
                const phase = ( elapsed - informationStartElapsed ) % cycleDuration;
                if ( phase <= travelDuration )
                {
                    informationHead = phase * packetSpeed;
                    packetCount = 1;
                }
            }
            for ( const entry of materialEntries )
            {
                entry.uniforms.time.value = elapsed;
                entry.uniforms.relief.value = parameters.surfaceRelief ?? 0.1;
                entry.uniforms.response.value = parameters.motionFrozen ? 0 : ( parameters.structuralResponse ?? 0.22 );
            }
            informationCore.uniforms.time.value = elapsed;
            informationCore.uniforms.response.value = parameters.motionFrozen
                ? 0
                : ( parameters.structuralResponse ?? 0.22 );
            informationCore.uniforms.informationHead.value = informationHead;
            const activeSegment = informationHead >= 0
                ? informationRoute.segments.find( ( segment ) =>
                    informationHead >= segment.childDistance
                    && informationHead <= segment.parentDistance
                )
                : null;
            group.userData.routedLight = {
                terminalId: informationRoute.terminalId,
                startTier: informationRoute.terminal.growthTier ?? null,
                routeNodeIds: informationRoute.nodeIds,
                packetCount,
                headDistance: informationHead,
                totalDistance: informationRoute.totalDistance,
                packetSpeed,
                coreMeshCount: group.children.filter( ( mesh ) =>
                    mesh.userData.informationCore
                ).length,
                activeSegment: activeSegment
                    ? `${activeSegment.childId} -> ${activeSegment.parentId}`
                    : informationHead > informationRoute.totalDistance ? 'root fade' : null
            };
        },
        setVisible( visible ) {
            group.visible = visible;
        },
        setGrowthProgress( progress ) {
            growthProgress = progress;
            applyGrowthProgress();
        }
    };
}

import * as THREE from 'three';
import { createBranchCurve, createTaperedTubeGeometry, getConduitRadii } from './tree-layer.js';

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
        response: { value: 0.22 },
        emergence: { value: 0.78 },
        emergenceSpeed: { value: 0.58 },
        pulseSpeed: { value: 0.9 },
        goldPresence: { value: 0.3 },
        tierColourLock: { value: 0 },
        tierFloor: { value: 0.45 },
        tierPhase: { value: 1 },
        newestTierHold: { value: 1 },
        latestCohort: { value: 0 }
    };
    material.onBeforeCompile = ( shader ) => {
        shader.uniforms.treeTime = uniforms.time;
        shader.uniforms.treeRelief = uniforms.relief;
        shader.uniforms.treeResponse = uniforms.response;
        shader.uniforms.treeEmergence = uniforms.emergence;
        shader.uniforms.treeEmergenceSpeed = uniforms.emergenceSpeed;
        shader.uniforms.treePulseSpeed = uniforms.pulseSpeed;
        shader.uniforms.treeGoldPresence = uniforms.goldPresence;
        shader.uniforms.treeTierColourLock = uniforms.tierColourLock;
        shader.uniforms.treeTierFloor = uniforms.tierFloor;
        shader.uniforms.treeTierPhase = uniforms.tierPhase;
        shader.uniforms.treeNewestTierHold = uniforms.newestTierHold;
        shader.uniforms.treeLatestCohort = uniforms.latestCohort;
        shader.vertexShader = `
            uniform float treeTime;
            uniform float treeRelief;
            uniform float treeResponse;
            attribute float branchProgress;
            attribute float branchRouteStart;
            attribute float branchRouteLength;
            attribute float branchCohort;
            attribute float branchDepth;
            attribute float branchLimbPhase;
            varying float treeRoute;
            varying float treeCohortValue;
            varying float treeDepthValue;
            varying float treeLimbPhaseValue;
        ` + shader.vertexShader.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
            treeRoute = branchRouteStart + branchProgress * branchRouteLength;
            treeCohortValue = branchCohort;
            treeDepthValue = branchDepth;
            treeLimbPhaseValue = branchLimbPhase;
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
        shader.fragmentShader = `
            uniform float treeTime;
            uniform float treeEmergence;
            uniform float treeEmergenceSpeed;
            uniform float treePulseSpeed;
            uniform float treeGoldPresence;
            uniform float treeTierColourLock;
            uniform float treeTierFloor;
            uniform float treeTierPhase;
            uniform float treeNewestTierHold;
            uniform float treeLatestCohort;
            varying float treeRoute;
            varying float treeCohortValue;
            varying float treeDepthValue;
            varying float treeLimbPhaseValue;
        ` + shader.fragmentShader.replace(
            '#include <emissivemap_fragment>',
            `#include <emissivemap_fragment>
            float cycle = treeTime * treeEmergenceSpeed;
            float pulseCycle = treeTime * treePulseSpeed;

            // One inherited route coordinate crosses every parent-child junction.
            // It textures the signal within a tier, but no longer controls the
            // visibility of the crown as a whole.
            float routePhase = fract(
                treeRoute * 0.045 + pulseCycle * 0.055
                + treeLimbPhaseValue * 0.15915494 );
            float routeEnvelope = 0.5 + 0.5 * cos(
                ( routePhase - 0.5 ) * 6.2831853 );
            float routePresence = 0.24 + 0.76 * smoothstep( 0.14, 0.82, routeEnvelope );
            float coreSurge = pow( smoothstep( 0.42, 0.96, routeEnvelope ), 2.15 );
            float residual = pow( max( 0.0, sin(
                treeRoute * 0.41 + cycle * 0.54 + treeLimbPhaseValue ) ), 4.0 );

            // One trunk-release cohort owns one pulse and colour sequence.
            // Recursive depth and individual antler identity do not participate.
            float cohortTempo = 0.72 + fract( treeCohortValue * 0.371 ) * 0.22;
            float cohortClock = pulseCycle * cohortTempo
                + treeCohortValue * treeTierPhase * 2.0943951;
            float pulseWave = pow( 0.5 + 0.5 * sin( cohortClock ), 1.45 );
            float latestCohortMask = 1.0 - smoothstep( 0.05, 0.25,
                abs( treeCohortValue - treeLatestCohort ) );
            float latestFloor = max( treeTierFloor, 0.56 );
            float cohortFloor = mix( treeTierFloor, latestFloor,
                latestCohortMask * treeNewestTierHold );
            float visibilityPulse = cohortFloor + ( 1.0 - cohortFloor ) * pulseWave;

            float colourCohort = mix(
                treeCohortValue, 0.0, step( 0.5, treeTierColourLock ) );
            // Colour is a slow state sequence; luminosity is the primary motion.
            float colourClock = cycle * 0.035
                + colourCohort * treeTierPhase * 2.01;
            float iceMoment = 0.5 + 0.5 * sin( colourClock );
            float goldMoment = smoothstep( 1.0 - treeGoldPresence, 1.0,
                0.5 + 0.5 * sin( colourClock + 2.0943951 ) );
            // HDR values are intentional: the bright core of an active tier must
            // cross the bloom threshold, while the dark shell remains physical.
            vec3 cyan = vec3( 0.01, 0.42, 1.1 );
            vec3 ice = vec3( 0.08, 0.85, 2.0 );
            vec3 gold = vec3( 2.2, 0.95, 0.02 );
            vec3 emergenceColour = mix( cyan, ice,
                iceMoment * ( 0.28 + coreSurge * 0.72 ) );
            emergenceColour = mix( emergenceColour, gold, goldMoment * 0.68 );

            // Internal light is strongest where a contained core would illuminate
            // the material boundary. The centre-facing surface remains subdued.
            float internalRim = pow( 1.0 - abs( dot(
                normalize( normal ), normalize( vViewPosition ) ) ), 1.7 );
            float containment = 0.12 + internalRim * 0.76;
            float treeRadiance = 0.08 + routePresence
                * ( visibilityPulse * ( 0.16 + coreSurge * 0.78 ) + residual * 0.08 );
            float trunkMask = 1.0 - smoothstep( 3.0, 4.0, treeDepthValue );
            totalEmissiveRadiance += emergenceColour * treeRadiance * treeEmergence
                * containment * ( 1.0 - trunkMask );`
        );
        material.userData.shader = shader;
    };
    material.customProgramCacheKey = () => `engineered-tree-${colour}`;
    return { material, uniforms };
}

export function createEngineeredTreeLayer( hierarchy, initialPositions, initialParameters = {} )
{
    const group = new THREE.Group();
    group.name = 'engineered-tree-body';
    const trunk = createMaterial( 0x160f0c, 0.38, 0.62 );
    const limb = createMaterial( 0x121517, 0.34, 0.68 );
    const terminal = createMaterial( 0x1b1e1e, 0.3, 0.61 );
    const materialEntries = [ trunk, limb, terminal ];
    let growthProgress = new Map();
    let latestVisibleCohort = 0;

    function principalLimb( node )
    {
        if ( node.limb ) return node.limb;
        let cursor = node;
        while ( cursor.parentId && cursor.parentId !== 'meaning' ) cursor = hierarchy.byId.get( cursor.parentId );
        return cursor.parentId === 'meaning' ? cursor.id : 'trunk';
    }

    function growthCohort( node )
    {
        let cursor = node;
        while ( cursor )
        {
            if ( cursor.structuralRole === 'branch-site' )
            {
                return hierarchy.byId.get( cursor.parentId )?.trunkStage ?? 0;
            }
            cursor = cursor.parentId ? hierarchy.byId.get( cursor.parentId ) : null;
        }
        return 0;
    }

    function addConstantAttribute( geometry, name, value )
    {
        const values = new Float32Array( geometry.getAttribute( 'position' ).count );
        values.fill( value );
        geometry.setAttribute( name, new THREE.Float32BufferAttribute( values, 1 ) );
    }

    function applyEmergenceAttributes( geometry, emergence )
    {
        addConstantAttribute( geometry, 'branchRouteStart', emergence.routeStart );
        addConstantAttribute( geometry, 'branchRouteLength', emergence.routeLength );
        addConstantAttribute( geometry, 'branchCohort', emergence.cohort );
        addConstantAttribute( geometry, 'branchDepth', emergence.depth );
        addConstantAttribute( geometry, 'branchLimbPhase', emergence.limbPhase );
    }

    function rebuild( positions, parameters = {} )
    {
        while ( group.children.length > 0 )
        {
            const child = group.children.at( -1 );
            group.remove( child );
            child.geometry.dispose();
        }

        const routeDistances = new Map( [ [ hierarchy.root.id, 0 ] ] );
        for ( const edge of hierarchy.edges )
        {
            const startData = positions.get( edge.parent.id );
            const endData = positions.get( edge.child.id );
            const start = new THREE.Vector3( startData.x, startData.y, startData.z );
            const end = new THREE.Vector3( endData.x, endData.y, endData.z );
            const curve = createBranchCurve( start, end, edge, parameters.asymmetry ?? 0.55 );
            const routeStart = routeDistances.get( edge.parent.id ) ?? 0;
            const routeLength = curve.getLength();
            routeDistances.set( edge.child.id, routeStart + routeLength );
            const radii = getConduitRadii( edge, parameters.conduitWeight ?? 1 );
            const isTrunk = ( edge.parent.kind === 'root' || edge.parent.kind === 'trunk' ) && edge.child.kind === 'trunk';
            const entry = isTrunk ? trunk : edge.child.kind === 'terminal' ? terminal : limb;
            const limbPhases = { operations: 0, finance: 2.094, resources: 4.189, trunk: 0.72 };
            const cohort = growthCohort( edge.child );
            const emergence = {
                limbPhase: limbPhases[principalLimb( edge.child )] ?? 0,
                depth: isTrunk ? 0 : edge.child.depth,
                cohort,
                routeStart,
                routeLength
            };
            const geometry = createTaperedTubeGeometry(
                curve,
                radii.start,
                Math.max( radii.end, 0.045 ),
                28,
                14
            );
            applyEmergenceAttributes( geometry, emergence );
            const mesh = new THREE.Mesh( geometry, entry.material );
            mesh.name = `${edge.parent.id} -> ${edge.child.id}`;
            mesh.userData.emergence = emergence;
            mesh.userData.node = edge.child;
            if ( isTrunk )
            {
                mesh.userData.ringGrowth = {
                    curve,
                    startRadius: radii.start,
                    endRadius: Math.max( radii.end, 0.045 ),
                    step: -1
                };
            }
            group.add( mesh );
        }
        applyGrowthProgress();
    }

    function applyGrowthProgress()
    {
        const eligibleLatent = hierarchy.nodes.filter( ( node ) => node.latent && node.growthEligible !== false );
        const crownProgress = eligibleLatent.length > 0
            ? eligibleLatent.reduce( ( sum, node ) => sum + ( growthProgress.get( node.id ) ?? 0 ), 0 ) / eligibleLatent.length
            : 1;
        latestVisibleCohort = 0;
        for ( const mesh of group.children )
        {
            const node = mesh.userData.node;
            const progress = node.growthEligible === false
                ? 0
                : node.latent ? ( growthProgress.get( node.id ) ?? 0 ) : 1;
            if ( progress > 0.04 )
            {
                latestVisibleCohort = Math.max(
                    latestVisibleCohort,
                    mesh.userData.emergence.cohort
                );
            }
            const ringGrowth = mesh.userData.ringGrowth;
            if ( ringGrowth )
            {
                const ringProgress = node.latent
                    ? 0.48 + progress * 0.52
                    : 0.58 + crownProgress * 0.42;
                const step = Math.round( ringProgress * 28 );
                if ( step !== ringGrowth.step )
                {
                    ringGrowth.step = step;
                    mesh.geometry.dispose();
                    mesh.geometry = createTaperedTubeGeometry(
                        ringGrowth.curve,
                        ringGrowth.startRadius * ringProgress,
                        ringGrowth.endRadius * ringProgress,
                        28,
                        14
                    );
                    applyEmergenceAttributes( mesh.geometry, mesh.userData.emergence );
                }
            }
            const indexCount = mesh.geometry.index.count;
            const segmentSize = 14 * 6;
            const visibleCount = Math.floor( indexCount * progress / segmentSize ) * segmentSize;
            mesh.geometry.setDrawRange( 0, Math.min( indexCount, visibleCount ) );
            mesh.visible = progress > 0;
        }
    }

    rebuild( initialPositions, initialParameters );
    return {
        group,
        rebuild,
        update( elapsed, parameters = {} ) {
            for ( const entry of materialEntries )
            {
                entry.uniforms.time.value = elapsed;
                entry.uniforms.relief.value = parameters.surfaceRelief ?? 0.1;
                entry.uniforms.response.value = parameters.motionFrozen ? 0 : ( parameters.structuralResponse ?? 0.22 );
                entry.uniforms.emergence.value = parameters.emergenceIntensity ?? 0.78;
                entry.uniforms.emergenceSpeed.value = parameters.emergenceSpeed ?? 0.58;
                entry.uniforms.pulseSpeed.value = parameters.pulseSpeed ?? 0.9;
                entry.uniforms.goldPresence.value = parameters.goldPresence ?? 0.3;
                entry.uniforms.tierColourLock.value = parameters.tierColourLock ? 1 : 0;
                entry.uniforms.tierFloor.value = parameters.tierFloor ?? 0.45;
                entry.uniforms.tierPhase.value = parameters.tierPhase ?? 1;
                entry.uniforms.newestTierHold.value = parameters.newestTierHold ?? 1;
                entry.uniforms.latestCohort.value = latestVisibleCohort;
            }
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

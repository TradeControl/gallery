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
        emergence: { value: 0.86 },
        emergenceSpeed: { value: 0.58 },
        goldPresence: { value: 0.2 },
        edgePhase: { value: 0 },
        limbPhase: { value: 0 },
        depth: { value: 0 }
    };
    material.onBeforeCompile = ( shader ) => {
        shader.uniforms.treeTime = uniforms.time;
        shader.uniforms.treeRelief = uniforms.relief;
        shader.uniforms.treeResponse = uniforms.response;
        shader.uniforms.treeEmergence = uniforms.emergence;
        shader.uniforms.treeEmergenceSpeed = uniforms.emergenceSpeed;
        shader.uniforms.treeGoldPresence = uniforms.goldPresence;
        shader.uniforms.treeEdgePhase = uniforms.edgePhase;
        shader.uniforms.treeLimbPhase = uniforms.limbPhase;
        shader.uniforms.treeDepth = uniforms.depth;
        shader.vertexShader = `
            uniform float treeTime;
            uniform float treeRelief;
            uniform float treeResponse;
            varying vec3 treePosition;
        ` + shader.vertexShader.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
            treePosition = position;
            float brushed = sin( position.y * 23.0 + position.x * 7.0 + position.z * 5.0 );
            float tension = sin( treeTime * 0.32 + position.y * 0.9 );
            transformed += normalize( objectNormal ) * brushed * treeRelief * 0.004;
            transformed.xz *= 1.0 + tension * treeResponse * 0.004;`
        );
        shader.fragmentShader = `
            uniform float treeTime;
            uniform float treeEmergence;
            uniform float treeEmergenceSpeed;
            uniform float treeGoldPresence;
            uniform float treeEdgePhase;
            uniform float treeLimbPhase;
            uniform float treeDepth;
            varying vec3 treePosition;
        ` + shader.fragmentShader.replace(
            '#include <emissivemap_fragment>',
            `#include <emissivemap_fragment>
            float cycle = treeTime * treeEmergenceSpeed;

            // Broad, topology-aware disclosure moves between limbs and generations.
            float generationWave = 0.5 + 0.5 * sin( cycle * 0.72 - treeDepth * 0.78 + treeLimbPhase );
            float conduitWave = 0.5 + 0.5 * sin( treePosition.y * 1.35 - cycle * 1.62 + treeEdgePhase );
            float disclosure = smoothstep( 0.48, 0.88, generationWave * 0.68 + conduitWave * 0.32 );

            // Several spatial and temporal scales create momentary concentrations
            // rather than a single decorative pulse travelling over every surface.
            float fineVein = 0.5 + 0.5 * sin(
                treePosition.y * 7.1 + treePosition.x * 2.7 - treePosition.z * 1.9
                - cycle * 3.4 + treeEdgePhase * 2.3 );
            float crossVein = 0.5 + 0.5 * sin(
                treePosition.y * 2.6 - treePosition.x * 5.2 + treePosition.z * 3.7
                + cycle * 1.1 + treeLimbPhase );
            float filaments = smoothstep( 0.68, 0.96, fineVein * 0.62 + crossVein * 0.38 );
            float flashClock = max( 0.0, sin(
                cycle * 3.7 + treeEdgePhase * 5.1 + treeDepth * 0.83 + treeLimbPhase ) );
            float flash = pow( flashClock, 18.0 )
                * smoothstep( 0.58, 0.96, 0.5 + 0.5 * sin(
                    treePosition.y * 5.4 - cycle * 4.8 + treeEdgePhase ) );
            float afterglow = pow( max( 0.0, sin(
                cycle * 1.43 + treeLimbPhase - treeDepth * 0.47 ) ), 5.0 );

            float goldMoment = smoothstep( 1.0 - treeGoldPresence, 1.0,
                0.5 + 0.5 * sin( cycle * 0.67 + treeLimbPhase + treeDepth * 0.31 ) );
            vec3 deepCyan = vec3( 0.015, 0.16, 0.34 );
            vec3 ice = vec3( 0.28, 0.82, 1.42 );
            vec3 gold = vec3( 1.35, 0.62, 0.08 );
            vec3 emergenceColour = mix( mix( deepCyan, ice, filaments ), gold, goldMoment );
            float treeRadiance = disclosure * ( 0.2 + filaments * 0.72 + afterglow * 0.28 ) + flash * 1.75;
            float trunkMask = 1.0 - smoothstep( 3.0, 4.0, treeDepth );
            totalEmissiveRadiance += emergenceColour * treeRadiance * treeEmergence
                * ( 1.0 - trunkMask );`
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

    function stableUnit( id )
    {
        let hash = 2166136261;
        for ( let index = 0; index < id.length; index += 1 )
        {
            hash ^= id.charCodeAt( index );
            hash = Math.imul( hash, 16777619 );
        }
        return ( hash >>> 0 ) / 4294967295;
    }

    function principalLimb( node )
    {
        let cursor = node;
        while ( cursor.parentId && cursor.parentId !== 'meaning' ) cursor = hierarchy.byId.get( cursor.parentId );
        return cursor.parentId === 'meaning' ? cursor.id : 'trunk';
    }

    function rebuild( positions, parameters = {} )
    {
        while ( group.children.length > 0 )
        {
            const child = group.children.at( -1 );
            group.remove( child );
            child.geometry.dispose();
        }

        for ( const edge of hierarchy.edges )
        {
            const startData = positions.get( edge.parent.id );
            const endData = positions.get( edge.child.id );
            const start = new THREE.Vector3( startData.x, startData.y, startData.z );
            const end = new THREE.Vector3( endData.x, endData.y, endData.z );
            const curve = createBranchCurve( start, end, edge, parameters.asymmetry ?? 0.55 );
            const radii = getConduitRadii( edge, parameters.conduitWeight ?? 1 );
            const isTrunk = ( edge.parent.kind === 'root' || edge.parent.kind === 'trunk' ) && edge.child.kind === 'trunk';
            const entry = isTrunk ? trunk : edge.child.kind === 'terminal' ? terminal : limb;
            const mesh = new THREE.Mesh(
                createTaperedTubeGeometry( curve, radii.start, Math.max( radii.end, 0.045 ), 28, 14 ),
                entry.material
            );
            mesh.name = `${edge.parent.id} -> ${edge.child.id}`;
            const limbPhases = { operations: 0, finance: 2.094, resources: 4.189, trunk: 0.72 };
            mesh.userData.emergence = {
                edgePhase: stableUnit( edge.child.id ) * Math.PI * 0.72,
                limbPhase: limbPhases[principalLimb( edge.child )] ?? 0,
                depth: edge.child.depth
            };
            mesh.userData.node = edge.child;
            mesh.onBeforeRender = () => {
                entry.uniforms.edgePhase.value = mesh.userData.emergence.edgePhase;
                entry.uniforms.limbPhase.value = mesh.userData.emergence.limbPhase;
                entry.uniforms.depth.value = mesh.userData.emergence.depth;
            };
            group.add( mesh );
        }
        applyGrowthProgress();
    }

    function applyGrowthProgress()
    {
        for ( const mesh of group.children )
        {
            const node = mesh.userData.node;
            const progress = node.latent ? ( growthProgress.get( node.id ) ?? 0 ) : 1;
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
                entry.uniforms.emergence.value = parameters.emergenceIntensity ?? 0.86;
                entry.uniforms.emergenceSpeed.value = parameters.emergenceSpeed ?? 0.58;
                entry.uniforms.goldPresence.value = parameters.goldPresence ?? 0.2;
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

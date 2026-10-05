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

export function createEngineeredTreeLayer( hierarchy, initialPositions, initialParameters = {} )
{
    const group = new THREE.Group();
    group.name = 'engineered-tree-body';
    const trunk = createMaterial( 0x160f0c, 0.38, 0.62 );
    const limb = createMaterial( 0x121517, 0.34, 0.68 );
    const terminal = createMaterial( 0x1b1e1e, 0.3, 0.61 );
    const materialEntries = [ trunk, limb, terminal ];
    let growthProgress = new Map();

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
            const geometry = createTaperedTubeGeometry(
                curve,
                radii.start,
                Math.max( radii.end, 0.045 ),
                28,
                14
            );
            const mesh = new THREE.Mesh( geometry, entry.material );
            mesh.name = `${edge.parent.id} -> ${edge.child.id}`;
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
        for ( const mesh of group.children )
        {
            const node = mesh.userData.node;
            const progress = node.growthEligible === false
                ? 0
                : node.latent ? ( growthProgress.get( node.id ) ?? 0 ) : 1;
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

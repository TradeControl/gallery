import * as THREE from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { createBranchCurve, getConduitRadii } from './tree-layer.js';

const organicColours = {
    root: new THREE.Color( 0x594133 ),
    trunk: new THREE.Color( 0x675447 ),
    total: new THREE.Color( 0x746756 ),
    category: new THREE.Color( 0x817768 ),
    terminal: new THREE.Color( 0xa09682 )
};

function createMaterial()
{
    const material = new THREE.MeshPhysicalMaterial( {
        color: 0xc1b7a2,
        vertexColors: true,
        roughness: 0.4,
        metalness: 0.52,
        clearcoat: 0.28,
        clearcoatRoughness: 0.52
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
            float grain = sin( position.y * 29.0 + position.x * 11.0 )
                * sin( position.z * 23.0 - position.y * 7.0 );
            float slowLoad = sin( treeTime * 0.34 + position.y * 2.2 + position.x * 0.7 );
            transformed += normalize( objectNormal ) * grain * treeRelief * 0.008;
            transformed.xz *= 1.0 + slowLoad * treeResponse * 0.006;`
        );
    };
    material.customProgramCacheKey = () => 'tree-organic-surface-v1';

    return { material, uniforms };
}

export function createOrganicTreeLayer( hierarchy, positions, initialParameters = {} )
{
    const { material, uniforms } = createMaterial();
    const surface = new MarchingCubes( 144, material, false, true, 320000 );
    surface.name = 'continuous-tree-surface';
    surface.isolation = 80;
    surface.castShadow = true;
    surface.receiveShadow = true;

    function rebuild( nextPositions, parameters = {} )
    {
        const conduitWeight = parameters.conduitWeight ?? 1;
        const asymmetry = parameters.asymmetry ?? 0.55;
        const points = [ ...nextPositions.values() ];
        const bounds = new THREE.Box3();
        for ( const point of points ) bounds.expandByPoint( new THREE.Vector3( point.x, point.y, point.z ) );
        const centre = bounds.getCenter( new THREE.Vector3() );
        const size = bounds.getSize( new THREE.Vector3() );
        const side = Math.max( size.x, size.y, size.z ) * 1.16;
        const cubeMinimum = centre.clone().addScalar( -side * 0.5 );

        function addFieldSegment( start, end, startRadius, endRadius, startColour, endColour )
        {
            const size = surface.size;
            const influence = Math.max( startRadius, endRadius ) * 1.45;
            const minX = Math.max( 1, Math.floor( ( Math.min( start.x, end.x ) - influence ) * size ) );
            const maxX = Math.min( size - 2, Math.ceil( ( Math.max( start.x, end.x ) + influence ) * size ) );
            const minY = Math.max( 1, Math.floor( ( Math.min( start.y, end.y ) - influence ) * size ) );
            const maxY = Math.min( size - 2, Math.ceil( ( Math.max( start.y, end.y ) + influence ) * size ) );
            const minZ = Math.max( 1, Math.floor( ( Math.min( start.z, end.z ) - influence ) * size ) );
            const maxZ = Math.min( size - 2, Math.ceil( ( Math.max( start.z, end.z ) + influence ) * size ) );
            const segment = end.clone().sub( start );
            const segmentLengthSquared = segment.lengthSq();
            const sample = new THREE.Vector3();
            const offset = new THREE.Vector3();

            for ( let z = minZ; z <= maxZ; z += 1 )
            {
                const zOffset = z * surface.size2;
                for ( let y = minY; y <= maxY; y += 1 )
                {
                    const yOffset = zOffset + y * size;
                    for ( let x = minX; x <= maxX; x += 1 )
                    {
                        sample.set( x / size, y / size, z / size );
                        offset.copy( sample ).sub( start );
                        const t = segmentLengthSquared > 0
                            ? THREE.MathUtils.clamp( offset.dot( segment ) / segmentLengthSquared, 0, 1 )
                            : 0;
                        const closest = start.clone().addScaledVector( segment, t );
                        const distanceSquared = sample.distanceToSquared( closest );
                        if ( distanceSquared > influence * influence ) continue;
                        const radius = THREE.MathUtils.lerp( startRadius, endRadius, t );
                        const radiusSquared = radius * radius;
                        const value = surface.isolation * radiusSquared / Math.max( distanceSquared, 0.00000001 );
                        const fieldIndex = yOffset + x;
                        if ( value <= surface.field[fieldIndex] ) continue;
                        surface.field[fieldIndex] = value;
                        surface.palette[fieldIndex * 3] = THREE.MathUtils.lerp( startColour.r, endColour.r, t );
                        surface.palette[fieldIndex * 3 + 1] = THREE.MathUtils.lerp( startColour.g, endColour.g, t );
                        surface.palette[fieldIndex * 3 + 2] = THREE.MathUtils.lerp( startColour.b, endColour.b, t );
                    }
                }
            }
        }

        surface.reset();
        for ( const edge of hierarchy.edges )
        {
            const startData = nextPositions.get( edge.parent.id );
            const endData = nextPositions.get( edge.child.id );
            const start = new THREE.Vector3( startData.x, startData.y, startData.z );
            const end = new THREE.Vector3( endData.x, endData.y, endData.z );
            const curve = createBranchCurve( start, end, edge, asymmetry );
            const radii = getConduitRadii( edge, conduitWeight );
            const curveLength = curve.getLength();
            const steps = Math.max( 6, Math.ceil( curveLength / 0.18 ) );
            const startColour = organicColours[edge.parent.kind];
            const endColour = organicColours[edge.child.kind];

            for ( let step = 0; step < steps; step += 1 )
            {
                const t0 = step / steps;
                const t1 = ( step + 1 ) / steps;
                const point0 = curve.getPointAt( t0 ).sub( cubeMinimum ).multiplyScalar( 1 / side );
                const point1 = curve.getPointAt( t1 ).sub( cubeMinimum ).multiplyScalar( 1 / side );
                const radius0 = Math.max( THREE.MathUtils.lerp( radii.start, radii.end, t0 ), 0.15 ) / side;
                const radius1 = Math.max( THREE.MathUtils.lerp( radii.start, radii.end, t1 ), 0.15 ) / side;
                const colour0 = startColour.clone().lerp( endColour, t0 );
                const colour1 = startColour.clone().lerp( endColour, t1 );
                addFieldSegment( point0, point1, radius0, radius1, colour0, colour1 );
            }
        }

        surface.update();
        surface.scale.setScalar( side * 0.5 );
        surface.position.copy( centre );
        uniforms.relief.value = parameters.surfaceRelief ?? 0.1;
        uniforms.response.value = parameters.structuralResponse ?? 0.22;
    }

    rebuild( positions, initialParameters );

    return {
        group: surface,
        rebuild,
        update( elapsed, parameters = {} ) {
            uniforms.time.value = elapsed;
            uniforms.relief.value = parameters.surfaceRelief ?? uniforms.relief.value;
            uniforms.response.value = parameters.motionFrozen ? 0 : ( parameters.structuralResponse ?? uniforms.response.value );
        },
        setVisible( visible ) {
            surface.visible = visible;
        }
    };
}

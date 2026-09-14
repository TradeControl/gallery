import * as THREE from 'three';

export function createGaussianMembrane( parameters, options = {} )
{
    const size = options.size ?? 24;

    function height( x, z )
    {
        return -parameters.depth * Math.exp( -( x * x + z * z ) / ( parameters.width * parameters.width ) );
    }

    function gradient( x, z )
    {
        const widthSquared = parameters.width * parameters.width;
        const factor = 2 * parameters.depth * Math.exp( -( x * x + z * z ) / widthSquared ) / widthSquared;
        return { x: factor * x, z: factor * z };
    }

    function createGeometry( segments )
    {
        const geometry = new THREE.PlaneGeometry( size, size, segments, segments );
        geometry.rotateX( -Math.PI / 2 );
        geometry.userData.materialPositions = Float32Array.from( geometry.attributes.position.array );
        return geometry;
    }

    function deform( geometry )
    {
        const positions = geometry.attributes.position;
        const materialPositions = geometry.userData.materialPositions;
        for ( let index = 0; index < positions.count; index += 1 )
        {
            const offset = index * 3;
            const x = materialPositions[offset];
            const z = materialPositions[offset + 2];
            positions.setXYZ( index, x, height( x, z ), z );
        }
        positions.needsUpdate = true;
        geometry.computeVertexNormals();
        geometry.computeBoundingSphere();
    }

    return { height, gradient, createGeometry, deform, size };
}

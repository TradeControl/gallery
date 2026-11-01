import * as THREE from 'three';

export const compositionTerrainDepthRenderOrder = -10;

function triangleCount( geometry )
{
    const index = geometry.getIndex();
    return index
        ? index.count / 3
        : geometry.getAttribute( 'position' ).count / 3;
}

export function createCompositionTerrainDepthOwner( {
    scene,
    terrainSurface
} )
{
    if ( !scene?.isObject3D || typeof scene.add !== 'function' )
    {
        throw new TypeError(
            'A composition terrain-depth owner requires a Three.js scene.'
        );
    }
    if ( !terrainSurface?.isMesh )
    {
        throw new TypeError(
            'A composition terrain-depth owner requires a terrain mesh.'
        );
    }
    const geometry = terrainSurface.geometry;
    if ( !geometry?.isBufferGeometry
        || !geometry.getAttribute( 'position' ) )
    {
        throw new TypeError(
            'A composition terrain-depth owner requires terrain geometry.'
        );
    }

    const material = new THREE.MeshBasicMaterial( {
        colorWrite: false,
        depthWrite: true,
        depthTest: true,
        depthFunc: THREE.LessEqualDepth,
        transparent: false,
        opacity: 1,
        side: THREE.DoubleSide,
        blending: THREE.NoBlending,
        toneMapped: false,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1
    } );
    material.name = 'Colourless casting-terrain depth material';

    const mesh = new THREE.Mesh( geometry, material );
    mesh.name = 'Colourless casting-terrain depth owner';
    mesh.renderOrder = compositionTerrainDepthRenderOrder;
    mesh.matrixAutoUpdate = false;
    terrainSurface.updateWorldMatrix( true, false );
    mesh.matrix.copy( terrainSurface.matrixWorld );
    mesh.frustumCulled = terrainSurface.frustumCulled;
    scene.add( mesh );

    let disposed = false;
    let visible = true;
    let snapshot = null;

    function assertActive()
    {
        if ( disposed )
        {
            throw new Error( 'The composition terrain-depth owner is disposed.' );
        }
    }

    function publishSnapshot()
    {
        snapshot = Object.freeze( {
            status: visible ? 'active' : 'hidden',
            ownership: 'borrowed-live-geometry',
            geometryOwner: 'universe-membrane',
            geometryBorrowed: true,
            sourceName: terrainSurface.name,
            sourceGeometryUuid: terrainSurface.geometry.uuid,
            sourceMaterialUuid: terrainSurface.material?.uuid ?? null,
            geometryUuid: mesh.geometry.uuid,
            materialUuid: material.uuid,
            vertexCount: geometry.getAttribute( 'position' ).count,
            triangleCount: triangleCount( geometry ),
            textureInputCount: 0,
            renderOrder: mesh.renderOrder,
            colorWrite: material.colorWrite,
            depthWrite: material.depthWrite,
            depthTest: material.depthTest,
            depthFunction: material.depthFunc,
            transparent: material.transparent,
            ordinaryDepth: true
        } );
        mesh.userData.compositionTerrainDepth = snapshot;
        return snapshot;
    }

    publishSnapshot();

    return {
        group: mesh,
        mesh,
        material,
        setVisible( nextVisible ) {
            assertActive();
            visible = Boolean( nextVisible );
            mesh.visible = visible;
            publishSnapshot();
            return visible;
        },
        getSnapshot() {
            return snapshot;
        },
        dispose() {
            if ( disposed ) return;
            disposed = true;
            scene.remove( mesh );
            material.dispose();
            snapshot = null;
        }
    };
}

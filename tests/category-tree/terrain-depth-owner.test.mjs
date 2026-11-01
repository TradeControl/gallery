import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as THREE from 'three';
import {
    compositionTerrainDepthRenderOrder,
    createCompositionTerrainDepthOwner
} from '../../src/category-tree/composition/terrain-depth-owner.js';
import {
    compositionSubstrateRenderOrder
} from '../../src/category-tree/composition/substrate-instance.js';

const compositionHtml = readFileSync(
    new URL( '../../src/category-tree/composition/index.html', import.meta.url ),
    'utf8'
);
const compositionMain = readFileSync(
    new URL( '../../src/category-tree/composition/main.js', import.meta.url ),
    'utf8'
);
const depthOwnerSource = readFileSync(
    new URL(
        '../../src/category-tree/composition/terrain-depth-owner.js',
        import.meta.url
    ),
    'utf8'
);
const substrateSource = readFileSync(
    new URL(
        '../../src/category-tree/composition/substrate-instance.js',
        import.meta.url
    ),
    'utf8'
);

function createFixture()
{
    const scene = new THREE.Scene();
    const retained = new THREE.Group();
    retained.name = 'Unrelated composition component';
    scene.add( retained );

    const geometry = new THREE.CircleGeometry( 9.5, 32 );
    geometry.rotateX( -Math.PI * 0.5 );
    const sourceMaterial = new THREE.MeshStandardMaterial( {
        color: 0x4a3326
    } );
    const terrainSurface = new THREE.Mesh( geometry, sourceMaterial );
    terrainSurface.name = 'Detached Gaussian membrane surface';
    terrainSurface.position.set( 1.25, -0.5, 2.75 );
    terrainSurface.rotation.y = 0.35;
    terrainSurface.scale.setScalar( 1.1 );
    terrainSurface.renderOrder = 7;
    terrainSurface.visible = true;

    const owner = createCompositionTerrainDepthOwner( {
        scene,
        terrainSurface
    } );
    return {
        scene,
        retained,
        geometry,
        sourceMaterial,
        terrainSurface,
        owner
    };
}

test( 'the depth owner borrows the live radial terrain without touching its source', () => {
    const fixture = createFixture();
    const {
        scene,
        retained,
        geometry,
        sourceMaterial,
        terrainSurface,
        owner
    } = fixture;
    const snapshot = owner.getSnapshot();

    assert.equal( terrainSurface.parent, null );
    assert.equal( terrainSurface.geometry, geometry );
    assert.equal( terrainSurface.material, sourceMaterial );
    assert.equal( terrainSurface.visible, true );
    assert.equal( terrainSurface.renderOrder, 7 );
    assert.deepEqual( terrainSurface.position.toArray(), [ 1.25, -0.5, 2.75 ] );
    assert.deepEqual( terrainSurface.scale.toArray(), [ 1.1, 1.1, 1.1 ] );

    assert.equal( owner.group, owner.mesh );
    assert.equal( owner.mesh.parent, scene );
    assert.equal( scene.children.includes( retained ), true );
    assert.equal( scene.children.includes( terrainSurface ), false );
    assert.equal( owner.mesh.geometry, geometry );
    assert.equal( owner.mesh.matrixAutoUpdate, false );
    assert.equal( owner.mesh.matrix.equals( terrainSurface.matrixWorld ), true );
    assert.equal( owner.mesh.renderOrder, compositionTerrainDepthRenderOrder );
    assert.equal( owner.mesh.renderOrder, -10 );

    assert.equal( snapshot.status, 'active' );
    assert.equal( snapshot.ownership, 'borrowed-live-geometry' );
    assert.equal( snapshot.geometryOwner, 'universe-membrane' );
    assert.equal( snapshot.geometryBorrowed, true );
    assert.equal( snapshot.sourceName, terrainSurface.name );
    assert.equal( snapshot.sourceGeometryUuid, geometry.uuid );
    assert.equal( snapshot.sourceMaterialUuid, sourceMaterial.uuid );
    assert.equal( snapshot.geometryUuid, geometry.uuid );
    assert.equal( snapshot.materialUuid, owner.material.uuid );
    assert.equal( snapshot.vertexCount,
        geometry.getAttribute( 'position' ).count );
    assert.equal( snapshot.triangleCount, geometry.getIndex().count / 3 );
    assert.equal( snapshot.textureInputCount, 0 );
    assert.equal( snapshot.ordinaryDepth, true );
    assert.equal( snapshot.renderOrder, -10 );

    owner.dispose();
    geometry.dispose();
    sourceMaterial.dispose();
} );

test( 'the owned material writes ordinary depth and absolutely no colour', () => {
    const fixture = createFixture();
    const { owner } = fixture;
    const { material } = owner;
    const textures = Object.values( material ).filter(
        ( value ) => value?.isTexture
    );

    assert.equal( material.isMeshBasicMaterial, true );
    assert.equal( material.colorWrite, false );
    assert.equal( material.depthWrite, true );
    assert.equal( material.depthTest, true );
    assert.equal( material.depthFunc, THREE.LessEqualDepth );
    assert.equal( material.transparent, false );
    assert.equal( material.opacity, 1 );
    assert.equal( material.side, THREE.DoubleSide );
    assert.equal( material.blending, THREE.NoBlending );
    assert.equal( material.toneMapped, false );
    assert.equal( material.polygonOffset, true );
    assert.equal( material.polygonOffsetFactor, 1 );
    assert.equal( material.polygonOffsetUnits, 1 );
    assert.deepEqual( textures, [] );

    const snapshot = owner.getSnapshot();
    assert.equal( snapshot.colorWrite, false );
    assert.equal( snapshot.depthWrite, true );
    assert.equal( snapshot.depthTest, true );
    assert.equal( snapshot.depthFunction, THREE.LessEqualDepth );
    assert.equal( snapshot.transparent, false );

    owner.dispose();
    fixture.geometry.dispose();
    fixture.sourceMaterial.dispose();
} );

test( 'A/B visibility cycles allocate nothing and alter no unrelated state', () => {
    const fixture = createFixture();
    const { scene, retained, terrainSurface, owner } = fixture;
    const geometry = owner.mesh.geometry;
    const material = owner.material;
    const geometryUuid = geometry.uuid;
    const materialUuid = material.uuid;
    const childCount = scene.children.length;

    assert.equal( owner.setVisible( false ), false );
    assert.equal( owner.group.visible, false );
    assert.equal( owner.getSnapshot().status, 'hidden' );
    assert.equal( owner.setVisible( true ), true );
    assert.equal( owner.group.visible, true );
    assert.equal( owner.getSnapshot().status, 'active' );
    assert.equal( owner.mesh.geometry, geometry );
    assert.equal( owner.material, material );
    assert.equal( owner.mesh.geometry.uuid, geometryUuid );
    assert.equal( owner.material.uuid, materialUuid );
    assert.equal( scene.children.length, childCount );
    assert.equal( scene.children.includes( retained ), true );
    assert.equal( retained.visible, true );
    assert.equal( terrainSurface.parent, null );
    assert.equal( terrainSurface.visible, true );
    assert.equal( terrainSurface.renderOrder, 7 );

    owner.dispose();
    fixture.geometry.dispose();
    fixture.sourceMaterial.dispose();
} );

test( 'disposal is local, resource-safe and idempotent', () => {
    const fixture = createFixture();
    const { scene, retained, geometry, sourceMaterial, terrainSurface, owner } =
        fixture;
    let ownerMaterialDisposals = 0;
    let sourceGeometryDisposals = 0;
    let sourceMaterialDisposals = 0;
    owner.material.addEventListener( 'dispose', () => {
        ownerMaterialDisposals += 1;
    } );
    geometry.addEventListener( 'dispose', () => {
        sourceGeometryDisposals += 1;
    } );
    sourceMaterial.addEventListener( 'dispose', () => {
        sourceMaterialDisposals += 1;
    } );

    owner.dispose();
    owner.dispose();

    assert.equal( ownerMaterialDisposals, 1 );
    assert.equal( sourceGeometryDisposals, 0 );
    assert.equal( sourceMaterialDisposals, 0 );
    assert.equal( scene.children.includes( owner.mesh ), false );
    assert.equal( scene.children.includes( retained ), true );
    assert.equal( terrainSurface.parent, null );
    assert.equal( terrainSurface.geometry, geometry );
    assert.equal( terrainSurface.material, sourceMaterial );
    assert.equal( owner.getSnapshot(), null );
    assert.throws( () => owner.setVisible( true ), /disposed/ );

    geometry.dispose();
    sourceMaterial.dispose();
} );

test( 'invalid construction fails before creating composition resources', () => {
    const scene = new THREE.Scene();
    assert.throws(
        () => createCompositionTerrainDepthOwner( {
            scene: null,
            terrainSurface: new THREE.Mesh()
        } ),
        /requires a Three\.js scene/
    );
    assert.throws(
        () => createCompositionTerrainDepthOwner( {
            scene,
            terrainSurface: new THREE.Group()
        } ),
        /requires a terrain mesh/
    );
    assert.throws(
        () => createCompositionTerrainDepthOwner( {
            scene,
            terrainSurface: new THREE.Mesh( new THREE.BufferGeometry() )
        } ),
        /requires terrain geometry/
    );
    assert.equal( scene.children.length, 0 );
} );

test( 'composition ordering preserves sea colour before terrain owns depth', () => {
    assert.equal( compositionSubstrateRenderOrder, -20 );
    assert.equal( compositionTerrainDepthRenderOrder, -10 );
    assert.ok(
        compositionSubstrateRenderOrder < compositionTerrainDepthRenderOrder
    );
    assert.match(
        substrateSource,
        /mesh\.renderOrder\s*=\s*compositionSubstrateRenderOrder/
    );
    assert.match(
        depthOwnerSource,
        /mesh\.renderOrder\s*=\s*compositionTerrainDepthRenderOrder/
    );
} );

test( 'the composition exposes one checked orthogonal depth-owner A/B switch', () => {
    const switchTags = Array.from( compositionHtml.matchAll(
        /<input\b[^>]*\bid="composition-terrain-depth-visible"[^>]*>/g
    ), ( match ) => match[0] );
    assert.equal( switchTags.length, 1 );
    assert.match( switchTags[0], /\btype="checkbox"/ );
    assert.match( switchTags[0], /\bchecked\b/ );

    assert.match( compositionMain, /createCompositionTerrainDepthOwner\s*\(/ );
    assert.match(
        compositionMain,
        /terrainSurface:\s*universe\.environment\.membraneSurface/
    );
    assert.match( compositionMain, /#composition-terrain-depth-visible/ );
    assert.match(
        compositionMain,
        /compositionTerrainDepth[\s\S]*?\.setVisible\s*\(/
    );
    assert.doesNotMatch( compositionMain, /mode\.terrain/ );
} );

test( 'the adapter is composition-local and introduces no second renderer', () => {
    assert.equal(
        Array.from( depthOwnerSource.matchAll( /new THREE\.MeshBasicMaterial/g ) )
            .length,
        1
    );
    assert.doesNotMatch(
        depthOwnerSource,
        /\bdocument\b|\bwindow\b|WebGLRenderer|requestAnimationFrame|setAnimationLoop/
    );
    assert.doesNotMatch(
        depthOwnerSource,
        /ShaderMaterial|MeshStandardMaterial|TextureLoader|DataTexture|AmbientLight|DirectionalLight|HemisphereLight|PointLight|SpotLight/
    );
    const imports = Array.from( depthOwnerSource.matchAll(
        /from\s+['"]([^'"]+)['"]/g
    ), ( match ) => match[1] );
    assert.deepEqual( imports, [ 'three' ] );

    const standaloneMains = [
        '../../src/category-tree/casting-pit/information-layer/main.js',
        '../../src/category-tree/casting-pit/universe-cosmos/main.js',
        '../../src/category-tree/casting-pit/physical-layer/main.js'
    ];
    for ( const relativePath of standaloneMains )
    {
        const source = readFileSync(
            new URL( relativePath, import.meta.url ),
            'utf8'
        );
        assert.doesNotMatch( source, /terrain-depth-owner/ );
        assert.doesNotMatch( source, /createCompositionTerrainDepthOwner/ );
    }
} );

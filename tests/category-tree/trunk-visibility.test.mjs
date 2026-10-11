import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
    createHierarchy,
    representativeHierarchy,
    unfoldingHierarchy
} from '../../src/category-tree/tree/hierarchy.js';
import { createUnfoldingLayout } from '../../src/category-tree/tree/layout.js';
import {
    createEngineeredTreeLayer,
    trunkVisibilityModes
} from '../../src/category-tree/tree/engineered-tree-layer.js';
import {
    createTrunkVisibilityRenderer
} from '../../src/category-tree/tree/trunk-visibility-renderer.js';

const expectedModes = [
    'off',
    'isolated',
    'aperture',
    'attenuation',
    'stencil'
];

function createFixture( growthTiers = 3 )
{
    const established = createHierarchy( representativeHierarchy );
    const hierarchy = createHierarchy( unfoldingHierarchy );
    const form = {
        crownSpread: 1.14,
        verticalRise: 0.95,
        asymmetry: 0.68,
        conduitWeight: 1.34,
        windSweep: 0.48,
        growthTiers,
        packetFrequency: 0.2,
        packetSpeed: 1.55
    };
    const positions = createUnfoldingLayout( established, hierarchy, {
        trunkRise: 2.05 * form.verticalRise,
        branchRise: 1.45 * form.verticalRise,
        principalReach: 2.8 * form.crownSpread,
        asymmetry: form.asymmetry,
        windSweep: form.windSweep,
        growthTiers: form.growthTiers
    } );
    return { form, hierarchy, positions };
}

function matureProgress( hierarchy )
{
    return new Map( hierarchy.nodes
        .filter( ( node ) => node.latent && node.growthEligible !== false )
        .map( ( node ) => [ node.id, 1 ] ) );
}

function bufferFor( array )
{
    return Buffer.from( array.buffer, array.byteOffset, array.byteLength );
}

function assertByteEquivalent( actual, expected, message )
{
    assert.equal( Buffer.compare( bufferFor( actual ), bufferFor( expected ) ), 0, message );
}

function assertClosedIndexedSurface( geometry )
{
    const edgeUses = new Map();
    const index = geometry.index.array;
    for ( let offset = 0; offset < index.length; offset += 3 )
    {
        const triangle = [ index[offset], index[offset + 1], index[offset + 2] ];
        for ( const [ left, right ] of [
            [ triangle[0], triangle[1] ],
            [ triangle[1], triangle[2] ],
            [ triangle[2], triangle[0] ]
        ] )
        {
            const key = left < right ? `${left}:${right}` : `${right}:${left}`;
            edgeUses.set( key, ( edgeUses.get( key ) ?? 0 ) + 1 );
        }
    }
    assert.ok( edgeUses.size > 0 );
    assert.ok( Array.from( edgeUses.values() ).every( ( uses ) => uses === 2 ) );
}

function createMatureLayer( overrides = {} )
{
    const fixture = createFixture( overrides.growthTiers ?? 3 );
    const parameters = { ...fixture.form, ...overrides };
    const layer = createEngineeredTreeLayer(
        fixture.hierarchy,
        fixture.positions,
        parameters
    );
    layer.setGrowthProgress( matureProgress( fixture.hierarchy ) );
    return { ...fixture, parameters, layer };
}

class RecordingRenderer
{
    constructor( width = 640, height = 360 )
    {
        this.autoClear = true;
        this.width = width;
        this.height = height;
        this.renderTarget = null;
        this.clearColour = new THREE.Color( 0x000000 );
        this.clearAlpha = 1;
        this.renders = [];
        this.clears = [];
    }

    getContext()
    {
        return {
            getContextAttributes() {
                return { stencil: true };
            }
        };
    }

    getDrawingBufferSize( target )
    {
        return target.set( this.width, this.height );
    }

    setRenderTarget( target )
    {
        this.renderTarget = target;
    }

    getClearColor( target )
    {
        return target.copy( this.clearColour );
    }

    getClearAlpha()
    {
        return this.clearAlpha;
    }

    setClearColor( colour, alpha = this.clearAlpha )
    {
        this.clearColour.set( colour );
        this.clearAlpha = alpha;
    }

    clear( colour, depth, stencil )
    {
        this.clears.push( {
            target: this.renderTarget,
            colour,
            depth,
            stencil
        } );
    }

    render( scene )
    {
        this.renders.push( {
            target: this.renderTarget,
            participants: scene.children.map( ( child ) => ( {
                name: child.name,
                geometry: child.geometry,
                material: child.material
            } ) )
        } );
    }

    resetRecording()
    {
        this.renders.length = 0;
        this.clears.length = 0;
    }
}

test( 'C2 modes use one fixed C1 skeleton and expose a bounded deterministic API', () => {
    assert.deepEqual( trunkVisibilityModes, expectedModes );
    assert.ok( Object.isFrozen( trunkVisibilityModes ) );

    const { layer } = createMatureLayer();
    assert.equal( layer.getTrunkVisibilityMode(), 'off' );
    const original = layer.getTrunkVisibilityResources();
    const skeleton = original.skeletonMesh;
    const skeletonGeometry = skeleton.geometry;
    const descriptor = skeletonGeometry.userData.trunkInterior.descriptor;
    const skeletonPositions = skeletonGeometry.getAttribute( 'position' ).array.slice();
    const skeletonIndices = skeletonGeometry.index.array.slice();
    const resourceRevision = original.revision;

    for ( const mode of expectedModes )
    {
        layer.setTrunkVisibilityMode( mode );
        const resources = layer.getTrunkVisibilityResources();
        const diagnostics = layer.group.userData.trunkVisibility;
        assert.equal( layer.getTrunkVisibilityMode(), mode );
        assert.equal( resources.mode, mode );
        assert.equal( diagnostics.mode, mode );
        assert.deepEqual( diagnostics.modes, expectedModes );
        assert.equal( resources.revision, resourceRevision );
        assert.equal( resources.skeletonMesh, skeleton );
        assert.equal( resources.skeletonMesh.geometry, skeletonGeometry );
        assert.equal(
            resources.skeletonMesh.geometry.userData.trunkInterior.descriptor,
            descriptor
        );
        assert.equal( diagnostics.skeletonGeometryUuid, skeletonGeometry.uuid );
        assertByteEquivalent(
            resources.skeletonMesh.geometry.getAttribute( 'position' ).array,
            skeletonPositions,
            `${mode} must not change C1 carrier positions`
        );
        assertByteEquivalent(
            resources.skeletonMesh.geometry.index.array,
            skeletonIndices,
            `${mode} must not change C1 carrier topology`
        );
    }

    layer.setTrunkVisibilityMode( 'off' );
    assert.throws(
        () => layer.setTrunkVisibilityMode( 'glow' ),
        /Unknown trunk visibility mode 'glow'/
    );
    assert.equal( layer.getTrunkVisibilityMode(), 'off' );
} );

test( 'C2 candidates share one authored region without reshaping the accepted loft', () => {
    const { layer } = createMatureLayer();
    const resources = layer.getTrunkVisibilityResources();
    const source = resources.trunkMesh.geometry;
    const aperture = resources.apertureTrunkMesh.geometry;
    const liner = resources.apertureLinerMesh.geometry;
    const proxy = resources.proxyGeometry;
    const ownership = resources.ownershipGeometry;
    const apertureMetadata = aperture.userData.trunkVisibilityAperture;
    const linerMetadata = liner.userData.trunkVisibilityLiner;
    const proxyMetadata = proxy.userData.trunkVisibilityProxy;
    const ownershipMetadata = ownership.userData.trunkVisibilityOwnershipPatch;
    const diagnostics = layer.group.userData.trunkVisibility;

    assert.equal( apertureMetadata.parentId, 'exchange' );
    assert.equal( apertureMetadata.childId, 'meaning' );
    assert.equal( apertureMetadata.preferredRegionAvailable, true );
    assert.equal( apertureMetadata.longitudinalCellCount, 3 );
    assert.equal( apertureMetadata.angularCellCount, 2 );
    assert.equal( apertureMetadata.omittedCellCount, 6 );
    assert.equal( apertureMetadata.omittedTriangleCount, 12 );
    assert.equal(
        apertureMetadata.sourceIndexCount - apertureMetadata.candidateIndexCount,
        36
    );
    assert.equal( new Set( apertureMetadata.omittedIndexOffsets ).size, 6 );
    assertByteEquivalent(
        aperture.getAttribute( 'position' ).array,
        source.getAttribute( 'position' ).array,
        'the aperture candidate must clone, not reshape, the accepted loft'
    );
    assert.equal(
        aperture.getAttribute( 'position' ).array.byteLength,
        source.getAttribute( 'position' ).array.byteLength
    );

    assert.equal( linerMetadata.parentId, apertureMetadata.parentId );
    assert.equal( linerMetadata.childId, apertureMetadata.childId );
    assert.equal( linerMetadata.openBack, true );
    assert.ok( linerMetadata.recessFraction > 0 );
    assert.ok( linerMetadata.recessFraction < 1 );
    assert.equal(
        linerMetadata.triangleCount,
        linerMetadata.boundarySegmentCount * 2,
        'the liner contains only recessed boundary walls, not a closing plate'
    );

    assert.equal( proxyMetadata.parentId, apertureMetadata.parentId );
    assert.equal( proxyMetadata.childId, apertureMetadata.childId );
    assert.equal( proxyMetadata.closed, true );
    assert.ok( proxyMetadata.axisLength > 0 );
    assertClosedIndexedSurface( proxy );

    assert.equal( ownershipMetadata.parentId, apertureMetadata.parentId );
    assert.equal( ownershipMetadata.childId, apertureMetadata.childId );
    assert.equal( ownershipMetadata.cellCount, 6 );
    assert.equal( ownershipMetadata.triangleCount, 12 );
    assert.equal( ownership.index.count, 36 );
    assertByteEquivalent(
        ownership.getAttribute( 'position' ).array,
        source.getAttribute( 'position' ).array,
        'the ownership pass must use the exact accepted shell positions'
    );

    assert.equal( diagnostics.candidateRegion.parentId, 'exchange' );
    assert.equal( diagnostics.candidateRegion.childId, 'meaning' );
    assert.equal( diagnostics.omittedCellCount, 6 );
    assert.equal( diagnostics.linerTriangleCount, linerMetadata.triangleCount );
    assert.equal( diagnostics.proxyTriangleCount, proxyMetadata.triangleCount );
    assert.equal( diagnostics.proxyClosed, true );
    assert.equal( diagnostics.ownershipPatchCellCount, 6 );
    assert.equal( diagnostics.ownershipPatchTriangleCount, 12 );
    assert.equal( diagnostics.sourceGeometryUuid, source.uuid );
    assert.equal( diagnostics.apertureGeometryUuid, aperture.uuid );
    assert.equal( diagnostics.exteriorMaterialSharedByAperture, true );
    assert.equal( diagnostics.transportSimulationActive, true );
} );

test( 'C2 mode switching restores exterior references and preserves growth gating', () => {
    const { hierarchy, layer } = createMatureLayer();
    const trunk = layer.group.getObjectByName( 'monumental trunk' );
    const branch = layer.group.getObjectByName( 'meaning -> operations' );
    const core = layer.group.getObjectByName( 'routed information core' );
    const resources = layer.getTrunkVisibilityResources();
    const skeleton = resources.skeletonMesh;
    const apertureTrunk = resources.apertureTrunkMesh;
    const apertureLiner = resources.apertureLinerMesh;
    const trunkGeometry = trunk.geometry;
    const trunkMaterial = trunk.material;
    const branchGeometry = branch.geometry;
    const branchMaterial = branch.material;
    const coreGeometry = core.geometry;
    const coreMaterial = core.material;
    const trunkPositions = trunkGeometry.getAttribute( 'position' ).array.slice();
    const trunkIndices = trunkGeometry.index.array.slice();
    const branchPositions = branchGeometry.getAttribute( 'position' ).array.slice();

    for ( const mode of expectedModes )
    {
        layer.setTrunkVisibilityMode( mode );
        const current = layer.getTrunkVisibilityResources();
        assert.equal( current.trunkMesh, trunk );
        assert.equal( current.trunkMesh.geometry, trunkGeometry );
        assert.equal( current.trunkMesh.material, trunkMaterial );
        assert.equal( current.skeletonMesh, skeleton );
        assert.equal( branch.geometry, branchGeometry );
        assert.equal( branch.material, branchMaterial );
        assert.equal( core.geometry, coreGeometry );
        assert.equal( core.material, coreMaterial );
        assert.equal( apertureTrunk.material, trunkMaterial );

        assert.equal( trunk.visible, ![ 'isolated', 'aperture' ].includes( mode ) );
        assert.equal( apertureTrunk.visible, mode === 'aperture' );
        assert.equal( apertureLiner.visible, mode === 'aperture' );
        assert.equal( skeleton.visible, [ 'isolated', 'aperture' ].includes( mode ) );
        assert.equal( branch.visible, mode !== 'isolated' );
        assert.equal( core.visible, mode !== 'isolated' );
    }

    layer.setTrunkVisibilityMode( 'off' );
    assert.equal( trunk.visible, true );
    assert.equal( apertureTrunk.visible, false );
    assert.equal( apertureLiner.visible, false );
    assert.equal( skeleton.visible, false );
    assertByteEquivalent(
        trunk.geometry.getAttribute( 'position' ).array,
        trunkPositions,
        'mode restoration must not alter accepted trunk positions'
    );
    assertByteEquivalent(
        trunk.geometry.index.array,
        trunkIndices,
        'mode restoration must not alter accepted trunk indices'
    );
    assertByteEquivalent(
        branch.geometry.getAttribute( 'position' ).array,
        branchPositions,
        'mode restoration must not alter branch positions'
    );

    const partialProgress = new Map( [
        [ 'crown-trunk-1', 1 ],
        [ 'working-capital', 1 ],
        [ 'process-observation', 0.5 ],
        [ 'crown-trunk-2', 0 ],
        [ 'resource-assurance', 1 ]
    ] );
    layer.setGrowthProgress( partialProgress );
    const visibility = skeleton.geometry.getAttribute( 'carrierVisibility' );
    const partialVisibility = visibility.array.slice();
    assert.equal( skeleton.geometry.userData.trunkInterior.visibleCarrierCount, 4 );
    for ( const mode of expectedModes )
    {
        layer.setTrunkVisibilityMode( mode );
        assert.equal( skeleton.geometry.userData.trunkInterior.visibleCarrierCount, 4 );
        assertByteEquivalent(
            visibility.array,
            partialVisibility,
            `${mode} must reveal only the same growth-supported carriers`
        );
    }

    layer.setGrowthProgress( matureProgress( hierarchy ) );
    assert.equal( skeleton.geometry.userData.trunkInterior.visibleCarrierCount, 9 );
    assert.ok( Array.from( visibility.array ).every( ( value ) => value === 1 ) );
} );

test( 'C2 visibility modes leave maximum-frequency transport byte deterministic', () => {
    const parameters = { packetFrequency: 11, packetSpeed: 0.5 };
    const candidates = expectedModes.map( ( mode ) => {
        const candidate = createMatureLayer( parameters );
        candidate.layer.setTrunkVisibilityMode( mode );
        return { mode, ...candidate };
    } );
    const baseline = candidates[0];
    const baselineCore = baseline.layer.group.getObjectByName( 'routed information core' );

    for ( const elapsed of [ 0, 2, 10 ] )
    {
        for ( const candidate of candidates )
        {
            candidate.layer.update( elapsed, candidate.parameters );
        }
        for ( const candidate of candidates.slice( 1 ) )
        {
            assert.deepEqual(
                candidate.layer.group.userData.routedLight,
                baseline.layer.group.userData.routedLight,
                `${candidate.mode} must not alter packet ownership or scheduling`
            );
        }
    }

    assert.equal( baseline.layer.group.userData.routedLight.emittedPacketCount, 111 );
    assert.equal( baseline.layer.group.userData.routedLight.packetFrequency, 11 );
    assert.equal( baseline.layer.group.userData.routedLight.packetSpeed, 0.5 );
    for ( const candidate of candidates.slice( 1 ) )
    {
        const core = candidate.layer.group.getObjectByName( 'routed information core' );
        assertByteEquivalent(
            core.geometry.getAttribute( 'position' ).array,
            baselineCore.geometry.getAttribute( 'position' ).array,
            `${candidate.mode} must not alter routed-core positions`
        );
        assertByteEquivalent(
            core.geometry.index.array,
            baselineCore.geometry.index.array,
            `${candidate.mode} must not alter routed-core topology`
        );
    }
} );

test( 'C2 renderer uses trunk-only ownership passes and records bounded costs', () => {
    const { layer } = createMatureLayer();
    const scene = new THREE.Scene();
    scene.add( layer.group );
    const camera = new THREE.PerspectiveCamera( 48, 640 / 360, 0.1, 80 );
    camera.position.set( 7.5, 8.2, 11.5 );
    camera.lookAt( -0.6, 6.5, 0 );
    camera.updateMatrixWorld();
    const renderer = new RecordingRenderer();
    const comparison = createTrunkVisibilityRenderer(
        renderer,
        scene,
        camera,
        layer
    );
    const resources = layer.getTrunkVisibilityResources();

    for ( const [ mode, expectedPassCount ] of [
        [ 'off', 1 ],
        [ 'isolated', 1 ],
        [ 'aperture', 1 ]
    ] )
    {
        renderer.resetRecording();
        layer.setTrunkVisibilityMode( mode );
        comparison.render();
        const diagnostics = comparison.getDiagnostics();
        assert.equal( diagnostics.mode, mode );
        assert.equal( diagnostics.passCount, expectedPassCount );
        assert.equal( diagnostics.packedDepthPasses, 0 );
        assert.equal( diagnostics.ownershipPasses, 0 );
        assert.equal( diagnostics.carrierOverlayPasses, 0 );
        assert.equal( renderer.renders.length, expectedPassCount );
        assert.ok( Number.isFinite( diagnostics.cpuSubmissionMs ) );
        assert.ok( diagnostics.cpuSubmissionMs >= 0 );
    }

    renderer.resetRecording();
    layer.setTrunkVisibilityMode( 'attenuation' );
    comparison.render();
    const attenuation = comparison.getDiagnostics();
    assert.equal( attenuation.mode, 'attenuation' );
    assert.equal( attenuation.passCount, 5 );
    assert.equal( attenuation.packedDepthPasses, 2 );
    assert.equal( attenuation.ownershipPasses, 1 );
    assert.equal( attenuation.carrierOverlayPasses, 1 );
    assert.equal( attenuation.renderTargetWidth, 320 );
    assert.equal( attenuation.renderTargetHeight, 180 );
    assert.equal( attenuation.renderTargetPixels, 320 * 180 * 2 );
    assert.equal( attenuation.estimatedRenderTargetBytes, 320 * 180 * 16 );
    assert.equal( attenuation.stencilAvailable, true );
    assert.equal( renderer.renders.length, 5 );
    assert.equal( renderer.renders[1].participants.length, 1 );
    assert.equal( renderer.renders[2].participants.length, 1 );
    assert.equal( renderer.renders[3].participants.length, 1 );
    assert.equal( renderer.renders[4].participants.length, 1 );
    assert.equal(
        renderer.renders[1].participants[0].geometry,
        resources.proxyGeometry
    );
    assert.equal(
        renderer.renders[2].participants[0].geometry,
        resources.proxyGeometry
    );
    assert.equal(
        renderer.renders[3].participants[0].geometry,
        resources.ownershipGeometry
    );
    assert.equal(
        renderer.renders[4].participants[0].geometry,
        resources.skeletonMesh.geometry
    );
    assert.equal( renderer.renders[1].participants[0].material.side, THREE.FrontSide );
    assert.equal( renderer.renders[2].participants[0].material.side, THREE.BackSide );

    const ownershipMaterial = renderer.renders[3].participants[0].material;
    assert.equal( ownershipMaterial.depthFunc, THREE.EqualDepth );
    assert.equal( ownershipMaterial.depthWrite, false );
    assert.equal( ownershipMaterial.colorWrite, false );
    assert.equal( ownershipMaterial.stencilWrite, true );
    assert.equal( ownershipMaterial.stencilZPass, THREE.ReplaceStencilOp );
    const attenuationOverlay = renderer.renders[4].participants[0].material;
    assert.equal( attenuationOverlay.name, 'C2 linearized trunk attenuation overlay' );
    assert.equal( attenuationOverlay.stencilFunc, THREE.EqualStencilFunc );
    assert.equal( attenuationOverlay.depthTest, false );
    assert.deepEqual(
        layer.group.userData.trunkVisibilityRenderer,
        attenuation
    );

    renderer.resetRecording();
    layer.setTrunkVisibilityMode( 'stencil' );
    comparison.render();
    const stencil = comparison.getDiagnostics();
    assert.equal( stencil.mode, 'stencil' );
    assert.equal( stencil.passCount, 3 );
    assert.equal( stencil.packedDepthPasses, 0 );
    assert.equal( stencil.ownershipPasses, 1 );
    assert.equal( stencil.carrierOverlayPasses, 1 );
    assert.equal( stencil.renderTargetPixels, 0 );
    assert.equal( renderer.renders.length, 3 );
    assert.equal( renderer.renders[1].participants.length, 1 );
    assert.equal(
        renderer.renders[1].participants[0].geometry,
        resources.ownershipGeometry,
        'only the six authored shell cells may claim stencil ownership'
    );
    assert.equal(
        renderer.renders[1].participants[0].material.depthFunc,
        THREE.EqualDepth,
        'a nearer foreground branch must prevent the proxy from claiming its pixel'
    );
    assert.equal( renderer.renders[2].participants.length, 1 );
    assert.equal(
        renderer.renders[2].participants[0].geometry,
        resources.skeletonMesh.geometry
    );
    assert.equal(
        renderer.renders[2].participants[0].material.name,
        'C2 trunk stencil diagnostic overlay'
    );

    comparison.dispose();
} );

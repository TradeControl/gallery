import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as THREE from 'three';
import {
    createHierarchy,
    representativeHierarchy,
    unfoldingHierarchy
} from '../../src/lib/tree/hierarchy.js';
import { createUnfoldingLayout } from '../../src/lib/tree/layout.js';
import {
    createEngineeredTreeLayer,
    trunkVisibilityModes
} from '../../src/lib/tree/engineered-tree-layer.js';
import {
    createTrunkVisibilityRenderer
} from '../../src/lib/tree/trunk-visibility-renderer.js';
import {
    createPhysicalUptakeLayer
} from '../../src/lib/tree/physical-uptake-layer.js';
import { rootedMotionFieldId } from '../../src/lib/tree/rooted-motion.js';

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
                material: child.material,
                matrix: child.matrix.clone()
            } ) )
        } );
    }

    resetRecording()
    {
        this.renders.length = 0;
        this.clears.length = 0;
    }
}

test( 'rejected carrier-visibility studies are absent from the live Tree', () => {
    const mainSource = readFileSync(
        new URL( '../../src/category-tree/tree/main.js', import.meta.url ),
        'utf8'
    );
    const htmlSource = readFileSync(
        new URL( '../../src/category-tree/tree/index.html', import.meta.url ),
        'utf8'
    );

    assert.doesNotMatch( htmlSource, /id="inspect-trunk-interior"/ );
    assert.doesNotMatch( htmlSource, /id="trunk-visibility-mode"/ );
    assert.doesNotMatch( htmlSource,
        /Carrier visibility study|C2A|C2B|C2C/ );
    assert.doesNotMatch( mainSource,
        /querySelector\(\s*'#(?:inspect-trunk-interior|trunk-visibility-mode)'/ );
    assert.match( mainSource,
        /engineeredTree\.setTrunkVisibilityMode\(\s*'off'\s*\)/ );
} );

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
    const { layer, parameters } = createMatureLayer( {
        canopyGustCandidate: true,
        gustIntervalBase: 7
    } );
    layer.update( 2.75, parameters );
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
    for ( const pass of renderer.renders.slice( 1 ) )
    {
        assert.equal(
            pass.participants[0].material.userData.deformationFieldId,
            rootedMotionFieldId,
            'every C2 renderer-owned manifestation must share rooted motion'
        );
        assert.equal(
            pass.participants[0].material.uniforms.treeGustMix.value,
            1,
            'every C2 renderer-owned manifestation must share the gust candidate'
        );
        assert.equal(
            pass.participants[0].material.uniforms.treeGustIntervalBase.value,
            7,
            'every C2 renderer-owned manifestation must share its gust interval'
        );
    }

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

test( 'renderer rebinds bounded proxies when switching between active roots and C2', () => {
    const { layer, parameters } = createMatureLayer( {
        packetFrequency: 11,
        packetSpeed: 1.55
    } );
    layer.update( 0, parameters );
    let elapsed = 0;
    while ( layer.getTrunkRuneResources().activeTraversals.length === 0
        && elapsed < 30 )
    {
        elapsed += 0.5;
        layer.update( elapsed, parameters );
    }
    const runeResources = layer.getTrunkRuneResources();
    assert.ok(
        runeResources.activeTraversals.length > 0,
        'the regression requires one genuine packet inside the internal roots'
    );
    assert.equal( runeResources.diagnostics.rendererEligible, true );

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
    const visibilityResources = layer.getTrunkVisibilityResources();

    comparison.render();
    assert.equal( renderer.renders.length, 6 );
    assert.equal(
        renderer.renders[1].participants[0].geometry,
        runeResources.proxyGeometry,
        'active roots must use their closed three-span proxy'
    );
    assert.equal(
        renderer.renders[2].participants[0].geometry,
        runeResources.proxyGeometry
    );
    assert.equal(
        renderer.renders[3].participants[0].geometry,
        runeResources.geometry,
        'the nearest-signal pass must draw the active internal roots'
    );
    assert.equal(
        renderer.renders[4].participants[0].geometry,
        runeResources.ownershipGeometry
    );
    assert.equal(
        renderer.renders[5].participants[0].geometry,
        runeResources.geometry
    );
    for ( const pass of renderer.renders.slice( 1 ) )
    {
        assert.equal(
            pass.participants[0].material.userData.deformationFieldId,
            rootedMotionFieldId,
            'shell, rune depth and rune light must remain co-registered'
        );
    }

    renderer.resetRecording();
    layer.setTrunkVisibilityMode( 'attenuation' );
    comparison.render();
    assert.equal( renderer.renders.length, 5 );
    assert.equal(
        renderer.renders[1].participants[0].geometry,
        visibilityResources.proxyGeometry,
        'C2 attenuation must rebind its own local proxy after root rendering'
    );
    assert.equal(
        renderer.renders[2].participants[0].geometry,
        visibilityResources.proxyGeometry
    );
    assert.equal(
        renderer.renders[3].participants[0].geometry,
        visibilityResources.ownershipGeometry
    );
    assert.equal(
        renderer.renders[4].participants[0].geometry,
        visibilityResources.skeletonMesh.geometry
    );

    renderer.resetRecording();
    layer.setTrunkVisibilityMode( 'off' );
    comparison.render();
    assert.equal( renderer.renders.length, 6 );
    assert.equal(
        renderer.renders[1].participants[0].geometry,
        runeResources.proxyGeometry,
        'returning to the active roots must restore their proxy'
    );
    assert.equal(
        renderer.renders[4].participants[0].geometry,
        runeResources.ownershipGeometry
    );
    assert.equal(
        renderer.renders[5].participants[0].geometry,
        runeResources.geometry
    );

    comparison.dispose();
} );

test( 'physical uptake reuses packed terrain depth before the ordinary scene pass', () => {
    const { hierarchy, positions, layer, parameters } = createMatureLayer( {
        canopyGustCandidate: true,
        gustIntervalBase: 0,
        structuralResponse: 0.5,
        packetFrequency: 4,
        packetSpeed: 1.55
    } );
    const uptake = createPhysicalUptakeLayer(
        hierarchy,
        positions,
        parameters
    );
    uptake.setGrowthProgress( matureProgress( hierarchy ) );
    uptake.acceptPhysicalUptake( {
        transferId: 'terrain-owned-uptake',
        sourceParcelId: 'parcel-1',
        sourceId: 'feed-1',
        mass: 0.75,
        energy: 0.8,
        temperature: 0.8,
        contactPosition: [ 1.2, 0.8, 0 ],
        contactTime: 0
    } );
    uptake.update( 0, parameters );
    assert.equal( uptake.externalDepthConsumer.isActive(), true );

    const scene = new THREE.Scene();
    scene.add( layer.group, uptake.group );
    const terrainGeometry = new THREE.PlaneGeometry( 20, 20, 2, 2 );
    const terrainMaterial = new THREE.MeshStandardMaterial( {
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1
    } );
    const terrain = new THREE.Mesh( terrainGeometry, terrainMaterial );
    terrain.name = 'Physical uptake terrain owner';
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.set( 0.4, -0.3, -0.6 );
    terrain.updateMatrixWorld( true );

    const camera = new THREE.PerspectiveCamera( 48, 640 / 360, 0.1, 80 );
    camera.position.set( 7.5, 8.2, 11.5 );
    camera.lookAt( -0.6, 1.5, 0 );
    camera.updateMatrixWorld();
    const renderer = new RecordingRenderer();
    const comparison = createTrunkVisibilityRenderer(
        renderer,
        scene,
        camera,
        layer,
        {
            externalOccluders: [ terrain ],
            externalDepthConsumers: [ uptake.externalDepthConsumer ]
        }
    );

    comparison.render();
    const diagnostics = comparison.getDiagnostics();
    assert.equal( diagnostics.mode, 'off' );
    assert.equal( diagnostics.passCount, 2 );
    assert.equal( diagnostics.externalDepthConsumerCount, 1 );
    assert.equal( diagnostics.activeExternalDepthConsumerCount, 1 );
    assert.equal( diagnostics.externalOccluderCount, 1 );
    assert.equal( diagnostics.externalDepthPasses, 1 );
    assert.equal( diagnostics.externalOcclusionPasses, 1 );
    assert.equal( diagnostics.subsurfaceActive, true );
    assert.equal( renderer.renders.length, 2 );
    const depthPass = renderer.renders[0];
    const ordinaryScenePass = renderer.renders[1];
    assert.ok( depthPass.target?.isWebGLRenderTarget );
    assert.equal( ordinaryScenePass.target, null );
    assert.equal( depthPass.participants.length, 1 );
    assert.equal( depthPass.participants[0].geometry, terrainGeometry );
    assert.equal(
        uptake.mesh.material.uniforms.externalDepth.value,
        depthPass.target.texture
    );
    assert.equal(
        uptake.mesh.material.uniforms.externalOcclusionEnabled.value,
        1
    );
    assert.deepEqual(
        uptake.mesh.material.uniforms.viewport.value.toArray(),
        [ renderer.width, renderer.height ]
    );
    assert.equal(
        diagnostics.renderTargetPixels,
        renderer.width * renderer.height
    );

    terrain.visible = false;
    renderer.resetRecording();
    comparison.render();
    const hiddenTerrain = comparison.getDiagnostics();
    assert.equal( renderer.renders.length, 1 );
    assert.equal( hiddenTerrain.activeExternalDepthConsumerCount, 1 );
    assert.equal( hiddenTerrain.externalOccluderCount, 0 );
    assert.equal( hiddenTerrain.externalDepthPasses, 0 );
    assert.equal(
        uptake.mesh.material.uniforms.externalOcclusionEnabled.value,
        0,
        'hidden terrain must disable stale packed depth'
    );

    terrain.visible = true;
    uptake.setVisible( false );
    renderer.resetRecording();
    comparison.render();
    const hiddenUptake = comparison.getDiagnostics();
    assert.equal( renderer.renders.length, 1 );
    assert.equal( hiddenUptake.activeExternalDepthConsumerCount, 0 );
    assert.equal( hiddenUptake.externalDepthPasses, 0 );
    assert.equal(
        uptake.mesh.material.uniforms.externalOcclusionEnabled.value,
        0
    );

    uptake.setVisible( true );
    const standaloneRenderer = new RecordingRenderer();
    const standalone = createTrunkVisibilityRenderer(
        standaloneRenderer,
        scene,
        camera,
        layer,
        { externalDepthConsumers: [ uptake.externalDepthConsumer ] }
    );
    standalone.render();
    const standaloneDiagnostics = standalone.getDiagnostics();
    assert.equal( standaloneRenderer.renders.length, 1 );
    assert.equal( standaloneDiagnostics.activeExternalDepthConsumerCount, 1 );
    assert.equal( standaloneDiagnostics.externalDepthPasses, 0 );
    assert.equal( uptake.mesh.material.uniforms.externalDepth.value, null );
    assert.equal(
        uptake.mesh.material.uniforms.externalOcclusionEnabled.value,
        0
    );

    standalone.dispose();
    renderer.resetRecording();
    comparison.render();
    assert.equal(
        uptake.mesh.material.uniforms.externalOcclusionEnabled.value,
        1
    );
    comparison.dispose();
    assert.equal(
        uptake.mesh.material.uniforms.externalDepth.value,
        null,
        'renderer disposal must release the consumer depth texture'
    );
    assert.equal(
        uptake.mesh.material.uniforms.externalOcclusionEnabled.value,
        0,
        'renderer disposal must disable the retired terrain depth'
    );
    uptake.dispose();
    terrainGeometry.dispose();
    terrainMaterial.dispose();
} );

test( 'physical uptake and D4 packets share one packed terrain-depth pass', () => {
    const { hierarchy, positions, layer, parameters } = createMatureLayer( {
        packetFrequency: 11,
        packetSpeed: 1.55,
        internalRouterTiers: 4,
        internalRouterJunctionEnabled: true,
        internalRouterTransportEnabled: true,
        internalRouterPresentationEnabled: true,
        internalRouterJunctionFormEnabled: true,
        internalRouterJunctionFormCircumference: 0.55
    } );
    let elapsed = 0;
    layer.update( elapsed, parameters );
    while ( layer.getInternalRouterPresentationResources().packetTrails.length === 0
        && elapsed < 30 )
    {
        elapsed += 0.25;
        layer.update( elapsed, parameters );
    }
    assert.ok(
        layer.getInternalRouterPresentationResources().packetTrails.length > 0,
        'the shared-depth regression requires an active D4 packet trail'
    );

    const uptake = createPhysicalUptakeLayer(
        hierarchy,
        positions,
        parameters
    );
    uptake.setGrowthProgress( matureProgress( hierarchy ) );
    uptake.acceptPhysicalUptake( {
        transferId: 'shared-terrain-depth-uptake',
        sourceParcelId: 'shared-parcel-1',
        sourceId: 'shared-feed-1',
        mass: 0.75,
        energy: 0.8,
        temperature: 0.8,
        contactPosition: [ 1.2, 0.8, 0 ],
        contactTime: 0
    } );
    uptake.update( 0, parameters );
    assert.equal( uptake.externalDepthConsumer.isActive(), true );

    const scene = new THREE.Scene();
    scene.add( layer.group, uptake.group );
    const terrainGeometry = new THREE.PlaneGeometry( 20, 20, 2, 2 );
    const terrainMaterial = new THREE.MeshStandardMaterial();
    const terrain = new THREE.Mesh( terrainGeometry, terrainMaterial );
    terrain.name = 'Shared physical and information terrain owner';
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.set( 0.4, -0.3, -0.6 );
    terrain.updateMatrixWorld( true );

    const camera = new THREE.PerspectiveCamera( 48, 640 / 360, 0.1, 80 );
    camera.position.set( 7.5, 8.2, 11.5 );
    camera.lookAt( -0.6, 1.5, 0 );
    camera.updateMatrixWorld();
    const renderer = new RecordingRenderer();
    const comparison = createTrunkVisibilityRenderer(
        renderer,
        scene,
        camera,
        layer,
        {
            externalOccluders: [ terrain ],
            externalDepthConsumers: [ uptake.externalDepthConsumer ]
        }
    );

    comparison.render();
    const diagnostics = comparison.getDiagnostics();
    assert.equal( diagnostics.mode, 'd4-packet-subsurface' );
    assert.equal( diagnostics.passCount, 6 );
    assert.equal( diagnostics.externalDepthPasses, 1 );
    assert.equal( diagnostics.externalOcclusionPasses, 1 );
    assert.equal( diagnostics.activeExternalDepthConsumerCount, 1 );
    assert.equal( renderer.renders.length, 6 );

    const terrainDepthPasses = renderer.renders.filter( ( pass ) =>
        pass.participants.length === 1
        && pass.participants[0].geometry === terrainGeometry
    );
    assert.equal(
        terrainDepthPasses.length,
        1,
        'physical and information flow must not duplicate terrain depth'
    );
    const terrainDepthPass = terrainDepthPasses[0];
    assert.ok( terrainDepthPass.target?.isWebGLRenderTarget );
    assert.equal( renderer.renders[0], terrainDepthPass );
    assert.equal( renderer.renders[1].target, null );
    const sharedTexture = terrainDepthPass.target.texture;
    assert.equal(
        uptake.mesh.material.uniforms.externalDepth.value,
        sharedTexture
    );
    assert.equal(
        uptake.mesh.material.uniforms.externalOcclusionEnabled.value,
        1
    );

    const packetOverlay = renderer.renders[5].participants[0].material;
    assert.equal(
        packetOverlay.name,
        'D4 route-local gold head-and-wake transmission'
    );
    assert.ok(
        Object.values( packetOverlay.uniforms ).some(
            ( uniform ) => uniform.value === sharedTexture
        ),
        'D4 and physical uptake must sample the same packed terrain texture'
    );

    comparison.dispose();
    assert.equal( uptake.mesh.material.uniforms.externalDepth.value, null );
    assert.equal(
        uptake.mesh.material.uniforms.externalOcclusionEnabled.value,
        0
    );
    uptake.dispose();
    terrainGeometry.dispose();
    terrainMaterial.dispose();
} );

test( 'a detached external occluder owns D4 pixels without visible presentation', () => {
    const { layer, parameters } = createMatureLayer( {
        packetFrequency: 11,
        packetSpeed: 1.55,
        internalRouterTiers: 4,
        internalRouterJunctionEnabled: true,
        internalRouterTransportEnabled: true,
        internalRouterPresentationEnabled: true,
        internalRouterJunctionFormEnabled: true,
        internalRouterJunctionFormCircumference: 0.55
    } );
    let elapsed = 0;
    layer.update( elapsed, parameters );
    while ( layer.getInternalRouterPresentationResources().packetTrails.length === 0
        && elapsed < 30 )
    {
        elapsed += 0.25;
        layer.update( elapsed, parameters );
    }
    assert.ok(
        layer.getInternalRouterPresentationResources().packetTrails.length > 0,
        'the regression requires an active D4 gold packet trail'
    );

    const scene = new THREE.Scene();
    scene.add( layer.group );
    const terrainGeometry = new THREE.PlaneGeometry( 20, 20, 2, 2 );
    const terrainMaterial = new THREE.MeshStandardMaterial( {
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1
    } );
    const terrain = new THREE.Mesh( terrainGeometry, terrainMaterial );
    terrain.name = 'Casting Pit membrane test occluder';
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.set( 0.4, -0.3, -0.6 );
    terrain.updateMatrixWorld( true );
    assert.equal( terrain.parent, null );
    scene.updateMatrixWorld( true );

    const camera = new THREE.PerspectiveCamera( 48, 640 / 360, 0.1, 80 );
    camera.position.set( 7.5, 8.2, 11.5 );
    camera.lookAt( -0.6, 1.5, 0 );
    camera.updateMatrixWorld();
    const renderer = new RecordingRenderer();
    const comparison = createTrunkVisibilityRenderer(
        renderer,
        scene,
        camera,
        layer,
        { externalOccluders: [ terrain ] }
    );

    comparison.render();
    const diagnostics = comparison.getDiagnostics();
    assert.equal( diagnostics.mode, 'd4-packet-subsurface' );
    assert.equal( diagnostics.passCount, 6 );
    assert.equal( diagnostics.ownershipPasses, 0 );
    assert.equal( diagnostics.externalOccluderCount, 1 );
    assert.equal( diagnostics.externalOcclusionPasses, 1 );
    assert.equal( renderer.renders.length, 6 );
    const targetPixels = renderer.width * renderer.height;
    assert.equal( diagnostics.renderTargetWidth, renderer.width );
    assert.equal( diagnostics.renderTargetHeight, renderer.height );
    assert.equal( diagnostics.renderTargetPixels, targetPixels * 4 );
    assert.equal( diagnostics.estimatedRenderTargetBytes,
        targetPixels * 8 * 4 );

    const occluderDepthPass = renderer.renders[4];
    const externalDepthTarget = occluderDepthPass.target;
    assert.ok( externalDepthTarget?.isWebGLRenderTarget );
    assert.equal( externalDepthTarget.width, renderer.width );
    assert.equal( externalDepthTarget.height, renderer.height );
    assert.equal( externalDepthTarget.depthBuffer, true );
    assert.equal( externalDepthTarget.stencilBuffer, false );
    assert.equal( externalDepthTarget.texture.minFilter, THREE.NearestFilter );
    assert.equal( externalDepthTarget.texture.magFilter, THREE.NearestFilter );
    assert.equal( externalDepthTarget.texture.format, THREE.RGBAFormat );
    assert.equal( externalDepthTarget.texture.type, THREE.UnsignedByteType );
    assert.equal( externalDepthTarget.texture.colorSpace, THREE.NoColorSpace );
    assert.equal( externalDepthTarget.texture.generateMipmaps, false );
    assert.ok( renderer.clears.some( ( clear ) =>
        clear.target === externalDepthTarget
        && clear.colour === true
        && clear.depth === true
        && clear.stencil === false ) );

    assert.equal( occluderDepthPass.participants.length, 1 );
    assert.equal( occluderDepthPass.participants[0].geometry, terrainGeometry );
    assert.deepEqual(
        occluderDepthPass.participants[0].matrix.elements,
        terrain.matrixWorld.elements
    );
    const occluderMaterial = occluderDepthPass.participants[0].material;
    assert.equal( occluderMaterial.isShaderMaterial, true );
    assert.equal( occluderMaterial.colorWrite, true );
    assert.equal( occluderMaterial.depthTest, true );
    assert.equal( occluderMaterial.depthWrite, true );
    for ( const passIndex of [ 1, 2, 3, 5 ] )
    {
        assert.equal(
            renderer.renders[passIndex].participants[0].material.userData
                .deformationFieldId,
            rootedMotionFieldId,
            'D4 shell, packet depth and packet light must share rooted motion'
        );
    }
    assert.equal( occluderMaterial.depthFunc, THREE.LessEqualDepth );
    assert.equal( occluderMaterial.transparent, false );
    assert.equal( occluderMaterial.side, THREE.DoubleSide );
    assert.equal( occluderMaterial.blending, THREE.NoBlending );
    assert.equal( occluderMaterial.toneMapped, false );
    assert.equal( occluderMaterial.polygonOffset, true );
    assert.equal( occluderMaterial.polygonOffsetFactor, 1 );
    assert.equal( occluderMaterial.polygonOffsetUnits, 1 );
    assert.equal( occluderMaterial.stencilWrite, false );
    assert.match( occluderMaterial.fragmentShader, /packDepthToRGBA/ );

    const overlayPass = renderer.renders[5];
    assert.equal( overlayPass.target, null );
    const overlayMaterial = renderer.renders[5].participants[0].material;
    assert.equal( overlayMaterial.name,
        'D4 route-local gold head-and-wake transmission' );
    assert.equal( overlayMaterial.stencilWrite, false );
    const externalTextureUniform = Object.entries( overlayMaterial.uniforms )
        .find( ( [ name, uniform ] ) =>
            /external|occlud/i.test( name )
            && uniform.value === externalDepthTarget.texture );
    assert.ok(
        externalTextureUniform,
        'D4 must sample the exact packed depth produced by the terrain pass'
    );
    assert.match( overlayMaterial.fragmentShader, /unpackRGBAToDepth/ );
    assert.match( overlayMaterial.fragmentShader, /gl_FragCoord\.z/ );
    assert.match( overlayMaterial.fragmentShader,
        /float externalTerrainDepth/ );
    assert.doesNotMatch( overlayMaterial.fragmentShader,
        /\bfloat\s+external\b/ );
    assert.match( overlayMaterial.fragmentShader, /discard/ );

    const externalTargetUuid = externalDepthTarget.texture.uuid;
    const externalMaterialUuid = occluderMaterial.uuid;
    const replacementTerrainGeometry = new THREE.PlaneGeometry(
        18,
        18,
        3,
        3
    );
    terrain.geometry = replacementTerrainGeometry;
    terrain.position.set( -0.75, 0.4, 1.1 );
    terrain.rotation.y = 0.3;
    terrain.updateMatrixWorld( true );
    camera.position.set( -5.5, 5.2, 13.5 );
    camera.lookAt( 0.2, 0.6, -0.4 );
    camera.updateMatrixWorld();
    renderer.resetRecording();
    comparison.render();
    const movedPass = renderer.renders[4];
    assert.equal( movedPass.target, externalDepthTarget );
    assert.equal( movedPass.target.texture.uuid, externalTargetUuid );
    assert.equal( movedPass.participants[0].material.uuid,
        externalMaterialUuid );
    assert.equal( movedPass.participants[0].geometry,
        replacementTerrainGeometry );
    assert.deepEqual(
        movedPass.participants[0].matrix.elements,
        terrain.matrixWorld.elements
    );

    terrain.visible = false;
    renderer.resetRecording();
    comparison.render();
    const hiddenDiagnostics = comparison.getDiagnostics();
    assert.equal( hiddenDiagnostics.passCount, 5 );
    assert.equal( hiddenDiagnostics.externalOccluderCount, 0 );
    assert.equal( hiddenDiagnostics.externalOcclusionPasses, 0 );
    assert.equal( renderer.renders.length, 5 );
    const hiddenOverlayMaterial = renderer.renders[4]
        .participants[0].material;
    assert.equal( hiddenOverlayMaterial, overlayMaterial );
    assert.equal( hiddenOverlayMaterial.stencilWrite, false );
    const externalControl = Object.entries( hiddenOverlayMaterial.uniforms )
        .find( ( [ name, uniform ] ) =>
            /external|occlud/i.test( name )
            && uniform.value !== externalDepthTarget.texture
            && ( typeof uniform.value === 'boolean'
                || typeof uniform.value === 'number' )
    );
    const hiddenTargetWasCleared = renderer.clears.some( ( clear ) =>
        clear.target === externalDepthTarget
        && clear.colour === true
        && clear.depth === true );
    assert.ok(
        hiddenTargetWasCleared
            || externalControl?.[1].value === false
            || externalControl?.[1].value === 0,
        'a hidden source must not leave stale terrain depth active'
    );

    let targetDisposals = 0;
    let ownedMaterialDisposals = 0;
    let sourceGeometryDisposals = 0;
    let replacementGeometryDisposals = 0;
    let sourceMaterialDisposals = 0;
    externalDepthTarget.addEventListener( 'dispose', () => {
        targetDisposals += 1;
    } );
    occluderMaterial.addEventListener( 'dispose', () => {
        ownedMaterialDisposals += 1;
    } );
    terrainGeometry.addEventListener( 'dispose', () => {
        sourceGeometryDisposals += 1;
    } );
    replacementTerrainGeometry.addEventListener( 'dispose', () => {
        replacementGeometryDisposals += 1;
    } );
    terrainMaterial.addEventListener( 'dispose', () => {
        sourceMaterialDisposals += 1;
    } );

    comparison.dispose();
    assert.equal( targetDisposals, 1 );
    assert.equal( ownedMaterialDisposals, 1 );
    assert.equal( sourceGeometryDisposals, 0 );
    assert.equal( replacementGeometryDisposals, 0 );
    assert.equal( sourceMaterialDisposals, 0 );

    const standaloneRenderer = new RecordingRenderer();
    const standaloneComparison = createTrunkVisibilityRenderer(
        standaloneRenderer,
        scene,
        camera,
        layer
    );
    standaloneComparison.render();
    const standaloneDiagnostics = standaloneComparison.getDiagnostics();
    assert.equal( standaloneDiagnostics.mode, 'd4-packet-subsurface' );
    assert.equal( standaloneDiagnostics.passCount, 5 );
    assert.equal( standaloneDiagnostics.externalOccluderCount, 0 );
    assert.equal( standaloneDiagnostics.externalOcclusionPasses, 0 );
    assert.equal( standaloneDiagnostics.externalDepthPasses, 0 );
    assert.equal( standaloneDiagnostics.renderTargetPixels,
        standaloneRenderer.width * standaloneRenderer.height * 3 );
    assert.equal(
        standaloneRenderer.renders.filter( ( pass ) => pass.target !== null )
            .length,
        3,
        'standalone D4 must not allocate or submit an external-depth pass'
    );
    standaloneComparison.dispose();

    terrainGeometry.dispose();
    replacementTerrainGeometry.dispose();
    terrainMaterial.dispose();
} );

test( 'external Tree packed depth remains independent of the stencil buffer', () => {
    const { layer } = createMatureLayer();
    const scene = new THREE.Scene();
    scene.add( layer.group );
    const terrainGeometry = new THREE.PlaneGeometry( 4, 4 );
    const terrainMaterial = new THREE.MeshBasicMaterial();
    const terrain = new THREE.Mesh( terrainGeometry, terrainMaterial );
    scene.add( terrain );
    const renderer = new RecordingRenderer();
    renderer.getContext = () => ( {
        getContextAttributes: () => ( { stencil: false } )
    } );
    const camera = new THREE.PerspectiveCamera();

    const comparison = createTrunkVisibilityRenderer(
        renderer,
        scene,
        camera,
        layer,
        { externalOccluders: [ terrain ] }
    );
    assert.equal( comparison.getDiagnostics().stencilAvailable, false );

    comparison.dispose();
    terrainGeometry.dispose();
    terrainMaterial.dispose();
} );

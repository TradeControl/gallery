import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as THREE from 'three';
import {
    compositionSubstrateDefaults,
    compositionSubstrateRenderOrder,
    compositionSubstrateRanges,
    compositionSubstrateSurfaceDefaults,
    compositionSubstrateSurfaceRanges,
    createCompositionSubstrate
} from '../../src/category-tree/composition/substrate-instance.js';
import {
    energeticSeaDefaults,
    energeticSeaRanges
} from '../../src/lib/substrate/index.js';

const compositionHtml = readFileSync(
    new URL( '../../src/category-tree/composition/index.html', import.meta.url ),
    'utf8'
);
const compositionMain = readFileSync(
    new URL( '../../src/category-tree/composition/main.js', import.meta.url ),
    'utf8'
);

const surfaceControlIds = Object.freeze( {
    swellHeight: 'composition-substrate-swell-height',
    energy: 'composition-substrate-energy',
    crestTension: 'composition-substrate-crest-tension',
    crossCurrent: 'composition-substrate-cross-current',
    fineActivity: 'composition-substrate-fine-activity',
    reflection: 'composition-substrate-reflection',
    currentSpeed: 'composition-substrate-current-speed'
} );

function inputTag( id )
{
    const escaped = id.replace( /[-/\\^$*+?.()|[\]{}]/g, '\\$&' );
    const tag = compositionHtml.match(
        new RegExp( `<input\\s+id="${escaped}"[^>]*>` )
    )?.[0];
    assert.ok( tag, `missing composition input #${id}` );
    return tag;
}

function numericRange( id )
{
    const tag = inputTag( id );
    assert.match( tag, /\btype="range"/ );
    return Object.fromEntries( [ 'min', 'max', 'step', 'value' ].map(
        ( attribute ) => [
            attribute,
            Number( tag.match(
                new RegExp( `\\b${attribute}="([^"]+)"` )
            )?.[1] )
        ]
    ) );
}

function createFixture()
{
    const scene = new THREE.Scene();
    const retained = new THREE.Group();
    retained.name = 'Unrelated composition component';
    scene.add( retained );
    const membraneParameters = { depth: 5.5, width: 3.8 };
    const membrane = {
        size: 24,
        height( x, z ) {
            return -membraneParameters.depth * Math.exp(
                -( x * x + z * z )
                    / ( membraneParameters.width * membraneParameters.width )
            );
        }
    };
    let envelopeRevision = 1;
    const plantingEnvelope = {
        getSnapshot() {
            return {
                revision: envelopeRevision,
                status: 'attached',
                deepMediumDepth: 0.72
            };
        }
    };
    const substrate = createCompositionSubstrate( {
        scene,
        membrane,
        plantingEnvelope
    } );
    return {
        scene,
        retained,
        membrane,
        membraneParameters,
        plantingEnvelope,
        substrate,
        reviseEnvelope() {
            envelopeRevision += 1;
        }
    };
}

function createShaderFixture()
{
    return {
        uniforms: {},
        vertexShader: [
            '#include <common>',
            '#include <beginnormal_vertex>',
            '#include <begin_vertex>'
        ].join( '\n' ),
        fragmentShader: [
            '#include <common>',
            '#include <color_fragment>',
            '#include <roughnessmap_fragment>',
            '#include <normal_fragment_maps>',
            '#include <lights_fragment_end>'
        ].join( '\n' )
    };
}

test( 'composition substrate exposes one bounded placement control', () => {
    assert.ok( Object.isFrozen( compositionSubstrateDefaults ) );
    assert.ok( Object.isFrozen( compositionSubstrateRanges ) );
    assert.deepEqual( Object.keys( compositionSubstrateDefaults ), [
        'outerDepth'
    ] );
    const range = compositionSubstrateRanges.outerDepth;
    assert.ok( Object.isFrozen( range ) );
    assert.ok( compositionSubstrateDefaults.outerDepth >= range.min );
    assert.ok( compositionSubstrateDefaults.outerDepth <= range.max );
    const step = ( compositionSubstrateDefaults.outerDepth - range.min )
        / range.step;
    assert.ok( Math.abs( step - Math.round( step ) ) < 1e-9 );
} );

test( 'composition exposes the shared energetic surface contract without endpoint diagnostics', () => {
    assert.ok( Object.isFrozen( compositionSubstrateSurfaceDefaults ) );
    assert.ok( Object.isFrozen( compositionSubstrateSurfaceRanges ) );
    assert.deepEqual(
        Object.keys( compositionSubstrateSurfaceDefaults ),
        Object.keys( energeticSeaDefaults )
    );
    assert.deepEqual(
        compositionSubstrateSurfaceRanges,
        energeticSeaRanges
    );
    assert.deepEqual( compositionSubstrateSurfaceDefaults, {
        ...energeticSeaDefaults,
        reflection: 0.8
    } );

    for ( const [ property, id ] of Object.entries( surfaceControlIds ) )
    {
        assert.deepEqual( numericRange( id ), {
            ...energeticSeaRanges[property],
            value: compositionSubstrateSurfaceDefaults[property]
        } );
        assert.match(
            compositionMain,
            new RegExp( `'${id}'[\\s\\S]*property:\\s*'${property}'` )
        );
    }

    const freezeTag = inputTag( 'composition-substrate-freeze-motion' );
    assert.match( freezeTag, /\btype="checkbox"/ );
    assert.doesNotMatch( freezeTag, /\bchecked\b/ );
    assert.match( compositionHtml,
        /id="composition-substrate-reset"[^>]*>Reset substrate/ );
    assert.doesNotMatch( compositionHtml,
        /id="composition-substrate-(?:wireframe|camera|view)/ );
    assert.match( compositionMain,
        /compositionSubstrate\.setParameter\s*\(/ );
    assert.match( compositionMain,
        /compositionSubstrate\.setFrozen\s*\(/ );
    assert.match( compositionMain,
        /compositionSubstrate\.reset\s*\(/ );
} );

test( 'the composition exposes one orthogonal substrate A/B contract', () => {
    const switchTag = compositionHtml.match(
        /<input\s+id="composition-substrate-visible"[^>]*>/
    )?.[0];
    assert.ok( switchTag );
    assert.match( switchTag, /type="checkbox"/ );
    assert.match( switchTag, /\bchecked\b/ );
    const levelTag = compositionHtml.match(
        /<input\s+id="composition-substrate-level"[^>]*>/
    )?.[0];
    assert.ok( levelTag );
    assert.match( levelTag, /type="range"/ );
    assert.equal(
        Array.from( compositionHtml.matchAll(
            /id="composition-substrate-[^"]+"/g
        ) ).filter( ( match ) => match[0].includes( 'level"' ) ).length,
        1
    );
    assert.match( compositionMain, /createCompositionSubstrate\s*\(/ );
    assert.match(
        compositionMain,
        /#composition-substrate-visible[\s\S]*compositionSubstrate\.setVisible/
    );
    assert.doesNotMatch( compositionMain, /mode\.substrate/ );
    assert.match(
        compositionMain,
        /tree\.update\( time \);\s*compositionSubstrate\.update\( time \);/
    );
    assert.match(
        compositionMain,
        /tree\.updatePlacement\(\);\s*compositionSubstrate\.refreshSurface\(\);/
    );
} );

test( 'the adapter owns placement while the shared engine owns one surface', () => {
    const fixture = createFixture();
    const { substrate } = fixture;
    const snapshot = substrate.getSnapshot();

    assert.equal( fixture.scene.children.length, 2 );
    assert.equal( fixture.scene.children.includes( substrate.mesh ), true );
    assert.equal( substrate.group, substrate.mesh );
    assert.equal( snapshot.materialOwner, 'energetic-sea-layer' );
    assert.equal( snapshot.visualProfile, 'composition-dark' );
    assert.equal( snapshot.illuminationScale, 0.42 );
    assert.equal( snapshot.warmthScale, 1 );
    assert.equal( snapshot.textureInputCount, 0 );
    assert.equal( snapshot.vertexCount, ( snapshot.segments + 1 ) ** 2 );
    assert.equal( snapshot.triangleCount, snapshot.segments ** 2 * 2 );
    assert.equal( substrate.mesh.material.isMeshStandardMaterial, true );
    assert.equal( substrate.mesh.material.side, THREE.DoubleSide );
    assert.equal( substrate.mesh.material.transparent, false );
    assert.equal( substrate.mesh.material.depthTest, true );
    assert.equal( substrate.mesh.material.depthWrite, true );
    assert.equal( substrate.mesh.renderOrder, compositionSubstrateRenderOrder );
    assert.equal( substrate.mesh.renderOrder, -20 );

    const shader = createShaderFixture();
    substrate.mesh.material.onBeforeCompile( shader );
    assert.equal( shader.uniforms.substrateIlluminationScale.value, 0.42 );
    assert.equal( shader.uniforms.substrateWarmthScale.value, 1 );
    assert.equal(
        fixture.scene.children.some( ( child ) => child.isLight ),
        false
    );
    substrate.dispose();
} );

test( 'every possible crest remains beneath the outer level and deep medium', () => {
    const fixture = createFixture();
    const { substrate, membrane } = fixture;
    const snapshot = substrate.getSnapshot();
    const position = substrate.mesh.geometry.getAttribute( 'position' );

    assert.ok( snapshot.maximumCrest > 1 );
    for ( let index = 0; index < position.count; index += 1 )
    {
        const x = position.getX( index );
        const z = position.getZ( index );
        const highestSurface = position.getY( index )
            + snapshot.maximumCrest;
        assert.ok(
            highestSurface <= snapshot.outerSurfaceLevel + 1e-8,
            `vertex ${index} can rise above the outer substrate level`
        );
        assert.ok(
            highestSurface <= membrane.height( x, z )
                - snapshot.deepMediumDepth
                - snapshot.guaranteedDeepClearance
                + 1e-8,
            `vertex ${index} can rise out of the deep medium`
        );
    }
    substrate.dispose();
} );

test( 'the radial perimeter sink hides the square beyond finite terrain', () => {
    const fixture = createFixture();
    const { substrate } = fixture;
    const snapshot = substrate.getSnapshot();
    const position = substrate.mesh.geometry.getAttribute( 'position' );
    const halfExtent = snapshot.extent * 0.5;
    const terrainHalfDiagonal = Math.sqrt( 2 ) * fixture.membrane.size * 0.5;
    let boundaryCount = 0;
    let highestBoundary = -Infinity;

    assert.ok( snapshot.extent >= fixture.membrane.size * 5 );
    assert.ok( snapshot.extent * 0.37 > terrainHalfDiagonal );
    assert.ok( snapshot.edgeDrop > 40 );
    for ( let index = 0; index < position.count; index += 1 )
    {
        const x = position.getX( index );
        const z = position.getZ( index );
        if (
            Math.abs( Math.abs( x ) - halfExtent ) < 1e-8
            || Math.abs( Math.abs( z ) - halfExtent ) < 1e-8
        )
        {
            boundaryCount += 1;
            highestBoundary = Math.max(
                highestBoundary,
                position.getY( index )
            );
        }
    }
    assert.ok( boundaryCount > 0 );
    assert.ok(
        highestBoundary
            < -snapshot.outerDepth
                - snapshot.maximumCrest
                - snapshot.edgeDrop * 0.9,
        'every square boundary edge must be deeply submerged'
    );
    substrate.dispose();
} );

test( 'surface revisions, visibility and motion mutate no resources', () => {
    const fixture = createFixture();
    const { substrate } = fixture;
    const geometry = substrate.mesh.geometry;
    const material = substrate.mesh.material;
    const childCount = fixture.scene.children.length;
    const firstSnapshot = substrate.getSnapshot();
    const firstCentre = geometry.getAttribute( 'position' ).getY(
        Math.floor( geometry.getAttribute( 'position' ).count / 2 )
    );

    assert.equal(
        substrate.setOuterDepth( compositionSubstrateRanges.outerDepth.max ),
        compositionSubstrateRanges.outerDepth.max
    );
    const depthSnapshot = substrate.getSnapshot();
    assert.ok( depthSnapshot.revision > firstSnapshot.revision );
    assert.equal( substrate.parameters.outerDepth,
        compositionSubstrateRanges.outerDepth.max );
    fixture.membraneParameters.depth = 7;
    fixture.membraneParameters.width = 5;
    fixture.reviseEnvelope();
    const membraneSnapshot = substrate.refreshSurface();
    const nextCentre = geometry.getAttribute( 'position' ).getY(
        Math.floor( geometry.getAttribute( 'position' ).count / 2 )
    );
    assert.notEqual( nextCentre, firstCentre );
    assert.ok( membraneSnapshot.revision > depthSnapshot.revision );
    assert.equal( substrate.mesh.geometry, geometry );
    assert.equal( substrate.mesh.material, material );
    assert.equal( fixture.scene.children.length, childCount );

    assert.equal( substrate.setVisible( false ), false );
    assert.equal( substrate.mesh.visible, false );
    assert.equal( substrate.getSnapshot().status, 'hidden' );
    assert.equal( substrate.setVisible( true ), true );
    assert.equal( substrate.mesh.visible, true );
    assert.equal( substrate.getSnapshot().status, 'active' );
    assert.equal( substrate.mesh.geometry, geometry );
    assert.equal( substrate.mesh.material, material );
    assert.equal( fixture.scene.children.length, childCount );

    const shader = createShaderFixture();
    material.onBeforeCompile( shader );
    assert.match(
        shader.vertexShader,
        /objectNormal\s*\+\s*vec3\(/
    );
    substrate.update( 0 );
    substrate.update( 50 );
    assert.ok( shader.uniforms.substrateTime.value > 0 );
    assert.equal( substrate.mesh.geometry, geometry );
    assert.equal( substrate.mesh.material, material );
    assert.equal( fixture.scene.children.length, childCount );

    assert.throws(
        () => substrate.setOuterDepth(
            compositionSubstrateRanges.outerDepth.max + 0.01
        ),
        /must be between/
    );
    substrate.dispose();
} );

test( 'energetic controls update and reset the one live composition surface', () => {
    const fixture = createFixture();
    const { substrate } = fixture;
    const geometry = substrate.mesh.geometry;
    const material = substrate.mesh.material;
    const childCount = fixture.scene.children.length;
    const outerDepth = substrate.parameters.outerDepth;
    const initialCrest = substrate.getSnapshot().maximumCrest;
    const shader = createShaderFixture();
    material.onBeforeCompile( shader );

    for ( const [ property, range ] of Object.entries(
        compositionSubstrateSurfaceRanges
    ) )
    {
        assert.equal( substrate.setParameter( property, range.max ), range.max );
        assert.equal( substrate.surfaceParameters[property], range.max );
        assert.equal(
            substrate.getSnapshot().surfaceParameters[property],
            range.max
        );
    }

    const energeticSnapshot = substrate.getSnapshot();
    assert.ok( energeticSnapshot.maximumCrest > initialCrest );
    assert.equal( substrate.parameters.outerDepth, outerDepth );
    assert.equal( substrate.mesh.geometry, geometry );
    assert.equal( substrate.mesh.material, material );
    assert.equal( fixture.scene.children.length, childCount );

    const position = geometry.getAttribute( 'position' );
    for ( let index = 0; index < position.count; index += 1 )
    {
        const x = position.getX( index );
        const z = position.getZ( index );
        const highestSurface = position.getY( index )
            + energeticSnapshot.maximumCrest;
        assert.ok(
            highestSurface <= energeticSnapshot.outerSurfaceLevel + 1e-8,
            `controlled crest ${index} can rise above the outer datum`
        );
        assert.ok(
            highestSurface <= fixture.membrane.height( x, z )
                - energeticSnapshot.deepMediumDepth
                - energeticSnapshot.guaranteedDeepClearance
                + 1e-8,
            `controlled crest ${index} can escape the deep-medium boundary`
        );
    }

    assert.equal( shader.uniforms.substrateSwellHeight.value,
        compositionSubstrateSurfaceRanges.swellHeight.max );
    assert.equal( shader.uniforms.substrateEnergy.value,
        compositionSubstrateSurfaceRanges.energy.max );
    assert.equal( shader.uniforms.substrateCrestTension.value,
        compositionSubstrateSurfaceRanges.crestTension.max );
    assert.equal( shader.uniforms.substrateCrossCurrent.value,
        compositionSubstrateSurfaceRanges.crossCurrent.max );
    assert.equal( shader.uniforms.substrateFineActivity.value,
        compositionSubstrateSurfaceRanges.fineActivity.max );
    assert.equal( shader.uniforms.substrateReflection.value,
        compositionSubstrateSurfaceRanges.reflection.max );

    substrate.update( 0 );
    substrate.update( 50 );
    const movingPhase = shader.uniforms.substrateTime.value;
    assert.ok( movingPhase > 0 );
    assert.equal( substrate.setFrozen( true ), true );
    assert.equal( substrate.getSnapshot().frozen, true );
    substrate.update( 5000 );
    assert.equal( shader.uniforms.substrateTime.value, movingPhase );
    assert.equal( substrate.setFrozen( false ), false );
    assert.equal( substrate.getSnapshot().frozen, false );
    substrate.update( 5050 );
    assert.ok( shader.uniforms.substrateTime.value > movingPhase );

    substrate.setOuterDepth( compositionSubstrateRanges.outerDepth.max );
    substrate.setFrozen( true );
    substrate.reset();
    assert.equal(
        substrate.parameters.outerDepth,
        compositionSubstrateRanges.outerDepth.max,
        'surface reset must preserve the composition-owned placement depth'
    );
    assert.deepEqual(
        { ...substrate.surfaceParameters },
        compositionSubstrateSurfaceDefaults
    );
    assert.deepEqual(
        substrate.getSnapshot().surfaceParameters,
        compositionSubstrateSurfaceDefaults
    );
    assert.equal( substrate.getSnapshot().frozen, false );
    assert.equal( shader.uniforms.substrateTime.value, 0 );
    assert.equal( substrate.mesh.geometry, geometry );
    assert.equal( substrate.mesh.material, material );
    assert.equal( fixture.scene.children.length, childCount );

    assert.throws(
        () => substrate.setParameter(
            'swellHeight',
            compositionSubstrateSurfaceRanges.swellHeight.max + 0.01
        ),
        /must be between/
    );
    assert.throws(
        () => substrate.setParameter( 'unknown', 1 ),
        /Unknown energetic sea parameter/
    );
    substrate.dispose();
} );

test( 'disposal is idempotent and leaves unrelated composition state alone', () => {
    const fixture = createFixture();
    fixture.substrate.dispose();
    fixture.substrate.dispose();
    assert.equal( fixture.scene.children.includes( fixture.substrate.mesh ), false );
    assert.equal( fixture.scene.children.includes( fixture.retained ), true );
    assert.equal( fixture.retained.visible, true );
} );

test( 'the adapter contains no second material, light or render loop', () => {
    const source = readFileSync(
        new URL(
            '../../src/category-tree/composition/substrate-instance.js',
            import.meta.url
        ),
        'utf8'
    );
    assert.match( source, /createEnergeticSeaLayer\s*\(/ );
    assert.equal(
        Array.from( source.matchAll( /createEnergeticSeaLayer\s*\(/g ) ).length,
        1
    );
    assert.doesNotMatch(
        source,
        /ShaderMaterial|MeshStandardMaterial|PlaneGeometry|onBeforeCompile|vertexShader|fragmentShader|TextureLoader|DataTexture/
    );
    assert.doesNotMatch(
        source,
        /AmbientLight|DirectionalLight|HemisphereLight|PointLight|SpotLight/
    );
    assert.doesNotMatch(
        source,
        /requestAnimationFrame|setAnimationLoop|world\.start/
    );
} );

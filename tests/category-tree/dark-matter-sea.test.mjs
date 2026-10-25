import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as THREE from 'three';
import {
    createDarkMatterSea,
    darkMatterSeaDefaults,
    darkMatterSeaRanges,
    evaluateDarkMatterGrazingReveal
} from '../../src/category-tree/composition/dark-matter-sea.js';

function createFixture( {
    envelopeStatus = 'attached',
    envelopeDepth = 0.72
} = {} )
{
    const scene = new THREE.Scene();
    const parameters = { depth: 5.5, width: 3.8 };
    const membrane = {
        size: 24,
        height( x, z ) {
            return -parameters.depth * Math.exp(
                -( x * x + z * z )
                    / ( parameters.width * parameters.width )
            );
        }
    };
    let envelopeRevision = 1;
    let status = envelopeStatus;
    let deepMediumDepth = envelopeDepth;
    const plantingEnvelope = {
        getSnapshot() {
            return {
                revision: envelopeRevision,
                status,
                deepMediumDepth
            };
        }
    };
    const sea = createDarkMatterSea( {
        scene,
        membrane,
        plantingEnvelope
    } );
    return {
        scene,
        parameters,
        membrane,
        sea,
        reviseEnvelope( nextDepth, nextStatus = status ) {
            deepMediumDepth = nextDepth;
            status = nextStatus;
            envelopeRevision += 1;
        }
    };
}

function assertNear( actual, expected, tolerance = 1e-8 )
{
    assert.ok(
        Math.abs( actual - expected ) <= tolerance,
        `${actual} must be within ${tolerance} of ${expected}`
    );
}

function findGreatestInterpolatedIntrusion( fixture, snapshot )
{
    const geometry = fixture.sea.mesh.geometry;
    const position = geometry.getAttribute( 'position' );
    const geometryIndex = geometry.getIndex();
    let greatestIntrusion = -Infinity;
    let point = null;
    for ( let index = 0; index < geometryIndex.count; index += 3 )
    {
        const first = geometryIndex.getX( index );
        const second = geometryIndex.getX( index + 1 );
        const third = geometryIndex.getX( index + 2 );
        const x = (
            position.getX( first )
            + position.getX( second )
            + position.getX( third )
        ) / 3;
        const z = (
            position.getZ( first )
            + position.getZ( second )
            + position.getZ( third )
        ) / 3;
        const interpolatedCrest = (
            position.getY( first )
            + position.getY( second )
            + position.getY( third )
        ) / 3 + snapshot.maximumRelief;
        const deepBoundary = fixture.membrane.height( x, z )
            - snapshot.deepMediumDepth;
        const intrusion = interpolatedCrest
            + snapshot.guaranteedDeepClearance
            - deepBoundary;
        if ( intrusion > greatestIntrusion )
        {
            greatestIntrusion = intrusion;
            point = { x, z };
        }
    }
    return { greatestIntrusion, point };
}

test( 'dark-matter sea defaults and ranges are finite bounded study controls', () => {
    assert.ok( Object.isFrozen( darkMatterSeaDefaults ) );
    assert.ok( Object.isFrozen( darkMatterSeaRanges ) );
    for ( const [ property, value ] of Object.entries( darkMatterSeaDefaults ) )
    {
        const range = darkMatterSeaRanges[property];
        assert.ok( Object.isFrozen( range ) );
        assert.ok( Number.isFinite( value ) );
        assert.ok( value >= range.min && value <= range.max );
        const step = ( value - range.min ) / range.step;
        assert.ok( Math.abs( step - Math.round( step ) ) < 1e-9 );
    }
    assert.ok(
        darkMatterSeaDefaults.deepClearance
            + darkMatterSeaDefaults.relief * 2 < 0.19,
        'the accepted principal-root depth margin must exceed the default trough'
    );
} );

test( 'the sea is an opaque textureless pressure surface with ordinary depth', () => {
    const fixture = createFixture();
    const { material } = fixture.sea.mesh;
    assert.ok( material.isMeshStandardMaterial );
    assert.equal( material.transparent, false );
    assert.equal( material.opacity, 1 );
    assert.equal( material.depthTest, true );
    assert.equal( material.depthWrite, true );
    assert.equal( material.side, THREE.DoubleSide );
    for ( const property of [
        'map',
        'alphaMap',
        'aoMap',
        'bumpMap',
        'displacementMap',
        'emissiveMap',
        'envMap',
        'lightMap',
        'metalnessMap',
        'normalMap',
        'roughnessMap'
    ] )
    {
        assert.equal( material[property], null, `${property} must be absent` );
    }
    assert.equal( fixture.sea.getSnapshot().textureInputCount, 0 );

    const source = readFileSync(
        new URL(
            '../../src/category-tree/composition/dark-matter-sea.js',
            import.meta.url
        ),
        'utf8'
    );
    assert.doesNotMatch(
        source,
        /TextureLoader|DataTexture|sampler(?:2D|Cube)|texture2D\s*\(/
    );
    fixture.sea.dispose();
} );

test( 'grazing reveal contributes bounded angle-dependent graphite energy', () => {
    const fixture = createFixture();
    const { material } = fixture.sea.mesh;
    const visibility = material.userData.darkMatterSea;
    assert.equal(
        visibility.visibilityModel,
        'angle-dependent graphite reflection'
    );
    assert.equal( visibility.viewResponseFloor, 0 );
    assert.ok( visibility.viewResponseExponent > 1 );
    assert.ok( visibility.externalLightResponse > 0 );
    assert.ok( visibility.externalLightResponse <= 0.25 );
    assert.ok( material.color.r + material.color.g + material.color.b > 0.02 );
    assert.ok( material.emissive.r + material.emissive.g + material.emissive.b > 0 );
    assert.ok( material.emissiveIntensity > 0 );

    const shader = {
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
    material.onBeforeCompile( shader );
    assert.match(
        shader.fragmentShader,
        /darkMatterRevealEnergy\s*=\s*darkMatterReveal/
    );
    assert.match(
        shader.fragmentShader,
        /reflectedLight\.indirectSpecular\s*\+=\s*darkMatterRevealColour/
    );
    assert.match(
        shader.fragmentShader,
        /reflectedLight\.directDiffuse\s*\*=\s*0\.08/
    );
    assert.equal(
        shader.uniforms.darkMatterReveal.value,
        darkMatterSeaDefaults.grazingReveal
    );
    fixture.sea.setParameter(
        'grazingReveal',
        darkMatterSeaRanges.grazingReveal.max
    );
    assert.equal(
        shader.uniforms.darkMatterReveal.value,
        darkMatterSeaRanges.grazingReveal.max
    );
    assert.ok(
        shader.uniforms.darkMatterReveal.value
            / darkMatterSeaDefaults.grazingReveal > 1.5
    );
    assert.equal( evaluateDarkMatterGrazingReveal( 0, 0.1 ), 0 );
    const edgeResponse = evaluateDarkMatterGrazingReveal( 1.2, 0.1 );
    const faceResponse = evaluateDarkMatterGrazingReveal( 1.2, 0.95 );
    assert.ok( edgeResponse >= 0.25 );
    assert.ok( faceResponse <= 0.02 );
    assert.ok(
        evaluateDarkMatterGrazingReveal( 1.2, 0.1 )
            > evaluateDarkMatterGrazingReveal( 0.6, 0.1 )
    );
    assert.throws(
        () => evaluateDarkMatterGrazingReveal( 1.21, 0.1 ),
        /must be between/
    );
    assert.throws(
        () => evaluateDarkMatterGrazingReveal( 0.7, Number.NaN ),
        /must be finite/
    );
    fixture.sea.dispose();
} );

test( 'every possible crest remains below the P2 deep-medium boundary', () => {
    const fixture = createFixture();
    const snapshot = fixture.sea.getSnapshot();
    const geometry = fixture.sea.mesh.geometry;
    const position = geometry.getAttribute( 'position' );
    for ( let index = 0; index < position.count; index += 1 )
    {
        const x = position.getX( index );
        const base = position.getY( index );
        const z = position.getZ( index );
        const highestMovingSurface = base + snapshot.maximumRelief;
        const deepestAllowedHeight = fixture.membrane.height( x, z )
            - snapshot.deepMediumDepth
            - snapshot.guaranteedDeepClearance;
        assert.ok(
            highestMovingSurface <= deepestAllowedHeight + 1e-6,
            `vertex ${index} can rise ${( highestMovingSurface - deepestAllowedHeight ).toExponential()} out of deep-medium`
        );
    }
    for ( const [ depth, width ] of [
        [ 5.5, 3.8 ],
        [ 1, 1.5 ],
        [ 8, 1.5 ],
        [ 1, 6 ],
        [ 8, 6 ]
    ] )
    {
        fixture.parameters.depth = depth;
        fixture.parameters.width = width;
        fixture.reviseEnvelope( snapshot.deepMediumDepth );
        const scenarioSnapshot = fixture.sea.updateSurface();
        const { greatestIntrusion, point } = findGreatestInterpolatedIntrusion(
            fixture,
            scenarioSnapshot
        );
        assert.ok(
            greatestIntrusion <= 1e-6,
            `depth ${depth}, width ${width} crest intrudes ${greatestIntrusion} at ${JSON.stringify( point )}`
        );
    }
    fixture.sea.dispose();
} );

test( 'the field outlives the finite terrain and sinks its perimeter', () => {
    const fixture = createFixture();
    const snapshot = fixture.sea.getSnapshot();
    const position = fixture.sea.mesh.geometry.getAttribute( 'position' );
    assert.ok( snapshot.extent >= fixture.membrane.size * 5 );
    assert.equal( snapshot.coordinateConcentration, 4 );
    assert.ok(
        snapshot.guaranteedDeepClearance
            + snapshot.interpolationSafety
            + snapshot.maximumRelief * 2 < 0.19,
        'the complete default trough must remain inside the accepted root margin'
    );
    assert.ok( snapshot.edgeDrop > fixture.parameters.depth * 4 );
    assert.ok(
        snapshot.extent * 0.37 > 100,
        'the perimeter transition must begin beyond the fixed review frusta'
    );
    const halfTerrainDiagonal = Math.sqrt( 2 ) * fixture.membrane.size * 0.5;
    assert.ok( snapshot.extent * 0.37 > halfTerrainDiagonal );

    let centreHeight = null;
    let edgeHeight = Infinity;
    for ( let index = 0; index < position.count; index += 1 )
    {
        const x = position.getX( index );
        const z = position.getZ( index );
        const radius = Math.hypot( x, z );
        if ( radius < 0.01 ) centreHeight = position.getY( index );
        if ( radius > snapshot.extent * 0.48 )
        {
            edgeHeight = Math.min( edgeHeight, position.getY( index ) );
        }
    }
    assert.ok( Number.isFinite( centreHeight ) );
    assert.ok( edgeHeight < centreHeight - snapshot.edgeDrop * 0.8 );
    fixture.sea.dispose();
} );

test( 'surface revisions preserve allocation and follow the live P2 boundary', () => {
    const fixture = createFixture();
    const geometry = fixture.sea.mesh.geometry;
    const material = fixture.sea.mesh.material;
    const first = fixture.sea.getSnapshot();
    fixture.parameters.depth = 6.4;
    fixture.reviseEnvelope( 0.91 );
    const updated = fixture.sea.update( 1200 );
    assert.equal( fixture.sea.mesh.geometry, geometry );
    assert.equal( fixture.sea.mesh.material, material );
    assert.equal( updated.geometryUuid, first.geometryUuid );
    assert.equal( updated.materialUuid, first.materialUuid );
    assert.equal( updated.envelopeRevision, 2 );
    assert.equal( updated.deepMediumDepth, 0.91 );
    assert.ok( updated.revision > first.revision );
    fixture.sea.dispose();
} );

test( 'a detached envelope falls back to a stable membrane-derived band', () => {
    const fixture = createFixture( { envelopeStatus: 'detached' } );
    const first = fixture.sea.getSnapshot();
    assert.equal( first.depthSource, 'membrane-fallback' );
    assert.equal( first.envelopeRevision, null );
    assert.ok( first.deepMediumDepth > 0 );
    const second = fixture.sea.update( 800 );
    assert.equal( second.revision, first.revision );
    assert.equal( second.deepMediumDepth, first.deepMediumDepth );
    fixture.sea.dispose();
} );

test( 'motion is deterministic, bounded and dormant while hidden', () => {
    const fixture = createFixture();
    fixture.sea.update( 2500 );
    const firstTime = fixture.sea.getTime();
    fixture.sea.update( 2500 );
    assertNear( fixture.sea.getTime(), firstTime );
    fixture.sea.update( Number.MAX_SAFE_INTEGER );
    assert.ok( Number.isFinite( fixture.sea.getTime() ) );
    assert.ok( fixture.sea.getTime() >= 0 );
    const beforeSpeedChange = fixture.sea.getTime();
    fixture.sea.setParameter( 'drift', 0.2 );
    assert.equal( fixture.sea.getTime(), beforeSpeedChange );
    fixture.sea.setVisible( false );
    const hiddenTime = fixture.sea.getTime();
    fixture.sea.update( 9000 );
    assert.equal( fixture.sea.getTime(), hiddenTime );
    assert.throws( () => fixture.sea.update( Number.NaN ), /must be finite/ );
    assert.throws( () => fixture.sea.update( -1 ), /cannot be negative/ );
    fixture.sea.dispose();
} );

test( 'parameter changes validate ranges without replacing resources', () => {
    const fixture = createFixture();
    const geometry = fixture.sea.mesh.geometry;
    const material = fixture.sea.mesh.material;
    assert.equal( fixture.sea.setParameter( 'relief', 0.08 ), 0.08 );
    assert.equal( fixture.sea.getSnapshot().maximumRelief, 0.08 );
    assert.equal( fixture.sea.mesh.geometry, geometry );
    assert.equal( fixture.sea.mesh.material, material );
    assert.throws(
        () => fixture.sea.setParameter( 'relief', 0.15 ),
        /must be between/
    );
    assert.throws(
        () => fixture.sea.setParameter( 'unknown', 0 ),
        /Unknown dark-matter sea parameter/
    );
    fixture.sea.dispose();
} );

test( 'all four study controls have material endpoint effects', () => {
    const fixture = createFixture();
    const position = fixture.sea.mesh.geometry.getAttribute( 'position' );
    const copyHeights = () => Array.from(
        { length: position.count },
        ( unused, index ) => position.getY( index )
    );

    fixture.sea.setParameter( 'outerDepth', 1.2 );
    const shallowHeights = copyHeights();
    fixture.sea.setParameter( 'outerDepth', 2.4 );
    const deepHeights = copyHeights();
    const meaningfullyLowered = deepHeights.filter(
        ( height, index ) => shallowHeights[index] - height >= 1.08
    ).length;
    assert.ok( meaningfullyLowered / position.count >= 0.75 );

    fixture.sea.setParameter( 'relief', 0 );
    const flatBase = copyHeights();
    fixture.sea.setParameter( 'relief', 0.14 );
    const relievedBase = copyHeights();
    const reliefCompensation = relievedBase.map(
        ( height, index ) => Math.abs( height - flatBase[index] )
    ).sort( ( first, second ) => first - second );
    assert.ok(
        reliefCompensation[Math.floor( reliefCompensation.length / 2 )]
            >= 0.13
    );

    fixture.sea.reset();
    fixture.sea.setParameter( 'drift', 0 );
    fixture.sea.update( 0 );
    for ( let index = 1; index <= 200; index += 1 )
    {
        fixture.sea.update( index * 50 );
    }
    assert.equal( fixture.sea.getTime(), 0 );
    fixture.sea.reset();
    fixture.sea.setParameter( 'drift', 0.35 );
    fixture.sea.update( 0 );
    for ( let index = 1; index <= 200; index += 1 )
    {
        fixture.sea.update( index * 50 );
    }
    assert.equal( fixture.sea.getSnapshot().driftPhaseScale, 5 );
    assertNear( fixture.sea.getTime(), 17.5, 1e-10 );
    fixture.sea.dispose();
} );

test( 'visibility and disposal remain composition-local and idempotent', () => {
    const fixture = createFixture();
    const retained = new THREE.Group();
    fixture.scene.add( retained );
    assert.equal( fixture.sea.setVisible( false ), false );
    assert.equal( fixture.sea.mesh.visible, false );
    assert.ok( fixture.scene.children.includes( retained ) );

    let geometryDisposals = 0;
    let materialDisposals = 0;
    const geometryDispose = fixture.sea.mesh.geometry.dispose.bind(
        fixture.sea.mesh.geometry
    );
    const materialDispose = fixture.sea.mesh.material.dispose.bind(
        fixture.sea.mesh.material
    );
    fixture.sea.mesh.geometry.dispose = () => {
        geometryDisposals += 1;
        geometryDispose();
    };
    fixture.sea.mesh.material.dispose = () => {
        materialDisposals += 1;
        materialDispose();
    };
    fixture.sea.dispose();
    fixture.sea.dispose();
    assert.equal( geometryDisposals, 1 );
    assert.equal( materialDisposals, 1 );
    assert.ok( fixture.scene.children.includes( retained ) );
    assert.ok( !fixture.scene.children.includes( fixture.sea.mesh ) );
} );

test( 'the composition owns P5 visibility and animation without another loop', () => {
    const main = readFileSync(
        new URL(
            '../../src/category-tree/composition/main.js',
            import.meta.url
        ),
        'utf8'
    );
    assert.match( main, /createDarkMatterSea\(\s*\{/ );
    assert.match( main, /darkMatterSea\.setVisible\( mode\.substrate \)/ );
    assert.match( main, /const isolatedSubstrate = modeId === 'substrate'/ );
    for ( const light of [ 'hemisphereLight', 'keyLight', 'rimLight' ] )
    {
        assert.match(
            main,
            new RegExp(
                `universe\\.environment\\.${light}\\.visible = !isolatedSubstrate`
            )
        );
    }
    assert.match( main, /membraneSurface\.visible = mode\.terrain/ );
    assert.match( main,
        /receiver\.visible = mode\.terrain && mode\.universe/ );
    assert.match( main, /darkMatterSea\.update\( time \)/ );
    assert.match( main,
        /tree-substrate[\s\S]*?substrate:\s*true/ );
    assert.match( main,
        /tree:\s*Object\.freeze[\s\S]*?substrate:\s*false/ );
    assert.equal(
        Array.from( main.matchAll( /world\.start\(/g ) ).length,
        1
    );
    assert.doesNotMatch( main, /requestAnimationFrame|setAnimationLoop/ );
} );

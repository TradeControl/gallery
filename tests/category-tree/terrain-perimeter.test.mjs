import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
    castingTerrainApronDefaults,
    castingTerrainCoreDefaults,
    createGaussianMembrane,
    sluiceMoltenDomainDefaults,
    sluiceSourceRadiusRange
} from '../../src/lib/casting-pit/index.js';

const sluiceSource = readFileSync(
    new URL(
        '../../src/lib/casting-pit/universe/sluice-gate-layer.js',
        import.meta.url
    ),
    'utf8'
);
const compositionSource = readFileSync(
    new URL(
        '../../src/category-tree/composition/main.js',
        import.meta.url
    ),
    'utf8'
);
const physicalSource = readFileSync(
    new URL(
        '../../src/category-tree/casting-pit/physical-layer/main.js',
        import.meta.url
    ),
    'utf8'
);
const universeCosmosSource = readFileSync(
    new URL(
        '../../src/category-tree/casting-pit/universe-cosmos/main.js',
        import.meta.url
    ),
    'utf8'
);

function assertNear( actual, expected, tolerance = 1e-5 )
{
    assert.ok(
        Math.abs( actual - expected ) <= tolerance,
        `${actual} must be within ${tolerance} of ${expected}`
    );
}

test( 'the terrain apron is a deterministic irregular radial sink', () => {
    const parameters = { depth: 5.5, width: 3.8 };
    const membrane = createGaussianMembrane( parameters );
    const first = membrane.createTerrainApronGeometry();
    const second = membrane.createTerrainApronGeometry();
    const contract = first.userData.terrainApron;

    assert.ok( Object.isFrozen( castingTerrainApronDefaults ) );
    assert.ok( Object.isFrozen( contract ) );
    assert.equal( contract.boundaryShape, 'irregular-radial-sink' );
    assert.equal(
        first.attributes.position.count,
        ( contract.radialSegments + 1 ) * contract.angularSegments
    );
    assert.equal(
        first.index.count,
        contract.radialSegments * contract.angularSegments * 6
    );
    assert.deepEqual(
        Array.from( first.attributes.position.array ),
        Array.from( second.attributes.position.array )
    );
    assert.deepEqual(
        Array.from( first.index.array ),
        Array.from( second.index.array )
    );
    assert.ok(
        contract.maximumOuterRadius - contract.minimumOuterRadius > 1.5,
        'the outer edge should not read as a regular card or square'
    );

    const positions = first.attributes.position;
    const offsets = first.userData.terrainApronSinkOffsets;
    for ( let angle = 0; angle < contract.angularSegments; angle += 1 )
    {
        const innerX = positions.getX( angle );
        const innerZ = positions.getZ( angle );
        assertNear( Math.hypot( innerX, innerZ ), contract.innerRadius );
        assertNear( offsets[angle], contract.overlapDepth );

        const outerIndex = contract.radialSegments
            * contract.angularSegments
            + angle;
        const outerRadius = Math.hypot(
            positions.getX( outerIndex ),
            positions.getZ( outerIndex )
        );
        assert.ok(
            outerRadius >= contract.minimumOuterRadius - 1e-5
                && outerRadius <= contract.maximumOuterRadius + 1e-5
        );
        assertNear(
            offsets[outerIndex],
            contract.overlapDepth + contract.sinkDepth
        );
    }

    assert.ok(
        contract.supportRadius
            >= sluiceSourceRadiusRange.max
                + sluiceSourceRadiusRange.variation,
        'the unsunk apron must support every bounded real source position'
    );
} );

test( 'the visible terrain core joins the apron as one exact radial surface', () => {
    const parameters = { depth: 5.5, width: 3.8 };
    const membrane = createGaussianMembrane( parameters );
    const first = membrane.createTerrainCoreGeometry();
    const second = membrane.createTerrainCoreGeometry();
    const apron = membrane.createTerrainApronGeometry();
    const contract = first.userData.terrainCore;

    assert.ok( Object.isFrozen( castingTerrainCoreDefaults ) );
    assert.ok( Object.isFrozen( contract ) );
    assert.equal( contract.radius, castingTerrainApronDefaults.innerRadius );
    assert.equal( castingTerrainApronDefaults.overlapDepth, 0 );
    assert.equal(
        first.attributes.position.count,
        1 + contract.radialSegments * contract.angularSegments
    );
    assert.equal(
        first.index.count,
        contract.angularSegments * 3
            + ( contract.radialSegments - 1 )
                * contract.angularSegments
                * 6
    );
    assert.deepEqual(
        Array.from( first.attributes.position.array ),
        Array.from( second.attributes.position.array )
    );
    assert.deepEqual(
        Array.from( first.index.array ),
        Array.from( second.index.array )
    );

    const corePositions = first.attributes.position;
    const apronPositions = apron.attributes.position;
    const coreBoundaryStart = 1
        + ( contract.radialSegments - 1 ) * contract.angularSegments;
    for ( let angle = 0; angle < contract.angularSegments; angle += 1 )
    {
        const coreIndex = coreBoundaryStart + angle;
        assertNear(
            corePositions.getX( coreIndex ),
            apronPositions.getX( angle ),
            1e-6
        );
        assertNear(
            corePositions.getY( coreIndex ),
            apronPositions.getY( angle ),
            1e-6
        );
        assertNear(
            corePositions.getZ( coreIndex ),
            apronPositions.getZ( angle ),
            1e-6
        );
    }
} );

test( 'apron deformation preserves the Gaussian contract and leaves the membrane unchanged', () => {
    const parameters = { depth: 5.5, width: 3.8 };
    const membrane = createGaussianMembrane( parameters );
    const surface = membrane.createGeometry( 4 );
    const apron = membrane.createTerrainApronGeometry( {
        radialSegments: 8,
        angularSegments: 24
    } );
    membrane.deform( surface );

    const surfacePositions = surface.attributes.position;
    for ( let index = 0; index < surfacePositions.count; index += 1 )
    {
        const x = surfacePositions.getX( index );
        const z = surfacePositions.getZ( index );
        const radiusSquared = x * x + z * z;
        assertNear(
            surfacePositions.getY( index ),
            -parameters.depth * Math.exp(
                -radiusSquared / ( parameters.width * parameters.width )
            )
        );
    }

    const materialPositions = apron.userData.materialPositions;
    const offsets = apron.userData.terrainApronSinkOffsets;
    parameters.depth = 7.25;
    parameters.width = 4.4;
    membrane.deform( apron );
    for ( let index = 0; index < apron.attributes.position.count; index += 1 )
    {
        const offset = index * 3;
        const x = materialPositions[offset];
        const z = materialPositions[offset + 2];
        assertNear( apron.attributes.position.getX( index ), x );
        assertNear( apron.attributes.position.getZ( index ), z );
        assertNear(
            apron.attributes.position.getY( index ),
            membrane.height( x, z ) - offsets[index]
        );
    }

    const gradient = membrane.gradient( 1.2, -0.8 );
    const factor = 2 * parameters.depth
        * Math.exp(
            -( 1.2 ** 2 + ( -0.8 ) ** 2 )
                / ( parameters.width * parameters.width )
        )
        / ( parameters.width * parameters.width );
    assertNear( gradient.x, factor * 1.2, 1e-9 );
    assertNear( gradient.z, factor * -0.8, 1e-9 );
} );

test( 'the apron remains a library capability while active studies opt out', () => {
    assert.match(
        sluiceSource,
        /const membraneGeometry = membrane\.createTerrainCoreGeometry\?\.\(\)/
    );
    assert.match(
        sluiceSource,
        /const moltenGeometry = createMembraneGeometry\([\s\S]*?\{ size: field\.size \}\s*\);/
    );
    assert.match(
        sluiceSource,
        /new THREE\.Mesh\( terrainApronGeometry, membraneMaterial \)/
    );
    assert.match(
        sluiceSource,
        /if \( terrainApronGeometry \) deformMembrane\( terrainApronGeometry \)/
    );
    assert.match(
        sluiceSource,
        /environment:\s*\{[\s\S]*?membraneSurface,\s*terrainApron,/
    );
    assert.doesNotMatch(
        sluiceSource,
        /terrainApron[\s\S]{0,300}transparent:\s*true/
    );
    assert.match(
        compositionSource,
        /createSluiceGateLayer\([\s\S]*?includeEnvironment:\s*false/
    );
    assert.doesNotMatch(
        compositionSource,
        /membraneSurface\.visible|terrainApron\.visible|receiver\.visible|mode\.terrain/
    );
    for ( const source of [ physicalSource, universeCosmosSource ] )
    {
        assert.match(
            source,
            /createSluiceGateLayer\([\s\S]*?includeEnvironment:\s*false/
        );
        assert.doesNotMatch(
            source,
            /membraneSurface\.visible|terrainApron\.visible|receiver\.visible/
        );
    }
} );

test( 'molten presentation expires through an irregular radial mask before its square field edge', () => {
    const maximumSourceRadius = sluiceSourceRadiusRange.max
        + sluiceSourceRadiusRange.variation;
    const fullCoverageRadius = (
        sluiceMoltenDomainDefaults.maskLimitMin
            - sluiceMoltenDomainDefaults.maskFadeWidth
    ) * sluiceMoltenDomainDefaults.radius;
    const maximumCoverageRadius = sluiceMoltenDomainDefaults.maskLimitMax
        * sluiceMoltenDomainDefaults.radius;
    assert.equal(
        sluiceMoltenDomainDefaults.size,
        sluiceMoltenDomainDefaults.radius * 2
    );
    assert.ok(
        fullCoverageRadius > maximumSourceRadius,
        'every bounded source must sit inside full molten display coverage'
    );
    assert.ok(
        castingTerrainApronDefaults.supportRadius >= maximumCoverageRadius,
        'the flat apron must support the complete visible molten fade'
    );
    assert.ok(
        sluiceMoltenDomainDefaults.size
            / sluiceMoltenDomainDefaults.resolution <= 0.15,
        'the expanded field must retain useful spatial sampling'
    );

    const membrane = createGaussianMembrane( { depth: 5.5, width: 3.8 } );
    const domainGeometry = membrane.createGeometry( 4, {
        size: sluiceMoltenDomainDefaults.size
    } );
    assert.equal(
        domainGeometry.userData.membraneSize,
        sluiceMoltenDomainDefaults.size
    );
    const domainPositions = domainGeometry.attributes.position;
    const domainXs = Array.from(
        { length: domainPositions.count },
        ( _, index ) => domainPositions.getX( index )
    );
    const domainZs = Array.from(
        { length: domainPositions.count },
        ( _, index ) => domainPositions.getZ( index )
    );
    assertNear( Math.min( ...domainXs ), -sluiceMoltenDomainDefaults.radius );
    assertNear( Math.max( ...domainXs ), sluiceMoltenDomainDefaults.radius );
    assertNear( Math.min( ...domainZs ), -sluiceMoltenDomainDefaults.radius );
    assertNear( Math.max( ...domainZs ), sluiceMoltenDomainDefaults.radius );
    assert.match(
        sluiceSource,
        /vec2 perimeterPoint = vUv \* 2\.0 - 1\.0;/
    );
    assert.match(
        sluiceSource,
        /float perimeterNoise = noise\([\s\S]*?perimeterAngle/
    );
    assert.match(
        sluiceSource,
        /float perimeterCoverage = 1\.0 - smoothstep\(/
    );
    assert.match(
        sluiceSource,
        /coverage \*= perimeterCoverage;[\s\S]*?if \( coverage < 0\.015 \) discard;/
    );
} );

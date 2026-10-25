import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
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
    createTrunkInteriorDescriptor,
    createTrunkInteriorSkeletonGeometry
} from '../../src/lib/tree/engineered-tree-layer.js';

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

function createDescriptorFixture( growthTiers )
{
    const fixture = createFixture( growthTiers );
    return {
        ...fixture,
        descriptor: createTrunkInteriorDescriptor(
            fixture.hierarchy,
            fixture.positions,
            fixture.form
        )
    };
}

function bufferFor( array )
{
    return Buffer.from( array.buffer, array.byteOffset, array.byteLength );
}

function assertByteEquivalent( actual, expected, message )
{
    assert.equal( Buffer.compare( bufferFor( actual ), bufferFor( expected ) ), 0, message );
}

function digest( array )
{
    return createHash( 'sha256' ).update( bufferFor( array ) ).digest( 'hex' );
}

function matureProgress( hierarchy )
{
    return new Map( hierarchy.nodes
        .filter( ( node ) => node.latent && node.growthEligible !== false )
        .map( ( node ) => [ node.id, 1 ] ) );
}

function countTerminalDescendants( node )
{
    if ( node.children.length === 0 ) return node.kind === 'terminal' ? 1 : 0;
    return node.children.reduce(
        ( count, child ) => count + countTerminalDescendants( child ),
        0
    );
}

const expectedSpanCounts = new Map( [
    [ 0, [
        [ 'uptake', 3 ],
        [ 'exchange', 3 ],
        [ 'meaning', 3 ]
    ] ],
    [ 3, [
        [ 'uptake', 9 ],
        [ 'exchange', 9 ],
        [ 'meaning', 9 ],
        [ 'crown-trunk-1', 6 ],
        [ 'crown-trunk-2', 4 ],
        [ 'crown-trunk-3', 2 ]
    ] ],
    [ 8, [
        [ 'uptake', 24 ],
        [ 'exchange', 24 ],
        [ 'meaning', 24 ],
        [ 'crown-trunk-1', 21 ],
        [ 'crown-trunk-2', 19 ],
        [ 'crown-trunk-3', 17 ],
        [ 'crown-trunk-4', 15 ],
        [ 'crown-trunk-5', 12 ],
        [ 'crown-trunk-6', 9 ],
        [ 'crown-trunk-7', 6 ],
        [ 'crown-trunk-8', 3 ]
    ] ]
] );

test( 'C1 carriers are owned by exact authored attachments and persist rootward', () => {
    const expectedGroupCounts = new Map( [
        [ 0, [ 3 ] ],
        [ 3, [ 2, 4, 6, 9 ] ],
        [ 8, [ 3, 6, 9, 12, 15, 17, 19, 21, 24 ] ]
    ] );
    const expectedOwnerCounts = new Map( [ [ 0, 3 ], [ 3, 9 ], [ 8, 24 ] ] );

    for ( const growthTiers of [ 0, 3, 8 ] )
    {
        const { hierarchy, descriptor } = createDescriptorFixture( growthTiers );
        assert.equal( descriptor.carriers.length, expectedOwnerCounts.get( growthTiers ) );
        assert.deepEqual(
            descriptor.spans.map( ( span ) => [ span.childId, span.carrierCount ] ),
            expectedSpanCounts.get( growthTiers )
        );
        assert.deepEqual(
            descriptor.rootwardGroups.map( ( group ) => group.carrierCount ),
            expectedGroupCounts.get( growthTiers )
        );

        const authoredAttachments = descriptor.trunkNodeIds.flatMap( ( trunkNodeId ) =>
            hierarchy.byId.get( trunkNodeId ).children
                .filter( ( child ) => child.kind !== 'trunk' && child.growthEligible !== false )
                .map( ( child ) => child.id )
        ).sort();
        const carrierOwners = descriptor.carriers
            .map( ( carrier ) => carrier.ownerId )
            .sort();
        assert.deepEqual( carrierOwners, authoredAttachments );
        assert.equal( new Set( carrierOwners ).size, carrierOwners.length );

        for ( const carrier of descriptor.carriers )
        {
            const owner = hierarchy.byId.get( carrier.ownerId );
            assert.ok( owner, `carrier owner '${carrier.ownerId}' must be authored` );
            assert.equal( carrier.attachmentNodeId, owner.id );
            assert.equal( owner.parentId, carrier.entryTrunkNodeId );
            assert.notEqual( owner.kind, 'trunk' );
            assert.notEqual( owner.growthEligible, false );
            assert.equal( carrier.authoredDescendantLoad, countTerminalDescendants( owner ) );
            assert.deepEqual(
                carrier.supportingTrunkNodeIds,
                descriptor.trunkNodeIds.slice( 0, carrier.entryTrunkIndex + 1 )
            );

            const occupiedSpans = descriptor.spans
                .filter( ( span ) => span.carrierOwnerIds.includes( carrier.ownerId ) )
                .map( ( span ) => span.spanIndex );
            assert.deepEqual(
                occupiedSpans,
                Array.from( { length: carrier.entryTrunkIndex }, ( _, index ) => index ),
                `'${carrier.ownerId}' must continue through every and only rootward spans`
            );
        }
    }
} );

test( 'C1 placement is byte deterministic and existing carrier slots are tier stable', () => {
    for ( const growthTiers of [ 0, 3, 8 ] )
    {
        const first = createDescriptorFixture( growthTiers ).descriptor;
        const repeated = createDescriptorFixture( growthTiers ).descriptor;
        assertByteEquivalent(
            first.placementData,
            repeated.placementData,
            `tier-${growthTiers} descriptor placement must be byte equivalent`
        );

        const firstGeometry = createTrunkInteriorSkeletonGeometry( first );
        const repeatedGeometry = createTrunkInteriorSkeletonGeometry( repeated );
        assertByteEquivalent(
            firstGeometry.getAttribute( 'position' ).array,
            repeatedGeometry.getAttribute( 'position' ).array,
            `tier-${growthTiers} carrier vertices must be byte equivalent`
        );
        assertByteEquivalent(
            firstGeometry.index.array,
            repeatedGeometry.index.array,
            `tier-${growthTiers} carrier indices must be byte equivalent`
        );
        firstGeometry.dispose();
        repeatedGeometry.dispose();
    }

    const tierZero = createDescriptorFixture( 0 ).descriptor;
    const tierThree = createDescriptorFixture( 3 ).descriptor;
    const tierEight = createDescriptorFixture( 8 ).descriptor;
    for ( const [ lower, higher ] of [
        [ tierZero, tierThree ],
        [ tierThree, tierEight ]
    ] )
    {
        const higherByOwner = new Map( higher.carriers.map( ( carrier ) => [
            carrier.ownerId,
            carrier
        ] ) );
        for ( const carrier of lower.carriers )
        {
            const extended = higherByOwner.get( carrier.ownerId );
            assert.ok( extended );
            assert.equal( extended.entryAngle, carrier.entryAngle );
            assert.equal( extended.placementAngle, carrier.placementAngle );
            assert.equal( extended.slotX, carrier.slotX );
            assert.equal( extended.slotY, carrier.slotY );
            assert.equal( extended.slotRadius, carrier.slotRadius );
            assert.equal( extended.targetRadius, carrier.targetRadius );
            assert.equal( extended.angularRelief, carrier.angularRelief );
            assert.equal( extended.radialRelief, carrier.radialRelief );
            assert.equal( extended.radius, carrier.radius );
        }
    }
} );

test( 'C1 carrier tubes remain clear of the wall and each other without helices', () => {
    for ( const growthTiers of [ 0, 3, 8 ] )
    {
        const { descriptor } = createDescriptorFixture( growthTiers );
        const geometry = createTrunkInteriorSkeletonGeometry( descriptor );
        const metadata = geometry.userData.trunkInterior;
        const positions = geometry.getAttribute( 'position' );

        assert.ok( metadata.minimumWallClearance > 0 );
        assert.ok( metadata.minimumGrowthWallClearance > 0 );
        assert.ok( metadata.minimumVertexWallClearance > 0 );
        assert.ok( metadata.minimumGrowthVertexWallClearance > 0.01 );

        for ( const range of metadata.carrierRanges )
        {
            const carrier = descriptor.carriers[range.carrierIndex];
            const ringCount = carrier.centreline.length / 3;
            assert.equal( range.vertexCount, ringCount * metadata.radialSegments );
            assert.ok( range.minimumVertexWallClearance > 0 );
            assert.ok( range.minimumGrowthVertexWallClearance > 0 );

            let cumulativeDirectionChange = 0;
            let previousDirection = null;
            for ( let ring = 0; ring < ringCount; ring += 1 )
            {
                const trunkCentre = new THREE.Vector3(
                    carrier.trunkCentreline[ring * 3],
                    carrier.trunkCentreline[ring * 3 + 1],
                    carrier.trunkCentreline[ring * 3 + 2]
                );
                const centre = new THREE.Vector3(
                    carrier.centreline[ring * 3],
                    carrier.centreline[ring * 3 + 1],
                    carrier.centreline[ring * 3 + 2]
                );
                const direction = centre.clone().sub( trunkCentre ).normalize();
                if ( previousDirection )
                {
                    const angle = Math.acos( THREE.MathUtils.clamp(
                        direction.dot( previousDirection ),
                        -1,
                        1
                    ) );
                    assert.ok( angle < 0.18, `${carrier.ownerId} twists abruptly` );
                    cumulativeDirectionChange += angle;
                }
                previousDirection = direction;

                const growthShellRadius = carrier.conservativeShellRadii[ring]
                    * descriptor.wallClearanceScale;
                for ( let side = 0; side < metadata.radialSegments; side += 1 )
                {
                    const vertex = new THREE.Vector3().fromBufferAttribute(
                        positions,
                        range.vertexStart + ring * metadata.radialSegments + side
                    );
                    assert.ok(
                        vertex.distanceTo( trunkCentre ) < growthShellRadius,
                        `${carrier.ownerId} breaches the conservative growth shell`
                    );
                }
            }
            assert.ok(
                cumulativeDirectionChange < Math.PI,
                `${carrier.ownerId} must not wind around the trunk as a helix`
            );
            assert.ok( Math.abs(
                carrier.slotX - Math.cos( carrier.placementAngle ) * carrier.slotRadius
            ) < 1e-12 );
            assert.ok( Math.abs(
                carrier.slotY - Math.sin( carrier.placementAngle ) * carrier.slotRadius
            ) < 1e-12 );
        }

        for ( let leftIndex = 0;
            leftIndex < descriptor.carriers.length;
            leftIndex += 1 )
        {
            const left = descriptor.carriers[leftIndex];
            for ( let rightIndex = leftIndex + 1;
                rightIndex < descriptor.carriers.length;
                rightIndex += 1 )
            {
                const right = descriptor.carriers[rightIndex];
                const commonRingCount = Math.min(
                    left.centreline.length,
                    right.centreline.length
                ) / 3;
                for ( let ring = 0; ring < commonRingCount - 1; ring += 1 )
                {
                    const leftStart = new THREE.Vector3().fromArray(
                        left.centreline,
                        ring * 3
                    );
                    const leftEnd = new THREE.Vector3().fromArray(
                        left.centreline,
                        ( ring + 1 ) * 3
                    );
                    const rightStart = new THREE.Vector3().fromArray(
                        right.centreline,
                        ring * 3
                    );
                    const rightEnd = new THREE.Vector3().fromArray(
                        right.centreline,
                        ( ring + 1 ) * 3
                    );
                    for ( let sample = 0; sample <= 4; sample += 1 )
                    {
                        const progress = sample / 4;
                        const separation = leftStart.clone().lerp( leftEnd, progress )
                            .distanceTo( rightStart.clone().lerp( rightEnd, progress ) );
                        assert.ok(
                            separation > left.radius + right.radius,
                            `'${left.ownerId}' and '${right.ownerId}' intersect`
                        );
                    }
                }
            }
        }
        geometry.dispose();
    }
} );

test( 'C1 is one neutral merged mesh and reveals only supported carriers', () => {
    const { form, hierarchy, positions } = createFixture( 3 );
    const layer = createEngineeredTreeLayer( hierarchy, positions, form );
    const skeletons = layer.group.children.filter(
        ( child ) => child.userData.trunkInteriorSkeleton
    );
    assert.equal( skeletons.length, 1 );
    const skeleton = skeletons[0];
    const metadata = skeleton.geometry.userData.trunkInterior;
    const carrierVisibility = skeleton.geometry.getAttribute( 'carrierVisibility' );
    const skeletonPositions = skeleton.geometry.getAttribute( 'position' ).array.slice();

    assert.equal( skeleton.name, 'trunk interior carrier skeleton' );
    assert.equal( metadata.carrierCount, 9 );
    assert.equal( metadata.vertexCount, 2394 );
    assert.equal( metadata.triangleCount, 4680 );
    assert.equal( metadata.vertexCount, skeleton.geometry.getAttribute( 'position' ).count );
    assert.equal( metadata.triangleCount, skeleton.geometry.index.count / 3 );
    assert.ok( Number.isFinite( metadata.constructionTimeMs ) );
    assert.ok( metadata.constructionTimeMs >= 0 );
    assert.equal( layer.group.userData.trunkInterior.meshCount, 1 );
    assert.equal( skeleton.material.isMeshPhysicalMaterial, true );
    assert.equal( skeleton.material.emissive.getHex(), 0x000000 );
    assert.equal( skeleton.material.transparent, false );
    assert.equal( skeleton.material.blending, THREE.NormalBlending );
    assert.equal( skeleton.visible, false );
    assert.equal( metadata.visibleCarrierCount, 3 );

    function carrierVisibilityValues( ownerId )
    {
        const range = metadata.carrierRanges.find( ( entry ) => entry.ownerId === ownerId );
        return new Set( Array.from(
            { length: range.vertexCount },
            ( _, offset ) => carrierVisibility.getX( range.vertexStart + offset )
        ) );
    }

    assert.deepEqual( carrierVisibilityValues( 'operations' ), new Set( [ 1 ] ) );
    assert.deepEqual( carrierVisibilityValues( 'process-observation' ), new Set( [ 0 ] ) );

    layer.setVisible( false );
    layer.setInteriorDiagnosticVisible( true );
    assert.equal( layer.group.visible, true );
    assert.equal( skeleton.visible, true );
    assert.ok( layer.group.children
        .filter( ( child ) => child !== skeleton )
        .every( ( child ) => child.visible === false ) );

    layer.setGrowthProgress( new Map( [
        [ 'crown-trunk-1', 1 ],
        [ 'working-capital', 1 ],
        [ 'process-observation', 0.5 ],
        [ 'crown-trunk-2', 0 ],
        [ 'resource-assurance', 1 ]
    ] ) );
    assert.equal( metadata.visibleCarrierCount, 4 );
    assert.deepEqual( carrierVisibilityValues( 'working-capital' ), new Set( [ 1 ] ) );
    assert.deepEqual( carrierVisibilityValues( 'process-observation' ), new Set( [ 0 ] ) );
    assert.deepEqual( carrierVisibilityValues( 'resource-assurance' ), new Set( [ 0 ] ) );

    layer.setGrowthProgress( matureProgress( hierarchy ) );
    assert.equal( metadata.visibleCarrierCount, 9 );
    assert.deepEqual( carrierVisibilityValues( 'productive-capacity' ), new Set( [ 1 ] ) );
    assert.equal( skeleton.geometry.getAttribute( 'position' ).array.length, skeletonPositions.length );
    assertByteEquivalent(
        skeleton.geometry.getAttribute( 'position' ).array,
        skeletonPositions,
        'growth visibility must not move or rebuild the carrier skeleton'
    );
} );

test( 'C1 leaves accepted exterior geometry and materials byte unchanged', () => {
    const { form, hierarchy, positions } = createFixture( 3 );
    const layer = createEngineeredTreeLayer( hierarchy, positions, form );
    const trunk = layer.group.getObjectByName( 'monumental trunk' );
    const branch = layer.group.getObjectByName( 'meaning -> operations' );
    const trunkMaterial = trunk.material;
    const branchMaterial = branch.material;

    assert.equal(
        digest( trunk.geometry.getAttribute( 'position' ).array ),
        'f7d2a9110554f23deab6c8fb45eba041e8345c592b8ad2e8542b563462a96778'
    );
    assert.equal(
        digest( trunk.geometry.index.array ),
        '6853b51572334d504f86ae37b56aa4d21e9a93099b83745d605413310b7092a3'
    );
    assert.equal(
        digest( branch.geometry.getAttribute( 'position' ).array ),
        'fc1ac8c0f13fb449bbb24cb286be0691a689dab307f216e8a9daaa7340abd810'
    );
    assert.equal(
        digest( branch.geometry.index.array ),
        '8caa3c9a2e9b5b86370e0bd9a5662ee5301f02a6b0f4bd56e69511a3b2fa87d5'
    );

    layer.setInteriorDiagnosticVisible( true );
    layer.setVisible( false );
    layer.setVisible( true );
    layer.setGrowthProgress( matureProgress( hierarchy ) );

    assert.equal( trunk.material, trunkMaterial );
    assert.equal( branch.material, branchMaterial );
    assert.equal(
        digest( trunk.geometry.getAttribute( 'position' ).array ),
        'b0116c1a5d081a8dd89177498bf470dcbadc36266857b549cbe90329f6c4c8a9'
    );
    assert.equal(
        digest( trunk.geometry.index.array ),
        '6853b51572334d504f86ae37b56aa4d21e9a93099b83745d605413310b7092a3'
    );
    assert.equal(
        digest( branch.geometry.getAttribute( 'position' ).array ),
        'fc1ac8c0f13fb449bbb24cb286be0691a689dab307f216e8a9daaa7340abd810'
    );
    assert.equal(
        digest( branch.geometry.index.array ),
        '8caa3c9a2e9b5b86370e0bd9a5662ee5301f02a6b0f4bd56e69511a3b2fa87d5'
    );
} );

test( 'C1 diagnostic isolation does not alter routed packet state or geometry', () => {
    function createMatureLayer()
    {
        const fixture = createFixture( 3 );
        const parameters = {
            ...fixture.form,
            packetFrequency: 11,
            packetSpeed: 0.5
        };
        const layer = createEngineeredTreeLayer(
            fixture.hierarchy,
            fixture.positions,
            parameters
        );
        layer.setGrowthProgress( matureProgress( fixture.hierarchy ) );
        return { ...fixture, parameters, layer };
    }

    const baseline = createMatureLayer();
    const isolated = createMatureLayer();
    isolated.layer.setVisible( false );
    isolated.layer.setInteriorDiagnosticVisible( true );
    const baselineCore = baseline.layer.group.getObjectByName( 'routed information core' );
    const isolatedCore = isolated.layer.group.getObjectByName( 'routed information core' );
    const baselineCorePositions = baselineCore.geometry.getAttribute( 'position' ).array.slice();
    const isolatedCorePositions = isolatedCore.geometry.getAttribute( 'position' ).array.slice();

    for ( const elapsed of [ 0, 2, 10 ] )
    {
        baseline.layer.update( elapsed, baseline.parameters );
        isolated.layer.update( elapsed, isolated.parameters );
        assert.deepEqual(
            isolated.layer.group.userData.routedLight,
            baseline.layer.group.userData.routedLight
        );
    }
    assert.equal( baseline.layer.group.userData.routedLight.emittedPacketCount, 111 );
    assert.equal( baseline.layer.group.userData.routedLight.packetFrequency, 11 );
    assert.equal( baseline.layer.group.userData.routedLight.packetSpeed, 0.5 );
    assertByteEquivalent(
        baselineCorePositions,
        isolatedCorePositions,
        'the C1 diagnostic must not change routed-core geometry'
    );
    assertByteEquivalent(
        baselineCore.geometry.index.array,
        isolatedCore.geometry.index.array,
        'the C1 diagnostic must not change routed-core topology'
    );
} );

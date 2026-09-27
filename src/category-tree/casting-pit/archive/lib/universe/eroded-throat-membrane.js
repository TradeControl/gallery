import * as THREE from 'three';
import { seededGenerator } from '../../../../../lib/casting-pit/random.js';

const WORLD_SIZE = 24;
const OUTER_TRANSITION_RADIUS = 3.15;
const FLOW_OUTER_RADIUS = 5.25;
const THROAT_CONTINUATION_DEPTH = 72;

function smoothstep( edge0, edge1, value )
{
    const ratio = THREE.MathUtils.clamp( ( value - edge0 ) / ( edge1 - edge0 ), 0, 1 );
    return ratio * ratio * ( 3 - 2 * ratio );
}

function angularDifference( first, second )
{
    return Math.atan2( Math.sin( first - second ), Math.cos( first - second ) );
}

function interpolateAngle( first, second, ratio )
{
    return first + angularDifference( second, first ) * ratio;
}

function intersectApproach( gate, radius, center )
{
    const startRadius = gate.radius - 0.38;
    const startX = Math.cos( gate.angle ) * startRadius - center.x;
    const startZ = Math.sin( gate.angle ) * startRadius - center.z;
    const directionAngle = gate.angle + Math.PI + gate.outletBias;
    const directionX = Math.cos( directionAngle );
    const directionZ = Math.sin( directionAngle );
    const projection = startX * directionX + startZ * directionZ;
    const discriminant = projection * projection - ( startRadius * startRadius - radius * radius );
    const distance = discriminant >= 0 ? -projection - Math.sqrt( discriminant ) : -projection;
    const x = startX + directionX * Math.max( distance, 0 );
    const z = startZ + directionZ * Math.max( distance, 0 );

    return {
        angle: Math.atan2( z, x ),
        directionAngle,
        gateAngle: gate.angle,
        outletBias: gate.outletBias
    };
}

export function createErodedThroatMembrane( parameters, options = {} )
{
    const size = options.size ?? WORLD_SIZE;
    const wellFrame = Object.freeze( {
        x: options.centerX ?? 0,
        z: options.centerZ ?? 0
    } );
    let sourceApproaches = [];
    let approaches = [];
    let backgroundPhases = [];

    function rebuildHistory()
    {
        const random = seededGenerator( 0x6a09e667 ^ Math.round( parameters.historySeed ) );
        backgroundPhases = [ random(), random(), random(), random() ].map( ( value ) => value * Math.PI * 2 );
        approaches = sourceApproaches
            .map( ( approach, index ) => ( {
                ...approach,
                rank: random() + index * 0.037,
                weight: THREE.MathUtils.lerp( 0.72, 1, random() ),
                spread: THREE.MathUtils.lerp( 0.11, 0.17, random() ),
                channelWidth: THREE.MathUtils.lerp( 0.42, 0.62, random() )
            } ) )
            .sort( ( first, second ) => second.rank - first.rank )
            .slice( 0, Math.min( 3, sourceApproaches.length ) );
    }

    function setHistoricalApproaches( gates )
    {
        sourceApproaches = gates.map( ( gate ) => intersectApproach( gate, OUTER_TRANSITION_RADIUS, wellFrame ) );
        rebuildHistory();
    }

    function reseedHistory()
    {
        rebuildHistory();
    }

    function localPolar( x, z )
    {
        const localX = x - wellFrame.x;
        const localZ = z - wellFrame.z;
        return { localX, localZ, radius: Math.hypot( localX, localZ ), angle: Math.atan2( localZ, localX ) };
    }

    function backgroundProfile( angle )
    {
        const phase1 = backgroundPhases[1] ?? 0;
        const phase2 = backgroundPhases[2] ?? 0;
        const phase3 = backgroundPhases[3] ?? 0;
        return 0.13 * Math.cos( angle - phase1 )
            + 0.075 * Math.cos( angle * 2 - phase2 )
            + 0.045 * Math.cos( angle * 3 - phase3 );
    }

    function flowProfile( angle )
    {
        return approaches.reduce( ( total, approach ) => {
            const delta = angularDifference( angle, approach.angle );
            return total + approach.weight * Math.exp( -( delta * delta ) / ( 2 * approach.spread * approach.spread ) );
        }, 0 );
    }

    function pathAngleAtRadius( approach, radius )
    {
        const bend = 1 - smoothstep( OUTER_TRANSITION_RADIUS, FLOW_OUTER_RADIUS, radius );
        return interpolateAngle( approach.gateAngle, approach.angle, bend );
    }

    function flowChannelProfile( x, z, mouthRadius )
    {
        const polar = localPolar( x, z );
        const { radius, angle } = polar;
        const inwardProgress = THREE.MathUtils.clamp(
            ( FLOW_OUTER_RADIUS - radius ) / Math.max( FLOW_OUTER_RADIUS - mouthRadius, 0.4 ),
            0,
            1
        );
        const radialEnvelope = 1 - smoothstep( FLOW_OUTER_RADIUS - 0.12, FLOW_OUTER_RADIUS + 0.32, radius );

        return approaches.reduce( ( total, approach ) => {
            const pathAngle = pathAngleAtRadius( approach, radius );
            const perpendicularDistance = Math.abs( angularDifference( angle, pathAngle ) )
                * Math.max( radius, mouthRadius );
            const core = Math.exp( -( perpendicularDistance * perpendicularDistance )
                / ( 2 * approach.channelWidth * approach.channelWidth ) );
            const shoulderWidth = approach.channelWidth * 1.8;
            const shoulder = Math.exp( -( perpendicularDistance * perpendicularDistance )
                / ( 2 * shoulderWidth * shoulderWidth ) );
            const channelDepth = THREE.MathUtils.lerp( 0.42, 1, inwardProgress );
            const erodedProfile = core + ( shoulder - core ) * 0.22;
            return total + approach.weight * erodedProfile * channelDepth * radialEnvelope;
        }, 0 );
    }

    function openingRadius( angle )
    {
        const background = 1 + parameters.backgroundErosion * backgroundProfile( angle );
        const flowRecession = parameters.flowImprint * parameters.mouthScale * 0.24 * flowProfile( angle );
        return Math.max( 0.28, parameters.mouthScale * background + flowRecession );
    }

    function meanOpeningRadius( samples = 256 )
    {
        let total = 0;
        for ( let sample = 0; sample < samples; sample += 1 )
        {
            total += openingRadius( sample / samples * Math.PI * 2 );
        }
        return total / samples;
    }

    function openingDistance( x, z )
    {
        const polar = localPolar( x, z );
        return polar.radius - openingRadius( polar.angle );
    }

    function isInsideOpening( x, z )
    {
        return openingDistance( x, z ) <= 0;
    }

    function findOpeningCrossing( startX, startZ, endX, endZ )
    {
        if ( isInsideOpening( startX, startZ ) )
        {
            return { x: startX, z: startZ, ratio: 0 };
        }

        const distance = Math.hypot( endX - startX, endZ - startZ );
        const samples = Math.max( 2, Math.ceil( distance / 0.04 ) );
        let previousRatio = 0;

        for ( let sample = 1; sample <= samples; sample += 1 )
        {
            const ratio = sample / samples;
            if ( isInsideOpening(
                THREE.MathUtils.lerp( startX, endX, ratio ),
                THREE.MathUtils.lerp( startZ, endZ, ratio )
            ) )
            {
                let outsideRatio = previousRatio;
                let insideRatio = ratio;
                for ( let iteration = 0; iteration < 8; iteration += 1 )
                {
                    const middleRatio = ( outsideRatio + insideRatio ) * 0.5;
                    const middleX = THREE.MathUtils.lerp( startX, endX, middleRatio );
                    const middleZ = THREE.MathUtils.lerp( startZ, endZ, middleRatio );
                    if ( isInsideOpening( middleX, middleZ ) ) insideRatio = middleRatio;
                    else outsideRatio = middleRatio;
                }
                return {
                    x: THREE.MathUtils.lerp( startX, endX, insideRatio ),
                    z: THREE.MathUtils.lerp( startZ, endZ, insideRatio ),
                    ratio: insideRatio
                };
            }
            previousRatio = ratio;
        }
        return null;
    }

    function crossesOpening( startX, startZ, endX, endZ )
    {
        return findOpeningCrossing( startX, startZ, endX, endZ ) !== null;
    }

    function baseHeight( x, z )
    {
        const localX = x - wellFrame.x;
        const localZ = z - wellFrame.z;
        const radiusSquared = localX * localX + localZ * localZ;
        const widthSquared = parameters.width * parameters.width;
        return -parameters.depth * Math.exp( -radiusSquared / widthSquared );
    }

    function height( x, z )
    {
        const polar = localPolar( x, z );
        const mouthRadius = openingRadius( polar.angle );
        const transition = Math.max( OUTER_TRANSITION_RADIUS - mouthRadius, 0.3 );
        const fromMouth = polar.radius - mouthRadius;
        const influence = 1 - smoothstep( 0, transition, fromMouth );
        const shelf = Math.exp( -Math.pow( fromMouth / transition - 0.42, 2 ) / 0.026 );
        const backgroundCut = parameters.backgroundErosion
            * ( 0.34 + backgroundProfile( polar.angle ) * 0.7 )
            * influence;
        const flowCut = parameters.flowImprint * 0.9 * flowChannelProfile( x, z, mouthRadius );
        const shelfRelief = parameters.backgroundErosion * 0.13 * shelf
            * Math.cos( polar.angle * 2 - ( backgroundPhases[2] ?? 0 ) );
        return baseHeight( x, z ) - Math.max( backgroundCut + flowCut, 0 ) + shelfRelief;
    }

    function gradient( x, z )
    {
        const step = 0.025;
        return {
            x: ( height( x + step, z ) - height( x - step, z ) ) / ( step * 2 ),
            z: ( height( x, z + step ) - height( x, z - step ) ) / ( step * 2 )
        };
    }

    function createGeometry( segments = 180 )
    {
        const geometry = new THREE.PlaneGeometry( size, size, segments, segments );
        geometry.rotateX( -Math.PI / 2 );
        geometry.userData.materialPositions = Float32Array.from( geometry.attributes.position.array );
        geometry.userData.materialIndex = Uint32Array.from( geometry.index.array );
        return geometry;
    }

    function deform( geometry )
    {
        const position = geometry.attributes.position;
        const materialPositions = geometry.userData.materialPositions;
        for ( let index = 0; index < position.count; index += 1 )
        {
            const x = materialPositions[index * 3];
            const z = materialPositions[index * 3 + 2];
            position.setXYZ( index, x, height( x, z ), z );
        }

        const sourceIndex = geometry.userData.materialIndex;
        const retained = [];
        for ( let index = 0; index < sourceIndex.length; index += 3 )
        {
            const a = sourceIndex[index];
            const b = sourceIndex[index + 1];
            const c = sourceIndex[index + 2];
            const outsideA = !isInsideOpening( materialPositions[a * 3], materialPositions[a * 3 + 2] );
            const outsideB = !isInsideOpening( materialPositions[b * 3], materialPositions[b * 3 + 2] );
            const outsideC = !isInsideOpening( materialPositions[c * 3], materialPositions[c * 3 + 2] );
            if ( outsideA && outsideB && outsideC ) retained.push( a, b, c );
        }
        geometry.setIndex( retained );
        position.needsUpdate = true;
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
    }

    function throatRimHeight( angle )
    {
        const topRadius = openingRadius( angle );
        const topX = wellFrame.x + Math.cos( angle ) * ( topRadius + 0.24 );
        const topZ = wellFrame.z + Math.sin( angle ) * ( topRadius + 0.24 );
        return height( topX, topZ );
    }

    function meanThroatRimHeight( samples = 256 )
    {
        let total = 0;
        for ( let sample = 0; sample < samples; sample += 1 )
        {
            total += throatRimHeight( sample / samples * Math.PI * 2 );
        }
        return total / samples;
    }

    function throatRadius( angle, depthRatio, shaftRadius = meanOpeningRadius() * parameters.throatConstriction )
    {
        const topRadius = openingRadius( angle );
        const regularisation = smoothstep( 0, 1, depthRatio );
        const seamOverlap = 0.24 * ( 1 - depthRatio );
        return THREE.MathUtils.lerp( topRadius, shaftRadius, regularisation ) + seamOverlap;
    }

    function throatPoint(
        angle,
        depthRatio,
        sharedRimHeight = meanThroatRimHeight(),
        shaftRadius = meanOpeningRadius() * parameters.throatConstriction
    )
    {
        const radius = throatRadius( angle, depthRatio, shaftRadius );
        const heightBlend = smoothstep( 0.18, 1, depthRatio );
        const startHeight = THREE.MathUtils.lerp( throatRimHeight( angle ), sharedRimHeight, heightBlend );
        return {
            x: wellFrame.x + Math.cos( angle ) * radius,
            y: startHeight - parameters.throatDepth * depthRatio,
            z: wellFrame.z + Math.sin( angle ) * radius
        };
    }

    function continuationPoint( angle, depthRatio, sharedRimHeight, shaftRadius )
    {
        return {
            x: wellFrame.x + Math.cos( angle ) * shaftRadius,
            y: sharedRimHeight - parameters.throatDepth - THROAT_CONTINUATION_DEPTH * depthRatio,
            z: wellFrame.z + Math.sin( angle ) * shaftRadius
        };
    }

    function ringMean( depthRatio, samples = 720 )
    {
        let x = 0;
        let z = 0;
        const sharedRimHeight = meanThroatRimHeight();
        const shaftRadius = meanOpeningRadius() * parameters.throatConstriction;
        for ( let sample = 0; sample < samples; sample += 1 )
        {
            const point = throatPoint( sample / samples * Math.PI * 2, depthRatio, sharedRimHeight, shaftRadius );
            x += point.x;
            z += point.z;
        }
        return { x: x / samples, z: z / samples };
    }

    function openingCentroid( samples = 720 )
    {
        let twiceArea = 0;
        let weightedX = 0;
        let weightedZ = 0;
        let previousAngle = ( samples - 1 ) / samples * Math.PI * 2;
        let previousRadius = openingRadius( previousAngle );
        let previousX = wellFrame.x + Math.cos( previousAngle ) * previousRadius;
        let previousZ = wellFrame.z + Math.sin( previousAngle ) * previousRadius;

        for ( let sample = 0; sample < samples; sample += 1 )
        {
            const angle = sample / samples * Math.PI * 2;
            const radius = openingRadius( angle );
            const x = wellFrame.x + Math.cos( angle ) * radius;
            const z = wellFrame.z + Math.sin( angle ) * radius;
            const cross = previousX * z - x * previousZ;
            twiceArea += cross;
            weightedX += ( previousX + x ) * cross;
            weightedZ += ( previousZ + z ) * cross;
            previousX = x;
            previousZ = z;
        }

        const factor = 1 / ( 3 * twiceArea );
        return { x: weightedX * factor, z: weightedZ * factor };
    }

    function getAlignmentDiagnostics()
    {
        return {
            canonicalCenter: { ...wellFrame },
            gaussianMinimum: { ...wellFrame },
            openingFrameCenter: { ...wellFrame },
            throatAxisTop: { ...wellFrame },
            throatAxisBottom: { ...wellFrame },
            openingAreaCentroid: openingCentroid(),
            throatTopRingMean: ringMean( 0 ),
            throatBottomRingMean: ringMean( 1 ),
            continuationDepth: THROAT_CONTINUATION_DEPTH
        };
    }

    function createThroatGeometry( radialSegments = 128, verticalSegments = 8, continuationSegments = 48 )
    {
        const positions = [];
        const depthFactors = [];
        const colors = [];
        const indices = [];
        const sharedRimHeight = meanThroatRimHeight();
        const shaftRadius = meanOpeningRadius() * parameters.throatConstriction;
        const ringCount = verticalSegments + continuationSegments + 1;

        for ( let vertical = 0; vertical <= verticalSegments; vertical += 1 )
        {
            const depthRatio = vertical / verticalSegments;
            for ( let radial = 0; radial <= radialSegments; radial += 1 )
            {
                const angle = radial / radialSegments * Math.PI * 2;
                const point = throatPoint( angle, depthRatio, sharedRimHeight, shaftRadius );
                positions.push( point.x, point.y, point.z );
                depthFactors.push( depthRatio * parameters.throatDepth / ( parameters.throatDepth + THROAT_CONTINUATION_DEPTH ) );
                const brightness = THREE.MathUtils.lerp( 1, 0.06, smoothstep( 0, 0.34, depthRatio ) );
                colors.push( brightness, brightness, brightness );
            }
        }

        for ( let vertical = 1; vertical <= continuationSegments; vertical += 1 )
        {
            const depthRatio = vertical / continuationSegments;
            for ( let radial = 0; radial <= radialSegments; radial += 1 )
            {
                const angle = radial / radialSegments * Math.PI * 2;
                const point = continuationPoint( angle, depthRatio, sharedRimHeight, shaftRadius );
                positions.push( point.x, point.y, point.z );
                depthFactors.push( ( parameters.throatDepth + THROAT_CONTINUATION_DEPTH * depthRatio )
                    / ( parameters.throatDepth + THROAT_CONTINUATION_DEPTH ) );
                colors.push( 0.06, 0.06, 0.06 );
            }
        }

        const stride = radialSegments + 1;
        for ( let vertical = 0; vertical < ringCount - 1; vertical += 1 )
        {
            for ( let radial = 0; radial < radialSegments; radial += 1 )
            {
                const a = vertical * stride + radial;
                const b = a + 1;
                const c = a + stride;
                const d = c + 1;
                indices.push( a, c, b, b, c, d );
            }
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
        geometry.setAttribute( 'throatDepth', new THREE.Float32BufferAttribute( depthFactors, 1 ) );
        geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
        geometry.setIndex( indices );
        geometry.computeVertexNormals();
        return geometry;
    }

    function createHistoryGuideGeometry()
    {
        const positions = [];
        approaches.forEach( ( approach ) => {
            const innerRadius = openingRadius( approach.angle ) + 0.08;
            const segments = 18;
            for ( let segment = 0; segment < segments; segment += 1 )
            {
                const firstRadius = THREE.MathUtils.lerp( FLOW_OUTER_RADIUS, innerRadius, segment / segments );
                const secondRadius = THREE.MathUtils.lerp( FLOW_OUTER_RADIUS, innerRadius, ( segment + 1 ) / segments );
                const firstAngle = pathAngleAtRadius( approach, firstRadius );
                const secondAngle = pathAngleAtRadius( approach, secondRadius );
                const firstX = wellFrame.x + Math.cos( firstAngle ) * firstRadius;
                const firstZ = wellFrame.z + Math.sin( firstAngle ) * firstRadius;
                const secondX = wellFrame.x + Math.cos( secondAngle ) * secondRadius;
                const secondZ = wellFrame.z + Math.sin( secondAngle ) * secondRadius;
                positions.push( firstX, height( firstX, firstZ ) + 0.08, firstZ );
                positions.push( secondX, height( secondX, secondZ ) + 0.08, secondZ );
            }
        } );
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
        return geometry;
    }

    function createAlignmentGuideGeometry()
    {
        const top = baseHeight( wellFrame.x, wellFrame.z ) - 0.08;
        const bottom = meanThroatRimHeight() - parameters.throatDepth - THROAT_CONTINUATION_DEPTH - 0.28;
        const crossRadius = parameters.mouthScale * 0.34;
        const positions = [
            wellFrame.x, top, wellFrame.z,
            wellFrame.x, bottom, wellFrame.z,
            wellFrame.x - crossRadius, top, wellFrame.z,
            wellFrame.x + crossRadius, top, wellFrame.z,
            wellFrame.x, top, wellFrame.z - crossRadius,
            wellFrame.x, top, wellFrame.z + crossRadius
        ];
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
        return geometry;
    }

    rebuildHistory();

    return {
        height,
        gradient,
        createGeometry,
        deform,
        openingDistance,
        isInsideOpening,
        findOpeningCrossing,
        crossesOpening,
        createThroatGeometry,
        createHistoryGuideGeometry,
        createAlignmentGuideGeometry,
        getAlignmentDiagnostics,
        setHistoricalApproaches,
        reseedHistory,
        wellFrame,
        diagnosticSegments: 64,
        size
    };
}

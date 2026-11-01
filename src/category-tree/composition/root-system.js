import * as THREE from 'three';
import { rootedMotionFieldId } from '../../lib/tree/rooted-motion.js';

const TAU = Math.PI * 2;
const principalSegments = 24;
const principalRadialSegments = 10;
const continuationSegments = 18;
const continuationRadialSegments = 8;
const principalPreferredInfluence = 0.22;
const continuationPreferredInfluence = 0.12;

function smoothstep( value )
{
    return value * value * ( 3 - 2 * value );
}

function normaliseAngle( angle )
{
    return ( angle % TAU + TAU ) % TAU;
}

function angularDistance( first, second )
{
    const distance = Math.abs( normaliseAngle( first - second ) );
    return Math.min( distance, TAU - distance );
}

function freezePoint( point )
{
    return Object.freeze( [ point.x, point.y, point.z ] );
}

function readWorldSideRings( trunkMesh )
{
    const geometry = trunkMesh?.geometry;
    const metadata = geometry?.userData?.monumentalTrunk;
    const position = geometry?.getAttribute?.( 'position' );
    const normal = geometry?.getAttribute?.( 'normal' );
    if ( !metadata || !position || !normal )
    {
        throw new Error( 'Physical roots require monumental trunk geometry.' );
    }
    const { radialSegments, sideVertexCount } = metadata;
    const ringCount = sideVertexCount / radialSegments;
    if ( !Number.isInteger( ringCount ) || ringCount < 3 )
    {
        throw new Error( 'The monumental trunk has no usable side rings.' );
    }
    trunkMesh.updateWorldMatrix( true, false );
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(
        trunkMesh.matrixWorld
    );
    const rings = [];
    const normalRings = [];
    for ( let ring = 0; ring < ringCount; ring += 1 )
    {
        const points = [];
        const normals = [];
        for ( let side = 0; side < radialSegments; side += 1 )
        {
            points.push( new THREE.Vector3().fromBufferAttribute(
                position,
                ring * radialSegments + side
            ).applyMatrix4( trunkMesh.matrixWorld ) );
            normals.push( new THREE.Vector3().fromBufferAttribute(
                normal,
                ring * radialSegments + side
            ).applyMatrix3( normalMatrix ).normalize() );
        }
        rings.push( points );
        normalRings.push( normals );
    }
    return { rings, normalRings, radialSegments };
}

function selectShoulderLine(
    rings,
    normalRings,
    contacts,
    clearance,
    membrane
)
{
    const points = [];
    const normals = [];
    const interpolationFractions = [];
    const ringIndices = [];
    let clearanceSatisfied = true;
    for ( let side = 0; side < contacts.length; side += 1 )
    {
        const signedTerrainDistance = ( point ) => point.y
            - membrane.height( point.x, point.z );
        let upperRing = rings.findIndex(
            ( ring ) => signedTerrainDistance( ring[side] ) >= clearance
        );
        if ( upperRing < 0 )
        {
            upperRing = rings.length - 1;
            clearanceSatisfied = false;
        }
        ringIndices.push( upperRing );
        if ( upperRing === 0 )
        {
            points.push( rings[0][side].clone() );
            normals.push( normalRings[0][side].clone() );
            interpolationFractions.push( 0 );
            continue;
        }
        const lower = rings[upperRing - 1][side];
        const upper = rings[upperRing][side];
        let lowerFraction = 0;
        let upperFraction = 1;
        for ( let attempt = 0; attempt < 28; attempt += 1 )
        {
            const candidateFraction = ( lowerFraction + upperFraction ) * 0.5;
            const candidate = lower.clone().lerp( upper, candidateFraction );
            if ( signedTerrainDistance( candidate ) >= clearance )
            {
                upperFraction = candidateFraction;
            }
            else
            {
                lowerFraction = candidateFraction;
            }
        }
        points.push( lower.clone().lerp( upper, upperFraction ) );
        normals.push( normalRings[upperRing - 1][side].clone().lerp(
            normalRings[upperRing][side],
            upperFraction
        ).normalize() );
        interpolationFractions.push( upperFraction );
    }
    return {
        points,
        normals,
        interpolationFractions,
        ringIndices,
        clearanceSatisfied
    };
}

function terminalLoad( node )
{
    if ( node.children.length === 0 ) return 1;
    return node.children.reduce(
        ( total, child ) => total + terminalLoad( child ),
        0
    );
}

function hierarchyRootAxes( hierarchy, positions, trunkMesh )
{
    const meaning = hierarchy.byId.get( 'meaning' );
    const meaningPosition = positions.get( meaning.id );
    const meaningWorld = new THREE.Vector3(
        meaningPosition.x,
        meaningPosition.y,
        meaningPosition.z
    ).applyMatrix4( trunkMesh.matrixWorld );
    const authored = meaning.children.filter(
        ( child ) => child.kind === 'total'
    ).map( ( child ) => {
        const position = positions.get( child.id );
        const direction = new THREE.Vector3(
            position.x,
            position.y,
            position.z
        ).applyMatrix4( trunkMesh.matrixWorld ).sub( meaningWorld );
        direction.y = 0;
        if ( direction.lengthSq() < Number.EPSILON ) direction.set( 1, 0, 0 );
        direction.normalize().negate();
        return {
            sourceId: child.id,
            angle: normaliseAngle( Math.atan2( direction.z, direction.x ) ),
            load: terminalLoad( child ),
            authored: true
        };
    } ).sort( ( first, second ) => first.angle - second.angle );
    if ( authored.length !== 3 )
    {
        throw new Error( 'Physical roots require the three authored meaning loads.' );
    }

    const gaps = authored.map( ( axis, index ) => {
        const next = authored[( index + 1 ) % authored.length];
        const gap = normaliseAngle( next.angle - axis.angle );
        return {
            left: axis,
            right: next,
            gap,
            angle: normaliseAngle( axis.angle + gap * 0.5 )
        };
    } ).sort( ( first, second ) => second.gap - first.gap );
    const averageLoad = authored.reduce(
        ( total, axis ) => total + axis.load,
        0
    ) / authored.length;
    const counterLoads = gaps.slice( 0, 2 ).map( ( gap, index ) => ( {
        sourceId: `counter-${gap.left.sourceId}-${gap.right.sourceId}`,
        angle: gap.angle,
        load: averageLoad * ( 0.72 - index * 0.06 ),
        authored: false
    } ) );
    return [ ...authored, ...counterLoads ].sort(
        ( first, second ) => first.angle - second.angle
    );
}

function nearestContact( contacts, anchor, angle )
{
    return contacts.reduce( ( selected, point, index ) => {
        const pointAngle = Math.atan2(
            point.z - anchor.z,
            point.x - anchor.x
        );
        const distance = angularDistance( angle, pointAngle );
        return !selected || distance < selected.distance
            ? { point, index, distance }
            : selected;
    }, null );
}

function sweptSurfaceRings( centres, widths, heights, radialSegments )
{
    return centres.map( ( centre, ring ) => {
        const previous = centres[Math.max( 0, ring - 1 )];
        const next = centres[Math.min( centres.length - 1, ring + 1 )];
        const tangent = next.clone().sub( previous ).setY( 0 );
        if ( tangent.lengthSq() < Number.EPSILON ) tangent.set( 1, 0, 0 );
        tangent.normalize();
        const lateral = new THREE.Vector3( -tangent.z, 0, tangent.x );
        return Array.from( { length: radialSegments }, ( _, side ) => {
            const angle = side / radialSegments * TAU;
            const point = centre.clone().addScaledVector(
                lateral,
                Math.cos( angle ) * widths[ring]
            );
            point.y += Math.sin( angle ) * heights[ring];
            return point;
        } );
    } );
}

function minimumSweptInfluence( centres, rings, influenceAt )
{
    let minimum = 1;
    const include = ( point ) => {
        minimum = Math.min( minimum, influenceAt( point.x, point.z ) );
    };
    for ( const centre of centres ) include( centre );
    for ( const ring of rings )
    {
        for ( const point of ring ) include( point );
    }
    for ( let ring = 0; ring < rings.length - 1; ring += 1 )
    {
        const sides = rings[ring].length;
        for ( let side = 0; side < sides; side += 1 )
        {
            const next = ( side + 1 ) % sides;
            const a = rings[ring][side];
            const b = rings[ring + 1][side];
            const c = rings[ring + 1][next];
            const d = rings[ring][next];
            for ( const [ first, second, third ] of [
                [ a, b, d ],
                [ b, c, d ]
            ] )
            {
                include( first.clone().add( second ).add( third )
                    .multiplyScalar( 1 / 3 ) );
                include( first.clone().lerp( second, 0.5 ) );
                include( second.clone().lerp( third, 0.5 ) );
                include( third.clone().lerp( first, 0.5 ) );
            }
        }
    }
    return minimum;
}

function fitSweptReach( {
    desiredReach,
    preferredInfluence,
    startInfluence,
    createPath,
    radialSegments,
    influenceAt
} )
{
    function evaluate( reach )
    {
        const path = createPath( reach );
        const surfaceRings = sweptSurfaceRings(
            path.centres,
            path.widths,
            path.heights,
            radialSegments
        );
        return {
            reach,
            path,
            surfaceRings,
            minimumSurfaceInfluence: minimumSweptInfluence(
                path.centres,
                surfaceRings,
                influenceAt
            )
        };
    }

    const baseline = evaluate( 0 );
    const influenceFloor = Math.min(
        preferredInfluence,
        startInfluence * 0.72,
        baseline.minimumSurfaceInfluence * 0.72
    );
    const fittingTarget = influenceFloor + 1e-4;
    const desired = evaluate( desiredReach );
    let accepted = desired.minimumSurfaceInfluence >= fittingTarget
        ? desired
        : baseline;
    const gridSteps = 64;
    if ( desired.minimumSurfaceInfluence < fittingTarget )
    {
        for ( let step = 1; step < gridSteps; step += 1 )
        {
            const candidate = evaluate( desiredReach * step / gridSteps );
            if ( candidate.minimumSurfaceInfluence >= fittingTarget )
            {
                accepted = candidate;
            }
        }
    }
    if ( accepted.minimumSurfaceInfluence < fittingTarget )
    {
        throw new Error( 'No physical-root reach satisfies the well budget.' );
    }
    let upper = Math.min(
        desiredReach,
        accepted.reach + desiredReach / gridSteps
    );
    for ( let pass = 0; pass < 3 && upper > accepted.reach; pass += 1 )
    {
        const lower = accepted.reach;
        for ( let step = 1; step <= 8; step += 1 )
        {
            const candidate = evaluate(
                lower + ( upper - lower ) * step / 8
            );
            if ( candidate.minimumSurfaceInfluence >= fittingTarget
                && candidate.reach > accepted.reach )
            {
                accepted = candidate;
            }
        }
        upper = Math.min( upper, accepted.reach + ( upper - lower ) / 8 );
    }
    return {
        ...accepted,
        influenceFloor,
        baselineSurfaceInfluence: baseline.minimumSurfaceInfluence,
        startInfluence,
        fittingTarget
    };
}

function createPhysicalRootGeometry( {
    plantingGroup,
    membrane,
    plantingEnvelope,
    hierarchy,
    trunkMesh,
    envelope
} )
{
    const source = readWorldSideRings( trunkMesh );
    if ( source.radialSegments !== envelope.radialSegments
        || envelope.contactBySide.some( ( point ) => point === null ) )
    {
        throw new Error( 'Physical roots require a complete side-correspondent contact line.' );
    }
    const anchor = new THREE.Vector3().fromArray( envelope.anchor );
    const contacts = envelope.contactBySide.map(
        ( point ) => new THREE.Vector3().fromArray( point )
    );
    const descriptor = trunkMesh.userData.monumentalTrunk;
    const axes = hierarchyRootAxes(
        hierarchy,
        descriptor.positions,
        trunkMesh
    );
    const maximumLoad = Math.max( ...axes.map( ( axis ) => axis.load ) );
    const shoulderClearance = Math.max(
        0.24 * trunkMesh.getWorldScale( new THREE.Vector3() ).y,
        envelope.surfaceBandHalfThickness * 4
    );
    const shoulderSelection = selectShoulderLine(
        source.rings,
        source.normalRings,
        contacts,
        shoulderClearance,
        membrane
    );
    if ( !shoulderSelection.clearanceSatisfied )
    {
        throw new Error( 'The trunk has no complete physical-root shoulder.' );
    }
    const shoulderSource = shoulderSelection.points;
    const surfaceContainmentClearance = Math.max(
        0.03,
        envelope.surfaceBandHalfThickness * 1.75
    );
    plantingGroup.updateWorldMatrix( true, false );
    const worldToPlanting = plantingGroup.matrixWorld.clone().invert();
    const vertices = [];
    const rootRoles = [];
    const pathIds = [];
    const rootMotionWeights = [];
    const indices = [];
    const diagnosticSegments = [];
    let maximumBuriedSignedDistance = -Infinity;
    let aboveTerrainOutsideContactCount = 0;
    let minimumRootSurfaceWellInfluence = 1;
    let minimumSurfaceWellInfluenceMargin = Infinity;

    function localPoint( worldPoint )
    {
        return worldPoint.clone().applyMatrix4( worldToPlanting );
    }

    function appendWorldVertex(
        worldPoint,
        role,
        pathId,
        clampBuried = false,
        wellInfluenceFloor = null,
        motionWeight = 0
    )
    {
        const point = worldPoint.clone();
        if ( clampBuried )
        {
            const ceiling = membrane.height( point.x, point.z )
                - surfaceContainmentClearance;
            if ( point.y > ceiling ) point.y = ceiling;
            maximumBuriedSignedDistance = Math.max(
                maximumBuriedSignedDistance,
                point.y - membrane.height( point.x, point.z )
            );
        }
        const submittedSample = plantingEnvelope.sample(
            point.x,
            point.y,
            point.z
        );
        if ( role === 0
            && submittedSample.signedTerrainDistance
                > envelope.surfaceBandHalfThickness
            && !submittedSample.insideContactFootprint )
        {
            aboveTerrainOutsideContactCount += 1;
        }
        if ( wellInfluenceFloor !== null )
        {
            minimumRootSurfaceWellInfluence = Math.min(
                minimumRootSurfaceWellInfluence,
                submittedSample.wellInfluence
            );
            minimumSurfaceWellInfluenceMargin = Math.min(
                minimumSurfaceWellInfluenceMargin,
                submittedSample.wellInfluence - wellInfluenceFloor
            );
        }
        const local = localPoint( point );
        vertices.push( local.x, local.y, local.z );
        rootRoles.push( role );
        pathIds.push( pathId );
        rootMotionWeights.push( motionWeight );
        return point;
    }

    function appendCollar()
    {
        const lobeStrength = ( angle ) => axes.reduce(
            ( strongest, axis ) => {
                const distance = angularDistance( angle, axis.angle );
                const width = axis.authored ? 0.42 : 0.34;
                const prominence = axis.authored ? 1 : 0.68;
                return Math.max(
                    strongest,
                    Math.exp( -( distance * distance ) / ( width * width ) )
                        * prominence
                );
            },
            0
        );
        const shoulder = [];
        const contactLower = [];
        const contactUpper = [];
        const upperToe = [];
        const lowerToe = [];
        const buriedHeel = [];
        for ( let side = 0; side < contacts.length; side += 1 )
        {
            const contact = contacts[side];
            const radial = contact.clone().sub( anchor ).setY( 0 );
            const contactRadius = radial.length();
            radial.normalize();
            const angle = Math.atan2( radial.z, radial.x );
            const lobe = lobeStrength( angle );
            shoulder.push( shoulderSource[side].clone() );
            const plantedContact = contact.clone();
            plantedContact.y -= surfaceContainmentClearance;
            contactLower.push( plantedContact );
            contactUpper.push( plantedContact.clone() );
            for ( const [ target, reach, burial ] of [
                [ upperToe, 0.04 + lobe * 0.18,
                    envelope.surfaceBandHalfThickness + 0.015 ],
                [ lowerToe, 0.08 + lobe * 0.38,
                    envelope.surfaceBandHalfThickness + 0.24 ],
                [ buriedHeel, 0.1 + lobe * 0.32,
                    Math.max( 0.32, envelope.deepMediumDepth * 0.58 ) ]
            ] )
            {
                const point = contact.clone().addScaledVector(
                    radial,
                    contactRadius * reach
                );
                point.y = membrane.height( point.x, point.z ) - burial;
                target.push( point );
            }
        }
        const rings = [
            buriedHeel,
            lowerToe,
            upperToe,
            contactLower,
            contactUpper,
            shoulder
        ];
        const startVertex = vertices.length / 3;
        for ( let ring = 0; ring < rings.length; ring += 1 )
        {
            const buried = ring < rings.length - 1;
            for ( const point of rings[ring] )
            {
                appendWorldVertex(
                    point,
                    0,
                    0,
                    buried,
                    null,
                    ring === rings.length - 1 ? 1 : 0
                );
            }
        }
        const sides = contacts.length;
        const bands = [ [ 0, 1 ], [ 1, 2 ], [ 2, 3 ], [ 4, 5 ] ];
        for ( const [ lowerRing, upperRing ] of bands )
        {
            for ( let side = 0; side < sides; side += 1 )
            {
                const next = ( side + 1 ) % sides;
                const a = startVertex + lowerRing * sides + side;
                const b = startVertex + upperRing * sides + side;
                const c = startVertex + upperRing * sides + next;
                const d = startVertex + lowerRing * sides + next;
                indices.push( a, d, b, b, d, c );
            }
        }
        return {
            shoulder,
            shoulderSource,
            shoulderNormals: shoulderSelection.normals,
            shoulderStartVertex: startVertex + ( rings.length - 1 ) * sides,
            vertexCount: rings.length * sides,
            indexCount: bands.length * sides * 6
        };
    }

    function appendSweptPath( {
        centres,
        widths,
        heights,
        radialSegments,
        role,
        pathId,
        shoulderRingCount = 0,
        shoulderRole = role,
        wellInfluenceFloor = null,
        exposeShoulder = false,
        surfaceRings = null
    } )
    {
        const rings = surfaceRings ?? sweptSurfaceRings(
            centres,
            widths,
            heights,
            radialSegments
        );
        const startVertex = vertices.length / 3;
        for ( let ring = 0; ring < centres.length; ring += 1 )
        {
            for ( let side = 0; side < radialSegments; side += 1 )
            {
                const point = rings[ring][side];
                const motionWeight = exposeShoulder && shoulderRingCount > 1
                    && ring < shoulderRingCount
                    ? 1 - ring / ( shoulderRingCount - 1 )
                    : 0;
                appendWorldVertex(
                    point,
                    ring < shoulderRingCount ? shoulderRole : role,
                    pathId,
                    !exposeShoulder || ring >= shoulderRingCount,
                    wellInfluenceFloor,
                    motionWeight
                );
            }
            if ( ring > 0 )
            {
                diagnosticSegments.push(
                    localPoint( centres[ring - 1] ),
                    localPoint( centres[ring] )
                );
            }
        }
        for ( let ring = 0; ring < centres.length - 1; ring += 1 )
        {
            for ( let side = 0; side < radialSegments; side += 1 )
            {
                const next = ( side + 1 ) % radialSegments;
                const a = startVertex + ring * radialSegments + side;
                const b = startVertex + ( ring + 1 ) * radialSegments + side;
                const c = startVertex + ( ring + 1 ) * radialSegments + next;
                const d = startVertex + ring * radialSegments + next;
                indices.push( a, b, d, b, c, d );
            }
        }
        return {
            startVertex,
            vertexCount: centres.length * radialSegments,
            indexCount: ( centres.length - 1 ) * radialSegments * 6,
            endpoint: centres.at( -1 ).clone()
        };
    }

    const wellAnchorDepth = Math.abs( membrane.height( 0, 0 ) );
    function wellInfluenceAt( x, z )
    {
        if ( wellAnchorDepth <= Number.EPSILON ) return 0;
        return THREE.MathUtils.clamp(
            Math.abs( membrane.height( x, z ) ) / wellAnchorDepth,
            0,
            1
        );
    }

    function principalPath( axis, axisIndex )
    {
        const contact = nearestContact( contacts, anchor, axis.angle ).point;
        const contactRadius = contact.clone().sub( anchor ).setY( 0 ).length();
        const loadScale = axis.load / maximumLoad;
        const desiredReach = envelope.characteristicFootprintRadius
            * ( axis.authored
                ? 2.15 + loadScale * 0.42
                : 1.88 + loadScale * 0.3 );
        const startWidth = envelope.characteristicFootprintRadius
            * ( axis.authored ? 0.27 : 0.22 );
        const startHeight = startWidth * 0.7;
        const shoulderGate = 0.34;
        const bend = ( axisIndex % 2 === 0 ? 1 : -1 )
            * ( axis.authored ? 0.1 : 0.14 );
        function createPath( reach )
        {
            const centres = [];
            const widths = [];
            const heights = [];
            for ( let segment = 0; segment <= principalSegments; segment += 1 )
            {
                const t = segment / principalSegments;
                const eased = smoothstep( t );
                const angle = axis.angle + Math.sin( Math.PI * t ) * bend;
                const radius = THREE.MathUtils.lerp(
                    contactRadius * 0.12,
                    contactRadius + reach,
                    eased
                );
                const width = THREE.MathUtils.lerp(
                    startWidth,
                    envelope.characteristicFootprintRadius * 0.008,
                    eased
                );
                const height = THREE.MathUtils.lerp(
                    startHeight,
                    envelope.characteristicFootprintRadius * 0.006,
                    eased
                );
                const point = new THREE.Vector3(
                    anchor.x + Math.cos( angle ) * radius,
                    0,
                    anchor.z + Math.sin( angle ) * radius
                );
                const terrain = membrane.height( point.x, point.z );
                if ( t < shoulderGate )
                {
                    const shoulderProgress = t / shoulderGate;
                    const exposure = shoulderClearance
                        * ( 1 - smoothstep( shoulderProgress ) );
                    point.y = terrain + exposure - height * 0.72;
                }
                else
                {
                    const burialProgress = smoothstep(
                        ( t - shoulderGate ) / ( 1 - shoulderGate )
                    );
                    point.y = terrain - height
                        - THREE.MathUtils.lerp(
                            envelope.surfaceBandHalfThickness + 0.018,
                            envelope.deepMediumDepth + 0.18,
                            burialProgress
                        );
                }
                centres.push( point );
                widths.push( width );
                heights.push( height );
            }
            return { centres, widths, heights };
        }
        const fitted = fitSweptReach( {
            desiredReach,
            preferredInfluence: principalPreferredInfluence,
            startInfluence: wellInfluenceAt( contact.x, contact.z ),
            createPath,
            radialSegments: principalRadialSegments,
            influenceAt: wellInfluenceAt
        } );
        const { centres, widths, heights } = fitted.path;
        const endpoint = centres.at( -1 );
        fitted.influence = wellInfluenceAt( endpoint.x, endpoint.z );
        minimumRootSurfaceWellInfluence = Math.min(
            minimumRootSurfaceWellInfluence,
            fitted.minimumSurfaceInfluence
        );
        minimumSurfaceWellInfluenceMargin = Math.min(
            minimumSurfaceWellInfluenceMargin,
            fitted.minimumSurfaceInfluence - fitted.influenceFloor
        );
        const shoulderRingCount = Math.ceil(
            shoulderGate * principalSegments
        ) + 1;
        const geometryRange = appendSweptPath( {
            centres,
            widths,
            heights,
            radialSegments: principalRadialSegments,
            role: 1,
            pathId: axisIndex + 1,
            shoulderRingCount,
            shoulderRole: 0,
            wellInfluenceFloor: fitted.influenceFloor,
            exposeShoulder: false,
            surfaceRings: fitted.surfaceRings
        } );
        return {
            axis,
            contactRadius,
            fitted,
            centres,
            widths,
            heights,
            shoulderRingCount,
            geometryRange
        };
    }

    function continuationPath( principal, axisIndex )
    {
        const branchFraction = 0.53
            + ( axisIndex % 3 ) * 0.045
            + ( principal.axis.authored ? 0 : 0.035 );
        const branchIndex = Math.round( principalSegments * branchFraction );
        const start = principal.centres[branchIndex].clone();
        const divergence = ( axisIndex % 2 === 0 ? 1 : -1 )
            * ( 0.34 + axisIndex * 0.018 );
        const angle = principal.axis.angle + divergence;
        const desiredReach = envelope.characteristicFootprintRadius
            * ( 1.15 + axisIndex * 0.055 );
        const startWidth = principal.widths[branchIndex] * 0.58;
        const startBurial = Math.max(
            0.12,
            membrane.height( start.x, start.z ) - start.y
        );
        function createPath( reach )
        {
            const centres = [];
            const widths = [];
            const heights = [];
            for ( let segment = 0; segment <= continuationSegments; segment += 1 )
            {
                const t = segment / continuationSegments;
                const eased = smoothstep( t );
                const curvedAngle = angle
                    + Math.sin( Math.PI * t )
                        * ( axisIndex % 2 ? 0.09 : -0.09 );
                const distance = reach * eased;
                const width = THREE.MathUtils.lerp(
                    startWidth,
                    envelope.characteristicFootprintRadius * 0.002,
                    eased
                );
                const height = THREE.MathUtils.lerp(
                    startWidth * 0.5,
                    envelope.characteristicFootprintRadius * 0.0015,
                    eased
                );
                const point = new THREE.Vector3(
                    start.x + Math.cos( curvedAngle ) * distance,
                    0,
                    start.z + Math.sin( curvedAngle ) * distance
                );
                const terrain = membrane.height( point.x, point.z );
                point.y = terrain - height - THREE.MathUtils.lerp(
                    startBurial,
                    envelope.deepMediumDepth + 0.34,
                    eased
                );
                centres.push( point );
                widths.push( width );
                heights.push( height );
            }
            return { centres, widths, heights };
        }
        const fitted = fitSweptReach( {
            desiredReach,
            preferredInfluence: continuationPreferredInfluence,
            startInfluence: wellInfluenceAt( start.x, start.z ),
            createPath,
            radialSegments: continuationRadialSegments,
            influenceAt: wellInfluenceAt
        } );
        const { centres, widths, heights } = fitted.path;
        const endpoint = centres.at( -1 );
        const endpointInfluence = wellInfluenceAt( endpoint.x, endpoint.z );
        minimumRootSurfaceWellInfluence = Math.min(
            minimumRootSurfaceWellInfluence,
            fitted.minimumSurfaceInfluence
        );
        minimumSurfaceWellInfluenceMargin = Math.min(
            minimumSurfaceWellInfluenceMargin,
            fitted.minimumSurfaceInfluence - fitted.influenceFloor
        );
        const geometryRange = appendSweptPath( {
            centres,
            widths,
            heights,
            radialSegments: continuationRadialSegments,
            role: 2,
            pathId: axes.length + axisIndex + 1,
            shoulderRingCount: 0,
            wellInfluenceFloor: fitted.influenceFloor,
            surfaceRings: fitted.surfaceRings
        } );
        return {
            sourceId: principal.axis.sourceId,
            angle,
            endpointInfluence,
            influenceFloor: fitted.influenceFloor,
            startInfluence: fitted.startInfluence,
            minimumSurfaceInfluence: fitted.minimumSurfaceInfluence,
            geometryRange
        };
    }

    const collar = appendCollar();
    const principalRoots = axes.map( principalPath );
    const continuations = principalRoots.map( continuationPath );
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute( vertices, 3 )
    );
    geometry.setAttribute(
        'rootRole',
        new THREE.Float32BufferAttribute( rootRoles, 1 )
    );
    geometry.setAttribute(
        'rootPath',
        new THREE.Float32BufferAttribute( pathIds, 1 )
    );
    geometry.setAttribute(
        'rootMotionWeight',
        new THREE.Float32BufferAttribute( rootMotionWeights, 1 )
    );
    geometry.setIndex( indices );
    geometry.computeVertexNormals();
    const rootNormal = geometry.getAttribute( 'normal' );
    const worldToPlantingNormal = new THREE.Matrix3().getNormalMatrix(
        worldToPlanting
    );
    collar.shoulderNormals.forEach( ( worldNormal, side ) => {
        const normal = worldNormal.clone().applyMatrix3(
            worldToPlantingNormal
        ).normalize();
        rootNormal.setXYZ(
            collar.shoulderStartVertex + side,
            normal.x,
            normal.y,
            normal.z
        );
    } );
    rootNormal.needsUpdate = true;
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    geometry.userData.physicalRootSystem = {
        uncapped: true,
        collarRingCount: 6,
        collarBandCount: 4,
        collarSideCount: source.radialSegments,
        collarVertexCount: collar.vertexCount,
        principalRootCount: principalRoots.length,
        continuationCount: continuations.length,
        principalSegments,
        principalRadialSegments,
        continuationSegments,
        continuationRadialSegments
    };

    const endpointBands = [ ...principalRoots, ...continuations ].map(
        ( root ) => plantingEnvelope.sample(
            root.geometryRange.endpoint.x,
            root.geometryRange.endpoint.y,
            root.geometryRange.endpoint.z
        ).band
    );
    const minimumPrincipalWellInfluence = Math.min(
        ...principalRoots.map( ( root ) => root.fitted.influence )
    );
    const minimumContinuationWellInfluence = Math.min(
        ...continuations.map( ( root ) => root.endpointInfluence )
    );
    const minimumWellInfluenceMargin = Math.min(
        ...principalRoots.map(
            ( root ) => root.fitted.influence - root.fitted.influenceFloor
        ),
        ...continuations.map(
            ( root ) => root.endpointInfluence - root.influenceFloor
        )
    );
    return {
        geometry,
        diagnosticSegments,
        data: {
            sourceGeometryUuid: trunkMesh.geometry.uuid,
            sourceEnvelopeRevision: envelope.revision,
            shoulderRingIndex: Math.max( ...shoulderSelection.ringIndices ),
            shoulderRingIndices: shoulderSelection.ringIndices,
            shoulderClearanceSatisfied: shoulderSelection.clearanceSatisfied,
            shoulderClearance,
            surfaceContainmentClearance,
            maximumCollarRise: Math.max( ...collar.shoulder.map(
                ( point ) => plantingEnvelope.sample(
                    point.x,
                    point.y,
                    point.z
                ).signedTerrainDistance
            ) ),
            collarSideCount: source.radialSegments,
            collarVertexCount: collar.vertexCount,
            principalRootCount: principalRoots.length,
            continuationCount: continuations.length,
            hierarchySourceIds: principalRoots.map(
                ( root ) => root.axis.sourceId
            ),
            principalAngles: principalRoots.map(
                ( root ) => root.axis.angle
            ),
            shoulderStartVertex: collar.shoulderStartVertex,
            shoulderSourceNormals: collar.shoulderNormals.map( freezePoint ),
            principalInfluenceFloors: principalRoots.map(
                ( root ) => root.fitted.influenceFloor
            ),
            continuationInfluenceFloors: continuations.map(
                ( root ) => root.influenceFloor
            ),
            shoulderSourceLine: collar.shoulderSource.map( freezePoint ),
            collarShoulderLine: collar.shoulder.map( freezePoint ),
            endpointBands,
            minimumPrincipalWellInfluence,
            minimumContinuationWellInfluence,
            minimumWellInfluenceMargin,
            minimumRootSurfaceWellInfluence,
            minimumSurfaceWellInfluenceMargin,
            preferredPrincipalWellInfluence: principalPreferredInfluence,
            preferredContinuationWellInfluence: continuationPreferredInfluence,
            preferredWellBudgetRetained: principalRoots.every(
                ( root ) => root.fitted.influenceFloor
                    === principalPreferredInfluence
            ) && continuations.every(
                ( root ) => root.influenceFloor
                    === continuationPreferredInfluence
            ),
            maximumBuriedSignedDistance,
            aboveTerrainOutsideContactCount,
            vertexCount: vertices.length / 3,
            triangleCount: indices.length / 3,
            uncapped: true,
            motionPolicy: 'weighted-shoulder-handoff',
            materialSource: 'live-monumental-trunk-derived',
            topologySource: 'meaning-loads-and-counter-load-gaps'
        }
    };
}

function replaceLineGeometry( line, points )
{
    const previous = line.geometry;
    line.geometry = new THREE.BufferGeometry().setFromPoints( points );
    previous.dispose();
}

function createRootMaterial( trunkMaterial )
{
    const material = trunkMaterial.clone();
    material.name = 'Composition rooted graphite material';
    const compileTrunkMaterial = trunkMaterial.onBeforeCompile;
    const trunkProgramKey = trunkMaterial.customProgramCacheKey.bind(
        trunkMaterial
    );
    material.onBeforeCompile = ( shader, renderer ) => {
        const previousSourceShader = trunkMaterial.userData.shader;
        compileTrunkMaterial.call( trunkMaterial, shader, renderer );
        if ( previousSourceShader === undefined )
        {
            delete trunkMaterial.userData.shader;
        }
        else
        {
            trunkMaterial.userData.shader = previousSourceShader;
        }
        shader.vertexShader = `attribute float rootMotionWeight;\n`
            + `#define TREE_MOTION_WEIGHT rootMotionWeight\n`
            + shader.vertexShader;
        material.userData.shader = shader;
    };
    material.customProgramCacheKey = () =>
        `${trunkProgramKey()}-physical-root-weight-v4`;
    material.userData.deformationFieldId = rootedMotionFieldId;
    material.userData.physicalRootMaterial = Object.freeze( {
        sourceMaterialUuid: trunkMaterial.uuid,
        deformation: 'shared-shoulder-to-static-root',
        deformationFieldId: rootedMotionFieldId
    } );
    material.needsUpdate = true;
    return material;
}

export function createCompositionRootSystem( {
    plantingGroup,
    membrane,
    plantingEnvelope,
    hierarchy
} )
{
    if ( !plantingGroup?.isObject3D )
    {
        throw new TypeError( 'Physical roots require the Tree planting group.' );
    }
    if ( typeof membrane?.height !== 'function' )
    {
        throw new TypeError( 'Physical roots require a membrane height function.' );
    }
    if ( typeof plantingEnvelope?.sample !== 'function' )
    {
        throw new TypeError( 'Physical roots require the planting envelope.' );
    }
    if ( !hierarchy?.byId?.has?.( 'meaning' ) )
    {
        throw new TypeError( 'Physical roots require the Tree hierarchy.' );
    }

    const group = new THREE.Group();
    group.name = 'Category Tree physical root system';
    const placeholderMaterial = new THREE.MeshBasicMaterial( { visible: false } );
    const mesh = new THREE.Mesh( new THREE.BufferGeometry(), placeholderMaterial );
    mesh.name = 'Composition graphite collar and physical roots';
    mesh.userData.physicalRootSystem = true;
    const diagnosticMaterial = new THREE.LineBasicMaterial( {
        color: 0x8aa59e,
        transparent: true,
        opacity: 0.72,
        depthTest: true,
        depthWrite: false,
        toneMapped: false
    } );
    const diagnostic = new THREE.LineSegments(
        new THREE.BufferGeometry(),
        diagnosticMaterial
    );
    diagnostic.name = 'Physical root centre-line guides';
    diagnostic.visible = false;
    group.add( mesh, diagnostic );
    plantingGroup.add( group );

    let ownsPlaceholderMaterial = true;
    let rootMaterial = null;
    let sourceMaterial = null;
    let disposed = false;
    let visible = true;
    let diagnosticRequested = false;
    let revision = 0;
    let snapshot = null;

    function update( trunkMesh, envelope )
    {
        if ( disposed ) throw new Error( 'The physical root system is disposed.' );
        if ( envelope?.status !== 'attached' )
        {
            mesh.visible = false;
            diagnostic.visible = false;
            snapshot = Object.freeze( {
                revision: ++revision,
                status: 'unavailable',
                sourceEnvelopeRevision: envelope?.revision ?? null
            } );
            group.userData.physicalRootSystem = snapshot;
            return snapshot;
        }
        const built = createPhysicalRootGeometry( {
            plantingGroup,
            membrane,
            plantingEnvelope,
            hierarchy,
            trunkMesh,
            envelope
        } );
        const previous = mesh.geometry;
        mesh.geometry = built.geometry;
        previous.dispose();
        if ( sourceMaterial !== trunkMesh.material )
        {
            rootMaterial?.dispose();
            rootMaterial = createRootMaterial( trunkMesh.material );
            sourceMaterial = trunkMesh.material;
            if ( ownsPlaceholderMaterial )
            {
                placeholderMaterial.dispose();
                ownsPlaceholderMaterial = false;
            }
        }
        mesh.material = rootMaterial;
        mesh.position.set( 0, 0, 0 );
        mesh.visible = visible;
        replaceLineGeometry( diagnostic, built.diagnosticSegments );
        diagnostic.visible = visible && diagnosticRequested;
        revision += 1;
        snapshot = Object.freeze( {
            revision,
            status: 'attached',
            geometryUuid: mesh.geometry.uuid,
            materialUuid: mesh.material.uuid,
            materialSharedWithTrunk: mesh.material === trunkMesh.material,
            materialDerivedFromTrunk: sourceMaterial === trunkMesh.material,
            sourceMaterialUuid: trunkMesh.material.uuid,
            diagnosticDepthTest: diagnostic.material.depthTest,
            ...built.data,
            hierarchySourceIds: Object.freeze( built.data.hierarchySourceIds.slice() ),
            principalAngles: Object.freeze( built.data.principalAngles.slice() ),
            shoulderRingIndices: Object.freeze(
                built.data.shoulderRingIndices.slice()
            ),
            principalInfluenceFloors: Object.freeze(
                built.data.principalInfluenceFloors.slice()
            ),
            continuationInfluenceFloors: Object.freeze(
                built.data.continuationInfluenceFloors.slice()
            ),
            shoulderSourceLine: Object.freeze( built.data.shoulderSourceLine.slice() ),
            collarShoulderLine: Object.freeze( built.data.collarShoulderLine.slice() ),
            shoulderSourceNormals: Object.freeze(
                built.data.shoulderSourceNormals.slice()
            ),
            endpointBands: Object.freeze( built.data.endpointBands.slice() )
        } );
        group.userData.physicalRootSystem = snapshot;
        mesh.geometry.userData.physicalRootSystem.snapshot = snapshot;
        return snapshot;
    }

    function setVisible( nextVisible )
    {
        visible = Boolean( nextVisible );
        group.visible = visible;
        mesh.visible = visible && snapshot?.status === 'attached';
        diagnostic.visible = visible && diagnosticRequested
            && snapshot?.status === 'attached';
        return visible;
    }

    function setDiagnosticVisible( nextVisible )
    {
        diagnosticRequested = Boolean( nextVisible );
        diagnostic.visible = visible && diagnosticRequested
            && snapshot?.status === 'attached';
        return diagnostic.visible;
    }

    function dispose()
    {
        if ( disposed ) return;
        disposed = true;
        group.removeFromParent();
        mesh.geometry.dispose();
        diagnostic.geometry.dispose();
        diagnostic.material.dispose();
        rootMaterial?.dispose();
        if ( ownsPlaceholderMaterial ) placeholderMaterial.dispose();
    }

    return {
        group,
        mesh,
        diagnostic,
        update,
        setVisible,
        setDiagnosticVisible,
        getSnapshot() {
            return snapshot;
        },
        dispose
    };
}

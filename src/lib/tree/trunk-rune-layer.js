import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { informationPalette } from '../information-palette.js';
import {
    registerRootedMotionMaterial,
    rootedMotionShaderApplication,
    rootedMotionShaderDeclarations
} from './rooted-motion.js';

export const trunkRuneTransducerSite = Object.freeze( {
    id: 'meaning-passage',
    transducerId: 'meaning-transducer',
    parentId: 'exchange',
    childId: 'meaning',
    localProgress: 0.58,
    angularTurn: 0.08
} );

// C4a authorises one functional transducer. Every admitted packet traverses
// this same object-space path; the visible form never samples unrelated traffic.
export const trunkRuneSites = Object.freeze( [ trunkRuneTransducerSite ] );
export const trunkRuneManifestationDuration = 0;
export const trunkRuneFullAdmissionFrequency = Number.POSITIVE_INFINITY;

export const trunkRuneCandidateIds = Object.freeze( {
    evidence: 'c4a-exterior-brooch-v1',
    longitudinal: 'c4a-longitudinal-placement-v1',
    opticalFibre: 'c4b-exterior-optical-fibre-v1',
    internalArborescence: 'c4c-internal-arborescence-v1'
} );
export const defaultTrunkRuneCandidateId =
    trunkRuneCandidateIds.internalArborescence;

const e1LongitudinalSpan = 0.29;
const e1BodySpan = 0.44;
const e1TubeRadius = 0.022;
const e1TubularSegments = 240;
const e1RadialSegments = 8;
const e2TubeRadius = 0.015;
const e2TubularSegments = 160;
const e2RadialSegments = 6;
const o1TubeRadius = 0.012;
const o1TubularSegments = 288;
const o1RadialSegments = 6;
const o1ControlCount = 97;
const o1SpiralTurns = 3.25;
const o1EntryLocalProgress = 0.96;
const o1ExitLocalProgress = 0.04;
const o1TransformationPhase = 0.62;
const i1TubeRadius = 0.024;
const i1TubularSegments = 112;
const i1RadialSegments = 6;
const i1EntryLocalProgress = 0.96;
const i1ExitLocalProgress = 0.04;
const i1TransformationPhase = 0.62;
const runeSignalHeadWidth = 0.036;
const runeSignalTailLength = 0.19;
// Fixed in object space and aimed toward the authored Structure view. It is
// never recomputed from the camera; orbit therefore reveals real parallax.
const corridorAngle = -0.74;
const carrierSafeCorridorAngle = 3.55;
const placementAxis = new THREE.Vector3( 1, 0, 0.25 ).normalize();

// One uninterrupted wire traces an unequal outer loop, folds into a smaller
// inner loop, crosses itself in depth, passes the transformation knot and
// returns to the route centre. The vocabulary comes from the user's personal
// memory of gold filigree jewellery, not a claimed ethnic style or copied motif.
// q is longitudinal position; outward/lateral are local shell-radius fractions.
const e1Controls = Object.freeze( [
    Object.freeze( { q: 0.00, outward: 0.00, lateral: 0.00 } ),
    Object.freeze( {
        q: 0.08, outward: 0.48, lateral: 0.00, presentation: 0.00
    } ),
    Object.freeze( {
        q: 0.14, outward: 1.02, lateral: -0.12, presentation: 0.55
    } ),
    Object.freeze( { q: 0.30, outward: 1.13, lateral: -0.38 } ),
    Object.freeze( { q: 0.58, outward: 1.18, lateral: -0.52 } ),
    Object.freeze( { q: 0.86, outward: 1.14, lateral: -0.30 } ),
    Object.freeze( { q: 0.95, outward: 1.18, lateral: 0.00 } ),
    Object.freeze( { q: 0.84, outward: 1.15, lateral: 0.32 } ),
    Object.freeze( { q: 0.55, outward: 1.16, lateral: 0.52 } ),
    Object.freeze( { q: 0.28, outward: 1.20, lateral: 0.36 } ),
    Object.freeze( { q: 0.16, outward: 1.04, lateral: 0.10 } ),
    Object.freeze( { q: 0.31, outward: 1.02, lateral: -0.12 } ),
    Object.freeze( { q: 0.56, outward: 1.12, lateral: -0.27 } ),
    Object.freeze( { q: 0.76, outward: 1.08, lateral: -0.03 } ),
    Object.freeze( { q: 0.61, outward: 1.24, lateral: 0.23 } ),
    Object.freeze( { q: 0.39, outward: 0.98, lateral: 0.18 } ),
    Object.freeze( { q: 0.30, outward: 1.20, lateral: 0.01 } ),
    Object.freeze( { q: 0.48, outward: 0.96, lateral: -0.08 } ),
    Object.freeze( { q: 0.65, outward: 1.24, lateral: 0.08 } ),
    Object.freeze( {
        q: 0.76, outward: 1.07, lateral: 0.00, presentation: 0.40
    } ),
    Object.freeze( {
        q: 0.89, outward: 0.48, lateral: 0.00, presentation: 0.00
    } ),
    Object.freeze( { q: 1.00, outward: 0.00, lateral: 0.00 } )
] );
const e1TransformationControlIndex = 18;

// E2 tests placement rather than ornament. Its one route is more than twice as
// long in the trunk direction as E1's entry/exit interval and alternates between
// buried runs and three small, physical shell crests. The controls are in packet
// order (meaning -> exchange): localProgress descends rootward, radius is a
// fraction of the local conservative shell, and turn is an authored rotation in
// the transported trunk frame. No value depends on the camera.
const e2Controls = Object.freeze( [
    Object.freeze( { localProgress: 0.96, radius: 0.000, turn: 0.00 } ),
    Object.freeze( { localProgress: 0.90, radius: 0.860, turn: 0.00 } ),
    Object.freeze( { localProgress: 0.78, radius: 1.012, turn: 0.27 } ),
    Object.freeze( { localProgress: 0.66, radius: 0.880, turn: 0.27 } ),
    Object.freeze( { localProgress: 0.52, radius: 1.012, turn: 0.27 } ),
    Object.freeze( { localProgress: 0.38, radius: 0.880, turn: 0.27 } ),
    Object.freeze( { localProgress: 0.24, radius: 1.012, turn: 0.27 } ),
    Object.freeze( { localProgress: 0.10, radius: 0.860, turn: 0.00 } ),
    Object.freeze( { localProgress: 0.04, radius: 0.000, turn: 0.00 } )
] );
const e2TransformationControlIndex = 4;

export const trunkRuneCandidateProfiles = Object.freeze( {
    [trunkRuneCandidateIds.evidence]: Object.freeze( {
        candidateId: trunkRuneCandidateIds.evidence,
        reviewStatus: 'preserved-technical-evidence',
        placementModel: 'exterior-transverse-filigree',
        spatialConvergenceClaim: false,
        entryLocalProgress: trunkRuneTransducerSite.localProgress
            + e1LongitudinalSpan * 0.5,
        exitLocalProgress: trunkRuneTransducerSite.localProgress
            - e1LongitudinalSpan * 0.5,
        bodyLongitudinalSpan: e1BodySpan,
        tubeRadius: e1TubeRadius,
        tubularSegments: e1TubularSegments,
        radialSegments: e1RadialSegments,
        transformationControlIndex: e1TransformationControlIndex,
        controls: e1Controls
    } ),
    [trunkRuneCandidateIds.longitudinal]: Object.freeze( {
        candidateId: trunkRuneCandidateIds.longitudinal,
        reviewStatus: 'bounded-placement-candidate',
        placementModel: 'axial-shell-straddling-single-route',
        spatialConvergenceClaim: false,
        entryLocalProgress: e2Controls[0].localProgress,
        exitLocalProgress: e2Controls.at( -1 ).localProgress,
        bodyLongitudinalSpan:
            e2Controls[0].localProgress - e2Controls.at( -1 ).localProgress,
        tubeRadius: e2TubeRadius,
        tubularSegments: e2TubularSegments,
        radialSegments: e2RadialSegments,
        transformationControlIndex: e2TransformationControlIndex,
        controls: e2Controls
    } ),
    [trunkRuneCandidateIds.opticalFibre]: Object.freeze( {
        candidateId: trunkRuneCandidateIds.opticalFibre,
        reviewStatus: 'bounded-artistic-experiment-awaiting-human-review',
        placementModel: 'exterior-taper-following-optical-spiral',
        spatialConvergenceClaim: false,
        routeEntryParentId: 'exchange',
        routeEntryChildId: 'meaning',
        routeExitParentId: 'planting-root',
        routeExitChildId: 'uptake',
        entryLocalProgress: o1EntryLocalProgress,
        exitLocalProgress: o1ExitLocalProgress,
        bodyLongitudinalSpan: 1,
        tubeRadius: o1TubeRadius,
        tubularSegments: o1TubularSegments,
        radialSegments: o1RadialSegments,
        generatedControlCount: o1ControlCount,
        spiralTurns: o1SpiralTurns,
        transformationPhase: o1TransformationPhase,
        transformationControlIndex: Math.round(
            ( o1ControlCount - 1 ) * o1TransformationPhase
        ),
        controls: Object.freeze( [] )
    } ),
    [trunkRuneCandidateIds.internalArborescence]: Object.freeze( {
        candidateId: trunkRuneCandidateIds.internalArborescence,
        reviewStatus: 'bounded-artistic-experiment-awaiting-human-review',
        placementModel: 'packet-selected-internal-c1-authored-arborescence',
        spatialConvergenceClaim: false,
        routeEntryParentId: 'exchange',
        routeEntryChildId: 'meaning',
        routeExitParentId: 'planting-root',
        routeExitChildId: 'uptake',
        entryLocalProgress: i1EntryLocalProgress,
        exitLocalProgress: i1ExitLocalProgress,
        bodyLongitudinalSpan: 1,
        tubeRadius: i1TubeRadius,
        tubularSegments: i1TubularSegments,
        radialSegments: i1RadialSegments,
        transformationPhase: i1TransformationPhase,
        transformationControlIndex: Math.round(
            i1TubularSegments * i1TransformationPhase
        ),
        controls: Object.freeze( [] )
    } )
} );

export function getTrunkRuneCandidateProfile(
    candidateId = defaultTrunkRuneCandidateId
)
{
    const profile = trunkRuneCandidateProfiles[candidateId];
    if ( !profile )
    {
        throw new Error( `Unknown trunk rune candidate '${candidateId}'.` );
    }
    return profile;
}

function stableRuneHash( value )
{
    let hash = 2166136261;
    for ( let index = 0; index < value.length; index += 1 )
    {
        hash ^= value.charCodeAt( index );
        hash = Math.imul( hash, 16777619 );
    }
    return hash >>> 0;
}

export function getTrunkRuneAdmission( eventId )
{
    return {
        admitted: true,
        probability: 1,
        hash: stableRuneHash( eventId ),
        strategy: 'none-functional-transduction'
    };
}

export function getTrunkRuneRouteDistances(
    route,
    site = trunkRuneTransducerSite,
    candidateId = defaultTrunkRuneCandidateId
)
{
    const profile = getTrunkRuneCandidateProfile( candidateId );
    const entryParentId = profile.routeEntryParentId ?? site.parentId;
    const entryChildId = profile.routeEntryChildId ?? site.childId;
    const exitParentId = profile.routeExitParentId ?? site.parentId;
    const exitChildId = profile.routeExitChildId ?? site.childId;
    const entrySegment = route?.byChildId.get( entryChildId );
    const exitSegment = route?.byChildId.get( exitChildId );
    if ( !entrySegment || entrySegment.parentId !== entryParentId
        || !exitSegment || exitSegment.parentId !== exitParentId ) return null;
    const routeDistanceAtTrunkProgress = ( segment, progress ) => THREE.MathUtils.lerp(
        segment.parentDistance,
        segment.childDistance,
        THREE.MathUtils.clamp( progress, 0, 1 )
    );
    // Packets travel child -> parent, opposite the trunk's parent -> child
    // curve parameter. Entry is therefore the larger local progress.
    const entryLocalProgress = profile.entryLocalProgress;
    const exitLocalProgress = profile.exitLocalProgress;
    const entryDistance = routeDistanceAtTrunkProgress(
        entrySegment,
        entryLocalProgress
    );
    const exitDistance = routeDistanceAtTrunkProgress(
        exitSegment,
        exitLocalProgress
    );
    return {
        entryDistance,
        exitDistance,
        entryParentId,
        entryChildId,
        exitParentId,
        exitChildId,
        entryLocalProgress,
        exitLocalProgress,
        ingressDistance: entryDistance,
        egressDistance: exitDistance,
        ingressLocalProgress: entryLocalProgress,
        egressLocalProgress: exitLocalProgress
    };
}

export function getTrunkRuneRouteDistance(
    route,
    site = trunkRuneTransducerSite,
    candidateId = defaultTrunkRuneCandidateId
)
{
    return getTrunkRuneRouteDistances( route, site, candidateId )
        ?.entryDistance ?? null;
}

function getAuthoredSpanIndex( trunkNodes, site )
{
    return trunkNodes.findIndex( ( node, index ) =>
        node.id === site.parentId
        && trunkNodes[index + 1]?.id === site.childId
    );
}

function getRingCentre( position, ring, radialSegments )
{
    const centre = new THREE.Vector3();
    for ( let side = 0; side < radialSegments; side += 1 )
    {
        centre.x += position.getX( ring * radialSegments + side );
        centre.y += position.getY( ring * radialSegments + side );
        centre.z += position.getZ( ring * radialSegments + side );
    }
    return centre.multiplyScalar( 1 / radialSegments );
}

function sampleConservativeShell( sourceGeometry, spanIndex, localProgress )
{
    const metadata = sourceGeometry.userData.monumentalTrunk;
    const { radialSegments, samplesPerSpan } = metadata;
    const ringValue = 1 + spanIndex * samplesPerSpan
        + THREE.MathUtils.clamp( localProgress, 0, 1 ) * samplesPerSpan;
    const ring0 = Math.floor( ringValue );
    const ring1 = Math.min(
        metadata.sideVertexCount / radialSegments - 1,
        ring0 + 1
    );
    const amount = ringValue - ring0;
    const position = sourceGeometry.getAttribute( 'position' );
    const centre0 = getRingCentre( position, ring0, radialSegments );
    const centre1 = getRingCentre( position, ring1, radialSegments );
    const radiusRange = ( ring, centre ) => {
        let minimum = Number.POSITIVE_INFINITY;
        let maximum = 0;
        for ( let side = 0; side < radialSegments; side += 1 )
        {
            const surface = new THREE.Vector3().fromBufferAttribute(
                position,
                ring * radialSegments + side
            );
            const radius = surface.distanceTo( centre );
            minimum = Math.min( minimum, radius );
            maximum = Math.max( maximum, radius );
        }
        return { minimum, maximum };
    };
    const range0 = radiusRange( ring0, centre0 );
    const range1 = radiusRange( ring1, centre1 );
    return {
        centre: centre0.clone().lerp( centre1, amount ),
        radius: THREE.MathUtils.lerp(
            range0.minimum,
            range1.minimum,
            amount
        ),
        maximumRadius: THREE.MathUtils.lerp(
            range0.maximum,
            range1.maximum,
            amount
        )
    };
}

function createExteriorFiligreePath( sourceGeometry, spanIndex, routeSegment, site )
{
    const entryLocalProgress = site.localProgress + e1LongitudinalSpan * 0.5;
    const exitLocalProgress = site.localProgress - e1LongitudinalSpan * 0.5;
    const bodyEntryLocalProgress = site.localProgress + e1BodySpan * 0.5;
    const bodyExitLocalProgress = site.localProgress - e1BodySpan * 0.5;
    const middleProgress = ( entryLocalProgress + exitLocalProgress ) * 0.5;
    const tangent = routeSegment.curve.getTangentAt( middleProgress ).normalize();
    const major = placementAxis.clone().addScaledVector(
        tangent,
        -placementAxis.dot( tangent )
    );
    if ( major.lengthSq() < 1e-8 ) major.set( 1, 0, 0 );
    major.normalize();
    const minor = new THREE.Vector3().crossVectors( tangent, major ).normalize();
    const outward = major.clone().multiplyScalar( Math.cos( corridorAngle ) )
        .addScaledVector( minor, Math.sin( corridorAngle ) )
        .normalize();
    const safeOutward = major.clone().multiplyScalar(
        Math.cos( carrierSafeCorridorAngle )
    ).addScaledVector( minor, Math.sin( carrierSafeCorridorAngle ) )
        .normalize();
    const lateral = new THREE.Vector3().crossVectors( tangent, outward )
        .normalize();
    const controls = e1Controls.map( ( control, index ) => {
        const localProgress = index === 0
            ? entryLocalProgress
            : index === e1Controls.length - 1
                ? exitLocalProgress
                : THREE.MathUtils.lerp(
                    bodyEntryLocalProgress,
                    bodyExitLocalProgress,
                    control.q
                );
        const centre = routeSegment.curve.getPointAt( localProgress );
        if ( control.outward === 0 && control.lateral === 0 ) return centre;
        const shell = sampleConservativeShell(
            sourceGeometry,
            spanIndex,
            localProgress
        );
        const presentation = control.presentation ?? 1;
        const controlOutward = safeOutward.clone().lerp(
            outward,
            presentation
        ).normalize();
        const controlLateral = new THREE.Vector3().crossVectors(
            tangent,
            controlOutward
        ).normalize();
        return centre
            .addScaledVector(
                controlOutward,
                shell.maximumRadius * control.outward
            )
            .addScaledVector(
                controlLateral,
                shell.maximumRadius * control.lateral
            );
    } );
    return {
        curve: new THREE.CatmullRomCurve3( controls, false, 'centripetal', 0.45 ),
        controls,
        entryLocalProgress,
        exitLocalProgress,
        bodyEntryLocalProgress,
        bodyExitLocalProgress,
        tangent,
        outward,
        safeOutward,
        lateral
    };
}

function getAuthoredShellReference( sourceGeometry, spanIndex, localProgress )
{
    const metadata = sourceGeometry.userData.monumentalTrunk;
    const { radialSegments, samplesPerSpan } = metadata;
    const ringValue = 1 + spanIndex * samplesPerSpan
        + THREE.MathUtils.clamp( localProgress, 0, 1 ) * samplesPerSpan;
    const ring = Math.round( ringValue );
    const position = sourceGeometry.getAttribute( 'position' );
    const centre = getRingCentre( position, ring, radialSegments );
    return new THREE.Vector3().fromBufferAttribute(
        position,
        ring * radialSegments
    ).sub( centre ).normalize();
}

function getAuthoredSpanIndexForPair( trunkNodes, parentId, childId )
{
    return trunkNodes.findIndex( ( node, index ) =>
        node.id === parentId && trunkNodes[index + 1]?.id === childId
    );
}

function getDirectionalShellRadius(
    position,
    ring,
    radialSegments,
    centre,
    radial,
    tangent
)
{
    const lateral = new THREE.Vector3().crossVectors( tangent, radial );
    if ( lateral.lengthSq() < 1e-10 ) lateral.set( 0, 0, 1 );
    lateral.normalize();
    let intersection = Number.NEGATIVE_INFINITY;
    let fallback = 0;
    for ( let side = 0; side < radialSegments; side += 1 )
    {
        const nextSide = ( side + 1 ) % radialSegments;
        const start = new THREE.Vector3().fromBufferAttribute(
            position,
            ring * radialSegments + side
        ).sub( centre );
        const end = new THREE.Vector3().fromBufferAttribute(
            position,
            ring * radialSegments + nextSide
        ).sub( centre );
        const startX = start.dot( radial );
        const startY = start.dot( lateral );
        const endX = end.dot( radial );
        const endY = end.dot( lateral );
        fallback = Math.max( fallback, startX, endX );
        const denominator = endY - startY;
        if ( Math.abs( denominator ) < 1e-10 ) continue;
        const amount = -startY / denominator;
        if ( amount < -1e-8 || amount > 1 + 1e-8 ) continue;
        const x = THREE.MathUtils.lerp( startX, endX, amount );
        if ( x > 0 ) intersection = Math.max( intersection, x );
    }
    return Number.isFinite( intersection ) ? intersection : fallback;
}

function sampleDirectionalShell(
    sourceGeometry,
    spanIndex,
    localProgress,
    radial,
    tangent
)
{
    const metadata = sourceGeometry.userData.monumentalTrunk;
    const { radialSegments, samplesPerSpan } = metadata;
    const ringValue = 1 + spanIndex * samplesPerSpan
        + THREE.MathUtils.clamp( localProgress, 0, 1 ) * samplesPerSpan;
    const ring0 = Math.floor( ringValue );
    const ring1 = Math.min(
        metadata.sideVertexCount / radialSegments - 1,
        ring0 + 1
    );
    const amount = ringValue - ring0;
    const position = sourceGeometry.getAttribute( 'position' );
    const centre0 = getRingCentre( position, ring0, radialSegments );
    const centre1 = getRingCentre( position, ring1, radialSegments );
    const radius0 = getDirectionalShellRadius(
        position,
        ring0,
        radialSegments,
        centre0,
        radial,
        tangent
    );
    const radius1 = getDirectionalShellRadius(
        position,
        ring1,
        radialSegments,
        centre1,
        radial,
        tangent
    );
    const radius = THREE.MathUtils.lerp( radius0, radius1, amount );
    return {
        centre: centre0.lerp( centre1, amount ),
        radius,
        maximumRadius: radius
    };
}

function approximateCurveIntervalLength( curve, from, to, divisions = 48 )
{
    let length = 0;
    let previous = curve.getPointAt( from );
    for ( let step = 1; step <= divisions; step += 1 )
    {
        const progress = THREE.MathUtils.lerp( from, to, step / divisions );
        const point = curve.getPointAt( progress );
        length += previous.distanceTo( point );
        previous = point;
    }
    return length;
}

function createOpticalFibrePath(
    sourceGeometry,
    trunkNodes,
    informationRoute,
    site,
    profile
)
{
    // Packet order is canopy -> root, opposite the monumental trunk's authored
    // root -> canopy order. The one rail crosses all three basal trunk spans.
    const definitions = [
        {
            parentId: profile.routeEntryParentId,
            childId: profile.routeEntryChildId,
            from: profile.entryLocalProgress,
            to: 0
        },
        { parentId: 'uptake', childId: 'exchange', from: 1, to: 0 },
        {
            parentId: profile.routeExitParentId,
            childId: profile.routeExitChildId,
            from: 1,
            to: profile.exitLocalProgress
        }
    ];
    const spans = definitions.map( ( definition ) => {
        const routeSegment = informationRoute?.byChildId.get(
            definition.childId
        );
        const spanIndex = getAuthoredSpanIndexForPair(
            trunkNodes,
            definition.parentId,
            definition.childId
        );
        if ( !routeSegment || routeSegment.parentId !== definition.parentId
            || spanIndex < 0 )
        {
            throw new Error(
                `Optical fibre requires authored trunk span `
                + `'${definition.parentId} -> ${definition.childId}'.`
            );
        }
        return {
            ...definition,
            spanIndex,
            curve: routeSegment.curve,
            length: approximateCurveIntervalLength(
                routeSegment.curve,
                definition.from,
                definition.to
            )
        };
    } );
    const totalCentrelineLength = spans.reduce(
        ( sum, span ) => sum + span.length,
        0
    );
    const sampleCentreline = ( pathPhase ) => {
        let remaining = THREE.MathUtils.clamp( pathPhase, 0, 1 )
            * totalCentrelineLength;
        let selected = spans.at( -1 );
        for ( const span of spans )
        {
            selected = span;
            if ( remaining <= span.length + 1e-9 ) break;
            remaining -= span.length;
        }
        const spanProgress = selected.length > 1e-9
            ? THREE.MathUtils.clamp( remaining / selected.length, 0, 1 )
            : 0;
        const localProgress = THREE.MathUtils.lerp(
            selected.from,
            selected.to,
            spanProgress
        );
        return {
            centre: selected.curve.getPointAt( localProgress ),
            tangent: selected.curve.getTangentAt( localProgress ).negate()
                .normalize(),
            localProgress,
            spanIndex: selected.spanIndex,
            parentId: selected.parentId,
            childId: selected.childId
        };
    };

    const controls = [];
    const shellSamples = [];
    const transportedTangents = [];
    let transportedMajor = null;
    let previousTangent = null;
    for ( let index = 0; index < profile.generatedControlCount; index += 1 )
    {
        const pathPhase = index / ( profile.generatedControlCount - 1 );
        const station = sampleCentreline( pathPhase );
        if ( transportedMajor === null )
        {
            transportedMajor = getAuthoredShellReference(
                sourceGeometry,
                station.spanIndex,
                station.localProgress
            );
        }
        else
        {
            transportedMajor.applyQuaternion(
                new THREE.Quaternion().setFromUnitVectors(
                    previousTangent,
                    station.tangent
                )
            );
        }
        transportedMajor.addScaledVector(
            station.tangent,
            -transportedMajor.dot( station.tangent )
        ).normalize();
        const transportedMinor = new THREE.Vector3().crossVectors(
            station.tangent,
            transportedMajor
        ).normalize();
        const angle = ( site.angularTurn + pathPhase * profile.spiralTurns )
            * Math.PI * 2;
        const radial = transportedMajor.clone().multiplyScalar(
            Math.cos( angle )
        ).addScaledVector( transportedMinor, Math.sin( angle ) ).normalize();
        const shell = sampleDirectionalShell(
            sourceGeometry,
            station.spanIndex,
            station.localProgress,
            radial,
            station.tangent
        );
        const ingress = THREE.MathUtils.smoothstep( pathPhase, 0, 0.045 );
        const egress = 1 - THREE.MathUtils.smoothstep(
            pathPhase,
            0.955,
            1
        );
        const shellBlend = ingress * egress;
        const fibreCentre = station.centre.clone().lerp(
            shell.centre.clone().addScaledVector(
                radial,
                shell.radius + profile.tubeRadius * 1.08
            ),
            shellBlend
        );
        controls.push( fibreCentre );
        shellSamples.push( {
            centre: shell.centre,
            radius: shell.radius,
            maximumRadius: shell.radius,
            localProgress: station.localProgress,
            spanIndex: station.spanIndex,
            parentId: station.parentId,
            childId: station.childId
        } );
        transportedTangents.push( station.tangent.toArray() );
        previousTangent = station.tangent;
    }
    const sampleShellAtParameter = ( parameter ) => {
        const controlPosition = THREE.MathUtils.clamp( parameter, 0, 1 )
            * ( shellSamples.length - 1 );
        const index = Math.min(
            shellSamples.length - 2,
            Math.floor( controlPosition )
        );
        const amount = controlPosition - index;
        const left = shellSamples[index];
        const right = shellSamples[index + 1];
        const radius = THREE.MathUtils.lerp(
            left.radius,
            right.radius,
            amount
        );
        return {
            centre: left.centre.clone().lerp( right.centre, amount ),
            radius,
            maximumRadius: radius
        };
    };
    const middleStation = sampleCentreline( 0.5 );
    return {
        curve: new THREE.CatmullRomCurve3(
            controls,
            false,
            'centripetal',
            0.45
        ),
        controls,
        entryLocalProgress: profile.entryLocalProgress,
        exitLocalProgress: profile.exitLocalProgress,
        bodyEntryLocalProgress: profile.entryLocalProgress,
        bodyExitLocalProgress: profile.exitLocalProgress,
        tangent: middleStation.tangent,
        outward: null,
        safeOutward: null,
        lateral: null,
        transportedTangents,
        phaseOffsetTurns: site.angularTurn,
        frameModel: 'parallel-transported-authored-trunk-frame',
        preferredFront: false,
        sampleShellAtParameter,
        transformationParameter: profile.transformationPhase,
        coveredSpans: spans.map( ( span ) => ( {
            parentId: span.parentId,
            childId: span.childId,
            spanIndex: span.spanIndex,
            fromLocalProgress: span.from,
            toLocalProgress: span.to
        } ) ),
        centrelineLength: totalCentrelineLength,
        spiralTurns: profile.spiralTurns,
        taperFollowing: true,
        packetOnlyDisclosure: true,
        colourTransition: 'continuous-blue-to-cosmos-gold-rootward'
    };
}

function createLongitudinalPlacementPath(
    sourceGeometry,
    spanIndex,
    routeSegment,
    site,
    phaseOffsetTurns = 0
)
{
    const profile = trunkRuneCandidateProfiles[trunkRuneCandidateIds.longitudinal];
    const controls = [];
    const tangents = [];
    let transportedMajor = null;
    let previousTangent = null;
    for ( const control of profile.controls )
    {
        const localProgress = control.localProgress;
        const tangent = routeSegment.curve.getTangentAt( localProgress ).normalize();
        if ( transportedMajor === null )
        {
            transportedMajor = getAuthoredShellReference(
                sourceGeometry,
                spanIndex,
                localProgress
            );
        }
        else
        {
            transportedMajor.applyQuaternion(
                new THREE.Quaternion().setFromUnitVectors(
                    previousTangent,
                    tangent
                )
            );
        }
        transportedMajor.addScaledVector(
            tangent,
            -transportedMajor.dot( tangent )
        ).normalize();
        const transportedMinor = new THREE.Vector3().crossVectors(
            tangent,
            transportedMajor
        ).normalize();
        const angle = (
            control.turn + site.angularTurn + phaseOffsetTurns
        ) * Math.PI * 2;
        const radial = transportedMajor.clone().multiplyScalar( Math.cos( angle ) )
            .addScaledVector( transportedMinor, Math.sin( angle ) );
        const shell = sampleConservativeShell(
            sourceGeometry,
            spanIndex,
            localProgress
        );
        controls.push( routeSegment.curve.getPointAt( localProgress )
            .addScaledVector( radial, shell.maximumRadius * control.radius ) );
        tangents.push( tangent.toArray() );
        previousTangent = tangent;
    }
    const entryLocalProgress = profile.entryLocalProgress;
    const exitLocalProgress = profile.exitLocalProgress;
    const middleControl = profile.controls[Math.floor( profile.controls.length / 2 )];
    const middleProgress = middleControl.localProgress;
    const middleTangent = routeSegment.curve.getTangentAt( middleProgress ).normalize();
    return {
        curve: new THREE.CatmullRomCurve3( controls, false, 'centripetal', 0.45 ),
        controls,
        entryLocalProgress,
        exitLocalProgress,
        bodyEntryLocalProgress: entryLocalProgress,
        bodyExitLocalProgress: exitLocalProgress,
        tangent: middleTangent,
        outward: null,
        safeOutward: null,
        lateral: null,
        transportedTangents: tangents,
        phaseOffsetTurns,
        frameModel: 'parallel-transported-authored-shell-frame',
        preferredFront: false
    };
}

function createCarrierSafeLongitudinalPlacementPath(
    sourceGeometry,
    spanIndex,
    routeSegment,
    site,
    interiorDescriptor,
    profile
)
{
    const presentationControl = profile.controls[
        profile.transformationControlIndex
    ];
    const presentationTangent = routeSegment.curve.getTangentAt(
        presentationControl.localProgress
    ).normalize();
    const presentationMajor = placementAxis.clone().addScaledVector(
        presentationTangent,
        -placementAxis.dot( presentationTangent )
    ).normalize();
    const presentationMinor = new THREE.Vector3().crossVectors(
        presentationTangent,
        presentationMajor
    ).normalize();
    const presentationOutward = presentationMajor
        .multiplyScalar( Math.cos( corridorAngle ) )
        .addScaledVector( presentationMinor, Math.sin( corridorAngle ) )
        .normalize();
    const requiredCarrierClearance = 0.01;
    let selected = null;
    let selectedAlignment = Number.NEGATIVE_INFINITY;
    let fallback = null;
    let fallbackClearance = Number.NEGATIVE_INFINITY;
    const phaseCandidateCount = 48;
    let eligiblePhaseCandidateCount = 0;
    let maximumPresentationAlignment = Number.NEGATIVE_INFINITY;
    let maximumPresentationAlignmentPhase = null;
    let maximumPresentationAlignmentClearance = null;
    for ( let index = 0; index < phaseCandidateCount; index += 1 )
    {
        const phaseOffsetTurns = index / phaseCandidateCount;
        const authored = createLongitudinalPlacementPath(
            sourceGeometry,
            spanIndex,
            routeSegment,
            site,
            phaseOffsetTurns
        );
        const centres = Array.from( {
            length: profile.tubularSegments + 1
        }, ( _, sample ) =>
            authored.curve.getPointAt( sample / profile.tubularSegments )
        );
        const clearance = getCarrierClearance(
            centres,
            interiorDescriptor,
            profile.tubeRadius
        ) ?? Number.POSITIVE_INFINITY;
        if ( clearance > fallbackClearance )
        {
            fallback = authored;
            fallbackClearance = clearance;
        }
        const presentationCentre = routeSegment.curve.getPointAt(
            presentationControl.localProgress
        );
        const presentationPoint = authored.controls[
            profile.transformationControlIndex
        ];
        const alignment = presentationPoint.clone().sub( presentationCentre )
            .normalize().dot( presentationOutward );
        if ( alignment > maximumPresentationAlignment )
        {
            maximumPresentationAlignment = alignment;
            maximumPresentationAlignmentPhase = phaseOffsetTurns;
            maximumPresentationAlignmentClearance = clearance;
        }
        if ( clearance + 1e-9 < requiredCarrierClearance ) continue;
        eligiblePhaseCandidateCount += 1;
        if ( alignment <= selectedAlignment ) continue;
        selected = authored;
        selectedAlignment = alignment;
    }
    let usedFallback = false;
    if ( selected === null )
    {
        selected = fallback;
        selectedAlignment = null;
        usedFallback = true;
    }
    selected.phaseSelectionClearance = getCarrierClearance(
        Array.from( { length: profile.tubularSegments + 1 }, ( _, sample ) =>
            selected.curve.getPointAt( sample / profile.tubularSegments )
        ),
        interiorDescriptor,
        profile.tubeRadius
    );
    selected.phaseSelectionRequiredClearance = requiredCarrierClearance;
    selected.phasePresentationAlignment = selectedAlignment;
    selected.phaseSelectionFallback = usedFallback;
    selected.phaseCandidateCount = phaseCandidateCount;
    selected.eligiblePhaseCandidateCount = eligiblePhaseCandidateCount;
    selected.maximumPresentationAlignment = maximumPresentationAlignment;
    selected.maximumPresentationAlignmentPhase = maximumPresentationAlignmentPhase;
    selected.maximumPresentationAlignmentClearance =
        maximumPresentationAlignmentClearance;
    return selected;
}

function curveDistanceAtParameter( curve, target, divisions = 4096 )
{
    const clampedTarget = THREE.MathUtils.clamp( target, 0, 1 );
    let distance = 0;
    let previous = curve.getPoint( 0 );
    const wholeSteps = Math.floor( clampedTarget * divisions );
    for ( let step = 1; step <= wholeSteps; step += 1 )
    {
        const point = curve.getPoint( step / divisions );
        distance += previous.distanceTo( point );
        previous = point;
    }
    const wholeParameter = wholeSteps / divisions;
    if ( wholeParameter < clampedTarget )
    {
        distance += previous.distanceTo( curve.getPoint( clampedTarget ) );
    }
    return distance;
}

function controlLocalProgressAtParameter( parameter, profile )
{
    const controlPosition = THREE.MathUtils.clamp( parameter, 0, 1 )
        * ( profile.controls.length - 1 );
    const index = Math.min(
        profile.controls.length - 2,
        Math.floor( controlPosition )
    );
    const progressAt = ( control ) => control.localProgress
        ?? THREE.MathUtils.lerp(
            trunkRuneTransducerSite.localProgress + e1BodySpan * 0.5,
            trunkRuneTransducerSite.localProgress - e1BodySpan * 0.5,
            control.q
        );
    return THREE.MathUtils.lerp(
        progressAt( profile.controls[index] ),
        progressAt( profile.controls[index + 1] ),
        controlPosition - index
    );
}

function pointSegmentDistance( point, start, end )
{
    const segment = end.clone().sub( start );
    const lengthSquared = segment.lengthSq();
    if ( lengthSquared < 1e-12 ) return point.distanceTo( start );
    const amount = THREE.MathUtils.clamp(
        point.clone().sub( start ).dot( segment ) / lengthSquared,
        0,
        1
    );
    return point.distanceTo( start.clone().addScaledVector( segment, amount ) );
}

function getCarrierClearance( centres, interiorDescriptor, tubeRadius )
{
    if ( !interiorDescriptor?.carriers?.length ) return null;
    let minimum = Number.POSITIVE_INFINITY;
    for ( const carrier of interiorDescriptor.carriers )
    {
        const points = carrier.centreline;
        for ( const centre of centres )
        {
            for ( let index = 0; index + 5 < points.length; index += 3 )
            {
                const start = new THREE.Vector3().fromArray( points, index );
                const end = new THREE.Vector3().fromArray( points, index + 3 );
                minimum = Math.min(
                    minimum,
                    pointSegmentDistance( centre, start, end )
                        - tubeRadius - carrier.radius
                );
            }
        }
    }
    return minimum;
}

function setSignalAttributes(
    geometry,
    phaseValue = null,
    tubularSegments = null,
    radialSegments = null
)
{
    const positionCount = geometry.getAttribute( 'position' ).count;
    const phases = new Float32Array( positionCount );
    if ( phaseValue === null )
    {
        const ringSize = radialSegments + 1;
        for ( let index = 0; index < phases.length; index += 1 )
        {
            phases[index] = Math.floor( index / ringSize ) / tubularSegments;
        }
    }
    else phases.fill( phaseValue );
    geometry.setAttribute( 'runePhase', new THREE.Float32BufferAttribute( phases, 1 ) );
    geometry.setAttribute(
        'runeSignal',
        new THREE.Float32BufferAttribute( new Float32Array( positionCount ), 1 )
    );
    geometry.setAttribute(
        'runeWarmth',
        new THREE.Float32BufferAttribute( new Float32Array( positionCount ), 1 )
    );
    geometry.getAttribute( 'runeSignal' ).setUsage( THREE.DynamicDrawUsage );
    geometry.getAttribute( 'runeWarmth' ).setUsage( THREE.DynamicDrawUsage );
}

function sampleCarrierCentreline( carrier, station )
{
    const pointCount = carrier.centreline.length / 3;
    const clamped = THREE.MathUtils.clamp( station, 0, pointCount - 1 );
    const left = Math.floor( clamped );
    const right = Math.min( pointCount - 1, left + 1 );
    const amount = clamped - left;
    return new THREE.Vector3()
        .fromArray( carrier.centreline, left * 3 )
        .lerp(
            new THREE.Vector3().fromArray( carrier.centreline, right * 3 ),
            amount
        );
}

function createInternalArborescenceGeometry(
    sourceGeometry,
    trunkNodes,
    informationRoute,
    interiorDescriptor,
    profile
)
{
    if ( !interiorDescriptor?.carriers?.length )
    {
        throw new Error( 'The internal arborescence requires the accepted C1 descriptor.' );
    }
    const entrySpanIndex = getAuthoredSpanIndexForPair(
        trunkNodes,
        profile.routeEntryParentId,
        profile.routeEntryChildId
    );
    const exitSpanIndex = getAuthoredSpanIndexForPair(
        trunkNodes,
        profile.routeExitParentId,
        profile.routeExitChildId
    );
    const entrySegment = informationRoute?.byChildId.get(
        profile.routeEntryChildId
    );
    const exitSegment = informationRoute?.byChildId.get(
        profile.routeExitChildId
    );
    if ( entrySpanIndex < 0 || exitSpanIndex < 0
        || entrySegment?.parentId !== profile.routeEntryParentId
        || exitSegment?.parentId !== profile.routeExitParentId )
    {
        throw new Error(
            'The internal arborescence requires its authored centreline boundaries.'
        );
    }

    const samplesPerSpan = interiorDescriptor.samplesPerSpan;
    const entryStation = ( entrySpanIndex + profile.entryLocalProgress )
        * samplesPerSpan;
    const exitStation = ( exitSpanIndex + profile.exitLocalProgress )
        * samplesPerSpan;
    const entryPoint = entrySegment.curve.getPointAt(
        profile.entryLocalProgress
    );
    const exitPoint = exitSegment.curve.getPointAt(
        profile.exitLocalProgress
    );
    const eligibleCarriers = interiorDescriptor.carriers
        .filter( ( carrier ) =>
            carrier.centreline.length / 3 > Math.ceil( entryStation )
        )
        .slice()
        .sort( ( left, right ) => left.ownerId.localeCompare( right.ownerId ) );
    if ( eligibleCarriers.length === 0 )
    {
        throw new Error( 'No C1 carrier reaches the internal arborescence entry.' );
    }

    const sources = [];
    const pathProfiles = [];
    const pathRanges = [];
    let vertexStart = 0;
    let indexStart = 0;
    let minimumInheritedCarrierToShellClearance = Number.POSITIVE_INFINITY;
    for ( let pathIndex = 0; pathIndex < eligibleCarriers.length; pathIndex += 1 )
    {
        const carrier = eligibleCarriers[pathIndex];
        const controls = [ entryPoint.clone() ];
        controls.push( sampleCarrierCentreline( carrier, entryStation ) );
        for ( let station = Math.floor( entryStation ) - 1;
            station > Math.ceil( exitStation );
            station -= 1 )
        {
            controls.push( sampleCarrierCentreline( carrier, station ) );
        }
        controls.push( sampleCarrierCentreline( carrier, exitStation ) );
        controls.push( exitPoint.clone() );
        const curve = new THREE.CatmullRomCurve3(
            controls,
            false,
            'centripetal',
            0.42
        );
        const geometry = new THREE.TubeGeometry(
            curve,
            profile.tubularSegments,
            profile.tubeRadius,
            profile.radialSegments,
            false
        );
        setSignalAttributes(
            geometry,
            null,
            profile.tubularSegments,
            profile.radialSegments
        );
        geometry.setAttribute(
            'runeOwner',
            new THREE.Float32BufferAttribute(
                new Float32Array(
                    geometry.getAttribute( 'position' ).count
                ).fill( pathIndex ),
                1
            )
        );
        const pathLength = curve.getLength();
        const internalTransformationDistance = pathLength
            * profile.transformationPhase;
        const internalTransformationPoint = curve.getPointAt(
            profile.transformationPhase
        );
        const centrelinePoints = new Float32Array(
            Array.from(
                { length: profile.tubularSegments + 1 },
                ( _, step ) => curve.getPointAt(
                    step / profile.tubularSegments
                ).toArray()
            ).flat()
        );
        const pathProfile = Object.freeze( {
            pathIndex,
            ownerId: carrier.ownerId,
            entryTrunkNodeId: carrier.entryTrunkNodeId,
            pathLength,
            internalTransformationDistance,
            transformationPhase: profile.transformationPhase,
            centreEntryPoint: Object.freeze( entryPoint.toArray() ),
            internalTransformationPoint: Object.freeze(
                internalTransformationPoint.toArray()
            ),
            centreResumePoint: Object.freeze( exitPoint.toArray() ),
            controlPoints: new Float32Array(
                controls.flatMap( ( point ) => point.toArray() )
            ),
            centrelinePoints
        } );
        pathProfiles.push( pathProfile );
        pathRanges.push( Object.freeze( {
            pathIndex,
            ownerId: carrier.ownerId,
            vertexStart,
            vertexCount: geometry.getAttribute( 'position' ).count,
            indexStart,
            indexCount: geometry.index.count
        } ) );
        vertexStart += geometry.getAttribute( 'position' ).count;
        indexStart += geometry.index.count;
        minimumInheritedCarrierToShellClearance = Math.min(
            minimumInheritedCarrierToShellClearance,
            carrier.minimumWallClearance + carrier.radius
                - profile.tubeRadius
        );
        sources.push( geometry );
    }
    const geometry = mergeGeometries( sources, false );
    if ( !geometry )
    {
        for ( const source of sources ) source.dispose();
        throw new Error( 'The internal arborescence geometry could not be merged.' );
    }
    for ( const source of sources ) source.dispose();
    geometry.getAttribute( 'runeSignal' ).setUsage( THREE.DynamicDrawUsage );
    geometry.getAttribute( 'runeWarmth' ).setUsage( THREE.DynamicDrawUsage );
    geometry.computeBoundingSphere();

    const pathLengths = pathProfiles.map( ( path ) => path.pathLength );
    const transformationDistances = pathProfiles.map(
        ( path ) => path.internalTransformationDistance
    );
    const representative = pathProfiles[0];
    geometry.userData.trunkRunes = {
        siteCount: 1,
        sites: trunkRuneSites,
        candidateId: profile.candidateId,
        reviewStatus: profile.reviewStatus,
        placementModel: profile.placementModel,
        spatialConvergenceClaim: false,
        transducerId: trunkRuneTransducerSite.transducerId,
        parentId: trunkRuneTransducerSite.parentId,
        childId: trunkRuneTransducerSite.childId,
        spanIndex: entrySpanIndex,
        artisticForm: 'event-revealed-internal-information-arborescence',
        inspiration: 'root-system-within-monumental-graphite',
        ethnicStyleClaim: false,
        literalCulturalMotif: false,
        visibleArtifact: false,
        persistentStructure: false,
        idleLuminosity: 0,
        functionalPath: true,
        internal3d: true,
        surfaceExcursion: null,
        shellRelationship:
            'c1-derived-internal-packet-gated-transillumination',
        connectedPath: true,
        inletCount: 1,
        outletCount: 1,
        branched: true,
        aggregation: false,
        pathSelection: 'unique-authored-route-owner',
        routeEntryParentId: profile.routeEntryParentId,
        routeEntryChildId: profile.routeEntryChildId,
        routeExitParentId: profile.routeExitParentId,
        routeExitChildId: profile.routeExitChildId,
        coveredTrunkSpans: trunkNodes.slice(
            exitSpanIndex,
            entrySpanIndex + 2
        ).slice( 0, -1 ).map( ( node, offset ) => {
            const span = exitSpanIndex + offset;
            return {
                parentId: trunkNodes[span].id,
                childId: trunkNodes[span + 1].id,
                spanIndex: span,
                fromLocalProgress: span === entrySpanIndex
                    ? profile.entryLocalProgress
                    : 1,
                toLocalProgress: span === exitSpanIndex
                    ? profile.exitLocalProgress
                    : 0
            };
        } ).reverse(),
        coveredTrunkSpanCount: entrySpanIndex - exitSpanIndex + 1,
        spiralTurns: 0,
        taperFollowing: true,
        packetOnlyDisclosure: true,
        colourTransition: 'continuous-blue-to-cosmos-gold-rootward',
        colourTransitionContinuous: true,
        colourTransitionDirection: 'rootward',
        transformationArtifact: false,
        pathLength: pathLengths.reduce( ( total, value ) => total + value, 0 )
            / pathLengths.length,
        minimumPathLength: Math.min( ...pathLengths ),
        maximumPathLength: Math.max( ...pathLengths ),
        internalTransformationDistance: transformationDistances.reduce(
            ( total, value ) => total + value,
            0
        ) / transformationDistances.length,
        internalTransformationPhase: profile.transformationPhase,
        centreEntryDistance: 0,
        centreResumeDistance: pathLengths.reduce(
            ( total, value ) => total + value,
            0
        ) / pathLengths.length,
        centreEntryPhase: 0,
        centreResumePhase: 1,
        entryLocalProgress: profile.entryLocalProgress,
        exitLocalProgress: profile.exitLocalProgress,
        bodyLongitudinalSpan: profile.bodyLongitudinalSpan,
        centreEntryPoint: representative.centreEntryPoint.slice(),
        internalTransformationPoint:
            representative.internalTransformationPoint.slice(),
        centreResumePoint: representative.centreResumePoint.slice(),
        controlPoints: representative.controlPoints,
        centrelinePoints: representative.centrelinePoints,
        controlPointCount: representative.controlPoints.length / 3,
        centreSampleCount: representative.centrelinePoints.length / 3,
        pathProfiles: Object.freeze( pathProfiles ),
        pathRanges: Object.freeze( pathRanges ),
        pathOwnerIds: Object.freeze(
            pathProfiles.map( ( path ) => path.ownerId )
        ),
        pathCount: pathProfiles.length,
        tubularSegments: profile.tubularSegments,
        radialSegments: profile.radialSegments,
        tubeRadius: profile.tubeRadius,
        granuleRadius: 0,
        maximumNormalisedRadius: Math.max(
            ...eligibleCarriers.map( ( carrier ) => carrier.slotRadius )
        ),
        minimumPathToShellClearance: null,
        minimumInheritedCarrierToShellClearance,
        maximumPathToShellClearance: null,
        maximumExteriorProtrusion: null,
        shellExposureBandCount: 0,
        shellExposureBands: [],
        buriedSampleCount: null,
        shellCrossingSampleCount: null,
        exteriorSampleCount: null,
        straddlesShell: null,
        continuousShellContainmentVerified: false,
        containmentEvidence:
            'accepted-c1-carrier-samples-and-exact-central-boundaries',
        minimumPathToCarrierClearance: null,
        checkedCarrierCount: interiorDescriptor.carriers.length,
        insideOpaqueShell: null,
        carrierCollisionFree: null,
        carrierClearanceModel:
            'selected-path-coincident-with-owner-and-shared-boundaries',
        pathFrame: {
            model: 'accepted-c1-object-space-carrier-family',
            cameraIndependent: true
        },
        rendering: 'depth-aware-packet-gated-subsurface-transmission',
        motionModel: 'shared-tree-deformation',
        renderContract: {
            activation: 'genuine-traversal-only',
            mainSceneMeshVisible: false,
            persistentGoldStructure: false,
            packetOnlyDisclosure: true,
            mostlyInvisibleAtIdle: true,
            gradualRootwardColour: true,
            multiSpanPath: true,
            transformationGranule: false,
            idleLuminosity: 0,
            activeExtraPassCount: 5,
            ordinaryDepthOnly: false,
            depthAwareSubsurface: true,
            greaterDepth: false,
            cameraFacing: false,
            aperture: false,
            c1InventoryVisible: false,
            bloomRequired: false
        },
        idlePassCount: 1,
        activeOverlayDrawCalls: 1,
        meshCount: 1,
        maximumDrawCalls: 1,
        tubeVertexCount: geometry.getAttribute( 'position' ).count,
        tubeTriangleCount: geometry.index.count / 3,
        vertexCount: geometry.getAttribute( 'position' ).count,
        triangleCount: geometry.index.count / 3,
        objectSpace: true,
        cameraFacing: false,
        sourceGeometryUuid: sourceGeometry.uuid
    };
    return geometry;
}

export function createTrunkRuneGeometry(
    sourceGeometry,
    trunkNodes,
    informationRoute,
    interiorDescriptor = null,
    candidateId = defaultTrunkRuneCandidateId
)
{
    const metadata = sourceGeometry.userData.monumentalTrunk;
    if ( !metadata )
    {
        throw new Error( 'The filigree transducer requires monumental-trunk geometry.' );
    }
    const site = trunkRuneTransducerSite;
    const profile = getTrunkRuneCandidateProfile( candidateId );
    const spanIndex = getAuthoredSpanIndex( trunkNodes, site );
    if ( spanIndex < 0 )
    {
        throw new Error( `Trunk rune site '${site.id}' is not an authored trunk span.` );
    }
    const routeSegment = informationRoute?.byChildId.get( site.childId );
    if ( !routeSegment || routeSegment.parentId !== site.parentId )
    {
        throw new Error( `Trunk rune site '${site.id}' requires its authored transport span.` );
    }

    if ( candidateId === trunkRuneCandidateIds.internalArborescence )
    {
        return createInternalArborescenceGeometry(
            sourceGeometry,
            trunkNodes,
            informationRoute,
            interiorDescriptor,
            profile
        );
    }

    let authored;
    if ( candidateId === trunkRuneCandidateIds.evidence )
    {
        authored = createExteriorFiligreePath(
            sourceGeometry,
            spanIndex,
            routeSegment,
            site
        );
    }
    else if ( candidateId === trunkRuneCandidateIds.longitudinal )
    {
        authored = createCarrierSafeLongitudinalPlacementPath(
            sourceGeometry,
            spanIndex,
            routeSegment,
            site,
            interiorDescriptor,
            profile
        );
    }
    else
    {
        authored = createOpticalFibrePath(
            sourceGeometry,
            trunkNodes,
            informationRoute,
            site,
            profile
        );
    }
    const geometry = new THREE.TubeGeometry(
        authored.curve,
        profile.tubularSegments,
        profile.tubeRadius,
        profile.radialSegments,
        false
    );
    setSignalAttributes(
        geometry,
        null,
        profile.tubularSegments,
        profile.radialSegments
    );

    const pathLength = authored.curve.getLength();
    const transformationParameter = authored.transformationParameter
        ?? profile.transformationControlIndex / ( profile.controls.length - 1 );
    const transformationDistance = authored.transformationParameter === undefined
        ? curveDistanceAtParameter( authored.curve, transformationParameter )
        : pathLength * transformationParameter;
    const transformationPhase = transformationDistance / pathLength;
    const centres = [];
    let minimumShellClearance = Number.POSITIVE_INFINITY;
    let maximumShellClearance = Number.NEGATIVE_INFINITY;
    let maximumNormalisedRadius = 0;
    let buriedSampleCount = 0;
    let shellCrossingSampleCount = 0;
    let exteriorSampleCount = 0;
    let maximumExteriorProtrusion = 0;
    const shellExposureRuns = [];
    let activeExposureRun = null;
    const entryAxisPoint = routeSegment.curve.getPointAt(
        profile.entryLocalProgress
    );
    const exitAxisPoint = routeSegment.curve.getPointAt(
        profile.exitLocalProgress
    );
    const longitudinalAxis = exitAxisPoint.clone().sub( entryAxisPoint ).normalize();
    let minimumLongitudinalProjection = Number.POSITIVE_INFINITY;
    let maximumLongitudinalProjection = Number.NEGATIVE_INFINITY;
    const transverseOffsets = [];
    for ( let step = 0; step <= profile.tubularSegments; step += 1 )
    {
        const pathPhase = step / profile.tubularSegments;
        const centre = authored.curve.getPointAt( pathPhase );
        centres.push( centre );
        const parameter = authored.curve.getUtoTmapping( pathPhase );
        const shell = authored.sampleShellAtParameter
            ? authored.sampleShellAtParameter( parameter )
            : sampleConservativeShell(
                sourceGeometry,
                spanIndex,
                controlLocalProgressAtParameter( parameter, profile )
            );
        const offset = centre.distanceTo( shell.centre );
        const clearance = shell.maximumRadius - offset - profile.tubeRadius;
        minimumShellClearance = Math.min( minimumShellClearance, clearance );
        maximumShellClearance = Math.max( maximumShellClearance, clearance );
        maximumExteriorProtrusion = Math.max(
            maximumExteriorProtrusion,
            -clearance
        );
        maximumNormalisedRadius = Math.max(
            maximumNormalisedRadius,
            offset / Math.max( shell.maximumRadius, 1e-6 )
        );
        const exposed = clearance <= profile.tubeRadius;
        if ( !exposed ) buriedSampleCount += 1;
        else if ( offset - profile.tubeRadius > shell.maximumRadius )
        {
            exteriorSampleCount += 1;
        }
        else shellCrossingSampleCount += 1;
        const relative = centre.clone().sub( entryAxisPoint );
        const projection = relative.dot( longitudinalAxis );
        minimumLongitudinalProjection = Math.min(
            minimumLongitudinalProjection,
            projection
        );
        maximumLongitudinalProjection = Math.max(
            maximumLongitudinalProjection,
            projection
        );
        transverseOffsets.push(
            relative.addScaledVector( longitudinalAxis, -projection )
        );
        if ( exposed )
        {
            if ( activeExposureRun === null )
            {
                activeExposureRun = {
                    sampleStart: step,
                    sampleEnd: step,
                    minimumLongitudinalProjection: projection,
                    maximumLongitudinalProjection: projection
                };
                shellExposureRuns.push( activeExposureRun );
            }
            else
            {
                activeExposureRun.sampleEnd = step;
                activeExposureRun.minimumLongitudinalProjection = Math.min(
                    activeExposureRun.minimumLongitudinalProjection,
                    projection
                );
                activeExposureRun.maximumLongitudinalProjection = Math.max(
                    activeExposureRun.maximumLongitudinalProjection,
                    projection
                );
            }
        }
        else activeExposureRun = null;
    }
    let transverseCentrelineExtent = 0;
    for ( let left = 0; left < transverseOffsets.length; left += 1 )
    {
        for ( let right = left + 1; right < transverseOffsets.length; right += 1 )
        {
            transverseCentrelineExtent = Math.max(
                transverseCentrelineExtent,
                transverseOffsets[left].distanceTo( transverseOffsets[right] )
            );
        }
    }
    const longitudinalCentrelineExtent =
        maximumLongitudinalProjection - minimumLongitudinalProjection;
    const longitudinalExtent = longitudinalCentrelineExtent
        + profile.tubeRadius * 2;
    const transverseExtent = transverseCentrelineExtent
        + profile.tubeRadius * 2;
    const shellExposureBands = shellExposureRuns.map( ( run ) => Object.freeze( {
        ...run,
        sampleCount: run.sampleEnd - run.sampleStart + 1,
        longitudinalCentre: (
            run.minimumLongitudinalProjection
            + run.maximumLongitudinalProjection
        ) * 0.5
    } ) );
    const shellExposureLongitudinalSpread = shellExposureBands.length > 1
        ? Math.abs(
            shellExposureBands.at( -1 ).longitudinalCentre
            - shellExposureBands[0].longitudinalCentre
        )
        : 0;
    const minimumCarrierClearance = getCarrierClearance(
        centres,
        interiorDescriptor,
        profile.tubeRadius
    );
    const entryPoint = authored.curve.getPointAt( 0 );
    const exitPoint = authored.curve.getPointAt( 1 );
    const transformationPoint = authored.transformationParameter === undefined
        ? authored.curve.getPoint( transformationParameter )
        : authored.curve.getPointAt( transformationParameter );
    const isEvidence = candidateId === trunkRuneCandidateIds.evidence;
    const isOpticalFibre = candidateId === trunkRuneCandidateIds.opticalFibre;
    const controlPoints = new Float32Array(
        authored.controls.flatMap( ( point ) => point.toArray() )
    );
    const centrelinePoints = new Float32Array(
        centres.flatMap( ( point ) => point.toArray() )
    );
    geometry.userData.trunkRunes = {
        siteCount: 1,
        sites: trunkRuneSites,
        candidateId: profile.candidateId,
        reviewStatus: profile.reviewStatus,
        placementModel: profile.placementModel,
        spatialConvergenceClaim: false,
        transducerId: site.transducerId,
        parentId: site.parentId,
        childId: site.childId,
        spanIndex,
        artisticForm: isEvidence
            ? 'visible-three-dimensional-filigree-droplet'
            : isOpticalFibre
                ? 'single-exterior-optical-fibre-spiral'
                : 'longitudinal-volumetric-placement-study',
        inspiration: isOpticalFibre
            ? 'bounded-optical-fibre-alternative'
            : 'user-personal-1980s-gold-filigree-jewellery-memory',
        ethnicStyleClaim: false,
        literalCulturalMotif: false,
        visibleArtifact: true,
        persistentStructure: !isOpticalFibre,
        idleLuminosity: 0,
        functionalPath: true,
        internal3d: !isOpticalFibre,
        surfaceExcursion: true,
        shellRelationship: isOpticalFibre
            ? 'exterior-taper-following-spiral-with-buried-end-connectors'
            : 'woven-through-graphite-shell',
        connectedPath: true,
        inletCount: 1,
        outletCount: 1,
        branched: false,
        aggregation: false,
        routeEntryParentId: profile.routeEntryParentId ?? site.parentId,
        routeEntryChildId: profile.routeEntryChildId ?? site.childId,
        routeExitParentId: profile.routeExitParentId ?? site.parentId,
        routeExitChildId: profile.routeExitChildId ?? site.childId,
        coveredTrunkSpans: authored.coveredSpans ?? [ {
            parentId: site.parentId,
            childId: site.childId,
            spanIndex,
            fromLocalProgress: authored.entryLocalProgress,
            toLocalProgress: authored.exitLocalProgress
        } ],
        coveredTrunkSpanCount: authored.coveredSpans?.length ?? 1,
        spiralTurns: authored.spiralTurns ?? 0,
        taperFollowing: authored.taperFollowing ?? false,
        packetOnlyDisclosure: authored.packetOnlyDisclosure ?? false,
        colourTransition: authored.colourTransition
            ?? 'discrete-blue-to-gold-at-transformation',
        colourTransitionContinuous: isOpticalFibre,
        colourTransitionDirection: isOpticalFibre ? 'rootward' : null,
        transformationArtifact: !isOpticalFibre,
        pathLength,
        centreEntryDistance: 0,
        internalTransformationDistance: transformationDistance,
        centreResumeDistance: pathLength,
        centreEntryPhase: 0,
        internalTransformationPhase: transformationPhase,
        centreResumePhase: 1,
        entryLocalProgress: authored.entryLocalProgress,
        exitLocalProgress: authored.exitLocalProgress,
        bodyEntryLocalProgress: authored.bodyEntryLocalProgress,
        bodyExitLocalProgress: authored.bodyExitLocalProgress,
        bodyLongitudinalSpan: profile.bodyLongitudinalSpan,
        centreEntryPoint: entryPoint.toArray(),
        internalTransformationPoint: transformationPoint.toArray(),
        centreResumePoint: exitPoint.toArray(),
        controlPoints,
        centrelinePoints,
        controlPointCount: authored.controls.length,
        centreSampleCount: centres.length,
        tubularSegments: profile.tubularSegments,
        radialSegments: profile.radialSegments,
        tubeRadius: profile.tubeRadius,
        granuleRadius: isOpticalFibre ? 0 : profile.tubeRadius * (
            isEvidence ? 1.9 : 1.45
        ),
        corridorAngle: isEvidence
            ? corridorAngle
            : null,
        maximumNormalisedRadius,
        minimumPathToShellClearance: minimumShellClearance,
        maximumPathToShellClearance: maximumShellClearance,
        maximumExteriorProtrusion,
        shellExposureBandCount: shellExposureBands.length,
        shellExposureBands,
        shellExposureLongitudinalSpread,
        shellExposureLongitudinalSpreadRatio: longitudinalCentrelineExtent > 0
            ? shellExposureLongitudinalSpread / longitudinalCentrelineExtent
            : 0,
        longitudinalCentrelineExtent,
        transverseCentrelineExtent,
        longitudinalExtent,
        transverseExtent,
        longitudinalToTransverseRatio: transverseExtent > 0
            ? longitudinalExtent / transverseExtent
            : Number.POSITIVE_INFINITY,
        buriedSampleCount,
        shellCrossingSampleCount,
        exteriorSampleCount,
        straddlesShell: buriedSampleCount > 0
            && ( shellCrossingSampleCount > 0 || exteriorSampleCount > 0 ),
        minimumPathToCarrierClearance: minimumCarrierClearance,
        checkedCarrierCount: interiorDescriptor?.carriers?.length ?? 0,
        insideOpaqueShell: false,
        carrierCollisionFree: minimumCarrierClearance === null
            || minimumCarrierClearance > 0,
        pathFrame: {
            tangent: authored.tangent.toArray(),
            outward: authored.outward?.toArray() ?? null,
            carrierSafeOutward: authored.safeOutward?.toArray() ?? null,
            lateral: authored.lateral?.toArray() ?? null,
            transportedTangents: authored.transportedTangents ?? null,
            phaseOffsetTurns: authored.phaseOffsetTurns ?? 0,
            phaseSelection: authored.phaseSelectionClearance === undefined
                ? null
                : 'structure-corridor-with-c1-clearance',
            phaseSelectionClearance: authored.phaseSelectionClearance ?? null,
            phaseSelectionRequiredClearance:
                authored.phaseSelectionRequiredClearance ?? null,
            phasePresentationAlignment:
                authored.phasePresentationAlignment ?? null,
            phaseSelectionFallback:
                authored.phaseSelectionFallback ?? false,
            phaseCandidateCount: authored.phaseCandidateCount ?? null,
            eligiblePhaseCandidateCount:
                authored.eligiblePhaseCandidateCount ?? null,
            maximumPresentationAlignment:
                authored.maximumPresentationAlignment ?? null,
            maximumPresentationAlignmentPhase:
                authored.maximumPresentationAlignmentPhase ?? null,
            maximumPresentationAlignmentClearance:
                authored.maximumPresentationAlignmentClearance ?? null,
            model: authored.frameModel ?? 'fixed-object-space-corridor',
            preferredFront: authored.preferredFront ?? true,
            cameraIndependent: true
        },
        rendering: isOpticalFibre
            ? 'ordinary-depth-causal-optical-fibre'
            : 'ordinary-depth-metallic-filigree',
        motionModel: 'shared-tree-deformation',
        renderContract: {
            activation: 'genuine-traversal-only',
            mainSceneMeshVisible: true,
            persistentGoldStructure: !isOpticalFibre,
            ...( isOpticalFibre ? {
                packetOnlyDisclosure: true,
                mostlyInvisibleAtIdle: true,
                gradualRootwardColour: true,
                multiSpanPath: true,
                transformationGranule: false
            } : {} ),
            idleLuminosity: 0,
            activeExtraPassCount: 0,
            ordinaryDepthOnly: true,
            greaterDepth: false,
            cameraFacing: false,
            aperture: false,
            c1InventoryVisible: false,
            bloomRequired: false
        },
        idlePassCount: 1,
        activeOverlayDrawCalls: 0,
        meshCount: 1,
        maximumDrawCalls: 1,
        tubeVertexCount: geometry.getAttribute( 'position' ).count,
        tubeTriangleCount: geometry.index.count / 3,
        vertexCount: geometry.getAttribute( 'position' ).count,
        triangleCount: geometry.index.count / 3,
        objectSpace: true,
        cameraFacing: false,
        sourceGeometryUuid: sourceGeometry.uuid
    };
    return geometry;
}

export function createTrunkRuneGranuleGeometry( runeGeometry )
{
    const metadata = runeGeometry.userData.trunkRunes;
    if ( metadata.transformationArtifact === false ) return null;
    const granule = new THREE.SphereGeometry( metadata.granuleRadius, 14, 10 );
    granule.translate( ...metadata.internalTransformationPoint );
    setSignalAttributes( granule, metadata.internalTransformationPhase );
    granule.userData.trunkRuneGranule = {
        transducerId: metadata.transducerId,
        pathPhase: metadata.internalTransformationPhase,
        transformationPoint: metadata.internalTransformationPoint.slice(),
        persistentGoldStructure: true,
        idleLuminosity: 0
    };
    metadata.granuleVertexCount = granule.getAttribute( 'position' ).count;
    metadata.granuleTriangleCount = granule.index.count / 3;
    metadata.vertexCount = metadata.tubeVertexCount + metadata.granuleVertexCount;
    metadata.triangleCount = metadata.tubeTriangleCount + metadata.granuleTriangleCount;
    metadata.meshCount = 2;
    metadata.maximumDrawCalls = 2;
    return granule;
}

export function setTrunkRuneGeometryTraversals( geometry, traversals )
{
    const phase = geometry.getAttribute( 'runePhase' );
    const signal = geometry.getAttribute( 'runeSignal' );
    const warmth = geometry.getAttribute( 'runeWarmth' );
    const owner = geometry.getAttribute( 'runeOwner' );
    const continuousRootwardColour = geometry.userData.trunkRunes
        ?.colourTransitionContinuous === true;
    let changed = false;
    const updateRange = ( start, count, candidates ) => {
        const end = Math.min( phase.count, start + count );
        for ( let index = start; index < end; index += 1 )
        {
            const pathPhase = phase.getX( index );
            let strongestSignal = 0;
            let strongestWarmth = 0;
            for ( const traversal of candidates )
            {
                const progress = THREE.MathUtils.clamp(
                    traversal.progress ?? 0,
                    0,
                    1
                );
                const headDelta = ( pathPhase - progress )
                    / runeSignalHeadWidth;
                const head = Math.exp( -headDelta * headDelta );
                const trailDistance = progress - pathPhase;
                const trail = trailDistance >= 0
                    ? ( 1 - THREE.MathUtils.smoothstep(
                        trailDistance,
                        0,
                        runeSignalTailLength
                    ) ) * Math.exp( -trailDistance * 4.6 )
                    : 0;
                const candidate = THREE.MathUtils.clamp(
                    head + trail * 0.44,
                    0,
                    1
                );
                if ( candidate <= strongestSignal ) continue;
                strongestSignal = candidate;
                if ( continuousRootwardColour )
                {
                    strongestWarmth = pathPhase * pathPhase
                        * ( 3 - 2 * pathPhase );
                }
                else
                {
                    strongestWarmth = traversal.transformed === true
                        && pathPhase + 1e-6
                            >= ( traversal.transformationPhase ?? 1 )
                        ? 1
                        : 0;
                }
            }
            if ( signal.getX( index ) !== strongestSignal )
            {
                signal.setX( index, strongestSignal );
                changed = true;
            }
            if ( warmth.getX( index ) !== strongestWarmth )
            {
                warmth.setX( index, strongestWarmth );
                changed = true;
            }
        }
    };
    const pathRanges = geometry.userData.trunkRunes?.pathRanges;
    if ( owner && pathRanges?.length )
    {
        const traversalsByPath = new Map();
        for ( const traversal of traversals )
        {
            const pathIndex = traversal.pathIndex;
            if ( pathIndex === undefined ) continue;
            const candidates = traversalsByPath.get( pathIndex ) ?? [];
            candidates.push( traversal );
            traversalsByPath.set( pathIndex, candidates );
        }
        for ( const range of pathRanges )
        {
            updateRange(
                range.vertexStart,
                range.vertexCount,
                traversalsByPath.get( range.pathIndex ) ?? []
            );
        }
    }
    else updateRange( 0, phase.count, traversals );
    if ( changed )
    {
        signal.needsUpdate = true;
        warmth.needsUpdate = true;
    }
    return changed;
}

export function setTrunkRuneGeometryLives( geometry, siteLives )
{
    const progress = siteLives?.[0] ?? 0;
    return setTrunkRuneGeometryTraversals(
        geometry,
        progress > 0 ? [ { progress } ] : []
    );
}

export function createTrunkRuneMaterial(
    deformationUniforms = {},
    candidateId = defaultTrunkRuneCandidateId
)
{
    const isOpticalFibre = candidateId === trunkRuneCandidateIds.opticalFibre;
    const isInternalArborescence = candidateId
        === trunkRuneCandidateIds.internalArborescence;
    const usesContinuousColour = isOpticalFibre || isInternalArborescence;
    const uniforms = {
        time: deformationUniforms.time ?? { value: 0 },
        response: deformationUniforms.response ?? { value: 0.22 },
        gustMix: deformationUniforms.gustMix ?? { value: 0 },
        intervalBase: deformationUniforms.intervalBase ?? { value: 0 },
        sourceColour: {
            value: new THREE.Color( 0x249cff ).multiplyScalar(
                usesContinuousColour ? 3.15 : 2.25
            )
        },
        outputColour: {
            value: new THREE.Color(
                informationPalette.networkGold
            ).multiplyScalar(
                usesContinuousColour ? 1.15 : 1.05
            )
        }
    };
    const material = new THREE.MeshPhysicalMaterial( {
        color: usesContinuousColour ? 0x0b0e10 : 0xc89232,
        emissive: 0x000000,
        metalness: usesContinuousColour ? 0.42 : 0.96,
        roughness: usesContinuousColour ? 0.58 : 0.27,
        clearcoat: usesContinuousColour ? 0.06 : 0.28,
        clearcoatRoughness: usesContinuousColour ? 0.62 : 0.34,
        depthTest: true,
        depthFunc: THREE.LessEqualDepth,
        depthWrite: true,
        side: THREE.FrontSide,
        toneMapped: true
    } );
    material.onBeforeCompile = ( shader ) => {
        shader.uniforms.treeTime = uniforms.time;
        shader.uniforms.treeResponse = uniforms.response;
        shader.uniforms.treeGustMix = uniforms.gustMix;
        shader.uniforms.treeGustIntervalBase = uniforms.intervalBase;
        shader.uniforms.runeSourceColour = uniforms.sourceColour;
        shader.uniforms.runeOutputColour = uniforms.outputColour;
        shader.vertexShader = shader.vertexShader.replace(
            '#include <common>',
            `#include <common>
            ${rootedMotionShaderDeclarations}
            attribute float runeSignal;
            attribute float runeWarmth;
            varying float filigreeSignal;
            varying float filigreeWarmth;`
        ).replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
            filigreeSignal = runeSignal;
            filigreeWarmth = runeWarmth;
            ${rootedMotionShaderApplication( 'position' )}`
        );
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `#include <common>
            uniform vec3 runeSourceColour;
            uniform vec3 runeOutputColour;
            varying float filigreeSignal;
            varying float filigreeWarmth;`
        ).replace(
            '#include <emissivemap_fragment>',
            `#include <emissivemap_fragment>
            float causalSignal = pow( clamp( filigreeSignal, 0.0, 1.0 ), 0.78 );
            vec3 causalColour = mix(
                runeSourceColour,
                runeOutputColour,
                clamp( filigreeWarmth, 0.0, 1.0 )
            );
            totalEmissiveRadiance += causalColour * causalSignal;`
        );
        material.userData.shader = shader;
    };
    material.customProgramCacheKey = () => isInternalArborescence
        ? 'causal-internal-arborescence-c4c-rooted-motion-v4'
        : isOpticalFibre
            ? 'causal-exterior-optical-fibre-c4b-rooted-motion-v4'
            : 'visible-filigree-transducer-c4a-rooted-motion-v4';
    material.name = isInternalArborescence
        ? 'renderer-owned internal information arborescence'
        : isOpticalFibre
            ? 'packet-lit exterior optical fibre'
            : 'visible functional gold filigree transducer';
    material.userData.rendererOwned = isInternalArborescence;
    material.userData.depthMode = 'ordinary-less-equal';
    material.userData.idleLuminosity = 0;
    material.userData.candidateId = candidateId;
    material.userData.causalSignal = usesContinuousColour
        ? 'per-packet-max-clamped-continuous-blue-to-cosmos-gold'
        : 'per-packet-max-clamped-blue-to-gold';
    material.userData.packetOnlyDisclosure = usesContinuousColour;
    material.userData.mostlyInvisibleAtIdle = usesContinuousColour;
    material.userData.colourTransitionContinuous = usesContinuousColour;
    material.userData.colourTransitionDirection = usesContinuousColour
        ? 'rootward'
        : null;
    material.userData.motionModel = 'shared-tree-deformation';
    registerRootedMotionMaterial(
        material,
        uniforms,
        isInternalArborescence
            ? 'internal-information-arborescence'
            : isOpticalFibre
                ? 'exterior-optical-fibre'
                : 'functional-rune-transducer'
    );
    material.userData.inspiration = isInternalArborescence
        ? 'root-system-within-monumental-graphite'
        : isOpticalFibre
            ? 'bounded-optical-fibre-alternative'
            : 'user-personal-1980s-gold-filigree-jewellery-memory';
    return material;
}

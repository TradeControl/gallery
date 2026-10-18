import * as THREE from 'three';

export const internalRouterJunctionCandidateId =
    'c4d-d2-router-junction-v1';
export const internalRouterJunctionTransducerId = 'meaning-transducer';
export const internalRouterJunctionAuditCapacity = 4096;

const coordinateTolerance = 2e-6;

function immutablePoint( value )
{
    return Object.freeze( Array.from( value, Number ) );
}

function appendBoundedRecord( records, record, capacity )
{
    records.push( record );
    if ( records.length > capacity )
    {
        records.splice( 0, Math.min( 512, records.length ) );
    }
}

export function resolveInternalRouterJunctionBoundary( route, descriptor )
{
    if ( !route?.byChildId || !descriptor?.seedSite || !descriptor?.seedPoint )
    {
        throw new Error( 'The internal router junction requires a route and D1 descriptor.' );
    }
    const site = descriptor.seedSite;
    const segment = route.byChildId.get( site.childId );
    if ( !segment || segment.parentId !== site.parentId )
    {
        throw new Error(
            `Route '${route.terminalId ?? 'unknown'}' does not cross the D1 seed span.`
        );
    }

    const localProgress = site.localProgress;
    const routePoint = segment.curve.getPointAt( localProgress );
    const routerRootPoint = new THREE.Vector3().fromArray(
        descriptor.seedPoint
    );
    const coordinateSeparation = routePoint.distanceTo( routerRootPoint );
    if ( coordinateSeparation > coordinateTolerance )
    {
        throw new Error(
            `Route '${route.terminalId}' misses the D1 seed by ${coordinateSeparation}.`
        );
    }
    const routerRoot = descriptor.nodes.find( ( node ) =>
        node.parentId === null
    );
    if ( !routerRoot )
    {
        throw new Error( 'The D1 descriptor has no router root.' );
    }

    return Object.freeze( {
        siteId: site.id,
        parentId: site.parentId,
        childId: site.childId,
        localProgress,
        routeDistance: THREE.MathUtils.lerp(
            segment.parentDistance,
            segment.childDistance,
            localProgress
        ),
        routePoint: immutablePoint( routePoint.toArray() ),
        routerRootPoint: immutablePoint( routerRootPoint.toArray() ),
        routerRootNodeId: routerRoot.id,
        coordinateSeparation,
        coordinateContinuous: coordinateSeparation <= coordinateTolerance
    } );
}

export function createInternalRouterJunctionLedger( {
    capacity = internalRouterJunctionAuditCapacity
} = {} )
{
    if ( !Number.isInteger( capacity ) || capacity < 1 )
    {
        throw new Error( 'The internal router junction audit capacity must be positive.' );
    }

    const entryRecords = [];
    const transductionRecords = [];
    const parkedOutputs = [];
    let entryCount = 0;
    let consumptionCount = 0;
    let outputCount = 0;
    let maximumCoordinateSeparation = 0;

    function consume( packet, boundary, occurredAt )
    {
        if ( packet?.kind !== 'source' || packet.signalClass !== 'source' )
        {
            throw new Error( 'Only one cyan source packet may enter the D2 junction.' );
        }
        if ( !boundary?.coordinateContinuous )
        {
            throw new Error( `Source packet '${packet.id}' has no continuous D2 boundary.` );
        }
        if ( !Number.isFinite( occurredAt ) )
        {
            throw new Error( `Source packet '${packet.id}' has no finite D2 event time.` );
        }
        if ( transductionRecords.some( ( record ) =>
            record.sourcePacketId === packet.id ) )
        {
            throw new Error( `Source packet '${packet.id}' entered the D2 junction twice.` );
        }

        const routeNodeIds = Object.freeze( packet.route.nodeIds.slice() );
        const boundaryPoint = boundary.routerRootPoint;
        const outputPacketId = `${packet.id}`
            + `::${internalRouterJunctionTransducerId}::output`;
        const entry = Object.freeze( {
            id: `${packet.id}::${boundary.siteId}::router-entry`,
            recordType: 'router-entry',
            candidateId: internalRouterJunctionCandidateId,
            transducerId: internalRouterJunctionTransducerId,
            siteId: boundary.siteId,
            sourcePacketId: packet.id,
            terminalId: packet.terminalId,
            sourceEmittedAt: packet.emittedAt,
            routeNodeIds,
            boundaryDistance: boundary.routeDistance,
            boundaryLocalProgress: boundary.localProgress,
            boundaryPoint,
            routerRootNodeId: boundary.routerRootNodeId,
            enteredAt: occurredAt,
            coordinateSeparation: boundary.coordinateSeparation,
            coordinateContinuous: true,
            semanticClaim: 'transduction',
            mode: 'one-to-one',
            aggregation: false,
            sourcePacketCount: 1
        } );
        const provenanceEntry = Object.freeze( {
            sourcePacketId: packet.id,
            sourceTerminalId: packet.terminalId,
            sourceEmittedAt: packet.emittedAt,
            routeNodeIds,
            candidateId: internalRouterJunctionCandidateId,
            transducerId: internalRouterJunctionTransducerId,
            siteId: boundary.siteId,
            enteredAt: occurredAt,
            consumedAt: occurredAt,
            boundaryDistance: boundary.routeDistance,
            boundaryLocalProgress: boundary.localProgress,
            boundaryPoint,
            routerRootNodeId: boundary.routerRootNodeId
        } );
        const provenance = Object.freeze( [ provenanceEntry ] );
        const transduction = Object.freeze( {
            id: `${packet.id}`
                + `::${internalRouterJunctionTransducerId}::transduction`,
            recordType: 'router-junction-transduction',
            candidateId: internalRouterJunctionCandidateId,
            transducerId: internalRouterJunctionTransducerId,
            siteId: boundary.siteId,
            sourcePacketId: packet.id,
            outputPacketId,
            terminalId: packet.terminalId,
            sourceEmittedAt: packet.emittedAt,
            routeNodeIds,
            enteredAt: occurredAt,
            consumedAt: occurredAt,
            outputAt: occurredAt,
            boundaryDistance: boundary.routeDistance,
            boundaryLocalProgress: boundary.localProgress,
            boundaryPoint,
            routerRootNodeId: boundary.routerRootNodeId,
            coordinateSeparation: boundary.coordinateSeparation,
            coordinateContinuous: true,
            routeAssignment: null,
            provenance,
            provenanceCardinality: 1,
            sourcePacketCount: 1,
            outputPacketCount: 1,
            semanticClaim: 'transduction',
            mode: 'one-to-one',
            aggregation: false
        } );
        const output = Object.freeze( {
            id: outputPacketId,
            kind: 'transduced-output',
            signalClass: 'output',
            state: 'parked-at-router-root',
            candidateId: internalRouterJunctionCandidateId,
            transducerId: internalRouterJunctionTransducerId,
            siteId: boundary.siteId,
            sourcePacketId: packet.id,
            terminalId: packet.terminalId,
            sourceEmittedAt: packet.emittedAt,
            transformedAt: occurredAt,
            parkedAt: occurredAt,
            routerRootNodeId: boundary.routerRootNodeId,
            position: boundaryPoint,
            routeAssignment: null,
            provenance
        } );

        entryCount += 1;
        consumptionCount += 1;
        outputCount += 1;
        maximumCoordinateSeparation = Math.max(
            maximumCoordinateSeparation,
            boundary.coordinateSeparation
        );
        appendBoundedRecord( entryRecords, entry, capacity );
        appendBoundedRecord( transductionRecords, transduction, capacity );
        appendBoundedRecord( parkedOutputs, output, capacity );
        return Object.freeze( { entry, transduction, output } );
    }

    function reset()
    {
        entryRecords.length = 0;
        transductionRecords.length = 0;
        parkedOutputs.length = 0;
        entryCount = 0;
        consumptionCount = 0;
        outputCount = 0;
        maximumCoordinateSeparation = 0;
    }

    function snapshot()
    {
        const retainedSourceIdsUnique = new Set(
            transductionRecords.map( ( record ) => record.sourcePacketId )
        ).size === transductionRecords.length;
        const retainedOutputIdsUnique = new Set(
            transductionRecords.map( ( record ) => record.outputPacketId )
        ).size === transductionRecords.length;
        return {
            entryCount,
            consumptionCount,
            outputCount,
            parkedOutputCount: outputCount,
            entryRecords,
            transductionRecords,
            parkedOutputs,
            retainedEntryRecordCount: entryRecords.length,
            retainedTransductionRecordCount: transductionRecords.length,
            retainedParkedOutputCount: parkedOutputs.length,
            auditCapacity: capacity,
            auditTruncated: outputCount > parkedOutputs.length,
            maximumCoordinateSeparation,
            conservation: Object.freeze( {
                entered: entryCount,
                consumed: consumptionCount,
                produced: outputCount,
                parked: outputCount,
                sourceBalance: entryCount - consumptionCount,
                outputBalance: outputCount - outputCount,
                retainedSourceIdsUnique,
                retainedOutputIdsUnique
            } )
        };
    }

    return Object.freeze( { consume, reset, snapshot } );
}

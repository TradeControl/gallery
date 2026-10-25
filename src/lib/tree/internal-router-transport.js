export const internalRouterTransportCandidateId =
    'c4d-d3-independent-router-transport-v1';
export const internalRouterTransportAuditCapacity = 4096;
const transportEventEpsilon = 1e-7;

export function createInternalRouterRouteEpoch( descriptor )
{
    if ( typeof descriptor?.candidateId !== 'string'
        || !Number.isInteger( descriptor?.maximumTier ) )
    {
        throw new Error( 'D3 route epochs require a valid D1 descriptor.' );
    }
    return `${descriptor.candidateId}:${descriptor.maximumTier}`;
}

function canonicalNumber( value )
{
    return Number( Number( value ).toFixed( 8 ) );
}

function immutableArray( values )
{
    return Object.freeze( Array.from( values ) );
}

function appendBoundedRecord( records, record, capacity )
{
    records.push( record );
    if ( records.length > capacity )
    {
        records.splice( 0, Math.min( 512, records.length ) );
    }
}

function stableHash( value )
{
    let hash = 2166136261;
    for ( const character of String( value ) )
    {
        hash ^= character.codePointAt( 0 );
        hash = Math.imul( hash, 16777619 );
    }
    return hash >>> 0;
}

export function selectInternalRouterRoute( outputPacketId, descriptor )
{
    if ( typeof outputPacketId !== 'string' || outputPacketId.length === 0 )
    {
        throw new Error( 'D3 route selection requires an output packet identity.' );
    }
    if ( !Array.isArray( descriptor?.terminalRoutes )
        || descriptor.terminalRoutes.length === 0 )
    {
        throw new Error( 'D3 route selection requires a D1 terminal-route descriptor.' );
    }
    return descriptor.terminalRoutes[
        stableHash( outputPacketId ) % descriptor.terminalRoutes.length
    ];
}

function createRouteContract( outputPacketId, descriptor, resourceRevision )
{
    const route = selectInternalRouterRoute( outputPacketId, descriptor );
    const edgeById = new Map( descriptor.edges.map( ( edge ) => [ edge.id, edge ] ) );
    let cursor = 0;
    const segments = route.edgeIds.map( ( edgeId ) => {
        const edge = edgeById.get( edgeId );
        if ( !edge?.curve || !Number.isFinite( edge.pathLength )
            || edge.pathLength <= 0 )
        {
            throw new Error( `D3 route '${route.terminalNodeId}' has an invalid edge '${edgeId}'.` );
        }
        const startDistance = cursor;
        cursor += edge.pathLength;
        return {
            edgeId,
            parentId: edge.parentId,
            childId: edge.childId,
            tier: edge.tier,
            startDistance,
            endDistance: cursor,
            pathLength: edge.pathLength,
            curve: edge.curve
        };
    } );
    if ( Math.abs( cursor - route.totalLength ) > 2e-6 )
    {
        throw new Error( `D3 route '${route.terminalNodeId}' length is inconsistent.` );
    }
    // Tier geometry is deterministic within a Tree build. Reusing this stable
    // epoch when a reviewer returns to a tier prevents diagnostic bookkeeping
    // from growing merely because the slider was moved away and back again.
    const routeEpoch = createInternalRouterRouteEpoch( descriptor );
    const assignment = Object.freeze( {
        id: `${descriptor.candidateId}::${routeEpoch}`
            + `::route-${route.routeIndex}::${route.terminalNodeId}`,
        routerCandidateId: descriptor.candidateId,
        routeEpoch,
        resourceRevision: resourceRevision ?? null,
        maximumTier: descriptor.maximumTier,
        routeIndex: route.routeIndex,
        terminalNodeId: route.terminalNodeId,
        nodeIds: immutableArray( route.nodeIds ),
        edgeIds: immutableArray( route.edgeIds ),
        totalLength: route.totalLength
    } );
    return { assignment, segments };
}

function sampleRoutePoint( traversal, distance )
{
    const clamped = Math.max(
        0,
        Math.min( traversal.routeAssignment.totalLength, distance )
    );
    const segment = traversal.routeSegments.find( ( candidate ) =>
        clamped <= candidate.endDistance + 1e-9
    ) ?? traversal.routeSegments.at( -1 );
    const localDistance = clamped - segment.startDistance;
    const progress = segment.pathLength > 0
        ? Math.max( 0, Math.min( 1, localDistance / segment.pathLength ) )
        : 0;
    return segment.curve.getPointAt( progress );
}

function sampleActivePacketTrails(
    activeTraversals,
    {
        trailLength,
        maximumSegmentLength
    }
)
{
    if ( !Number.isFinite( trailLength ) || trailLength <= 0
        || !Number.isFinite( maximumSegmentLength )
        || maximumSegmentLength <= 0 )
    {
        throw new Error(
            'D4 trail sampling requires positive finite length values.'
        );
    }
    return Object.freeze( activeTraversals.map( ( traversal ) => {
        const headDistance = traversal.headDistance;
        const startDistance = Math.max( 0, headDistance - trailLength );
        const visibleLength = headDistance - startDistance;
        const segmentCount = visibleLength > 0
            ? Math.max( 1, Math.ceil(
                visibleLength / maximumSegmentLength
            ) )
            : 0;
        const samples = [];
        for ( let index = 0; index <= segmentCount; index += 1 )
        {
            const distance = segmentCount > 0
                ? ( index === segmentCount
                    ? headDistance
                    : startDistance + visibleLength * index / segmentCount )
                : headDistance;
            const point = sampleRoutePoint( traversal, distance );
            samples.push( Object.freeze( {
                distance,
                position: Object.freeze( point.toArray() )
            } ) );
        }
        return Object.freeze( {
            id: traversal.outputPacketId,
            outputPacketId: traversal.outputPacketId,
            sourcePacketId: traversal.sourcePacketId,
            routeAssignment: traversal.routeAssignment,
            headDistance,
            startDistance,
            segmentCount,
            samples: Object.freeze( samples )
        } );
    } ) );
}

export function createInternalRouterTransport( {
    capacity = internalRouterTransportAuditCapacity
} = {} )
{
    if ( !Number.isInteger( capacity ) || capacity < 1 )
    {
        throw new Error( 'The D3 transport audit capacity must be positive.' );
    }

    let activeTraversals = [];
    const dispatchedIds = new Set();
    const dispatchedIdOrder = [];
    let dispatchedOutputs = new WeakSet();
    const dispatchRecords = [];
    const completionRecords = [];
    let dispatchCount = 0;
    let completionCount = 0;
    let maximumConcurrentPacketCount = 0;

    function dispatch( output, descriptor, occurredAt, packetSpeed, resourceRevision = null )
    {
        if ( output?.kind !== 'transduced-output'
            || output.signalClass !== 'output'
            || output.state !== 'parked-at-router-root' )
        {
            throw new Error( 'D3 may dispatch only a D2 gold output created at the router root.' );
        }
        if ( output.routeAssignment !== null )
        {
            throw new Error( `D3 output '${output.id}' already owns a route assignment.` );
        }
        if ( dispatchedOutputs.has( output ) || dispatchedIds.has( output.id ) )
        {
            throw new Error( `D3 output '${output.id}' was dispatched twice.` );
        }
        if ( !Number.isFinite( occurredAt ) || !Number.isFinite( packetSpeed )
            || packetSpeed <= 0 )
        {
            throw new Error( `D3 output '${output.id}' has invalid motion data.` );
        }

        const route = createRouteContract(
            output.id,
            descriptor,
            resourceRevision
        );
        const dispatchedAt = canonicalNumber( occurredAt );
        const record = Object.freeze( {
            id: `${output.id}::d3-dispatch`,
            recordType: 'internal-router-dispatch',
            candidateId: internalRouterTransportCandidateId,
            outputPacketId: output.id,
            sourcePacketId: output.sourcePacketId,
            sourceTerminalId: output.terminalId,
            sourceEmittedAt: output.sourceEmittedAt,
            transformedAt: output.transformedAt,
            dispatchedAt,
            routeAssignment: route.assignment,
            provenance: output.provenance,
            provenanceCardinality: output.provenance.length,
            outputPacketCount: 1,
            mode: 'one-route-per-output',
            semanticClaim: 'transport',
            aggregation: false
        } );
        activeTraversals.push( {
            id: output.id,
            outputPacketId: output.id,
            sourcePacketId: output.sourcePacketId,
            sourceTerminalId: output.terminalId,
            sourceEmittedAt: output.sourceEmittedAt,
            transformedAt: output.transformedAt,
            dispatchedAt,
            routeAssignment: route.assignment,
            routeSegments: route.segments,
            provenance: output.provenance,
            headDistance: 0,
            motionAnchorTime: dispatchedAt,
            motionAnchorDistance: 0,
            motionSpeed: packetSpeed
        } );
        dispatchedOutputs.add( output );
        dispatchedIds.add( output.id );
        dispatchedIdOrder.push( output.id );
        if ( dispatchedIdOrder.length > capacity )
        {
            dispatchedIds.delete( dispatchedIdOrder.shift() );
        }
        dispatchCount += 1;
        appendBoundedRecord( dispatchRecords, record, capacity );
        return record;
    }

    function advance( intervalStart, intervalEnd, packetSpeed )
    {
        if ( !Number.isFinite( intervalStart ) || !Number.isFinite( intervalEnd )
            || intervalEnd + 1e-9 < intervalStart
            || !Number.isFinite( packetSpeed ) || packetSpeed <= 0 )
        {
            throw new Error( 'D3 transport advance requires a valid interval and speed.' );
        }
        const retained = [];
        const concurrencyEvents = [];
        let concurrentAtStart = 0;
        for ( const traversal of activeTraversals )
        {
            if ( traversal.motionSpeed !== packetSpeed )
            {
                const anchorTime = Math.max(
                    intervalStart,
                    traversal.dispatchedAt
                );
                const anchorDistance = Math.min(
                    traversal.routeAssignment.totalLength,
                    traversal.motionAnchorDistance
                        + Math.max( 0, anchorTime - traversal.motionAnchorTime )
                            * traversal.motionSpeed
                );
                traversal.motionAnchorTime = anchorTime;
                traversal.motionAnchorDistance = anchorDistance;
                traversal.motionSpeed = packetSpeed;
            }
            const completedAt = traversal.motionAnchorTime
                + ( traversal.routeAssignment.totalLength
                    - traversal.motionAnchorDistance )
                    / traversal.motionSpeed;
            if ( traversal.dispatchedAt <= intervalStart + transportEventEpsilon
                && completedAt > intervalStart + transportEventEpsilon )
            {
                concurrentAtStart += 1;
            }
            else if ( traversal.dispatchedAt > intervalStart + transportEventEpsilon
                && traversal.dispatchedAt <= intervalEnd + transportEventEpsilon )
            {
                concurrencyEvents.push( {
                    occurredAt: traversal.dispatchedAt,
                    delta: 1
                } );
            }
            if ( completedAt > intervalStart + transportEventEpsilon
                && completedAt <= intervalEnd + transportEventEpsilon )
            {
                concurrencyEvents.push( { occurredAt: completedAt, delta: -1 } );
            }

            const nextDistance = traversal.motionAnchorDistance
                + Math.max( 0, intervalEnd - traversal.motionAnchorTime )
                    * traversal.motionSpeed;
            if ( completedAt > intervalEnd + transportEventEpsilon )
            {
                traversal.headDistance = Math.min(
                    traversal.routeAssignment.totalLength,
                    nextDistance
                );
                retained.push( traversal );
                continue;
            }

            const canonicalCompletedAt = canonicalNumber( completedAt );
            const completion = Object.freeze( {
                id: `${traversal.outputPacketId}::d3-completion`,
                recordType: 'internal-router-completion',
                candidateId: internalRouterTransportCandidateId,
                outputPacketId: traversal.outputPacketId,
                sourcePacketId: traversal.sourcePacketId,
                sourceTerminalId: traversal.sourceTerminalId,
                sourceEmittedAt: traversal.sourceEmittedAt,
                transformedAt: traversal.transformedAt,
                dispatchedAt: traversal.dispatchedAt,
                completedAt: canonicalCompletedAt,
                routeAssignment: traversal.routeAssignment,
                provenance: traversal.provenance,
                provenanceCardinality: traversal.provenance.length,
                distanceTravelled: traversal.routeAssignment.totalLength,
                outputPacketCount: 1,
                mode: 'one-route-per-output',
                semanticClaim: 'transport',
                aggregation: false
            } );
            completionCount += 1;
            appendBoundedRecord( completionRecords, completion, capacity );
        }
        activeTraversals = retained;

        concurrencyEvents.sort( ( left, right ) =>
            left.occurredAt - right.occurredAt
        );
        let concurrent = concurrentAtStart;
        maximumConcurrentPacketCount = Math.max(
            maximumConcurrentPacketCount,
            concurrent
        );
        for ( let index = 0; index < concurrencyEvents.length; )
        {
            const occurredAt = concurrencyEvents[index].occurredAt;
            let delta = 0;
            while ( index < concurrencyEvents.length
                && Math.abs( concurrencyEvents[index].occurredAt - occurredAt )
                    <= transportEventEpsilon )
            {
                delta += concurrencyEvents[index].delta;
                index += 1;
            }
            concurrent += delta;
            maximumConcurrentPacketCount = Math.max(
                maximumConcurrentPacketCount,
                concurrent
            );
        }
        if ( concurrent !== retained.length )
        {
            throw new Error(
                'D3 analytic concurrency sweep lost packet conservation: '
                + `${concurrent} settled versus ${retained.length} retained `
                + `for ${intervalStart}..${intervalEnd}.`
            );
        }
    }

    function reset()
    {
        activeTraversals = [];
        dispatchedIds.clear();
        dispatchedIdOrder.length = 0;
        dispatchedOutputs = new WeakSet();
        dispatchRecords.length = 0;
        completionRecords.length = 0;
        dispatchCount = 0;
        completionCount = 0;
        maximumConcurrentPacketCount = 0;
    }

    function snapshot()
    {
        const activePackets = activeTraversals.map( ( traversal ) => {
            const point = sampleRoutePoint(
                traversal,
                traversal.headDistance
            );
            return Object.freeze( {
                id: traversal.outputPacketId,
                outputPacketId: traversal.outputPacketId,
                sourcePacketId: traversal.sourcePacketId,
                sourceTerminalId: traversal.sourceTerminalId,
                sourceEmittedAt: traversal.sourceEmittedAt,
                transformedAt: traversal.transformedAt,
                dispatchedAt: traversal.dispatchedAt,
                state: 'travelling-internal-router',
                signalClass: 'output',
                routeAssignment: traversal.routeAssignment,
                provenance: traversal.provenance,
                headDistance: traversal.headDistance,
                routeProgress: traversal.routeAssignment.totalLength > 0
                    ? traversal.headDistance
                        / traversal.routeAssignment.totalLength
                    : 1,
                position: Object.freeze( point.toArray() )
            } );
        } );
        const activePacketCount = activePackets.length;
        const routeCountLookup = new Map();
        for ( const record of dispatchRecords )
        {
            const assignment = record.routeAssignment;
            const retained = routeCountLookup.get( assignment.id );
            routeCountLookup.set( assignment.id, retained
                ? { ...retained, count: retained.count + 1 }
                : {
                    routeId: assignment.id,
                    routeEpoch: assignment.routeEpoch,
                    maximumTier: assignment.maximumTier,
                    routeIndex: assignment.routeIndex,
                    terminalNodeId: assignment.terminalNodeId,
                    count: 1
                } );
        }
        const routeCounts = Array.from( routeCountLookup.values() )
            .map( ( entry ) => Object.freeze( entry ) )
            .sort( ( left, right ) => left.routeId.localeCompare( right.routeId ) );
        const selectedRouteIds = routeCounts.map( ( route ) => route.routeId );
        const retainedOutputIdsUnique = new Set(
            dispatchRecords.map( ( record ) => record.outputPacketId )
        ).size === dispatchRecords.length;
        return {
            candidateId: internalRouterTransportCandidateId,
            reviewStatus: 'bounded-d3-transport-experiment-awaiting-human-review',
            mode: 'one-route-per-output',
            semanticClaim: 'transport',
            aggregation: false,
            dispatchCount,
            completionCount,
            activePacketCount,
            maximumConcurrentPacketCount,
            assignedRouteCount: dispatchCount,
            distinctSelectedRouteCount: selectedRouteIds.length,
            sharedRouteCount: routeCounts.filter( ( route ) =>
                route.count > 1
            ).length,
            routeDispatchCounts: Object.freeze( routeCounts ),
            selectedRouterRouteIds: Object.freeze(
                selectedRouteIds
            ),
            activeRouteEpochs: Object.freeze( Array.from( new Set(
                activePackets.map( ( packet ) =>
                    packet.routeAssignment.routeEpoch
                )
            ) ).sort() ),
            activePackets,
            dispatchRecords,
            completionRecords,
            retainedDispatchRecordCount: dispatchRecords.length,
            retainedCompletionRecordCount: completionRecords.length,
            retainedDuplicateGuardCount: dispatchedIds.size,
            retainedRouteCount: routeCounts.length,
            auditCapacity: capacity,
            duplicateGuardCapacity: capacity,
            auditTruncated: dispatchCount > dispatchRecords.length
                || completionCount > completionRecords.length,
            conservation: Object.freeze( {
                dispatched: dispatchCount,
                active: activePacketCount,
                completed: completionCount,
                outputBalance: dispatchCount
                    - activePacketCount - completionCount,
                retainedOutputIdsUnique
            } )
        };
    }

    function samplePresentationTrails( options )
    {
        return sampleActivePacketTrails( activeTraversals, options );
    }

    return Object.freeze( {
        dispatch,
        advance,
        reset,
        snapshot,
        samplePresentationTrails
    } );
}

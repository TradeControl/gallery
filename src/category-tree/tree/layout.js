function stableOffset( id )
{
    let hash = 2166136261;
    for ( let index = 0; index < id.length; index += 1 )
    {
        hash ^= id.charCodeAt( index );
        hash = Math.imul( hash, 16777619 );
    }
    return ( ( hash >>> 0 ) / 4294967295 ) * 2 - 1;
}

export function createDiagnosticLayout( hierarchy, options = {} )
{
    const trunkRise = options.trunkRise ?? 2.05;
    const branchRise = options.branchRise ?? 1.45;
    const principalReach = options.principalReach ?? 2.8;
    const reachDecay = options.reachDecay ?? 0.84;
    const angularJitter = options.angularJitter ?? 0.09;
    const asymmetry = options.asymmetry ?? 0.55;
    const positions = new Map();

    const trunk = [ hierarchy.root ];
    while ( trunk.at( -1 ).children.length === 1 )
    {
        trunk.push( trunk.at( -1 ).children[0] );
    }

    trunk.forEach( ( node, index ) => {
        positions.set( node.id, { x: 0, y: index * trunkRise, z: 0 } );
    } );

    const crown = trunk.at( -1 );
    const leafCounts = new Map();

    function countLeaves( node )
    {
        const count = node.children.length === 0
            ? 1
            : node.children.reduce( ( sum, child ) => sum + countLeaves( child ), 0 );
        leafCounts.set( node.id, count );
        return count;
    }

    countLeaves( crown );

    function placeChildren( parent, sectorStart, sectorEnd, branchDepth )
    {
        if ( parent.children.length === 0 ) return;

        const parentPosition = positions.get( parent.id );
        const totalLeaves = parent.children.reduce( ( sum, child ) => sum + leafCounts.get( child.id ), 0 );
        let cursor = sectorStart;

        for ( const child of parent.children )
        {
            const sectorWidth = ( sectorEnd - sectorStart ) * leafCounts.get( child.id ) / totalLeaves;
            const childStart = cursor;
            const childEnd = cursor + sectorWidth;
            const centreAngle = ( childStart + childEnd ) * 0.5;
            const angle = centreAngle + stableOffset( child.id ) * sectorWidth * angularJitter * asymmetry;
            const reachVariation = 1 + stableOffset( `${child.id}-reach` ) * 0.16 * asymmetry;
            const reach = principalReach * Math.pow( reachDecay, branchDepth - 1 ) * reachVariation;
            const riseVariation = 1 + stableOffset( `${child.id}-rise` ) * 0.12 * asymmetry;
            const rise = branchRise * Math.pow( 0.92, branchDepth - 1 ) * riseVariation;

            positions.set( child.id, {
                x: parentPosition.x + Math.cos( angle ) * reach,
                y: parentPosition.y + rise,
                z: parentPosition.z + Math.sin( angle ) * reach
            } );

            placeChildren( child, childStart, childEnd, branchDepth + 1 );
            cursor = childEnd;
        }
    }

    placeChildren( crown, -Math.PI * 0.43, Math.PI * 1.57, 1 );
    positions.set( hierarchy.root.id, { x: 0, y: 0, z: 0 } );

    return positions;
}

export function createUnfoldingLayout( establishedHierarchy, unfoldingHierarchy, options = {} )
{
    const positions = createDiagnosticLayout( establishedHierarchy, options );
    const asymmetry = options.asymmetry ?? 0.55;
    const growthTiers = options.growthTiers ?? Number.POSITIVE_INFINITY;
    const tierIsActive = ( node ) => ( node.growthTier ?? node.trunkStage ?? 0 ) <= growthTiers;
    const latentNodes = unfoldingHierarchy.nodes
        .filter( ( node ) => node.latent )
        .sort( ( a, b ) => a.depth - b.depth );

    for ( const node of latentNodes )
    {
        const parent = unfoldingHierarchy.byId.get( node.parentId );
        const parentPosition = positions.get( parent.id );
        const grandparentPosition = parent.parentId ? positions.get( parent.parentId ) : null;

        if ( node.structuralRole === 'trunk-stage' )
        {
            const stage = node.trunkStage ?? 1;
            positions.set( node.id, {
                x: parentPosition.x + stableOffset( `${node.id}-support-x` ) * 0.13,
                y: parentPosition.y + ( node.stageRise ?? 1.35 ),
                z: parentPosition.z + stableOffset( `${node.id}-support-z` ) * 0.1 + stage * 0.035
            } );
            continue;
        }

        if ( node.structuralRole === 'branch-site' )
        {
            const angle = node.structuralAngle ?? 0;
            const stage = parent.trunkStage ?? 1;
            const reach = 1.8 + stage * 0.16;
            positions.set( node.id, {
                x: parentPosition.x + Math.cos( angle ) * reach,
                y: parentPosition.y + 0.28 + stableOffset( `${node.id}-support-rise` ) * 0.16,
                z: parentPosition.z + Math.sin( angle ) * reach
            } );
            continue;
        }

        const siblings = parent.children.filter( ( child ) => child.latent );
        const siblingIndex = siblings.findIndex( ( sibling ) => sibling.id === node.id );
        const siblingOffset = siblingIndex - ( siblings.length - 1 ) * 0.5;
        const outward = grandparentPosition
            ? {
                x: parentPosition.x - grandparentPosition.x,
                z: parentPosition.z - grandparentPosition.z
            }
            : { x: 1, z: 0 };
        const outwardLength = Math.hypot( outward.x, outward.z ) || 1;
        const baseAngle = Math.atan2( outward.z / outwardLength, outward.x / outwardLength );
        const denseCrown = node.denseCrown === true;
        const denseLevel = node.denseLevel ?? 0;
        const spread = denseCrown
            ? ( denseLevel === 2 ? 0.92
                : denseLevel === 3 ? 0.84
                    : denseLevel === 4 ? 0.74
                        : 0.52 )
            : ( node.kind === 'terminal' ? 0.5 : 0.38 );
        const jitter = stableOffset( `${node.id}-emergence-angle` )
            * ( denseCrown ? 0.4 : 0.2 ) * asymmetry;
        const rawClusterTurn = stableOffset( `${node.id}-cluster-turn` );
        const clusterTurn = denseLevel === 1
            ? Math.sign( rawClusterTurn ) * ( 0.72 + Math.abs( rawClusterTurn ) * 0.95 )
            : 0;
        const angle = baseAngle + clusterTurn + siblingOffset * spread + jitter;
        const relativeDepth = node.depth - parent.depth;
        const denseDepth = Math.max( 0, node.depth - 7 );
        const reach = ( denseCrown
            ? ( node.kind === 'terminal' ? 0.9 : 1.22 )
            : ( node.kind === 'terminal' ? 1.58 : 2.02 ) )
            * ( 1 + stableOffset( `${node.id}-emergence-reach` ) * 0.13 * asymmetry )
            * Math.pow( denseCrown ? 0.86 : 0.92, denseCrown ? denseDepth : relativeDepth - 1 );
        const pitch = denseCrown
            ? stableOffset( `${node.id}-emergence-pitch` ) * 0.42
                + siblingOffset * 0.11
            : 0;
        const rise = ( denseCrown
            ? ( node.kind === 'terminal' ? 0.46 : 0.68 )
            : ( node.kind === 'terminal' ? 0.82 : 1.08 ) )
            * ( 1 + stableOffset( `${node.id}-emergence-rise` ) * 0.12 * asymmetry )
            + pitch;

        positions.set( node.id, {
            x: parentPosition.x + Math.cos( angle ) * reach,
            y: parentPosition.y + rise,
            z: parentPosition.z + Math.sin( angle ) * reach
        } );
    }

    const windSweep = options.windSweep ?? 0;
    const crownDepth = unfoldingHierarchy.byId.get( 'meaning' )?.depth ?? 3;
    for ( const node of unfoldingHierarchy.nodes )
    {
        const generation = Math.max( 0, node.depth - crownDepth );
        if ( generation === 0 ) continue;
        const position = positions.get( node.id );
        const sweepScale = node.structuralRole === 'trunk-stage'
            ? 0.12
            : node.structuralRole === 'branch-site' || node.supportTier
                ? 0.55
                : 1;
        const sweep = windSweep * Math.pow( generation, 1.22 ) * sweepScale;
        position.x += sweep;
        position.z += sweep * 0.16;
    }

    const terminalLoads = new Map();
    function countTerminalLoad( node )
    {
        const childLoad = node.children.reduce( ( sum, child ) => sum + countTerminalLoad( child ), 0 );
        const load = tierIsActive( node )
            ? ( node.children.length === 0 ? 1 : childLoad )
            : 0;
        terminalLoads.set( node.id, load );
        return load;
    }
    countTerminalLoad( unfoldingHierarchy.root );

    for ( const node of unfoldingHierarchy.nodes )
    {
        if ( node.kind !== 'trunk' && node.kind !== 'root' ) continue;
        node.supportRadius = 0.2 + Math.sqrt( terminalLoads.get( node.id ) ?? 0 ) * 0.018;
    }

    // Gravity constrains manifestation without deleting topology. Horizontal path
    // length accumulates as cantilever strain, weighted gently by descendant load.
    // Approaching the support budget turns growth upward and reduces reach; crossing
    // it leaves that relationship and its descendants dormant for this layout.
    const rawPositions = new Map( [ ...positions ].map( ( [ id, position ] ) => [ id, { ...position } ] ) );
    const supportStates = new Map();
    const orderedNodes = unfoldingHierarchy.nodes.slice().sort( ( a, b ) => a.depth - b.depth );
    for ( const node of orderedNodes )
    {
        const rawPosition = rawPositions.get( node.id );
        if ( node.parentId === null )
        {
            node.growthEligible = true;
            supportStates.set( node.id, { strain: 0, eligible: true, radius: node.supportRadius } );
            continue;
        }

        const parent = unfoldingHierarchy.byId.get( node.parentId );
        const parentState = supportStates.get( parent.id ) ?? {
            strain: 0,
            eligible: true,
            radius: parent.supportRadius ?? 0.28
        };
        const parentRaw = rawPositions.get( parent.id );
        const parentPosition = positions.get( parent.id );
        const rawEdge = {
            x: rawPosition.x - parentRaw.x,
            y: rawPosition.y - parentRaw.y,
            z: rawPosition.z - parentRaw.z
        };

        if ( node.kind === 'trunk' )
        {
            positions.set( node.id, {
                x: parentPosition.x + rawEdge.x,
                y: parentPosition.y + rawEdge.y,
                z: parentPosition.z + rawEdge.z
            } );
            const eligible = parentState.eligible && tierIsActive( node );
            node.growthEligible = eligible;
            supportStates.set( node.id, {
                strain: 0,
                eligible,
                radius: node.supportRadius
            } );
            continue;
        }

        const horizontalLength = Math.hypot( rawEdge.x, rawEdge.z );
        const loadFactor = 1 + Math.log2( ( terminalLoads.get( node.id ) ?? 0 ) + 1 ) * 0.035;
        const rawStrain = parentState.strain + horizontalLength * loadFactor;
        const supportLimit = ( node.supportTier ? 6.4 : 9.0 ) + parentState.radius * 10.5;
        const utilisation = rawStrain / supportLimit;
        const pressure = Math.max( 0, Math.min( 1, ( utilisation - 0.72 ) / 0.28 ) );
        const horizontalScale = 1 - pressure * 0.4;
        const eligible = parentState.eligible && tierIsActive( node )
            && rawStrain <= supportLimit * 1.28;

        positions.set( node.id, {
            x: parentPosition.x + rawEdge.x * horizontalScale,
            y: parentPosition.y + rawEdge.y + horizontalLength * ( 1 - horizontalScale ) * 0.65,
            z: parentPosition.z + rawEdge.z * horizontalScale
        } );
        node.growthEligible = eligible;
        supportStates.set( node.id, { strain: rawStrain, eligible, radius: parentState.radius } );
    }

    return positions;
}

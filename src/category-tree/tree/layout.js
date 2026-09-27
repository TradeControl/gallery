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
    const latentNodes = unfoldingHierarchy.nodes
        .filter( ( node ) => node.latent )
        .sort( ( a, b ) => a.depth - b.depth );

    for ( const node of latentNodes )
    {
        const parent = unfoldingHierarchy.byId.get( node.parentId );
        const parentPosition = positions.get( parent.id );
        const grandparentPosition = parent.parentId ? positions.get( parent.parentId ) : null;
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
        const spread = node.kind === 'terminal' ? 0.5 : 0.38;
        const jitter = stableOffset( `${node.id}-emergence-angle` ) * 0.2 * asymmetry;
        const angle = baseAngle + siblingOffset * spread + jitter;
        const relativeDepth = node.depth - parent.depth;
        const reach = ( node.kind === 'terminal' ? 1.58 : 2.02 )
            * ( 1 + stableOffset( `${node.id}-emergence-reach` ) * 0.13 * asymmetry )
            * Math.pow( 0.92, relativeDepth - 1 );
        const rise = ( node.kind === 'terminal' ? 0.82 : 1.08 )
            * ( 1 + stableOffset( `${node.id}-emergence-rise` ) * 0.12 * asymmetry );

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
        const sweep = windSweep * Math.pow( generation, 1.22 );
        position.x += sweep;
        position.z += sweep * 0.16;
    }

    return positions;
}

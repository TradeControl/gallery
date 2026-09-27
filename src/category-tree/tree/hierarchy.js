const allowedKinds = new Set( [ 'root', 'trunk', 'total', 'category', 'terminal' ] );

export const representativeHierarchy = [
    { id: 'planting-root', label: 'Buried planting root', kind: 'root', parentId: null },
    { id: 'uptake', label: 'Physical uptake', kind: 'trunk', parentId: 'planting-root' },
    { id: 'exchange', label: 'Transformative exchange', kind: 'trunk', parentId: 'uptake' },
    { id: 'meaning', label: 'Resolved meaning', kind: 'trunk', parentId: 'exchange' },

    { id: 'operations', label: 'Operations', kind: 'total', parentId: 'meaning' },
    { id: 'finance', label: 'Finance', kind: 'total', parentId: 'meaning' },
    { id: 'resources', label: 'Resources', kind: 'total', parentId: 'meaning' },

    { id: 'production', label: 'Production', kind: 'category', parentId: 'operations' },
    { id: 'fulfilment', label: 'Fulfilment', kind: 'category', parentId: 'operations' },
    { id: 'inspection', label: 'Inspection', kind: 'terminal', parentId: 'operations' },
    { id: 'cutting', label: 'Cutting', kind: 'terminal', parentId: 'production' },
    { id: 'forming', label: 'Forming', kind: 'terminal', parentId: 'production' },
    { id: 'assembly', label: 'Assembly', kind: 'category', parentId: 'production' },
    { id: 'joining', label: 'Joining', kind: 'terminal', parentId: 'assembly' },
    { id: 'finishing', label: 'Finishing', kind: 'terminal', parentId: 'assembly' },
    { id: 'dispatch', label: 'Dispatch', kind: 'terminal', parentId: 'fulfilment' },
    { id: 'delivery', label: 'Delivery', kind: 'terminal', parentId: 'fulfilment' },

    { id: 'trade', label: 'Trade', kind: 'category', parentId: 'finance' },
    { id: 'obligations', label: 'Obligations', kind: 'category', parentId: 'finance' },
    { id: 'receipts', label: 'Receipts', kind: 'terminal', parentId: 'trade' },
    { id: 'payments', label: 'Payments', kind: 'terminal', parentId: 'trade' },
    { id: 'adjustments', label: 'Adjustments', kind: 'terminal', parentId: 'trade' },
    { id: 'tax', label: 'Tax', kind: 'category', parentId: 'obligations' },
    { id: 'vat', label: 'VAT', kind: 'terminal', parentId: 'tax' },
    { id: 'corporation', label: 'Corporation tax', kind: 'terminal', parentId: 'tax' },
    { id: 'finance-cost', label: 'Finance cost', kind: 'terminal', parentId: 'obligations' },

    { id: 'people', label: 'People', kind: 'category', parentId: 'resources' },
    { id: 'materials', label: 'Materials', kind: 'category', parentId: 'resources' },
    { id: 'infrastructure', label: 'Infrastructure', kind: 'terminal', parentId: 'resources' },
    { id: 'direct-labour', label: 'Direct labour', kind: 'terminal', parentId: 'people' },
    { id: 'support', label: 'Support', kind: 'terminal', parentId: 'people' },
    { id: 'metals', label: 'Metals', kind: 'category', parentId: 'materials' },
    { id: 'components', label: 'Components', kind: 'terminal', parentId: 'materials' },
    { id: 'steel', label: 'Steel', kind: 'terminal', parentId: 'metals' },
    { id: 'alloys', label: 'Alloys', kind: 'terminal', parentId: 'metals' },
    { id: 'reclaimed', label: 'Reclaimed material', kind: 'terminal', parentId: 'metals' }
];

// Phase 1b extends the signed-off scaffold without changing any established
// relationship or turning an existing terminal into a parent. These are model
// nodes first: the renderer is only allowed to reveal relationships listed here.
export const latentCrownHierarchy = [
    { id: 'planning', label: 'Production planning', kind: 'category', parentId: 'production', latent: true, limb: 'operations' },
    { id: 'routing', label: 'Routing', kind: 'terminal', parentId: 'planning', latent: true, limb: 'operations' },
    { id: 'scheduling', label: 'Scheduling', kind: 'terminal', parentId: 'planning', latent: true, limb: 'operations' },
    { id: 'capacity-planning', label: 'Capacity planning', kind: 'category', parentId: 'planning', latent: true, limb: 'operations' },
    { id: 'capacity-load', label: 'Capacity load', kind: 'terminal', parentId: 'capacity-planning', latent: true, limb: 'operations' },
    { id: 'work-centres', label: 'Work centres', kind: 'terminal', parentId: 'capacity-planning', latent: true, limb: 'operations' },
    { id: 'maintenance', label: 'Maintenance', kind: 'category', parentId: 'operations', latent: true, limb: 'operations' },
    { id: 'preventive', label: 'Preventive maintenance', kind: 'terminal', parentId: 'maintenance', latent: true, limb: 'operations' },
    { id: 'corrective', label: 'Corrective maintenance', kind: 'terminal', parentId: 'maintenance', latent: true, limb: 'operations' },
    { id: 'reliability', label: 'Reliability', kind: 'category', parentId: 'maintenance', latent: true, limb: 'operations' },
    { id: 'condition', label: 'Condition', kind: 'terminal', parentId: 'reliability', latent: true, limb: 'operations' },
    { id: 'downtime', label: 'Downtime', kind: 'terminal', parentId: 'reliability', latent: true, limb: 'operations' },
    { id: 'warehousing', label: 'Warehousing', kind: 'category', parentId: 'fulfilment', latent: true, limb: 'operations' },
    { id: 'picking', label: 'Picking', kind: 'terminal', parentId: 'warehousing', latent: true, limb: 'operations' },
    { id: 'packing', label: 'Packing', kind: 'terminal', parentId: 'warehousing', latent: true, limb: 'operations' },
    { id: 'movement', label: 'Stock movement', kind: 'category', parentId: 'warehousing', latent: true, limb: 'operations' },
    { id: 'locations', label: 'Locations', kind: 'terminal', parentId: 'movement', latent: true, limb: 'operations' },
    { id: 'consignments', label: 'Consignments', kind: 'terminal', parentId: 'movement', latent: true, limb: 'operations' },

    { id: 'treasury', label: 'Treasury', kind: 'category', parentId: 'trade', latent: true, limb: 'finance' },
    { id: 'cash-position', label: 'Cash position', kind: 'terminal', parentId: 'treasury', latent: true, limb: 'finance' },
    { id: 'currency', label: 'Currency', kind: 'terminal', parentId: 'treasury', latent: true, limb: 'finance' },
    { id: 'liquidity', label: 'Liquidity', kind: 'category', parentId: 'treasury', latent: true, limb: 'finance' },
    { id: 'forecasting', label: 'Forecasting', kind: 'terminal', parentId: 'liquidity', latent: true, limb: 'finance' },
    { id: 'facilities', label: 'Facilities', kind: 'terminal', parentId: 'liquidity', latent: true, limb: 'finance' },
    { id: 'reporting', label: 'Reporting', kind: 'category', parentId: 'obligations', latent: true, limb: 'finance' },
    { id: 'statutory', label: 'Statutory reporting', kind: 'terminal', parentId: 'reporting', latent: true, limb: 'finance' },
    { id: 'management', label: 'Management reporting', kind: 'terminal', parentId: 'reporting', latent: true, limb: 'finance' },
    { id: 'ledgers', label: 'Ledgers', kind: 'category', parentId: 'reporting', latent: true, limb: 'finance' },
    { id: 'periods', label: 'Periods', kind: 'terminal', parentId: 'ledgers', latent: true, limb: 'finance' },
    { id: 'journals', label: 'Journals', kind: 'terminal', parentId: 'ledgers', latent: true, limb: 'finance' },
    { id: 'costing', label: 'Costing', kind: 'category', parentId: 'finance', latent: true, limb: 'finance' },
    { id: 'margin', label: 'Margin', kind: 'terminal', parentId: 'costing', latent: true, limb: 'finance' },
    { id: 'overheads', label: 'Overheads', kind: 'terminal', parentId: 'costing', latent: true, limb: 'finance' },
    { id: 'allocation', label: 'Allocation', kind: 'category', parentId: 'costing', latent: true, limb: 'finance' },
    { id: 'absorption', label: 'Absorption', kind: 'terminal', parentId: 'allocation', latent: true, limb: 'finance' },
    { id: 'contribution', label: 'Contribution', kind: 'terminal', parentId: 'allocation', latent: true, limb: 'finance' },

    { id: 'capability', label: 'Capability', kind: 'category', parentId: 'people', latent: true, limb: 'resources' },
    { id: 'training', label: 'Training', kind: 'terminal', parentId: 'capability', latent: true, limb: 'resources' },
    { id: 'skills', label: 'Skills', kind: 'terminal', parentId: 'capability', latent: true, limb: 'resources' },
    { id: 'development', label: 'Development', kind: 'category', parentId: 'capability', latent: true, limb: 'resources' },
    { id: 'accreditation', label: 'Accreditation', kind: 'terminal', parentId: 'development', latent: true, limb: 'resources' },
    { id: 'experience', label: 'Experience', kind: 'terminal', parentId: 'development', latent: true, limb: 'resources' },
    { id: 'supply', label: 'Supply', kind: 'category', parentId: 'materials', latent: true, limb: 'resources' },
    { id: 'procurement', label: 'Procurement', kind: 'terminal', parentId: 'supply', latent: true, limb: 'resources' },
    { id: 'inventory', label: 'Inventory', kind: 'terminal', parentId: 'supply', latent: true, limb: 'resources' },
    { id: 'sourcing', label: 'Sourcing', kind: 'category', parentId: 'supply', latent: true, limb: 'resources' },
    { id: 'vendors', label: 'Vendors', kind: 'terminal', parentId: 'sourcing', latent: true, limb: 'resources' },
    { id: 'lead-times', label: 'Lead times', kind: 'terminal', parentId: 'sourcing', latent: true, limb: 'resources' },
    { id: 'assets', label: 'Assets', kind: 'category', parentId: 'resources', latent: true, limb: 'resources' },
    { id: 'plant', label: 'Plant', kind: 'terminal', parentId: 'assets', latent: true, limb: 'resources' },
    { id: 'tooling', label: 'Tooling', kind: 'terminal', parentId: 'assets', latent: true, limb: 'resources' },
    { id: 'lifecycle', label: 'Asset lifecycle', kind: 'category', parentId: 'assets', latent: true, limb: 'resources' },
    { id: 'commissioning', label: 'Commissioning', kind: 'terminal', parentId: 'lifecycle', latent: true, limb: 'resources' },
    { id: 'retirement', label: 'Retirement', kind: 'terminal', parentId: 'lifecycle', latent: true, limb: 'resources' }
];

export const unfoldingHierarchy = [ ...representativeHierarchy, ...latentCrownHierarchy ];

export function createHierarchy( sourceNodes )
{
    if ( !Array.isArray( sourceNodes ) || sourceNodes.length === 0 )
    {
        throw new Error( 'The hierarchy requires at least one node.' );
    }

    const nodes = sourceNodes.map( ( source ) => ( {
        ...source,
        children: [],
        depth: 0
    } ) );
    const byId = new Map();

    for ( const node of nodes )
    {
        if ( !node.id || byId.has( node.id ) )
        {
            throw new Error( `Hierarchy node identifiers must be non-empty and unique: ${node.id}` );
        }
        if ( !allowedKinds.has( node.kind ) )
        {
            throw new Error( `Unknown node kind '${node.kind}' on '${node.id}'.` );
        }
        byId.set( node.id, node );
    }

    const roots = [];
    for ( const node of nodes )
    {
        if ( node.parentId === null )
        {
            roots.push( node );
            continue;
        }

        const parent = byId.get( node.parentId );
        if ( !parent )
        {
            throw new Error( `Node '${node.id}' refers to missing parent '${node.parentId}'.` );
        }
        if ( parent === node )
        {
            throw new Error( `Node '${node.id}' cannot be its own parent.` );
        }
        parent.children.push( node );
    }

    for ( const node of nodes )
    {
        if ( node.kind === 'root' && node.parentId !== null )
        {
            throw new Error( `Only the hierarchy root may use the root kind: '${node.id}'.` );
        }
        if ( node.kind === 'terminal' && node.children.length > 0 )
        {
            throw new Error( `Terminal node '${node.id}' cannot contain children.` );
        }
        if ( node.kind !== 'terminal' && node.children.length === 0 )
        {
            throw new Error( `Non-terminal node '${node.id}' must contain at least one child.` );
        }
    }

    if ( roots.length !== 1 )
    {
        throw new Error( `The Phase 0 fixture requires exactly one root; found ${roots.length}.` );
    }
    if ( roots[0].kind !== 'root' )
    {
        throw new Error( `Root node '${roots[0].id}' must use the root kind.` );
    }

    const visiting = new Set();
    const visited = new Set();
    let maxDepth = 0;

    function visit( node, depth )
    {
        if ( visiting.has( node.id ) )
        {
            throw new Error( `Cycle detected at '${node.id}'.` );
        }
        if ( visited.has( node.id ) )
        {
            throw new Error( `Node '${node.id}' is reachable by more than one route.` );
        }

        visiting.add( node.id );
        node.depth = depth;
        maxDepth = Math.max( maxDepth, depth );
        node.children.forEach( ( child ) => visit( child, depth + 1 ) );
        visiting.delete( node.id );
        visited.add( node.id );
    }

    visit( roots[0], 0 );
    if ( visited.size !== nodes.length )
    {
        const unreachable = nodes.filter( ( node ) => !visited.has( node.id ) ).map( ( node ) => node.id );
        throw new Error( `Unreachable hierarchy nodes: ${unreachable.join( ', ' )}` );
    }

    const edges = nodes
        .filter( ( node ) => node.parentId !== null )
        .map( ( node ) => ( { parent: byId.get( node.parentId ), child: node } ) );
    const terminals = nodes.filter( ( node ) => node.children.length === 0 );

    return {
        root: roots[0],
        roots,
        nodes,
        edges,
        terminals,
        byId,
        maxDepth
    };
}

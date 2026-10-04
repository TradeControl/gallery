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

// Phase 2d adds a fixed authored extension to the validated fixture. The compact
// cluster notation keeps the subject matter inspectable while materialising every
// node and parent-child relationship before validation; it is not renderer-side
// procedural branching.
const denseCrownClusters = [
    { anchorId: 'capacity-planning', id: 'capacity-control', label: 'Capacity control', limb: 'operations', arms: [
        { id: 'load-balancing', label: 'Load balancing', terminals: [ [ 'queue-pressure', 'Queue pressure' ], [ 'utilisation', 'Utilisation' ] ] },
        { id: 'constraint-control', label: 'Constraint control', terminals: [ [ 'bottlenecks', 'Bottlenecks' ], [ 'throughput', 'Throughput' ] ] }
    ] },
    { anchorId: 'reliability', id: 'reliability-control', label: 'Reliability control', limb: 'operations', arms: [
        { id: 'failure-analysis', label: 'Failure analysis', terminals: [ [ 'failure-modes', 'Failure modes' ], [ 'root-causes', 'Root causes' ] ] },
        { id: 'service-response', label: 'Service response', terminals: [ [ 'service-window', 'Service window' ], [ 'repair-cycle', 'Repair cycle' ] ] }
    ] },
    { anchorId: 'movement', id: 'movement-control', label: 'Movement control', limb: 'operations', arms: [
        { id: 'transfer-control', label: 'Transfer control', terminals: [ [ 'transfer-orders', 'Transfer orders' ], [ 'transfer-status', 'Transfer status' ] ] },
        { id: 'handling-control', label: 'Handling control', terminals: [ [ 'handling-units', 'Handling units' ], [ 'handling-routes', 'Handling routes' ] ] }
    ] },
    { anchorId: 'assembly', id: 'assembly-control', label: 'Assembly control', limb: 'operations', arms: [
        { id: 'sequence-control', label: 'Sequence control', terminals: [ [ 'operation-sequence', 'Operation sequence' ], [ 'dependency-state', 'Dependency state' ] ] },
        { id: 'quality-gates', label: 'Quality gates', terminals: [ [ 'acceptance', 'Acceptance' ], [ 'rework', 'Rework' ] ] }
    ] },
    { anchorId: 'maintenance', id: 'maintenance-control', label: 'Maintenance control', limb: 'operations', arms: [
        { id: 'work-orders', label: 'Work orders', terminals: [ [ 'maintenance-demand', 'Maintenance demand' ], [ 'maintenance-release', 'Maintenance release' ] ] },
        { id: 'spares-control', label: 'Spares control', terminals: [ [ 'spares-demand', 'Spares demand' ], [ 'spares-availability', 'Spares availability' ] ] }
    ] },
    { anchorId: 'warehousing', id: 'warehouse-control', label: 'Warehouse control', limb: 'operations', arms: [
        { id: 'receipt-control', label: 'Receipt control', terminals: [ [ 'goods-received', 'Goods received' ], [ 'put-away', 'Put away' ] ] },
        { id: 'dispatch-control', label: 'Dispatch control', terminals: [ [ 'release-wave', 'Release wave' ], [ 'carrier-handover', 'Carrier handover' ] ] }
    ] },

    { anchorId: 'liquidity', id: 'liquidity-control', label: 'Liquidity control', limb: 'finance', arms: [
        { id: 'cash-horizon', label: 'Cash horizon', terminals: [ [ 'near-cash', 'Near cash' ], [ 'forward-cash', 'Forward cash' ] ] },
        { id: 'funding-control', label: 'Funding control', terminals: [ [ 'funding-headroom', 'Funding headroom' ], [ 'funding-cost', 'Funding cost' ] ] }
    ] },
    { anchorId: 'ledgers', id: 'ledger-control', label: 'Ledger control', limb: 'finance', arms: [
        { id: 'posting-control', label: 'Posting control', terminals: [ [ 'posting-rules', 'Posting rules' ], [ 'posting-state', 'Posting state' ] ] },
        { id: 'balance-control', label: 'Balance control', terminals: [ [ 'trial-balance', 'Trial balance' ], [ 'reconciliation', 'Reconciliation' ] ] }
    ] },
    { anchorId: 'allocation', id: 'allocation-control', label: 'Allocation control', limb: 'finance', arms: [
        { id: 'basis-control', label: 'Basis control', terminals: [ [ 'allocation-basis', 'Allocation basis' ], [ 'allocation-driver', 'Allocation driver' ] ] },
        { id: 'recovery-control', label: 'Recovery control', terminals: [ [ 'cost-recovery', 'Cost recovery' ], [ 'variance-recovery', 'Variance recovery' ] ] }
    ] },
    { anchorId: 'tax', id: 'tax-control', label: 'Tax control', limb: 'finance', arms: [
        { id: 'tax-position', label: 'Tax position', terminals: [ [ 'tax-accrual', 'Tax accrual' ], [ 'tax-settlement', 'Tax settlement' ] ] },
        { id: 'tax-evidence', label: 'Tax evidence', terminals: [ [ 'tax-records', 'Tax records' ], [ 'tax-adjustments', 'Tax adjustments' ] ] }
    ] },
    { anchorId: 'treasury', id: 'treasury-control', label: 'Treasury control', limb: 'finance', arms: [
        { id: 'exposure-control', label: 'Exposure control', terminals: [ [ 'currency-exposure', 'Currency exposure' ], [ 'rate-exposure', 'Rate exposure' ] ] },
        { id: 'settlement-control', label: 'Settlement control', terminals: [ [ 'settlement-window', 'Settlement window' ], [ 'settlement-status', 'Settlement status' ] ] }
    ] },
    { anchorId: 'reporting', id: 'reporting-control', label: 'Reporting control', limb: 'finance', arms: [
        { id: 'close-control', label: 'Close control', terminals: [ [ 'close-readiness', 'Close readiness' ], [ 'close-exceptions', 'Close exceptions' ] ] },
        { id: 'assurance-control', label: 'Assurance control', terminals: [ [ 'evidence-state', 'Evidence state' ], [ 'review-state', 'Review state' ] ] }
    ] },

    { anchorId: 'development', id: 'development-control', label: 'Development control', limb: 'resources', arms: [
        { id: 'learning-paths', label: 'Learning paths', terminals: [ [ 'learning-demand', 'Learning demand' ], [ 'learning-progress', 'Learning progress' ] ] },
        { id: 'capability-evidence', label: 'Capability evidence', terminals: [ [ 'observed-skill', 'Observed skill' ], [ 'verified-skill', 'Verified skill' ] ] }
    ] },
    { anchorId: 'sourcing', id: 'sourcing-control', label: 'Sourcing control', limb: 'resources', arms: [
        { id: 'market-control', label: 'Market control', terminals: [ [ 'market-options', 'Market options' ], [ 'market-risk', 'Market risk' ] ] },
        { id: 'supplier-control', label: 'Supplier control', terminals: [ [ 'supplier-capacity', 'Supplier capacity' ], [ 'supplier-performance', 'Supplier performance' ] ] }
    ] },
    { anchorId: 'lifecycle', id: 'lifecycle-control', label: 'Lifecycle control', limb: 'resources', arms: [
        { id: 'asset-condition', label: 'Asset condition', terminals: [ [ 'condition-state', 'Condition state' ], [ 'condition-trend', 'Condition trend' ] ] },
        { id: 'renewal-control', label: 'Renewal control', terminals: [ [ 'renewal-demand', 'Renewal demand' ], [ 'renewal-priority', 'Renewal priority' ] ] }
    ] },
    { anchorId: 'metals', id: 'material-control', label: 'Material control', limb: 'resources', arms: [
        { id: 'grade-control', label: 'Grade control', terminals: [ [ 'material-grade', 'Material grade' ], [ 'material-certification', 'Material certification' ] ] },
        { id: 'yield-control', label: 'Yield control', terminals: [ [ 'material-yield', 'Material yield' ], [ 'material-loss', 'Material loss' ] ] }
    ] },
    { anchorId: 'capability', id: 'capability-control', label: 'Capability control', limb: 'resources', arms: [
        { id: 'coverage-control', label: 'Coverage control', terminals: [ [ 'skill-coverage', 'Skill coverage' ], [ 'role-coverage', 'Role coverage' ] ] },
        { id: 'continuity-control', label: 'Continuity control', terminals: [ [ 'succession-state', 'Succession state' ], [ 'retention-risk', 'Retention risk' ] ] }
    ] },
    { anchorId: 'supply', id: 'supply-control', label: 'Supply control', limb: 'resources', arms: [
        { id: 'availability-control', label: 'Availability control', terminals: [ [ 'available-supply', 'Available supply' ], [ 'committed-supply', 'Committed supply' ] ] },
        { id: 'continuity-planning', label: 'Continuity planning', terminals: [ [ 'supply-risk', 'Supply risk' ], [ 'recovery-source', 'Recovery source' ] ] }
    ] }
];

export const denseCrownHierarchy = denseCrownClusters.flatMap( ( cluster ) => {
    const shared = { latent: true, limb: cluster.limb, denseCrown: true };
    const nodes = [
        { id: cluster.id, label: cluster.label, kind: 'category', parentId: cluster.anchorId, denseLevel: 1, ...shared }
    ];
    for ( const arm of cluster.arms )
    {
        nodes.push( { id: arm.id, label: arm.label, kind: 'category', parentId: cluster.id, denseLevel: 2, ...shared } );
        for ( const [ id, label ] of arm.terminals )
        {
            nodes.push( { id, label, kind: 'category', parentId: arm.id, denseLevel: 3, ...shared } );
            nodes.push(
                { id: `${id}-state`, label: `${label} state`, kind: 'terminal', parentId: id, denseLevel: 4, ...shared },
                { id: `${id}-change`, label: `${label} change`, kind: 'terminal', parentId: id, denseLevel: 4, ...shared }
            );
        }
    }
    return nodes;
} );

// A second explicit recursion grows the common support after the first crown has
// begun to carry load. Each stage extends the trunk and releases two finite lateral
// subtrees. This is structural topology, not a decorative duplication of branches.
const trunkGrowthStages = [
    { id: 'crown-trunk-1', parentId: 'meaning', rise: 1.45, sites: [
        { id: 'process-observation', label: 'Process observation', limb: 'operations', angle: 2.45, arms: [
            { id: 'process-state', label: 'Process state', fields: [ [ 'process-readiness', 'Process readiness' ], [ 'process-variance', 'Process variance' ] ] },
            { id: 'process-response', label: 'Process response', fields: [ [ 'response-demand', 'Response demand' ], [ 'response-progress', 'Response progress' ] ] }
        ] },
        { id: 'working-capital', label: 'Working capital', limb: 'finance', angle: -0.78, arms: [
            { id: 'capital-demand', label: 'Capital demand', fields: [ [ 'inventory-demand', 'Inventory demand' ], [ 'receivable-demand', 'Receivable demand' ] ] },
            { id: 'capital-release', label: 'Capital release', fields: [ [ 'cash-release', 'Cash release' ], [ 'capacity-release', 'Capacity release' ] ] }
        ] }
    ] },
    { id: 'crown-trunk-2', parentId: 'crown-trunk-1', rise: 1.35, sites: [
        { id: 'resource-assurance', label: 'Resource assurance', limb: 'resources', angle: 0.48, arms: [
            { id: 'resource-readiness', label: 'Resource readiness', fields: [ [ 'people-readiness', 'People readiness' ], [ 'material-readiness', 'Material readiness' ] ] },
            { id: 'resource-resilience', label: 'Resource resilience', fields: [ [ 'resource-continuity', 'Resource continuity' ], [ 'resource-recovery', 'Resource recovery' ] ] }
        ] },
        { id: 'delivery-rhythm', label: 'Delivery rhythm', limb: 'operations', angle: 3.58, arms: [
            { id: 'flow-rhythm', label: 'Flow rhythm', fields: [ [ 'release-rhythm', 'Release rhythm' ], [ 'completion-rhythm', 'Completion rhythm' ] ] },
            { id: 'service-rhythm', label: 'Service rhythm', fields: [ [ 'demand-rhythm', 'Demand rhythm' ], [ 'response-rhythm', 'Response rhythm' ] ] }
        ] }
    ] },
    { id: 'crown-trunk-3', parentId: 'crown-trunk-2', rise: 1.25, sites: [
        { id: 'financial-horizon', label: 'Financial horizon', limb: 'finance', angle: 1.56, arms: [
            { id: 'value-horizon', label: 'Value horizon', fields: [ [ 'earned-value', 'Earned value' ], [ 'future-value', 'Future value' ] ] },
            { id: 'risk-horizon', label: 'Risk horizon', fields: [ [ 'current-risk', 'Current risk' ], [ 'emerging-risk', 'Emerging risk' ] ] }
        ] },
        { id: 'productive-capacity', label: 'Productive capacity', limb: 'resources', angle: 4.72, arms: [
            { id: 'available-capacity', label: 'Available capacity', fields: [ [ 'available-people', 'Available people' ], [ 'available-assets', 'Available assets' ] ] },
            { id: 'latent-capacity', label: 'Latent capacity', fields: [ [ 'recoverable-capacity', 'Recoverable capacity' ], [ 'developing-capacity', 'Developing capacity' ] ] }
        ] }
    ] }
];

export const trunkGrowthHierarchy = trunkGrowthStages.flatMap( ( stage, stageIndex ) => {
    const nodes = [ {
        id: stage.id,
        label: `Crown support stage ${stageIndex + 1}`,
        kind: 'trunk',
        parentId: stage.parentId,
        latent: true,
        structuralRole: 'trunk-stage',
        trunkStage: stageIndex + 1,
        stageRise: stage.rise
    } ];

    for ( const site of stage.sites )
    {
        const shared = { latent: true, limb: site.limb, supportTier: true };
        nodes.push( {
            id: site.id,
            label: site.label,
            kind: 'total',
            parentId: stage.id,
            structuralRole: 'branch-site',
            structuralAngle: site.angle,
            ...shared
        } );
        for ( const arm of site.arms )
        {
            nodes.push( { id: arm.id, label: arm.label, kind: 'category', parentId: site.id, denseCrown: true, denseLevel: 2, ...shared } );
            for ( const [ id, label ] of arm.fields )
            {
                nodes.push( { id, label, kind: 'category', parentId: arm.id, denseCrown: true, denseLevel: 3, ...shared } );
                nodes.push(
                    { id: `${id}-state`, label: `${label} state`, kind: 'terminal', parentId: id, denseCrown: true, denseLevel: 4, ...shared },
                    { id: `${id}-change`, label: `${label} change`, kind: 'terminal', parentId: id, denseCrown: true, denseLevel: 4, ...shared }
                );
            }
        }
    }
    return nodes;
} );

export const unfoldingHierarchy = [
    ...representativeHierarchy,
    ...latentCrownHierarchy,
    ...denseCrownHierarchy,
    ...trunkGrowthHierarchy
];

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

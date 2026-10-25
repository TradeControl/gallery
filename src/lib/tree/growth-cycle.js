function hashUnit( value )
{
    let hash = 2166136261;
    for ( let index = 0; index < value.length; index += 1 )
    {
        hash ^= value.charCodeAt( index );
        hash = Math.imul( hash, 16777619 );
    }
    return ( hash >>> 0 ) / 4294967295;
}

function ease( value )
{
    const t = Math.max( 0, Math.min( 1, value ) );
    return t * t * ( 3 - 2 * t );
}

export function createGrowthCycle( hierarchy, initialSeed = 1 )
{
    const latentNodes = hierarchy.nodes.filter( ( node ) => node.latent );
    let seed = initialSeed;
    let schedule = new Map();

    function rebuild()
    {
        schedule = new Map();
        const limbOffsets = { operations: 0, finance: 0.16, resources: 0.32 };

        for ( const node of latentNodes.slice().sort( ( a, b ) => a.depth - b.depth ) )
        {
            const parentEntry = schedule.get( node.parentId );
            const jitter = hashUnit( `${seed}:${node.id}` );
            const parentCommitment = node.structuralRole === 'trunk-stage'
                ? 0.9
                : node.structuralRole === 'branch-site'
                    ? 1.12
                    : 0.72 + jitter * 0.18;
            const start = parentEntry
                ? parentEntry.start + parentEntry.duration * parentCommitment
                : ( limbOffsets[node.limb] ?? 0 ) + jitter * 0.7;
            const duration = node.structuralRole === 'trunk-stage'
                ? 1.8 + hashUnit( `${seed}:${node.id}:duration` ) * 0.55
                : 1.15 + hashUnit( `${seed}:${node.id}:duration` ) * 0.8;
            schedule.set( node.id, { start, duration } );
        }
    }

    function sample( elapsed, speed = 1 )
    {
        const progress = new Map();
        let total = 0;
        let eligibleCount = 0;
        let complete = true;
        for ( const node of latentNodes )
        {
            const entry = schedule.get( node.id );
            const eligible = node.growthEligible !== false;
            const value = eligible
                ? ease( ( elapsed * speed - entry.start ) / entry.duration )
                : 0;
            progress.set( node.id, value );
            if ( eligible )
            {
                eligibleCount += 1;
                total += value;
                if ( value < 0.999 ) complete = false;
            }
        }
        return {
            progress,
            viability: eligibleCount > 0 ? total / eligibleCount : 1,
            complete
        };
    }

    rebuild();
    return {
        sample,
        reset() {
            return sample( 0 );
        },
        reseed() {
            seed += 1;
            rebuild();
            return seed;
        },
        get seed() {
            return seed;
        },
        get latentCount() {
            return latentNodes.filter( ( node ) => node.growthEligible !== false ).length;
        }
    };
}

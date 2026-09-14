export function seededGenerator( seed )
{
    let state = seed >>> 0 || 1;
    return () => {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        return ( state >>> 0 ) / 4294967296;
    };
}

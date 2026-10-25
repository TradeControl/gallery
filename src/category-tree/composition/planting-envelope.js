import * as THREE from 'three';

const crossingTolerance = 1e-7;
const bisectionSteps = 32;

function freezePoint( point )
{
    return Object.freeze( [ point.x, point.y, point.z ] );
}

function terrainHeightAt( membrane, x, z )
{
    const height = Number( membrane.height( x, z ) );
    if ( !Number.isFinite( height ) )
    {
        throw new TypeError( 'Planting terrain height must be finite.' );
    }
    return height;
}

function terrainDistance( membrane, point )
{
    return point.y - terrainHeightAt( membrane, point.x, point.z );
}

function interpolateTerrainCrossing( membrane, start, end )
{
    let lower = 0;
    let upper = 1;
    let lowerDistance = terrainDistance( membrane, start );
    const upperDistance = terrainDistance( membrane, end );
    if ( Math.abs( lowerDistance ) <= crossingTolerance ) return start.clone();
    if ( Math.abs( upperDistance ) <= crossingTolerance ) return end.clone();
    if ( Math.sign( lowerDistance ) === Math.sign( upperDistance ) ) return null;

    const candidate = new THREE.Vector3();
    for ( let iteration = 0; iteration < bisectionSteps; iteration += 1 )
    {
        const middle = ( lower + upper ) * 0.5;
        candidate.lerpVectors( start, end, middle );
        const middleDistance = terrainDistance( membrane, candidate );
        if ( Math.abs( middleDistance ) <= crossingTolerance )
        {
            return candidate.clone();
        }
        if ( Math.sign( middleDistance ) === Math.sign( lowerDistance ) )
        {
            lower = middle;
            lowerDistance = middleDistance;
        }
        else
        {
            upper = middle;
        }
    }
    candidate.lerpVectors( start, end, ( lower + upper ) * 0.5 );
    return candidate.clone();
}

function pointInsidePolygon( x, z, polygon )
{
    let inside = false;
    for ( let index = 0, previous = polygon.length - 1;
        index < polygon.length;
        previous = index, index += 1 )
    {
        const [ currentX, , currentZ ] = polygon[index];
        const [ previousX, , previousZ ] = polygon[previous];
        const segmentX = currentX - previousX;
        const segmentZ = currentZ - previousZ;
        const pointX = x - previousX;
        const pointZ = z - previousZ;
        const cross = segmentX * pointZ - segmentZ * pointX;
        const dot = pointX * segmentX + pointZ * segmentZ;
        const lengthSquared = segmentX * segmentX + segmentZ * segmentZ;
        if ( Math.abs( cross ) <= 1e-9
            && dot >= -1e-9 && dot <= lengthSquared + 1e-9 )
        {
            return true;
        }
        const crossesRay = ( currentZ > z ) !== ( previousZ > z )
            && x < ( previousX - currentX ) * ( z - currentZ )
                / ( previousZ - currentZ ) + currentX;
        if ( crossesRay ) inside = !inside;
    }
    return inside;
}

function createLineMaterial( colour, opacity )
{
    return new THREE.LineBasicMaterial( {
        color: colour,
        transparent: true,
        opacity,
        depthTest: true,
        depthWrite: false,
        toneMapped: false
    } );
}

function createPointMaterial( colour )
{
    return new THREE.PointsMaterial( {
        color: colour,
        size: 0.12,
        sizeAttenuation: true,
        depthTest: true,
        depthWrite: false,
        toneMapped: false
    } );
}

function replaceLineGeometry( line, points )
{
    const previous = line.geometry;
    const geometry = new THREE.BufferGeometry();
    if ( points.length > 0 ) geometry.setFromPoints( points );
    line.geometry = geometry;
    previous.dispose();
}

function readWorldSideRings( trunkMesh )
{
    if ( !trunkMesh?.isMesh )
    {
        throw new TypeError( 'A planting envelope requires a trunk mesh.' );
    }
    const geometry = trunkMesh.geometry;
    const metadata = geometry?.userData?.monumentalTrunk;
    const position = geometry?.getAttribute?.( 'position' );
    const radialSegments = Number( metadata?.radialSegments );
    const sideVertexCount = Number( metadata?.sideVertexCount );
    const plantingRingIndex = Number( metadata?.plantingSegmentCount );
    const sideRingCount = sideVertexCount / radialSegments;
    if ( !position || !Number.isInteger( radialSegments )
        || radialSegments < 3 || !Number.isInteger( sideVertexCount )
        || sideVertexCount < radialSegments * 2
        || !Number.isInteger( sideRingCount )
        || !Number.isInteger( plantingRingIndex )
        || plantingRingIndex < 0 || plantingRingIndex >= sideRingCount
        || position.count < sideVertexCount )
    {
        throw new Error(
            'The trunk does not expose a valid monumental planting ring.'
        );
    }

    trunkMesh.updateWorldMatrix( true, false );
    const rings = [];
    for ( let ring = 0; ring < sideRingCount; ring += 1 )
    {
        const points = [];
        for ( let side = 0; side < radialSegments; side += 1 )
        {
            points.push( new THREE.Vector3().fromBufferAttribute(
                position,
                ring * radialSegments + side
            ).applyMatrix4( trunkMesh.matrixWorld ) );
        }
        rings.push( points );
    }
    return {
        geometryUuid: geometry.uuid,
        plantingRingIndex,
        radialSegments,
        rings,
        sideRingCount
    };
}

function firstTerrainCrossing( membrane, rings, side )
{
    const distances = rings.map( ( ring ) => terrainDistance(
        membrane,
        ring[side]
    ) );
    for ( let ring = 0; ring < rings.length; ring += 1 )
    {
        if ( Math.abs( distances[ring] ) <= crossingTolerance )
        {
            return { point: rings[ring][side].clone(), disposition: 'crossing' };
        }
        if ( ring === 0
            || Math.sign( distances[ring - 1] ) === Math.sign( distances[ring] ) )
        {
            continue;
        }
        return {
            point: interpolateTerrainCrossing(
                membrane,
                rings[ring - 1][side],
                rings[ring][side]
            ),
            disposition: 'crossing'
        };
    }
    return {
        point: null,
        disposition: distances.every( ( distance ) => distance < 0 )
            ? 'buried'
            : 'detached'
    };
}

function envelopeStatus( sideResults )
{
    const crossingCount = sideResults.filter(
        ( result ) => result.disposition === 'crossing'
    ).length;
    if ( crossingCount === sideResults.length ) return 'attached';
    if ( crossingCount > 0 ) return 'partial';
    if ( sideResults.every( ( result ) => result.disposition === 'buried' ) )
    {
        return 'fully-buried';
    }
    if ( sideResults.every( ( result ) => result.disposition === 'detached' ) )
    {
        return 'detached';
    }
    return 'partial';
}

function characteristicFootprintRadius( footprint )
{
    const centre = footprint.reduce( ( sum, point ) => {
        sum.x += point.x;
        sum.z += point.z;
        return sum;
    }, { x: 0, z: 0 } );
    centre.x /= footprint.length;
    centre.z /= footprint.length;
    return footprint.reduce( ( total, point ) => total + Math.hypot(
        point.x - centre.x,
        point.z - centre.z
    ), 0 ) / footprint.length;
}

function ringCentre( ring )
{
    return ring.reduce(
        ( centre, point ) => centre.add( point ),
        new THREE.Vector3()
    ).multiplyScalar( 1 / ring.length );
}

function plantingAnchor( trunkMesh, fallbackRing )
{
    const descriptor = trunkMesh.userData?.monumentalTrunk;
    const root = descriptor?.nodes?.[0];
    const position = root
        ? descriptor.positions?.get?.( root.id )
        : null;
    if ( position && [ position.x, position.y, position.z ].every(
        Number.isFinite
    ) )
    {
        return new THREE.Vector3(
            position.x,
            position.y,
            position.z
        ).applyMatrix4( trunkMesh.matrixWorld );
    }
    return ringCentre( fallbackRing );
}

export function createPlantingEnvelope( { scene, membrane } )
{
    if ( !scene?.isObject3D || typeof scene.add !== 'function' )
    {
        throw new TypeError( 'A planting envelope requires a Three.js scene.' );
    }
    if ( typeof membrane?.height !== 'function' )
    {
        throw new TypeError( 'A planting envelope requires a membrane height function.' );
    }

    const group = new THREE.Group();
    group.name = 'Category Tree planting-envelope diagnostic';
    group.visible = false;

    const footprintLine = new THREE.LineLoop(
        new THREE.BufferGeometry(),
        createLineMaterial( 0x7ea2aa, 0.78 )
    );
    footprintLine.name = 'Planting-root footprint';
    const contactLine = new THREE.LineSegments(
        new THREE.BufferGeometry(),
        createLineMaterial( 0x52e0d5, 1 )
    );
    contactLine.name = 'Terrain and trunk contact line';
    const contactMarkers = new THREE.Points(
        new THREE.BufferGeometry(),
        createPointMaterial( 0xc8fff8 )
    );
    contactMarkers.name = 'Terrain and trunk contact samples';
    const deepLine = new THREE.LineLoop(
        new THREE.BufferGeometry(),
        createLineMaterial( 0x596e83, 0.64 )
    );
    deepLine.name = 'Planting deep-medium boundary';
    const burialTicks = new THREE.LineSegments(
        new THREE.BufferGeometry(),
        createLineMaterial( 0x7c9288, 0.62 )
    );
    burialTicks.name = 'Planting burial ticks';
    group.add(
        footprintLine,
        contactLine,
        contactMarkers,
        deepLine,
        burialTicks
    );
    scene.add( group );

    let disposed = false;
    let revision = 0;
    let snapshot = null;

    function updateDiagnostics( data )
    {
        const lift = data.surfaceBandHalfThickness * 1.25;
        const radialLift = data.surfaceBandHalfThickness * 2;
        const displayContact = ( point ) => {
            const radial = new THREE.Vector3(
                point[0] - data.anchor[0],
                0,
                point[2] - data.anchor[2]
            );
            if ( radial.lengthSq() > Number.EPSILON )
            {
                radial.setLength( radialLift );
            }
            const x = point[0] + radial.x;
            const z = point[2] + radial.z;
            return new THREE.Vector3(
                x,
                terrainHeightAt( membrane, x, z ) + lift,
                z
            );
        };
        replaceLineGeometry(
            footprintLine,
            data.plantingRootFootprint.map( ( point ) =>
                new THREE.Vector3( point[0], point[1], point[2] )
            )
        );

        const contactSegments = [];
        for ( let side = 0; side < data.contactBySide.length; side += 1 )
        {
            const current = data.contactBySide[side];
            const next = data.contactBySide[
                ( side + 1 ) % data.contactBySide.length
            ];
            if ( !current || !next ) continue;
            contactSegments.push(
                displayContact( current ),
                displayContact( next )
            );
        }
        replaceLineGeometry( contactLine, contactSegments );
        replaceLineGeometry(
            contactMarkers,
            data.contactBySide.filter( Boolean ).map( displayContact )
        );
        replaceLineGeometry(
            deepLine,
            data.deepMediumLine.map( ( point ) =>
                new THREE.Vector3( point[0], point[1], point[2] )
            )
        );

        const tickPoints = [];
        for ( let side = 0; side < data.contactBySide.length; side += 1 )
        {
            const contact = data.contactBySide[side];
            if ( !contact ) continue;
            const base = data.plantedBaseLine[side];
            tickPoints.push(
                new THREE.Vector3( base[0], base[1], base[2] ),
                new THREE.Vector3( contact[0], contact[1], contact[2] )
            );
        }
        replaceLineGeometry( burialTicks, tickPoints );
    }

    function update( trunkMesh )
    {
        if ( disposed ) throw new Error( 'The planting envelope is disposed.' );
        const source = readWorldSideRings( trunkMesh );
        const footprintPoints = source.rings[source.plantingRingIndex];
        const basePoints = source.rings[0];
        const sideResults = Array.from(
            { length: source.radialSegments },
            ( _, side ) => firstTerrainCrossing(
                membrane,
                source.rings,
                side
            )
        );
        const contactPoints = sideResults.map( ( result ) => result.point );
        const baseBurialDepths = basePoints.map( ( point ) => Math.max(
            0,
            -terrainDistance( membrane, point )
        ) );
        const deepMediumDepth = Math.max( ...baseBurialDepths );
        const frozenFootprint = footprintPoints.map( freezePoint );
        const characteristicRadius = characteristicFootprintRadius(
            footprintPoints
        );
        const surfaceBandHalfThickness = THREE.MathUtils.clamp(
            characteristicRadius * 0.035,
            0.008,
            0.08
        );
        const frozenContacts = contactPoints.map(
            ( point ) => point ? freezePoint( point ) : null
        );
        const anchor = plantingAnchor( trunkMesh, footprintPoints );
        const status = envelopeStatus( sideResults );
        const contactFootprint = status === 'attached'
            ? frozenContacts
            : [];
        const deepMediumLine = footprintPoints.map( ( point ) => freezePoint(
            new THREE.Vector3(
                point.x,
                terrainHeightAt( membrane, point.x, point.z ) - deepMediumDepth,
                point.z
            )
        ) );
        revision += 1;
        snapshot = Object.freeze( {
            revision,
            status,
            geometryUuid: source.geometryUuid,
            radialSegments: source.radialSegments,
            sideRingCount: source.sideRingCount,
            plantingRingIndex: source.plantingRingIndex,
            anchor: freezePoint( anchor ),
            plantingRootFootprint: Object.freeze( frozenFootprint ),
            plantedBaseLine: Object.freeze( basePoints.map( freezePoint ) ),
            contactBySide: Object.freeze( frozenContacts ),
            contactLine: Object.freeze(
                frozenContacts.filter( ( point ) => point !== null )
            ),
            contactFootprint: Object.freeze( contactFootprint.slice() ),
            deepMediumLine: Object.freeze( deepMediumLine ),
            sideDispositions: Object.freeze(
                sideResults.map( ( result ) => result.disposition )
            ),
            contactCount: contactPoints.filter( Boolean ).length,
            baseBurialDepths: Object.freeze( baseBurialDepths.slice() ),
            deepMediumDepth,
            surfaceBandHalfThickness,
            characteristicFootprintRadius: characteristicRadius
        } );
        group.userData.plantingEnvelope = snapshot;
        updateDiagnostics( snapshot );
        return snapshot;
    }

    function sample( x, y, z )
    {
        if ( disposed ) throw new Error( 'The planting envelope is disposed.' );
        if ( !snapshot )
        {
            throw new Error( 'Update the planting envelope before sampling it.' );
        }
        for ( const value of [ x, y, z ] )
        {
            if ( !Number.isFinite( value ) )
            {
                throw new TypeError( 'Planting samples must be finite.' );
            }
        }
        const terrainHeight = terrainHeightAt( membrane, x, z );
        const signedTerrainDistance = y - terrainHeight;
        const anchorDepth = Math.abs( terrainHeightAt( membrane, 0, 0 ) );
        const wellInfluence = anchorDepth <= Number.EPSILON
            ? 0
            : THREE.MathUtils.clamp(
                Math.abs( terrainHeight ) / anchorDepth,
                0,
                1
            );
        const insidePlantingFootprint = pointInsidePolygon(
            x,
            z,
            snapshot.plantingRootFootprint
        );
        const insideContactFootprint = snapshot.contactFootprint.length >= 3
            && pointInsidePolygon( x, z, snapshot.contactFootprint );
        let band;
        if ( signedTerrainDistance > snapshot.surfaceBandHalfThickness )
        {
            band = 'above-terrain';
        }
        else if ( Math.abs( signedTerrainDistance )
            <= snapshot.surfaceBandHalfThickness )
        {
            band = insideContactFootprint ? 'contact' : 'terrain';
        }
        else if ( -signedTerrainDistance <= snapshot.deepMediumDepth )
        {
            band = 'buried';
        }
        else
        {
            band = 'deep-medium';
        }
        return Object.freeze( {
            terrainHeight,
            signedTerrainDistance,
            wellInfluence,
            insideFootprint: insideContactFootprint,
            insidePlantingFootprint,
            insideContactFootprint,
            band
        } );
    }

    return {
        group,
        update,
        getSnapshot() {
            return snapshot;
        },
        sample,
        setDiagnosticVisible( visible ) {
            if ( disposed ) throw new Error( 'The planting envelope is disposed.' );
            group.visible = Boolean( visible );
            return group.visible;
        },
        dispose() {
            if ( disposed ) return;
            disposed = true;
            scene.remove( group );
            for ( const child of group.children )
            {
                child.geometry.dispose();
                child.material.dispose();
            }
            group.clear();
            snapshot = null;
        }
    };
}

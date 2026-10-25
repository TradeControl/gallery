import * as THREE from 'three';

const drySample = Object.freeze( {
    signedDistance: Number.POSITIVE_INFINITY,
    closestX: 0,
    closestZ: 0,
    normalX: 0,
    normalZ: 0
} );

function edgeNormal( first, second, winding )
{
    const edgeX = second.x - first.x;
    const edgeZ = second.z - first.z;
    const length = Math.hypot( edgeX, edgeZ ) || 1;
    return winding > 0
        ? { x: edgeZ / length, z: -edgeX / length }
        : { x: -edgeZ / length, z: edgeX / length };
}

function rebuildBoundary( snapshot )
{
    if ( snapshot?.status !== 'attached' || snapshot.contactFootprint.length < 3 )
    {
        return null;
    }
    const points = snapshot.contactFootprint.map( ( point ) => Object.freeze( {
        x: point[0],
        y: point[1],
        z: point[2]
    } ) );
    let twiceArea = 0;
    for ( let index = 0; index < points.length; index += 1 )
    {
        const next = points[( index + 1 ) % points.length];
        twiceArea += points[index].x * next.z - next.x * points[index].z;
    }
    const winding = Math.sign( twiceArea ) || 1;
    const edges = points.map( ( first, index ) => {
        const second = points[( index + 1 ) % points.length];
        const normal = edgeNormal( first, second, winding );
        return Object.freeze( {
            first,
            second,
            normalX: normal.x,
            normalZ: normal.z,
            elevation: ( first.y + second.y ) * 0.5,
            lengthSquared: ( second.x - first.x ) ** 2
                + ( second.z - first.z ) ** 2
        } );
    } );
    const vertexNormals = points.map( ( _, index ) => {
        const previous = edges[( index + edges.length - 1 ) % edges.length];
        const next = edges[index];
        const x = previous.normalX + next.normalX;
        const z = previous.normalZ + next.normalZ;
        const length = Math.hypot( x, z ) || 1;
        const normalX = x / length;
        const normalZ = z / length;
        const miterScale = THREE.MathUtils.clamp(
            1 / Math.max(
                normalX * next.normalX + normalZ * next.normalZ,
                0.35
            ),
            1,
            1.65
        );
        return Object.freeze( { normalX, normalZ, miterScale } );
    } );
    const orderedByElevation = edges
        .map( ( edge, index ) => ( { index, elevation: edge.elevation } ) )
        .sort( ( first, second ) => first.elevation - second.elevation );
    const drainEdgeIndices = [ orderedByElevation[0].index ];
    const minimumSeparation = Math.max( 2, Math.floor( edges.length / 3 ) );
    const secondDrain = orderedByElevation.find( ( candidate ) => {
        const difference = Math.abs( candidate.index - drainEdgeIndices[0] );
        const separation = Math.min( difference, edges.length - difference );
        return separation >= minimumSeparation;
    } );
    if ( secondDrain ) drainEdgeIndices.push( secondDrain.index );
    return Object.freeze( {
        revision: snapshot.revision,
        characteristicRadius: snapshot.characteristicFootprintRadius,
        points: Object.freeze( points ),
        edges: Object.freeze( edges ),
        vertexNormals: Object.freeze( vertexNormals ),
        bounds: Object.freeze( {
            minX: Math.min( ...points.map( ( point ) => point.x ) ),
            maxX: Math.max( ...points.map( ( point ) => point.x ) ),
            minZ: Math.min( ...points.map( ( point ) => point.z ) ),
            maxZ: Math.max( ...points.map( ( point ) => point.z ) )
        } ),
        drainEdgeIndices: Object.freeze( drainEdgeIndices )
    } );
}

export function createAnalyticalContactBoundary( plantingEnvelope )
{
    let enabled = true;
    let sourceRevision = -1;
    let localRevision = 0;
    let shape = null;

    function synchronize()
    {
        const snapshot = plantingEnvelope.getSnapshot();
        const revision = snapshot?.revision ?? -1;
        if ( revision === sourceRevision ) return;
        sourceRevision = revision;
        shape = rebuildBoundary( snapshot );
        localRevision += 1;
    }

    function sample( x, z )
    {
        synchronize();
        if ( !enabled || !shape ) return drySample;
        if (
            x < shape.bounds.minX - 0.75
                || x > shape.bounds.maxX + 0.75
                || z < shape.bounds.minZ - 0.75
                || z > shape.bounds.maxZ + 0.75
        ) return drySample;
        let inside = false;
        let nearestDistanceSquared = Number.POSITIVE_INFINITY;
        let closestX = 0;
        let closestZ = 0;
        let normalX = 0;
        let normalZ = 0;
        let edgeIndex = -1;
        for ( let index = 0; index < shape.edges.length; index += 1 )
        {
            const edge = shape.edges[index];
            const { first, second } = edge;
            if (
                ( first.z > z ) !== ( second.z > z )
                && x < ( second.x - first.x ) * ( z - first.z )
                    / ( second.z - first.z ) + first.x
            ) inside = !inside;
            const progress = THREE.MathUtils.clamp(
                ( ( x - first.x ) * ( second.x - first.x )
                    + ( z - first.z ) * ( second.z - first.z ) )
                    / Math.max( edge.lengthSquared, Number.EPSILON ),
                0,
                1
            );
            const candidateX = THREE.MathUtils.lerp( first.x, second.x, progress );
            const candidateZ = THREE.MathUtils.lerp( first.z, second.z, progress );
            const distanceSquared = ( x - candidateX ) ** 2
                + ( z - candidateZ ) ** 2;
            if ( distanceSquared < nearestDistanceSquared )
            {
                nearestDistanceSquared = distanceSquared;
                closestX = candidateX;
                closestZ = candidateZ;
                normalX = edge.normalX;
                normalZ = edge.normalZ;
                edgeIndex = index;
            }
        }
        const distance = Math.sqrt( nearestDistanceSquared );
        if ( distance > 1e-9 )
        {
            const direction = inside ? -1 : 1;
            normalX = ( x - closestX ) / distance * direction;
            normalZ = ( z - closestZ ) / distance * direction;
        }
        return {
            signedDistance: ( inside ? -1 : 1 ) * distance,
            closestX,
            closestZ,
            normalX,
            normalZ,
            edgeIndex,
            drainEligible: shape.drainEdgeIndices.includes( edgeIndex )
        };
    }

    return Object.freeze( {
        sample,
        synchronize,
        get revision() { synchronize(); return localRevision; },
        get shape() { synchronize(); return enabled ? shape : null; },
        get bounds() { synchronize(); return enabled ? shape?.bounds ?? null : null; },
        setActive( active ) {
            const next = Boolean( active );
            if ( next === enabled ) return;
            enabled = next;
            localRevision += 1;
        }
    } );
}

function createMeniscusMaterial()
{
    return new THREE.ShaderMaterial( {
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        vertexShader: `
            attribute float contactCoverage;
            attribute float contactHeat;
            varying float vCoverage;
            varying float vHeat;

            void main()
            {
                vCoverage = contactCoverage;
                vHeat = contactHeat;
                gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
            }
        `,
        fragmentShader: `
            varying float vCoverage;
            varying float vHeat;

            void main()
            {
                if ( vCoverage < 0.012 ) discard;
                vec3 cooled = vec3( 0.055, 0.009, 0.004 );
                vec3 warm = vec3( 0.46, 0.038, 0.006 );
                vec3 hot = vec3( 0.95, 0.25, 0.018 );
                vec3 color = mix( cooled, warm, 0.3 + vHeat * 0.52 );
                color = mix( color, hot, vCoverage * vHeat * 0.62 );
                gl_FragColor = vec4( color, vCoverage * 0.94 );
            }
        `
    } );
}

function smoothstep( edge0, edge1, value )
{
    const progress = THREE.MathUtils.clamp(
        ( value - edge0 ) / Math.max( edge1 - edge0, Number.EPSILON ),
        0,
        1
    );
    return progress * progress * ( 3 - 2 * progress );
}

export function createCompositionMoltenContact( {
    scene,
    membrane,
    plantingEnvelope,
    moltenField,
    getContactDiagnostics,
    threshold
} )
{
    const boundary = createAnalyticalContactBoundary( plantingEnvelope );
    const maximumSegments = 32;
    const positions = new Float32Array( maximumSegments * 4 * 3 );
    const coverageAttribute = new Float32Array( maximumSegments * 4 );
    const heatAttribute = new Float32Array( maximumSegments * 4 );
    const indices = new Uint16Array( maximumSegments * 6 );
    for ( let segment = 0; segment < maximumSegments; segment += 1 )
    {
        const vertex = segment * 4;
        const offset = segment * 6;
        indices[offset] = vertex;
        indices[offset + 1] = vertex + 1;
        indices[offset + 2] = vertex + 2;
        indices[offset + 3] = vertex + 2;
        indices[offset + 4] = vertex + 1;
        indices[offset + 5] = vertex + 3;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
    geometry.setAttribute(
        'contactCoverage',
        new THREE.BufferAttribute( coverageAttribute, 1 )
    );
    geometry.setAttribute( 'contactHeat', new THREE.BufferAttribute( heatAttribute, 1 ) );
    geometry.setIndex( new THREE.BufferAttribute( indices, 1 ) );
    geometry.setDrawRange( 0, 0 );
    const material = createMeniscusMaterial();
    const mesh = new THREE.Mesh( geometry, material );
    mesh.name = 'Composition molten contact meniscus';
    mesh.renderOrder = 7;
    mesh.frustumCulled = false;
    mesh.visible = false;
    scene.add( mesh );

    const smoothedCoverage = new Float32Array( maximumSegments );
    let requestedVisible = true;
    let previousTime = null;
    let renderedBoundaryRevision = -1;
    let snapshot = Object.freeze( {
        status: 'dry',
        activeSectorCount: 0,
        maximumLift: 0,
        sampledMass: 0,
        boundaryRevision: boundary.revision,
        fieldRevision: moltenField.revision,
        divertedParcelCount: 0,
        settledParcelCount: 0,
        activeContactParcelCount: 0
    } );

    function updateVertex( vertex, x, y, z, coverage, heat )
    {
        const positionOffset = vertex * 3;
        positions[positionOffset] = x;
        positions[positionOffset + 1] = y;
        positions[positionOffset + 2] = z;
        coverageAttribute[vertex] = coverage;
        heatAttribute[vertex] = heat;
    }

    function update( time )
    {
        const boundaryRevision = boundary.revision;
        const shape = boundary.shape;
        if ( boundaryRevision !== renderedBoundaryRevision )
        {
            renderedBoundaryRevision = boundaryRevision;
            smoothedCoverage.fill( 0 );
            previousTime = null;
        }
        const delta = previousTime === null
            ? 1 / 60
            : THREE.MathUtils.clamp( ( time - previousTime ) / 1000, 0, 0.1 );
        previousTime = time;
        if ( !shape )
        {
            mesh.visible = false;
            geometry.setDrawRange( 0, 0 );
            coverageAttribute.fill( 0 );
            heatAttribute.fill( 0 );
            const diagnostics = getContactDiagnostics();
            snapshot = Object.freeze( {
                status: 'dry',
                activeSectorCount: 0,
                maximumLift: 0,
                sampledMass: 0,
                boundaryRevision,
                fieldRevision: moltenField.revision,
                divertedParcelCount: diagnostics.divertedParcelCount,
                settledParcelCount: diagnostics.settledParcelCount,
                activeContactParcelCount:
                    diagnostics.activeContactParcelCount ?? 0
            } );
            return snapshot;
        }
        const segmentCount = Math.min( shape.edges.length, maximumSegments );
        const localThreshold = typeof threshold === 'function'
            ? threshold()
            : threshold;
        let activeSectorCount = 0;
        let maximumLift = 0;
        let sampledMass = 0;
        for ( let segment = 0; segment < segmentCount; segment += 1 )
        {
            const edge = shape.edges[segment];
            const midpointX = ( edge.first.x + edge.second.x ) * 0.5;
            const midpointZ = ( edge.first.z + edge.second.z ) * 0.5;
            const samplingDistance = 0.13 + shape.characteristicRadius * 0.065;
            const molten = moltenField.sample(
                midpointX + edge.normalX * samplingDistance,
                midpointZ + edge.normalZ * samplingDistance
            );
            const targetCoverage = smoothstep(
                localThreshold * 0.75,
                localThreshold + 0.16,
                molten.density
            );
            const timeConstant = targetCoverage > smoothedCoverage[segment]
                ? 0.12
                : 0.75;
            const blend = 1 - Math.exp( -delta / timeConstant );
            smoothedCoverage[segment] = THREE.MathUtils.lerp(
                smoothedCoverage[segment],
                targetCoverage,
                blend
            );
            const coverage = smoothedCoverage[segment];
            const lapHeight = coverage
                * ( 0.025 + 0.13 * Math.min( molten.density, 1.5 ) )
                * ( 0.55 + 0.45 * molten.heat );
            const innerOffset = 0.018;
            const outerOffset = samplingDistance + 0.095;
            const moltenLift = 0.035 + Math.min( molten.density, 1.5 ) * 0.055;
            const vertex = segment * 4;
            const firstNormal = shape.vertexNormals[segment];
            const secondNormal = shape.vertexNormals[
                ( segment + 1 ) % segmentCount
            ];
            const firstInnerX = edge.first.x
                + firstNormal.normalX * innerOffset * firstNormal.miterScale;
            const firstInnerZ = edge.first.z
                + firstNormal.normalZ * innerOffset * firstNormal.miterScale;
            const firstOuterX = edge.first.x
                + firstNormal.normalX * outerOffset * firstNormal.miterScale;
            const firstOuterZ = edge.first.z
                + firstNormal.normalZ * outerOffset * firstNormal.miterScale;
            const secondInnerX = edge.second.x
                + secondNormal.normalX * innerOffset * secondNormal.miterScale;
            const secondInnerZ = edge.second.z
                + secondNormal.normalZ * innerOffset * secondNormal.miterScale;
            const secondOuterX = edge.second.x
                + secondNormal.normalX * outerOffset * secondNormal.miterScale;
            const secondOuterZ = edge.second.z
                + secondNormal.normalZ * outerOffset * secondNormal.miterScale;
            updateVertex(
                vertex,
                firstInnerX,
                membrane.height( firstInnerX, firstInnerZ ) + moltenLift + lapHeight,
                firstInnerZ,
                coverage,
                molten.heat
            );
            updateVertex(
                vertex + 1,
                firstOuterX,
                membrane.height( firstOuterX, firstOuterZ ) + moltenLift,
                firstOuterZ,
                coverage,
                molten.heat
            );
            updateVertex(
                vertex + 2,
                secondInnerX,
                membrane.height( secondInnerX, secondInnerZ ) + moltenLift + lapHeight,
                secondInnerZ,
                coverage,
                molten.heat
            );
            updateVertex(
                vertex + 3,
                secondOuterX,
                membrane.height( secondOuterX, secondOuterZ ) + moltenLift,
                secondOuterZ,
                coverage,
                molten.heat
            );
            if ( coverage > 0.035 ) activeSectorCount += 1;
            maximumLift = Math.max( maximumLift, lapHeight );
            sampledMass += molten.density;
        }
        geometry.setDrawRange( 0, segmentCount * 6 );
        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.contactCoverage.needsUpdate = true;
        geometry.attributes.contactHeat.needsUpdate = true;
        mesh.visible = requestedVisible && activeSectorCount > 0;
        const diagnostics = getContactDiagnostics();
        const status = activeSectorCount === 0
            ? 'dry'
            : ( activeSectorCount >= Math.max( 3, segmentCount * 0.3 )
                && maximumLift >= 0.075 ? 'lapping' : 'wetting' );
        snapshot = Object.freeze( {
            status,
            activeSectorCount,
            maximumLift,
            sampledMass,
            boundaryRevision,
            fieldRevision: moltenField.revision,
            divertedParcelCount: diagnostics.divertedParcelCount,
            settledParcelCount: diagnostics.settledParcelCount,
            activeContactParcelCount: diagnostics.activeContactParcelCount ?? 0
        } );
        return snapshot;
    }

    function reset()
    {
        smoothedCoverage.fill( 0 );
        coverageAttribute.fill( 0 );
        heatAttribute.fill( 0 );
        mesh.visible = false;
        geometry.setDrawRange( 0, 0 );
        previousTime = null;
        renderedBoundaryRevision = boundary.revision;
        snapshot = Object.freeze( {
            status: 'dry',
            activeSectorCount: 0,
            maximumLift: 0,
            sampledMass: 0,
            boundaryRevision: boundary.revision,
            fieldRevision: moltenField.revision,
            divertedParcelCount: 0,
            settledParcelCount: 0,
            activeContactParcelCount: 0
        } );
        return snapshot;
    }

    return Object.freeze( {
        boundary,
        mesh,
        update,
        reset,
        getSnapshot() { return snapshot; },
        setActive( active ) {
            boundary.setActive( active );
            if ( !active ) reset();
        },
        setVisible( visible ) {
            requestedVisible = Boolean( visible );
            mesh.visible = requestedVisible && snapshot.activeSectorCount > 0;
        },
        dispose() {
            scene.remove( mesh );
            geometry.dispose();
            material.dispose();
        }
    } );
}

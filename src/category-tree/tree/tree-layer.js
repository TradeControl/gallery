import * as THREE from 'three';

const roleColours = {
    root: 0xd6a34a,
    trunk: 0xa96843,
    total: 0x759bb2,
    category: 0x78917c,
    terminal: 0xd3d0c2
};

const junctionScales = {
    root: 0.46,
    trunk: 0.4,
    total: 0.3,
    category: 0.2,
    terminal: 0.12
};

const conduitScales = {
    root: 0.34,
    trunk: 0.28,
    total: 0.16,
    category: 0.085,
    terminal: 0.035
};

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

export function createBranchCurve( start, end, edge, asymmetry )
{
    const delta = end.clone().sub( start );
    const length = delta.length();
    const isTrunk = ( edge.parent.kind === 'root' || edge.parent.kind === 'trunk' )
        && edge.child.kind === 'trunk';
    const tangent = delta.clone().normalize();
    let lateral = new THREE.Vector3().crossVectors( tangent, new THREE.Vector3( 0, 1, 0 ) );

    if ( lateral.lengthSq() < 0.0001 )
    {
        const angle = stableOffset( `${edge.child.id}-trunk-angle` ) * Math.PI;
        lateral.set( Math.cos( angle ), 0, Math.sin( angle ) );
    }
    else
    {
        lateral.normalize();
    }

    const bend = length * ( isTrunk ? 0.045 : 0.12 + asymmetry * 0.16 )
        * stableOffset( `${edge.child.id}-bend` );
    const lift = isTrunk ? 0 : length * ( 0.12 + asymmetry * 0.09 );
    const controlA = start.clone()
        .addScaledVector( delta, 0.24 )
        .addScaledVector( lateral, bend )
        .add( new THREE.Vector3( 0, lift, 0 ) );
    const controlB = start.clone()
        .addScaledVector( delta, 0.68 )
        .addScaledVector( lateral, -bend * 0.35 )
        .add( new THREE.Vector3( 0, lift * 0.45, 0 ) );

    return new THREE.CubicBezierCurve3( start, controlA, controlB, end );
}

export function getConduitRadii( edge, conduitWeight = 1 )
{
    return {
        start: ( edge.parent.supportRadius ?? conduitScales[edge.parent.kind] ) * conduitWeight,
        end: ( edge.child.supportRadius ?? conduitScales[edge.child.kind] ) * conduitWeight * 0.9
    };
}

export function createTaperedTubeGeometry( curve, startRadius, endRadius, tubularSegments = 20, radialSegments = 12 )
{
    const frames = curve.computeFrenetFrames( tubularSegments, false );
    const vertices = [];
    const indices = [];

    for ( let ring = 0; ring <= tubularSegments; ring += 1 )
    {
        const t = ring / tubularSegments;
        const point = curve.getPointAt( t );
        const blend = t * t * ( 3 - 2 * t );
        const radius = THREE.MathUtils.lerp( startRadius, endRadius, blend );

        for ( let side = 0; side < radialSegments; side += 1 )
        {
            const angle = side / radialSegments * Math.PI * 2;
            const offset = frames.normals[ring].clone().multiplyScalar( Math.cos( angle ) * radius )
                .addScaledVector( frames.binormals[ring], Math.sin( angle ) * radius );
            vertices.push( point.x + offset.x, point.y + offset.y, point.z + offset.z );
        }
    }

    for ( let ring = 0; ring < tubularSegments; ring += 1 )
    {
        for ( let side = 0; side < radialSegments; side += 1 )
        {
            const nextSide = ( side + 1 ) % radialSegments;
            const a = ring * radialSegments + side;
            const b = ( ring + 1 ) * radialSegments + side;
            const c = ( ring + 1 ) * radialSegments + nextSide;
            const d = ring * radialSegments + nextSide;
            indices.push( a, b, d, b, c, d );
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
    geometry.setIndex( indices );
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
}

export function createTreeLayer( hierarchy, initialPositions, initialParameters = {} )
{
    const group = new THREE.Group();
    group.name = 'tree-layer';

    const edgeGroup = new THREE.Group();
    edgeGroup.name = 'finite-parent-child-connections';
    const nodeGroup = new THREE.Group();
    nodeGroup.name = 'hierarchy-junctions';
    const axes = new THREE.AxesHelper( 2.4 );
    axes.name = 'tree-local-axes';
    axes.visible = false;

    const branchMaterial = new THREE.MeshStandardMaterial( {
        color: 0x777b78,
        roughness: 0.8,
        metalness: 0.1
    } );
    const trunkMaterial = new THREE.MeshStandardMaterial( {
        color: 0x6f5c4b,
        roughness: 0.84,
        metalness: 0.08
    } );
    const structuralMaterials = {
        root: trunkMaterial,
        trunk: trunkMaterial,
        total: branchMaterial,
        category: branchMaterial,
        terminal: branchMaterial
    };
    const roleMaterials = Object.fromEntries( Object.entries( roleColours ).map( ( [ kind, colour ] ) => [
        kind,
        new THREE.MeshStandardMaterial( {
            color: colour,
            roughness: 0.68,
            metalness: 0.1
        } )
    ] ) );

    const subtreeLoads = new Map();
    function countTerminalLoad( node )
    {
        const load = node.children.length === 0
            ? 1
            : node.children.reduce( ( sum, child ) => sum + countTerminalLoad( child ), 0 );
        subtreeLoads.set( node.id, load );
        return load;
    }
    countTerminalLoad( hierarchy.root );

    const nodeGeometry = new THREE.IcosahedronGeometry( 1, 2 );
    const nodeMeshes = new Map();
    for ( const node of hierarchy.nodes )
    {
        const mesh = new THREE.Mesh( nodeGeometry, roleMaterials[node.kind] );
        mesh.name = `${node.kind}: ${node.label}`;
        mesh.userData.node = node;
        nodeMeshes.set( node.id, mesh );
        nodeGroup.add( mesh );
    }

    let roleColoursVisible = true;
    let nodesVisible = true;
    let growthProgress = new Map();

    function applyGrowthProgress()
    {
        for ( const connection of edgeGroup.children )
        {
            const node = connection.userData.edge.child;
            const progress = node.growthEligible === false
                ? 0
                : node.latent ? ( growthProgress.get( node.id ) ?? 0 ) : 1;
            const indexCount = connection.geometry.index.count;
            const segmentCount = Math.floor( progress * 14 );
            connection.geometry.setDrawRange( 0, Math.min( indexCount, segmentCount * 9 * 6 ) );
            connection.visible = progress > 0;
        }

        for ( const node of hierarchy.nodes )
        {
            const progress = node.growthEligible === false
                ? 0
                : node.latent ? ( growthProgress.get( node.id ) ?? 0 ) : 1;
            nodeMeshes.get( node.id ).visible = nodesVisible && progress >= 0.98;
        }
    }

    function update( positions, parameters = {} )
    {
        const conduitWeight = parameters.conduitWeight ?? 1;
        const junctionScale = parameters.junctionScale ?? 1;
        const asymmetry = parameters.asymmetry ?? 0.55;

        while ( edgeGroup.children.length > 0 )
        {
            const child = edgeGroup.children.at( -1 );
            edgeGroup.remove( child );
            child.geometry.dispose();
        }

        for ( const edge of hierarchy.edges )
        {
            const startData = positions.get( edge.parent.id );
            const endData = positions.get( edge.child.id );
            const start = new THREE.Vector3( startData.x, startData.y, startData.z );
            const end = new THREE.Vector3( endData.x, endData.y, endData.z );
            const isTrunk = ( edge.parent.kind === 'root' || edge.parent.kind === 'trunk' )
                && edge.child.kind === 'trunk';
            const radii = getConduitRadii( edge, conduitWeight );
            const startRadius = radii.start;
            const endRadius = radii.end;
            const curve = createBranchCurve( start, end, edge, asymmetry );
            const connection = new THREE.Mesh(
                createTaperedTubeGeometry( curve, startRadius, endRadius ),
                isTrunk ? trunkMaterial : branchMaterial
            );
            connection.name = `${edge.parent.id} -> ${edge.child.id}`;
            connection.userData.edge = edge;
            edgeGroup.add( connection );
        }

        for ( const node of hierarchy.nodes )
        {
            const position = positions.get( node.id );
            const mesh = nodeMeshes.get( node.id );
            const loadScale = 1 + Math.log2( subtreeLoads.get( node.id ) + 1 ) * 0.045;
            const scale = junctionScales[node.kind] * loadScale * junctionScale;
            mesh.position.set( position.x, position.y, position.z );
            mesh.scale.setScalar( scale );
            mesh.material = roleColoursVisible ? roleMaterials[node.kind] : structuralMaterials[node.kind];
        }

        applyGrowthProgress();
    }

    group.add( edgeGroup, nodeGroup, axes );
    update( initialPositions, initialParameters );

    return {
        group,
        update,
        setNodesVisible( visible ) {
            nodesVisible = visible;
            nodeGroup.visible = true;
            applyGrowthProgress();
        },
        setEdgesVisible( visible ) {
            edgeGroup.visible = visible;
        },
        setAxesVisible( visible ) {
            axes.visible = visible;
        },
        setRoleColoursVisible( visible ) {
            roleColoursVisible = visible;
            nodeMeshes.forEach( ( mesh ) => {
                mesh.material = visible
                    ? roleMaterials[mesh.userData.node.kind]
                    : structuralMaterials[mesh.userData.node.kind];
            } );
        },
        setGrowthProgress( progress ) {
            growthProgress = progress;
            applyGrowthProgress();
        },
        setVisible( visible ) {
            group.visible = visible;
        }
    };
}

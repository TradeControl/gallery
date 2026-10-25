import * as THREE from 'three';

export const castingTerrainApronDefaults = Object.freeze( {
    innerRadius: 9.5,
    supportRadius: 18,
    outerRadius: 23,
    overlapDepth: 0,
    sinkDepth: 6.5,
    radialSegments: 36,
    angularSegments: 192
} );

export const castingTerrainCoreDefaults = Object.freeze( {
    radius: castingTerrainApronDefaults.innerRadius,
    radialSegments: 72,
    angularSegments: castingTerrainApronDefaults.angularSegments
} );

function smoothstep01( value )
{
    const bounded = THREE.MathUtils.clamp( value, 0, 1 );
    return bounded * bounded * ( 3 - 2 * bounded );
}

export function createGaussianMembrane( parameters, options = {} )
{
    const size = options.size ?? 24;

    function height( x, z )
    {
        return -parameters.depth * Math.exp( -( x * x + z * z ) / ( parameters.width * parameters.width ) );
    }

    function gradient( x, z )
    {
        const widthSquared = parameters.width * parameters.width;
        const factor = 2 * parameters.depth * Math.exp( -( x * x + z * z ) / widthSquared ) / widthSquared;
        return { x: factor * x, z: factor * z };
    }

    function createGeometry( segments, overrides = {} )
    {
        const geometrySize = overrides.size ?? size;
        if ( !Number.isFinite( geometrySize ) || geometrySize <= 0 )
        {
            throw new RangeError( 'Membrane geometry size must be finite and positive.' );
        }
        const geometry = new THREE.PlaneGeometry(
            geometrySize,
            geometrySize,
            segments,
            segments
        );
        geometry.rotateX( -Math.PI / 2 );
        geometry.userData.materialPositions = Float32Array.from( geometry.attributes.position.array );
        geometry.userData.membraneSize = geometrySize;
        return geometry;
    }

    function createTerrainCoreGeometry( overrides = {} )
    {
        const scale = size / 24;
        const settings = {
            radius: castingTerrainCoreDefaults.radius * scale,
            radialSegments: castingTerrainCoreDefaults.radialSegments,
            angularSegments: castingTerrainCoreDefaults.angularSegments,
            ...overrides
        };
        if ( !Number.isFinite( settings.radius ) || settings.radius <= 0 )
        {
            throw new RangeError(
                'Terrain core radius must be finite and positive.'
            );
        }
        if ( !Number.isInteger( settings.radialSegments )
            || settings.radialSegments < 1 )
        {
            throw new RangeError(
                'Terrain core radialSegments must be a positive integer.'
            );
        }
        if ( !Number.isInteger( settings.angularSegments )
            || settings.angularSegments < 8 )
        {
            throw new RangeError(
                'Terrain core angularSegments must be an integer of at least 8.'
            );
        }

        const positions = [ 0, 0, 0 ];
        const uvs = [ 0.5, 0.5 ];
        for ( let ring = 1; ring <= settings.radialSegments; ring += 1 )
        {
            const radius = ring / settings.radialSegments * settings.radius;
            for ( let angleIndex = 0;
                angleIndex < settings.angularSegments;
                angleIndex += 1 )
            {
                const angle = angleIndex
                    / settings.angularSegments
                    * Math.PI
                    * 2;
                const x = Math.cos( angle ) * radius;
                const z = Math.sin( angle ) * radius;
                positions.push( x, 0, z );
                uvs.push(
                    x / ( settings.radius * 2 ) + 0.5,
                    z / ( settings.radius * 2 ) + 0.5
                );
            }
        }

        const indices = [];
        for ( let angleIndex = 0;
            angleIndex < settings.angularSegments;
            angleIndex += 1 )
        {
            const current = 1 + angleIndex;
            const next = 1 + ( angleIndex + 1 ) % settings.angularSegments;
            indices.push( 0, next, current );
        }
        for ( let ring = 1; ring < settings.radialSegments; ring += 1 )
        {
            const innerRing = 1
                + ( ring - 1 ) * settings.angularSegments;
            const outerRing = 1 + ring * settings.angularSegments;
            for ( let angleIndex = 0;
                angleIndex < settings.angularSegments;
                angleIndex += 1 )
            {
                const nextAngle = ( angleIndex + 1 )
                    % settings.angularSegments;
                const innerCurrent = innerRing + angleIndex;
                const innerNext = innerRing + nextAngle;
                const outerCurrent = outerRing + angleIndex;
                const outerNext = outerRing + nextAngle;
                indices.push(
                    innerCurrent,
                    innerNext,
                    outerCurrent,
                    innerNext,
                    outerNext,
                    outerCurrent
                );
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.name = 'Casting terrain radial core';
        geometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute( positions, 3 )
        );
        geometry.setAttribute(
            'uv',
            new THREE.Float32BufferAttribute( uvs, 2 )
        );
        geometry.setIndex( indices );
        geometry.userData.materialPositions = Float32Array.from( positions );
        geometry.userData.terrainCore = Object.freeze( { ...settings } );
        deform( geometry );
        return geometry;
    }

    function createTerrainApronGeometry( overrides = {} )
    {
        const scale = size / 24;
        const settings = {
            innerRadius: castingTerrainApronDefaults.innerRadius * scale,
            supportRadius: castingTerrainApronDefaults.supportRadius * scale,
            outerRadius: castingTerrainApronDefaults.outerRadius * scale,
            overlapDepth: castingTerrainApronDefaults.overlapDepth * scale,
            sinkDepth: castingTerrainApronDefaults.sinkDepth * scale,
            radialSegments: castingTerrainApronDefaults.radialSegments,
            angularSegments: castingTerrainApronDefaults.angularSegments,
            ...overrides
        };
        if ( !Number.isInteger( settings.radialSegments )
            || settings.radialSegments < 2 )
        {
            throw new RangeError(
                'Terrain apron radialSegments must be an integer of at least 2.'
            );
        }
        if ( !Number.isInteger( settings.angularSegments )
            || settings.angularSegments < 8 )
        {
            throw new RangeError(
                'Terrain apron angularSegments must be an integer of at least 8.'
            );
        }
        for ( const property of [
            'innerRadius',
            'supportRadius',
            'outerRadius',
            'overlapDepth',
            'sinkDepth'
        ] )
        {
            if ( !Number.isFinite( settings[property] ) )
            {
                throw new TypeError( `Terrain apron ${property} must be finite.` );
            }
        }
        if ( settings.innerRadius <= 0
            || settings.supportRadius <= settings.innerRadius
            || settings.outerRadius <= settings.supportRadius )
        {
            throw new RangeError(
                'Terrain apron radii must increase from inner through support to outer.'
            );
        }
        if ( settings.overlapDepth < 0 || settings.sinkDepth <= 0 )
        {
            throw new RangeError(
                'Terrain apron overlap must be non-negative and sink depth positive.'
            );
        }

        const positions = [];
        const uvs = [];
        const sinkOffsets = [];
        const outerRadii = [];
        for ( let angleIndex = 0;
            angleIndex < settings.angularSegments;
            angleIndex += 1 )
        {
            const angle = angleIndex / settings.angularSegments * Math.PI * 2;
            const boundaryVariation = (
                Math.sin( angle * 3 + 0.41 ) * 0.72
                + Math.sin( angle * 7 - 1.13 ) * 0.43
                + Math.sin( angle * 13 + 2.07 ) * 0.24
            ) * scale;
            outerRadii.push( settings.outerRadius + boundaryVariation );
        }

        for ( let ring = 0; ring <= settings.radialSegments; ring += 1 )
        {
            const radialProgress = ring / settings.radialSegments;
            for ( let angleIndex = 0;
                angleIndex < settings.angularSegments;
                angleIndex += 1 )
            {
                const angle = angleIndex
                    / settings.angularSegments
                    * Math.PI
                    * 2;
                const outerRadius = outerRadii[angleIndex];
                const radius = THREE.MathUtils.lerp(
                    settings.innerRadius,
                    outerRadius,
                    radialProgress
                );
                const sinkProgress = smoothstep01(
                    ( radius - settings.supportRadius )
                        / ( outerRadius - settings.supportRadius )
                );
                const x = Math.cos( angle ) * radius;
                const z = Math.sin( angle ) * radius;
                positions.push( x, 0, z );
                uvs.push(
                    x / ( settings.outerRadius * 2 ) + 0.5,
                    z / ( settings.outerRadius * 2 ) + 0.5
                );
                sinkOffsets.push(
                    settings.overlapDepth
                        + settings.sinkDepth * sinkProgress
                );
            }
        }

        const indices = [];
        for ( let ring = 0; ring < settings.radialSegments; ring += 1 )
        {
            const currentRing = ring * settings.angularSegments;
            const nextRing = ( ring + 1 ) * settings.angularSegments;
            for ( let angleIndex = 0;
                angleIndex < settings.angularSegments;
                angleIndex += 1 )
            {
                const nextAngle = ( angleIndex + 1 )
                    % settings.angularSegments;
                const innerCurrent = currentRing + angleIndex;
                const innerNext = currentRing + nextAngle;
                const outerCurrent = nextRing + angleIndex;
                const outerNext = nextRing + nextAngle;
                indices.push(
                    innerCurrent,
                    innerNext,
                    outerCurrent,
                    innerNext,
                    outerNext,
                    outerCurrent
                );
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.name = 'Casting terrain irregular perimeter apron';
        geometry.setAttribute(
            'position',
            new THREE.Float32BufferAttribute( positions, 3 )
        );
        geometry.setAttribute(
            'uv',
            new THREE.Float32BufferAttribute( uvs, 2 )
        );
        geometry.setIndex( indices );
        geometry.userData.materialPositions = Float32Array.from( positions );
        geometry.userData.terrainApronSinkOffsets = Float32Array.from(
            sinkOffsets
        );
        geometry.userData.terrainApron = Object.freeze( {
            innerRadius: settings.innerRadius,
            supportRadius: settings.supportRadius,
            nominalOuterRadius: settings.outerRadius,
            minimumOuterRadius: Math.min( ...outerRadii ),
            maximumOuterRadius: Math.max( ...outerRadii ),
            overlapDepth: settings.overlapDepth,
            sinkDepth: settings.sinkDepth,
            radialSegments: settings.radialSegments,
            angularSegments: settings.angularSegments,
            boundaryShape: 'irregular-radial-sink'
        } );
        deform( geometry );
        return geometry;
    }

    function deform( geometry )
    {
        const positions = geometry.attributes.position;
        const materialPositions = geometry.userData.materialPositions;
        const sinkOffsets = geometry.userData.terrainApronSinkOffsets;
        for ( let index = 0; index < positions.count; index += 1 )
        {
            const offset = index * 3;
            const x = materialPositions[offset];
            const z = materialPositions[offset + 2];
            positions.setXYZ(
                index,
                x,
                height( x, z ) - ( sinkOffsets?.[index] ?? 0 ),
                z
            );
        }
        positions.needsUpdate = true;
        geometry.computeVertexNormals();
        geometry.computeBoundingSphere();
    }

    return {
        height,
        gradient,
        createGeometry,
        createTerrainCoreGeometry,
        createTerrainApronGeometry,
        deform,
        size
    };
}

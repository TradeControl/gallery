import * as THREE from 'three';
import {
    createEnergeticSeaLayer,
    energeticSeaDefaults,
    energeticSeaRanges
} from '../../lib/substrate/index.js';

const extent = 160;
const segments = 260;
const transitionSoftness = 0.52;
const interpolationSafety = 0.02;
const deepClearance = 0.04;
const edgeStartScale = 0.37;
const edgeEndScale = 0.49;
const edgeDropScale = 0.34;
const compositionReflection = 0.8;
const compositionIlluminationScale = 0.42;
// Keep the shared sun-cast colour balance intact. The composition already
// subordinates the entire material-local rig with illuminationScale, so a
// second near-zero warmth multiplier effectively removed the warm cast
// instead of merely dimming it.
const compositionWarmthScale = 1;
const compositionSurfaceColour = 0x041019;

export const compositionSubstrateRenderOrder = -20;

export const compositionSubstrateDefaults = Object.freeze( {
    outerDepth: 1.55
} );

export const compositionSubstrateRanges = Object.freeze( {
    outerDepth: Object.freeze( { min: 1.2, max: 2.4, step: 0.05 } )
} );

export const compositionSubstrateSurfaceDefaults = Object.freeze( {
    ...energeticSeaDefaults,
    reflection: compositionReflection
} );

// The composition changes placement and illumination, not the shared
// material engine's legal parameter space.
export const compositionSubstrateSurfaceRanges = energeticSeaRanges;

function validateFinite( value, label )
{
    if ( !Number.isFinite( value ) )
    {
        throw new TypeError( `${label} must be finite.` );
    }
    return value;
}

function validateOuterDepth( value )
{
    const resolved = validateFinite(
        Number( value ),
        'Composition substrate outer depth'
    );
    const range = compositionSubstrateRanges.outerDepth;
    if ( resolved < range.min || resolved > range.max )
    {
        throw new RangeError(
            `Composition substrate outer depth must be between ${range.min} and ${range.max}.`
        );
    }
    return resolved;
}

function smoothMinimum( first, second, softness )
{
    const blend = THREE.MathUtils.clamp(
        0.5 + 0.5 * ( second - first ) / softness,
        0,
        1
    );
    return THREE.MathUtils.lerp( second, first, blend )
        - softness * blend * ( 1 - blend );
}

function resolveDeepMediumDepth( plantingEnvelope, membrane )
{
    const envelope = plantingEnvelope?.getSnapshot?.();
    if (
        envelope
        && envelope.status !== 'detached'
        && Number.isFinite( envelope.deepMediumDepth )
        && envelope.deepMediumDepth > 0
    )
    {
        return {
            depth: envelope.deepMediumDepth,
            revision: envelope.revision ?? null,
            source: 'planting-envelope'
        };
    }

    const anchorDepth = Math.abs( validateFinite(
        Number( membrane.height( 0, 0 ) ),
        'Composition substrate anchor height'
    ) );
    return {
        depth: THREE.MathUtils.clamp( anchorDepth * 0.12, 0.42, 1.2 ),
        revision: null,
        source: 'membrane-fallback'
    };
}

function estimateMaximumCrest( parameters )
{
    const energyGain = 0.28 + parameters.energy * 0.72;
    const maximumPacketEnergy = 1.48;
    const crossingGain = parameters.crossCurrent / 1.5;
    const maximumCombinedPressure = 0.7
        + maximumPacketEnergy * crossingGain * 0.3;
    const analyticalBound = parameters.swellHeight
        * energyGain
        * maximumCombinedPressure;
    return Math.ceil( analyticalBound * 100 ) / 100;
}

export function createCompositionSubstrate( {
    scene,
    membrane,
    plantingEnvelope = null,
    parameters: parameterOverrides = {}
} )
{
    if ( !scene?.isObject3D || typeof scene.add !== 'function' )
    {
        throw new TypeError( 'A composition substrate requires a Three.js scene.' );
    }
    if ( typeof membrane?.height !== 'function' )
    {
        throw new TypeError(
            'A composition substrate requires a membrane height function.'
        );
    }

    const parameters = {
        outerDepth: validateOuterDepth(
            parameterOverrides.outerDepth
                ?? compositionSubstrateDefaults.outerDepth
        )
    };
    const layer = createEnergeticSeaLayer( {
        scene,
        parameters: compositionSubstrateSurfaceDefaults,
        extent,
        segments,
        illuminationScale: compositionIlluminationScale,
        warmthScale: compositionWarmthScale
    } );
    const { mesh } = layer;
    mesh.name = 'Category Tree energetic substrate';
    mesh.renderOrder = compositionSubstrateRenderOrder;
    mesh.material.color.setHex( compositionSurfaceColour );
    mesh.material.emissive.setHex( 0x000000 );
    mesh.material.metalness = 0;
    mesh.material.roughness = 0.58;
    mesh.material.side = THREE.DoubleSide;
    mesh.material.needsUpdate = true;

    let maximumCrest = estimateMaximumCrest( layer.parameters );
    const edgeStart = extent * edgeStartScale;
    const edgeEnd = extent * edgeEndScale;
    const edgeDrop = extent * edgeDropScale;
    let disposed = false;
    let visible = true;
    let revision = 0;
    let snapshot = null;

    function assertActive()
    {
        if ( disposed ) throw new Error( 'The composition substrate is disposed.' );
    }

    function publishSnapshot( profile = snapshot )
    {
        if ( !profile ) return null;
        const surfaceSnapshot = layer.getSnapshot();
        snapshot = Object.freeze( {
            ...profile,
            status: visible ? 'active' : 'hidden',
            frozen: surfaceSnapshot.frozen,
            surfaceParameters: Object.freeze( { ...layer.parameters } )
        } );
        mesh.userData.compositionSubstrate = snapshot;
        return snapshot;
    }

    function refreshSurface()
    {
        assertActive();
        const boundary = resolveDeepMediumDepth( plantingEnvelope, membrane );
        const position = mesh.geometry.getAttribute( 'position' );
        const outerDatum = -parameters.outerDepth
            - maximumCrest
            - interpolationSafety;
        let minimumHeight = Infinity;
        let maximumHeight = -Infinity;

        for ( let index = 0; index < position.count; index += 1 )
        {
            const x = position.getX( index );
            const z = position.getZ( index );
            const terrainHeight = validateFinite(
                Number( membrane.height( x, z ) ),
                'Composition substrate terrain height'
            );
            const deepBandDatum = terrainHeight
                - boundary.depth
                - deepClearance
                - maximumCrest
                - interpolationSafety;
            const radius = Math.hypot( x, z );
            const edge = THREE.MathUtils.smoothstep(
                radius,
                edgeStart,
                edgeEnd
            );
            const height = smoothMinimum(
                outerDatum,
                deepBandDatum,
                transitionSoftness
            ) - edge * edge * edgeDrop;
            position.setY( index, height );
            minimumHeight = Math.min( minimumHeight, height );
            maximumHeight = Math.max( maximumHeight, height );
        }

        position.needsUpdate = true;
        mesh.geometry.computeVertexNormals();
        mesh.geometry.computeBoundingBox();
        mesh.geometry.computeBoundingSphere();
        revision += 1;
        return publishSnapshot( {
            revision,
            envelopeRevision: boundary.revision,
            depthSource: boundary.source,
            deepMediumDepth: boundary.depth,
            outerDepth: parameters.outerDepth,
            outerSurfaceLevel: -parameters.outerDepth,
            maximumCrest,
            guaranteedDeepClearance: deepClearance,
            interpolationSafety,
            extent,
            segments,
            edgeDrop,
            minimumHeight,
            maximumHeight,
            vertexCount: position.count,
            triangleCount: mesh.geometry.getIndex().count / 3,
            geometryUuid: mesh.geometry.uuid,
            materialUuid: mesh.material.uuid,
            textureInputCount: 0,
            renderOrder: mesh.renderOrder,
            materialOwner: 'energetic-sea-layer',
            visualProfile: 'composition-dark',
            illuminationScale: compositionIlluminationScale,
            warmthScale: compositionWarmthScale
        } );
    }

    refreshSurface();

    return {
        group: layer.group,
        mesh,
        parameters,
        surfaceParameters: layer.parameters,
        refreshSurface,
        setOuterDepth( value ) {
            assertActive();
            parameters.outerDepth = validateOuterDepth( value );
            refreshSurface();
            return parameters.outerDepth;
        },
        setParameter( property, value ) {
            assertActive();
            const resolved = layer.setParameter( property, value );
            if ( [ 'swellHeight', 'energy', 'crossCurrent' ].includes(
                property
            ) )
            {
                maximumCrest = estimateMaximumCrest( layer.parameters );
                refreshSurface();
            }
            else
            {
                publishSnapshot();
            }
            return resolved;
        },
        setFrozen( nextFrozen ) {
            assertActive();
            const frozen = layer.setFrozen( nextFrozen );
            publishSnapshot();
            return frozen;
        },
        reset() {
            assertActive();
            layer.reset();
            layer.setParameter(
                'reflection',
                compositionSubstrateSurfaceDefaults.reflection
            );
            maximumCrest = estimateMaximumCrest( layer.parameters );
            refreshSurface();
            return Object.freeze( { ...layer.parameters } );
        },
        setVisible( nextVisible ) {
            assertActive();
            visible = layer.setVisible( nextVisible );
            publishSnapshot();
            return visible;
        },
        update( time ) {
            assertActive();
            const boundary = resolveDeepMediumDepth(
                plantingEnvelope,
                membrane
            );
            if (
                boundary.revision !== snapshot.envelopeRevision
                || boundary.source !== snapshot.depthSource
                || boundary.depth !== snapshot.deepMediumDepth
            )
            {
                refreshSurface();
            }
            layer.update( time );
            return snapshot;
        },
        getSnapshot() {
            return snapshot;
        },
        dispose() {
            if ( disposed ) return;
            disposed = true;
            layer.dispose();
            snapshot = null;
        }
    };
}

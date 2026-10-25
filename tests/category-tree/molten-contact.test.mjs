import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as THREE from 'three';
import {
    createAnalyticalContactBoundary,
    createCompositionMoltenContact
} from '../../src/category-tree/composition/molten-contact.js';
import {
    resolveMoltenBoundaryContact
} from '../../src/lib/casting-pit/universe/sluice-gate-layer.js';

function contactSnapshot( revision = 1 )
{
    return Object.freeze( {
        revision,
        status: 'attached',
        characteristicFootprintRadius: 1.45,
        contactFootprint: Object.freeze( [
            Object.freeze( [ -1.6, -5.1, -0.8 ] ),
            Object.freeze( [ 1.8, -5.25, -0.7 ] ),
            Object.freeze( [ 1.25, -5.0, 1.0 ] ),
            Object.freeze( [ -1.35, -5.12, 0.9 ] )
        ] )
    } );
}

function envelopeFixture()
{
    let snapshot = contactSnapshot();
    return {
        getSnapshot: () => snapshot,
        replace( next ) { snapshot = next; }
    };
}

function assertNear( actual, expected, tolerance = 1e-6 )
{
    assert.ok(
        Math.abs( actual - expected ) <= tolerance,
        `${actual} must be within ${tolerance} of ${expected}`
    );
}

test( 'the contact boundary retains the measured noncircular planting footprint', () => {
    const envelope = envelopeFixture();
    const boundary = createAnalyticalContactBoundary( envelope );
    const initialRevision = boundary.revision;
    const centre = boundary.sample( 0, 0 );
    const exterior = boundary.sample( 2.4, 0 );

    assert.ok( centre.signedDistance < 0 );
    assert.ok( exterior.signedDistance > 0 );
    assert.ok( exterior.normalX > 0.7 );
    assert.equal( boundary.shape.points.length, 4 );
    assert.equal( boundary.shape.drainEdgeIndices.length, 2 );
    assert.ok( boundary.shape.characteristicRadius > 1 );

    envelope.replace( contactSnapshot( 2 ) );
    assert.ok( boundary.revision > initialRevision );
    boundary.setActive( false );
    assert.equal( boundary.sample( 0, 0 ).signedDistance, Infinity );
    boundary.setActive( true );
    assert.ok( boundary.sample( 0, 0 ).signedDistance < 0 );
} );

test( 'molten parcels sweep to the collar and divert without gaining energy', () => {
    const boundary = createAnalyticalContactBoundary( envelopeFixture() );
    const parcel = {
        x: 0,
        z: 0,
        vx: -3,
        vz: 0,
        footprint: 1,
        mass: 1.3,
        temperature: 0.82,
        sourceIndex: 3
    };
    const before = {
        mass: parcel.mass,
        temperature: parcel.temperature,
        sourceIndex: parcel.sourceIndex,
        speed: Math.hypot( parcel.vx, parcel.vz )
    };
    const result = resolveMoltenBoundaryContact( {
        parcel,
        previousX: 3,
        previousZ: 0,
        boundary,
        timeStep: 1 / 60
    } );

    assert.ok( result );
    assert.ok( boundary.sample( parcel.x, parcel.z ).signedDistance >= 0.1949 );
    assert.ok( Math.abs( parcel.vz ) > 0 );
    assert.ok( Math.hypot( parcel.vx, parcel.vz ) <= before.speed + 1e-9 );
    assert.equal( parcel.mass, before.mass );
    assert.equal( parcel.temperature, before.temperature );
    assert.equal( parcel.sourceIndex, before.sourceIndex );

    const untouched = {
        x: 5,
        z: 5,
        vx: 0.2,
        vz: -0.1,
        footprint: 1,
        mass: 1,
        temperature: 1,
        sourceIndex: 0
    };
    const copy = structuredClone( untouched );
    assert.equal( resolveMoltenBoundaryContact( {
        parcel: untouched,
        previousX: 5.1,
        previousZ: 5.1,
        boundary,
        timeStep: 1 / 60
    } ), null );
    assert.deepEqual( untouched, copy );

    const cornerParcel = {
        x: 1.5,
        z: 0.8,
        vx: -2,
        vz: -2,
        footprint: 1,
        mass: 1,
        temperature: 0.7,
        sourceIndex: 1
    };
    resolveMoltenBoundaryContact( {
        parcel: cornerParcel,
        previousX: 3,
        previousZ: 2.5,
        boundary,
        timeStep: 1 / 60
    } );
    assert.ok(
        boundary.sample( cornerParcel.x, cornerParcel.z ).signedDistance
            >= 0.195 - 1e-7,
        'corner resolution must satisfy the full buffered clearance'
    );
} );

test( 'contact residence and tangential travel produce one bounded drain', () => {
    const boundary = {
        revision: 1,
        sample: () => ( {
            signedDistance: -0.1,
            closestX: 0,
            closestZ: 0,
            normalX: 1,
            normalZ: 0,
            drainEligible: true
        } )
    };
    const parcel = {
        x: -0.1,
        z: 0,
        vx: -1,
        vz: 0,
        footprint: 1,
        mass: 0.8,
        temperature: 0.76,
        sourceIndex: 2
    };
    let result = null;
    for ( let step = 0; step < 12 && !parcel.settledAtContact; step += 1 )
    {
        parcel.x = -0.1;
        result = resolveMoltenBoundaryContact( {
            parcel,
            previousX: 0.25,
            previousZ: parcel.z,
            boundary,
            timeStep: 0.1
        } );
    }
    assert.ok( result.settled );
    assert.ok( parcel.contactResidence >= 0.65 );
    assert.ok( parcel.contactTangentialTravel >= 0.25 );
    assert.equal( parcel.mass, 0.8 );
    assert.equal( parcel.temperature, 0.76 );
    assert.equal( parcel.sourceIndex, 2 );
} );

test( 'a successful diversion cannot escape the bounded post-contact drain', () => {
    let inside = true;
    const boundary = {
        revision: 1,
        sample: () => inside
            ? ( {
                signedDistance: -0.05,
                closestX: 0,
                closestZ: 0,
                normalX: 1,
                normalZ: 0,
                drainEligible: false
            } )
            : ( {
                signedDistance: Infinity,
                closestX: 0,
                closestZ: 0,
                normalX: 0,
                normalZ: 0,
                drainEligible: false
            } )
    };
    const parcel = {
        x: -0.05,
        z: 0,
        vx: -1,
        vz: 0,
        footprint: 1,
        mass: 1,
        temperature: 0.8,
        sourceIndex: 0
    };
    resolveMoltenBoundaryContact( {
        parcel,
        previousX: 0.25,
        previousZ: 0,
        boundary,
        timeStep: 0.1
    } );
    inside = false;
    for ( let step = 0; step < 30 && !parcel.settledAtContact; step += 1 )
    {
        resolveMoltenBoundaryContact( {
            parcel,
            previousX: parcel.x,
            previousZ: parcel.z,
            boundary,
            timeStep: 0.1
        } );
    }
    assert.equal( parcel.settledAtContact, true );
    assert.ok( parcel.contactResidence >= 2.4 );
} );

test( 'the meniscus manifests only locally sampled live molten material', () => {
    const scene = new THREE.Scene();
    const envelope = envelopeFixture();
    const membrane = { height: ( x, z ) => -5.2 + x * 0.015 - z * 0.01 };
    const moltenField = {
        revision: 7,
        sample: ( x ) => x > 1.3
            ? Object.freeze( { density: 0.9, heat: 0.82, flowX: 0, flowZ: 0 } )
            : Object.freeze( { density: 0, heat: 0, flowX: 0, flowZ: 0 } )
    };
    const contact = createCompositionMoltenContact( {
        scene,
        membrane,
        plantingEnvelope: envelope,
        moltenField,
        getContactDiagnostics: () => ( {
            divertedParcelCount: 9,
            settledParcelCount: 4,
            activeContactParcelCount: 3
        } ),
        threshold: 0.1
    } );
    const positionArray = contact.mesh.geometry.attributes.position.array;

    contact.update( 0 );
    const snapshot = contact.update( 200 );
    assert.equal( snapshot.status, 'wetting' );
    assert.equal( snapshot.activeSectorCount, 1 );
    assert.ok( snapshot.maximumLift > 0 );
    assert.equal( snapshot.divertedParcelCount, 9 );
    assert.equal( snapshot.settledParcelCount, 4 );
    assert.equal( snapshot.activeContactParcelCount, 3 );
    assert.equal( contact.mesh.visible, true );
    assert.strictEqual(
        contact.mesh.geometry.attributes.position.array,
        positionArray,
        'updates must reuse the fixed geometry allocation'
    );

    const position = contact.mesh.geometry.attributes.position.array;
    assertNear( position[2 * 3], position[4 * 3] );
    assertNear( position[2 * 3 + 2], position[4 * 3 + 2] );
    assertNear( position[3 * 3], position[5 * 3] );
    assertNear( position[3 * 3 + 2], position[5 * 3 + 2] );

    for ( const time of [ 400, 600, 800, 1000 ] ) contact.update( time );
    const coverageBeforeRebuild = Math.max(
        ...contact.mesh.geometry.attributes.contactCoverage.array
    );
    envelope.replace( contactSnapshot( 2 ) );
    contact.update( 1200 );
    const coverageAfterRebuild = Math.max(
        ...contact.mesh.geometry.attributes.contactCoverage.array
    );
    assert.ok( coverageAfterRebuild < coverageBeforeRebuild );

    envelope.replace( Object.freeze( {
        ...contactSnapshot( 3 ),
        status: 'detached',
        contactFootprint: Object.freeze( [] )
    } ) );
    contact.update( 1400 );
    assert.equal( contact.getSnapshot().status, 'dry' );
    assert.equal( contact.mesh.geometry.drawRange.count, 0 );
    assert.equal( contact.mesh.visible, false );

    contact.setActive( false );
    assert.equal( contact.mesh.visible, false );
    assert.equal( contact.getSnapshot().status, 'dry' );
    contact.dispose();
    assert.equal( scene.children.includes( contact.mesh ), false );
} );

test( 'P4 is wired before deposition and owns no physical-root collision shortcut', () => {
    const universeSource = readFileSync(
        new URL(
            '../../src/lib/casting-pit/universe/sluice-gate-layer.js',
            import.meta.url
        ),
        'utf8'
    );
    const contactSource = readFileSync(
        new URL(
            '../../src/category-tree/composition/molten-contact.js',
            import.meta.url
        ),
        'utf8'
    );
    const mainSource = readFileSync(
        new URL( '../../src/category-tree/composition/main.js', import.meta.url ),
        'utf8'
    );
    const resolverIndex = universeSource.indexOf(
        'const contact = resolveMoltenBoundaryContact'
    );
    const depositIndex = universeSource.indexOf(
        'depositTrail( parcel, previousX, previousZ, timeStep );',
        resolverIndex
    );

    assert.ok( resolverIndex > 0 && depositIndex > resolverIndex );
    assert.match( universeSource, /if \( field\.contactMask\[index\] \) continue;/ );
    assert.match( universeSource, /if \( material\.b > 0\.5 \) discard;/ );
    assert.match( universeSource, /parcel\.settledAtContact/ );
    assert.match( universeSource, /sampleMoltenState/ );
    assert.match( mainSource, /universe\.setMoltenContactBoundary\( moltenContact\.boundary \)/ );
    assert.match( mainSource, /mode\.universe && mode\.tree/ );
    assert.doesNotMatch( contactSource, /physicalRootSystem|root-system/ );
    assert.match( contactSource, /snapshot\.contactFootprint/ );
} );

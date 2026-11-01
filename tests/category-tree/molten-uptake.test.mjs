import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as THREE from 'three';
import {
    snapshotSluiceMoltenUptake
} from '../../src/lib/casting-pit/universe/sluice-gate-layer.js';

const sluiceSource = readFileSync(
    new URL(
        '../../src/lib/casting-pit/universe/sluice-gate-layer.js',
        import.meta.url
    ),
    'utf8'
);

function fixture()
{
    const source = {
        label: 'Feed 4',
        position: [ 12.5, -3.25 ],
        direction: [ -0.88, 0.475 ],
        color: new THREE.Color( 0xd77a48 )
    };
    const route = {
        id: 'source-3-primary-1-terminal-0',
        primaryIndex: 1,
        terminalIndex: 0,
        inlet: Object.freeze( [ 24.1, -8.5 ] ),
        branchPoint: Object.freeze( [ 19.2, -6.1 ] )
    };
    const parcel = {
        x: 1.18,
        z: -0.42,
        vx: -0.16,
        vz: 0.28,
        mass: 0.74,
        footprint: 0.41,
        temperature: 0.71,
        capillaryIdentity: 27,
        capillaryRoute: route,
        contactResidence: 0.82,
        contactTangentialTravel: 0.36,
        moltenContactSettlement: Object.freeze( {
            settled: true,
            inwardImpulse: 0.12,
            residence: 0.82,
            tangentialTravel: 0.36,
            x: 1.15,
            z: -0.4,
            normalX: 0.91,
            normalZ: -0.414
        } )
    };
    return { source, route, parcel };
}

test( 'molten uptake snapshots preserve frozen physical and contact provenance', () => {
    const { source, route, parcel } = fixture();
    const uptake = snapshotSluiceMoltenUptake( {
        source,
        sourceIndex: 3,
        parcel,
        simulationTime: 18.25,
        boundaryRevision: 12
    } );

    assert.equal( Object.isFrozen( uptake ), true );
    assert.equal( Object.isFrozen( uptake.identity ), true );
    assert.equal( Object.isFrozen( uptake.contact ), true );
    for ( const value of [
        uptake.sourcePosition,
        uptake.sourceDirection,
        uptake.position,
        uptake.velocity,
        uptake.contact.position,
        uptake.contact.normal
    ] ) assert.equal( Object.isFrozen( value ), true );

    assert.equal( uptake.type, 'molten-root-uptake' );
    assert.equal( uptake.sourceIndex, 3 );
    assert.equal( uptake.sourceLabel, 'Feed 4' );
    assert.equal( uptake.mass, parcel.mass );
    assert.equal( uptake.temperature, parcel.temperature );
    assert.equal( uptake.footprint, parcel.footprint );
    assert.equal( uptake.parcelIdentity, 27 );
    assert.equal( uptake.identity.parcelIdentity, 27 );
    assert.equal( uptake.identity.capillaryRouteId, route.id );
    assert.equal( uptake.identity.capillaryPrimaryIndex, 1 );
    assert.equal( uptake.identity.capillaryTerminalIndex, 0 );
    assert.equal( uptake.identityPreserved, true );
    assert.deepEqual( uptake.contact.position, [ 1.15, -0.4 ] );
    assert.deepEqual( uptake.contact.normal, [ 0.91, -0.414 ] );
    assert.equal( uptake.contact.residence, 0.82 );
    assert.equal( uptake.contact.tangentialTravel, 0.36 );
    assert.equal( uptake.contact.boundaryRevision, 12 );
    assert.equal( uptake.simulationTime, 18.25 );

    parcel.x = 99;
    parcel.mass = 99;
    source.position[0] = 99;
    assert.deepEqual( uptake.position, [ 1.18, -0.42 ] );
    assert.deepEqual( uptake.sourcePosition, [ 12.5, -3.25 ] );
    assert.equal( uptake.mass, 0.74 );
} );

test( 'only settled live contact dispatches one uptake before parcel removal', () => {
    assert.match( sluiceSource, /onMoltenUptake = null/ );
    assert.match(
        sluiceSource,
        /onMoltenUptake !== null && typeof onMoltenUptake !== 'function'/
    );
    const filterStart = sluiceSource.indexOf(
        'simulation.parcels = simulation.parcels.filter'
    );
    const filterEnd = sluiceSource.indexOf(
        '\nfunction updateDiagnosticGeometry',
        filterStart
    );
    const filter = sluiceSource.slice( filterStart, filterEnd );
    const settledStart = filter.indexOf( 'if ( parcel.settledAtContact )' );
    const openingStart = filter.search( /if \(\s*parcel\.enteredOpening/ );
    const lossStart = filter.search( /if \( radius >= outerCullRadius/ );
    assert.ok( settledStart >= 0 && openingStart > settledStart );
    assert.ok( lossStart > openingStart );

    const settledRemoval = filter.slice( settledStart, openingStart );
    const openingRemoval = filter.slice( openingStart, lossStart );
    const lossRemoval = filter.slice( lossStart );
    const snapshotIndex = settledRemoval.indexOf(
        'snapshotSluiceMoltenUptake'
    );
    const callbackIndex = settledRemoval.indexOf(
        'onMoltenUptake( uptake )'
    );
    const removalIndex = settledRemoval.lastIndexOf( 'return false;' );
    assert.ok( snapshotIndex >= 0 );
    assert.match(
        settledRemoval,
        /if \( parcel\.moltenUptakeDispatched \) return false;[\s\S]*?parcel\.moltenUptakeDispatched = true;/
    );
    assert.ok( callbackIndex > snapshotIndex );
    assert.ok( removalIndex > callbackIndex );
    assert.equal(
        Array.from( settledRemoval.matchAll( /onMoltenUptake\( uptake \)/g ) )
            .length,
        1
    );
    assert.doesNotMatch( openingRemoval, /onMoltenUptake|uptakeEventCount/ );
    assert.doesNotMatch( lossRemoval, /onMoltenUptake|uptakeEventCount/ );
    assert.match(
        settledRemoval,
        /try[\s\S]*?onMoltenUptake\( uptake \);[\s\S]*?catch \( error \)[\s\S]*?uptakeCallbackFailureCount \+= 1;/
    );
} );

test( 'uptake accounting follows transferred mass and resets with parcels', () => {
    assert.match(
        sluiceSource,
        /contactDiagnostics\.uptakeEventCount \+= 1;[\s\S]*?contactDiagnostics\.uptakeMass \+= uptake\.mass;[\s\S]*?onMoltenUptake\( uptake \)/
    );
    const resetStart = sluiceSource.indexOf( 'function resetParcels()' );
    const resetEnd = sluiceSource.indexOf(
        '\nfunction rebuildMembraneGeometry',
        resetStart
    );
    const reset = sluiceSource.slice( resetStart, resetEnd );
    assert.match( reset, /contactDiagnostics\.uptakeEventCount = 0/ );
    assert.match( reset, /contactDiagnostics\.uptakeMass = 0/ );
    assert.match(
        reset,
        /contactDiagnostics\.uptakeCallbackFailureCount = 0/
    );
    assert.match(
        reset,
        /contactDiagnostics\.lastUptakeCallbackError = null/
    );
    assert.match(
        sluiceSource,
        /function getMoltenContactDiagnostics\(\)[\s\S]*?\.\.\.contactDiagnostics/
    );
} );

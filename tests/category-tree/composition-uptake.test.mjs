import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as THREE from 'three';
import {
    createCompositionTree
} from '../../src/category-tree/composition/tree-instance.js';

const compositionHtml = readFileSync(
    new URL( '../../src/category-tree/composition/index.html', import.meta.url ),
    'utf8'
);
const compositionMain = readFileSync(
    new URL( '../../src/category-tree/composition/main.js', import.meta.url ),
    'utf8'
);
const treeHtml = readFileSync(
    new URL( '../../src/category-tree/tree/index.html', import.meta.url ),
    'utf8'
);
const treeMain = readFileSync(
    new URL( '../../src/category-tree/tree/main.js', import.meta.url ),
    'utf8'
);
const physicalUptakeLayer = readFileSync(
    new URL(
        '../../src/lib/tree/physical-uptake-layer.js',
        import.meta.url
    ),
    'utf8'
);
const workPlan = readFileSync(
    new URL(
        '../../docs/projects/category tree/composition/work-plan.md',
        import.meta.url
    ),
    'utf8'
);

function createFixture()
{
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    const membrane = {
        height: ( x, z ) => -5.5 * Math.exp(
            -( x * x + z * z ) / ( 3.8 * 3.8 )
        )
    };
    const renderer = {
        getContext() {
            return {
                getContextAttributes() {
                    return { stencil: true };
                }
            };
        }
    };
    return createCompositionTree( {
        scene,
        renderer,
        camera,
        membrane
    } );
}

function uptakeEvent()
{
    return Object.freeze( {
        type: 'molten-root-uptake',
        sourceIndex: 2,
        sourceLabel: 'Feed 3',
        parcelIdentity: 17,
        mass: 0.78,
        temperature: 0.69,
        simulationTime: 12.5,
        contact: Object.freeze( {
            position: Object.freeze( [ 1.2, -0.2 ] )
        } )
    } );
}

test( 'composition transfers only genuine Sluice root contact into Tree uptake', () => {
    assert.match(
        compositionMain,
        /let tree = null;[\s\S]*?createSluiceGateLayer\( \{[\s\S]*?onMoltenUptake:\s*\( event \) => tree\?\.acceptPhysicalUptake\( event \)/
    );
    assert.match(
        compositionMain,
        /tree = createCompositionTree\( \{/
    );
    assert.doesNotMatch(
        compositionMain,
        /admit-physical-uptake|manual-parcel|setInterval|setTimeout/
    );
    assert.match(
        compositionMain,
        /\[ 'u-reset', 'u-reseed' \][\s\S]*?tree\.resetPhysicalUptake/
    );
} );

test( 'the P10.2 composition surface is one closed presentation-only review', () => {
    assert.match(
        compositionHtml,
        /<summary>Tree · physical uptake<\/summary>[\s\S]*?for="tree-physical-uptake-visible"><span>Show liquid uptake<\/span><input id="tree-physical-uptake-visible" type="checkbox" checked>/
    );
    for ( const id of [
        'tree-physical-uptake-state',
        'tree-physical-uptake-accounting',
        'tree-physical-uptake-traffic'
    ] )
    {
        assert.match( compositionHtml, new RegExp( `id="${id}"` ) );
        assert.match( compositionMain, new RegExp( `#${id}` ) );
    }
    assert.doesNotMatch(
        compositionHtml,
        /physical-uptake-(?:speed|frequency|colour|brightness)/
    );
    assert.match(
        compositionMain,
        /#tree-physical-uptake-visible'[\s\S]*?tree\.setPhysicalUptakeVisible/
    );
} );

test( 'standalone Tree admits exactly explicit manual review uptake', () => {
    assert.match(
        treeHtml,
        /id="admit-physical-uptake"[^>]*>Admit one test uptake<\/button>/
    );
    assert.match( treeHtml, /id="physical-uptake-activity"/ );
    assert.match(
        treeMain,
        /#admit-physical-uptake'[\s\S]*?acceptPhysicalUptake\( \{[\s\S]*?sourceId: 'standalone-tree-review'/
    );
    assert.doesNotMatch( treeMain, /setInterval|setTimeout/ );
    assert.doesNotMatch( compositionHtml, /admit-physical-uptake/ );
} );

test( 'shared composition uptake preserves transfer and survives presentation A/B', () => {
    const tree = createFixture();
    const result = tree.acceptPhysicalUptake( uptakeEvent() );
    assert.equal( result.accepted, true );
    assert.equal( result.transfer.sourceParcelId, 'parcel-17' );
    assert.equal( result.transfer.sourceId, 'feed-2' );
    assert.equal( result.transfer.mass, 0.78 );
    assert.equal( result.transfer.energy, 0.69 );
    assert.equal( result.transfer.temperature, 0.69 );
    assert.equal( result.transfer.contactTime, 12.5 );
    assert.equal( result.transfer.contactPosition.length, 3 );
    assert.ok( result.transfer.contactPosition.every( Number.isFinite ) );

    tree.update( 1000 );
    let snapshot = tree.physicalUptake.getSnapshot();
    assert.equal( snapshot.acceptedTransferCount, 1 );
    assert.equal( snapshot.activePacketCount, 1 );
    assert.ok( snapshot.activePackets[0].entryDistance > 0 );
    assert.equal(
        snapshot.activePackets[0].headDistance,
        snapshot.activePackets[0].entryDistance
    );
    assert.equal( snapshot.resources.centralLaneCount, 0 );
    assert.ok( snapshot.resources.minimumCoreClearance > 0 );
    assert.equal( snapshot.acceptedMass, 0.78 );
    assert.equal( snapshot.massBalance, 0 );

    tree.setPhysicalUptakeVisible( false );
    assert.equal( tree.physicalUptake.group.visible, false );
    tree.update( 1100 );
    snapshot = tree.physicalUptake.getSnapshot();
    assert.equal( snapshot.acceptedTransferCount, 1 );
    assert.equal( snapshot.activePacketCount, 1 );
    tree.setPhysicalUptakeVisible( true );
    assert.equal( tree.physicalUptake.group.visible, true );

    tree.setFormValue( 'asymmetry', 0.7 );
    snapshot = tree.physicalUptake.getSnapshot();
    assert.equal( snapshot.acceptedTransferCount, 1 );
    assert.equal( snapshot.acceptedMass, 0.78 );
    assert.equal( snapshot.massBalance, 0 );
    assert.equal( snapshot.activePacketCount, 0 );

    tree.resetForm();
    snapshot = tree.physicalUptake.getSnapshot();
    assert.equal( snapshot.acceptedTransferCount, 0 );
    assert.equal( tree.acceptPhysicalUptake( uptakeEvent() ).accepted, true );

    tree.resetPhysicalUptake();
    snapshot = tree.physicalUptake.getSnapshot();
    assert.equal( snapshot.acceptedTransferCount, 0 );
    assert.equal( snapshot.activePacketCount, 0 );
    assert.equal( snapshot.acceptedMass, 0 );
} );

test( 'existing information remains the sole downward return', () => {
    assert.match( workPlan, /does \*\*not\*\* add a second sugar-return layer/ );
    assert.match(
        workPlan,
        /existing cyan-to-gold information traversal remains the composition's opposed return/
    );
    assert.doesNotMatch(
        `${treeMain}\n${compositionMain}\n${physicalUptakeLayer}`,
        /createSugar|sugarPacket|sugar-return-layer/
    );
} );

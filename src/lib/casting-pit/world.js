import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export const castingPitCameraViews = {
    monumental: {
        position: new THREE.Vector3( 7.5, 4.5, 14 ),
        target: new THREE.Vector3( 0, -1.6, 0 )
    },
    elevated: {
        position: new THREE.Vector3( 10.5, 10, 12.5 ),
        target: new THREE.Vector3( 0, -1.65, 0 )
    }
};

export function createCastingPitWorld( sceneElement, options = {} )
{
    const scene = new THREE.Scene();
    scene.background = new THREE.Color( options.background ?? 0x030405 );

    const camera = new THREE.PerspectiveCamera( 48, 1, 0.1, 80 );
    const renderer = new THREE.WebGLRenderer( {
        antialias: true,
        stencil: options.stencil ?? false
    } );
    renderer.setPixelRatio( Math.min( window.devicePixelRatio, 2 ) );
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = options.exposure ?? 1;
    sceneElement.appendChild( renderer.domElement );

    const orbitControls = new OrbitControls( camera, renderer.domElement );
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.07;
    orbitControls.minDistance = 3;
    orbitControls.maxDistance = 34;
    orbitControls.maxPolarAngle = Math.PI * 0.495;

    function setCameraView( view )
    {
        camera.position.copy( view.position );
        orbitControls.target.copy( view.target );
        orbitControls.update();
    }

    function resize()
    {
        const width = sceneElement.clientWidth;
        const height = sceneElement.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio( Math.min( window.devicePixelRatio, 2 ) );
        renderer.setSize( width, height, false );
    }

    const frameCallbacks = [];
    function addFrameCallback( callback )
    {
        frameCallbacks.push( callback );
        return () => frameCallbacks.splice( frameCallbacks.indexOf( callback ), 1 );
    }

    let renderFrame = null;
    function animate( time )
    {
        frameCallbacks.forEach( ( callback ) => callback( time ) );
        orbitControls.update();
        if ( renderFrame ) renderFrame( time );
        else renderer.render( scene, camera );
    }

    window.addEventListener( 'resize', resize );

    return {
        sceneElement,
        scene,
        camera,
        renderer,
        orbitControls,
        setCameraView,
        addFrameCallback,
        start( render = null ) {
            if ( render !== null && typeof render !== 'function' )
            {
                throw new TypeError( 'Casting Pit render delegate must be a function.' );
            }
            renderFrame = render;
            resize();
            renderer.setAnimationLoop( animate );
        }
    };
}

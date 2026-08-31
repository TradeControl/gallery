import * as THREE from 'three';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

const geometry = new THREE.BoxGeometry( 1, 1, 1 );
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
const cube = new THREE.Mesh( geometry, material );
scene.add( cube );

camera.position.z = 5;

const controls = {
    rotationXSpeed: 0.5,
    rotationYSpeed: 1,
    scale: 1
};

function connectSlider( inputId, outputId, property )
{
    const input = document.querySelector( `#${inputId}` );
    const output = document.querySelector( `#${outputId}` );

    input.addEventListener( 'input', () => {
        controls[property] = Number( input.value );
        output.value = controls[property].toFixed( 2 );
    } );
}

connectSlider( 'rotation-x-speed', 'rotation-x-speed-value', 'rotationXSpeed' );
connectSlider( 'rotation-y-speed', 'rotation-y-speed-value', 'rotationYSpeed' );
connectSlider( 'cube-scale', 'cube-scale-value', 'scale' );

let previousTime = 0;

function animate( time )
{
    const deltaTime = previousTime === 0 ? 0 : ( time - previousTime ) / 1000;
    previousTime = time;

    cube.rotation.x += controls.rotationXSpeed * deltaTime;
    cube.rotation.y += controls.rotationYSpeed * deltaTime;
    cube.scale.setScalar( controls.scale );
    renderer.render( scene, camera );
}

renderer.setAnimationLoop( animate );

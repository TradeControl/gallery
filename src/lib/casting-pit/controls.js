export function bindRangeControl( root, inputId, outputId, onInput, decimals = 2 )
{
    const input = root.querySelector( `#${inputId}` );
    const output = root.querySelector( `#${outputId}` );
    input.addEventListener( 'input', () => {
        const value = Number( input.value );
        output.value = value.toFixed( decimals );
        onInput( value );
    } );
}

export function bindCameraControls( root, world, views )
{
    root.querySelectorAll( '[data-view]' ).forEach( ( button ) => {
        button.addEventListener( 'click', () => world.setCameraView( views[button.dataset.view] ) );
    } );
}

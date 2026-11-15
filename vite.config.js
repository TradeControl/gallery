import { posix, resolve } from 'node:path';
import { defineConfig } from 'vite';

const entry = ( path ) => resolve( import.meta.dirname, path );

const exhibitionRoutes = Object.freeze( {
    '/category-tree/': '/src/category-tree/composition/',
    '/category-tree/index.html': '/src/category-tree/composition/',
    '/studies/physical-layer/': '/src/category-tree/casting-pit/physical-layer/',
    '/studies/physical-layer/index.html': '/src/category-tree/casting-pit/physical-layer/',
    '/studies/information-layer/': '/src/category-tree/casting-pit/information-layer/',
    '/studies/information-layer/index.html': '/src/category-tree/casting-pit/information-layer/',
    '/studies/tree/': '/src/category-tree/tree/',
    '/studies/tree/index.html': '/src/category-tree/tree/',
    '/studies/substrate/': '/src/category-tree/substrate/',
    '/studies/substrate/index.html': '/src/category-tree/substrate/',
    '/studies/superstrate/': '/src/category-tree/superstrate/',
    '/studies/superstrate/index.html': '/src/category-tree/superstrate/',
    '/studies/early-unification/': '/src/category-tree/casting-pit/universe-cosmos/',
    '/studies/early-unification/index.html': '/src/category-tree/casting-pit/universe-cosmos/'
} );

const outputRoutes = Object.freeze( {
    'src/category-tree/composition/index.html': 'category-tree/index.html',
    'src/category-tree/casting-pit/physical-layer/index.html':
        'studies/physical-layer/index.html',
    'src/category-tree/casting-pit/information-layer/index.html':
        'studies/information-layer/index.html',
    'src/category-tree/tree/index.html': 'studies/tree/index.html',
    'src/category-tree/substrate/index.html': 'studies/substrate/index.html',
    'src/category-tree/superstrate/index.html': 'studies/superstrate/index.html',
    'src/category-tree/casting-pit/universe-cosmos/index.html':
        'studies/early-unification/index.html'
} );

function routeDepth( fileName )
{
    const directory = posix.dirname( fileName );
    return directory === '.' ? 0 : directory.split( '/' ).length;
}

function relocateAssetReferences( html, targetName )
{
    const prefix = '../'.repeat( routeDepth( targetName ) );
    return html.replace(
        /(?:\.\.\/)+assets\//g,
        `${prefix}assets/`
    );
}

function exhibitionRoutesPlugin()
{
    return {
        name: 'gallery-exhibition-routes',
        enforce: 'post',
        configureServer( server )
        {
            server.middlewares.use( ( request, _response, next ) => {
                const pathname = request.url?.split( '?', 1 )[0];
                const destination = exhibitionRoutes[pathname];
                if ( destination )
                {
                    request.url = request.url.replace( pathname, destination );
                }
                next();
            } );
        },
        generateBundle( _options, bundle )
        {
            for ( const [ sourceName, targetName ] of Object.entries( outputRoutes ) )
            {
                const source = bundle[sourceName];
                if ( !source || source.type !== 'asset' )
                {
                    throw new Error( `Missing Gallery page: ${sourceName}` );
                }

                this.emitFile( {
                    type: 'asset',
                    fileName: targetName,
                    source: relocateAssetReferences( String( source.source ), targetName )
                } );
                delete bundle[sourceName];
            }
        }
    };
}

export default defineConfig( {
    // Relative asset URLs keep every exported artwork portable beneath
    // /gallery/, a custom domain, or an offline exhibition directory.
    base: './',
    appType: 'mpa',
    plugins: [ exhibitionRoutesPlugin() ],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                categoryTree: entry( 'src/category-tree/composition/index.html' ),
                treeStudy: entry( 'src/category-tree/tree/index.html' ),
                castingPitStudy: entry(
                    'src/category-tree/casting-pit/physical-layer/index.html'
                ),
                informationStudy: entry(
                    'src/category-tree/casting-pit/information-layer/index.html'
                ),
                universeCosmosStudy: entry(
                    'src/category-tree/casting-pit/universe-cosmos/index.html'
                ),
                substrateStudy: entry( 'src/category-tree/substrate/index.html' ),
                superstrateStudy: entry( 'src/category-tree/superstrate/index.html' )
            }
        }
    }
} );

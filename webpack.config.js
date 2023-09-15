const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')

const frontendDirectory = 'frontend'

// URL for Internet Identity
const II_URL_LOCAL = 'http://be2us-64aaa-aaaaa-qaabq-cai.localhost:4943' // Replace ID with your local internet_identity canister
const II_URL_IC = 'https://identity.ic0.app/'
const II_URL = process.env.NODE_ENV === 'production' ? II_URL_IC : II_URL_LOCAL
console.warn(`II_URL: ${II_URL}`)

// URL for IC host
const IC_HOST_URL_LOCAL = 'http://localhost:4943'
const IC_HOST_URL_IC = 'https://ic0.app'
const IC_HOST_URL =
  process.env.NODE_ENV === 'production' ? IC_HOST_URL_IC : IC_HOST_URL_LOCAL
console.warn(`IC_HOST_URL: ${IC_HOST_URL}`)

function initCanisterEnv() {
  let localCanisters, prodCanisters
  try {
    localCanisters = require(path.resolve('.dfx', 'local', 'canister_ids.json'))
  } catch (error) {
    console.log('No local canister_ids.json found. Continuing production')
  }
  try {
    prodCanisters = require(path.resolve('canister_ids.json'))
  } catch (error) {
    console.log('No production canister_ids.json found. Continuing with local')
  }

  //   console.log(`process.env.DFX_NETWORK: ${process.env.DFX_NETWORK}`)
  const network = process.env.DFX_NETWORK || 'local'

  const canisterConfig = network === 'local' ? localCanisters : prodCanisters

  return Object.entries(canisterConfig).reduce((prev, current) => {
    const [canisterName, canisterDetails] = current
    prev[canisterName.toUpperCase() + '_CANISTER_ID'] = canisterDetails[network]
    return prev
  }, {})
}
const canisterEnvVariables = initCanisterEnv()
console.log(
  `canisterEnvVariables: ${JSON.stringify(canisterEnvVariables, null, 2)}`
)

module.exports = (env = {}, args = {}) => {
  console.log(`env: ${JSON.stringify(env, null, 2)}`)
  /* 
    See:
    https://webpack.js.org/guides/production/#specify-the-mode

    dfx build  (which is run by dfx deploy) runs the `npm build` script:
    (-) For network=ic, it sets NODE_ENV=production before running the script
        https://github.com/dfinity/sdk/blob/master/src/dfx/src/lib/builders/assets.rs#L279
    (-) For network=local, it does not do that, so it makes a development build

    I would love to define this in package.json, so we ALWAYS get a production build:
    "scripts": {
      "build": "webpack --mode production --env production",
    }

    But, that does not work, because when installing a production build in the
    local network, it gives this error when the frontend calls the backend:
    
    "fail to verify certificate"
  */
  // const isDevelopment = !env.production
  const isDevelopment = process.env.NODE_ENV !== 'production'
  console.warn(`isDevelopment: ${isDevelopment}`)

  return {
    target: 'web',
    mode: isDevelopment ? 'development' : 'production',
    entry: {
      Main: './src/frontend/src/Main.jsx',
    },
    devtool: isDevelopment ? 'inline-source-map' : false,
    optimization: {
      minimize: !isDevelopment,
      minimizer: [new TerserPlugin()],
      /*
      When using the contenthash in the filename, it is safest
      to split out a runtimeChunk and a vendor chunk into a
      separate bundle, because it is likely that those will
      NOT change between builds, and you don't want to have
      browsers reload them unnecesary.
  
      The actual application code bundle will also become smaller.
  
      See https://webpack.js.org/guides/caching/
      */
      moduleIds: 'deterministic',
      // runtimeChunk: 'single',
      splitChunks: {
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      },
    },
    resolve: {
      // https://webpack.js.org/configuration/resolve

      // Use these aliases in import statements
      alias: {
        DeclarationsCanisterLlama2: path.resolve(
          __dirname,
          'src/declarations',
          'llama2'
        ),
        DeclarationsCanisterMotoko: path.resolve(
          __dirname,
          'src/declarations',
          'canister_motoko'
        ),
        DeclarationsCanisterFrontend: path.resolve(
          __dirname,
          'src/declarations',
          'canister_frontend'
        ),
      },

      // Order in which imports without extension are resolved
      extensions: ['.ts', '.tsx', '.jsx', '.js', '...'],

      // Polyfills... not used
      // fallback: {
      //   assert: require.resolve("assert/"),
      //   buffer: require.resolve("buffer/"),
      //   events: require.resolve("events/"),
      //   stream: require.resolve("stream-browserify/"),
      //   util: require.resolve("util/"),
      // },
    },
    module: {
      /*
       For groups of files, define how they are loaded by either:
       (1) built in loaders, defined by `type:`
       (2) custom loader, defined by `loader:`
      */
      rules: [
        {
          // https://webpack.js.org/guides/asset-modules/#general-asset-type
          // image files in raster, 2d vector & compound format: https://en.wikipedia.org/wiki/Image_file_format
          //        <---------------------raster format----------------------------------------->|<2d vector>|<----compound---->
          test: /\.(jpg|jpeg|jfif|jp2|exif|tiff|gif|bmp|png|ppm|pgm|pbm|pnm|webp|hdr|heif|bat|cgm|gbr|svg|eps|pdf|postscript)?$/i,
          type: 'asset',
        },
        {
          // All files with a `.css` extension will be handled by `style-loader` & `css-loader`
          // style-loader: Add exports of a module as style to DOM
          // css-loader: Loads CSS file with resolved imports and returns CSS code
          // https://webpack.js.org/loaders/#styling
          // https://webpack.js.org/loaders/css-loader/
          test: /\.css$/i,
          use: ['style-loader', 'css-loader'],
        },
        {
          // All files with a `.ts`, `.tsx` or `.jsx` extension will be handled by `ts-loader`
          // ts-loader: Loads TypeScript 2.0+ like JavaScript
          // https://webpack.js.org/loaders/#transpiling
          // https://github.com/TypeStrong/ts-loader
          test: /\.(ts|tsx|jsx)?$/i,
          loader: 'ts-loader',
        },
      ],
    },
    plugins: [
      // https://stackoverflow.com/a/39816574/5480536 (multiple html pages)
      new HtmlWebpackPlugin({
        filename: 'index.html',
        template: './src/frontend/src/index.html',
        chunks: ['Main'],
        cache: false,
      }),
      new webpack.EnvironmentPlugin({
        ...canisterEnvVariables,
        II_URL,
        IC_HOST_URL,
      }),
      /*
      Do not use the CopyPlugin, because:
      (-) It copies blindly, without giving webpack a chance to build a dependency graph,
          ie, build a `webpack module`, that does all of it's magic:
          (-) Copies only files that are actually used
          (-) Long Term Caching: Applies a hash to the name in dist, ensuring reload upon upgrade
      (-) Use in HTML (href) & JS CODE (import) reflect the post build `dist` directory structure, 
          not the code `src` directory structure, which is confusing.
  
      Instead, use the Asset Modules capability, defined above in `module: {rules: type: 'asset'}`
      
      References:
      - https://dev.to/smelukov/webpack-5-asset-modules-2o3h
      - https://webpack.js.org/concepts/modules/
      - https://webpack.js.org/guides/asset-modules/
      */
      new CopyPlugin({
        patterns: [
          {
            from: path.join(__dirname, 'src', 'frontend/assets/favicon'),
            to: path.join(__dirname, 'dist', 'frontend'),
          },
          {
            from: path.join(__dirname, 'src', 'frontend/assets/dfinity'),
            to: path.join(__dirname, 'dist', 'frontend'),
          },
          {
            from: `src/frontend/src/.ic-assets.json*`,
            to: '.ic-assets.json5',
            noErrorOnMissing: true,
          },
        ],
      }),
      new webpack.ProvidePlugin({
        Buffer: [require.resolve('buffer/'), 'Buffer'],
        process: require.resolve('process/browser'),
      }),
    ],
    output: {
      filename: '[name].[contenthash].js',
      path: path.join(__dirname, 'dist', 'frontend'),
      clean: true,
    },
    // proxy /api to port 4943 during development.
    // if you edit dfx.json to define a project-specific local network, change the port to match.
    devServer: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:4943',
          changeOrigin: true,
          pathRewrite: {
            '^/api': '/api',
          },
        },
      },
      static: path.resolve(__dirname, 'src', frontendDirectory, 'assets'),
      hot: true,
      watchFiles: [path.resolve(__dirname, 'src', frontendDirectory)],
      liveReload: true,
    },
  }
}

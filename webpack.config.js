const path = require('path')
const { execSync } = require('child_process')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')

// The environment variable NODE_ENV is set to 'production' by `make icp-deploy-frontend
// ENV=production` (mainnet). A production webpack build flips minification + the
// production mode; a development build keeps source maps and certificate-friendly output.
const isDevelopment = process.env.NODE_ENV !== 'production'
console.warn(`isDevelopment: ${isDevelopment}`)

const frontendDirectory = 'frontend'

// Backend canisters the frontend talks to. Their ids are injected into the dev-server
// `ic_env` cookie below so the runtime `safeGetCanisterEnv()` resolves them locally.
const BACKEND_CANISTERS = ['icgpt_admin', 'llama_cpp_qwen25_05b_q8']

// DEV-SERVER ONLY: simulate the `ic_env` cookie that the asset canister serves in
// production, and proxy /api to the managed local replica. Everything is read from
// icp-cli at RUNTIME — no hardcoded ports, no .env. Requires the local network running
// (`make icp-network-start`) and the backend canisters deployed (`make icp-deploy
// ENV=local`), so that `icp network status` / `icp canister status` have something to
// report. The frontend canister itself does NOT need deploying — webpack serves it.
function getDevServerConfig() {
  const status = JSON.parse(
    execSync('icp network status -e local --json', { encoding: 'utf-8' })
  )
  const canisterParams = BACKEND_CANISTERS.map((name) => {
    // -i returns only the canister id (from the local ID store).
    const id = execSync(`icp canister status ${name} -e local -i`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim()
    return `PUBLIC_CANISTER_ID:${name}=${id}`
  }).join('&')
  // The LOCAL Internet Identity (icp.yaml `ii: true`) is served at id.ai.localhost on the
  // replica's (ephemeral) gateway port — the same port as api_url. Inject its /authorize URL
  // so the frontend signs in against the throwaway local II instead of mainnet id.ai.
  const iiPort = new URL(status.api_url).port
  const iiUrl = `http://id.ai.localhost:${iiPort}/authorize`
  const cookie = encodeURIComponent(
    `${canisterParams}&ic_root_key=${status.root_key}&ii_url=${iiUrl}`
  )
  return {
    port: 8081, // pinned so the II derivationOrigin / dev URL is stable
    headers: { 'Set-Cookie': `ic_env=${cookie}; SameSite=Lax;` },
    proxy: {
      '/api': {
        // api_url has a trailing slash; strip it or the replica 400s on //api/v3.
        target: status.api_url.replace(/\/$/, ''),
        changeOrigin: true,
      },
    },
    static: path.resolve(__dirname, 'src', frontendDirectory, 'assets'),
    hot: true,
    watchFiles: [path.resolve(__dirname, 'src', frontendDirectory)],
    liveReload: true,
    // SPA fallback: serve index.html for client-side routes (e.g. /docs, /docs/:slug)
    // so hard-loads / deep links resolve to the app instead of 404.
    historyApiFallback: true,
  }
}

module.exports = () => {
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
      // Order in which imports without extension are resolved
      extensions: ['.ts', '.tsx', '.jsx', '.js', '...'],
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
        {
          // Docs content: import the author-written HTML fragments in src/.../docs
          // as raw strings. SCOPED to the docs dir with `include` so it does NOT
          // intercept index.html (owned by HtmlWebpackPlugin).
          test: /\.html$/i,
          include: path.resolve(
            __dirname,
            'src',
            frontendDirectory,
            'src/docs'
          ),
          type: 'asset/source',
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
            // onicai brand mark shown on the landing hero
            from: path.join(
              __dirname,
              'src',
              'frontend/assets/onicai-icon-logo.svg'
            ),
            to: path.join(__dirname, 'dist', 'frontend'),
          },
          {
            // sitemap.xml for the public /docs pages (served at the site root)
            from: path.join(__dirname, 'src', 'frontend/assets/sitemap.xml'),
            to: path.join(__dirname, 'dist', 'frontend'),
          },
          {
            // icgpt-social.png, referenced by the social card tags in index.html
            from: path.join(__dirname, 'src', 'frontend/assets/social'),
            to: path.join(__dirname, 'dist', 'frontend'),
          },
          {
            // screenshots embedded in the public /docs pages (served at /docs-img/)
            from: path.join(__dirname, 'src', 'frontend/assets/docs-img'),
            to: path.join(__dirname, 'dist', 'frontend/docs-img'),
            noErrorOnMissing: true,
          },
          {
            // landing-page demo movie(s) (served at /video/)
            from: path.join(__dirname, 'src', 'frontend/assets/video'),
            to: path.join(__dirname, 'dist', 'frontend/video'),
            noErrorOnMissing: true,
          },
          {
            from: path.join(__dirname, 'src', 'frontend/domain-info'),
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
      // Build-time flag for the LOCAL-DEV dev sign-in. WEBPACK_SERVE is set only by
      // `webpack serve` (local dev) and never by the production `webpack` build (see the
      // devServer note below at :244), so this literal is `true` locally and `false` in prod.
      // Because it's a literal, the `__DEV_SIGN_IN__ ? require('./devSignIn') : null` guard in
      // LoginWithInternetIdentity.jsx dead-code-eliminates the entire dev-sign-in module (and its
      // Ed25519KeyIdentity import) from production bundles.
      new webpack.DefinePlugin({
        __DEV_SIGN_IN__: JSON.stringify(!!process.env.WEBPACK_SERVE),
      }),
    ],
    output: {
      filename: '[name].[contenthash].js',
      path: path.join(__dirname, 'dist', 'frontend'),
      clean: true,
      // Absolute asset URLs so the bundle loads on nested routes (e.g. /docs/:slug).
      // With the default (relative) publicPath, a hard-load of /docs/x resolves the
      // script against /docs/ and 404s → blank page.
      publicPath: '/',
    },
    // The dev server injects the ic_env cookie + proxies /api to the managed replica.
    // Only attach it for `webpack serve` (WEBPACK_SERVE=true) so a production `webpack`
    // build never shells out to icp-cli.
    ...(process.env.WEBPACK_SERVE ? { devServer: getDevServerConfig() } : {}),
  }
}

// Build-time constants injected by webpack DefinePlugin (see webpack.config.js).

// True only in a local-dev build (`webpack serve`); false in the production build. Behind this
// literal, webpack dead-code-eliminates the LOCAL-DEV dev sign-in path from production bundles.
declare const __DEV_SIGN_IN__: boolean

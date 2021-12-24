// webpack.config.js
const HtmlWebPackPlugin = require( 'html-webpack-plugin' );
const path = require( 'path' );

module.exports = {
   context: __dirname,
   entry: './src/index.js',
   output: {
      path: path.resolve( __dirname, 'dist' ),
      filename: 'index_bundle.js',
   },

   plugins: [
      new HtmlWebPackPlugin()
   ]
};
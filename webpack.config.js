// webpack.config.js
var HtmlWebPackPlugin = require( 'html-webpack-plugin' );
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const path = require( 'path' );

module.exports = {
   context: __dirname,
   entry: './src/index.js',
   output: {
      path: path.resolve( __dirname, 'dist' ),
      filename: 'index_bundle.js',
   },

   plugins: [
      new HtmlWebPackPlugin({
         title: 'Project',
         template: './src/index.html',
      }),
      new MiniCssExtractPlugin(),
   ],
   module: {
    rules: [
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
    ],
  },
};
const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const HtmlWebpackPlugin = require('html-webpack-plugin');

const pages = ["index", "detail", "app"];
module.exports = {
  mode: 'development',
  entry: {
    app: './src/app.js',
    index: './src/index.js',
    detail: './src/detail.js'
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, "dist"),
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
      {
        test: /\.hbs$/,
        loader: "handlebars-loader",
        options: {
          inlineRequires: "/images/"
        }
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      title:  "Raffles",
      filename: "index.html",
      template: "./src/index.hbs",
      chunks: ['index','app'],
    }),
    new HtmlWebpackPlugin({
      title: "Detail",
      filename: "detail.html",
      template: "./src/detail.hbs",
      chunks: ['detail','app'],
    }),
    new MiniCssExtractPlugin()
  ],
  devServer: { contentBase: path.join(__dirname, "dist"), compress: true },
};

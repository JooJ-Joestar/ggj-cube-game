const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const Dotenv = require("dotenv-webpack");

module.exports = {
  entry: "./src/index.ts",
  mode: "development",
  devtool: "source-map",
  resolve: {
    extensions: [".ts", ".js"]
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/
      }
    ]
  },
  output: {
    filename: "bundle.[contenthash].js",
    path: path.resolve(__dirname, "dist"),
    clean: true
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "src/index.html",
      inject: "body"
    }),
    new Dotenv({
      systemvars: true,
      defaults: true
    })
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, "dist")
    },
    hot: true,
    open: true,
    client: {
      overlay: true
    }
  }
};

const path = require("path"),
  CleanWebpackPlugin = require("clean-webpack-plugin").CleanWebpackPlugin,
  CopyWebpackPlugin = require("copy-webpack-plugin"),
  ZipPlugin = require("zip-webpack-plugin");

const fs = require("fs");
const webpack = require("webpack");

module.exports = (env) => {
  const mode = process.env.NODE_ENV || "production";

  return {
    mode,
    devtool: mode === "development" ? "source-map" : false,
    entry: {
      "content-script": path.resolve(__dirname, "src/content-script.js")
    },
    output: {
      filename: "[name].bundle.js",
      path: path.resolve(__dirname, "dist"),
      publicPath: "",
    },
    module: {
      rules: [
        {
          test: /\.css$/i,
          use: ["style-loader", "css-loader"],
        },
        {
          test: /\.m?js$/,
          exclude: /(node_modules|bower_components)/,
          use: {
            loader: "babel-loader",
            options: {
              presets: [
                [
                  "@babel/preset-env",
                  {
                    targets: {
                      chrome: "80",
                    },
                  },
                ],
              ],
            },
          },
        },
      ],
    },
    plugins: [
      new webpack.DefinePlugin({
        __VERSION__: JSON.stringify(process.env.npm_package_version),
      }),
      new CleanWebpackPlugin(),
      new CopyWebpackPlugin({
        patterns: [
          { from: "src/icons", to: "icons" },
          {
            from: "src/manifest.json",
            transform: function (content, path) {
              return Buffer.from(
                JSON.stringify({
                  version: JSON.parse(fs.readFileSync("./package.json"))
                    .version,
                  content_security_policy:
                    mode === "development"
                      ? "script-src 'self' 'unsafe-eval'; object-src 'self'"
                      : undefined,
                  ...JSON.parse(content.toString()),
                })
              );
            },
          },
        ],
      }),
      mode !== "development" &&
        new ZipPlugin({
          path: path.join(__dirname, "releases"),
          filename: `google-meet-jabra-${process.env.npm_package_version}.zip`,
        }),
    ].filter(Boolean),
  };
};

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

module.exports = (env) => {
  const target = env.target || 'main';

  const commonConfig = {
    mode: env.production ? 'production' : 'development',
    devtool: env.production ? 'source-map' : 'eval-source-map',
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: 'ts-loader',
            options: { transpileOnly: true },
          },
          exclude: /node_modules/,
        },
      ],
    },
  };

  const mainConfig = {
    ...commonConfig,
    target: 'electron-main',
    entry: './src/main/index.ts',
    output: {
      path: path.resolve(__dirname, 'dist/main'),
      filename: 'index.js',
    },
  };

  const preloadConfig = {
    ...commonConfig,
    target: 'electron-preload',
    entry: './src/preload.ts',
    output: {
      path: path.resolve(__dirname, 'dist/preload'),
      filename: 'index.js',
    },
  };

  const isDev = !env.production;
  const rendererConfig = {
    ...commonConfig,
    target: 'web',
    entry: './src/renderer/index.tsx',
    output: {
      path: path.resolve(__dirname, 'dist/renderer'),
      filename: 'index.js',
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: 'ts-loader',
            options: { transpileOnly: true },
          },
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [isDev ? 'style-loader' : MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader'],
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/renderer/index.html',
      }),
      ...(isDev ? [] : [new MiniCssExtractPlugin()]),
    ],
    optimization: {
      minimizer: ['...', new CssMinimizerPlugin()],
    },
    devServer: {
      port: 9000,
      hot: true,
    },
  };

  const configs = { main: mainConfig, preload: preloadConfig, renderer: rendererConfig };
  return configs[target];
};

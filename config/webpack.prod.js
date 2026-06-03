// webpack.prod.js
// 生产环境专属配置（Step 8 还会进一步加强：压缩、splitChunks 等）
const { merge } = require('webpack-merge');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const common = require('./webpack.common');
const { createCssRules } = require('./utils');

module.exports = merge(common, {
  // 生产模式：自动开启压缩、Tree Shaking、Scope Hoisting
  // 同时把 process.env.NODE_ENV 设为 'production'
  mode: 'production',

  // 带 contenthash，文件内容变了 hash 才变 → 长期缓存友好
  output: {
    filename: 'js/[name].[contenthash:8].js',
    chunkFilename: 'js/[name].[contenthash:8].chunk.js',
  },

  // 生产用 'source-map'：独立 .map 文件，定位精确，不会污染 JS
  // 也可设 false 完全不出 source-map（隐藏源码）
  devtool: 'source-map',

  module: {
    rules: createCssRules(true), // true = prod
  },

  plugins: [
    // 把 CSS 抽出成独立文件，浏览器可并行下载、可单独缓存
    new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash:8].css',
      chunkFilename: 'css/[name].[contenthash:8].chunk.css',
    }),
  ],
});

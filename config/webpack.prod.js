// webpack.prod.js
// 生产环境配置（含完整优化策略）
const { merge } = require('webpack-merge');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const common = require('./webpack.common');
const { createCssRules } = require('./utils');

// 是否启用打包分析（命令行加 ANALYZE=true npm run build 时触发）
const analyze = process.env.ANALYZE === 'true';

module.exports = merge(common, {
  mode: 'production',

  output: {
    // contenthash：基于文件内容的 hash，内容不变 hash 不变，便于长期缓存
    filename: 'js/[name].[contenthash:8].js',
    chunkFilename: 'js/[name].[contenthash:8].chunk.js',
  },

  // 生产用 source-map：独立 .map 文件，定位最准
  // 不希望源码泄露可改用 'hidden-source-map'（生成但不引用，用于错误监控平台）
  // 或 false 完全不出
  devtool: 'source-map',

  module: {
    rules: createCssRules(true),
  },

  // ===== optimization：核心优化项 =====
  optimization: {
    // 压缩器配置（mode:production 默认会用 TerserPlugin，但我们覆盖一下加 CSS 压缩）
    minimizer: [
      // 用 webpack 5 内置的 '...' 占位符保留默认的 TerserPlugin（JS 压缩）
      '...',
      // 加 CSS 压缩
      new CssMinimizerPlugin(),
    ],

    // 把 webpack runtime（模块加载逻辑等）单独抽成一个 chunk
    // 这样业务/三方库改动不会让 runtime 文件 hash 变，进一步利于缓存
    runtimeChunk: 'single',

    // ⭐ 代码分割策略
    splitChunks: {
      // chunks: 'all' = 同时处理同步导入和异步 import() 的依赖
      chunks: 'all',
      // 一个模块至少被几个 chunk 引用才会被拆出
      minSize: 20000, // 拆分后的 chunk 至少 20KB，避免拆得太碎
      cacheGroups: {
        // 把 react 全家桶单独拆一个 chunk
        // 这是业内经典做法：react 体积大、几乎不变，单独缓存最划算
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
          name: 'react',
          chunks: 'all',
          priority: 40, // 数值越大优先级越高
        },
        // 其他 node_modules 拆成一个 vendors chunk
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 30,
        },
        // 业务里复用的公共代码
        common: {
          name: 'common',
          minChunks: 2, // 至少被 2 个 chunk 用到才拆
          chunks: 'all',
          priority: 20,
          reuseExistingChunk: true,
        },
      },
    },
  },

  plugins: [
    // 把 CSS 抽成独立文件
    new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash:8].css',
      chunkFilename: 'css/[name].[contenthash:8].chunk.css',
    }),

    // gzip 预压缩：构建时直接生成 .gz 文件
    // Nginx 配 gzip_static on 后会优先用 .gz 文件，节省服务器 CPU
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 8192, // 只压缩 8KB 以上的文件
      minRatio: 0.8,   // 压缩率高于 0.8 的不压缩（已经够小）
    }),

    // 按需启用打包分析
    analyze &&
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',    // 生成静态 html 报告，不起服务器
        reportFilename: 'bundle-report.html',
        openAnalyzer: false,        // 不自动打开浏览器
      }),
  ].filter(Boolean),
});

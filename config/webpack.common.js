// webpack.common.js
// 开发和生产环境共享的配置：entry / output / loader / resolve / 共有 plugin
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

// 把项目根目录抽出来，避免到处写 ../../
const ROOT = path.resolve(__dirname, '..');

module.exports = {
  entry: path.resolve(ROOT, 'src/index.tsx'),

  output: {
    path: path.resolve(ROOT, 'dist'),
    // 注意：filename 在 common 里先不带 hash，dev 和 prod 各自覆盖
    // 因为 dev 模式 hash 会让 HMR 复杂化
    clean: true,
    assetModuleFilename: 'assets/[name].[hash:8][ext]',
  },

  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    // 后面可以加 alias，比如 '@': path.resolve(ROOT, 'src')
  },

  module: {
    rules: [
      // ===== 1. JS / TS / JSX / TSX =====
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: { cacheDirectory: true },
        },
      },

      // ===== 4. 图片 =====
      {
        test: /\.(png|jpe?g|gif|webp)$/,
        type: 'asset',
        parser: {
          dataUrlCondition: { maxSize: 8 * 1024 },
        },
        generator: {
          filename: 'images/[name].[hash:8][ext]',
        },
      },

      // ===== 5. 字体 =====
      {
        test: /\.(woff2?|eot|ttf|otf)$/,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[hash:8][ext]',
        },
      },

      // ===== 6. SVG（双重身份）=====
      {
        test: /\.svg$/i,
        oneOf: [
          {
            resourceQuery: /url/,
            type: 'asset',
            generator: { filename: 'images/[name].[hash:8][ext]' },
          },
          {
            issuer: /\.s?css$/,
            type: 'asset',
            generator: { filename: 'images/[name].[hash:8][ext]' },
          },
          {
            issuer: /\.[jt]sx?$/,
            use: [
              {
                loader: '@svgr/webpack',
                options: { icon: true },
              },
            ],
          },
        ],
      },

      // ⚠️ 注意：CSS 相关规则**不放这里**！
      // 因为开发用 style-loader，生产用 MiniCssExtractPlugin，loader 不同
      // 我们把 CSS 规则各自放到 webpack.dev.js / webpack.prod.js
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(ROOT, 'public/index.html'),
      filename: 'index.html',
    }),
  ],
};

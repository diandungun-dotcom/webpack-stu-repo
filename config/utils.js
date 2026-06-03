// utils.js
// 生成 CSS 相关规则的工厂函数，避免 dev/prod 写两份

/**
 * 生成 CSS 相关规则
 * @param {boolean} isProd 是否生产环境
 */
function createCssRules(isProd) {
  // 开发：style-loader 把 CSS 注入 <style>（HMR 友好，无独立 CSS 文件）
  // 生产：MiniCssExtractPlugin.loader 抽离成独立 .css 文件（缓存友好，可并行下载）
  const firstLoader = isProd
    ? require('mini-css-extract-plugin').loader
    : 'style-loader';

  return [
    // CSS Modules
    {
      test: /\.module\.s?css$/,
      use: [
        firstLoader,
        {
          loader: 'css-loader',
          options: {
            modules: {
              // 开发用易读名字方便调试；生产用短 hash 缩小体积
              localIdentName: isProd
                ? '[hash:base64:8]'
                : '[name]__[local]--[hash:base64:5]',
              namedExport: false,
              exportLocalsConvention: 'as-is',
            },
            importLoaders: 2,
          },
        },
        'postcss-loader',
        'sass-loader',
      ],
    },
    // 全局样式
    {
      test: /\.s?css$/,
      exclude: /\.module\.s?css$/,
      use: [firstLoader, 'css-loader', 'postcss-loader', 'sass-loader'],
    },
  ];
}

module.exports = { createCssRules };

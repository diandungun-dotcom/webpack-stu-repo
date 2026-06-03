// postcss.config.js
// PostCSS 是一个用 JS 转换 CSS 的工具平台，autoprefixer 是它最有名的插件
// postcss-loader 会自动读取这个文件
module.exports = {
  plugins: [
    // autoprefixer：根据 browserslist 自动给 CSS 加浏览器前缀
    // 比如 display: flex → 自动加上 display: -webkit-box, -ms-flexbox, flex
    require('autoprefixer'),
  ],
};

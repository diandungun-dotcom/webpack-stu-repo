// webpack.dev.js
// 开发环境专属配置
const { merge } = require('webpack-merge');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const common = require('./webpack.common');
const { createCssRules } = require('./utils');

module.exports = merge(common, {
  mode: 'development',

  output: {
    filename: '[name].js',
    // 公共路径：dev-server 服务 /，HMR 资源路径以 / 开头
    publicPath: '/',
  },

  // 见 step-06 笔记：eval-cheap-module-source-map 是 dev 最佳折中
  devtool: 'eval-cheap-module-source-map',

  module: {
    rules: createCssRules(false),
  },

  plugins: [
    // 注入 React Refresh runtime，配合 babel 插件实现"修改组件保留状态"
    new ReactRefreshWebpackPlugin({
      // 默认会出 Error Overlay，调试时很有用
      overlay: true,
    }),
  ],

  // ===== devServer：开发服务器配置 =====
  devServer: {
    // 监听端口
    port: 5173,
    // 启动后自动用默认浏览器打开（这里先关，避免后台启动时尝试调浏览器）
    open: false,
    // 启用 HMR
    hot: true,
    // 监听 0.0.0.0，让局域网内别的设备也能访问（手机测试常用）
    host: '0.0.0.0',

    // 静态资源目录：public/ 下的非编译资源可直接访问（如 favicon.ico、robots.txt）
    static: {
      directory: require('path').resolve(__dirname, '../public'),
    },

    // SPA 路由的 fallback：所有 404 重定向到 index.html
    // 没这个，访问 /users/123 这种前端路由会 404
    historyApiFallback: true,

    // 客户端配置
    client: {
      // 在浏览器里显示编译错误的全屏遮罩
      overlay: {
        errors: true,
        warnings: false,
      },
      // 在浏览器控制台显示编译进度
      progress: true,
    },

    // gzip 压缩响应，更接近真实生产环境
    compress: true,

    // 代理：把指定路径的请求转发到目标服务，解决前后端跨域
    // 示例：所有 /api 开头的请求转发到 http://localhost:3000
    proxy: [
      {
        context: ['/api'],
        target: 'http://localhost:3000',
        changeOrigin: true,
        // pathRewrite: { '^/api': '' },
        // secure: false,
      },
    ],

    // ===== setupMiddlewares：自定义 Express 中间件 =====
    // 用途：本地 mock 接口、注入特殊路由、添加自定义中间件等
    // 注意：注册在 proxy 之前生效（因为 setupMiddlewares 默认走最前）
    //      所以如果同时配了 proxy 和 mock，mock 会优先命中
    setupMiddlewares: (middlewares, devServer) => {
      // 示例 1：mock 一个 GET 接口
      devServer.app.get('/mock/user', (req, res) => {
        res.json({ code: 0, data: { id: 1, name: '张三', role: 'admin' } });
      });

      // 示例 2：mock 一个 POST 接口
      devServer.app.post('/mock/login', (req, res) => {
        res.json({ token: 'fake-token-' + Date.now() });
      });

      // 示例 3：模拟延迟，测 loading 状态
      devServer.app.get('/mock/slow', (req, res) => {
        setTimeout(() => {
          res.json({ data: 'slow response' });
        }, 2000);
      });

      return middlewares;
    },
  },
});

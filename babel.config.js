// babel.config.js
// 项目级 Babel 配置（对整个项目生效）
//
// 关键：用一个函数式导出，可以读到 NODE_ENV 来动态决定 plugins
//   - 开发环境注入 react-refresh/babel 实现热更新保留状态
//   - 生产环境不需要（额外的注册代码会浪费体积）
module.exports = function (api) {
  // 让 Babel 知道这个配置依赖 NODE_ENV，缓存就会按环境隔离
  api.cache.using(() => process.env.NODE_ENV);

  const isDev = process.env.NODE_ENV === 'development';

  return {
    presets: [
      // ① preset-env：根据目标浏览器转 ES6+ 语法 + 按需 polyfill
      [
        '@babel/preset-env',
        {
          // targets 也可以放 package.json browserslist，二选一
          // 这里留空让它走 browserslist 配置
          useBuiltIns: 'usage',
          corejs: 3,
        },
      ],
      // ② preset-react：JSX 转换（React 17+ 自动 runtime）
      ['@babel/preset-react', { runtime: 'automatic' }],
      // ③ preset-typescript：删除 TS 类型
      '@babel/preset-typescript',
    ],
    plugins: [
      // 只在开发环境加 react-refresh
      // 这个插件会给每个组件注入注册代码，runtime 据此识别组件并保留状态热替换
      isDev && require.resolve('react-refresh/babel'),
    ].filter(Boolean), // 过滤掉 false（生产环境时）
  };
};

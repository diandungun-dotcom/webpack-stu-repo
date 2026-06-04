# Step 8：生产环境优化

## 目标
- 压缩 JS / CSS
- splitChunks 拆分 react / vendors / 业务代码
- 抽离 webpack runtime
- gzip 预压缩
- 可视化打包分析

## 安装的包

| 包 | 作用 |
|---|---|
| `css-minimizer-webpack-plugin` | 压缩 CSS |
| `webpack-bundle-analyzer` | 可视化分析产物组成 |
| `compression-webpack-plugin` | 生成 .gz 预压缩文件 |

> JS 压缩 `terser-webpack-plugin` 是 webpack 5 内置依赖，不用单独装。

## ⭐ optimization.splitChunks（核心）

### 为什么要拆？长缓存策略

```
不拆：所有代码混在 main.js（500KB）
  → 业务改一行 → 整个 main.js 的 hash 变 → 用户重新下载 500KB

拆了：react.js(185KB) + vendors.js(21KB) + main.js(3KB)
  → 业务改一行 → 只有 main.js 的 hash 变 → 用户只下载 3KB
  → react.js 和 vendors.js 走浏览器缓存
```

### 经典三层缓存策略

| 层 | 内容 | 变化频率 | 缓存策略 |
|---|---|---|---|
| `react` | react、react-dom、scheduler | 几个月一次（升级） | 长期缓存 |
| `vendors` | 其他 node_modules（antd、lodash 等） | 中等 | 中期缓存 |
| `main` | 业务代码 | 每次发版 | 短期 |
| `runtime` | webpack 内部模块加载器 | 极少变 | 长期 |

### 配置模板

```js
optimization: {
  runtimeChunk: 'single',   // webpack runtime 独立
  splitChunks: {
    chunks: 'all',          // 同时处理同步 + 异步 import
    minSize: 20000,         // chunk 至少 20KB 才拆
    cacheGroups: {
      react: {
        test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
        name: 'react',
        chunks: 'all',
        priority: 40,       // 优先级越大越先匹配
      },
      vendors: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        chunks: 'all',
        priority: 30,
      },
      common: {
        name: 'common',
        minChunks: 2,       // 被 2 个 chunk 用到才拆
        chunks: 'all',
        priority: 20,
        reuseExistingChunk: true,
      },
    },
  },
}
```

### 关键参数解释

| 参数 | 含义 |
|------|------|
| `chunks` | `'all'`（推荐）/ `'async'` / `'initial'`，决定处理哪些 chunk |
| `minSize` | 拆出的 chunk 体积下限（不要拆太小，反而增加请求数） |
| `maxSize` | chunk 体积上限（webpack 5 默认无限制） |
| `minChunks` | 模块被多少个 chunk 引用才拆 |
| `priority` | cacheGroup 间的优先级 |
| `reuseExistingChunk` | 已有的 chunk 复用，避免重复拆 |
| `name` | 拆出 chunk 的名字，false 时让 webpack 自动生成 |

### runtimeChunk: 'single' 是什么？

webpack 打包后会注入一段"运行时"代码：模块加载器、chunk loader、HMR 等。默认这段代码塞在每个 entry chunk 里。

`runtimeChunk: 'single'` 把它单独抽出一个 `runtime.js`，好处：
- 业务/库 chunk 改动不会影响 runtime 的 hash
- runtime 极少变，可以最大化缓存

## 代码压缩

### JS：TerserPlugin（webpack 内置）

`mode: 'production'` 时自动启用。手动想配可以：
```js
const TerserPlugin = require('terser-webpack-plugin');
optimization: {
  minimize: true,
  minimizer: [
    new TerserPlugin({
      terserOptions: {
        compress: {
          drop_console: true,  // 移除 console
        },
      },
    }),
  ],
}
```

### CSS：CssMinimizerPlugin

```js
optimization: {
  minimizer: [
    '...',                     // 占位符，保留默认 TerserPlugin
    new CssMinimizerPlugin(),
  ],
}
```

⚠️ **`'...'` 占位符必须有**！只要重写 `minimizer`，webpack 就不会再自动加默认的 Terser，你得手动用 `'...'` 把它带回来。

## contenthash 的真相

```js
output: {
  filename: 'js/[name].[contenthash:8].js',
  chunkFilename: 'js/[name].[contenthash:8].chunk.js',
}
```

| 占位符 | 粒度 | 用途 |
|---|---|---|
| `[hash]` | 整次构建 | 任何文件变都变（最粗，不推荐） |
| `[chunkhash]` | 每个 chunk | chunk 内任意模块变就变 |
| `[contenthash]` | 文件内容 | **基于产物字节，最精确，推荐** |

**配合 Nginx 长期缓存**：
```nginx
location ~* \.(js|css)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}
```
内容变了 → hash 变了 → URL 变了 → 浏览器认为是新资源，重新请求。完美。

## gzip 预压缩

```js
new CompressionPlugin({
  algorithm: 'gzip',
  test: /\.(js|css|html|svg)$/,
  threshold: 8192,    // 8KB 以下不压缩（不划算）
  minRatio: 0.8,      // 压缩率高于 0.8 不保留（已经够小）
})
```

构建时生成 `xxx.js.gz`，运行时 Nginx 配 `gzip_static on` 直接发：
```nginx
gzip_static on;
gzip_types text/javascript text/css application/javascript;
```

**好处**：
- 压缩在构建时完成，运行时不消耗服务器 CPU
- 压缩率更高（构建时可以用最高级别 9）
- 等价方案：`brotli-webpack-plugin` 出 `.br`，压缩率比 gzip 更高

## webpack-bundle-analyzer

可视化分析产物，找出"为什么 bundle 这么大"。

```js
new BundleAnalyzerPlugin({
  analyzerMode: 'static',         // 输出 html 而非起服务器
  reportFilename: 'bundle-report.html',
  openAnalyzer: false,
})
```

按需启用（不要每次构建都跑，太慢）：
```js
const analyze = process.env.ANALYZE === 'true';
plugins: [
  analyze && new BundleAnalyzerPlugin(...),
].filter(Boolean)
```

用法：`ANALYZE=true npm run build`，然后打开 `dist/bundle-report.html`。

## Tree Shaking 必备条件

1. **使用 ESM**：`import/export`，不是 `require`
2. **mode: 'production'**：自动启用
3. **Babel 不要把 ESM 转成 CJS**：preset-env 默认会，要禁掉
   ```js
   ['@babel/preset-env', { modules: false }]
   ```
   但**会影响 Jest** 等工具，常见做法是按 NODE_ENV 区分：
   ```js
   ['@babel/preset-env', {
     modules: isTest ? 'commonjs' : false
   }]
   ```
4. **package.json 加 sideEffects 字段**：告诉 webpack 哪些文件有副作用不能摇
   ```json
   {
     "sideEffects": ["*.css", "*.scss"]
   }
   ```

## 实际效果数据

```
Step 6 prod：main.js  212 KB
Step 8 prod：
  ├── runtime.js   1.6 KB
  ├── main.js      3.5 KB   ← 业务代码
  ├── vendors.js   21 KB   gzip 后 8 KB
  └── react.js    185 KB   gzip 后 58 KB
总传输（gzip）：~70 KB
```

更重要的是**业务发版用户只需下载 ~5KB**（main+runtime+css），而非整个 212KB。

## setupMiddlewares：本地 mock 接口

webpack-dev-server v4+ 的灵活中间件接口。

```js
devServer: {
  setupMiddlewares: (middlewares, devServer) => {
    devServer.app.get('/mock/user', (req, res) => {
      res.json({ id: 1, name: '张三' });
    });
    devServer.app.post('/mock/login', (req, res) => {
      res.json({ token: 'fake-token' });
    });
    return middlewares;
  },
}
```

适用场景：
- 后端接口还没好，前端要先调通
- 本地复现某个特定数据
- mock 一些极端情况（超大列表、空数据等）

## 思考题
1. 为什么 `cacheGroups.react` 的 `priority` 设 40，比 `vendors` 的 30 高？低了会怎样？
2. 配 `runtimeChunk: 'single'` 后多了一个文件请求，凭什么说"对缓存有利"？
3. `[contenthash]` 和 `[chunkhash]` 在什么场景下结果不同？
4. Tree Shaking 为什么要求用 ESM 而不是 CJS？

## 这一步证明了什么
生产环境优化不是单个 trick，而是一整套配合：**splitChunks 利用浏览器缓存** + **contenthash 触发更新** + **压缩降低体积** + **gzip 减少传输**。各环节叠加，让用户重发版只下几 KB，首次访问也能在弱网下快速完成。

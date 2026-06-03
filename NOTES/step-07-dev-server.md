# Step 7：webpack-dev-server + HMR + react-refresh + 代理

## 目标
- 启动一个真正的开发服务器，告别手动 `python -m http.server`
- 配置 HMR（热模块替换），改样式不刷新页面
- 接入 react-refresh，**改组件保留 useState 状态**
- 配置代理解决跨域，配置 SPA 路由 fallback

## 安装的包

| 包 | 作用 |
|---|---|
| `webpack-dev-server` | 启动开发服务器，提供 HMR / 代理 / fallback |
| `@pmmmwh/react-refresh-webpack-plugin` | webpack 插件：注入 react-refresh runtime |
| `react-refresh` | React 官方的热更新运行时库 |

## ⭐ HMR vs Live Reload

| 维度 | Live Reload | HMR |
|------|-------------|-----|
| 行为 | 整页刷新 | 只替换变化的模块 |
| 状态 | 全部丢失 | 保留（如表单输入、滚动位置） |
| 速度 | 慢（要重新加载所有 JS、重新建立 WS 连接） | 极快（毫秒级） |
| 实现 | location.reload() | webpack runtime + WebSocket |

## HMR 原理简述

```
1. webpack-dev-server 启动后，在浏览器和编译进程间建一条 WebSocket
2. 文件变化触发 webpack 重新编译
3. 编译完成，dev-server 通过 WS 通知浏览器："hash 变了，下面这几个 chunk 需要更新"
4. 浏览器的 HMR runtime 主动 fetch 更新的 chunk 文件（.hot-update.js）
5. runtime 找到对应模块，调用 module.hot.accept 注册的回调来"接管"更新
6. 如果没注册回调（或回调返回失败），降级到 Live Reload
```

## 为什么 React 需要 react-refresh？

webpack HMR 只提供"替换模块"的能力。**实际怎么处理替换由模块自己声明**。

普通模块：
```js
if (module.hot) {
  module.hot.accept('./foo', () => {
    // 你得手动重新调用 / 重新渲染
  });
}
```

React 组件场景特殊：
- 替换组件后，要保留 `useState` / `useReducer` / `useRef`
- 要自动重新渲染受影响的 Fiber 子树
- 出错时要 fallback 而不是白屏

这一套由 React 官方的 **react-refresh** 实现，需要：
1. **Babel 插件** `react-refresh/babel`：给每个组件注入注册代码（开发用，生产不要）
2. **webpack 插件** `@pmmmwh/react-refresh-webpack-plugin`：注入 runtime 并对接 webpack HMR

## babel.config.js 函数式导出（重要）

```js
module.exports = function (api) {
  api.cache.using(() => process.env.NODE_ENV);
  const isDev = process.env.NODE_ENV === 'development';
  return {
    presets: [...],
    plugins: [
      isDev && require.resolve('react-refresh/babel'),
    ].filter(Boolean),
  };
};
```

要点：
- **函数式导出**才能拿到 `api` 对象做缓存控制
- `api.cache.using(() => NODE_ENV)`：缓存按 NODE_ENV 区分，dev/prod 不会复用错误的缓存
- `require.resolve('xxx')`：返回绝对路径，避免 Babel 解析 plugin 路径时出问题（不是必须，但更稳）
- `.filter(Boolean)`：过滤掉 false（生产环境时插件不加）

## ⭐ devServer 配置核心字段

| 字段 | 含义 |
|------|------|
| `port` | 监听端口 |
| `host` | 监听地址，`0.0.0.0` 让局域网设备能访问（手机调试常用） |
| `open` | 启动后自动开浏览器 |
| `hot` | 启用 HMR |
| `static` | 静态文件根目录（public/） |
| `historyApiFallback` | SPA 路由 fallback：所有 404 重定向到 index.html |
| `client.overlay` | 编译错误的浏览器全屏遮罩 |
| `client.progress` | 编译进度显示到浏览器控制台 |
| `compress` | 启用 gzip（更接近生产体验） |
| `proxy` | 代理配置（见下） |
| `https` | 是否启用 HTTPS（dev 测试 PWA / 摄像头 API 时用） |

## 代理配置（proxy）

解决前后端跨域。把指定路径转发到后端服务。

```js
proxy: [
  {
    context: ['/api'],           // 拦截 /api/* 的请求
    target: 'http://localhost:3000', // 转发到后端
    changeOrigin: true,          // 修改 Host 头为 target 的 Host
    pathRewrite: { '^/api': '' }, // 可选：去掉 /api 前缀
    secure: false,                // 可选：target 是 https 但证书无效时关
  },
],
```

业务里的常见写法：
- 调本地 mock：`target: 'http://localhost:3001'`
- 调测试环境：`target: 'https://test-api.example.com'`
- 多代理：写多个对象

老的对象式写法 `proxy: { '/api': {...} }` 在 webpack-dev-server v5 已废弃，必须用数组形式。

## historyApiFallback 的本质

SPA 应用一般用 history 模式（无 hash）。访问 `/users/123` 时：
- 浏览器去服务器要 `/users/123`
- 但 dev server 上没这个文件 → 默认 404
- 配 `historyApiFallback: true` 后，所有 404 自动 fallback 到 `/index.html`
- index.html 里的 JS 读 URL，React Router 渲染对应页面

**生产环境同样要在 Nginx 里配 `try_files $uri $uri/ /index.html;`**，否则用户刷新前端路由会 404。

## 三个实战验证

### 实验 A：CSS HMR（不丢状态）
改 .scss → 样式变了，state 没变 → CSS HMR 工作

### 实验 B：组件 HMR（react-refresh）
改 .tsx 里的 JSX 文本 → 文本变了，state 没变 → react-refresh 工作

### 实验 C：Error Overlay
故意写错 → 浏览器红色全屏报错 → overlay 工作

## 性能观察

dev 模式 `main.js` ~4MB，远大于 prod 的 212KB，因为含：
- HMR runtime
- react-refresh runtime
- eval-source-map 内嵌的所有源码
- 所有模块的 development 版本

但 **dev server 把产物放内存**（memfs），不写硬盘，速度才是关键。

## 思考题
1. 改一个 `.tsx` 文件后浏览器没刷新但 state 保留了，整个 HMR 流程经过了哪些组件？
2. 为什么 `react-refresh/babel` **只能在开发环境**用？生产环境用了会有什么后果？
3. 配 `historyApiFallback: true` 后，怎么访问 `/index.html` 自己？所有路径都被吞了吗？
4. 公司内网应用，本地用 `host: '0.0.0.0'` 起来后，同事用你的内网 IP 访问看不到页面，可能的原因？

## 这一步证明了什么
**dev server + HMR + react-refresh = 现代前端开发的"刚需三件套"**。它们让"改代码 → 看效果"的反馈环路从"秒级"缩到"毫秒级"，并且保留状态。这是 React 生态自 2019 年后的标准做法。

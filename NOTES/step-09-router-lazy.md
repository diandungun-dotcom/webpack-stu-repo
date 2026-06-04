# Step 9：React Router + 路由懒加载（动态 import）

## 目标
- 用 react-router-dom 实现 SPA 路由
- 用 React.lazy + 动态 import() 做路由级代码分割
- 看见 webpack 自动生成的异步 chunk

## 静态 import vs 动态 import()

```ts
import Foo from './Foo';                  // 静态
const Foo = lazy(() => import('./Foo'));  // 动态
```

| 维度 | 静态 import | 动态 import() |
|------|------------|--------------|
| 何时生效 | 编译时 | 运行时 |
| 是否拆 chunk | 否（合入主 bundle） | **是**（独立异步 chunk） |
| 加载时机 | 模块初始化时 | 调用 import() 时 |
| webpack 怎么处理 | 直接打包进引用方 | 单独生成 chunk + 注入加载逻辑 |

**关键认知**：动态 `import()` 是 webpack 的"拆 chunk 信号"。它返回一个 Promise，resolve 后是模块对象（含 default 等导出）。

## React.lazy 的本质

```ts
const Foo = React.lazy(() => import('./Foo'));
```

React.lazy 接受一个**返回 Promise<{ default: Component }> 的函数**，等价于：
```ts
const Foo = React.lazy(async () => {
  const mod = await import('./Foo');
  return { default: mod.default };
});
```

⚠️ 限制：**只支持 default export**。如果你的页面用了具名 export，要么改成 default，要么自己包一层：
```ts
const Foo = lazy(() => import('./Foo').then(m => ({ default: m.Foo })));
```

## Magic Comments（魔法注释）

```ts
import(
  /* webpackChunkName: "page-home" */
  /* webpackPrefetch: true */
  /* webpackPreload: false */
  './pages/Home'
)
```

| 注释 | 作用 |
|------|------|
| `webpackChunkName` | 给生成的 chunk 起名，否则是数字（如 `0.chunk.js`） |
| `webpackPrefetch` | 浏览器空闲时预取（`<link rel="prefetch">`），下次用更快 |
| `webpackPreload` | 与父 chunk **并行**加载（`<link rel="preload">`），优先级高 |
| `webpackMode` | `lazy`(默认) / `lazy-once` / `eager` / `weak`，控制加载策略 |

### prefetch vs preload

| 类型 | 时机 | 优先级 | 适合 |
|------|------|--------|------|
| **prefetch** | 浏览器空闲时 | 低 | 「可能马上要用」的资源（如点击后才进的下个路由） |
| **preload** | 立即并行加载 | 高 | 「当前页面一定要用」的关键资源（如首屏关键字体） |

**常见错误**：把所有路由都 preload → 反而抢占首屏资源带宽。一般首屏路由就让它正常 await，二级路由用 prefetch。

## Suspense

React.lazy 必须配合 Suspense 用：

```tsx
<Suspense fallback={<Loading />}>
  {lazyContent}
</Suspense>
```

- 在 lazy chunk 还没加载完时，渲染 `fallback`
- chunk 加载完后，无缝切换到真实内容
- 切换路由到一个新 chunk 时，会短暂闪过 fallback

**最佳实践**：在路由这一层包一个 Suspense，全局 fallback 用骨架屏或 loading 条；页面内部数据加载用业务 loading（如 antd Spin）。

## React Router v6 对象式路由

```tsx
import { useRoutes } from 'react-router-dom';

const routes: RouteObject[] = [
  { path: '/', element: <Home /> },
  { path: '/about', element: <About /> },
  { path: '*', element: <NotFound /> },
];

function App() {
  return useRoutes(routes);  // 等价于一堆 <Route>
}
```

对比 JSX 式：
```tsx
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/about" element={<About />} />
</Routes>
```

**对象式**适合大型项目：
- 集中管理便于工具处理（权限校验、面包屑等）
- 支持嵌套数组
- 便于动态生成（菜单驱动路由）

## BrowserRouter vs HashRouter

| 类型 | URL | 服务端需要配置 |
|------|-----|---------------|
| **BrowserRouter** | `/users/123` | 必须配 fallback（dev/Nginx） |
| **HashRouter** | `/#/users/123` | 不用配，纯静态托管 |

- 90% 项目用 BrowserRouter（URL 更美观）
- 部署到纯静态环境（GitHub Pages 等）且无法配 fallback 时用 HashRouter

## ⭐ 自动 chunk 拆分 + splitChunks 的协作

我们在 Step 8 配的 splitChunks：
- 提取 `react`、`vendors`、`common`

异步 chunk（懒加载页面）也会被 splitChunks 处理：
- `chunks: 'all'` 包含异步
- 如果两个页面都用了某个第三方库，会被提取到 `vendors` 或 `common`，避免重复打包

例：如果 Home 和 About 都用了 `dayjs`，webpack 会**自动**把 dayjs 抽出来，不会在两个 chunk 里各打一份。

## 实战观察

```
dist/js/
├── runtime.166b3698.js              5.3 KB  ← 加载逻辑
├── main.0900b6ce.js                 2.1 KB  ← 业务入口
├── react.5a0931bc.js               185 KB   ← React 全家桶
├── vendors.b57fe3ae.js              55 KB   ← react-router-dom 等
├── page-home.b553d697.chunk.js     530 B   ← Home 页（异步）
├── page-about.9f6cd46e.chunk.js    522 B   ← About 页（异步）
└── page-dashboard.28d25460.chunk.js 1.7 KB  ← Dashboard 页（异步）
```

DevTools Network 行为：
- 首次访问 `/`：加载 runtime + react + vendors + main + page-home
- 切到 `/about`：**新发起一个**请求拿 page-about.chunk.js
- 切回 `/`：page-home 已缓存，不重新加载
- 因为 about 配了 prefetch，**首屏闲时已经预取**，切换瞬间完成

## historyApiFallback 配合

我们 Step 7 配过 `historyApiFallback: true`，让 dev server 把所有 404 fallback 到 index.html。所以：
- 直接访问 `http://localhost:5173/dashboard` → fallback → index.html → React Router 接管 → 渲染 Dashboard

**生产环境 Nginx 配置**：
```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

## 思考题
1. 假设我把 `webpackPrefetch: true` 全部加给所有路由，会有什么副作用？
2. 如果用户首次访问 `/dashboard`（直接输 URL），加载顺序是怎样的？
3. React.lazy 只支持 default export，碰到只有 named export 的页面该怎么办？
4. `chunks: 'all'` 和 `chunks: 'async'` 在我们这个项目里产物会差多少？

## 这一步证明了什么
路由懒加载是**前端首屏优化的最简单也最有效**的手段——不需要改业务逻辑，只是把"全量打包"改成"按需加载"，就让用户首屏只下载当前页面的代码。配合 prefetch 还能在用户无感知时提前加载下一页面，做到"切换零延迟"的体验。

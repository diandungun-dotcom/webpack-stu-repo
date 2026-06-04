// 路由配置集中管理
import React, { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

// ===== 路由懒加载 =====
//
// React.lazy(() => import('xxx')) 是 React 提供的"懒加载组件"API
// 内部依赖 webpack 的动态 import() 语法做代码分割
//
// 魔法注释 (magic comments)：
//   webpackChunkName: 给生成的 chunk 起名，否则是数字（0.chunk.js）
//   webpackPrefetch: true → 浏览器空闲时预取（<link rel="prefetch">）
//   webpackPreload: true  → 与父 chunk 并行加载（少用，慎用）
const Home = lazy(
  () => import(/* webpackChunkName: "page-home" */ '../pages/Home')
);
const About = lazy(
  () =>
    import(
      /* webpackChunkName: "page-about" */
      /* webpackPrefetch: true */
      '../pages/About'
    )
);
const Dashboard = lazy(
  () => import(/* webpackChunkName: "page-dashboard" */ '../pages/Dashboard')
);

// 使用 React Router v6+ 的对象式路由（也可以用 JSX 式 <Route>，看团队习惯）
export const routes: RouteObject[] = [
  { path: '/', element: <Home /> },
  { path: '/about', element: <About /> },
  { path: '/dashboard', element: <Dashboard /> },
  // 通配兜底：随便写个 404 提示
  {
    path: '*',
    element: <div style={{ padding: 24 }}>404 Not Found</div>,
  },
];

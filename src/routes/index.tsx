// 路由配置集中管理
import React, { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

// 用 alias 写：清爽、重构不破坏
const Home = lazy(() => import(/* webpackChunkName: "page-home" */ '@/pages/Home'));
const About = lazy(
  () =>
    import(
      /* webpackChunkName: "page-about" */
      /* webpackPrefetch: true */
      '@/pages/About'
    ),
);
const Dashboard = lazy(() => import(/* webpackChunkName: "page-dashboard" */ '@/pages/Dashboard'));
const ReduxDemo = lazy(() => import(/* webpackChunkName: "page-redux" */ '@/pages/ReduxDemo'));

export const routes: RouteObject[] = [
  { path: '/', element: <Home /> },
  { path: '/about', element: <About /> },
  { path: '/dashboard', element: <Dashboard /> },
  { path: '/redux', element: <ReduxDemo /> },
  {
    path: '*',
    element: <div style={{ padding: 24 }}>404 Not Found</div>,
  },
];

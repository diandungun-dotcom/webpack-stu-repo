import React, { Suspense } from 'react';
import { NavLink, useRoutes } from 'react-router-dom';
import styles from './App.module.scss';
import Logo from './assets/logo.svg';
import { routes } from './routes';

const App: React.FC = () => {
  // useRoutes：把对象式路由配置渲染成元素树
  // 等价于一堆 <Route path="x" element={<X />} /> 的写法，更利于集中管理
  const element = useRoutes(routes);

  return (
    <div className={styles.card}>
      <header className={styles.header}>
        <Logo width={40} height={40} />
        <h1 className={styles.title}>Webpack + React Demo</h1>
      </header>

      {/* 顶部导航 */}
      <nav className={styles.nav}>
        <NavLink
          to="/"
          end
          className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
        >
          首页
        </NavLink>
        <NavLink
          to="/about"
          className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
        >
          关于
        </NavLink>
        <NavLink
          to="/dashboard"
          className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
        >
          仪表盘
        </NavLink>
      </nav>

      {/*
        Suspense 是 React 提供的"等待组件加载完"的包装器
        当 React.lazy 包裹的组件还在加载时，渲染 fallback
        每次路由切换到新页面（chunk 未加载），都会先短暂显示 fallback
      */}
      <main className={styles.main}>
        <Suspense fallback={<div className={styles.loading}>页面加载中…</div>}>{element}</Suspense>
      </main>
    </div>
  );
};

export default App;

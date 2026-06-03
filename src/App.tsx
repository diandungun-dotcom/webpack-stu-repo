import React, { useState } from 'react';
import styles from './App.module.scss';

// ① SVG 默认导出 = React 组件（svgr 转换的结果）
import Logo from './assets/logo.svg';
import Heart from './assets/heart.svg';

// ② SVG 加 ?url 后缀 = URL 字符串（走 asset module）
import heartUrl from './assets/heart.svg?url';
// 大文件（>8KB）会被 webpack 输出成独立文件，浏览器单独请求
import bigUrl from './assets/big.svg?url';

const App: React.FC = () => {
  const [count, setCount] = useState<number>(0);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        {/* 当组件用：可以传 React 的 props 控制大小、颜色等 */}
        <Logo width={48} height={48} />
        <h1 className={styles.title}>Hello, Webpack + React + TS</h1>
      </div>

      <p>第 5 步：静态资源（图片 / SVG）已接入。</p>

      <p className={styles.count}>
        count = {count}
        {/* 当组件用：当成 React 节点直接渲染 */}
        <Heart width={20} height={20} />
        {/* 当 URL 用：放到 <img src=...> */}
        <img src={heartUrl} alt="heart" className={styles.heart} />
      </p>

      <div>
        <p>333下面这张大图（&gt;8KB）会作为独立文件输出到 dist/images/：</p>
        <img src={bigUrl} alt="big" width={100} height={100} />
      </div>

      <button onClick={() => setCount((c) => c + 1)}>+1</button>
    </div>
  );
};

export default App;

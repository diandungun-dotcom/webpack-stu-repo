import React, { useState } from 'react';
import styles from './index.module.scss';

const Dashboard: React.FC = () => {
  const [count, setCount] = useState(0);

  return (
    <div className={styles.page}>
      <h2>📊 仪表盘</h2>
      <p>本页包含 state 演示。切换路由再切回来，count 会重置（因为组件被卸载了）。</p>
      <div className={styles.counter}>
        <button onClick={() => setCount((c) => c - 1)}>-</button>
        <span>{count}</span>
        <button onClick={() => setCount((c) => c + 1)}>+</button>
      </div>
    </div>
  );
};

export default Dashboard;

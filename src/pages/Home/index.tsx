import React from 'react';
import styles from './index.module.scss';

const Home: React.FC = () => {
  return (
    <div className={styles.page}>
      <h2>🏠 首页</h2>
      <p>这是 Home 页面。访问它时，浏览器单独加载一个 home chunk。</p>

      {/* 环境变量演示：编译后这里会被替换成字符串字面量 */}
      <div className={styles.env}>
        <h3>注入的环境变量：</h3>
        <ul>
          <li>
            NODE_ENV: <code>{process.env.NODE_ENV}</code>
          </li>
          <li>
            APP_ENV: <code>{process.env.APP_ENV}</code>
          </li>
          <li>
            APP_API_BASE: <code>{process.env.APP_API_BASE}</code>
          </li>
          <li>
            APP_LOG_LEVEL: <code>{process.env.APP_LOG_LEVEL}</code>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Home;

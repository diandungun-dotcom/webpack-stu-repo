import React from 'react';
import styles from './index.module.scss';

const About: React.FC = () => {
  return (
    <div className={styles.page}>
      <h2>📘 关于</h2>
      <p>这是 About 页面，演示路由切换。</p>
      <p>
        切到这个页面时浏览器会加载 about chunk（如果之前没加载过的话）。
      </p>
    </div>
  );
};

export default About;

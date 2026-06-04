import React from 'react';
import styles from './index.module.scss';

const Home: React.FC = () => {
  return (
    <div className={styles.page}>
      <h2>🏠 首页</h2>
      <p>这是 Home 页面。访问它时，浏览器单独加载一个 home chunk。</p>
      <p>Network 面板里能看到 `pages-home.xxx.chunk.js` 被请求。</p>
    </div>
  );
};

// ⚠️ 必须 default export，配合 React.lazy() 默认导出约定
export default Home;

// 入口文件
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

import './styles/global.scss';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);

// BrowserRouter 提供 HTML5 history 路由能力（无 # 号）
// 它内部用 history API（pushState/popState），更接近真实 URL
// HashRouter 是另一种选择（带 #，无需服务器配合，适合静态托管）
//
// basename：路由的根路径前缀
//   本地：'/'，GitHub Pages 子路径部署：'/<repo-name>/'
//   读 webpack 注入的 process.env.APP_BASENAME（DefinePlugin 会替换成字面量）
const basename = process.env.APP_BASENAME || '/';

root.render(
  <BrowserRouter basename={basename}>
    <App />
  </BrowserRouter>,
);

// 入口文件
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { store } from './store';

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

// Provider 必须包在最外层（或至少包住所有用到 store 的组件）
// 它通过 React Context 把 store 实例向下传，useSelector / useDispatch 才能取到
root.render(
  <Provider store={store}>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </Provider>,
);

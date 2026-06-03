// 入口文件
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// 全局样式：仅副作用引入，不需要对象
import './styles/global.scss';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);

root.render(<App />);

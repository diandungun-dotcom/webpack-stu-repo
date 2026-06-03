# Step 1：初始化项目结构

## 目标
- 准备一个最小可运行的 React 项目骨架（不引入任何构建工具）
- 理解"为什么需要 webpack" — 看清没有构建工具时的局限

## 目录结构
```
webpack-react-demo/
├── .gitignore
├── package.json
├── public/
│   └── index.html       # HTML 模板
└── src/
    ├── App.jsx          # 根组件
    └── index.jsx        # React 入口
```

## 关键知识点

### 1. HTML 模板不写 <script>
- `public/index.html` 里**不要手动写** `<script src="...">`
- 因为打包产物的文件名通常会带 hash（如 `main.a1b2c3d4.js`），手写无法对应
- 由 `HtmlWebpackPlugin` 在构建时自动注入正确的 `<script>` 标签
- 即使不带 hash，多入口/code-splitting 会产生多个 chunk，手写也写不过来

### 2. React 18+ 使用 createRoot
```js
import { createRoot } from 'react-dom/client';
const root = createRoot(document.getElementById('root'));
root.render(<App />);
```
- 旧 API `ReactDOM.render` 已废弃
- `createRoot` 启用并发模式（Concurrent Mode），支持自动批处理、Suspense 等

### 3. 浏览器为什么不能直接运行 index.jsx
两层原因：

**① JSX 不是合法 JS 语法**
- 浏览器解析阶段就会报错
- JSX 本质是 `React.createElement(...)`（React 17+ 自动 runtime 转成 `_jsx(...)`）的语法糖
- 需要 Babel 或 TS 在构建期转换

**② import 'react' 是裸模块路径，浏览器不认识**
- 浏览器 ESM 只支持完整 URL 或 `./xxx.js` 这种相对路径
- 需要 webpack 把 `import 'react'` 解析成 `node_modules/react/...` 并打包

### 4. .gitignore 必须忽略的目录
- `node_modules/` — 体积大，可通过 `package.json` 重装
- `dist/` 或 `build/` — 构建产物，每次构建都会重新生成
- `.env.local` — 本地环境变量，可能含敏感信息

## 思考题
1. 为什么 HTML 模板里不需要手动写 `<script>`？
2. JSX 和 import 语法浏览器为什么不认识？

## 这一步证明了什么
**写了 React 代码 ≠ 能在浏览器里跑**。我们需要一个工具把这些"开发者友好"的代码翻译成"浏览器友好"的代码，这就是 webpack 的使命。

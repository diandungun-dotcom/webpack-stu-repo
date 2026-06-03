# Step 3：接入 Babel + TypeScript

## 目标
- 让 webpack 能处理 `.ts` / `.tsx` / `.jsx`
- 选定 TS 处理方案（Babel 而非 ts-loader）
- 理解 Babel preset 的职责划分

## 处理 TS 的两种方案对比

| 方案 | 优点 | 缺点 | 推荐场景 |
|------|------|------|---------|
| **ts-loader** | 编译 + 类型检查一步到位 | 慢；不支持 polyfill；和 Babel 生态割裂 | 强依赖类型检查的库构建 |
| **babel-loader + @babel/preset-typescript** | 快；和 JS 同一套工具链；可 polyfill；缓存友好 | 不做类型检查 | **应用项目主流选择** |

**主流选 B**（CRA、Next.js、Vite 都是）：
- 类型检查交给 IDE 实时跑 / CI 跑 `tsc --noEmit`
- Babel 只管"语法转换"，单一职责，速度快

## 安装的包

| 包 | 作用 |
|---|---|
| `@babel/core` | Babel 核心 |
| `babel-loader` | webpack ↔ Babel 桥梁 |
| `@babel/preset-env` | 根据目标浏览器把现代 JS 转兼容代码 |
| `@babel/preset-react` | JSX → `_jsx(...)` |
| `@babel/preset-typescript` | 删除 TS 类型注解（不检查） |
| `core-js` | polyfill 库（运行时依赖，dependencies） |
| `typescript` | TS 编译器（IDE / CI 用） |
| `@types/react` / `@types/react-dom` | 类型定义 |

## babel.config.js vs .babelrc

| 文件 | 作用范围 | 是否影响 node_modules |
|------|---------|---------------------|
| `.babelrc` / `.babelrc.json` | 所在目录及子目录 | ❌ |
| `babel.config.js` / `babel.config.json` | **项目级** | ✅（如果需要） |

现代项目推荐 `babel.config.js`。

## babel.config.js 关键配置

### preset-env
```js
['@babel/preset-env', {
  targets: '> 0.25%, not dead',  // 目标浏览器
  useBuiltIns: 'usage',           // 按需引入 polyfill
  corejs: 3,                      // 必须和安装的 core-js 大版本一致
}]
```

`useBuiltIns` 三种值：
- `'usage'`：分析代码用到啥就 import 啥（推荐）
- `'entry'`：需在入口 `import 'core-js'`，引入全部该浏览器需要的 polyfill
- `false`：不自动引入，需手动管理

### preset-react
```js
['@babel/preset-react', { runtime: 'automatic' }]
```
- `runtime: 'classic'`（旧）→ 必须每个文件 `import React`
- `runtime: 'automatic'`（React 17+ 推荐）→ Babel 自动注入 `import { jsx as _jsx } from 'react/jsx-runtime'`

### preset-typescript
直接 `'@babel/preset-typescript'` 即可，删除类型注解，**不做类型检查**。

## tsconfig.json 关键项

| 配置 | 作用 |
|------|------|
| `target: ESNext` | 输出目标语法版本（Babel 实际转换，TS 这里只为类型推导） |
| `module: ESNext` | 用 ESM 模块，保留交给 webpack 处理 |
| `moduleResolution: node` | Node 风格的模块解析（认 node_modules、index.js） |
| `jsx: react-jsx` | 对齐 preset-react 的 automatic runtime |
| `strict: true` | 开启全部严格检查（noImplicitAny / strictNullChecks 等） |
| `esModuleInterop: true` | 允许 `import React from 'react'` 兼容 CJS 模块 |
| `forceConsistentCasingInFileNames: true` | 路径大小写严格（防 mac 不区分大小写的坑） |
| `skipLibCheck: true` | 跳过 node_modules 的 .d.ts 检查，构建快很多 |
| `isolatedModules: true` | **必须开**：Babel 按单文件编译，需要每个文件可独立编译 |
| `noEmit: true` | TS 不输出文件，编译交给 Babel，TS 只做检查 |

## webpack 中的 babel-loader 配置

```js
{
  test: /\.[jt]sx?$/,           // 匹配 .js .jsx .ts .tsx
  exclude: /node_modules/,      // 不处理第三方库（已编译过）
  use: {
    loader: 'babel-loader',
    options: { cacheDirectory: true },  // 开启缓存，二次构建快
  },
}
```

**为什么 exclude node_modules？**
- 第三方库一般已经编译过
- 重复编译既慢又可能出错
- 极少数情况（库里有 ES6+ 未编译）需要白名单写法：`exclude: /node_modules\/(?!(some-modern-lib)\/).*/`

## 关键执行链路（重要）

当你写 `import App from './App'` 时：

1. **webpack** 根据 `resolve.extensions` 找到 `./App.tsx`
2. 命中 `module.rules` 中 `test: /\.[jt]sx?$/`
3. 文件源码进入 **babel-loader**
4. babel-loader 读取 `babel.config.js`，按顺序应用 preset：
   - `preset-typescript` 先删类型注解
   - `preset-react` 转 JSX
   - `preset-env` 按 target 转换 ES6+ 语法，按需注入 core-js polyfill
5. 输出标准 JS 给 webpack
6. webpack 继续处理 `import` 依赖（递归回到第 1 步）
7. 所有模块处理完后，**webpack** 把它们打成一个 bundle

## 思考题
1. 为什么 `tsconfig.json` 的 `isolatedModules` 必须开？
2. `babel.config.js` 里 preset 数组的顺序能换吗？为什么？
3. 如果 `useBuiltIns: 'usage'` 但忘了装 `core-js`，会发生什么？

## 这一步证明了什么
**webpack 不直接懂 TS/JSX，靠 loader 翻译**。Babel 是最常见的"翻译官"，它的 preset 体系让一份配置就能搞定 ES6+/JSX/TS 三件事。

下一步：让 webpack 处理 CSS。

# Step 4：接入样式（Sass + CSS Modules + PostCSS + autoprefixer）

## 目标
- 让 webpack 能处理 `.css` / `.scss` / `.module.scss`
- 用 CSS Modules 做组件级样式隔离
- 用 PostCSS + autoprefixer 自动加浏览器前缀

## 安装的包及职责

| 包 | 职责 |
|---|---|
| `style-loader` | 把 CSS 注入 `<style>` 标签（开发用，HMR 友好） |
| `css-loader` | 解析 CSS 的 `@import` / `url()`，把 CSS 转成 JS 模块 |
| `sass-loader` | 调 sass 编译器把 `.scss` 编成 `.css` |
| `sass` | dart-sass 编译器本体（替代老的 node-sass） |
| `postcss-loader` | 让 webpack 跑 PostCSS |
| `postcss` | PostCSS 核心，CSS 转换平台 |
| `autoprefixer` | PostCSS 插件，加 `-webkit-` 等前缀 |
| `postcss-preset-env` | 更全面的 PostCSS 预设（含 autoprefixer + 未来 CSS 语法） |

## ⭐ Loader 执行顺序（必背）

webpack loader **从右到左 / 从下到上**执行。

处理 `.scss` 的标准链路：
```
.scss 源文件
   ↓ sass-loader   ① 编译 .scss → .css
   ↓ postcss-loader ② 跑 autoprefixer 加前缀
   ↓ css-loader     ③ 处理 @import / url()，转 JS 模块
   ↓ style-loader   ④ 注入 <style>
```

配置写法（**注意顺序与执行顺序相反**）：
```js
use: ['style-loader', 'css-loader', 'postcss-loader', 'sass-loader']
//     ④执行         ③            ②                 ①
```

## CSS Modules（重点）

### 解决的问题
全局 CSS 类名冲突。大型项目里 `.btn`、`.title` 这种名字一抢就抢。

### 工作原理
打包时给每个类名加上**文件名 + hash**：
```scss
.card { ... }
```
变成：
```css
.App__card--a1b2c { ... }
```

JS 里通过对象访问：
```tsx
import styles from './App.module.scss';
<div className={styles.card}>  // 实际类名是 App__card--a1b2c
```

### 文件命名约定
- `xxx.module.scss` → 启用 CSS Modules
- `xxx.scss`（不带 .module）→ 全局样式
- 这是社区惯例（CRA、Next.js 都遵循）

### ⚠️ 必踩的坑：css-loader v4+ 的 namedExport

从 css-loader v4 开始，CSS Modules 的默认导出方式改成了 **named export**：

```ts
// 默认情况下，下面这样写会拿到 undefined！
import styles from './App.module.scss';
console.log(styles.card);  // 💥 Cannot read properties of undefined

// 必须改成：
import * as styles from './App.module.scss';
// 或者改回 default 导出（推荐）：
```

**解决方案（推荐）**：在 webpack 配置里关掉 namedExport
```js
{
  loader: 'css-loader',
  options: {
    modules: {
      localIdentName: '[name]__[local]--[hash:base64:5]',
      namedExport: false,             // ✅ 恢复 default 导出
      exportLocalsConvention: 'as-is', // ✅ 保留原类名（含连字符）
    },
  },
}
```

为什么社区主流选关掉？因为：
1. 老项目代码全是 `import styles from '...'`，改一遍成本高
2. `.foo-bar` 这种连字符类名在 named export 模式下会被转成 `fooBar`，反直觉
3. 默认 export 的对象访问写法 IDE 提示更友好

### webpack 配置区分两种规则
```js
// CSS Modules：必须先匹配
{
  test: /\.module\.s?css$/,
  use: [
    'style-loader',
    { loader: 'css-loader', options: { modules: { localIdentName: '[name]__[local]--[hash:base64:5]' } } },
    'postcss-loader',
    'sass-loader',
  ],
},
// 全局样式：必须排除 module，避免被吞
{
  test: /\.s?css$/,
  exclude: /\.module\.s?css$/,
  use: ['style-loader', 'css-loader', 'postcss-loader', 'sass-loader'],
},
```

### localIdentName 占位符
- `[name]`：源文件名
- `[local]`：原类名
- `[hash:base64:5]`：5 位 base64 hash
- 开发推荐 `[name]__[local]--[hash:base64:5]` 便于调试
- 生产可用 `[hash:base64:8]` 缩短产物体积

## TS + CSS Modules 必备的类型声明

没有声明 TS 会报红：
```ts
// src/types/declarations.d.ts
declare module '*.module.scss' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
declare module '*.scss';   // 全局样式，仅副作用引入
declare module '*.css';
```

进阶方案：用 `typescript-plugin-css-modules` 让 IDE 能补全实际类名（但要装到 IDE 的 TS Server）。

## PostCSS 配置

```js
// postcss.config.js
module.exports = {
  plugins: [
    require('autoprefixer'),
  ],
};
```

`postcss-loader` 会自动读取这个文件。

## browserslist 配置（必须）

PostCSS / autoprefixer / Babel preset-env 都用它确定"目标浏览器"。

```json
// package.json
"browserslist": {
  "production": [">0.2%", "not dead", "not op_mini all"],
  "development": [
    "last 1 chrome version",
    "last 1 firefox version",
    "last 1 safari version"
  ]
}
```

**好处**：开发环境只兼容最新浏览器 → 构建快、CSS 简单。生产环境覆盖广。Babel/PostCSS 都会根据 `NODE_ENV` 自动选用。

## css-loader 的 importLoaders 是什么？

```js
{ loader: 'css-loader', options: { importLoaders: 2 } }
```

含义："当 css-loader 处理 `@import 'a.scss'` 引入的文件时，应该先让后面 **2 个** loader（postcss-loader + sass-loader）再处理一次。"

不写这个的坑：`@import` 进来的 scss 文件可能跳过 sass/postcss 处理，导致变量、嵌套语法报错。

## style-loader vs MiniCssExtractPlugin

| 工具 | 用途 | 产物 |
|------|------|------|
| **style-loader** | 把 CSS 通过 JS 注入 `<style>` 到 head | 没有独立 .css 文件 |
| **MiniCssExtractPlugin** | 把 CSS 抽离成独立 .css 文件 | 生成 `xxx.css` |

- 开发用 style-loader（HMR 友好，更新无需刷新）
- 生产用 MiniCssExtractPlugin（独立文件可被浏览器并行下载、缓存）
- Step 8 生产环境优化会换上 MiniCssExtractPlugin

## 思考题
1. 如果不写 `importLoaders: 2`，`@import './other.scss'` 会发生什么？
2. 为什么必须把 `.module.s?css` 规则放在 `.s?css` 规则之前？
3. 在生产环境为什么要从 `style-loader` 换成 `MiniCssExtractPlugin`？

## 这一步证明了什么
**复杂资源在 webpack 里靠 loader 链组合完成**：sass-loader 编译、postcss-loader 加前缀、css-loader 解析、style-loader 注入——每个 loader 单一职责，串成流水线。CSS Modules 通过类名 hash 实现了组件级隔离，是大型项目避免类名冲突的标准方案。

# Step 5：接入静态资源（图片 / 字体 / SVG）

## 目标
- 用 webpack 5 内置的 Asset Modules 处理图片、字体
- 用 @svgr/webpack 让 SVG 可以当 React 组件用
- 理解 "小文件内联 / 大文件独立输出" 的策略

## ⭐ Asset Modules（webpack 5 内置，替代老三件套）

### 老方案 vs 新方案

| webpack 4 时代 | webpack 5 Asset Modules | 等价类型 |
|---|---|---|
| `file-loader` | `type: 'asset/resource'` | 输出文件，导出 URL |
| `url-loader` | `type: 'asset/inline'` | base64 内联 |
| `raw-loader` | `type: 'asset/source'` | 文件内容字符串 |
| `url-loader`（带阈值） | `type: 'asset'` | **智能选择**：小内联、大输出 |

**结论**：webpack 5 项目里不再需要装 `file-loader` / `url-loader` / `raw-loader`！

### 常用模板

```js
// 图片：智能模式
{
  test: /\.(png|jpe?g|gif|webp)$/,
  type: 'asset',
  parser: {
    dataUrlCondition: {
      maxSize: 8 * 1024,  // 阈值 8KB
    },
  },
  generator: {
    filename: 'images/[name].[hash:8][ext]',
  },
}

// 字体：强制独立输出
{
  test: /\.(woff2?|eot|ttf|otf)$/,
  type: 'asset/resource',
  generator: {
    filename: 'fonts/[name].[hash:8][ext]',
  },
}
```

### output.assetModuleFilename

全局兜底的 asset 输出文件名，规则的 `generator.filename` 优先级更高。

```js
output: {
  assetModuleFilename: 'assets/[name].[hash:8][ext]',
}
```

### 文件名占位符
- `[name]`：原文件名
- `[hash:8]`：内容 hash，前 8 位
- `[ext]`：扩展名（含点）
- `[contenthash]`：和 `[hash]` 在 asset 场景里一样

## 阈值（dataUrlCondition.maxSize）的取舍

| 大小 | 建议 |
|------|------|
| < 4KB | 一般内联（base64 overhead 可接受） |
| 4-8KB | 折中区，看团队约定 |
| > 8KB | 输出独立文件（走缓存、可并行下载） |

**内联的代价**：base64 比二进制大约 33%，且会膨胀 JS bundle。
**独立文件的代价**：多一次 HTTP 请求。

HTTP/2 多路复用环境下，独立文件成本下降，可以适当调低阈值。

## SVG 的特殊处理（@svgr/webpack）

### 三种典型用法

```ts
// 1. 当 React 组件（默认，由 svgr 转换）
import Logo from './logo.svg';
<Logo width={48} color="red" />

// 2. 当 URL 字符串（加 ?url 后缀，走 asset module）
import logoUrl from './logo.svg?url';
<img src={logoUrl} />

// 3. 在 CSS 里引用（issuer 是 .scss/.css，走 asset module）
.icon { background: url('./logo.svg'); }
```

### webpack 怎么区分？用 `oneOf` + `issuer` + `resourceQuery`

```js
{
  test: /\.svg$/i,
  oneOf: [
    // 优先：带 ?url query 的 → asset
    { resourceQuery: /url/, type: 'asset', generator: { filename: 'images/[name].[hash:8][ext]' } },
    // 其次：被 CSS 引用的 → asset
    { issuer: /\.s?css$/,   type: 'asset', generator: { filename: 'images/[name].[hash:8][ext]' } },
    // 最后：被 JS/TS 引用的 → svgr 转组件
    { issuer: /\.[jt]sx?$/, use: [{ loader: '@svgr/webpack', options: { icon: true } }] },
  ],
}
```

**`oneOf` 的特点**：只匹配第一条命中的规则，避免一个文件被多个 loader 重复处理。

### svgr 的 `icon: true` 是什么意思？
让 SVG 自动接收外部传入的 `width` / `height`，并删除原 SVG 中的 hard-coded 尺寸。生成的组件更像 icon 库的图标。

### TS 类型声明

```ts
// 默认导出：React 组件
declare module '*.svg' {
  import * as React from 'react';
  const Component: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & { title?: string }
  >;
  export default Component;
}

// ?url 后缀：URL 字符串
declare module '*.svg?url' {
  const src: string;
  export default src;
}
```

## 实战观察

构建产物：
```
dist/
├── index.html
├── main.js                       ← 含 base64 的小 SVG/图片
└── images/
    └── big.49c22ba2.svg          ← 超过 8KB 的独立输出
```

DevTools Network 面板请求：
- 小图标无独立请求（已 inline 进 JS）
- 大图独立请求 `/images/big.xxx.svg`
- 浏览器会缓存大图（带 hash，内容变了 URL 也变）

## Asset Module 还能做什么？高级技巧

### 1. 替换为更小的格式
```js
generator: {
  filename: 'images/[name].[hash:8][ext]',
  // 输出 webp 格式（需要其他工具配合）
}
```

### 2. 公开路径配置
```js
output: {
  publicPath: 'https://cdn.example.com/',  // CDN 部署时图片走 CDN
}
```
所有 asset 的 URL 会自动加上前缀，无需改源码。

### 3. 内联 webpack 决定不了的情况
强制内联：`import x from './a.png?inline'`（需要配规则）
强制独立：`import x from './a.png?url'`

## 思考题
1. 把 maxSize 调成 0 会怎样？把它调成 `Infinity` 又会怎样？
2. 为什么字体推荐用 `asset/resource` 而非 `asset` 智能模式？
3. SVG 当组件用比 `<img>` 用有什么好处和坏处？
4. `output.publicPath` 在什么场景下必须修改？

## 这一步证明了什么
webpack 5 用统一的 **Asset Modules** 替代了零散的资源 loader，配置更简洁、性能更好（内置）。SVG 通过 svgr 获得"既能当图片用、又能当组件用"的双重身份，是大型项目里图标系统的常用方案。

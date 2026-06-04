# Step 10：工程化补全（alias / env / ESLint / Prettier / 类型检查）

## 目标
- 路径别名告别 `../../../`
- 多环境变量管理（`.env.{NODE_ENV}`）
- ESLint + Prettier 统一代码风格
- 并行类型检查不阻塞构建

## 安装的包

| 包 | 作用 |
|---|---|
| `dotenv` | 解析 .env 文件 |
| `eslint` + `@eslint/js` | 静态检查 |
| `globals` | 浏览器/Node 全局变量集合 |
| `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin` | TS 支持 |
| `eslint-plugin-react` + `eslint-plugin-react-hooks` | React 规则 |
| `prettier` + `eslint-config-prettier` + `eslint-plugin-prettier` | 格式化集成 |
| `fork-ts-checker-webpack-plugin` | 并行类型检查 |
| `@types/node` | process.env 等 Node 类型 |

## ① 路径别名 alias

### 必须配两处

| 配置 | 作用对象 | 不配的后果 |
|---|---|---|
| `webpack.config.js` resolve.alias | webpack 运行时解析模块 | 构建失败"找不到模块" |
| `tsconfig.json` paths | TS / IDE 解析类型、跳转 | IDE 红波浪线，跳不到定义 |

**两边必须保持一致！** 否则 webpack 通过但 IDE 报错。

### webpack.alias
```js
resolve: {
  alias: {
    '@': path.resolve(ROOT, 'src'),
  },
}
```

### tsconfig.paths (TS 5+ bundler 模式)
```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",  // ⭐ TS 5+ 推荐，专为打包器设计
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### moduleResolution 三种模式对比

| 模式 | 适用场景 | 特点 |
|---|---|---|
| `node` / `node10` | 老 Node 项目 | TS 7 将废弃 |
| `node16` / `nodenext` | 现代 Node 后端 | 强 .js 后缀，严格 |
| **`bundler`** ⭐ | **webpack / Vite 等打包器** | 宽松，原生支持 paths |

应用项目用 `bundler`，Node 库项目用 `nodenext`。

## ② 环境变量

### .env 文件加载优先级

dotenv 风格的优先级（前者覆盖后者）：
```
.env.{NODE_ENV}.local    本地特殊（不入 git）
.env.{NODE_ENV}          按环境
.env.local               全局本地（不入 git）
.env                     兜底
```

### 安全约定：只暴露 APP_ 开头的变量

```js
Object.entries(parsed).forEach(([k, v]) => {
  if (k.startsWith('APP_')) {  // 只允许 APP_ 前缀
    envVars[k] = v;
  }
});
```

类比 CRA 的 `REACT_APP_` 前缀。**这样设计是防止意外把 DB 密码、API key 等敏感变量打进前端代码。**

### DefinePlugin 的本质

```js
new webpack.DefinePlugin({
  'process.env.APP_API_BASE': JSON.stringify('http://localhost:3000/api'),
})
```

**编译时字符串替换**：
```js
// 源码
const url = process.env.APP_API_BASE;
// 编译后
const url = "http://localhost:3000/api";
```

⚠️ **必须 `JSON.stringify`**！否则替换后变成裸标识符：
```js
const url = http://localhost:3000/api;  // 语法错误！
```

### TS 类型补充

```ts
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production';
    APP_API_BASE: string;
    APP_ENV: string;
  }
}
```
让 IDE 提供智能补全和类型检查。

## ③ ESLint v9 flat config

### 旧 vs 新

| 旧（.eslintrc.*） | 新（eslint.config.js） |
|---|---|
| 字符串 extends | 直接 require 配置对象 |
| 嵌套 overrides | 多个独立配置对象 |
| 隐式合并 | 显式数组顺序 |

### 核心结构

```js
module.exports = [
  // 1. 忽略
  { ignores: ['dist/**'] },
  // 2. 共享 base 规则
  js.configs.recommended,
  // 3. 业务文件的语言/插件/规则
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { parser, parserOptions, globals },
    plugins: { ... },
    rules: { ... },
  },
  // 4. 关闭与 Prettier 冲突的规则（必须最后）
  prettierConfig,
];
```

### globals 包

不要手写 `window/document/...`：
```js
languageOptions: {
  globals: {
    ...globals.browser,  // 浏览器全部全局
    ...globals.node,     // process / Buffer 等
  },
}
```

### prettier 集成的关键

`eslint-config-prettier` 必须放数组**最后**——它会"反向关闭"所有可能和 Prettier 冲突的格式规则。

`eslint-plugin-prettier` 则让 Prettier 的报告通过 ESLint 走（一个工具看所有问题）。

## ④ fork-ts-checker-webpack-plugin

### 为什么需要？

Babel 编译 TS **只删类型**，不做类型检查。生产构建时希望类型错误能在 CI 阶段拦住，又不想让 `tsc` 串行跑（慢）。

**fork-ts-checker** 起一个子进程跑 tsc，**不阻塞 webpack 主流程**：
- webpack 继续编译/打包，速度不受影响
- 子进程在后台跑类型检查
- 有错时把错误同步到 webpack 输出（dev server overlay 显示）

### 配置

```js
new ForkTsCheckerWebpackPlugin({
  typescript: {
    configFile: path.resolve(ROOT, 'tsconfig.json'),
    diagnosticOptions: {
      syntactic: true,
      semantic: true,
    },
  },
})
```

dev 模式下，类型错误会出现在浏览器红色 overlay；prod 构建有错时退出码非 0，CI 会失败。

## ⑤ 实用 npm scripts

```json
"scripts": {
  "start": "...webpack serve...",
  "build": "...webpack...",
  "build:analyze": "ANALYZE=true ...webpack...",  // 启用打包分析
  "typecheck": "tsc --noEmit",                     // 单独跑类型检查
  "lint": "eslint 'src/**/*.{ts,tsx,js,jsx}'",
  "lint:fix": "eslint 'src/**/*.{ts,tsx,js,jsx}' --fix",
  "format": "prettier --write 'src/**/*'",
  "format:check": "prettier --check 'src/**/*'"
}
```

`lint:fix` / `format` 是开发日常；CI 一般跑 `typecheck` + `lint` + `format:check` + `build`。

## 思考题
1. webpack alias 配了 `@: src`，tsconfig 忘配 paths，会发生什么？
2. `.env.local` 为什么要放进 .gitignore？什么场景下该用它？
3. DefinePlugin 是"编译时字符串替换"，能不能用它做运行时变量？为什么？
4. fork-ts-checker 和 `npm run typecheck` 各自适合什么场景？

## 这一步证明了什么
工程化补全的核心是**消除"开发者认知摩擦"**：alias 让导入路径不再混乱、env 让多环境管理统一、ESLint+Prettier 让代码风格自动统一、类型检查让 TS 真正有用。这些东西看似零碎，但每一项缺失都会拖累团队效率。**一个成熟项目的脚手架，差不多就是把这些都做齐**。

## 🎉 整套搭建到此完成

回顾走过的 10 步：
1. 初始化结构（手写 React 入口）
2. 最小可运行 webpack（5 大概念）
3. Babel + TS（preset 三件套）
4. Sass + CSS Modules + PostCSS（loader 链）
5. 静态资源（Asset Modules + svgr）
6. 拆分 dev/prod/common 配置（webpack-merge）
7. dev-server + HMR + react-refresh（开发体验）
8. 生产优化（splitChunks + gzip + analyzer）
9. React Router + 懒加载（动态 import）
10. 工程化补全（alias / env / lint / 类型检查）

这套配置基本可以作为**生产级脚手架**的起点。剩下的就是按业务需求往上叠加：
- 状态管理（Redux Toolkit / Zustand）
- 数据请求（TanStack Query / SWR）
- UI 库（Antd / MUI）
- 测试（Jest / Vitest）
- CI/CD（GitHub Actions）

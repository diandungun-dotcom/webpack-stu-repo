# Step 6：拆分 webpack 配置（common / dev / prod）

## 目标
- 把单一的 webpack.config.js 拆成三份，按环境分文件
- 用 webpack-merge 智能合并配置
- 看见 dev / prod 产物的真实差异

## 为什么要拆？

| 不拆 | 拆了 |
|------|------|
| 一个文件越写越长 | 每文件几十行，职责单一 |
| 满屏 `if (isProd)` | 各自独立，无需判断 |
| 改一处怕影响另一处 | 互不干扰 |
| 难复用 | common 共享 |

业内规范做法。CRA 早期、vue-cli、各种内部脚手架都是这种拆法。

## 目录结构

```
config/
├── webpack.common.js  # entry / output / loader（非 CSS）/ resolve / HtmlWebpackPlugin
├── webpack.dev.js     # mode:development + style-loader CSS 规则 + devtool + devServer
├── webpack.prod.js    # mode:production + MiniCssExtract CSS 规则 + 优化项
└── utils.js           # 共享工具（如 createCssRules 工厂函数）
```

## webpack-merge 核心机制

普通 `Object.assign` 合并的问题：
```js
const a = { module: { rules: [r1] } };
const b = { module: { rules: [r2] } };
Object.assign({}, a, b);
// 结果：module.rules = [r2]   r1 被覆盖！
```

webpack-merge：
```js
merge(a, b);
// 结果：module.rules = [r1, r2]   智能拼接
```

它对：
- 数组：`concat`（拼接）
- 对象：递归合并
- `plugins`：拼接
- 同名 loader 规则：保持配置叠加

进阶：`mergeWithCustomize` 可以指定每个字段的合并策略（比如想让某条规则覆盖而不是拼接）。

## CSS 规则为什么不放 common？

因为 **dev 用 style-loader，prod 用 MiniCssExtractPlugin.loader**，loader 不同。所以：
- 抽个工厂函数 `createCssRules(isProd)` 放 `utils.js`
- dev/prod 各自调用工厂函数生成规则

这样既避免重复，又能根据环境切换 loader。

## dev vs prod 配置差异速记

| 维度 | dev | prod |
|------|-----|------|
| mode | `'development'` | `'production'` |
| 文件名 | `[name].js` | `[name].[contenthash:8].js` |
| chunk filename | 无 | `[name].[contenthash:8].chunk.js` |
| devtool | `eval-cheap-module-source-map` | `source-map` |
| CSS | `style-loader` 注入 | `MiniCssExtractPlugin` 抽离 |
| CSS Modules localIdentName | `[name]__[local]--[hash:base64:5]` | `[hash:base64:8]` |
| 优化 | 关闭（构建快） | 自动开（压缩、Tree Shaking、Scope Hoisting） |
| React 内部 | development 版（含警告） | production 版（精简） |

## ⭐ devtool 选项对照表（重要）

| 值 | 速度 | 调试质量 | 场景 |
|----|------|---------|------|
| `false` | 最快 | 无 | 不需要 source-map |
| `eval` | 极快 | 差（看到的是编译后） | 不用 |
| `eval-source-map` | 慢 | 高（看到源码） | dev 备选 |
| **`eval-cheap-module-source-map`** | **快** | **较高** | **🌟 dev 推荐** |
| `cheap-module-source-map` | 中等 | 较高 | dev 备选 |
| **`source-map`** | **慢** | **最高** | **🌟 prod 推荐** |
| `hidden-source-map` | 慢 | 最高（但不引用） | prod，用于错误监控但不暴露 |

**助记**：
- `eval` 前缀 = 用 eval 包裹，重建快但只在 dev 用
- `cheap` = 只映射到行（不到列），编译快
- `module` = 经过 loader 处理后映射回源码（看到 .tsx 而非 babel 编译后的 JS）
- `inline` = source-map 内嵌（很大，不要在 prod 用）
- `hidden` = 生成但不在 JS 末尾加 `//# sourceMappingURL` 引用

## cross-env 是什么？

跨平台设置环境变量。
- Windows：`SET NODE_ENV=production && webpack`
- Mac/Linux：`NODE_ENV=production webpack`
- 用 cross-env 统一：`cross-env NODE_ENV=production webpack`

## npm scripts 设计

```json
"scripts": {
  "build": "cross-env NODE_ENV=production webpack --config config/webpack.prod.js",
  "build:dev": "cross-env NODE_ENV=development webpack --config config/webpack.dev.js",
  "typecheck": "tsc --noEmit"
}
```

> `webpack` 默认找根目录的 `webpack.config.js`，我们拆到 `config/` 下了，必须用 `--config` 指定。

## 实际效果对比

同一份源码：

| 项 | dev 产物 | prod 产物 |
|---|---|---|
| `main.js` | 1.38 MB | **212 KB**（↓85%） |
| React 版本 | development（警告完整） | production（精简） |
| CSS | inline 在 JS 里 | 独立 .css 文件 |
| 文件名 | `main.js` | `main.3c80ea7e.js`（带 hash） |
| Source Map | eval 形式内联 | 独立 `.map` 文件 |
| LICENSE.txt | 无 | 自动生成（Terser 抽离第三方协议） |

`mode: 'production'` 一个开关就让产物缩 85%！它自动做的事：
1. **TerserPlugin** 压缩 JS（变量名、空白、死代码）
2. **Tree Shaking**（移除未引用 ESM 导出）
3. **Scope Hoisting**（多模块合并到一个作用域，减少闭包开销）
4. **DefinePlugin** 替换 `process.env.NODE_ENV` 为 `"production"`
   → React 内部 `if (process.env.NODE_ENV !== 'production')` 块在 Terser 阶段被移除
5. **SideEffects** 检查（package.json 的 `sideEffects` 字段配合 Tree Shaking）

## 思考题
1. 为什么 dev 用 `eval-cheap-module-source-map`，prod 用 `source-map`？取舍是什么？
2. 如果不用 webpack-merge，用 `Object.assign` 把 common 和 dev 合并，会出什么问题？
3. `mode: 'production'` 让产物从 1.38MB 降到 212KB，主要靠哪些机制？
4. 为什么把 CSS 规则放在 dev/prod 而不是 common？能不能用变量在 common 里区分？

## 这一步证明了什么
**配置文件的工程化是大项目里最先要做的"基础设施"**。三份配置 + webpack-merge 是社区共识方案。光是 `mode: 'production'` 这个开关，就能让产物体积下降 85%，因为它在背后激活了一堆默认优化插件。

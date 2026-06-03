# Step 2：安装并配置最小可运行的 webpack

## 目标
- 安装 webpack 三件套，写第一份配置
- 验证：在没有 loader 时 webpack 处理不了 JSX（教学失败）
- 理解 entry / output / mode / plugins / resolve 的作用

## 安装的包

| 包 | 类型 | 作用 |
|------|------|------|
| `webpack` | devDep | 打包核心 |
| `webpack-cli` | devDep | 命令行工具（webpack 4+ 单独拆出） |
| `html-webpack-plugin` | devDep | 生成 HTML 并自动注入打包产物 |
| `react` | dep | React 库本体 |
| `react-dom` | dep | 浏览器渲染层（createRoot 在这里） |

## 配置 5 大核心字段

### mode（构建模式）
- `'development'`：保留可读性，构建快，不压缩
- `'production'`：自动开启压缩、Tree Shaking、Scope Hoisting；`process.env.NODE_ENV` 被替换为 `"production"`
- `'none'`：什么默认优化都不做

### entry（入口）
- 依赖图的起点，webpack 从这里出发递归找所有 import
- 单入口：`entry: './src/index.jsx'`
- 多入口：`entry: { app: './src/app.js', admin: './src/admin.js' }`

### output（输出）
```js
output: {
  path: path.resolve(__dirname, 'dist'),  // 必须是绝对路径
  filename: '[name].js',                  // [name] 对应 entry 的 key（默认 'main'）
  clean: true,                            // webpack 5 内置清理 dist，替代 clean-webpack-plugin
}
```
常用占位符：
- `[name]`：chunk 名称
- `[hash]`：整次构建的 hash（粒度粗，不推荐）
- `[chunkhash]`：每个 chunk 的 hash
- `[contenthash]`：基于文件内容的 hash（**推荐用于缓存**）

### resolve.extensions（解析省略后缀）
```js
resolve: { extensions: ['.js', '.jsx'] }
```
- 让你能写 `import App from './App'` 而不用写 `.jsx`
- **顺序很重要**：同名文件存在时，靠前的优先
  - 例：`App.js` 和 `App.jsx` 同时存在，上面的配置会选 `App.js`
- 社区主流（CRA/Vite）把 `.js` 放前面：因为 `node_modules` 几乎全是 `.js`，能少走一次文件查找，构建更快
- 同构项目可以用 `['.web.tsx', '.tsx', '.ts', '.js']` 实现一份逻辑多端差异化

### plugins（插件）
- 介入 webpack 构建生命周期做事
- HtmlWebpackPlugin 用法：
```js
new HtmlWebpackPlugin({
  template: path.resolve(__dirname, 'public/index.html'),
  filename: 'index.html',
})
```

## 关键报错与含义

```
Module parse failed: Unexpected token
You may need an appropriate loader to handle this file type
```
- 含义：webpack 原生只能解析标准 JS，遇到 JSX / TS / CSS 这类非 JS 内容无能为力
- 解决：配置 loader（下一步 Babel）

## Loader vs Plugin（重要）

| 维度 | Loader | Plugin |
|------|--------|--------|
| 作用 | 转换文件内容 | 介入构建生命周期 |
| 工作时机 | 模块加载阶段 | 整个构建过程 |
| 本质 | `(source) => newSource` 的函数 | 含 `apply(compiler)` 方法的类 |
| 顺序 | 从右到左、从下到上 | 注册顺序（部分插件可指定 stage） |

## 思考题与答案

1. **mode 改成 production，main.js 会变成什么样？**
   - 被 Terser 压缩混淆，变量名变 `a/b/c`，空格换行去掉
   - Tree Shaking 移除未用 ESM 导出
   - 默认无 source-map，难以调试 → 需专门配 `devtool`

2. **extensions 顺序反过来会怎样？**
   - 同名文件存在时，优先级随之变化
   - 性能上略有差异（向前的扩展名查找次数更少）

3. **App.js 和 App.jsx 都存在时，import './App' 引哪个？**
   - 取决于 `extensions` 顺序，靠前的胜出

## 这一步证明了什么
webpack 本身只是个**调度器**，真正干活的是 loader（翻译）和 plugin（介入流程）。下一步引入 Babel loader 让 JSX 能跑。

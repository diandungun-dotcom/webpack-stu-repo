# Step CI-3b：从 npm 迁移到 pnpm

## 为什么必须切

被 npm 在 GitHub runner 上的 hang bug 折磨够了：
- `npm error Exit handler never called!`
- bahmutov/npm-install 也救不了，因为 npm 进程真的 hang 住
- 已知 issue：actions/runner-images#6698、#3737

## pnpm 优势对比

| 维度 | npm | pnpm |
|---|---|---|
| 存储 | 每项目独立 node_modules | 全局 store + hardlink 共享 |
| 结构 | 扁平（**幽灵依赖**） | 严格嵌套（只能用声明的依赖） |
| 速度 | 慢 | **快 2-3 倍** |
| 磁盘 | 大 | 小（hardlink 0 拷贝） |
| monorepo | 需要 lerna/nx | 原生 workspace |
| CI 稳定性 | hang bug 多 | 没听过 |

### 幽灵依赖示意
```
npm 装出来：
node_modules/
├── A/   ← package.json 里声明的
├── B/   ← A 的依赖
└── C/   ← B 的依赖
所有都被提到顶层 → 你的代码可以 import 'B' / import 'C' 但你没声明
```

```
pnpm 装出来：
node_modules/
├── A → .pnpm/A@1.0.0/node_modules/A   ← 软链
└── .pnpm/
    ├── A@1.0.0/node_modules/{A, B}    ← A 能看到 B
    └── B@2.0.0/node_modules/{B, C}    ← B 能看到 C
你的代码只能 import 'A'（package.json 里有）
```

---

## 迁移步骤

### 1. 装 pnpm
```bash
npm install -g pnpm@9   # Node 20 兼容
pnpm -v                 # 9.15.9
```

### 2. 清理 npm 痕迹
```bash
rm -rf node_modules package-lock.json
pnpm install            # 生成 pnpm-lock.yaml
```

### 3. 配 .npmrc（pnpm 也读这个文件）
```ini
auto-install-peers=true       # peer dep 自动装
strict-peer-dependencies=false  # 宽容 peer 不匹配
audit=false                   # 跳过 audit
fund=false                    # 跳过 fund 提示
shamefully-hoist=true         # 兼容老工具，把包扁平化到 node_modules 根
```

### 4. package.json 加版本锁定
```json
{
  "packageManager": "pnpm@9.15.9",
  "engines": { "node": ">=18" }
}
```

`packageManager` 是 Corepack 标准（Node 16.13+ 内置），`corepack enable` 后自动用对应版本。

### 5. CI 改造（关键：pnpm 必须在 setup-node 之前装）
```yaml
- uses: pnpm/action-setup@v4         # 1. 装 pnpm
- uses: actions/setup-node@v4         # 2. 装 Node + cache
  with:
    node-version: 20
    cache: 'pnpm'                     # 注意这里换成 pnpm
- run: pnpm install --frozen-lockfile # 3. 装依赖（类似 npm ci）
- run: pnpm run lint                  # 4. 跑脚本（命令和 npm 完全一样）
```

### 6. 把 npm run → pnpm run（所有 scripts 调用）

注意点：
- 顺序敏感：pnpm/action-setup **必须**在 setup-node 之前，否则 `cache: 'pnpm'` 找不到 pnpm 二进制
- `--frozen-lockfile` 等价 `npm ci`
- 命令名换：`npm install` → `pnpm install` / `npm run xxx` → `pnpm run xxx` / `npm test` → `pnpm test`

---

## 本地效果

| 操作 | npm | pnpm |
|---|---|---|
| 第一次 install | ~30s | ~26s（首次还要建 store） |
| 第二次 install（store 已有） | ~30s | **~5s** |
| 磁盘占用 | 500MB+ | <100MB（hardlink） |

---

## CI 上还会修哪些
- 不再有 npm hang bug
- pnpm install 比 npm 快
- pnpm/action-setup + setup-node cache: 'pnpm' 配合自动缓存

---

## 踩坑

1. **pnpm 最新版要 Node 22+**：装 `pnpm@9` 兼容 Node 18+
2. **shamefully-hoist 必须开**：有些老 webpack 插件会自己 require 嵌套依赖
3. **husky 的 prepare 仍然能跑**：pnpm 也支持 npm lifecycle scripts

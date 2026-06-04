# Step CI-2：依赖缓存 + husky + CI 防御性加固

## 目标
1. 用 npm 缓存把 install 从 60s 缩到 10s
2. 加 husky + lint-staged：commit 前自动 lint/format
3. 把上一步遇到的 `eslint: not found` + 进程卡死两个真实坑修掉

---

## 一、npm 缓存（actions/setup-node 内置）

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'
```

### 工作原理
1. **计算 key**：`runner-os + 'node-' + hashFiles('package-lock.json')`
2. **查缓存**：命中就恢复，不命中正常下载
3. **job 结束**：自动把对应目录上传成缓存

### 缓存的到底是什么
- `cache: 'npm'` → 缓存 `~/.npm`（npm 的 tarball 下载缓存）
- `cache: 'yarn'` → `~/.cache/yarn`
- `cache: 'pnpm'` → `~/.local/share/pnpm/store`

⚠️ **不是缓存 `node_modules/`**——node_modules 含 native 模块绑 OS/Node 版本，跨平台炸。

### 缓存命中后 install 还要 ~10s 在干啥
1. **解压 tarball**（.tar.gz → 真实文件）
2. **建立 node_modules 树**（拷贝/硬链接）
3. **执行 lifecycle scripts**（native 模块编译、prepare 等）

---

## 二、hashFiles 与缓存 key

`hashFiles('**/package-lock.json')`：
- 计算的是**文件内容**的 SHA-256（不是文件名）
- `**` 是 glob：匹配所有 lock 文件，把内容拼起来再算一次 hash
- lock 内容变了 → key 变 → 缓存 miss → 重新装 + 重新写缓存

---

## 三、husky + lint-staged：质量门禁前移

### 工具职责
| 工具 | 作用 |
|---|---|
| husky | 把脚本注入 .git/hooks，让 commit/push 触发自定义逻辑 |
| lint-staged | 只对 staged 文件跑 lint/format，毫秒级 |

### 安装与初始化
```bash
npm install --save-dev husky lint-staged
npx husky init
```

husky v9+ 的 `init` 命令会：
1. 创建 `.husky/_/`（实际钩子）
2. 创建 `.husky/pre-commit`（默认内容 `npm test`）
3. 在 package.json 加 `"prepare": "husky"`
4. `git config core.hooksPath .husky/_`

### 修改 pre-commit
```sh
# .husky/pre-commit
npx lint-staged
```

### lint-staged 配置（package.json）
```json
{
  "lint-staged": {
    "src/**/*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
    "src/**/*.{scss,css,json}": ["prettier --write"]
  }
}
```

### 团队同事生效路径
- 同事 clone 后 `npm install` → 触发 `prepare` 脚本 → husky 自动配
- **坑**：用 `npm ci --ignore-scripts` 不会触发 prepare，hooks 不生效
- **CI 跳过 husky**：设环境变量 `HUSKY=0`

---

## 四、踩坑实录与最终方案

### 坑 1：CI 上 `eslint: not found`
**现象**：本地能跑，CI 报 `sh: 1: eslint: not found`，exit 127

**真实根因**：上一步 `npm ci` **崩了但 exit 0**（npm bug：`Exit handler never called!`），导致后续步骤认为安装成功继续往下走。

**两步修复**：
1. 让 install 真正失败：用 `set -e` + step 级 `timeout-minutes`
2. 加一个显式断言步：检查 node_modules 和 .bin/eslint 真的存在

### 坑 2：第一版修复后 install 卡死 5 分钟
**原因**：
- `.npmrc` 写了 `fetch-timeout=600000`（10 分钟）
- `fetch-retries=5` × `fetch-retry-maxtimeout=120000` = 单次最坏等 10 分钟
- 外层 bash for 又 retry 3 次
- 嵌套 retry 把等待时间放大

**正确做法**：
- 短 timeout（60s 单请求），少 retry（3 次），不嵌套
- step 级用 GitHub Actions 原生 `timeout-minutes: 5` 硬切断
- 让 npm 自己处理 retry，不要外层再套 bash for

### 最终 .npmrc
```ini
legacy-peer-deps=true
fetch-retries=3
fetch-retry-mintimeout=5000
fetch-retry-maxtimeout=20000
fetch-timeout=60000
audit=false
fund=false
```

### 最终 ci.yml 关键片段
```yaml
jobs:
  quality-check:
    runs-on: ubuntu-latest
    timeout-minutes: 15        # job 兜底
    env:
      HUSKY: 0                 # 跳过 husky 安装

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'         # 启用缓存

      - name: 安装依赖
        timeout-minutes: 5     # 关键：5 分钟硬切断
        run: npm ci

      - name: 验证依赖已安装   # 兜底：防 npm "假成功"
        run: |
          set -e
          test -d node_modules
          test -x node_modules/.bin/eslint
          test -x node_modules/.bin/webpack

      - name: 失败时上传 npm 日志
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: npm-debug-log
          path: ~/.npm/_logs/
          if-no-files-found: ignore
```

---

## 五、CI 失败如何"硬终止"（防止误导）

5 个层级，从下往上越来越硬：

| 层级 | 写法 | 说明 |
|---|---|---|
| 0. 默认 | step 退出码非 0 自动停 | 可能被 npm 假 exit 0 骗 |
| 1. shell 强化 | `set -euo pipefail` | bash 内任何错误都炸 |
| 2. 显式断言 | `test -d node_modules \|\| exit 1` | 自己再验证一遍 |
| 3. step 级 timeout | `timeout-minutes: 5` | 防卡死 |
| 4. job 级 timeout | `timeout-minutes: 15` | 终极兜底 |
| 5. 失败收集日志 | `if: failure()` 上传 artifact | 失败也要善后 |

**核心心法**：CI 设计要"不信任默认行为"——多写显式断言，多打日志，多设 timeout。

---

## 六、npm ci vs npm install（必背）

| 维度 | npm install | npm ci |
|---|---|---|
| lock 文件 | 可能修改 | **不修改** |
| node_modules | 增量 | **先删光再装** |
| 依赖树解析 | 要算 | 不算（读 lock） |
| lock 与 package.json 冲突 | 自动调和 | **直接报错** |
| 速度 | 慢 | 快 |
| 场景 | 开发加包 | CI / 复现环境 |

**CI 必须 `npm ci`** 的核心理由：**可重现性**——同一份 lock 装出来每次完全一样。

---

## 七、产物

- `.npmrc`：npm 网络/peer dep 配置
- `.husky/pre-commit`：本地提交前自动 lint
- `package.json`：`lint-staged` 配置 + `"prepare": "husky"`
- `.github/workflows/ci.yml`：加入缓存、超时、断言、日志上传

---

## 八、补遗：手写 npm ci 还是失败 → 用社区 action 兜底

加了 `.npmrc` + `timeout-minutes` + `set -e` + 兜底验证之后，CI 上 npm ci 还是
偶发卡 5 分钟后被 `timeout-minutes` 切断，报 "The operation was canceled"。

### 根因
**GitHub runner 上 npm 进程偶发挂起是 known issue**：
- `actions/runner-images#6698` "ubuntu-latest causes Node.js process to hang indefinitely"
- `actions/runner-images#3737` "Actions fail intermittently due to NPM ECONNRESET"

npm 拉某个 tarball 时 socket keep-alive 不返回，自身 fetch-timeout 救不回来。
我们手写 `bash for` 重试也救不了 —— bash **杀不掉挂起的子进程**。

### 解决：换社区 action
```yaml
- name: 安装依赖
  timeout-minutes: 8
  uses: bahmutov/npm-install@v1
  with:
    useLockFile: true   # 走 npm ci
```

bahmutov/npm-install 做了什么：
1. 自动 actions/cache 缓存 `node_modules`（key = hashFiles(lock)）
2. 缓存命中：直接复用，秒过
3. 缓存未命中：跑 npm ci，失败自动重试
4. **内部处理进程超时和强杀**，比 bash for 可靠

⚠️ 用了 bahmutov 之后，setup-node 的 `cache: 'npm'` 要**删掉**，否则两个缓存机制
冲突会乱。

### 重要教训
**CI 上能用社区 action 就别手写 bash**。理由：
- 边界情况别人处理过了
- 维护成本为零
- 出问题搜得到答案

下一步：**Step CI-3 矩阵构建**（同时在 Node 18/20/22 上跑，确保兼容性）。

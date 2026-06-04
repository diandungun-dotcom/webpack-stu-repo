# Step CI-1：基础 CI（最小可用 workflow）

## 目标
- 理解 CI/CD 概念
- 写出第一个 GitHub Actions workflow
- 推送后看到自动跑 lint / typecheck / build

## CI vs CD（必背）

| 概念 | 全称 | 一句话 |
|------|------|--------|
| **CI** | Continuous Integration | 每次推代码自动跑测试/lint/构建 |
| **CD (delivery)** | Continuous Delivery | 自动准备好可发布版本（人工触发上线） |
| **CD (deployment)** | Continuous Deployment | 全自动上线（连点都不点） |

90% 团队：CI 全自动 + 生产环境 CD 半自动（要人审批）。

## GitHub Actions 核心概念

| 概念 | 含义 |
|------|------|
| workflow | 一个 yml 文件 = 一个流程 |
| event | 触发条件（push / pull_request / schedule / workflow_dispatch） |
| job | 流程中的独立任务，默认并行 |
| runner | 执行机器（GitHub 提供免费的 ubuntu/macos/windows） |
| step | job 里的一步：run shell 或 uses action |
| action | 复用单元（如 actions/checkout） |
| secrets | 加密变量 |
| artifact | 构建产物，可被下游使用 |

## 标准 workflow 结构

```yaml
name: CI                       # 名字
on:                            # 触发条件
  push:
    branches: [main, 'feat/**']
  pull_request:
    branches: [main]

jobs:
  job-id:                      # job 唯一 ID
    runs-on: ubuntu-latest     # 在哪跑
    steps:                     # 步骤列表
      - uses: actions/checkout@v4         # 用现成 action
      - uses: actions/setup-node@v4       # 装 Node
        with:
          node-version: '20'
      - run: npm ci                       # 跑 shell 命令
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run build
```

## 关键细节

### 1. 文件路径必须是 `.github/workflows/*.yml`
- 一个 repo 可以有多个 workflow 文件
- 文件名不限，建议按用途命名：`ci.yml`、`deploy-prod.yml`

### 2. `npm ci` vs `npm install`（CI 必须用前者）
| 维度 | npm install | npm ci |
|------|-------------|--------|
| 是否更新 lock | 可能更新 | **严格按 lock 装** |
| 速度 | 慢（要解析依赖树） | 快 |
| 干净度 | 增量 | **先删 node_modules 再装** |
| CI 适配性 | ❌ 可能"今天能跑明天不能" | ✅ 可重现 |

### 3. action 版本要固定
- `actions/checkout@v4` ✅ 推荐
- `actions/checkout@main` ❌ 不稳定
- `actions/checkout@v4.1.7` 也行，但太死板

### 4. 触发条件细节
```yaml
on:
  push:
    branches: [main, 'feat/**']        # 这些分支 push 触发
    branches-ignore: [tmp/**]          # 反向忽略
    paths: ['src/**', 'package.json']  # 只有这些路径变才触发（省 CI 时间）
    paths-ignore: ['**/*.md']          # 只改 md 不触发
    tags: ['v*']                       # tag push 触发
  pull_request:
    branches: [main]
    types: [opened, synchronize, reopened]  # PR 哪些动作触发
  schedule:
    - cron: '0 2 * * *'                # 定时任务（每天凌晨 2 点）
  workflow_dispatch:                    # GitHub UI 手动触发按钮
```

### 5. fail-fast 行为
- 默认：任何一 step 失败，后续 step **不执行**
- job 失败：依赖它的下游 job 不执行
- `continue-on-error: true` 可让单步失败不影响后续

## 验证 yml 语法
本地用 `npx js-yaml .github/workflows/ci.yml` 校验，避免推上去白等。
还有专门工具 `actionlint`：

```bash
brew install actionlint
actionlint .github/workflows/ci.yml
```

actionlint 不仅校验 YAML，还能识别 GitHub Actions 特有语法（如 `${{ }}` 表达式、context 名拼错等）。

## 思考题
1. 为什么 CI 必须用 `npm ci` 而不是 `npm install`？
2. 我把 `runs-on: ubuntu-latest` 改成 `macos-latest`，会怎样？什么场景下会用 macOS？
3. 如果一个 step 失败，后续 step 默认会执行吗？怎么强制让"无论前面成功失败都跑"？

## 这一步证明了什么
**CI 是质量门禁**：把"代码合并/上线前必须通过的检查"自动化，**不依赖人记得跑 lint**。GitHub Actions 用 YAML 描述声明式流程，写起来直观，跑起来稳定。

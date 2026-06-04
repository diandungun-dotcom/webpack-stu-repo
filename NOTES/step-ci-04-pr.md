# Step CI-4：PR 工作流 + 分支保护

## 目标
- 禁止直接 push main
- 所有改动必须走 PR
- CI 不过的 PR 按钮变灰，merge 不了
- 同一 PR 多次 push 自动取消旧的 CI（省钱）
- 自动给 PR 打 size 标签 + 校验标题

---

## 一、push vs pull_request 触发器

| 触发器 | 跑的代码 |
|---|---|
| push | 推送的那次 commit 本身 |
| pull_request | **合并后的虚拟 commit**（PR 分支假装 merge 进 target 的样子） |

`pull_request` 能提前发现"merge 进去会炸"的问题，是 PR 工作流的关键。

---

## 二、concurrency 并发控制

```yaml
concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

工作机制：
- group：每个 PR / 分支独立成组
- cancel-in-progress：同组内"还在跑的"被取消
- 比如开发者 5 分钟内 push 3 次，前 2 次的 CI 都会被取消，只跑最新一次

省钱省时间，业界标配。

---

## 三、触发设计建议

```yaml
on:
  push:
    branches: [main]      # 只跑 main，兜底
  pull_request:
    branches: [main]      # PR 必跑，门禁
    types: [opened, synchronize, reopened]
```

为什么不让 push feat/** 也触发？
- push feat 一次 + 提 PR 一次 = CI 跑 2 次
- 重复浪费，开发体验也没提升
- PR 触发就够了

---

## 四、合并保护（GitHub Web UI 配置）

Settings → Branches → Add rule，给 main 配置：

| 选项 | 推荐 |
|---|---|
| Require a pull request before merging | ✅ 必勾 |
| Require status checks to pass | ✅ 必勾 |
| └─ Status checks（选我们的 CI job 名） | 质量检查 (Node 18/20/22) |
| Require branches to be up to date | ✅ 推荐 |
| Include administrators | ✅ 强烈推荐 |
| Allow force pushes | ❌ 绝对不勾 |
| Allow deletions | ❌ 绝对不勾 |

⚠️ 一定要勾 "Include administrators"！否则你自己作为 owner 可以绕过规则，
某天手抖 force push 就毁了。

---

## 五、PR 专用 workflow

新建 `.github/workflows/pr-checks.yml`，放跟 CI 解耦的 PR 检查。

### PR size label
根据改动行数自动加 label：XS / S / M / L / XL

用 `codelytv/pr-size-labeler@v1` 直接搞定。

### PR 标题校验（conventional commits）
强制标题符合 `feat: xxx` / `fix: xxx` 等格式，利于自动生成 changelog。
用 `amannn/action-semantic-pull-request@v5`。

---

## 六、必须了解的 GitHub Actions 概念

### permissions
PR 工作流要给 PR 加 label / 评论，必须申请权限：
```yaml
permissions:
  pull-requests: write
  contents: read
```

默认 GitHub Actions 是 read-only，不申请写权限的 action 没法写。

### GITHUB_TOKEN
每个 workflow run 自动注入一个临时 token：`${{ secrets.GITHUB_TOKEN }}`
- 用完即焚
- 范围限定在当前 repo
- 比 personal access token 安全

### Required status checks 的命名陷阱
分支保护里要选"必须过的 check 名"，这个名字 = workflow 里的 `name:` + matrix 展开后的实际名。
matrix 下每个组合都是独立 check，要一个个勾。

---

## 七、文件总览

- `.github/workflows/ci.yml`：主 CI（lint / typecheck / build）
- `.github/workflows/pr-checks.yml`：PR 元信息检查（size label / 标题）

---

## 下一步：Step CI-5 自动部署到 GitHub Pages
- 构建产物直接发布成网址
- 跨 job 传 artifact
- secrets 管理 token

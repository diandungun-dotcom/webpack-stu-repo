# Step CI-5：自动部署到 GitHub Pages + PR 预览

## 目标
- 每次 push main → 自动构建 + 部署到 `https://<user>.github.io/<repo>/`
- 每个 PR → 自动构建 + 评论"下载预览包"链接
- 部署 job 不能被 cancel（保证完整性）

---

## 一、GitHub Pages 三种部署方式

| 方式 | 说明 | 推荐度 |
|---|---|---|
| gh-pages 分支 | 把 dist commit 到 gh-pages 分支 | ❌ 过时 |
| docs/ 目录 | 把 dist 拷进 docs/ commit 主分支 | ❌ 污染源码 |
| **GitHub Actions Pages** | 上传 artifact → deploy，无需 commit 产物 | ✅ 用这个 |

---

## 二、子路径部署的两个坑

GitHub Pages 项目站点的 URL 是 `https://<user>.github.io/<repo>/`，资源加载和路由都要适配 `/<repo>/` 前缀，否则白屏。

### 坑 1: webpack publicPath
```js
output: {
  publicPath: process.env.PUBLIC_PATH || '/',
}
```
CI 里设置 `PUBLIC_PATH=/<repo>/`，本地默认 `/`。

### 坑 2: React Router basename
```tsx
<BrowserRouter basename={process.env.APP_BASENAME || '/'}>
```
CI 里设置 `APP_BASENAME=/<repo>/`。

### 坑 3: SPA fallback
GitHub Pages 是纯静态，访问 `/foo` 会 404。
**hack**：把 `index.html` 拷一份成 `404.html`，GitHub Pages 找不到时会 serve 404.html，里面的 JS bundle 接管路由。

```yaml
- run: cp dist/index.html dist/404.html
```

---

## 三、权限：pages + id-token

```yaml
permissions:
  contents: read
  pages: write       # 写 Pages
  id-token: write    # OIDC 临时令牌
```

**id-token 是关键**：GitHub 用 OIDC 给 deploy-pages action 颁发**临时身份令牌**，不需要 PAT 也不需要 secret。安全 + 不会泄露。

---

## 四、跨 job 传产物 + environment

```yaml
jobs:
  build:
    steps:
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build    # 等 build 成功才跑
    environment:
      name: github-pages           # GitHub UI 会显示部署历史
      url: ${{ steps.deployment.outputs.page_url }}  # environment 卡片显示可点击的地址
    steps:
      - id: deployment             # 给 step 起 id，让上面的 environment.url 引用
        uses: actions/deploy-pages@v4
```

### environment 的作用
1. **部署历史可视化**：Actions → Environments 看历史
2. **环境级别 secret**：可以给 prod/staging 配不同的 token
3. **审批门禁**：生产 environment 可配置"必须人工 approve 才能部署"

---

## 五、部署 job 的 concurrency 不同于 CI

```yaml
concurrency:
  group: pages-deploy
  cancel-in-progress: false   # ⚠️ 关键：部署不能被取消！
```

### 为什么不能 cancel
- 部署到一半被取消 → 远端处于"半完成"状态
- CDN 上传一半、配置写一半、数据库迁移跑一半
- 用户访问可能看到 404 或不一致代码

### 标准做法
- **build 阶段**：用 `cancel-in-progress: true` 省钱
- **deploy 阶段**：用 `cancel-in-progress: false` 保证完整

---

## 六、PR 预览方案对比

| 方案 | 适用场景 |
|---|---|
| **GitHub Pages PR 预览** | ❌ 不支持，Pages 同时只能挂一个 environment |
| **Artifact + 评论下载** | 本练习项目用这个，简单 |
| **Vercel / Netlify / Cloudflare Pages** | 真业务项目，专门提供每 PR 独立 URL |

我们用 artifact 方式，加 `marocchino/sticky-pull-request-comment` 给 PR 自动评论
（sticky = 同一 header 的评论会更新而不是发新的）。

---

## 七、启用步骤（UI 操作）

1. repo → Settings → Pages
2. Source 选 **GitHub Actions**（不是 deploy from branch）
3. 保存
4. push 触发 deploy.yml
5. 第一次成功后 UI 显示地址

---

## 八、CI/CD 完整脉络回顾

走完 5 个 Step，你的项目已经有：

```
开发者 push feat 分支
    ↓
开 PR 到 main
    ↓
触发 pr-checks.yml → size label + 标题校验
触发 pr-preview.yml → 构建 + 评论预览
触发 ci.yml → lint + typecheck + build（matrix）
    ↓
分支保护拦截：CI 全过才能 merge
    ↓
merge 进 main
    ↓
触发 ci.yml → main 兜底验证
触发 deploy.yml → 构建 + 部署 GitHub Pages
    ↓
线上可访问 https://<user>.github.io/<repo>/
```

完整的 git push → 线上访问的自动化链路！

---

## 九、生产项目的真实方案对比

| 我们学的 | 大厂生产 |
|---|---|
| GitHub Actions | Jenkins / GitLab CI / 自研（FEDO） |
| GitHub Pages | CDN（OSS、CloudFront） |
| `concurrency` | 分布式锁（避免并发部署） |
| artifact 跨 job | 制品仓库（Maven、Nexus） |
| environment 审批 | 工单系统 + 审批流 |

思路一致，工具不同。你在美团做 FEDO，本质就是这套思想的企业级实现。

---

## 下一步
CI/CD 系列告一段落，回归到学习的下半场：
- 现代打包工具：Vite / Rspack（vs Webpack）
- SSR：Next.js / Remix

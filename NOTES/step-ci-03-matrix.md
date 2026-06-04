# Step CI-3：矩阵构建（多 Node 版本兼容性测试）

## 为什么需要

- 项目本地 Node 20 能跑，同事 Node 18，CTO 想升 22
- 三个版本都得能跑，但每升级一次手动验证三遍不现实
- 让 CI **同时**在多个 Node 版本上跑同一套测试 → matrix

---

## 一、matrix 基础

```yaml
strategy:
  matrix:
    node: [18, 20, 22]
```

这一行让一个 job 自动展开成 **3 个并行 job**：
- quality-check (node=18)
- quality-check (node=20)
- quality-check (node=22)

在 step 里用 `${{ matrix.node }}` 引用。

---

## 二、多维矩阵（笛卡尔积）

```yaml
strategy:
  matrix:
    node: [18, 20, 22]
    os: [ubuntu-latest, windows-latest, macos-latest]
```

→ **3 × 3 = 9 个 job 并行**。

注意：免费配额 / 并发上限要考虑，矩阵爆炸会很贵。

---

## 三、fail-fast 行为

```yaml
strategy:
  fail-fast: true     # 默认：任一挂全部取消
  fail-fast: false    # 都跑完，看全貌
```

| 场景 | 推荐 |
|---|---|
| 生产 CI（节省资源） | true |
| 学习 / 调试（要看全貌） | false |

---

## 四、include / exclude：精修矩阵

```yaml
strategy:
  matrix:
    node: [18, 20, 22]
    os: [ubuntu-latest, macos-latest]
    exclude:
      - { node: 18, os: macos-latest }     # 减一个
    include:
      - { node: 20, os: windows-latest, experimental: true }  # 加一个特殊配置
```

`include` 加的对象可以带额外字段（如 `experimental`），在 step 里用 `${{ matrix.experimental }}` 引用。

---

## 五、matrix 与缓存配合

每个 Node 版本的 npm 缓存**互相隔离**——`setup-node` 会自动把 node 版本编进 cache key。

实际 key 形如：
```
node-cache-Linux-npm-<lockHash>-Node20
```

---

## 六、本项目实现

```yaml
jobs:
  quality-check:
    name: 质量检查 (Node ${{ matrix.node }})
    runs-on: ubuntu-latest
    timeout-minutes: 15

    strategy:
      fail-fast: false
      matrix:
        node: [18, 20, 22]

    env:
      HUSKY: 0

    steps:
      - uses: actions/checkout@v4
      - name: 安装 Node.js ${{ matrix.node }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: 'npm'
      - name: 安装依赖
        timeout-minutes: 5
        run: npm ci
      # ... 后续步骤
```

---

## 七、效果

- GitHub Actions 列表会看到 3 个并行 job
- 一个 push 触发 3 个 job 同时跑
- 任一版本挂了，能精准看到"哪个 Node 版本不兼容"

---

## 八、表达式语法（Actions 必备）

| 语法 | 用法 |
|---|---|
| `${{ matrix.node }}` | 矩阵变量 |
| `${{ github.event_name }}` | 事件类型（push/pull_request） |
| `${{ github.ref }}` | 分支引用（refs/heads/main） |
| `${{ secrets.MY_TOKEN }}` | 加密 secret |
| `${{ env.HUSKY }}` | 环境变量 |
| `${{ steps.id.outputs.foo }}` | 引用某 step 输出 |
| `${{ runner.os }}` | 运行器 OS（Linux/Windows/macOS） |

---

## 九、踩坑提醒

1. **Node 旧版本可能装不动新依赖**：比如某些 react 19 周边只支持 Node ≥18
2. **`actions/setup-node` 对 lock 严格**：lock 是用 npm 10 生成的，CI 上 npm 9 可能装不下
3. **矩阵爆炸**：每个 job 都消耗 minutes，免费户 2000 minutes / 月很快就花光

---

## 下一步

Step CI-4：**PR 工作流 + 合并保护**
- PR 必须通过所有 matrix job 才能 merge
- 自动给 PR 打标签 / 评论
- 减少 main 分支被弄脏的可能

---
name: no-cursor-git
description: Keep git commits, tags, and PRs free of Cursor authorship. Use when creating or rewriting commits, pushing, opening PRs, or when the user mentions 提交、git、署名、Cursor、Co-authored-by.
---

# 提交不要带上 Cursor

以后都不要带上 Cursor。作者和提交说明只保留 KCode 这一个身份，可用仓库主人的邮箱，不要包含其他人。

## 必须遵守

创建或改写 commit、tag、PR 时：

- 作者和提交者只用 `KCode <go7836246@gmail.com>`
- 不要加入 `Co-authored-by: Cursor`
- 不要加入 `Made-with: Cursor`、`cursoragent` 或任何 Cursor 署名
- 不要用 `--trailer` 加 Cursor
- 钩子若自动写入 Cursor 行，提交后立刻改掉；必要时用不过该钩子的方式重写说明，不要把 Cursor 推到远程
- 不要改写上游 ZCode 快照那笔 `feat: open source`（原作者保留）

## 提交前自检

```bash
git log -1 --format='%an <%ae>%n%cn <%ce>%n%B'
```

输出里不能出现 `Cursor`、`cursoragent`、`Co-authored-by`。

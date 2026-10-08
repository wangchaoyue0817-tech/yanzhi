---
name: yanzhi-github-publish
description: 发布鉴颜值与鉴X首页工程到 wangchaoyue0817-tech/yanzhi GitHub 仓库，完成版本测试、提交、推送及远端核对。在该工程的版本发布或 GitHub 同步任务中使用。
---

# 鉴颜值 GitHub 发布

## 工程与目标

- 本地工程：`/Users/lunewang/Documents/Codex/jianx-home`。
- 用户指定 GitHub 仓库：`https://github.com/wangchaoyue0817-tech/yanzhi.git`。
- 使用单独的 `github` remote。保留既有 `origin`，它指向 Sites 的 Git 服务，不是 GitHub。
- 本地交付分支目前为 `main`；先核对实际分支和远端状态。需要新建分支时用 `codex/` 前缀。
- 用户已要求本工程每个完成版本都创建 commit 并上传 GitHub。该约定限于本工程，不扩展到其他仓库、凭据权限或强制覆盖历史。

## 凭据

凭据由 macOS 钥匙串的 Git `osxkeychain` helper 管理；仓库范围为 `github.com/wangchaoyue0817-tech/yanzhi.git`，账户 `wangchaoyue0817-tech`。不在技能、源码、环境配置、remote URL、日志或提交中保存 Token 正文。

本仓库配置 `credential.https://github.com.useHttpPath=true`，让 Git 使用对应路径的凭据。让 Git helper 直接提供认证，不运行会打印密码的 `git credential fill`，不将凭据写入命令参数。Token 失效或仓库不可见时，报告实际状态并请用户修正凭据或权限。

## 发布流程

1. 在工程目录检查工作区和 diff，保留无关改动。核对 `github` 的 fetch/push URL 与目标一致；若不存在则添加。通过 `GIT_TERMINAL_PROMPT=0 git ls-remote github` 检查连接和远端分支。
2. 根据改动更新相关测试，运行 `node --test tests/*.test.mjs`、`node build.mjs` 和 `git diff --check`。若 `node` 不在 PATH，使用 `/Users/lunewang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin`。界面改动同步检查对应交互与视口。
3. 对本次版本涉及的文件创建 commit；已有完成的 commit 可直接用于发布。新目标仓库可能为空，也可能已有历史，先 fetch 和比较。普通快进可推送；遇到历史分叉先保留双方内容，禁止默认使用 force 或删除远端分支。
4. 推送明确分支，例如确认 main 后使用 `git push github main:main`。推送后比较 `git rev-parse HEAD` 与 `git ls-remote github refs/heads/main`，相同才报告上传成功。
5. 交付仓库链接、分支、commit 和测试结果。用户要求源码包时，用已提交版本创建 `git archive` ZIP 并检查压缩包完整性。

## 失败处理

- HTTP 401 表示认证失败；403 需要查看具体权限或限制；404 可能是地址不存在，也可能是私有仓库未授权，不能据此宣称仓库不存在。
- Fine-grained Token 必须覆盖 `yanzhi` 仓库，Git 推送需要 `Contents: Read and write`。先诊断一次明确错误，权限未变化时不重复推送。
- 只确认本地提交成功时，明确说明 GitHub 尚未上传，保留 commit 等待修正；不要把 Sites remote 的成功当作 GitHub 成功。

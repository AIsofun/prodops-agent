# GitHub 质量流水线

关联 HAR-005、HAR-009。实际仓库为 AIsofun/prodops-agent，配置见 [quality.yml](../.github/workflows/quality.yml)。

main、codex/** 推送及面向 main 的 PR 运行 Product quality / M1 quality，也提供手动运行入口。流水线运行 Windows 2025 托管环境，固定 Python 3.13.2、Node 24.14.1、uv 0.11.17；所有第三方 Actions 固定完整提交 SHA。Python 使用 uv --frozen，Node 使用 npm ci --ignore-scripts，不下载 Electron GUI 运行时，也不执行产品发布。

流水线运行同一本地入口 `python scripts/check.py`，再运行 `python -m scripts.verify_product_gates` 验证真实产品缺陷阻断。检查失败或 NOT_READY 都使步骤失败；不使用 continue-on-error。作业 contents 权限为 read，checkout 不保留认证，上传范围仅两个质量 JSON 文件，不上传工作区、凭据、依赖目录或任意日志。报告存为 product-quality-提交SHA，远端保留14天，需长期保存的验收报告另放 docs/verification。

固定运行时与锁文件保证依赖可追溯；windows-2025 托管镜像本身仍由 GitHub 维护，不宣称整个操作系统镜像完全固定。远端静态及单元检查不代表图形桌面、安装包、双数据库、真实模型或生产设备验收。

2026-10-16 的只读审计：默认 main 的 protected=false，protection 接口返回404 Branch not protected，有效 rules 列表为空。当前未启用必要检查的合并限制；本轮接入 CI 并记录现有状态，没有改变仓库合并策略。不能把流水线成功描述为“平台已阻止失败代码合并”。审核状态与真实运行由验证记录给出。

依据：[GitHub 工作流语法](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)、[受保护分支与必要状态检查](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)。

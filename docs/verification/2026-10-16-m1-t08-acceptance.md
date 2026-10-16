# M1 集成验收

任务 M1-T08；REQ-001、REQ-002、REQ-003、HAR-005、HAR-010。2026-10-16，Windows 11 10.0.26200 AMD64，Python 3.13.2、Node 24.14.1、Electron 44.8.0、React 19.3.1、Vite 8.3.4。基线 5a813996cd5a19db7f486281e7d9060b7212e89e，工作区仅增加开发模式集成验证开关与交付文档。

| AC | 实际步骤与结果 | 状态 | 证据 |
| --- | --- | --- | --- |
| M1-T08-AC01 | uv sync --frozen 与 npm ci --ignore-scripts 重放依赖安装，显式准备锁定 Electron；desktop:build；verify-connection.mjs 指定 --dev。实际 Vite/React → preload → IPC → 主进程 → Python 链路显示 local/server 就绪与离线，明确426夹具显示不兼容。安装、构建和5场景均退出0 | PASS | [Python 安装](2026-10-16-m1-t08-python-setup.txt)、[Node 安装](2026-10-16-m1-t08-node-setup.txt)、[集成结果](2026-10-16-m1-t08-integration/integration.json)、[开发就绪截图](2026-10-16-m1-t08-integration/ready-local/desktop.png) |
| M1-T08-AC02 | 冻结安装后的本地默认 M1 检查及验收基线真实远端 CI | 本地 PASS/退出0；37项工程、24项服务与契约、13项桌面连接行为通过。基线 5a81399 的真实 Windows CI success，下载统一与故障报告均 PASS | PASS；[本地报告](2026-10-16-m1-t08-checks.json)、[远端元数据](2026-10-16-m1-t08-remote/github.json)、[远端统一报告](2026-10-16-m1-t08-remote/ci-checks.json)、[远端故障报告](2026-10-16-m1-t08-remote/ci-injections.json)、[实际运行](https://github.com/AIsofun/prodops-agent/actions/runs/38921859976) |
| M1-T08-AC03 | 逐项核对任务、需求追踪、文档与实际命令，填写自查和机读回执，再执行 docs 与 diff 检查 | T01至T08切片证据齐备，产品完整需求仍保持进行中/未开始；仅骨架验收，不冒充生产/安装/诊断完成 | PASS；[自查](../reviews/2026-10-16-m1-t08-acceptance.md)、[回执](m1-t08.json)、[交付说明](../quality-workflow.md) |

命令顺序：uv sync --frozen --group dev --cache-dir .quality-reports/uv-cache --link-mode copy；npm ci --ignore-scripts --no-audit --no-fund --cache .quality-reports/npm-cache；设置仓库 Electron 缓存后 node node_modules/electron/install.js；npm run desktop:build；node apps/desktop/scripts/verify-connection.mjs docs/verification/2026-10-16-m1-t08-integration --dev；python scripts/check.py --report docs/verification/2026-10-16-m1-t08-checks.json。全部实际执行，没有使用 demo 或纯浏览器代替桌面。

目视检查开发就绪截图，React 展示“服务已就绪”，同时明确“诊断任务功能尚未开放”。各窗口 runtime 保存真实版本、webPreferences、Node 全局不可见、最小桥接与状态文本；非法 bridge 参数在实际 preload 拒绝。窗口关闭后自然退出，Vite 关闭；集成脚本终止自己启动的 Python 进程做隔离清理，不证明生产服务优雅退出。

M1 验收结论：当前可开发和可验证的 Windows 技术骨架完成。REQ-001/002/003 仅骨架切片，仍未完成正式 Windows 安装、随包 Python 自动启动、随机认证握手、进程树管理、托盘或内网生产服务。诊断任务、数据库、SSE、取消恢复、真实模型、权限、安装与升级仍按后续阶段实施。main 合并强制检查未配置，HAR-009 保持进行中并引用[范围记录](../decisions/2026-10-16-ci-merge-enforcement.md)。

远端结果对应基线提交；本轮工作区只增加开发集成测试开关，已由本地实际执行验证，未把未推送工作区描述为同一远端提交。冻结安装重放是在现有开发机，不是干净电脑安装包验收。下一阶段为 M2 任务核心与显式 mock 排查。

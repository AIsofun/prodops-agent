# M1 任务卡与验收入口

本阶段把 [实施计划](../../implementation-plan.md) 的 M1 拆为 8 张可验收任务卡。状态和依赖以 [任务清单](tasks.json) 为准；它描述任务进度，不替代 [需求追踪表](../../traceability.md) 的产品验收状态。

| 任务 | 依赖 | 交付 |
| --- | --- | --- |
| [M1-T01 工程质量基础](01-quality.md) | 无 | 已验证：统一检查入口、规则检查器、回归场景和交付格式 |
| [M1-T02 Python 服务骨架](02-service.md) | T01 | 已验证：可启动的业务包、装配入口和健康检查 |
| [M1-T03 API 与事件契约](03-contracts.md) | T02 | 从实际 API 导出的接口和生成的 TypeScript 类型 |
| [M1-T04 桌面开发骨架](04-desktop.md) | T01 | 可运行的 Electron、React 开发窗口 |
| [M1-T05 受限桥接与连接](05-bridge.md) | T03 T04 | 经受限 IPC 查询服务健康状态 |
| [M1-T06 产品检查接入](06-gates.md) | T03 T05 | M1 产品静态检查实际通过 |
| [M1-T07 CI 接入](07-ci.md) | T06 | 同一检查入口在 CI 执行并有真实运行记录 |
| [M1-T08 集成验收](08-acceptance.md) | T06 T07 | 开发窗口、服务和契约链路整体验收 |

按依赖顺序推进，可独立的任务不代表必须启用多个 Agent。每张卡列出可逐项验证的 AC 编号，完成后填写 [复核模板](../../templates/code-review.md) 和 [验证模板](../../templates/verification.md)。机读回执格式见 [交付格式说明](../../quality-workflow.md)。

工程质量基础与 Python 服务骨架均已验证，[服务证据](../../verification/2026-10-16-m1-t02-service.md) 与 [自查记录](../../reviews/2026-10-16-m1-t02-service.md) 已保存。下一依赖任务为 T03；桌面骨架、业务契约和 CI 按后续任务推进，缺少相应产品文件时默认 M1 检查仍返回未就绪。当前服务切片可以用 `python scripts/check.py --profile service` 单独验证。

# M1 任务卡与验收入口

本阶段把 [实施计划](../../implementation-plan.md) 的 M1 拆为 8 张可验收任务卡。状态和依赖以 [任务清单](tasks.json) 为准；它描述任务进度，不替代 [需求追踪表](../../traceability.md) 的产品验收状态。

| 任务 | 依赖 | 交付 |
| --- | --- | --- |
| [M1-T01 工程质量基础](01-quality.md) | 无 | 已验证：统一检查入口、规则检查器、回归场景和交付格式 |
| [M1-T02 Python 服务骨架](02-service.md) | T01 | 已验证：可启动的业务包、装配入口和健康检查 |
| [M1-T03 API 与事件契约](03-contracts.md) | T02 | 已验证：实际 API 与正式事件模型导出、生成类型与漂移检查 |
| [M1-T04 桌面开发骨架](04-desktop.md) | T01 | 已验证：实际 Windows Electron/React 窗口、隔离与生命周期 |
| [M1-T05 受限桥接与连接](05-bridge.md) | T03 T04 | 已验证：真实服务状态、IPC 校验与受限连接 |
| [M1-T06 产品检查接入](06-gates.md) | T03 T05 | 已验证：实际产品统一检查与缺陷注入阻断 |
| [M1-T07 CI 接入](07-ci.md) | T06 | 已验证：真实 Windows CI 和现有合并策略审计，强制限制未配置 |
| [M1-T08 集成验收](08-acceptance.md) | T06 T07 | 开发窗口、服务和契约链路整体验收 |

按依赖顺序推进，可独立的任务不代表必须启用多个 Agent。每张卡列出可逐项验证的 AC 编号，完成后填写 [复核模板](../../templates/code-review.md) 和 [验证模板](../../templates/verification.md)。机读回执格式见 [交付格式说明](../../quality-workflow.md)。

T01 至 T07 已验证；[真实 CI 证据](../../verification/2026-10-16-m1-t07-ci.md) 与 [自查](../../reviews/2026-10-16-m1-t07-ci.md) 已保存。默认 M1 静态和骨架单元检查、真实副本缺陷注入与 Windows CI 通过；下一任务 T08 集成验收。main 的必要检查合并限制尚未配置，另在 HAR-009 追踪。

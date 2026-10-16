# 需求与工程约束追踪表

日期：2026 年 10 月 16 日。需求定义见 [需求文档](requirements.md)，工程规则见 [Harness 工程约束](engineering-constraints.md)，设计章节指向 [架构设计](architecture.md)，阶段 M0 至 M6 指向 [实施计划](implementation-plan.md)。

本表维护新桌面产品的实际实现状态，旧 demo 不计作新版本完成。状态采用“未开始、进行中、已实现、已验证、暂缓、待定”；“已确认”仅为需求来源，不是实现状态。实现和证据栏使用本地文件链接，没有时填写 `-`。

需求基线 1.0 已于 2026 年 10 月 16 日由用户整体确认。M1 工程质量基础、Python 服务骨架与 API/事件契约切片已验证，完整业务功能按后续阶段推进；阶段切片另见 [M1 任务清单](tasks/m1/tasks.json)。

“已实现”要求实现引用存在；“已验证”同时要求实现和证据引用存在。链接存在只是机械检查，验证内容还需与需求验收标准一致。暂缓项写明原因，待定项不进入完成率。

## 1 产品需求

| 编号 | 阶段 | 状态 | 设计章节 | 实现 | 验证证据 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | M3 | 未开始 | 5 17 | - | - | 干净 Windows 安装验证 |
| REQ-002 | M3 | 进行中 | 6.1 | [服务装配](../services/agent/src/prodops/bootstrap/app.py) | [骨架验证](verification/2026-10-16-m1-t02-service.md) | M1 开发入口已验证；桌面启动管道、令牌和进程生命周期仍在 M3 |
| REQ-003 | M4 | 进行中 | 6.2 | [服务入口](../services/agent/src/prodops/bootstrap/cli.py) | [骨架验证](verification/2026-10-16-m1-t02-service.md) | 共用业务包的 server 回环开发入口；正式认证、数据库和内网运行仍在 M4 |
| REQ-004 | M3 | 未开始 | 8 16 | - | - | 会话与上下文 |
| REQ-005 | M2 | 进行中 | 8 11 | [任务与事件 DTO](../services/agent/src/prodops/api/models.py) | [契约切片验证](verification/2026-10-16-m1-t03-contracts.md) | M1-T03 契约已验证；创建、执行、持久化与进度推送仍在 M2 |
| REQ-006 | M2 | 未开始 | 8 9 13 | - | - | 证据和解决状态 |
| REQ-007 | M2 | 未开始 | 13 | - | - | 持久化历史 |
| REQ-008 | M2 | 进行中 | 11 | [快照与重放 DTO](../services/agent/src/prodops/api/models.py) | [契约切片验证](verification/2026-10-16-m1-t03-contracts.md) | 事件序列、水位与游标模型已验证；SSE、持久化补发与去重仍在 M2 |
| REQ-009 | M2 | 未开始 | 9 | - | - | 协作取消 |
| REQ-010 | M2 | 未开始 | 9 | - | - | 中断核对 |
| REQ-011 | M4 | 未开始 | 7 8 | - | - | mock 与真实模型分别验收 |
| REQ-012 | M5 | 未开始 | 7 14 | - | - | 现场连接器未确定 |
| REQ-013 | M4 | 未开始 | 6.3 13 | - | - | 跨连接隔离 |
| REQ-014 | M4 | 未开始 | 6.2 12 14 | - | - | 身份与资源权限 |
| REQ-015 | M4 | 未开始 | 12 13 | - | - | P1 附件，上限待定 |
| REQ-016 | M5 | 未开始 | 14 | - | - | P1，开放写操作前必需 |
| REQ-017 | M5 | 未开始 | 9 14 | - | - | P1，验证与冲突控制 |
| REQ-018 | M3 | 未开始 | 12 16 | - | - | 用户错误状态 |
| REQ-019 | M2 | 未开始 | 10 | - | - | 预算与调度 |
| REQ-020 | M6 | 未开始 | 13 17 | - | - | 数据及附件恢复 |
| REQ-021 | M6 | 未开始 | 12 17 | - | - | 协议与离线升级 |
| NFR-001 | M4 | 未开始 | 6 18 | - | - | 双模式场景集 |
| NFR-002 | M4 | 未开始 | 5 14 15 | - | - | 密钥和资源边界 |
| NFR-003 | M2 | 未开始 | 11 15 | - | - | 关联日志与错误分类 |
| NFR-004 | M4 | 未开始 | 9 12 13 | - | - | 两种数据库分别验证 |
| NFR-005 | M6 | 待定 | 10 18 | - | - | 参考环境与数值门槛待测量 |
| NFR-006 | M0 | 已实现 | 18 | [追踪表](traceability.md) | - | 追踪机制已建立，后续需持续维护 |

## 2 Harness 约束

| 编号 | 阶段 | 状态 | 设计章节 | 实现 | 验证证据 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| HAR-001 | M0 | 已验证 | 18 | [文档检查脚本](../scripts/check_project_docs.py) | [初始检查记录](verification/2026-10-16-docs.md) | 机械检查，证据质量仍需审阅 |
| HAR-002 | M0 | 已验证 | 17 | [开发入口](../AGENTS.md) | [导航检查记录](verification/2026-10-16-docs.md) | 简短导航与执行规则 |
| HAR-003 | M1 | 进行中 | 7 17 | [边界检查器](../scripts/check_boundaries.py)、[Python 产品类型](../services/agent/pyproject.toml) | [工具验证](verification/2026-10-16-m1-tooling.md)、[服务验证](verification/2026-10-16-m1-t02-service.md) | Python 产品类型与边界已通过；TS 产品及整体接入仍在 T06 |
| HAR-004 | M1 | 进行中 | 5 12 | [契约检查器](../scripts/check_contracts.py)、[实际导出器](../services/agent/scripts/export_contracts.py)、[正式模型](../services/agent/src/prodops/api/models.py)、[生成类型](../packages/api-client/src/schema.d.ts) | [契约验证](verification/2026-10-16-m1-t03-contracts.md) | T03 API/事件导出、类型、非法输入与版本检查已验证；IPC 在 T05，CI 接入在 T07 |
| HAR-005 | M1 | 进行中 | 17 | [统一入口](../scripts/check.py) | [工具验证](verification/2026-10-16-m1-tooling.md)、[服务验证](verification/2026-10-16-m1-t02-service.md) | service 范围通过；默认 M1 尚有桌面和契约未就绪项 |
| HAR-006 | M4 | 未开始 | 8 18 | - | - | M2 mock，M4 真实模型评测 |
| HAR-007 | M2 | 未开始 | 9 11 | - | - | 故障注入回归待实现 |
| HAR-008 | M3 | 未开始 | 5 6 17 | - | - | 桌面与安装包验证待建立 |
| HAR-009 | M1 | 未开始 | 17 | - | - | CI 未接入，不代表远端检查生效 |
| HAR-010 | M0 | 已实现 | 18 | [开发入口](../AGENTS.md) | - | 人工执行的变更规则，持续有效性按变更审阅 |

## 3 更新方式

开始实现时改为“进行中”，填写已存在的实现位置；代码完成后改为“已实现”，写出尚未完成的验证；证据覆盖验收标准后再改为“已验证”。证据记录存于 `docs/verification/`，包含环境、步骤、输出摘要、局限和关联编号。未完成项不能因为存在设计文档而改成已实现。

每次更新后运行 `python scripts/check_project_docs.py`。如果需求移出当前范围，使用“暂缓”并解释原因，不删除编号或追踪行。

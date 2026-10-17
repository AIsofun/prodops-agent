# 需求与工程约束追踪表

日期：2026 年 10 月 16 日。需求定义见 [需求文档](requirements.md)，工程规则见 [Harness 工程约束](engineering-constraints.md)，设计章节指向 [架构设计](architecture.md)，阶段 M0 至 M6 指向 [实施计划](implementation-plan.md)。

本表维护新桌面产品的实际实现状态，旧 demo 不计作新版本完成。状态采用“未开始、进行中、已实现、已验证、暂缓、待定”；“已确认”仅为需求来源，不是实现状态。实现和证据栏使用本地文件链接，没有时填写 `-`。

需求基线 1.0 已于 2026 年 10 月 16 日由用户整体确认。M1 八项技术骨架切片已验证，包括 Windows 开发窗口、受限服务连接与真实 CI；完整业务功能按后续阶段推进。HAR-009 合并强制检查缺口单独保留；阶段切片见 [M1 任务清单](tasks/m1/tasks.json)。

“已实现”要求实现引用存在；“已验证”同时要求实现和证据引用存在。链接存在只是机械检查，验证内容还需与需求验收标准一致。暂缓项写明原因，待定项不进入完成率。

## 1 产品需求

| 编号 | 阶段 | 状态 | 设计章节 | 实现 | 验证证据 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | M3 | 进行中 | 5 17 | [桌面开发入口](../apps/desktop/src/main/index.ts) | [M1 集成验证](verification/2026-10-16-m1-t08-acceptance.md) | 开发窗口与冻结安装链路已验证；干净 Windows 安装、双击与随包运行时仍在 M3 |
| REQ-002 | M3 | 进行中 | 6.1 | [服务装配](../services/agent/src/prodops/bootstrap/app.py)、[开发连接](../apps/desktop/src/main/connection.ts) | [M1 集成验证](verification/2026-10-16-m1-t08-acceptance.md) | 手工启动服务后的桌面读取已验证；自动启动管道、令牌和进程生命周期仍在 M3 |
| REQ-003 | M4 | 进行中 | 6.2 | [服务入口](../services/agent/src/prodops/bootstrap/cli.py) | [M1 集成验证](verification/2026-10-16-m1-t08-acceptance.md) | 共用业务包的 server 回环开发连接已验证；正式认证、数据库和内网运行仍在 M4 |
| REQ-004 | M3 | 进行中 | 8 16 | [会话用例](../services/agent/src/prodops/application/tasks.py) | [API切片验证](verification/2026-10-16-m2-t02-api.md) | 会话创建/分页及忙碌冲突已验证；历史上下文执行和桌面多轮交流仍待后续 |
| REQ-005 | M2 | 进行中 | 8 11 | [数据库调度](../services/agent/src/prodops/runtime/scheduler.py) | [模拟执行验证](verification/2026-10-17-m2-t03-execution.md) | 显式mock提交后独立执行、持久步骤与结果已验证；SSE和桌面实时展示待后续 |
| REQ-006 | M2 | 进行中 | 8 9 13 | [证据持久化](../services/agent/src/prodops/adapters/storage/execution.py) | [模拟执行验证](verification/2026-10-17-m2-t03-execution.md) | 四类mock来源/采集时间/最终回复与独立解决状态已验证；真实来源和授权原始结果待后续 |
| REQ-007 | M2 | 进行中 | 13 | [业务历史API](../services/agent/src/prodops/api/business.py) | [API切片验证](verification/2026-10-16-m2-t02-api.md) | 会话/消息/任务分页及服务重开保持记录已验证；完整结果和桌面历史仍待后续 |
| REQ-008 | M2 | 进行中 | 11 | [持久SSE](../services/agent/src/prodops/api/stream.py)、[客户端水位](../packages/api-client/src/events.ts) | [SSE验证](verification/2026-10-17-m2-t05-events.md) | 实际回环断线执行继续、补发无遗漏/去重与过期游标已验证；桌面自动重连待M3 |
| REQ-009 | M2 | 进行中 | 9 | [取消事务](../services/agent/src/prodops/adapters/storage/recovery.py) | [取消/恢复验证](verification/2026-10-17-m2-t04-recovery.md) | 排队/在途/步骤边界取消和结果保留已验证；桌面取消入口仍待M3 |
| REQ-010 | M2 | 进行中 | 9 | [启动核对与恢复](../services/agent/src/prodops/adapters/storage/recovery.py) | [取消/恢复验证](verification/2026-10-17-m2-t04-recovery.md) | 真实进程硬退出后unknown、明确核对、新尝试与预算保留已验证；实际设备动作核对待连接器阶段 |
| REQ-011 | M4 | 进行中 | 7 8 | [显式mock适配器](../services/agent/src/prodops/adapters/mock_tools.py) | [模拟执行验证](verification/2026-10-17-m2-t03-execution.md) | 显式mock及异常不降级已验证；实际模型协议与不可用场景仍在M4 |
| REQ-012 | M5 | 未开始 | 7 14 | - | - | 现场连接器未确定 |
| REQ-013 | M4 | 进行中 | 6.3 13 | [固定开发连接](../apps/desktop/src/main/connection.ts)、[受限 IPC](../apps/desktop/src/main/ipc.ts) | [开发连接验证](verification/2026-10-16-m1-t05-bridge.md) | T05 固定回环连接和状态读取已验证；持久配置、切换及跨连接缓存隔离仍在 M4 |
| REQ-014 | M4 | 进行中 | 6.2 12 14 | [开发访问控制](../services/agent/src/prodops/application/access.py) | [API切片验证](verification/2026-10-16-m2-t02-api.md) | 回环单身份令牌及默认工作区隔离已验证；正式多用户、登录/过期/角色与设备权限仍在M4 |
| REQ-015 | M4 | 未开始 | 12 13 | - | - | P1 附件，上限待定 |
| REQ-016 | M5 | 未开始 | 14 | - | - | P1，开放写操作前必需 |
| REQ-017 | M5 | 未开始 | 9 14 | - | - | P1，验证与冲突控制 |
| REQ-018 | M3 | 未开始 | 12 16 | - | - | 用户错误状态 |
| REQ-019 | M2 | 进行中 | 10 | [持久执行预算](../services/agent/src/prodops/adapters/storage/execution.py) | [取消/恢复验证](verification/2026-10-17-m2-t04-recovery.md) | 队列/并发、次数/时长、取消与恢复预算保留已验证；等待确认预算按处置切片 |
| REQ-020 | M6 | 未开始 | 13 17 | - | - | 数据及附件恢复 |
| REQ-021 | M6 | 未开始 | 12 17 | - | - | 协议与离线升级 |
| NFR-001 | M4 | 进行中 | 6 18 | [共享执行器](../services/agent/src/prodops/runtime/scheduler.py) | [双模式核心验收](verification/2026-10-17-m2-t06-acceptance.md) | local/server回环开发模式共用mock任务链路与重启历史已验证；正式内网、真实模型/权限和PostgreSQL仍在M4 |
| NFR-002 | M4 | 进行中 | 5 14 15 | [受限桥接](../apps/desktop/src/preload/index.ts)、[请求边界](../apps/desktop/src/main/ipc.ts) | [桥接验证](verification/2026-10-16-m1-t05-bridge.md) | 无凭据开发状态读取边界已验证；生产密钥、授权资源与导出脱敏仍在后续阶段 |
| NFR-003 | M2 | 进行中 | 11 15 | [流关联错误](../services/agent/src/prodops/api/stream.py) | [SSE验证](verification/2026-10-17-m2-t05-events.md) | SSE请求/运行ID与安全流错误已验证；模型/工具/身份分类日志与耗时观测仍待后续 |
| NFR-004 | M4 | 进行中 | 9 12 13 | [事务任务存储](../services/agent/src/prodops/adapters/storage/tasks.py) | [API切片验证](verification/2026-10-16-m2-t02-api.md) | SQLite原子回滚、幂等与会话并发活跃槽已验证；执行状态转换和PostgreSQL仍待后续 |
| NFR-005 | M6 | 待定 | 10 18 | - | - | 参考环境与数值门槛待测量 |
| NFR-006 | M0 | 已验证 | 18 | [追踪表](traceability.md)、[阶段交付校验](../scripts/check_delivery.py) | [跨阶段追踪验证](verification/2026-10-16-m2-t01-storage.md) | 当前需求/阶段/实现/AC证据映射与跨阶段依赖验证通过；后续变更持续维护 |

## 2 Harness 约束

| 编号 | 阶段 | 状态 | 设计章节 | 实现 | 验证证据 | 备注 |
| --- | --- | --- | --- | --- | --- | --- |
| HAR-001 | M0 | 已验证 | 18 | [文档检查脚本](../scripts/check_project_docs.py) | [初始检查记录](verification/2026-10-16-docs.md) | 机械检查，证据质量仍需审阅 |
| HAR-002 | M0 | 已验证 | 17 | [开发入口](../AGENTS.md) | [导航检查记录](verification/2026-10-16-docs.md) | 简短导航与执行规则 |
| HAR-003 | M1 | 已验证 | 7 17 | [统一产品检查](../scripts/check.py)、[缺陷注入](../scripts/verify_product_gates.py)、[桌面类型](../apps/desktop/tsconfig.json)、[Python 产品类型](../services/agent/pyproject.toml) | [产品检查验证](verification/2026-10-16-m1-t06-gates.md) | 当前实际 Python/TS 模块类型、导入边界与缺陷阻断通过；后续新增模块持续遵守 |
| HAR-004 | M1 | 已验证 | 5 12 | [契约检查器](../scripts/check_contracts.py)、[正式模型](../services/agent/src/prodops/api/models.py)、[生成类型](../packages/api-client/src/schema.d.ts)、[生成校验器](../packages/api-client/src/validators.cjs)、[IPC 校验](../apps/desktop/src/main/ipc.ts) | [桥接验证](verification/2026-10-16-m1-t05-bridge.md)、[实际 CI](verification/2026-10-16-m1-t07-ci.md) | 当前 API、事件、IPC 边界及三类生成漂移在本地和 CI 验证；后续新增契约持续遵守 |
| HAR-005 | M1 | 已验证 | 17 | [统一入口](../scripts/check.py)、[冻结依赖流水线](../.github/workflows/quality.yml) | [产品检查](verification/2026-10-16-m1-t06-gates.md)、[实际 CI](verification/2026-10-16-m1-t07-ci.md) | 本地默认 M1 与真实 Windows CI 通过；不代表产品发布验收 |
| HAR-006 | M4 | 进行中 | 8 18 | [模拟执行回归](../services/agent/tests/test_execution.py) | [模拟执行验证](verification/2026-10-17-m2-t03-execution.md) | 四类mock、歧义、异常与预算基线通过；真实模型及完整评测集仍在M4 |
| HAR-007 | M2 | 已验证 | 9 18 | [故障回归](../services/agent/tests/test_recovery.py)、[SSE回归](../services/agent/tests/test_events.py)、[双模式集成](../services/agent/tests/test_service.py) | [任务核心验收](verification/2026-10-17-m2-t06-acceptance.md) | 当前模拟任务核心的重复/并发、断线、取消、崩溃与未知结果可复现，真实CI通过；新增功能持续补故障样例 |
| HAR-008 | M3 | 未开始 | 5 6 17 | - | - | 桌面与安装包验证待建立 |
| HAR-009 | M1 | 进行中 | 17 | [GitHub 流水线](../.github/workflows/quality.yml) | [实际 CI 与审计](verification/2026-10-16-m1-t07-ci.md) | Windows CI 已成功运行；main 必要检查合并限制未配置，影响与退出条件见[范围记录](decisions/2026-10-16-ci-merge-enforcement.md) |
| HAR-010 | M0 | 已实现 | 18 | [开发入口](../AGENTS.md) | - | 人工执行的变更规则，持续有效性按变更审阅 |

## 3 更新方式

开始实现时改为“进行中”，填写已存在的实现位置；代码完成后改为“已实现”，写出尚未完成的验证；证据覆盖验收标准后再改为“已验证”。证据记录存于 `docs/verification/`，包含环境、步骤、输出摘要、局限和关联编号。未完成项不能因为存在设计文档而改成已实现。

每次更新后运行 `python scripts/check_project_docs.py`。如果需求移出当前范围，使用“暂缓”并解释原因，不删除编号或追踪行。

# API 与事件契约（M1-T03）

关联 REQ-005、REQ-008、HAR-004。唯一模型来源为 [正式 DTO](../services/agent/src/prodops/api/models.py)，任务状态词汇位于 [领域层](../services/agent/src/prodops/domain/runs.py)。[OpenAPI](openapi.json) 与 [TypeScript 类型](../packages/api-client/src/schema.d.ts) 都是生成产物，不手改。这里交付契约切片，不表示任务与事件服务已经可用。

## 当前接口与预留模型

实际应用导出健康、能力发现和受保护的开发业务路由。默认工厂不读环境、不打开数据库；未显式配置数据库和开发令牌时，业务路由返回 503。健康仍表示服务骨架生命周期；业务能力以 capabilities 为准。

| 方法与路径 | 行为 |
| --- | --- |
| GET /api/v1/capabilities | 无令牌发现协议、部署身份和实际能力 |
| GET /api/v1/workspaces | 当前开发身份唯一默认工作区 |
| GET/POST /api/v1/workspaces/{workspace_id}/conversations | 分页列表 / 创建会话，创建返回 201 |
| GET /api/v1/conversations/{conversation_id}/messages | 分页消息 |
| GET/POST /api/v1/conversations/{conversation_id}/runs | 分页任务 / 原子提交，提交返回 202 |
| GET /api/v1/runs/{run_id} | 持久任务快照，含待核对的unknown_tool_call_ids |
| POST /api/v1/runs/{run_id}/cancel | 幂等取消，正文{reason?: string/null}，返回200当前快照 |
| POST /api/v1/runs/{run_id}/recover | 按版本核对后恢复，要求Idempotency-Key，返回202原始恢复回执 |

数据库配置后 deployment_id、workspace_id 持久化；未配置时能力发现返回实例临时 ID。配置且就绪时 authentication 为 development_token，conversations/runs 为 true。execution_enabled 随显式开发执行开关与调度器健康状态变化，event_stream 仍为 false。执行器从数据库领取并保存进度，SSE 在后续任务实现。

会话、消息、任务和新分页响应来自正式 DTO。ReservedContracts 继续注册未来事件、工具和提案模型，不增加虚假的路由。

## 版本、输入与错误

- API 主版本仍为 /api/v1；业务协议为精确 1.3，新写事件 schema 为 1.1，读取兼容已存1.0事件。能力发现可省略 X-ProdOps-Protocol，提供时须精确匹配；业务请求必须提供 1.3，旧版 1.0/1.1/1.2 返回 426。
- 业务请求要求单个 Authorization: Bearer 开发令牌，使用恒定时间比较。没有或无效令牌返回 401，重复认证头拒绝；任何 Origin 业务请求返回 403，不授予 CORS。仅使用项目启动入口的 127.0.0.1 绑定，Host 也受限。该单身份机制不代表 M4 多用户登录和角色权限完成。
- 创建会话 title 1 至 512 字符；提交任务 content 去除首尾空白后 1 至 32000 字符，必须显式 execution_mode: mock；其他执行模式和额外字段拒绝。业务写请求体最多 256 KiB，含分块输入，超出返回 413。
- 提交必须提供 UUID Idempotency-Key。在当前数据库部署、工作区、开发身份、会话和操作范围内绑定规范化请求摘要。同键同请求返回原始 202 快照及 Idempotency-Replayed: true；同键异请求返回 409 idempotency_conflict；不同键遇到会话已有活跃任务返回 409 conflict。
- 一个 SQLite 写事务原子保存用户消息、queued 任务、seq=1 的 run.created、幂等记录和会话活跃槽。SQL 写入失败返回脱敏 503，并回滚全部变化；客户端不得盲目重试未知结果的写请求，应保留原键核对。
- 所有查询限定当前默认工作区；不存在或归属其他工作区的资源统一返回 404。分页 limit 为十进制整数 1 至 100，默认 50；cursor 最多 512 字符。按不可变 created_at 与 UUID 降序做 keyset 分页，避免更新会话时间导致翻页重复；游标绑定资源、类别和工作区。游标是有边界的编码数据，无签名且不作为授权凭据；每次仍独立校验资源归属。next_cursor 为 null 表示结束。
- 错误为 {error: {code, message, retryable}, request_id}，设置 no-store 和 X-Request-ID；固定消息不回显输入、SQL、路径或令牌。未知路径和 Host 错误仍使用框架响应。
- DTO 拒绝额外字段，标识为 UUID，时间必须是 UTC。事件 seq 为严格整数 1 至 2^53−1；快照水位允许 0，拒绝布尔、字符串及浮点，保持 TS 精度。

协议1.3增加取消与核对恢复、未知调用ID快照和run.recovery_approved事件。新事件写1.1，既有1.0信封仍可读取；新恢复批准事件仅允许1.1。桌面状态读取同步升级。实际 API 见[提交验证](../docs/verification/2026-10-16-m2-t02-api.md)，执行见[模拟排查验证](../docs/verification/2026-10-17-m2-t03-execution.md)。

## 事件与快照

RunEvent 通过 event_type 判别 13 种事件，每种 payload 都是正式 Pydantic 模型。统一信封包含 schema_version、run_id、seq、event_type、occurred_at 和 payload。事件不是任意 JSON 字典，未知事件类型、错配载荷和多余字段在模型边界拒绝；提案 parameters 的 JsonValue 字典仅保留连接器扩展点，实际使用前还需专用参数校验、权限和脱敏。

快照 status 与 resolution_status 分开；任务 succeeded 不意味着故障 resolved。工具结果中的 unknown 表示需核对，取消表示停止后续调度，不表示在途设备操作已撤销。[示例](examples.json) 覆盖全部事件、成功、失败、取消、待核对及版本不兼容错误，均为人工契约夹具；列表中的事件展示不同分支，不是一段合法的连续运行轨迹。

未来 SSE 的 id 使用任务内十进制 seq，Last-Event-ID 为排他水位；首次连接从快照 last_event_seq 继续，消费者以 `(run_id, seq)` 去重。游标过期在启动流前返回 410 cursor_expired，然后读取新快照再订阅。持久状态与取消/恢复已有行为验证；SSE衔接、断线补发和游标过期仍按后续任务验收。

## 生成与检查

安装环境见 [质量工作流](../docs/quality-workflow.md)。在仓库根目录运行（Windows）：

```text
.venv\Scripts\python.exe services/agent/scripts/export_contracts.py --output contracts/openapi.json
npm run contracts:types
npm run contracts:validators
.venv\Scripts\python.exe scripts/check_contracts.py
node node_modules/typescript/bin/tsc --noEmit -p packages/api-client/tsconfig.json
python scripts/check.py --profile service
```

前三条是显式更新命令。导出器调用实际应用工厂与 OpenAPI 路由解析，再把正式预留模型注册进同一 schema，不读旧快照、不启动服务或访问设备、模型和数据库。依赖锁定的 openapi-typescript 7.10.1 生成 TS 类型；T05 增加 Ajv 从同一 OpenAPI 生成健康与能力响应校验器。检查在临时目录重新导出和生成，比较快照、TS 与运行时校验器，不覆盖仓库产物。桌面用生成校验器读取 HTTP，并通过独立 IPC 模型校验请求和返回值，见[桥接证据](../docs/verification/2026-10-16-m1-t05-bridge.md)。

service 范围包含契约边界测试、真实生成产物漂移回归和 TS 消费编译。默认 M1 额外独立执行 product-contracts；缺少桌面产品时整体仍应 NOT_READY。CI 在 T07 接入，每次任务提交触发真实 CI；本地检查与远端结果分别记录。

取消与核对恢复采用相同令牌、工作区与协议边界。queued立即取消，running进入cancelling，在途结果提交后下一步骤边界终止；重复取消不增加事件，不改写已终态结果。cancelled不表示在途外部动作被撤销，未知调用仍保留。

recover正文包含严格整数expected_version、reviewed_tool_call_ids列表及显式decision: retry_mock_reads。必须与快照版本和全部未核对未知调用ID精确匹配；只允许本阶段mock只读调用，经核对也不把旧unknown伪造成成功。取消中的任务或耗尽预算不可恢复，返回409；无权限资源404。批准事件、核对记录、queued状态及幂等回执同事务保存，下一次领取产生新的attempt_id。已提交证据作为检查点跳过，原调用次数与累计耗时不清空。原键重放原202回执，异请求复用键409。细节见[取消与恢复验证](../docs/verification/2026-10-17-m2-t04-recovery.md)。

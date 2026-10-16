# API 与事件契约（M1-T03）

关联 REQ-005、REQ-008、HAR-004。唯一模型来源为 [正式 DTO](../services/agent/src/prodops/api/models.py)，任务状态词汇位于 [领域层](../services/agent/src/prodops/domain/runs.py)。[OpenAPI](openapi.json) 与 [TypeScript 类型](../packages/api-client/src/schema.d.ts) 都是生成产物，不手改。这里交付契约切片，不表示任务与事件服务已经可用。

## 当前接口与预留模型

实际应用只导出三个路径：`GET /health/live`、`GET /health/ready` 和 `GET /api/v1/capabilities`。健康响应保持 T02 的格式，503 仍返回 HealthResponse；健康就绪仅指服务骨架。能力查询返回模式、协议 `1.0`、事件版本 `1.0` 及能力标记；会话、任务、事件流均为 false，authentication 为 unavailable。

M1 尚无部署数据库，能力中的 deployment_id 由每次应用工厂创建，实例存活期间保持不变，重启会变化，不能用作持久部署缓存键。这是当前切片的临时身份；M2/M4 实现数据库与连接隔离时改为持久部署标识，并验证迁移和缓存行为。

会话、消息、分页、任务提交、任务快照、重放游标、证据、工具结果、提案和事件由 ReservedContracts 注册进 `components.schemas`。`x-prodops-reserved-models` 指向注册表；它不是 HTTP 响应，也不增加虚假的业务路径。业务端点在 M2 及后续阶段实现后才进入 `paths`。当前 RunCreateRequest 只预留 content；附件、设备范围、权限和连接器专用参数随相应切片扩充校验，不接受客户端任意执行命令。

## 版本、输入与错误

- API 主版本用 `/api/v1`；协议与事件 schema 当前仅支持精确的 `1.0`。版本是本阶段设计初值，不是额外用户需求。
- 能力发现可省略 `X-ProdOps-Protocol`；如果提供，必须精确为 `1.0`。其他值（包括空值）返回 426 incompatible_protocol，拒绝静默降级。后续业务路由必须在执行用例前实施同样的兼容校验；当前没有可提交任务的路由。
- 错误格式为 `{error: {code, message, retryable}, request_id}`。协议错误及请求校验错误分别为 426、422，并设置 no-store 和 X-Request-ID。错误不回显原始值、字段路径、请求体或异常详情。未知路径和 Host 中间件错误仍使用框架原有响应，不宣称所有 HTTP 错误均已统一。
- DTO 拒绝额外字段，标识使用 UUID，时间必须带 UTC 时区。事件 seq 为严格整数，范围 1 至 2^53−1；快照水位和重放游标允许 0，拒绝布尔值、字符串和浮点数，避免 TS 数值精度丢失。
- 初始输入限制为 content 1 至 32000 字符，短文本最多 512 字符，分页 limit 1 至 100、默认 50，游标最多 512 字符。这些是可调整的接口设计初值，HTTP 总体大小限制仍需业务服务实现。
- 分页 cursor 为不透明字符串，响应 next_cursor 为 null 表示结束。未来 Idempotency-Key 使用 UUID，在部署、工作区、身份、资源和操作范围内绑定请求摘要；相同键不同请求返回 409 idempotency_conflict。当前仅有模型，尚无数据库去重实现。

错误未提供通用 details 字典，原因是目前没有已定义的公开详情字段，避免未来把原始校验输入或第三方异常直接带给客户端。需要新增详情时定义专用模型并评审。retryable 只是展示信息，不能据此盲目重试未知结果的写请求。

## 事件与快照

RunEvent 通过 event_type 判别 12 种事件，每种 payload 都是正式 Pydantic 模型。统一信封包含 schema_version、run_id、seq、event_type、occurred_at 和 payload。事件不是任意 JSON 字典，未知事件类型、错配载荷和多余字段在模型边界拒绝；提案 parameters 的 JsonValue 字典仅保留连接器扩展点，实际使用前还需专用参数校验、权限和脱敏。

快照 status 与 resolution_status 分开；任务 succeeded 不意味着故障 resolved。工具结果中的 unknown 表示需核对，取消表示停止后续调度，不表示在途设备操作已撤销。[示例](examples.json) 覆盖全部事件、成功、失败、取消、待核对及版本不兼容错误，均为人工契约夹具；列表中的事件展示不同分支，不是一段合法的连续运行轨迹。

未来 SSE 的 id 使用任务内十进制 seq，Last-Event-ID 为排他水位；首次连接从快照 last_event_seq 继续，消费者以 `(run_id, seq)` 去重。游标过期在启动流前返回 410 cursor_expired，然后读取新快照再订阅。落库顺序、唯一约束、断线无遗漏与取消状态转换属于 M2 行为验收，当前模型校验不证明这些行为已经实现。

## 生成与检查

安装环境见 [质量工作流](../docs/quality-workflow.md)。在仓库根目录运行（Windows）：

```text
.venv\Scripts\python.exe services/agent/scripts/export_contracts.py --output contracts/openapi.json
npm run contracts:types
.venv\Scripts\python.exe scripts/check_contracts.py
node node_modules/typescript/bin/tsc --noEmit -p packages/api-client/tsconfig.json
python scripts/check.py --profile service
```

前两条是显式更新命令。导出器调用实际应用工厂与 OpenAPI 路由解析，再把正式预留模型注册进同一 schema，不读旧快照、不启动服务或访问设备、模型和数据库。依赖锁定的 openapi-typescript 7.10.1 生成 TS 类型；检查在临时目录重新导出和生成，比较快照及 TS 内容，不覆盖仓库产物。仅 TS 声明不能替代运行时校验，桌面消费与 IPC 输入校验在 T05 建立。

service 范围包含契约边界测试、真实生成产物漂移回归和 TS 消费编译。默认 M1 额外独立执行 product-contracts；缺少桌面产品时整体仍应 NOT_READY。CI 在 T07 接入，当前本地检查不能代表远端通过。

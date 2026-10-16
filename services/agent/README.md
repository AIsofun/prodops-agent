# Python 开发服务

M1-T02 服务骨架与 M1-T03 契约切片，关联 REQ-002、REQ-003、REQ-005、REQ-008、HAR-003、HAR-004。Python 3.12/3.13，Windows 优先；当前已在 Windows 运行验证。

## 启动

从仓库根目录安装锁定环境（包含本服务的可编辑安装和测试工具）：

```text
uv sync --frozen --group dev --cache-dir .quality-reports/uv-cache --link-mode copy
```

Windows 启动本机开发入口：

```text
.venv\Scripts\prodops-agent.exe --mode local --port 8765
```

服务器开发入口：

```text
.venv\Scripts\prodops-agent.exe --mode server --port 8765
```

两条命令共用业务包与应用工厂。默认端口为 `0`，由系统分配，实际地址显示在启动日志中。指定端口冲突时非零退出；按 Ctrl+C 结束前台开发服务。Linux/macOS 对应入口为 `.venv/bin/prodops-agent`，尚未实机验证。

查询 `http://127.0.0.1:8765/health/live` 与 `http://127.0.0.1:8765/health/ready`：存活返回 200；就绪在 lifespan 启动完成后返回 200，未启动或关闭后返回 503。响应包含 `status`、`mode` 和 `scope: service_skeleton`，只表示当前骨架就绪，不表示模型、数据库或设备可用。健康响应禁止缓存。

## 配置

配置在启动时显式加载，无 `.env` 自动读取、源码配置或导入时环境缓存。命令行参数优先于环境变量，再使用默认值；`mode` 没有默认值。

| 环境变量 | 命令行 | 当前允许值 | 默认 |
| --- | --- | --- | --- |
| `PRODOPS_MODE` | `--mode` | `local`、`server` | 必填，二者选一 |
| `PRODOPS_ENVIRONMENT` | 无 | `development` | `development` |
| `PRODOPS_HOST` | `--host` | `127.0.0.1` | `127.0.0.1` |
| `PRODOPS_PORT` | `--port` | 0 至 65535 的整数 | `0` |
| `PRODOPS_DATABASE` | `--database` | SQLite 文件绝对路径 | 无 |
| `PRODOPS_DEVELOPMENT_TOKEN` | 无 | 32 至 256 字符开发令牌，仅通过环境传入 | 无 |

缺少模式、非法值或未知 `PRODOPS_` 配置项返回退出码 2，只输出字段与错误类别，不回显输入值。未知字段不自动忽略，避免拼写错误导致静默采用默认配置。

当前两种模式都仅供回环开发，拒绝生产环境及非回环绑定。`server` 表示装配模式，正式的认证、HTTPS 入口、PostgreSQL 和多人访问在 M4 交付。默认保持无数据库的健康骨架。显式同时配置数据库路径和开发令牌后启用受保护业务 API；缺一、相对路径或短令牌均在启动前拒绝。本机随机令牌、父进程管理和启动管道在 M3 实现。

## 代码与验证

`src/prodops` 按 `domain` → `application` → `api` 组织；`bootstrap` 装配配置、lifespan 和进程入口。没有业务实现的架构层待相应任务添加。`create_app(settings)` 可显式注入校验后的配置；`create_local_app()` 与 `create_server_app()` 是不读取环境、不绑定端口的开发应用工厂。实际监听由已校验配置的 CLI 完成，不使用外部 ASGI 启动参数代替本项目的配置校验。

在仓库根目录运行：

```text
python scripts/check.py --profile service
```

它执行工程基础检查、服务和测试代码的严格类型检查、Python 模块边界与服务行为测试。测试覆盖两种模式的安装入口真实启动、HTTP 健康查询、生命周期、启动失败、非法配置、端口冲突和导入无连接副作用。Windows 测试中的子进程使用强制终止清理，优雅退出通过 ASGI lifespan 验证；桌面父子进程退出验收仍在 M3。

M1-T03 增加 `GET /api/v1/capabilities`、正式 DTO、OpenAPI 快照和生成的 TypeScript 类型，协议与生成方式见 [契约说明](../../contracts/README.md)。服务行为测试也覆盖契约校验、版本拒绝、导出无外部访问、生成漂移与 TS 消费编译。

M2-T01 增加独立的 [SQLite 存储适配器](src/prodops/adapters/storage/README.md)、随包版本迁移与隔离数据库回归。M2-T02 在显式配置时装配存储，迁移和稳定身份准备完成后才就绪，关闭时释放数据库连接。令牌没有命令行选项，不写进源码、命令历史或日志；由调用方从其受控环境设置 PRODOPS_DEVELOPMENT_TOKEN。数据库位置示例：

```text
.venv\Scripts\prodops-agent.exe --mode local --database F:\prodops-data\development.sqlite3 --port 8765
```

业务请求使用 Authorization: Bearer、X-ProdOps-Protocol: 1.3，任务提交另带 UUID Idempotency-Key；必须显式选择 execution_mode: mock。接口、分页、事务与错误定义见 [契约说明](../../contracts/README.md)。默认仅持久化 queued 任务；显式启用开发执行后运行模拟诊断，仍无 SSE 或真实模型。完整桌面诊断在 M3 接入。不要将开发令牌用于生产身份管理。

## 显式模拟执行

在已有数据库与环境开发令牌配置上，将 PRODOPS_EXECUTION_ENABLED 设为 true，再启动同一CLI。未启用时历史和提交仍可用，任务保持排队；启用时每个服务生命周期只有一个调度器，周期读取已提交数据库队列，任务不依赖HTTP连接存活。不支持真实模型模式，不会把真实模型失败切换为mock。

| 环境变量 | 默认与限制 |
| --- | --- |
| PRODOPS_EXECUTION_ENABLED | false；启用须配置数据库与令牌 |
| PRODOPS_MAX_CONCURRENT_RUNS | local为1且上限1；server默认4，可设1至4 |
| PRODOPS_QUEUE_LIMIT | 默认100，可设1至100，满时提交429 |
| PRODOPS_MAX_TOOL_CALLS | 每任务默认12，可设1至100 |
| PRODOPS_RUN_TIMEOUT | 累计执行时长默认600秒，必须大于0且最多600秒 |
| PRODOPS_TOOL_TIMEOUT | 单次工具默认30秒，必须大于0且最多600秒 |

提交时将各预算写入任务检查点。后续改服务默认值不会重置已提交任务的工具次数或单任务时长预算；队列和全局并发使用当前明确配置。运行中定期保存心跳与累计耗时，工具发起前消费调用预算。排队时间不计入执行时长。

模拟问题为相机掉线、OCR质量下降、Kafka堆积、推理延迟。每类读取三份打包的只读模拟观测：指标、日志和建议；来源均为mock://，无网络或真实设备动作。多类歧义或无法识别的问题返回澄清回复且证据为空。完成仅表示诊断执行成功，resolution_status仍unknown。

状态、检查点、工具结果、证据和事件在相应事务内提交，最终assistant消息完整保存并释放会话活跃槽。相同幂等键仍重放最初的提交回执；最新结果通过任务快照查询。存储故障撤销服务就绪状态，不自动重试未知写结果。关闭调度器先停止领取并等待收尾，超过5秒则保留待核对状态；重启扫描与用户取消已按隔离故障场景验证。本阶段仍为单进程开发服务，多副本、PostgreSQL与正式身份管理在后续阶段。

## 取消与中断核对

显式配置数据库的服务先取得规范化数据库路径对应的OS服务锁，再迁移并扫描遗留running/cancelling；已有服务持锁时拒绝第二个服务启动。正常退出或异常进程结束由OS释放锁，锁文件保留，不依据文件是否存在判断占用。此锁是保证启动扫描不会误判活服务所需的服务单实例基础，完整桌面单实例和父进程管理仍在M3。

失去原所有者的执行记录进入recovery_required；在途调用标unknown，尚未执行的queued保留。扫描完成才对外就绪，执行器不领取待核对任务。保留上次累计耗时，并保守计入最后心跳至恢复扫描之间的未确认区间（含停机时间），避免中断重置预算。

POST /api/v1/runs/{run_id}/cancel 正文可为{}。排队任务立即取消，在途任务先cancelling，工具返回后保留其真实结果并停止后续工具；重复请求不增加事件。服务关闭先停止领取、最多等待5秒收尾，未确认的调用保留unknown与待核对状态。

POST /api/v1/runs/{run_id}/recover 使用Idempotency-Key，正文为expected_version、reviewed_tool_call_ids和decision: retry_mock_reads。先读取快照核对未知调用，旧版本、不完整核对、非mock调用、已取消或耗尽预算均拒绝。原未知工具记录保留unknown和核对痕迹；新尝试从已提交步骤后继续，只在明确批准后重试未确认的模拟只读步骤。完整设备操作核对与正式身份仍按后续阶段实现。

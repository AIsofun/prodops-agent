# Python 服务骨架

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

缺少模式、非法值或未知 `PRODOPS_` 配置项返回退出码 2，只输出字段与错误类别，不回显输入值。未知字段不自动忽略，避免拼写错误导致静默采用默认配置。

当前两种模式都仅供回环开发，拒绝生产环境及非回环绑定。`server` 表示装配模式，正式的认证、HTTPS 入口、PostgreSQL 和多人访问在 M4 交付。当前没有业务写接口，不提供认证能力；本机随机令牌、父进程管理和启动管道在 M3 实现。

## 代码与验证

`src/prodops` 按 `domain` → `application` → `api` 组织；`bootstrap` 装配配置、lifespan 和进程入口。没有业务实现的架构层待相应任务添加。`create_app(settings)` 可显式注入校验后的配置；`create_local_app()` 与 `create_server_app()` 是不读取环境、不绑定端口的开发应用工厂。实际监听由已校验配置的 CLI 完成，不使用外部 ASGI 启动参数代替本项目的配置校验。

在仓库根目录运行：

```text
python scripts/check.py --profile service
```

它执行工程基础检查、服务和测试代码的严格类型检查、Python 模块边界与服务行为测试。测试覆盖两种模式的安装入口真实启动、HTTP 健康查询、生命周期、启动失败、非法配置、端口冲突和导入无连接副作用。Windows 测试中的子进程使用强制终止清理，优雅退出通过 ASGI lifespan 验证；桌面父子进程退出验收仍在 M3。

M1-T03 增加 `GET /api/v1/capabilities`、正式 DTO、OpenAPI 快照和生成的 TypeScript 类型，协议与生成方式见 [契约说明](../../contracts/README.md)。服务行为测试也覆盖契约校验、版本拒绝、导出无外部访问、生成漂移与 TS 消费编译。

当前不包含任务执行、SSE、数据库、模型、桌面窗口、安装包或 CI。后续按 [M1 任务卡](../../docs/tasks/m1/README.md) 推进。

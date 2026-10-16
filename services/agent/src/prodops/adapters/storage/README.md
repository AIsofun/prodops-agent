# SQLite 存储基础

M2-T01，关联 REQ-007、NFR-004。当前是独立适配器，没有自动接入业务 API，也不在导入或构造时创建文件。只在显式 start 后创建/迁移调用者提供的数据库；业务入口和开发认证由下一任务接入。

SQLAlchemy 2.1.4（asyncio extra）、Alembic 1.20.0、aiosqlite 0.22.1 与 greenlet 3.5.6 已由 uv.lock 固定。接口在 application/storage.py，记录是 domain/records.py 的标准库 dataclass；上层不依赖 SQLAlchemy 或 API DTO。

初版迁移包含 deployments、workspaces、conversations、messages、runs、run_events、tool_calls、idempotency_records，版本为 0001_storage。迁移定义独立于当前 ORM，不使用 metadata.create_all 冒充历史迁移；迁移脚本随服务包携带，避免依赖仓库根目录。Alembic 需要共享上下文，进程内以线程锁串行执行迁移，并放在工作线程，不阻塞事件循环；SQLite BEGIN 与 DDL 事务由显式事件配置管理。

部署和默认工作区 ID 落库，默认工作区通过明确引用保存，其他工作区的新增不改变身份。每次操作创建独立 AsyncSession；写事务使用 BEGIN IMMEDIATE，读事务使用 DEFERRED。数据库启用外键、WAL、5秒 busy_timeout；事件主键为 `(run_id, seq)`，限制正序号和 JS 安全整数上限。任务/调用状态及版本范围有数据库约束，但表存在不代表任务执行或状态机已经实现。

时间必须带时区，存储前归一 UTC，SQLite 读回恢复 UTC，拒绝无时区时间。会话适配器只读取其默认工作区，SQL 参数由 ORM 绑定。close 释放连接并清空就绪身份；调用方须先收尾自己的任务/事务再关闭。当前没有多进程任务领取、备份或生产恢复保证。

未知迁移版本明确启动失败，保留原数据和版本，不伪造降级或自动重建。破坏性 downgrade 暂不开放，备份恢复按 M6 验收。初始化错误只返回固定说明，不回显路径、SQL 或版本输入。

测试使用临时文件数据库，覆盖迁移、重开、事务回滚、外键/状态/序号、并发独立会话、默认身份、数据库和工作区隔离、UTC、未知版本及关闭释放。wheel 内容验证仅确认迁移文件携带，不代表安装包完成。

```text
python scripts/check.py --profile service
python scripts/check.py
```

依据：[SQLAlchemy 异步会话](https://docs.sqlalchemy.org/en/21/orm/extensions/asyncio.html)、[Alembic 程序化迁移](https://alembic.sqlalchemy.org/en/latest/cookbook.html)。

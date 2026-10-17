# 任务核心集成验收

任务M2-T06，REQ-005/006/007/008/009/010/019、NFR-003/004、HAR-006/007。2026-10-17，Windows11 AMD64，Python3.13.2、Node24.14.1及锁定SQLite依赖。基线63dd4f1；本轮仅增加真实双模式任务链路/重启集成测试与交付记录，不修改业务实现。

| AC | 实际步骤和结果 | 状态 | 证据 |
| --- | --- | --- | --- |
| M2-T06-AC01 | 正式已安装CLI local/server随机回环端口；同会话连续OCR、Kafka两次mock提交202；SSE事件连续、最终消息/证据/未知解决状态；分页历史；关闭并重启同库新进程后身份、快照、4条消息与历史保持，快照水位续接无重复 | PASS | [集成测试](../../services/agent/tests/test_service.py)、[统一报告](2026-10-17-m2-t06-checks.json) |
| M2-T06-AC02 | 同一检查执行实际API幂等/并发/队列、工具次数/超时、步骤取消、真实硬退出未知结果、核对恢复及HTTP SSE断线补发；隔离SQLite与正式服务链路结合验证 | PASS | 同上；[恢复回归](../../services/agent/tests/test_recovery.py)、[SSE回归](../../services/agent/tests/test_events.py)、[缺陷阻断](2026-10-17-m2-t06-injections.json) |
| M2-T06-AC03 | 本地统一、13项缺陷阻断与包含新增双模式集成测试的真实Windows CI均PASS，逐项回执齐备 | PASS | [本轮CI](2026-10-17-m2-t06-remote/github.json)、[自查](../reviews/2026-10-17-m2-t06-acceptance.md) |

本地报告整体PASS，38项工程回归、84项Python服务/契约/存储/API/执行/恢复/SSE及集成测试、5项客户端消费、13项桌面连接行为均通过。类型、模块边界和生成漂移检查通过。13项真实产品副本缺陷注入全部得到预期结果，不修改正式代码。初轮因新增测试局部字典类型推导过窄导致mypy失败，补充显式dict[str,object]后类型、统一检查及故障注入重跑通过，没有忽略检查。

双模式集成使用独立临时数据库和明确测试令牌，走正式CLI、Bearer/协议、业务路由与执行器，未用旧demo替代。每个模式完成两个任务，验证完成后同会话可再次提交；原键重放仍返回最初202回执，不重复执行。服务重启前任务均终态；测试对子进程强制结束作隔离清理，不将其说成生产退出验收。另由取消/恢复测试验证5秒收尾及硬退出窗口。

基线63dd4f100317c7bc963a5d5a5f421c739a80b864的[GitHub Windows CI](https://github.com/AIsofun/prodops-agent/actions/runs/38996412706)已成功，下载[统一报告](2026-10-17-m2-t06-baseline-ci/ci-checks.json)和[缺陷注入](2026-10-17-m2-t06-baseline-ci/ci-injections.json)均PASS。该基线不包含本轮新增集成测试；新增集成测试提交f9a625a6276cabedb6f61985a0a13d84753212b8的[真实CI](https://github.com/AIsofun/prodops-agent/actions/runs/38996769885)同样success；已下载[统一检查](2026-10-17-m2-t06-remote/ci-checks.json)与[缺陷注入](2026-10-17-m2-t06-remote/ci-injections.json)，均PASS。最终任务因此进入verified；本次收尾工作区只改验收/后续任务文档，没有声称远端已覆盖其自身的文档提交。

本阶段范围为SQLite、单进程、回环开发身份与显式mock。真实模型、PostgreSQL、正式多用户身份、生产设备写入、真实内网代理、桌面诊断/自动服务管理、安装包及干净Windows验收仍在后续阶段。main必要检查保护未配置，HAR-009继续保留缺口。

补充执行npm run desktop:build及正式verify-connection脚本，五个实际Electron构建窗口场景全部PASS：[结果](2026-10-17-m2-t06-desktop/integration.json)、[本机就绪截图](2026-10-17-m2-t06-desktop/ready-local/desktop.png)。目视核对就绪状态，仍明确诊断UI未开放；安全探针证明无Node全局、最小桥接、参数拒绝和窗口退出。这里只是当前协议桥接回归，不把它当作M3诊断界面或安装包验收。

M2六项任务切片全部verified，后续按[M3七张任务卡](../tasks/m3/README.md)推进。HAR-007当前模拟任务核心故障可复现已验证，新增功能继续补充；HAR-006仍待真实模型评测，NFR-004仍待PostgreSQL，产品完整需求不因此全部完成。

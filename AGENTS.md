# 项目开发入口

本仓库正在从生产异常排查 demo 演进为 Windows 优先的桌面 Agent。

## 阅读顺序

- [需求与验收标准](docs/requirements.md)
- [需求及工程约束追踪](docs/traceability.md)
- [Harness 工程约束](docs/engineering-constraints.md)
- [架构设计](docs/architecture.md)
- [实施计划](docs/implementation-plan.md)

## 开发规则

- 技术栈为 Electron、React、TypeScript、CSS 和 Python，同时支持本机与工厂内网服务器。Windows 桌面端优先。
- 开始功能工作前明确关联的 REQ、NFR 或 HAR 编号，按需求切片推进。现有 demo 是参考，不作为新产品已经完成的证据。
- 需求、实现状态、设计和实施顺序分别按上述文档维护。新增范围或架构偏离记录原因，不把推导项描述为用户明确要求。
- 新业务模块按架构边界组织。模型、工具、持久化和桌面通信通过接口解耦，外部输入需运行时校验。
- 验证使用 mock、隔离数据库和授权测试环境。开发任务不自动授权真实设备写操作、外部发送或发布。
- 完成功能时更新追踪表的实现位置与验证记录。未运行、跳过、失败和未接入的检查如实记录，不能写成通过。
- M1 按 [阶段任务卡](docs/tasks/m1/README.md) 推进；验收与复核按 [统一交付格式](docs/quality-workflow.md) 保存，任务清单进入 verified 需要逐项 AC 证据和复核回执。
- 测试验证业务行为与边界，不为低影响文案变更添加产品测试。架构例外按工程约束登记影响和退出条件。
- 不自动重试未知结果的写操作，不以 mock 结果掩盖真实模型或连接器失败。
- 不提交凭据、生产数据或带秘密的日志；尊重用户已有改动。

## 当前可用检查

```text
python scripts/check.py --profile docs
python scripts/check.py --profile harness
python scripts/check.py --profile service
python scripts/check.py
git diff --check
```

安装本地工具与检查范围见 [质量检查说明](docs/quality-workflow.md)。默认命令执行 M1 静态检查与 Python 骨架行为测试，产品缺失时返回 NOT_READY；harness 仅验证工程设施，service 增加当前服务类型、模块边界与行为检查。完整业务运行、桌面、安装包和远端 CI 仍需按对应任务建立。

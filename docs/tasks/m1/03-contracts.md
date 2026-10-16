# M1 T03 API 与事件契约

关联 REQ-005、REQ-008、HAR-004。依赖 M1-T02。状态见 [任务清单](tasks.json)。

定义健康、能力、会话、任务快照、事件与错误 DTO。契约描述后续业务能力，不代表全部路由已经实现。API 实际能力与预留模型在文档中区分。

验收标准：

- M1-T03-AC01：`services/agent/scripts/export_contracts.py --output FILE` 从实际应用工厂及正式模型导出 OpenAPI，导出过程无模型或设备访问；不能只复制旧快照冒充实时导出。
- M1-T03-AC02：保存 `contracts/openapi.json`，通过锁定的 openapi-typescript 生成 `packages/api-client/src/schema.d.ts`；事件模型进入正式 schema，避免维护两份不同定义。
- M1-T03-AC03：契约检查重新导出、重新生成并比较；结构或类型漂移被拒绝；非法输入和协议版本有明确校验方案与相关测试。

生成文件只由生成命令更新，检查模式在临时目录生成，不自动覆盖仓库文件。实际鉴权、事件推送与任务执行在后续阶段实现。

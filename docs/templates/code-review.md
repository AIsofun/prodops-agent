# 代码复核交付模板

本模板用于形成具体复核记录。复制到 `docs/reviews/` 后填写实际内容；机读回执另存 JSON，不能直接把模板当作已完成的复核。

## 复核范围

- 任务编号与需求编号：
- 实现位置与改动范围：
- 基线版本与未提交改动说明：
- 复核人或 Agent：
- 复核方式：self_review、independent_review 或 human_review。
- 参考的任务卡、架构与证据：

## 复核结果

| 发现编号 | 严重度 | 位置与触发条件 | 影响和依据 | 处置状态 | 修复或关闭理由 |
| --- | --- | --- | --- | --- | --- |

处置状态采用 open、fixed、accepted 或 false_positive。没有发现时明确写“本次范围内未发现可确认问题”，不能声称已经证明没有缺陷。记录实际查看的正确性、异常、兼容性、权限与测试范围。

## 结论

- decision：approved 或 changes_requested。
- 未验证范围与残余风险：
- 是否有独立复核：如实记录；自查不标为独立审查。
- 后续任务：

对应 JSON 至少包含 schema_version、task_id、mode、decision、record 和 findings。record 指向仓库中的本次 Markdown 记录；每个 finding 包含 id、severity、status、reason。存在 open 发现时任务不能标为 verified。

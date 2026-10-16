# 统一质量检查与交付方法

本入口落实 HAR-003、HAR-004、HAR-005 和 HAR-010 的工程基础。M1 任务见 [任务卡索引](tasks/m1/README.md)，业务需求的完成情况仍以 [追踪表](traceability.md) 为准。

M1 技术骨架完成后，[M2 任务卡](tasks/m2/README.md)继续使用同一交付回执格式。检查器会汇总 docs/tasks/m*/tasks.json，校验跨阶段依赖、唯一编号与逐项证据，不把新阶段任务计入 M1 产品验收。默认 profile 名仍为 m1，表示持续维护的产品检查集合；服务测试随实现扩展，具体里程碑完成情况以任务回执为准。

## 1 安装本地工具

工具环境使用 Python 3.12 或 3.13、Node.js 22.18 至 24.x，以及 uv 和 npm。先运行：

```text
uv sync --frozen --group dev --cache-dir .quality-reports/uv-cache --link-mode copy
npm ci --ignore-scripts --no-audit --no-fund
```

Python 工具放在项目 `.venv`，Node 工具放在 `node_modules`，不需要全局安装 mypy 或 TypeScript。uv 缓存也保存在被忽略的项目目录，避免检查受全局缓存权限影响。`uv.lock` 与 `package-lock.json` 固定依赖。Python 使用 uv workspace：服务有自己的依赖清单，根开发组以可编辑方式安装服务及测试依赖，不安装旧 demo 的依赖。说明见 [服务运行方式](../services/agent/README.md)。

桌面开发依赖通过 npm workspace 安装。因安装时禁用了脚本，需要额外运行 `node node_modules/electron/install.js` 下载锁定 Electron 运行时，再执行 `npm run desktop:dev`。实际窗口与安全探针命令见 [桌面说明](../apps/desktop/README.md)；CI 静态检查不需要该运行时下载。

## 2 四种检查范围

```text
python scripts/check.py --profile docs
python scripts/check.py --profile harness
python scripts/check.py --profile service
python scripts/check.py
```

| 范围 | 实际执行 | 通过意味着什么 |
| --- | --- | --- |
| docs | 需求文档检查、任务依赖和交付回执检查 | 文档及引用结构一致 |
| harness | 环境、docs、Python/TS 工具代码类型检查、检查器回归场景 | 工程设施在当前环境可以工作 |
| service | harness，再检查服务、导出器及测试的 Python 类型、跨层导入、服务和契约行为、TS 契约消费编译 | 当前服务及契约切片通过，不代表任务执行、完整业务服务或 M1 完成 |
| m1 默认 | service，再检查实际产品与独立 renderer TS 类型、跨层导入、API/生成类型/运行时校验器漂移、桌面连接与IPC行为 | M1 静态检查和骨架行为通过，真实窗口运行和 CI 仍需另验收 |

结果只有 PASS、FAIL、NOT_READY，进程退出码分别为 0、1、2。有失败时整体 FAIL；没有失败但存在未就绪项时整体 NOT_READY。外部工具的任何非零退出都按失败处理，只有本项目明确约定的就绪检查才把 2 解释为 NOT_READY。

缺少产品目录、类型配置、服务测试、契约导出器或生成文件时不能空跑后返回成功。harness 通过不代表产品实现，docs 通过也不代表证据内容充分。m1 包含当前服务骨架行为测试，不替代完整业务运行测试、桌面截图、安装包或 CI 验收。

默认报告写入被忽略的 `.quality-reports/`。需要保留时使用 `--report docs/verification/实际记录名.json`，以仓库实际路径替换文件名；报告包含作用范围、时间、命令、逐项结果和耗时，不能跨范围解释为验收通过。

## 3 模块与契约检查

Python 检查通过 AST 解析静态 import、相对 import 和常见动态导入，按架构允许方向验证；领域层只允许标准库与领域代码。TypeScript 检查使用编译器 API，识别 import、re-export、require、动态 import 和 tsconfig 路径别名；renderer/shared 禁止导入 Electron 或 Node，preload 禁止 Node 原生模块，main 负责相应系统能力。

检查器不是完整的动态程序分析器；反射、包装后的加载器和第三方包内部行为仍需代码复核、类型检查和运行权限共同约束。工具检查中的假产品只用于验证规则，不登记为真实产品覆盖。

契约检查约定服务导出器接受 `--output FILE`，输出真实应用和模型的 OpenAPI；与 `contracts/openapi.json` 比较，再在临时目录用锁定的 openapi-typescript 生成类型，与 `packages/api-client/src/schema.d.ts` 比较。检查不会自动覆盖仓库快照或生成文件。导出器是否真正反映应用，由产品测试与复核共同确认。

T05 增加同源的 Ajv 运行时校验器，`npm run contracts:validators` 显式更新 `packages/api-client/src/validators.cjs`；契约检查使用重新导出的临时 OpenAPI 生成并比较该文件。三类漂移都被拒绝，已有快照不作为实时导出来源。

T06 的 `python -m scripts.verify_product_gates` 将真实产品源文件复制到工作区隔离目录，先跑正常基线，再注入类型、边界和生成漂移；API 修改由副本实际导出，旧 demo 不参加产品替身验证。脚本保存预期与实际结果，不修改正式源文件。默认桌面行为检查仅编译到忽略的 .test-build，不覆盖正式 preload bundle，不启动窗口。

M1-T03 的真实应用导出器、预留事件模型及类型生成方式见 [契约说明](../contracts/README.md)。生成类型的消费检查只编译契约夹具，不代表 Electron/React 产品已建立；service 回归使用真实产物副本验证 schema 和 TS 漂移均被拒绝，且检查不改写副本。

## 4 复核与证据格式

使用 [代码复核模板](templates/code-review.md) 和 [验证证据模板](templates/verification.md)。详细记录放在 `docs/reviews/` 与 `docs/verification/`，JSON 回执供任务清单引用。机读示例见本轮 [验证回执](verification/m1-t01.json) 与 [复核回执](reviews/m1-t01.json)。

任务状态为 not_started、in_progress、implemented、verified。进入 implemented 时实现文件必须存在；进入 verified 时全部 AC 必须有通过的证据、复核回执正确、没有 open 发现且依赖任务已验证。结构检查不能判定证据内容真假或完备性，人工及实际运行复核仍需负责。

自查明确记录 self_review，不标成独立 Agent 或人工审查。对实际运行环境、远端检查或生产数据没有验证时，直接填写未验证范围。任务卡完成只代表该卡约定的切片完成，不能把它覆盖的需求整体提前标为已验证。

GitHub Windows CI 已实际运行，同一本地入口和真实产品故障注入会保存两个质量 JSON。[CI 说明](ci.md)和[远端证据](verification/2026-10-16-m1-t07-ci.md)区分运行通过与合并限制：main 当前没有必要检查保护，不能宣称平台已阻止失败代码合并。

实现依据：[uv workspace](https://docs.astral.sh/uv/concepts/projects/workspaces/) 支持成员独立依赖与共同锁文件；服务用 [FastAPI lifespan](https://fastapi.tiangolo.com/advanced/events/) 管理生命周期，测试遵循 [上下文管理器用法](https://fastapi.tiangolo.com/advanced/testing-events/)。当前锁定的 Starlette 测试客户端使用 [httpx2](https://starlette.dev/testclient/)。

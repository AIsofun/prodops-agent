# 桌面开发骨架

关联 REQ-001、HAR-003、HAR-005。Windows 优先，当前为开发窗口，不是安装包。Electron 44.8.0、React 19.3.1、Vite 8.3.4，精确版本见根 package.json 与 package-lock.json。

在仓库根目录安装与启动：

```text
npm ci --ignore-scripts --no-audit --no-fund --cache .quality-reports/npm-cache
node node_modules/electron/install.js
npm run desktop:dev
```

Electron 安装步骤下载锁定版本的官方运行时。可将 ELECTRON_CACHE 环境变量设为仓库内 .quality-reports/electron-cache。安装开发环境需要联网；这不代表未来离线产品安装已完成。

开发命令编译 main/preload/shared，启动仅监听 127.0.0.1 的随机端口 Vite，再打开桌面窗口；关闭 Windows 窗口后 Electron 退出并关闭 Vite。界面文件支持 Vite 热更新；修改 main/preload 后重新启动命令。构建文件可独立启动：

```text
npm run desktop:build
npm run desktop:start
```

源码目录分别是 main、preload、renderer、shared。根 tsconfig 覆盖全部实际 TS 源码，renderer 的独立配置排除 Node 类型。主进程编译为 CommonJS；preload 打包 shared 校验代码，保留 electron 为唯一外部模块以兼容沙箱。桥接暴露 getInfo、connections.getStatus、有限business方法与events.open/read/close，不提供通用 IPC、URL、文件或 shell 方法。

未设置 PRODOPS_SERVICE_PORT 时，主进程自动启动项目虚拟环境中的本机服务，将数据库放在 Electron userData/agent/prodops.sqlite3。每次启动产生随机令牌与实例标识，仅通过继承 stdin 管道传给服务；服务绑定随机回环端口，完成迁移和恢复后通过 stdout 返回无令牌握手。主进程校验实例、进程关系、协议、健康、部署身份和认证读取后才报告就绪。启动最多等待30秒，失败不会自动重试；退出先通过私有管道收尾，超时只回收自己创建的进程树。

显式设置 PRODOPS_SERVICE_PORT 时保留外部开发服务的只读状态连接，PRODOPS_SERVICE_MODE 为 local 或 server（默认 local），需按[服务说明](../../services/agent/README.md)手动启动。界面不能更改连接或传入目标地址。随包入口定位为 resources/agent/prodops-agent.exe；实际运行时打包、安装及干净 Windows 验收仍待后续任务。正式登录和连接配置保存仍在 M4。

状态客户端访问两个固定GET路径，限制响应32KiB和每请求2.5秒。业务客户端只使用正式API固定路由，提供工作区、会话/消息/任务分页、提交、取消与明确核对恢复；请求最多256KiB，响应最多4MiB、5秒总时限、并发最多8。全部携带协议1.4，拒绝跳转，不自动重试。参数/结果用正式OpenAPI生成校验器并核对部署及资源归属；错误只返回固定分类和关联ID，不返回底层消息、异常或凭据。发送者必须为当前窗口主帧，连接切换后旧响应拒绝交付。

events在主进程持有Bearer并解析SSE。每窗口最多4个订阅，每订阅最多缓存32条已校验事件，帧上限128KiB；renderer通过read拉取最多8条，不建立无限推送队列。相同序号忽略、缺口/溢出要求刷新快照，只有正式终态事件报告ended；网络结束报告offline，不修改任务。30秒不读自动释放，单次read最多等待20秒，解除订阅/窗口销毁/渲染进程退出释放连接与未完成请求。订阅ID为随机UUID，并绑定窗口、当前连接实例和任务。自动重连在后续卡接入。

当前已接入真实会话界面：新建/选择会话、消息和任务历史分页、模拟任务提交、进度与证据记录。分页每页20条，可读更早记录或返回最近；服务端历史保留，界面不一次加载全部。草稿按会话保存在当前窗口内存，任务忙碌时可以编辑但不能重复提交，关闭应用后不承诺恢复未发送草稿。HTTP结果未确认时保留草稿及同内容幂等键，用户先刷新记录核对，界面不自动重发。

同会话“继续排查”使用服务端授权历史，最多最近8条、每条2000字符、总计8000字符。新会话不混入旧会话，明确新问题优先；当前仍为四类确定性mock，不声称接入真实模型。任务状态、最终回复、证据来源/采集时间与故障恢复状态分别展示。取消、核对恢复及自动重连接下来接入。

窗口启用 contextIsolation、sandbox、webSecurity，关闭 nodeIntegration 和 webview，拒绝新窗口、导航及权限请求。构建界面 CSP 禁止直接网络；仅 Vite 开发态允许本源模块、样式注入和回环 HMR WebSocket。开发加载地址只允许回环 HTTP 根路径，打包后拒绝开发地址。

验证：

```text
node node_modules/typescript/bin/tsc --noEmit -p apps/desktop/tsconfig.json
node node_modules/typescript/bin/tsc --noEmit -p apps/desktop/tsconfig.renderer.json
node scripts/check_ts_boundaries.ts
npm run desktop:test
npm run desktop:smoke -- .quality-reports/desktop-built
npm run desktop:smoke -- .quality-reports/desktop-managed --managed
npm run desktop:smoke -- .quality-reports/desktop-business --managed --business
npm run desktop:smoke -- .quality-reports/desktop-dev --dev
python scripts/check.py
node apps/desktop/scripts/verify-connection.mjs .quality-reports/connection-integration
node apps/desktop/scripts/verify-connection.mjs .quality-reports/connection-dev --dev
node apps/desktop/scripts/verify-workspace.mjs .quality-reports/workspace-integration
```

smoke 测试在真实 Electron 内导入正式主入口，探测渲染、权限设置和桥接范围，保存 desktop.png 与 runtime.json，并验证关闭窗口后进程正常退出。每次使用隔离 userData，结束后清理；--managed 强制走自动服务入口，--business通过正式沙箱preload执行隔离模拟任务、事件和历史检查，尚不等同业务界面按钮验收。测试需要桌面会话与允许启动 Electron 的环境，不能用浏览器截图替代。Windows 故障测试需要允许回收测试创建的进程树。构建验证不包含随包 Python、托盘或安装包。

连接集成脚本启动隔离 Python local/server 开发进程，分别验证就绪与离线，并使用明确的 426 夹具验证不兼容界面。脚本会终止自己启动的 Python 进程，不代表生产退出策略验收。HTTP 运行时校验器更新使用 `npm run contracts:validators`；契约检查也会拒绝生成器漂移。生成方式依据 [Ajv standalone](https://ajv.js.org/standalone)。

workspace集成在真实Electron里操作正式React表单与按钮，先验证模拟诊断、忙碌草稿、追问和会话隔离，再用正式受保护API准备超过一页的隔离历史，点击三种分页入口；完整退出Electron与本机服务后，以同一隔离userData再次启动，验证消息和证据。保存create/reopen运行记录与实际截图，结束清理隔离数据，不复用用户数据库。

实现依据：[Electron 安全建议](https://www.electronjs.org/docs/latest/tutorial/security)、[Vite 开发与构建](https://vite.dev/guide/)。

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

源码目录分别是 main、preload、renderer、shared。根 tsconfig 覆盖全部实际 TS 源码，renderer 的独立配置排除 Node 类型；主进程和 preload 编译为 CommonJS 以兼容沙箱 preload。当前桥接只暴露同步 getInfo，不提供 IPC、网络、文件或 shell 方法。连接读取在下一切片接入。

窗口启用 contextIsolation、sandbox、webSecurity，关闭 nodeIntegration 和 webview，拒绝新窗口、导航及权限请求。构建界面 CSP 禁止直接网络；仅 Vite 开发态允许本源模块、样式注入和回环 HMR WebSocket。开发加载地址只允许回环 HTTP 根路径，打包后拒绝开发地址。

验证：

```text
node node_modules/typescript/bin/tsc --noEmit -p apps/desktop/tsconfig.json
node node_modules/typescript/bin/tsc --noEmit -p apps/desktop/tsconfig.renderer.json
node scripts/check_ts_boundaries.ts
npm run desktop:smoke -- .quality-reports/desktop-built
npm run desktop:smoke -- .quality-reports/desktop-dev --dev
python scripts/check.py
```

smoke 测试在真实 Electron 内导入正式主入口，探测渲染、权限设置和桥接范围，保存 screenshot 与 runtime.json，并验证关闭窗口后进程正常退出。测试需要桌面会话与允许启动 Electron 的环境，不能用浏览器截图替代。构建验证不包含随包 Python、自动服务启动、托盘、诊断任务、安装包或 CI。

实现依据：[Electron 安全建议](https://www.electronjs.org/docs/latest/tutorial/security)、[Vite 开发与构建](https://vite.dev/guide/)。

# M1 T04 桌面开发骨架

关联 REQ-001、HAR-003、HAR-005。依赖 M1-T01。状态见 [任务清单](tasks.json)。

建立 Electron、React、TypeScript 和 CSS 的开发骨架，明确 main、preload、renderer 与 shared 目录。创建基础窗口，构建脚本和生命周期可重复运行。

验收标准：

- M1-T04-AC01：Windows 开发环境能打开 React 基础窗口，记录运行版本、步骤与截图或等效界面证据。
- M1-T04-AC02：启用隔离与沙箱，关闭界面 Node 集成；界面没有通用 shell 或任意文件访问能力。
- M1-T04-AC03：`apps/desktop/tsconfig.json` 覆盖实际主进程、桥接、界面与共享类型；产品类型与边界检查通过。

正式安装包、托盘任务流程和完整排查界面仍在 M3 验收；本卡完成不代表干净电脑安装要求已满足。

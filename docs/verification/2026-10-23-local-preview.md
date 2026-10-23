# 最新界面本地预览构建

2026-10-23，用户要求编译本地版本验证已确认的界面。作为 M3-T08 界面交付与 M3-T06 打包能力的后续构建记录，关联 REQ-001、REQ-002、REQ-021、HAR-005、HAR-008、HAR-010；不改变 M3-T07 的干净 Windows 验收状态。

## 产物与来源

- Windows 11 10.0.26200、AMD64 开发机；Electron 44.8.0，Python 3.13.2，PyInstaller 6.22.3。
- 界面来源提交 `5c9b047f12e6e74855718714bd1f289a094fa90b`，加本轮打包脚本改动；构建清单如实记录 `worktree_dirty: true`。本轮不改产品界面或服务业务。
- 构建命令：`npm run desktop:package -- .quality-reports/local-preview-20261023`，退出 0。
- 免安装入口：仓库下 `.quality-reports/local-preview-20261023/win-unpacked/ProdOps Dev.exe`；需保留整个目录。
- 安装入口：仓库下 `.quality-reports/local-preview-20261023/ProdOps-Dev-0.1.0-windows-x64-setup.exe`，109649049 字节，未签名、未发布。
- 安装包 SHA-256：`644b30d0a6da42a6e889411a10dc77dc8612e6a89df4e34bf323ba5fadbffb9f`；重新计算与[构建清单](2026-10-23-local-preview/build-manifest.json)及[校验文件](2026-10-23-local-preview/ProdOps-Dev-0.1.0-windows-x64-setup.exe.sha256)一致。清单包括四维 SVG 源文件。

## 实际验证

执行：

```text
node apps/desktop/scripts/verify-installed.mjs .quality-reports/local-preview-runtime run .quality-reports/local-preview-20261023/ProdOps-Dev-0.1.0-windows-x64-setup.exe .quality-reports/local-preview-20261023/win-unpacked
```

退出 0；[运行回执](2026-10-23-local-preview/summary.json)明确标记 `package_kind: unpacked-directory`。实际从随包 ASAR 加载沙箱界面，使用随包 Python 服务、独立测试 userData 和 SQLite；从空工作目录启动，子进程 PATH 不包含开发 Node/Python。提交“相机掉线”后任务成功、两条消息与三条模拟证据可读；整个应用和服务退出再重开，读取同一会话、任务与证据。两次退出均为 0，各自服务 PID 已消失。Node 全局不可见，非法退出参数被拒绝。没有接触用户历史、真实模型、工厂服务器或设备。

[实际截图](2026-10-23-local-preview/create.png)已目视检查：灰色导航、圆形 Logo、模型入口、明确模拟和证据可读。探针将结果滚入视野，截图不包含顶部菜单，不替代既有 T08 标题栏验收。

脚本语法检查及 `git diff --check` 通过。输出路径越过 `.quality-reports` 和多余参数均在构建前被拒绝；本次增加可选输出目录，供保留运行中的旧版并构建新版。验证脚本增加未安装目录入口，报告区分安装版与未安装目录，既有默认安装验收参数保持兼容。

## 失败与边界

首次使用默认输出目录构建时，旧版程序仍占用 `installers/win-unpacked/resources`，打包报 EBUSY；没有强制结束用户应用，后改独立目录完整构建成功。原目录不作为本次交付入口。构建出现既有 Conda 元数据及可选 tzdata、pysqlite2、MySQLdb 缺失警告；随包 SQLite、任务和重开通过，不据此承诺所有环境兼容。

源码目录和开发运行时目录本次未移动，回执中的 `source_isolation.unavailable` 均为 false。本轮验证未安装目录运行，未安装或升级此新安装包，也未在独立干净 Windows 验证，不把它标记为 M3-T07 通过。真实模型、密钥管理、服务器登录与连接切换仍未接入。

## 自查

方式 `self_review`，由实现代理完成，不是独立审查。检查输出目录限制、仅本地构建且 `--publish never`、校验文件、实际包运行与服务进程身份、验证目录和用户资料隔离；本次范围内无未处理发现。安装包及完整程序目录保留在忽略的 `.quality-reports`，不提交二进制或进行外部发布。交付文档检查报告保存在同名目录的 `docs-checks.json`。

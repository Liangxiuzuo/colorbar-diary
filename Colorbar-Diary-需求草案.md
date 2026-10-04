# GitHub 发布准备记录

## 发布内容

README 的核心定位：一个独立 HTML 可视化界面加唯一一个 Markdown 日记主数据文件；浏览器偏好为辅助数据，背景图片与主动备份单独保存。

只复制了 public 源码、Node 开发服务器与数据入口、构建脚本、通用核心测试。新增英中界面、便携 UI 测试、英文 README、中文说明与发布检查。

未复制：原 data、dist 中的日记、archives、research、原 pics、原需求草案聊天记录、测试运行目录、个人照片、旧 Markdown 备份、演示文稿、电脑专用启动脚本。

## 发布状态

- 已创建公开仓库 https://github.com/Liangxiuzuo/colorbar-diary，并发布 v0.1.0；发布页 https://github.com/Liangxiuzuo/colorbar-diary/releases/tag/v0.1.0。
- 已按用户补充的发布计划采用 MIT 许可证。
- 首次正式发布版本为 v0.1.0；自动构建号独立保留，当前对应 build 4。

- 五个发布附件的 GitHub SHA-256 与本地文件逐一核对一致。

## 更新日记

### 2026-10-04

用户要求保留原测试版并隔离 GitHub 工作；已在 github_version 整理候选发布内容，默认英文并可切换中文，独立端口与浏览器偏好。完成核心测试、语言切换与正文不变验证；原源码哈希保持一致，未上传。

用户要求继续英文 README 并增加 Mermaid 架构图；已完善使用、数据文件、开发验证、限制与贡献说明，添加运行架构及构建／语言流程两张图，源文件保存至 docs/architecture.mmd 和 docs/build-flow.mmd。仅修改 github_version 文档，未上传 GitHub、未决定许可证。

用户询问 GitHub 候选版 v4 与原测试版 v9 的差异；已核对两个 releases.json，说明隔离目录重新累计构建号，v4 并非回退到旧功能版本。正式发布建议采用独立且明确的版本命名，目前未改版本号。

用户要求 README 突出一个 HTML 界面与唯一一个 Markdown 内容数据文件；已改写英文标题及开篇，保留 Highlights 原第 1、2 条并删除其余 4 条，其他使用说明和架构图保留。仅修改 GitHub 隔离目录。

用户要求继续原计划第 3、4、5 条；当前可见记录与发布清单未包含这三条的具体内容，待用户补充原条目后执行，尚未上传或变更许可证。

用户补充原发布计划并要求执行第 3、4、5 条；已准备 v0.1.0 发布包（对应 build 4）、校验值、MIT 许可证、贡献及更新文档，核心测试和隔离浏览器验证通过。日记文件已保留在不发布的本地隔离目录，原测试版源码未变；GitHub CLI 已校验安装，待用户完成浏览器授权后创建仓库并上传，尚未发布。

用户确认完成 GitHub 授权，并告知额度已重置；已创建公开仓库 Liangxiuzuo/colorbar-diary、推送隔离源码并正式发布 v0.1.0，五个附件校验值一致。仅更新 github_version，原测试版未改动。

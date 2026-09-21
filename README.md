# KCode

<div align="center">
  <img src="public/logo/kcode-app-icon.png" alt="KCode" width="128" height="128" />
</div>
<p align="center">
  简体中文 | <a href="README.en.md">English</a>
</p>

<p align="center">
  <a href="https://linux.do"><img src="https://img.shields.io/badge/LINUX-DO-ffb000?style=for-the-badge&labelColor=24292f" alt="LINUX DO" /></a>
</p>
<p align="center">
  <a href="https://kcode.wiki"><img src="https://img.shields.io/badge/Website-kcode.wiki-111111" alt="Website" /></a>
  <a href="https://github.com/7836246/kcode/releases/latest"><img src="https://img.shields.io/github/v/release/7836246/kcode?label=Release" alt="Release" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache--2.0-green" alt="License" /></a>
  <a href="https://github.com/7836246/kcode/stargazers"><img src="https://img.shields.io/github/stars/7836246/kcode" alt="Stars" /></a>
</p>
<p align="center">
  <img src="https://img.shields.io/badge/macOS-000000?logo=apple&logoColor=white" alt="macOS" />
  <img src="https://img.shields.io/badge/Windows-0078D6?logo=windows&logoColor=white" alt="Windows" />
  <img src="https://img.shields.io/badge/Linux-FCC624?logo=linux&logoColor=black" alt="Linux" />
</p>

<div align="center">
  <img src="public/screenshots/kcode-hero.png" alt="KCode" width="920" />
</div>

**KCode** 是开源 AI 编程工作台，提供桌面应用、浏览器界面和终端 Agent。自行配置模型供应商即可使用。

## 上游

相对 [ZCode](https://github.com/zai-org/ZCode) 公开源码，KCode 主要改了这些：

- 产品名、图标、命令和环境变量统一为 KCode
- 去掉智谱 / Z.ai 登录、OAuth、套餐和升级实现，改为自行配置供应商
- 官方插件市场改为仓库内置目录，不再拉取 Z.ai CDN
- 内置插件创建器；设置里可开关并编辑自定义系统角色
- 批准菜单和计划模式的交互按本仓库的产品规则收口

## 免责声明

本项目仅供学习参考，不保证可用性与安全性，也不提供任何官方服务。

## 许可

Apache-2.0。源码来自上游 [ZCode](https://github.com/zai-org/ZCode)，版权归 Z.AI Co., Ltd。功能边界、执行风险、数据与第三方版权见 [NOTICE.md](NOTICE.md)。

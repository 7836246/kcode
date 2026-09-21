# 官方市场本地目录

## 行为

商店官方市场 `kcode-plugins-official` 只由应用内置播种维护，不再拉取任何远端目录。

- 公开分段只展示 Builtin Plugin
- 官方市场没有默认 CDN / git / URL source
- Catalog Auto-Refresh 不对官方市场发起网络请求
- Manual Refresh 跳过官方市场；个人来源仍按原 source 刷新
- 已落盘的退役 Z.ai CDN source 与 `cdn-marketplace.json` 分片在 ensure 时改写/删除，不继续混入公开目录
- 后续自建仓库通过 Personal Source（git / GitHub / URL / 本地目录）添加，不占用官方市场 id

## 所有者

`ensureDefaultPluginMarketplaces` 是官方 known record 的唯一写入入口：缺失时登记 bundled source，已有远端 source 时改写成 bundled 并清掉刷新失败。

`rebuildOfficialMarketplaceSync` 是官方合并目录的唯一写入入口，只读 bundled 分片。

`updateMarketplace` 对官方 id 直接跳过，不走 `addMarketplace` 的远端拉取。

## 验收

- 新安装的 `known_marketplaces.json` 官方记录 source 为 `{ source: "bundled" }`
- 旧记录若仍指向 `cdn-zcode.z.ai/.../official-plugin/marketplace.json`，下次 ensure 后改为 bundled，且公开目录不再出现 CDN 插件
- 进入商店页或点顶栏刷新都不会请求 Z.ai 官方目录
- 用户仍可添加个人 git/URL 市场，供后续自建仓库接入

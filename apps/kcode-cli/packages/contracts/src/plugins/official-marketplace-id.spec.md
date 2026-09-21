# 官方市场 id 别名

## 行为

商店官方市场的规范 id 是 `kcode-plugins-official`。上游 CDN 仍可能返回 `zcode-plugins-official`。

- `zcode-plugins-official` 只是遗留别名，解析后必须写成规范 id
- `isOfficialMarketplaceId` 对规范 id 和遗留别名都为真
- 用户不能再添加一个叫遗留官方 id 的个人市场
- 官方刷新收到遗留 id 时改名入库，不把原始英文校验错误抛到商店页

## 所有者

`normalizeOfficialMarketplaceId` 是唯一改写入口。目录解析在 `parseMarketplaceManifest` 里调用它；官方分片写入前 `assertOfficialManifest` 再核对一次。

## 验收

- CDN 返回 `name: zcode-plugins-official` 时，商店不再出现 Official marketplace source must provide… 红条
- 合并后的官方目录 id 仍是 `kcode-plugins-official`
- 把遗留官方 id 当个人来源添加会被拒绝

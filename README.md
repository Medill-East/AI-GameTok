# GameTok

面向游戏从业者的行业版“抖音” Web MVP。产品核心是高信息密度视频切片流，支持站内续播原视频、收藏、分享，以及一个基础运营后台。

## 已实现

- 竖版全屏切片流首页 `/`
- 分类频道页 `/channel/[slug]`
- 切片详情页 `/clip/[id]`
- 原视频续看页 `/video/[id]`
- 本地收藏页 `/saved`
- 运营后台 `/admin`
- 视频审核编辑页 `/admin/videos/[id]`
- 本地 JSON 数据层与 API 路由
- 白名单频道同步接口 `POST /api/admin/sync/run`

## 技术栈

- Next.js 16
- TypeScript
- Tailwind CSS 4
- App Router + Route Handlers
- 本地文件存储 `data/store.json`

## 启动

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 数据与同步

- 当前仓库内置了 `GDC / GMTK / Noclip` 三个白名单频道的种子内容。
- `sync` 接口会把 `lib/demo-catalog.ts` 中的额外视频增量导入到 `data/store.json`。
- 这是一个稳定可演示版本：同步和 AI 切片结果目前使用内置 demo catalog，而不是直接请求 YouTube Data API / 字幕服务 / 大模型。

如果你要把它升级成真实线上版本，优先替换这三层：

1. `lib/demo-catalog.ts`：接入真实频道同步源。
2. `lib/sync.ts`：接入真实字幕抓取与切片生成。
3. `lib/store.ts`：把本地 JSON 存储替换成数据库。

## 验证

```bash
npm run lint
npm run build
```

## iPhone Testing

Use the LAN-accessible dev server for real-device Safari testing:

```bash
npm run dev:iphone
```

Open these URLs:

- Local browser: `http://127.0.0.1:3010`
- iPhone Safari on the same Wi-Fi: `http://192.168.31.105:3010`

Recommended checks:

1. Load the feed in Safari and verify the first clip starts normally.
2. Tap the global sound toggle and confirm playback position does not reset.
3. Swipe to the next clip and confirm the sound preference is preserved.
4. Tap `继续看` and confirm in-site resume playback works.
5. Tap `去 YouTube 继续看` and confirm the handoff opens at the expected timestamp.

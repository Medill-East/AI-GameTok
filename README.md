# GameTok

面向游戏从业者的高质量行业视频聚合与学习平台。当前版本的核心不是“自托管第三方短视频”，而是：

- 聚合公开优质频道
- 生成摘要、标签和关键片段索引
- 支持站内预览与站内续看
- 在需要时无缝跳转到原平台继续消费长视频

## 当前能力

- 首页发现流 `/`
- 频道页 `/channel/[slug]`
- 关键片段详情页 `/clip/[id]`
- 原视频续看页 `/video/[id]`
- 搜索页 `/search`
- 本地收藏页 `/saved`
- 目录与审核后台 `/admin`
- 本地 JSON 演示数据与 API 路由

## 产品边界

当前公开版本默认遵循以下边界：

- 不自托管第三方完整视频
- 不把第三方公开视频默认切成自家可播短视频
- 公开第三方内容以 `元数据 + 摘要 + 关键片段索引 + 官方嵌入/跳转` 为主
- 遇到 YouTube 嵌入不稳定时，优先引导用户站内续看或回原平台继续看

这意味着当前版本更接近“高质量行业视频聚合器”，而不是已经完成授权链路的短视频平台。

## 技术栈

- Next.js 16
- TypeScript
- Tailwind CSS 4
- App Router + Route Handlers
- 本地文件存储 `data/store.json`

## 本地启动

```bash
npm install
npm run dev
```

默认访问：

- [http://localhost:3000](http://localhost:3000)

## iPhone 局域网测试

```bash
npm run dev:iphone
```

访问地址：

- 本机浏览器：`http://127.0.0.1:3010`
- 同一 Wi-Fi 下的 iPhone Safari：`http://192.168.31.105:3010`

## 线上预览

当前已部署只读预览版：

- [https://gametok-one.vercel.app](https://gametok-one.vercel.app)

推荐测试方式：

1. 在 iPhone Safari 中打开线上地址
2. 点击分享
3. 选择“添加到主屏幕”
4. 从主屏幕以 standalone 模式启动

## 数据与同步

当前仓库内置了白名单频道的演示数据快照，并支持本地同步脚本更新：

- GDC
- Game Maker's Toolkit
- Noclip
- Masahiro Sakurai
- AI and Games
- Extra Credits
- People Make Games

注意：

- 当前同步和关键片段生成仍是演示版流程
- 线上预览环境默认是只读模式
- 真正可运营版本下一步应先替换 `data/store.json` 为正式数据库

## 验证

```bash
npm run lint
npm run build
```

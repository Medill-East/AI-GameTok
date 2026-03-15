# GameTok

GameTok 是一个面向游戏从业者的高质量行业视频聚合与学习平台。当前公开版本的重点不是“自托管第三方短视频”，而是：

- 聚合公开的高质量游戏行业频道
- 生成摘要、标签和关键片段索引
- 支持站内预览、站内续看和跳转原平台
- 在需要时优雅回退到 YouTube 原视频

## 当前产品边界

公开版本默认遵循以下边界：

- 不自托管第三方完整视频
- 不把第三方公开视频默认切成自家可播短视频
- 公开第三方内容以 `元数据 + 摘要 + 关键片段索引 + 官方嵌入/跳转` 为主
- 遇到 YouTube 内嵌不稳定时，优先引导用户站内续看或回原平台继续观看

## 路由

- `/`：首页发现流
- `/channel/[slug]`：频道流
- `/clip/[id]`：关键片段详情
- `/video/[id]`：原视频续看页
- `/search`：搜索
- `/saved`：本地收藏
- `/admin`：内部运营后台

## 技术栈

- Next.js 16
- TypeScript
- Tailwind CSS 4
- App Router + Route Handlers
- Supabase / Postgres
- Vercel Cron

## 部署模式

当前项目按两套环境运行：

### 1. 公开前台项目

- 项目名：`gametok`
- 对外提供聚合器前台
- 后台入口隐藏
- 写接口只读

### 2. 内部运营项目

- 项目名：`gametok-internal`
- 提供内部运营后台
- 无应用内登录，但必须依赖 Vercel 部署保护或团队可见性
- 写入、同步、重建索引和重跑关键片段都走正式数据库

## 环境变量

见 [`.env.example`](/D:/AI/codex/gametok/.env.example)。

关键变量：

- `DATABASE_URL`
- `POSTGRES_URL`
- `SUPABASE_DB_URL`
- `GAMETOK_READ_ONLY_PREVIEW`
- `GAMETOK_INTERNAL_ADMIN`
- `CRON_SECRET`
- `YOUTUBE_CLIENT_ID`
- `YOUTUBE_REDIRECT_URI`

推荐配置：

### 公开前台

```bash
GAMETOK_READ_ONLY_PREVIEW=1
GAMETOK_INTERNAL_ADMIN=0
```

### 内部运营

```bash
GAMETOK_READ_ONLY_PREVIEW=0
GAMETOK_INTERNAL_ADMIN=1
```

## 数据库初始化

当前项目已经支持显式数据库导入，不需要只依赖“首次访问自动 seed”。

```bash
npm run db:bootstrap
```

这个命令会：

1. 创建所需表结构
2. 从 `data/store.json` 导入首轮快照
3. 校验导入后的频道、视频、片段和字幕数量

运行前需要先配置数据库连接串。

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
- 同一 Wi-Fi 下的 iPhone Safari：`http://你的局域网IP:3010`

## 线上预览

当前公开预览地址：

- [https://gametok-one.vercel.app](https://gametok-one.vercel.app)

推荐测试方式：

1. 在 iPhone Safari 中打开线上地址
2. 点击分享
3. 选择“添加到主屏幕”
4. 从主屏幕以 standalone 方式启动

## 自动同步

仓库包含一个 Vercel Cron 配置：

- `GET /api/internal/cron/sync`

注意：

- 该路由要求 `CRON_SECRET`
- 自动同步结果会写入 `sync_runs`
- 同步仍以公开第三方频道的聚合与关键片段索引为主
- 建议只在 `gametok-internal` 项目启用

## 当前白名单频道

- GDC
- Game Maker's Toolkit
- Noclip
- Masahiro Sakurai
- AI and Games
- Extra Credits
- People Make Games

## 验证

```bash
npm run lint
npm run build
```

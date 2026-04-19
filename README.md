# 求职申请管理看板

Vue 3 + Express + PostgreSQL 的求职申请管理看板。当前版本包含：

- 邮箱/密码注册与登录
- Argon2id 密码哈希
- httpOnly Cookie Session
- PostgreSQL 持久化
- 用户级数据隔离
- 看板拖拽、统计、截止日期提醒

## 本地运行

1. 安装依赖

```bash
npm install
```

2. 配置环境变量

复制 `.env.example` 为 `.env`，填写 `DATABASE_URL` 和足够长的 `SESSION_SECRET`。

3. 启动后端

```bash
npm run server:dev
```

首次启动会自动执行 `server/db/schema.sql` 建表。

4. 启动前端

```bash
npm run dev
```

前端开发服务器会把 `/api` 代理到 `http://localhost:3001`。

## 上线建议

- 前端：Vercel / Netlify
- 后端：Render / Railway / Fly.io
- 数据库：Neon / Supabase / Railway PostgreSQL

生产环境需要设置：

```text
NODE_ENV=production
DATABASE_URL=...
SESSION_SECRET=...
CLIENT_ORIGIN=https://your-frontend-domain.example
COOKIE_SAME_SITE=none
```

前端部署时设置：

```text
VITE_API_BASE_URL=https://your-api-domain.example
```

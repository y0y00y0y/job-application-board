# CLAUDE.md · 项目记忆文件

> 本文件供 Claude Code 在后续对话中快速恢复项目上下文，请勿手动大幅修改。

---

## 项目基本信息

| 字段 | 值 |
| --- | --- |
| 项目名称 | 求职申请管理看板 |
| 项目路径 | `F:\01Personal\美团\` |
| 产品文档 | `F:\01Personal\美团\PRD.md` |
| 创建日期 | 2026-04-19 |
| 当前阶段 | 全栈 MVP 开发中（前端看板已实现，正在接入登录认证与 PostgreSQL 后端） |

---

## 产品目标

帮助在校大学生在求职季以看板形式可视化管理多条并行申请线，核心解决三个痛点：

1. 申请状态分散难追踪 → Kanban 看板统一视图
2. 截止日期容易遗漏 → 倒计时徽章 + 紧急 Banner
3. 整体漏斗不清晰 → 数据统计面板

---

## 技术栈

| 层次     | 选型                                          | 版本约束 |
| -------- | --------------------------------------------- | -------- |
| 框架     | Vue 3 (Composition API + `<script setup>`)    | ^3.4     |
| 构建     | Vite                                          | ^5.0     |
| 状态管理 | Pinia                                         | ^2.0     |
| 拖拽     | vuedraggable@next                             | ^4.1     |
| 后端     | Express REST API                              | ^4.21    |
| 数据库   | PostgreSQL                                    | —        |
| 认证     | httpOnly Cookie Session + Argon2id 密码哈希   | —        |
| 样式     | 原生 CSS + CSS Variables                      | —        |
| 包管理   | npm                                           | —        |

**无后端、无数据库、无 UI 组件库**（Ant Design / Element Plus 等均不引入）。

---

## 目录结构约定

```text
F:\01Personal\美团\
├── CLAUDE.md
├── PRD.md
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── main.js
    ├── App.vue
    ├── assets/
    │   └── main.css
    ├── stores/
    │   └── applications.js
    └── components/
        ├── UrgentBanner.vue
        ├── AppHeader.vue
        ├── StatsPanel.vue
        ├── KanbanBoard.vue
        ├── KanbanColumn.vue
        ├── ApplicationCard.vue
        ├── DeadlineBadge.vue
        └── ApplicationModal.vue
```

---

## 数据层约定

- 前端不再直接写 localStorage，统一通过 `/api/*` 调用后端。
- 后端以 PostgreSQL 为唯一持久化数据源。
- 用户注册后写入 10 条预置示例数据，所有申请记录绑定 `user_id`。
- 登录态使用 httpOnly Cookie Session，密码只存 Argon2id 哈希。

---

## 代码规范

### Vue 组件

- 统一使用 `<script setup>` 语法
- Props 使用对象描述符，明确 type / required / default
- Emits 使用 `defineEmits()`
- 组件文件名：PascalCase（`ApplicationCard.vue`）
- 每个组件专注单一职责，超过 200 行考虑拆分

### CSS

- 所有颜色、间距、字号通过 CSS Variables 引用，禁止硬编码色值
- BEM 命名：`.kanban-column__header`、`.card--urgent`
- 不引入任何 CSS 框架（Tailwind、Bootstrap 等）

### JavaScript

- 使用 ES2022+，禁止 `var`
- 函数优先纯函数，副作用（localStorage）集中在 store
- 日期计算统一用原生 `Date`，不引入 dayjs/moment

### 命名约定

- 变量/函数：camelCase
- 组件：PascalCase
- CSS class：kebab-case
- Store action：动词开头（`createApplication`、`moveToStage`）
- 常量：UPPER_SNAKE_CASE

---

## 关键约束

1. **后端持久化**：上线版本使用 Express + PostgreSQL，不再依赖 localStorage 保存核心数据
2. **零 UI 库**：样式完全手写，体现设计能力
3. **单数据源**：PostgreSQL 是最终数据源，Pinia 只缓存接口结果
4. **用户隔离**：所有申请查询/修改必须带登录态，并按 `user_id` 过滤
5. **安全认证**：密码哈希、登录限流、httpOnly Cookie、CORS 白名单为必备项
6. **文件大小**：单文件不超过 300 行，超出须拆分

---

## 偏好与约定

- 技术栈：Vue 3 + Vite（用户明确选择，不更改）
- UI 风格：简洁亮色系（白底，蓝色主色，彩色状态标签）
- 示例数据：10 条真实感中国互联网公司数据（华为/字节/腾讯/阿里/美团等）
- 讨论优先：有架构分歧先讨论，确认后再动笔
- 产出文档：PRD → Schema → OpenAPI → 代码

---

## 部署方案

- **平台**：Vercel（连接 GitHub 仓库，自动识别 Vite，一键部署）
- **产物**：`npm run build` → `dist/`，Vercel 托管静态文件
- **访问形式**：`https://xxx.vercel.app`（提交链接）
- **配置**：`vite.config.js` 中设置 `base: './'` 保证相对路径正确

---

## 接口设计约定

- **本期实现**：localStorage（Pinia store 直接读写）
- **接口文档**：`docs/openapi.yaml`（OpenAPI 3.0 YAML 格式）
- **设计原则**：store actions 语义对齐 REST 接口，未来换后端只改数据层

| REST 接口                       | Store Action                   |
| ------------------------------- | ------------------------------ |
| `GET /applications`             | `fetchApplications()`          |
| `POST /applications`            | `createApplication(payload)`   |
| `GET /applications/:id`         | `getById(id)`                  |
| `PATCH /applications/:id`       | `updateApplication(id, patch)` |
| `DELETE /applications/:id`      | `deleteApplication(id)`        |
| `PATCH /applications/:id/stage` | `moveToStage(id, stage)`       |
| `GET /stats`                    | `stats`（getter）              |

---

## 代码审查约定

每个模块写完后以资深后端工程师视角自审：

- 边界条件（空数组、非法 id、缺字段）
- 数据一致性（操作后 localStorage 与 state 同步）
- 函数职责单一（action 不做 UI 逻辑）
- 错误路径显式处理（不静默吞掉）

---

## 文档结构

```text
F:\01Personal\美团\
├── CLAUDE.md
├── PRD.md
└── docs/
    ├── schema.md
    └── openapi.yaml
```

---

## 版本历史

| 日期 | 变更 |
| --- | --- |
| 2026-04-19 | 初始化：完成 PRD、技术方案选型、CLAUDE.md |
| 2026-04-19 | 确认部署方案（Vercel）、接口文档格式（OpenAPI 3.0）、代码审查约定 |
| 2026-04-19 | 升级目标：按上线版本接入登录认证、Express API 与 PostgreSQL |

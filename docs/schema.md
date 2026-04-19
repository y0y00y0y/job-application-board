# 数据结构设计 · localStorage Schema

**版本** v1.0
**日期** 2026-04-19
**存储介质** `window.localStorage`

---

## 一、存储概览

| Key | 类型 | 说明 |
| --- | --- | --- |
| `job-board-applications` | `Application[]`（JSON 序列化） | 全部申请记录 |

应用启动时执行以下逻辑：

```text
if localStorage.getItem('job-board-applications') === null:
    localStorage.setItem('job-board-applications', JSON.stringify(SEED_DATA))
else:
    applications = JSON.parse(localStorage.getItem('job-board-applications'))
```

每次 Pinia state 变化后，`watch(applications, save, { deep: true })` 自动持久化。

---

## 二、核心实体：Application

### 2.1 字段定义

| 字段 | 类型 | 必填 | 约束 | 说明 |
| --- | --- | --- | --- | --- |
| `id` | `string` | ✅ | UUID v4，全局唯一，不可修改 | 主键 |
| `company` | `string` | ✅ | 1–50 字符，trim 后不为空 | 公司名称 |
| `position` | `string` | ✅ | 1–100 字符，trim 后不为空 | 申请岗位 |
| `stage` | `StageEnum` | ✅ | 枚举值，见 2.2 | 当前申请阶段 |
| `priority` | `PriorityEnum` | ✅ | 枚举值，见 2.3 | 优先级 |
| `applyDate` | `string` | ✅ | ISO 8601 日期，`YYYY-MM-DD` | 投递日期 |
| `deadline` | `string \| null` | ❌ | ISO 8601 日期或 `null` | 截止日期 |
| `link` | `string \| null` | ❌ | 合法 URL 或 `null` | 招聘原链接 |
| `notes` | `string` | ❌ | 最大 500 字符，默认空字符串 | 备注（面试官/地点等） |
| `createdAt` | `string` | ✅ | ISO 8601 时间戳，创建时写入，不可修改 | 创建时间 |
| `updatedAt` | `string` | ✅ | ISO 8601 时间戳，每次更新时刷新 | 最后修改时间 |

### 2.2 StageEnum

```text
applied   → 已投递
test      → 笔试中
interview → 面试中
offer     → 已拿 Offer
rejected  → 已拒绝
```

状态流转建议（非强制，拖拽可自由跨列）：

```text
applied → test → interview → offer
                           ↘ rejected
```

### 2.3 PriorityEnum

```text
high   → 高优先级（红色标识）
medium → 中优先级（黄色标识）
low    → 低优先级（灰色标识）
```

---

## 三、完整 JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Application",
  "type": "object",
  "required": ["id", "company", "position", "stage", "priority", "applyDate", "createdAt", "updatedAt"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "UUID v4，全局唯一主键"
    },
    "company": {
      "type": "string",
      "minLength": 1,
      "maxLength": 50,
      "description": "公司名称"
    },
    "position": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "description": "申请岗位"
    },
    "stage": {
      "type": "string",
      "enum": ["applied", "test", "interview", "offer", "rejected"],
      "description": "当前申请阶段"
    },
    "priority": {
      "type": "string",
      "enum": ["high", "medium", "low"],
      "description": "优先级"
    },
    "applyDate": {
      "type": "string",
      "pattern": "^\\d{4}-\\d{2}-\\d{2}$",
      "description": "投递日期，格式 YYYY-MM-DD"
    },
    "deadline": {
      "type": ["string", "null"],
      "pattern": "^\\d{4}-\\d{2}-\\d{2}$",
      "description": "截止日期，格式 YYYY-MM-DD，无则为 null"
    },
    "link": {
      "type": ["string", "null"],
      "format": "uri",
      "description": "招聘链接，无则为 null"
    },
    "notes": {
      "type": "string",
      "maxLength": 500,
      "default": "",
      "description": "备注"
    },
    "createdAt": {
      "type": "string",
      "format": "date-time",
      "description": "创建时间，ISO 8601"
    },
    "updatedAt": {
      "type": "string",
      "format": "date-time",
      "description": "最后修改时间，ISO 8601"
    }
  },
  "additionalProperties": false
}
```

---

## 四、示例记录

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "company": "字节跳动",
  "position": "算法工程师",
  "stage": "interview",
  "priority": "high",
  "applyDate": "2026-04-10",
  "deadline": "2026-04-22",
  "link": "https://jobs.bytedance.com/campus/position/123",
  "notes": "三面，面试官：李工，地点：北京望京园区 B 座",
  "createdAt": "2026-04-10T09:00:00.000Z",
  "updatedAt": "2026-04-18T14:30:00.000Z"
}
```

---

## 五、衍生计算（非持久化，由 Pinia Getter 实时计算）

以下字段**不存入 localStorage**，每次由 getter 实时派生：

| 派生字段 | 计算方式 | 用途 |
| --- | --- | --- |
| `daysUntilDeadline` | `deadline` 与今日差值（天） | DeadlineBadge 显示 |
| `urgencyLevel` | `expired / urgent / warning / safe / none` | 卡片样式 |
| `byStage` | `Record<StageEnum, Application[]>` | 看板列数据 |
| `stats.total` | `applications.length` | 统计面板 |
| `stats.interviewRate` | `(interview+offer) / total` | 统计面板 |
| `stats.offerCount` | `filter(stage==='offer').length` | 统计面板 |
| `stats.urgentCount` | `filter(daysUntilDeadline<=7 && stage!=='rejected').length` | 统计面板 |

### urgencyLevel 判定逻辑

```text
deadline === null          → 'none'
daysUntilDeadline < 0      → 'expired'
daysUntilDeadline <= 3     → 'urgent'
daysUntilDeadline <= 7     → 'warning'
daysUntilDeadline > 7      → 'safe'
```

---

## 六、数据完整性约束

| 约束 | 处理策略 |
| --- | --- |
| `id` 重复 | 创建时生成 UUID，概率上不可能重复；读取时若发现重复取第一条 |
| 枚举值非法 | 读取 localStorage 时过滤掉非法 stage/priority，记录 console.warn |
| 日期格式错误 | 视为 `null` 处理，不崩溃 |
| `company` / `position` 为空 | 前端表单层拦截，store 层二次校验，非法则拒绝写入并抛出 Error |
| localStorage 解析失败 | catch JSON.parse 异常，降级为空数组并重置为示例数据 |

---

## 七、预置示例数据（10 条）

> 日期以 2026-04-19 为基准计算

```json
[
  {
    "id": "seed-001",
    "company": "华为",
    "position": "软件工程师",
    "stage": "test",
    "priority": "high",
    "applyDate": "2026-04-12",
    "deadline": "2026-04-20",
    "link": null,
    "notes": "机试平台：牛客，时长 3 小时",
    "createdAt": "2026-04-12T08:00:00.000Z",
    "updatedAt": "2026-04-12T08:00:00.000Z"
  },
  {
    "id": "seed-002",
    "company": "网易",
    "position": "游戏策划",
    "stage": "applied",
    "priority": "medium",
    "applyDate": "2026-04-15",
    "deadline": "2026-04-21",
    "link": null,
    "notes": "",
    "createdAt": "2026-04-15T10:00:00.000Z",
    "updatedAt": "2026-04-15T10:00:00.000Z"
  },
  {
    "id": "seed-003",
    "company": "字节跳动",
    "position": "算法工程师",
    "stage": "interview",
    "priority": "high",
    "applyDate": "2026-04-10",
    "deadline": "2026-04-22",
    "link": null,
    "notes": "已过三面，等待 HR 面",
    "createdAt": "2026-04-10T09:00:00.000Z",
    "updatedAt": "2026-04-18T14:00:00.000Z"
  },
  {
    "id": "seed-004",
    "company": "腾讯",
    "position": "后端开发",
    "stage": "test",
    "priority": "high",
    "applyDate": "2026-04-14",
    "deadline": "2026-04-24",
    "link": null,
    "notes": "微信事业群",
    "createdAt": "2026-04-14T11:00:00.000Z",
    "updatedAt": "2026-04-14T11:00:00.000Z"
  },
  {
    "id": "seed-005",
    "company": "滴滴",
    "position": "后端工程师",
    "stage": "interview",
    "priority": "medium",
    "applyDate": "2026-04-13",
    "deadline": "2026-04-26",
    "link": null,
    "notes": "一面已过，等待二面通知",
    "createdAt": "2026-04-13T09:30:00.000Z",
    "updatedAt": "2026-04-17T16:00:00.000Z"
  },
  {
    "id": "seed-006",
    "company": "阿里巴巴",
    "position": "产品经理",
    "stage": "applied",
    "priority": "medium",
    "applyDate": "2026-04-16",
    "deadline": "2026-04-29",
    "link": null,
    "notes": "通过内推，HR 已收到简历",
    "createdAt": "2026-04-16T08:00:00.000Z",
    "updatedAt": "2026-04-16T08:00:00.000Z"
  },
  {
    "id": "seed-007",
    "company": "京东",
    "position": "运营专员",
    "stage": "applied",
    "priority": "low",
    "applyDate": "2026-04-17",
    "deadline": "2026-05-05",
    "link": null,
    "notes": "",
    "createdAt": "2026-04-17T14:00:00.000Z",
    "updatedAt": "2026-04-17T14:00:00.000Z"
  },
  {
    "id": "seed-008",
    "company": "小米",
    "position": "产品经理",
    "stage": "applied",
    "priority": "low",
    "applyDate": "2026-04-18",
    "deadline": null,
    "link": null,
    "notes": "招聘常年开放",
    "createdAt": "2026-04-18T10:00:00.000Z",
    "updatedAt": "2026-04-18T10:00:00.000Z"
  },
  {
    "id": "seed-009",
    "company": "美团",
    "position": "数据分析师",
    "stage": "offer",
    "priority": "high",
    "applyDate": "2026-03-20",
    "deadline": null,
    "link": null,
    "notes": "Offer 已签，待入职",
    "createdAt": "2026-03-20T09:00:00.000Z",
    "updatedAt": "2026-04-10T11:00:00.000Z"
  },
  {
    "id": "seed-010",
    "company": "百度",
    "position": "前端工程师",
    "stage": "rejected",
    "priority": "medium",
    "applyDate": "2026-04-01",
    "deadline": null,
    "link": null,
    "notes": "笔试未通过",
    "createdAt": "2026-04-01T08:00:00.000Z",
    "updatedAt": "2026-04-08T10:00:00.000Z"
  }
]
```

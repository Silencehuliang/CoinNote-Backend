# 🪙 CoinNote Backend

CoinNote 家庭记账小程序后端服务，基于 Cloudflare Workers 构建。

## 技术栈

| 技术 | 说明 | 版本 |
|------|------|------|
| **运行时** | Cloudflare Workers | 边缘计算 |
| **框架** | Hono | 轻量级 Web 框架 |
| **ORM** | Drizzle ORM | 类型安全 SQL |
| **数据库** | Cloudflare D1 | SQLite 兼容 |
| **存储** | Cloudflare R2 | 对象存储（可选） |
| **语言** | TypeScript | 类型安全 |

## 项目结构

```
backend/
├── src/
│   ├── routes/                   # API 路由
│   │   ├── auth.ts               # 认证（微信登录/开发登录）
│   │   ├── user.ts               # 用户管理
│   │   ├── family.ts             # 家庭管理
│   │   ├── category.ts           # 分类管理
│   │   ├── tag.ts                # 标签管理
│   │   ├── expense.ts            # 消费记录
│   │   ├── stats.ts              # 统计分析
│   │   ├── importExport.ts       # 导入导出
│   │   └── upload.ts             # 文件上传
│   ├── db/                       # 数据库
│   │   ├── schema.ts             # 表结构定义
│   │   └── index.ts              # 数据库连接
│   └── index.ts                  # 入口文件
├── migrations/                   # 数据库迁移
│   ├── 0000_initial.sql          # 初始表结构
│   └── 0001_seed_data.sql        # 默认数据
├── wrangler.toml                 # Cloudflare 配置
├── drizzle.config.ts             # Drizzle 配置
├── tsconfig.json                 # TypeScript 配置
└── package.json
```

---

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

编辑 `wrangler.toml`：

```toml
name = "coinnote-backend"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
WX_APP_ID = "your-wx-app-id"
WX_APP_SECRET = "your-wx-app-secret"
JWT_SECRET = "your-jwt-secret-key-change-this"

[[d1_databases]]
binding = "DB"
database_name = "coinnote-db"
database_id = "your-database-id"

# 可选：R2 存储
# [[r2_buckets]]
# binding = "BUCKET"
# bucket_name = "coinnote-files"
```

### 3. 创建 Cloudflare 资源

```bash
# 登录 Cloudflare
npx wrangler login

# 创建 D1 数据库
npx wrangler d1 create coinnote-db
# 记录输出的 database_id，更新到 wrangler.toml

# 创建 R2 存储桶（可选）
npx wrangler r2 bucket create coinnote-files
```

### 4. 执行数据库迁移

```bash
# 本地开发环境
npm run db:migrate

# 远程生产环境
npm run db:migrate:remote
```

### 5. 启动开发服务器

```bash
npm run dev
```

服务器将在 http://127.0.0.1:8787 启动。

### 6. 部署到生产环境

```bash
npm run deploy
```

---

## 📊 数据库设计

### ER 图

```
┌─────────────┐       ┌─────────────┐
│   users     │       │  families   │
├─────────────┤       ├─────────────┤
│ id (PK)     │──┐    │ id (PK)     │
│ openid      │  │    │ name        │
│ nickname    │  │    │ invite_code │
│ avatar      │  │    │ owner_id    │
│ family_id   │──┼────│ created_at  │
│ created_at  │  │    │ updated_at  │
│ updated_at  │  │    └─────────────┘
└─────────────┘  │
                 │    ┌─────────────┐
                 │    │ categories  │
                 │    ├─────────────┤
                 │    │ id (PK)     │
                 │    │ name        │
                 │    │ icon        │
                 │    │ parent_id   │──┐
                 │    │ user_id     │  │
                 │    │ is_system   │  │
                 │    │ sort_order  │  │
                 │    │ created_at  │  │
                 │    └─────────────┘  │
                 │                     │
                 │    ┌─────────────┐  │
                 │    │   tags      │  │
                 │    ├─────────────┤  │
                 │    │ id (PK)     │  │
                 │    │ name        │  │
                 │    │ user_id     │  │
                 │    │ family_id   │  │
                 │    │ created_at  │  │
                 │    └─────────────┘  │
                 │                     │
                 │    ┌─────────────┐  │
                 └───>│  expenses   │  │
                      ├─────────────┤  │
                      │ id (PK)     │  │
                      │ user_id (FK)│  │
                      │ family_id   │  │
                      │ amount      │  │
                      │ category_id │──┘
                      │ sub_category│
                      │ description │
                      │ date        │
                      │ created_at  │
                      │ updated_at  │
                      └─────────────┘
                             │
                             │    ┌─────────────┐
                             │    │expense_tags │
                             │    ├─────────────┤
                             └───>│ id (PK)     │
                                  │ expense_id  │
                                  │ tag_id      │
                                  └─────────────┘
```

### 表结构详解

#### users - 用户表

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,
  openid TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  avatar TEXT,
  family_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_users_openid ON users(openid);
CREATE INDEX idx_users_family_id ON users(family_id);
```

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 用户唯一标识（UUID） |
| openid | TEXT | 微信 openid |
| nickname | TEXT | 用户昵称 |
| avatar | TEXT | 头像 URL |
| family_id | TEXT | 所属家庭 ID |
| created_at | INTEGER | 创建时间戳 |
| updated_at | INTEGER | 更新时间戳 |

#### families - 家庭表

```sql
CREATE TABLE families (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  owner_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX idx_families_invite_code ON families(invite_code);
```

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 家庭唯一标识 |
| name | TEXT | 家庭名称 |
| invite_code | TEXT | 6位邀请码 |
| owner_id | TEXT | 创建者用户 ID |
| created_at | INTEGER | 创建时间戳 |
| updated_at | INTEGER | 更新时间戳 |

#### categories - 分类表

```sql
CREATE TABLE categories (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  parent_id TEXT,
  user_id TEXT,
  is_system INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_user_id ON categories(user_id);
```

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 分类标识 |
| name | TEXT | 分类名称 |
| icon | TEXT | 图标（emoji） |
| parent_id | TEXT | 父分类 ID（二级分类） |
| user_id | TEXT | 用户自定义分类 |
| is_system | INTEGER | 是否系统内置（0/1） |
| sort_order | INTEGER | 排序顺序 |
| created_at | INTEGER | 创建时间戳 |

#### expenses - 消费记录表

```sql
CREATE TABLE expenses (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  family_id TEXT,
  amount REAL NOT NULL,
  category_id TEXT NOT NULL,
  sub_category_id TEXT,
  description TEXT,
  date TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_family_id ON expenses(family_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_user_date ON expenses(user_id, date);
```

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 记录唯一标识 |
| user_id | TEXT | 记录者用户 ID |
| family_id | TEXT | 所属家庭 ID |
| amount | REAL | 金额 |
| category_id | TEXT | 一级分类 ID |
| sub_category_id | TEXT | 二级分类 ID |
| description | TEXT | 备注描述 |
| date | TEXT | 消费日期（YYYY-MM-DD） |
| created_at | INTEGER | 创建时间戳 |
| updated_at | INTEGER | 更新时间戳 |

#### tags - 标签表

```sql
CREATE TABLE tags (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  user_id TEXT,
  family_id TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_tags_user_id ON tags(user_id);
```

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 标签唯一标识 |
| name | TEXT | 标签名称 |
| user_id | TEXT | 用户自定义标签 |
| family_id | TEXT | 家庭共享标签 |
| created_at | INTEGER | 创建时间戳 |

#### expense_tags - 消费标签关联表

```sql
CREATE TABLE expense_tags (
  id TEXT PRIMARY KEY NOT NULL,
  expense_id TEXT NOT NULL,
  tag_id TEXT NOT NULL
);

CREATE INDEX idx_expense_tags_expense_id ON expense_tags(expense_id);
CREATE INDEX idx_expense_tags_tag_id ON expense_tags(tag_id);
```

---

## 🔐 认证流程

### 微信登录流程

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│  小程序端   │         │   后端      │         │  微信API    │
├─────────────┤         ├─────────────┤         ├─────────────┤
│  wx.login() │         │             │         │             │
│      ↓      │         │             │         │             │
│  获取 code  │────────>│  /auth/wx   │────────>│  jscode2    │
│             │         │  -login     │         │  session    │
│             │         │      ↓      │         │             │
│             │         │  获取       │<────────│  返回       │
│             │         │  openid     │         │  openid     │
│             │         │      ↓      │         │             │
│             │         │  查找/创建  │         │             │
│             │         │  用户       │         │             │
│             │         │      ↓      │         │             │
│             │         │  生成 JWT   │         │             │
│             │<────────│  返回 token │         │             │
│  保存 token │         │             │         │             │
└─────────────┘         └─────────────┘         └─────────────┘
```

### 开发环境登录

```typescript
// POST /api/auth/dev-login
{
  "code": 0,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "isNewUser": true,
    "user": {
      "id": "uuid",
      "nickname": "Dev Test User",
      "avatar": null,
      "familyId": null
    }
  }
}
```

### JWT Token 结构

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "userId": "user-uuid",
    "openid": "wx-openid",
    "iat": 1700000000,
    "exp": 1700604800
  }
}
```

---

## 📡 API 接口文档

### 基础信息

- **Base URL**: `https://your-domain.com`
- **认证方式**: Bearer Token (JWT)
- **请求格式**: JSON
- **响应格式**: JSON

### 通用响应结构

```json
// 成功
{
  "code": 0,
  "data": { ... }
}

// 失败
{
  "code": 1005,
  "message": "错误信息"
}
```

### 错误码

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| 1001 | 未授权 |
| 1002 | Token 无效或过期 |
| 1003 | 参数错误 |
| 1004 | 资源不存在 |
| 1005 | 服务器内部错误 |

---

### 认证接口

#### POST /api/auth/wx-login

微信登录。

**请求：**
```json
{
  "code": "wx-login-code"
}
```

**响应：**
```json
{
  "code": 0,
  "data": {
    "token": "jwt-token",
    "isNewUser": false,
    "user": {
      "id": "user-uuid",
      "nickname": "用户昵称",
      "avatar": "https://...",
      "familyId": "family-uuid"
    }
  }
}
```

#### POST /api/auth/dev-login

开发环境登录（仅用于测试）。

---

### 消费记录接口

#### GET /api/expenses

获取消费记录列表。

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| startDate | string | 否 | 开始日期 (YYYY-MM-DD) |
| endDate | string | 否 | 结束日期 (YYYY-MM-DD) |
| categoryId | string | 否 | 分类筛选 |
| tagId | string | 否 | 标签筛选 |
| page | number | 否 | 页码（默认 1） |
| pageSize | number | 否 | 每页数量（默认 20） |

**响应：**
```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": "expense-uuid",
        "amount": 25.50,
        "categoryId": "food",
        "subCategoryId": "food_lunch",
        "description": "午餐",
        "date": "2024-01-15",
        "createdAt": 1700000000,
        "category": {
          "id": "food",
          "name": "餐饮",
          "icon": "🍜"
        },
        "subCategory": {
          "id": "food_lunch",
          "name": "午餐"
        },
        "user": {
          "id": "user-uuid",
          "nickname": "用户昵称",
          "avatar": "https://..."
        },
        "tags": [
          { "id": "tag-uuid", "name": "日常" }
        ]
      }
    ],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

#### POST /api/expenses

创建消费记录。

**请求：**
```json
{
  "amount": 25.50,
  "categoryId": "food",
  "subCategoryId": "food_lunch",
  "description": "午餐",
  "date": "2024-01-15",
  "tags": ["tag-uuid-1", "tag-uuid-2"]
}
```

**请求头：**
```
Authorization: Bearer {token}
X-Family-Id: {family-uuid}  // 可选，记录到家庭
```

---

### 统计接口

#### GET /api/stats/by-category

按分类统计。

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| startDate | string | 是 | 开始日期 |
| endDate | string | 是 | 结束日期 |

**响应：**
```json
{
  "code": 0,
  "data": {
    "total": 1500.00,
    "items": [
      {
        "categoryId": "food",
        "categoryName": "餐饮",
        "categoryIcon": "🍜",
        "amount": 800.00,
        "percentage": 53.33,
        "count": 30
      }
    ]
  }
}
```

#### GET /api/stats/by-time

按时间统计。

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| startDate | string | 是 | 开始日期 |
| endDate | string | 是 | 结束日期 |
| groupBy | string | 否 | 分组方式：day/month/year |

---

### 同步接口

#### GET /api/expenses/sync

增量同步消费记录。

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| since | string | 否 | 上次同步时间戳 |
| startDate | string | 否 | 开始日期 |
| endDate | string | 否 | 结束日期 |

**响应：**
```json
{
  "code": 0,
  "data": {
    "updates": [...],  // 新增/修改的记录
    "deletes": [...],  // 删除的记录 ID
    "syncTime": "2024-01-15T10:30:00Z"
  }
}
```

---

### 版本校验接口

#### GET /api/categories/version

检查分类是否有更新。

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| version | number | 否 | 客户端版本号 |

**响应：**
```json
{
  "code": 0,
  "version": 1700000000,
  "needUpdate": true
}
```

---

## 🛠️ 开发指南

### 本地开发

```bash
# 启动开发服务器
npm run dev

# 查看数据库
npm run db:studio
```

### 数据库操作

```bash
# 生成迁移文件
npm run db:generate

# 执行本地迁移
npm run db:migrate

# 执行远程迁移
npm run db:migrate:remote
```

### 添加新路由

1. 在 `src/routes/` 创建新文件：

```typescript
// src/routes/example.ts
import { Hono } from 'hono';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

export const exampleRoutes = new Hono<{ Bindings: Bindings }>();

// 中间件：验证JWT
exampleRoutes.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ code: 1001, message: '未授权' }, 401);
  }
  try {
    const token = authHeader.replace('Bearer ', '');
    const payload = await verifyJWT(token, c.env.JWT_SECRET);
    c.set('userId', payload.userId);
    await next();
  } catch (err) {
    return c.json({ code: 1002, message: 'token无效' }, 401);
  }
});

// 路由处理器
exampleRoutes.get('/', async (c) => {
  const userId = c.get('userId');
  return c.json({ code: 0, data: { userId } });
});
```

2. 在 `src/index.ts` 注册路由：

```typescript
import { exampleRoutes } from './routes/example';

app.route('/api/example', exampleRoutes);
```

### 添加数据库表

1. 在 `src/db/schema.ts` 定义表结构：

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const newTable = sqliteTable('new_table', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at').notNull(),
});
```

2. 生成迁移文件：

```bash
npm run db:generate
```

3. 执行迁移：

```bash
npm run db:migrate
```

---

## 🔧 环境变量

| 变量名 | 说明 | 必填 |
|--------|------|------|
| WX_APP_ID | 微信小程序 AppID | 是 |
| WX_APP_SECRET | 微信小程序 AppSecret | 是 |
| JWT_SECRET | JWT 签名密钥 | 是 |

---

## 📊 性能优化

### 数据库优化

1. **索引**：为常用查询字段添加索引
2. **分页**：使用 LIMIT/OFFSET 分页
3. **批量操作**：使用事务批量插入

### 缓存策略

1. **静态数据**：分类、标签缓存 7 天
2. **版本校验**：通过版本号判断是否需要更新
3. **增量同步**：只同步变更的数据

---

## 🔒 安全考虑

1. **JWT 认证**：所有 API 需要有效的 JWT Token
2. **输入验证**：验证所有用户输入
3. **SQL 注入**：使用参数化查询（Drizzle ORM 自动处理）
4. **CORS**：配置允许的域名
5. **频率限制**：Cloudflare 自带 DDoS 防护

---

## 📝 日志和监控

### 查看 Worker 日志

```bash
npx wrangler tail
```

### 查看数据库

```bash
npx wrangler d1 execute coinnote-db --command "SELECT * FROM users LIMIT 10"
```

### Cloudflare Dashboard

访问 [Cloudflare Dashboard](https://dash.cloudflare.com/) 查看：
- Worker 请求统计
- D1 数据库状态
- 错误日志

---

## 🚀 部署

### 部署到生产环境

```bash
# 确保配置正确
npm run deploy
```

### 绑定自定义域名

1. 在 Cloudflare Dashboard 进入 Worker
2. 点击 **Triggers** → **Custom Domains**
3. 添加你的域名
4. 配置 DNS 记录

---

## 📄 许可证

MIT License

---

## 🔗 相关链接

- [前端仓库](https://github.com/Silencehuliang/CoinNote-MiniProgram)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Hono 文档](https://hono.dev/)
- [Drizzle ORM 文档](https://orm.drizzle.team/)

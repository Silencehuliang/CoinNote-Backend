# 🪙 CoinNote Backend

CoinNote 家庭记账小程序后端服务，基于 Cloudflare Workers 构建。

## 技术栈

- **运行时**: Cloudflare Workers (边缘计算)
- **框架**: Hono (轻量级 Web 框架)
- **ORM**: Drizzle ORM (类型安全)
- **数据库**: Cloudflare D1 (SQLite 兼容)
- **存储**: Cloudflare R2 (对象存储)

## 项目结构

```
backend/
├── src/
│   ├── routes/           # API 路由
│   │   ├── auth.ts       # 认证（微信登录/开发登录）
│   │   ├── user.ts       # 用户管理
│   │   ├── family.ts     # 家庭管理
│   │   ├── category.ts   # 分类管理
│   │   ├── tag.ts        # 标签管理
│   │   ├── expense.ts    # 消费记录
│   │   ├── stats.ts      # 统计分析
│   │   ├── importExport.ts # 导入导出
│   │   └── upload.ts     # 文件上传
│   ├── db/               # 数据库
│   │   ├── schema.ts     # 表结构定义
│   │   └── index.ts      # 数据库连接
│   └── index.ts          # 入口文件
├── migrations/           # 数据库迁移
│   ├── 0000_initial.sql  # 初始表结构
│   └── 0001_seed_data.sql # 默认数据
├── wrangler.toml         # Cloudflare 配置
├── drizzle.config.ts     # Drizzle 配置
└── package.json
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制并编辑配置文件：

```bash
cp wrangler.toml.example wrangler.toml
```

修改 `wrangler.toml` 中的配置：

```toml
[vars]
WX_APP_ID = "your-wx-app-id"
WX_APP_SECRET = "your-wx-app-secret"
JWT_SECRET = "your-jwt-secret-key"

[[d1_databases]]
binding = "DB"
database_name = "coinnote-db"
database_id = "your-database-id"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "coinnote-files"
```

### 3. 创建 Cloudflare 资源

```bash
# 登录 Cloudflare
npx wrangler login

# 创建 D1 数据库
npx wrangler d1 create coinnote-db
# 记录输出的 database_id，更新到 wrangler.toml

# 创建 R2 存储桶
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

## API 文档

### 认证接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/wx-login` | 微信登录 |
| POST | `/api/auth/dev-login` | 开发环境登录 |

### 用户接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/user/profile` | 获取用户信息 |
| POST | `/api/user/profile` | 更新用户信息 |

### 家庭接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/family/create` | 创建家庭 |
| POST | `/api/family/join` | 加入家庭 |
| GET | `/api/family/info` | 获取家庭信息 |
| POST | `/api/family/leave` | 退出家庭 |
| POST | `/api/family/refresh-invite-code` | 刷新邀请码 |

### 分类接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/categories` | 获取分类列表 |
| GET | `/api/categories/version` | 获取分类版本 |
| POST | `/api/categories` | 创建分类 |
| PUT | `/api/categories/:id` | 更新分类 |
| DELETE | `/api/categories/:id` | 删除分类 |

### 标签接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/tags` | 获取标签列表 |
| GET | `/api/tags/version` | 获取标签版本 |
| POST | `/api/tags` | 创建标签 |
| DELETE | `/api/tags/:id` | 删除标签 |

### 消费记录接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/expenses` | 获取消费列表 |
| GET | `/api/expenses/sync` | 增量同步 |
| GET | `/api/expenses/:id` | 获取详情 |
| POST | `/api/expenses` | 创建记录 |
| PUT | `/api/expenses/:id` | 更新记录 |
| DELETE | `/api/expenses/:id` | 删除记录 |

### 统计接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/stats/by-time` | 按时间统计 |
| GET | `/api/stats/by-category` | 按分类统计 |
| GET | `/api/stats/by-user` | 按用户统计 |
| GET | `/api/stats/by-tag` | 按标签统计 |

### 导入导出接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/import/template` | 下载导入模板 |
| POST | `/api/import/expenses` | 导入消费记录 |
| POST | `/api/export/expenses` | 导出消费记录 |
| GET | `/api/export/history` | 导出历史 |

### 文件上传接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/upload/image` | 上传图片 |

## 开发指南

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

1. 在 `src/routes/` 创建新文件
2. 定义路由处理器
3. 在 `src/index.ts` 中注册路由

```typescript
// src/routes/example.ts
import { Hono } from 'hono';

export const exampleRoutes = new Hono();

exampleRoutes.get('/', (c) => {
  return c.json({ message: 'Hello' });
});

// src/index.ts
import { exampleRoutes } from './routes/example';
app.route('/api/example', exampleRoutes);
```

## 环境变量

| 变量名 | 说明 | 必填 |
|--------|------|------|
| WX_APP_ID | 微信小程序 AppID | 是 |
| WX_APP_SECRET | 微信小程序 AppSecret | 是 |
| JWT_SECRET | JWT 签名密钥 | 是 |

## 许可证

MIT License

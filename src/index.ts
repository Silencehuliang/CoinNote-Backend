import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { createDB } from './db';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/user';
import { familyRoutes } from './routes/family';
import { categoryRoutes } from './routes/category';
import { tagRoutes } from './routes/tag';
import { expenseRoutes } from './routes/expense';
import { statsRoutes } from './routes/stats';
import { importExportRoutes } from './routes/importExport';
import { uploadRoutes } from './routes/upload';

type Bindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
  WX_APP_ID: string;
  WX_APP_SECRET: string;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS 中间件
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Family-Id'],
}));

// 健康检查
app.get('/', (c) => {
  return c.json({ status: 'ok', message: '记账本 API 服务运行中' });
});

// API 路由
app.route('/api/auth', authRoutes);
app.route('/api/user', userRoutes);
app.route('/api/family', familyRoutes);
app.route('/api/categories', categoryRoutes);
app.route('/api/tags', tagRoutes);
app.route('/api/expenses', expenseRoutes);
app.route('/api/stats', statsRoutes);
app.route('/api/import', importExportRoutes);
app.route('/api/export', importExportRoutes);
app.route('/api/upload', uploadRoutes);

// 404 处理
app.notFound((c) => {
  return c.json({ code: 1004, message: '接口不存在' }, 404);
});

// 错误处理
app.onError((err, c) => {
  console.error('服务器错误:', err);
  return c.json({ code: 1005, message: '服务器内部错误' }, 500);
});

export default app;

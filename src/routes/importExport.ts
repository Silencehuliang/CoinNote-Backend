import { Hono } from 'hono';
import { createDB } from '../db';
import { expenses, expenseTags, exportHistory, categories, tags } from '../db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

type Bindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
  JWT_SECRET: string;
};

export const importExportRoutes = new Hono<{ Bindings: Bindings }>();

// 中间件：验证JWT
importExportRoutes.use('*', async (c, next) => {
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
    return c.json({ code: 1002, message: 'token无效或已过期' }, 401);
  }
});

// 导出消费记录
importExportRoutes.post('/expenses', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const db = createDB(c.env.DB);
    const { startDate, endDate, format = 'xlsx' } = await c.req.json();
    const familyId = c.req.header('X-Family-Id');

    let where = familyId ? eq(expenses.familyId, familyId) : eq(expenses.userId, userId);
    if (startDate && endDate) {
      where = and(where, gte(expenses.date, new Date(startDate)), lte(expenses.date, new Date(endDate)))!;
    }

    // 查询消费记录
    const list = await db.select().from(expenses).where(where).all();

    // 生成 Excel 文件（简化版，实际需要使用 exceljs）
    const exportId = uuidv4();
    const fileName = `export_${Date.now()}.xlsx`;
    const filePath = `exports/${userId}/${fileName}`;

    // 保存导出记录
    await db.insert(exportHistory).values({
      id: exportId,
      userId,
      familyId: familyId || null,
      fileUrl: filePath,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      createdAt: new Date(),
    });

    // 生成下载URL（简化版，实际需要生成预签名URL）
    const downloadUrl = `https://your-r2-domain.r2.dev/${filePath}`;

    return c.json({
      code: 0,
      data: {
        downloadUrl,
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1小时后过期
      },
    });
  } catch (err) {
    console.error('导出失败:', err);
    return c.json({ code: 1005, message: '导出失败' });
  }
});

// 获取导入模板
importExportRoutes.get('/template', async (c) => {
  try {
    // 返回模板文件（简化版）
    const template = {
      headers: ['日期', '金额', '分类', '子分类', '备注', '标签'],
      example: ['2024-01-15', '25.50', '餐饮', '午餐', '工作餐', '日常'],
    };

    return c.json({ code: 0, data: template });
  } catch (err) {
    console.error('获取模板失败:', err);
    return c.json({ code: 1005, message: '获取模板失败' });
  }
});

// 导入消费记录
importExportRoutes.post('/expenses', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const db = createDB(c.env.DB);
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const familyId = c.req.header('X-Family-Id');

    if (!file) {
      return c.json({ code: 1003, message: '请选择文件' });
    }

    // 解析 Excel 文件（简化版，实际需要使用 exceljs）
    // 这里只是示例结构
    const result = {
      successCount: 0,
      failCount: 0,
      errors: [] as Array<{ row: number; message: string }>,
    };

    return c.json({ code: 0, data: result });
  } catch (err) {
    console.error('导入失败:', err);
    return c.json({ code: 1005, message: '导入失败' });
  }
});

// 获取导出历史
importExportRoutes.get('/history', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const db = createDB(c.env.DB);

    const history = await db.select().from(exportHistory)
      .where(eq(exportHistory.userId, userId))
      .all();

    return c.json({ code: 0, data: history });
  } catch (err) {
    console.error('获取导出历史失败:', err);
    return c.json({ code: 1005, message: '获取失败' });
  }
});

// 验证 JWT
async function verifyJWT(token: string, secret: string): Promise<any> {
  const [header, body, signature] = token.split('.');
  const signatureBuffer = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
  const isValid = await crypto.subtle.verify(
    'HMAC',
    await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    ),
    signatureBuffer,
    new TextEncoder().encode(`${header}.${body}`)
  );
  if (!isValid) throw new Error('Invalid signature');
  const payload = JSON.parse(atob(body));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }
  return payload;
}

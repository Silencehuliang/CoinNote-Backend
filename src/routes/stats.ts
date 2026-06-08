import { Hono } from 'hono';
import { createDB } from '../db';
import { expenses, categories, tags, users, expenseTags } from '../db/schema';
import { eq, and, gte, lte, sql, sum, count } from 'drizzle-orm';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

export const statsRoutes = new Hono<{ Bindings: Bindings }>();

// 中间件：验证JWT
statsRoutes.use('*', async (c, next) => {
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

// 按时间统计
statsRoutes.get('/by-time', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const db = createDB(c.env.DB);
    const { startDate, endDate, groupBy = 'day' } = c.req.query();
    const familyId = c.req.header('X-Family-Id');

    let where = familyId ? eq(expenses.familyId, familyId) : eq(expenses.userId, userId);
    if (startDate && endDate) {
      where = and(where, gte(expenses.date, new Date(startDate)), lte(expenses.date, new Date(endDate)))!;
    }

    // 查询总金额和总笔数
    const totalResult = await db.select({
      total: sum(expenses.amount),
      count: count(),
    }).from(expenses).where(where).get();

    // 按时间分组统计
    let dateFormat;
    switch (groupBy) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      case 'year':
        dateFormat = '%Y';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }

    const items = await db.select({
      date: sql<string>`strftime(${dateFormat}, ${expenses.date})`,
      amount: sum(expenses.amount),
      count: count(),
    })
    .from(expenses)
    .where(where)
    .groupBy(sql`strftime(${dateFormat}, ${expenses.date})`)
    .orderBy(sql`strftime(${dateFormat}, ${expenses.date})`)
    .all();

    return c.json({
      code: 0,
      data: {
        total: totalResult?.total || 0,
        items,
      },
    });
  } catch (err) {
    console.error('统计失败:', err);
    return c.json({ code: 1005, message: '统计失败' });
  }
});

// 按分类统计
statsRoutes.get('/by-category', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const db = createDB(c.env.DB);
    const { startDate, endDate } = c.req.query();
    const familyId = c.req.header('X-Family-Id');

    let where = familyId ? eq(expenses.familyId, familyId) : eq(expenses.userId, userId);
    if (startDate && endDate) {
      where = and(where, gte(expenses.date, new Date(startDate)), lte(expenses.date, new Date(endDate)))!;
    }

    const result = await db.select({
      categoryId: expenses.categoryId,
      amount: sum(expenses.amount),
      count: count(),
    })
    .from(expenses)
    .where(where)
    .groupBy(expenses.categoryId)
    .orderBy(sql`sum(${expenses.amount}) desc`)
    .all();

    const total = result.reduce((acc, item) => acc + (item.amount || 0), 0);

    const items = await Promise.all(result.map(async (item) => {
      const category = await db.select().from(categories).where(eq(categories.id, item.categoryId)).get();
      return {
        categoryId: item.categoryId,
        categoryName: category?.name || '未分类',
        categoryIcon: category?.icon || '📦',
        amount: item.amount || 0,
        percentage: total > 0 ? ((item.amount || 0) / total) * 100 : 0,
        count: item.count,
      };
    }));

    return c.json({
      code: 0,
      data: { total, items },
    });
  } catch (err) {
    console.error('统计失败:', err);
    return c.json({ code: 1005, message: '统计失败' });
  }
});

// 按用户统计
statsRoutes.get('/by-user', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const db = createDB(c.env.DB);
    const { startDate, endDate } = c.req.query();
    const familyId = c.req.header('X-Family-Id');

    let where = familyId ? eq(expenses.familyId, familyId) : eq(expenses.userId, userId);
    if (startDate && endDate) {
      where = and(where, gte(expenses.date, new Date(startDate)), lte(expenses.date, new Date(endDate)))!;
    }

    const result = await db.select({
      userId: expenses.userId,
      amount: sum(expenses.amount),
      count: count(),
    })
    .from(expenses)
    .where(where)
    .groupBy(expenses.userId)
    .orderBy(sql`sum(${expenses.amount}) desc`)
    .all();

    const total = result.reduce((acc, item) => acc + (item.amount || 0), 0);

    const items = await Promise.all(result.map(async (item) => {
      const user = await db.select().from(users).where(eq(users.id, item.userId)).get();
      return {
        userId: item.userId,
        nickname: user?.nickname || '未知用户',
        avatar: user?.avatar || null,
        amount: item.amount || 0,
        percentage: total > 0 ? ((item.amount || 0) / total) * 100 : 0,
        count: item.count,
      };
    }));

    return c.json({
      code: 0,
      data: { total, items },
    });
  } catch (err) {
    console.error('统计失败:', err);
    return c.json({ code: 1005, message: '统计失败' });
  }
});

// 按标签统计
statsRoutes.get('/by-tag', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const db = createDB(c.env.DB);
    const { startDate, endDate } = c.req.query();
    const familyId = c.req.header('X-Family-Id');

    let where = familyId ? eq(expenses.familyId, familyId) : eq(expenses.userId, userId);
    if (startDate && endDate) {
      where = and(where, gte(expenses.date, new Date(startDate)), lte(expenses.date, new Date(endDate)))!;
    }

    // 获取有标签的消费记录
    const result = await db.select({
      tagId: expenseTags.tagId,
      amount: sum(expenses.amount),
      count: count(),
    })
    .from(expenses)
    .innerJoin(expenseTags, eq(expenseTags.expenseId, expenses.id))
    .where(where)
    .groupBy(expenseTags.tagId)
    .orderBy(sql`sum(${expenses.amount}) desc`)
    .all();

    const items = await Promise.all(result.map(async (item) => {
      const tag = await db.select().from(tags).where(eq(tags.id, item.tagId)).get();
      return {
        tagId: item.tagId,
        tagName: tag?.name || '未知标签',
        amount: item.amount || 0,
        count: item.count,
      };
    }));

    return c.json({ code: 0, data: { items } });
  } catch (err) {
    console.error('统计失败:', err);
    return c.json({ code: 1005, message: '统计失败' });
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

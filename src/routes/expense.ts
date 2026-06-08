import { Hono } from 'hono';
import { createDB } from '../db';
import { expenses, expenseTags, categories, tags, users } from '../db/schema';
import { eq, and, gte, lte, desc, count, sql } from 'drizzle-orm';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

export const expenseRoutes = new Hono<{ Bindings: Bindings }>();

// 中间件：验证JWT
expenseRoutes.use('*', async (c, next) => {
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

// 获取消费记录列表
expenseRoutes.get('/', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const db = createDB(c.env.DB);
    
    const { startDate, endDate, categoryId, tagId, page = '1', pageSize = '20' } = c.req.query();
    const familyId = c.req.header('X-Family-Id');
    
    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);
    const offset = (pageNum - 1) * pageSizeNum;

    // 构建查询条件
    let where = eq(expenses.userId, userId);
    if (familyId) {
      where = eq(expenses.familyId, familyId);
    }
    if (startDate && endDate) {
      where = and(where, gte(expenses.date, new Date(startDate)), lte(expenses.date, new Date(endDate)))!;
    }
    if (categoryId) {
      where = and(where, eq(expenses.categoryId, categoryId))!;
    }

    // 查询总数
    const totalResult = await db.select({ count: count() }).from(expenses).where(where).get();
    const total = totalResult?.count || 0;

    // 查询列表
    const list = await db.select({
      id: expenses.id,
      amount: expenses.amount,
      categoryId: expenses.categoryId,
      subCategoryId: expenses.subCategoryId,
      description: expenses.description,
      date: expenses.date,
      userId: expenses.userId,
      createdAt: expenses.createdAt,
    })
    .from(expenses)
    .where(where)
    .orderBy(desc(expenses.date))
    .limit(pageSizeNum)
    .offset(offset)
    .all();

    // 补充分类和用户信息
    const enriched = await Promise.all(list.map(async (item) => {
      const category = await db.select().from(categories).where(eq(categories.id, item.categoryId)).get();
      const subCategory = item.subCategoryId ? 
        await db.select().from(categories).where(eq(categories.id, item.subCategoryId)).get() : null;
      const user = await db.select().from(users).where(eq(users.id, item.userId)).get();
      
      // 获取标签
      const itemTags = await db.select({
        id: tags.id,
        name: tags.name,
      })
      .from(tags)
      .innerJoin(expenseTags, eq(expenseTags.tagId, tags.id))
      .where(eq(expenseTags.expenseId, item.id))
      .all();

      return {
        ...item,
        category: category ? { id: category.id, name: category.name, icon: category.icon } : null,
        subCategory: subCategory ? { id: subCategory.id, name: subCategory.name } : null,
        user: user ? { id: user.id, nickname: user.nickname, avatar: user.avatar } : null,
        tags: itemTags,
      };
    }));

    return c.json({
      code: 0,
      data: {
        list: enriched,
        total,
        page: pageNum,
        pageSize: pageSizeNum,
      },
    });
  } catch (err) {
    console.error('获取消费记录失败:', err);
    return c.json({ code: 1005, message: '获取失败' });
  }
});

// 同步消费记录（增量更新）
expenseRoutes.get('/sync', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const db = createDB(c.env.DB);
    const { since, startDate, endDate } = c.req.query();
    const familyId = c.req.header('X-Family-Id');

    // 构建查询条件
    let where = familyId ? eq(expenses.familyId, familyId) : eq(expenses.userId, userId);
    
    // 获取指定时间之后更新的记录
    if (since) {
      where = and(where, gte(expenses.updatedAt, new Date(since)))!;
    }
    
    if (startDate && endDate) {
      where = and(where, gte(expenses.date, new Date(startDate)), lte(expenses.date, new Date(endDate)))!;
    }

    // 查询更新的记录
    const updates = await db.select({
      id: expenses.id,
      userId: expenses.userId,
      familyId: expenses.familyId,
      amount: expenses.amount,
      categoryId: expenses.categoryId,
      subCategoryId: expenses.subCategoryId,
      description: expenses.description,
      date: expenses.date,
      createdAt: expenses.createdAt,
      updatedAt: expenses.updatedAt,
    })
    .from(expenses)
    .where(where)
    .orderBy(desc(expenses.updatedAt))
    .limit(100)  // 限制单次同步数量
    .all();

    // 为每条记录添加分类和标签信息
    const enrichedUpdates = await Promise.all(updates.map(async (item) => {
      const category = await db.select().from(categories).where(eq(categories.id, item.categoryId)).get();
      const subCategory = item.subCategoryId ? 
        await db.select().from(categories).where(eq(categories.id, item.subCategoryId)).get() : null;
      const user = await db.select().from(users).where(eq(users.id, item.userId)).get();
      
      const itemTags = await db.select({
        id: tags.id,
        name: tags.name,
      })
      .from(tags)
      .innerJoin(expenseTags, eq(expenseTags.tagId, tags.id))
      .where(eq(expenseTags.expenseId, item.id))
      .all();

      return {
        ...item,
        category: category ? { id: category.id, name: category.name, icon: category.icon } : null,
        subCategory: subCategory ? { id: subCategory.id, name: subCategory.name } : null,
        user: user ? { id: user.id, nickname: user.nickname, avatar: user.avatar } : null,
        tags: itemTags,
      };
    }));

    // 查询删除的记录（通过标记删除，或者查询已删除的ID）
    // 这里简化处理，实际项目中应该有 deleted_at 字段
    const deletes: string[] = [];

    return c.json({
      code: 0,
      data: {
        updates: enrichedUpdates,
        deletes,
        syncTime: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('同步消费记录失败:', err);
    return c.json({ code: 1005, message: '同步失败' });
  }
});

// 获取单条消费记录详情
expenseRoutes.get('/:id', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const expenseId = c.req.param('id');
    const db = createDB(c.env.DB);

    const expense = await db.select().from(expenses).where(eq(expenses.id, expenseId)).get();
    
    if (!expense) {
      return c.json({ code: 1004, message: '记录不存在' });
    }

    // 获取分类信息
    const category = await db.select().from(categories).where(eq(categories.id, expense.categoryId)).get();
    const subCategory = expense.subCategoryId ? 
      await db.select().from(categories).where(eq(categories.id, expense.subCategoryId)).get() : null;
    
    // 获取用户信息
    const user = await db.select().from(users).where(eq(users.id, expense.userId)).get();
    
    // 获取标签
    const expenseTagList = await db.select({
      id: tags.id,
      name: tags.name,
    })
    .from(tags)
    .innerJoin(expenseTags, eq(expenseTags.tagId, tags.id))
    .where(eq(expenseTags.expenseId, expense.id))
    .all();

    return c.json({
      code: 0,
      data: {
        ...expense,
        category: category ? { id: category.id, name: category.name, icon: category.icon } : null,
        subCategory: subCategory ? { id: subCategory.id, name: subCategory.name } : null,
        user: user ? { id: user.id, nickname: user.nickname, avatar: user.avatar } : null,
        tags: expenseTagList,
      },
    });
  } catch (err) {
    console.error('获取消费记录详情失败:', err);
    return c.json({ code: 1005, message: '获取失败' });
  }
});

// 创建消费记录
expenseRoutes.post('/', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const db = createDB(c.env.DB);
    const { amount, categoryId, subCategoryId, description, date, tags: tagIds } = await c.req.json();
    const familyId = c.req.header('X-Family-Id');

    if (!amount || !categoryId) {
      return c.json({ code: 1003, message: '金额和分类必填' });
    }

    const expenseId = crypto.randomUUID();
    const now = new Date();

    await db.insert(expenses).values({
      id: expenseId,
      userId,
      familyId: familyId || null,
      amount: parseFloat(amount),
      categoryId,
      subCategoryId: subCategoryId || null,
      description: description || null,
      date: new Date(date || now),
      createdAt: now,
      updatedAt: now,
    });

    // 保存标签关联
    if (tagIds && tagIds.length > 0) {
      await db.insert(expenseTags).values(
        tagIds.map((tagId: string) => ({
          id: crypto.randomUUID(),
          expenseId,
          tagId,
        }))
      );
    }

    return c.json({ code: 0, data: { id: expenseId } });
  } catch (err) {
    console.error('创建消费记录失败:', err);
    return c.json({ code: 1005, message: '创建失败' });
  }
});

// 删除消费记录
expenseRoutes.delete('/:id', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const expenseId = c.req.param('id');
    const db = createDB(c.env.DB);

    const expense = await db.select().from(expenses).where(eq(expenses.id, expenseId)).get();
    if (!expense) {
      return c.json({ code: 1004, message: '记录不存在' });
    }
    if (expense.userId !== userId) {
      return c.json({ code: 1003, message: '无权删除此记录' });
    }

    // 删除标签关联
    await db.delete(expenseTags).where(eq(expenseTags.expenseId, expenseId));
    // 删除记录
    await db.delete(expenses).where(eq(expenses.id, expenseId));

    return c.json({ code: 0, message: '删除成功' });
  } catch (err) {
    console.error('删除失败:', err);
    return c.json({ code: 1005, message: '删除失败' });
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

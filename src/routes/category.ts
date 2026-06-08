import { Hono } from 'hono';
import { createDB } from '../db';
import { categories } from '../db/schema';
import { eq, and, or, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

export const categoryRoutes = new Hono<{ Bindings: Bindings }>();

// 中间件：验证JWT
categoryRoutes.use('*', async (c, next) => {
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

// 获取分类版本（用于缓存校验）
categoryRoutes.get('/version', async (c) => {
  try {
    const db = createDB(c.env.DB);
    
    // 获取最新的更新时间作为版本号
    const result = await db.select({
      maxVersion: sql`MAX(updated_at)`,
    }).from(categories).get();

    const version = result?.maxVersion ? new Date(result.maxVersion).getTime() : 0;
    const clientVersion = parseInt(c.req.query('version') || '0');

    return c.json({
      code: 0,
      version,
      needUpdate: version > clientVersion,
    });
  } catch (err) {
    console.error('获取分类版本失败:', err);
    return c.json({ code: 1005, message: '获取失败' });
  }
});

// 获取分类列表（树形结构）
categoryRoutes.get('/', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const db = createDB(c.env.DB);

    // 获取系统分类（userId为null）和用户自定义分类
    const allCategories = await db.select().from(categories)
      .where(
        or(
          isNull(categories.userId),
          eq(categories.userId, userId)
        )
      )
      .all();

    // 构建树形结构
    const rootCategories = allCategories.filter(cat => !cat.parentId);
    const tree = rootCategories.map(root => ({
      ...root,
      children: allCategories.filter(cat => cat.parentId === root.id),
    }));

    // 获取版本号
    const versionResult = await db.select({
      maxVersion: sql`MAX(updated_at)`,
    }).from(categories).get();
    const version = versionResult?.maxVersion ? new Date(versionResult.maxVersion).getTime() : 0;

    return c.json({ code: 0, data: tree, version });
  } catch (err) {
    console.error('获取分类失败:', err);
    return c.json({ code: 1005, message: '获取失败' });
  }
});

// 创建分类
categoryRoutes.post('/', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const { name, icon, parentId } = await c.req.json();
    const db = createDB(c.env.DB);

    if (!name) {
      return c.json({ code: 1003, message: '请输入分类名称' });
    }

    const categoryId = uuidv4();
    await db.insert(categories).values({
      id: categoryId,
      name,
      icon: icon || '📦',
      parentId: parentId || null,
      userId: parentId ? null : userId, // 一级分类关联用户，二级分类不关联
      isSystem: false,
      sortOrder: 0,
      createdAt: new Date(),
    });

    return c.json({ code: 0, data: { id: categoryId } });
  } catch (err) {
    console.error('创建分类失败:', err);
    return c.json({ code: 1005, message: '创建失败' });
  }
});

// 更新分类
categoryRoutes.put('/:id', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const categoryId = c.req.param('id');
    const { name, icon } = await c.req.json();
    const db = createDB(c.env.DB);

    // 检查是否是用户自定义分类
    const category = await db.select().from(categories).where(eq(categories.id, categoryId)).get();
    if (!category) {
      return c.json({ code: 1004, message: '分类不存在' });
    }
    if (category.isSystem) {
      return c.json({ code: 1003, message: '系统分类不可修改' });
    }
    if (category.userId && category.userId !== userId) {
      return c.json({ code: 1003, message: '无权修改此分类' });
    }

    await db.update(categories).set({
      name,
      icon,
    }).where(eq(categories.id, categoryId));

    return c.json({ code: 0, message: '更新成功' });
  } catch (err) {
    console.error('更新分类失败:', err);
    return c.json({ code: 1005, message: '更新失败' });
  }
});

// 删除分类
categoryRoutes.delete('/:id', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const categoryId = c.req.param('id');
    const db = createDB(c.env.DB);

    const category = await db.select().from(categories).where(eq(categories.id, categoryId)).get();
    if (!category) {
      return c.json({ code: 1004, message: '分类不存在' });
    }
    if (category.isSystem) {
      return c.json({ code: 1003, message: '系统分类不可删除' });
    }
    if (category.userId && category.userId !== userId) {
      return c.json({ code: 1003, message: '无权删除此分类' });
    }

    await db.delete(categories).where(eq(categories.id, categoryId));

    return c.json({ code: 0, message: '删除成功' });
  } catch (err) {
    console.error('删除分类失败:', err);
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

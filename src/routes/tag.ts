import { Hono } from 'hono';
import { createDB } from '../db';
import { tags } from '../db/schema';
import { eq, or, isNull } from 'drizzle-orm';


type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

export const tagRoutes = new Hono<{ Bindings: Bindings }>();

// 中间件：验证JWT
tagRoutes.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ code: 1001, message: '未授�? }, 401);
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

// 获取标签列表
tagRoutes.get('/', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const db = createDB(c.env.DB);

    const allTags = await db.select().from(tags)
      .where(or(isNull(tags.userId), eq(tags.userId, userId)))
      .all();

    return c.json({ code: 0, data: allTags });
  } catch (err) {
    console.error('获取标签失败:', err);
    return c.json({ code: 1005, message: '获取失败' });
  }
});

// 创建标签
tagRoutes.post('/', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const { name } = await c.req.json();
    const db = createDB(c.env.DB);

    if (!name) {
      return c.json({ code: 1003, message: '请输入标签名�? });
    }

    const tagId = crypto.randomUUID();
    await db.insert(tags).values({
      id: tagId,
      name,
      userId,
      familyId: null,
      createdAt: new Date(),
    });

    return c.json({ code: 0, data: { id: tagId } });
  } catch (err) {
    console.error('创建标签失败:', err);
    return c.json({ code: 1005, message: '创建失败' });
  }
});

// 删除标签
tagRoutes.delete('/:id', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const tagId = c.req.param('id');
    const db = createDB(c.env.DB);

    const tag = await db.select().from(tags).where(eq(tags.id, tagId)).get();
    if (!tag) {
      return c.json({ code: 1004, message: '标签不存�? });
    }
    if (!tag.userId || tag.userId !== userId) {
      return c.json({ code: 1003, message: '无权删除此标�? });
    }

    await db.delete(tags).where(eq(tags.id, tagId));

    return c.json({ code: 0, message: '删除成功' });
  } catch (err) {
    console.error('删除标签失败:', err);
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

import { Hono } from 'hono';
import { createDB } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

export const userRoutes = new Hono<{ Bindings: Bindings }>();

// 中间件：验证JWT
userRoutes.use('*', async (c, next) => {
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

// 获取用户信息
userRoutes.get('/profile', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const db = createDB(c.env.DB);
    
    const user = await db.select().from(users).where(eq(users.id, userId)).get();
    
    if (!user) {
      return c.json({ code: 1004, message: '用户不存在' });
    }

    return c.json({
      code: 0,
      data: {
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        familyId: user.familyId,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error('获取用户信息失败:', err);
    return c.json({ code: 1005, message: '获取用户信息失败' });
  }
});

// 更新用户信息
userRoutes.post('/profile', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const { nickname, avatar } = await c.req.json();
    const db = createDB(c.env.DB);

    const updateData: any = { updatedAt: new Date() };
    if (nickname !== undefined) updateData.nickname = nickname;
    if (avatar !== undefined) updateData.avatar = avatar;

    await db.update(users).set(updateData).where(eq(users.id, userId));

    return c.json({ code: 0, message: '更新成功' });
  } catch (err) {
    console.error('更新用户信息失败:', err);
    return c.json({ code: 1005, message: '更新失败' });
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

  if (!isValid) {
    throw new Error('Invalid signature');
  }

  const payload = JSON.parse(atob(body));
  
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }

  return payload;
}

import { Hono } from 'hono';
import { createDB } from '../db';
import { users, families } from '../db/schema';
import { eq } from 'drizzle-orm';


type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

export const familyRoutes = new Hono<{ Bindings: Bindings }>();

// 中间件：验证JWT
familyRoutes.use('*', async (c, next) => {
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

// 生成6位随机邀请码
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 创建家庭
familyRoutes.post('/create', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const { name } = await c.req.json();
    const db = createDB(c.env.DB);

    if (!name) {
      return c.json({ code: 1003, message: '请输入家庭名�? });
    }

    // 检查用户是否已有家�?    const user = await db.select().from(users).where(eq(users.id, userId)).get();
    if (user?.familyId) {
      return c.json({ code: 1003, message: '您已加入家庭，请先退出当前家�? });
    }

    // 创建家庭
    const familyId = crypto.randomUUID();
    const inviteCode = generateInviteCode();
    const now = new Date();

    await db.insert(families).values({
      id: familyId,
      name,
      inviteCode,
      ownerId: userId,
      createdAt: now,
      updatedAt: now,
    });

    // 更新用户的家庭ID
    await db.update(users).set({
      familyId,
      updatedAt: now,
    }).where(eq(users.id, userId));

    return c.json({
      code: 0,
      data: {
        id: familyId,
        name,
        inviteCode,
        ownerId: userId,
      },
    });
  } catch (err) {
    console.error('创建家庭失败:', err);
    return c.json({ code: 1005, message: '创建失败' });
  }
});

// 加入家庭
familyRoutes.post('/join', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const { inviteCode } = await c.req.json();
    const db = createDB(c.env.DB);

    if (!inviteCode) {
      return c.json({ code: 1003, message: '请输入邀请码' });
    }

    // 检查用户是否已有家�?    const user = await db.select().from(users).where(eq(users.id, userId)).get();
    if (user?.familyId) {
      return c.json({ code: 1003, message: '您已加入家庭，请先退出当前家�? });
    }

    // 查找家庭
    const family = await db.select().from(families).where(eq(families.inviteCode, inviteCode.toUpperCase())).get();
    if (!family) {
      return c.json({ code: 1004, message: '邀请码无效' });
    }

    // 更新用户的家庭ID
    await db.update(users).set({
      familyId: family.id,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));

    return c.json({
      code: 0,
      data: {
        familyId: family.id,
        familyName: family.name,
      },
    });
  } catch (err) {
    console.error('加入家庭失败:', err);
    return c.json({ code: 1005, message: '加入失败' });
  }
});

// 获取家庭信息
familyRoutes.get('/info', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const db = createDB(c.env.DB);

    const user = await db.select().from(users).where(eq(users.id, userId)).get();
    if (!user?.familyId) {
      return c.json({ code: 0, data: null });
    }

    const family = await db.select().from(families).where(eq(families.id, user.familyId)).get();
    if (!family) {
      return c.json({ code: 1004, message: '家庭不存�? });
    }

    // 获取家庭成员
    const members = await db.select().from(users).where(eq(users.familyId, family.id)).all();

    return c.json({
      code: 0,
      data: {
        id: family.id,
        name: family.name,
        inviteCode: family.inviteCode,
        ownerId: family.ownerId,
        members: members.map(m => ({
          id: m.id,
          nickname: m.nickname,
          avatar: m.avatar,
        })),
      },
    });
  } catch (err) {
    console.error('获取家庭信息失败:', err);
    return c.json({ code: 1005, message: '获取失败' });
  }
});

// 退出家�?familyRoutes.post('/leave', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const db = createDB(c.env.DB);

    const user = await db.select().from(users).where(eq(users.id, userId)).get();
    if (!user?.familyId) {
      return c.json({ code: 1003, message: '您未加入任何家庭' });
    }

    // 检查是否是家庭创建�?    const family = await db.select().from(families).where(eq(families.id, user.familyId)).get();
    if (family?.ownerId === userId) {
      return c.json({ code: 1003, message: '家庭创建者不能退出，请先转让或解散家�? });
    }

    // 退出家�?    await db.update(users).set({
      familyId: null,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));

    return c.json({ code: 0, message: '已退出家�? });
  } catch (err) {
    console.error('退出家庭失�?', err);
    return c.json({ code: 1005, message: '退出失�? });
  }
});

// 刷新邀请码
familyRoutes.post('/refresh-invite-code', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const db = createDB(c.env.DB);

    const user = await db.select().from(users).where(eq(users.id, userId)).get();
    if (!user?.familyId) {
      return c.json({ code: 1003, message: '您未加入任何家庭' });
    }

    const family = await db.select().from(families).where(eq(families.id, user.familyId)).get();
    if (!family || family.ownerId !== userId) {
      return c.json({ code: 1003, message: '只有家庭创建者才能刷新邀请码' });
    }

    const newInviteCode = generateInviteCode();
    await db.update(families).set({
      inviteCode: newInviteCode,
      updatedAt: new Date(),
    }).where(eq(families.id, family.id));

    return c.json({
      code: 0,
      data: { inviteCode: newInviteCode },
    });
  } catch (err) {
    console.error('刷新邀请码失败:', err);
    return c.json({ code: 1005, message: '刷新失败' });
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

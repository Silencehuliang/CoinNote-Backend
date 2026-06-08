import { Hono } from 'hono';
import { createDB } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

type Bindings = {
  DB: D1Database;
  WX_APP_ID: string;
  WX_APP_SECRET: string;
  JWT_SECRET: string;
};

export const authRoutes = new Hono<{ Bindings: Bindings }>();

// 开发环境模拟登录（仅本地开发使用）
authRoutes.post('/dev-login', async (c) => {
  try {
    const db = createDB(c.env.DB);
    const devOpenid = 'dev_user_001';
    
    // 查找或创建开发用户
    let user = await db.select().from(users).where(eq(users.openid, devOpenid)).get();
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      const userId = crypto.randomUUID();
      const now = Date.now();
      
      await db.insert(users).values({
        id: userId,
        openid: devOpenid,
        nickname: 'Dev Test User',
        avatar: null,
        familyId: null,
        createdAt: now,
        updatedAt: now,
      });

      user = await db.select().from(users).where(eq(users.id, userId)).get();
    }

    // 生成 JWT token
    const token = await generateJWT({
      userId: user!.id,
      openid: user!.openid,
    }, c.env.JWT_SECRET);

    return c.json({
      code: 0,
      data: {
        token,
        isNewUser,
        user: {
          id: user!.id,
          nickname: user!.nickname,
          avatar: user!.avatar,
          familyId: user!.familyId,
        },
      },
    });
  } catch (err: any) {
    console.error('开发登录错误:', err);
    return c.json({ code: 1005, message: `登录失败: ${err.message || '未知错误'}` });
  }
});

// 微信登录
authRoutes.post('/wx-login', async (c) => {
  try {
    const { code } = await c.req.json();
    
    if (!code) {
      return c.json({ code: 1003, message: '缺少登录code' });
    }

    const { WX_APP_ID, WX_APP_SECRET } = c.env;

    // 调用微信接口获取 openid
    const wxRes = await fetch(
      `https://api.weixin.qq.com/sns/jscode2session?appid=${WX_APP_ID}&secret=${WX_APP_SECRET}&js_code=${code}&grant_type=authorization_code`
    );
    
    const wxData = await wxRes.json() as any;
    
    if (wxData.errcode) {
      console.error('微信登录失败:', wxData);
      return c.json({ code: 1001, message: '微信登录失败' });
    }

    const { openid, session_key } = wxData;
    const db = createDB(c.env.DB);

    // 查找或创建用户
    let user = await db.select().from(users).where(eq(users.openid, openid)).get();
    let isNewUser = false;

    if (!user) {
      // 新用户
      isNewUser = true;
      const userId = uuidv4();
      const now = new Date();
      
      await db.insert(users).values({
        id: userId,
        openid,
        nickname: '',
        avatar: null,
        familyId: null,
        createdAt: now,
        updatedAt: now,
      });

      user = await db.select().from(users).where(eq(users.id, userId)).get();
    }

    // 生成 JWT token
    const token = await generateJWT({
      userId: user!.id,
      openid: user!.openid,
    }, c.env.JWT_SECRET);

    return c.json({
      code: 0,
      data: {
        token,
        isNewUser,
        user: {
          id: user!.id,
          nickname: user!.nickname,
          avatar: user!.avatar,
          familyId: user!.familyId,
        },
      },
    });
  } catch (err) {
    console.error('登录错误:', err);
    return c.json({ code: 1005, message: '登录失败' });
  }
});

// 生成 JWT
async function generateJWT(payload: any, secret: string): Promise<string> {
  // 简化的 JWT 生成，实际项目中应使用标准库
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7天过期
  }));
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    ),
    new TextEncoder().encode(`${header}.${body}`)
  );

  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  
  return `${header}.${body}.${signatureBase64}`;
}

import { Hono } from 'hono';
import { v4 as uuidv4 } from 'uuid';

type Bindings = {
  BUCKET: R2Bucket;
  JWT_SECRET: string;
};

export const uploadRoutes = new Hono<{ Bindings: Bindings }>();

// 中间件：验证JWT
uploadRoutes.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ code: 1001, message: '未授权' }, 401);
  }
  try {
    const token = authHeader.replace('Bearer ', '');
    // 简化验证，实际需要完整实现
    await next();
  } catch (err) {
    return c.json({ code: 1002, message: 'token无效或已过期' }, 401);
  }
});

// 上传图片
uploadRoutes.post('/image', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return c.json({ code: 1003, message: '请选择文件' });
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ code: 1003, message: '只支持图片格式' });
    }

    // 验证文件大小（10MB）
    if (file.size > 10 * 1024 * 1024) {
      return c.json({ code: 1003, message: '文件大小不能超过10MB' });
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `images/${uuidv4()}.${ext}`;

    // 上传到 R2
    await c.env.BUCKET.put(fileName, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // 返回访问URL
    const url = `https://your-r2-domain.r2.dev/${fileName}`;

    return c.json({
      code: 0,
      data: { url },
    });
  } catch (err) {
    console.error('上传失败:', err);
    return c.json({ code: 1005, message: '上传失败' });
  }
});

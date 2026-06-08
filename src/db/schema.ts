import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// 用户表
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),                    // 用户唯一ID
  openid: text('openid').notNull().unique(),      // 微信openid
  nickname: text('nickname').notNull(),           // 昵称
  avatar: text('avatar'),                         // 头像URL
  familyId: text('family_id'),                    // 所属家庭ID
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// 家庭表
export const families = sqliteTable('families', {
  id: text('id').primaryKey(),                    // 家庭唯一ID
  name: text('name').notNull(),                   // 家庭名称
  inviteCode: text('invite_code').notNull().unique(), // 邀请码
  ownerId: text('owner_id').notNull(),            // 创建者ID
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// 消费分类表（二级分类）
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),                   // 分类名称
  icon: text('icon'),                             // 图标
  parentId: text('parent_id'),                    // 父分类ID，null为一级分类
  userId: text('user_id'),                        // 用户自定义分类关联用户ID，null为系统内置
  isSystem: integer('is_system', { mode: 'boolean' }).default(false), // 是否系统内置
  sortOrder: integer('sort_order').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// 消费记录表
export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),              // 记录者ID
  familyId: text('family_id'),                    // 所属家庭ID
  amount: real('amount').notNull(),               // 金额
  categoryId: text('category_id').notNull(),      // 分类ID
  subCategoryId: text('sub_category_id'),         // 二级分类ID
  description: text('description'),               // 备注描述
  date: integer('date', { mode: 'timestamp' }).notNull(), // 消费日期
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// 标签表
export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),                   // 标签名称
  userId: text('user_id'),                        // 用户自定义标签关联用户ID，null为系统内置
  familyId: text('family_id'),                    // 家庭共享标签
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// 消费记录-标签关联表
export const expenseTags = sqliteTable('expense_tags', {
  id: text('id').primaryKey(),
  expenseId: text('expense_id').notNull(),
  tagId: text('tag_id').notNull(),
});

// 导出历史表
export const exportHistory = sqliteTable('export_history', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  familyId: text('family_id'),
  fileUrl: text('file_url').notNull(),            // R2文件URL
  startDate: integer('start_date', { mode: 'timestamp' }),
  endDate: integer('end_date', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

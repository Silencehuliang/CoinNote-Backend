import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// 用户表
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  openid: text('openid').notNull().unique(),
  nickname: text('nickname').notNull(),
  avatar: text('avatar'),
  familyId: text('family_id'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// 家庭表
export const families = sqliteTable('families', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  inviteCode: text('invite_code').notNull().unique(),
  ownerId: text('owner_id').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// 消费分类表
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon'),
  parentId: text('parent_id'),
  userId: text('user_id'),
  isSystem: integer('is_system').default(0),
  sortOrder: integer('sort_order').default(0),
  createdAt: integer('created_at').notNull(),
});

// 消费记录表
export const expenses = sqliteTable('expenses', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  familyId: text('family_id'),
  amount: real('amount').notNull(),
  categoryId: text('category_id').notNull(),
  subCategoryId: text('sub_category_id'),
  description: text('description'),
  date: text('date').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

// 标签表
export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  userId: text('user_id'),
  familyId: text('family_id'),
  createdAt: integer('created_at').notNull(),
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
  fileUrl: text('file_url').notNull(),
  startDate: text('start_date'),
  endDate: text('end_date'),
  createdAt: integer('created_at').notNull(),
});

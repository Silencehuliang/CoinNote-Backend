-- 创建用户表
CREATE TABLE IF NOT EXISTS `users` (
  `id` text PRIMARY KEY NOT NULL,
  `openid` text NOT NULL,
  `nickname` text NOT NULL,
  `avatar` text,
  `family_id` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `users_openid_unique` ON `users` (`openid`);

-- 创建家庭表
CREATE TABLE IF NOT EXISTS `families` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `invite_code` text NOT NULL,
  `owner_id` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `families_invite_code_unique` ON `families` (`invite_code`);

-- 创建分类表
CREATE TABLE IF NOT EXISTS `categories` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `icon` text,
  `parent_id` text,
  `user_id` text,
  `is_system` integer DEFAULT false,
  `sort_order` integer DEFAULT 0,
  `created_at` integer NOT NULL
);

-- 创建消费记录表
CREATE TABLE IF NOT EXISTS `expenses` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `family_id` text,
  `amount` real NOT NULL,
  `category_id` text NOT NULL,
  `sub_category_id` text,
  `description` text,
  `date` integer NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);

-- 创建标签表
CREATE TABLE IF NOT EXISTS `tags` (
  `id` text PRIMARY KEY NOT NULL,
  `name` text NOT NULL,
  `user_id` text,
  `family_id` text,
  `created_at` integer NOT NULL
);

-- 创建消费记录-标签关联表
CREATE TABLE IF NOT EXISTS `expense_tags` (
  `id` text PRIMARY KEY NOT NULL,
  `expense_id` text NOT NULL,
  `tag_id` text NOT NULL
);

-- 创建导出历史表
CREATE TABLE IF NOT EXISTS `export_history` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `family_id` text,
  `file_url` text NOT NULL,
  `start_date` integer,
  `end_date` integer,
  `created_at` integer NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS `idx_users_openid` ON `users` (`openid`);
CREATE INDEX IF NOT EXISTS `idx_users_family_id` ON `users` (`family_id`);
CREATE INDEX IF NOT EXISTS `idx_families_invite_code` ON `families` (`invite_code`);
CREATE INDEX IF NOT EXISTS `idx_expenses_user_id` ON `expenses` (`user_id`);
CREATE INDEX IF NOT EXISTS `idx_expenses_family_id` ON `expenses` (`family_id`);
CREATE INDEX IF NOT EXISTS `idx_expenses_date` ON `expenses` (`date`);
CREATE INDEX IF NOT EXISTS `idx_expense_tags_expense_id` ON `expense_tags` (`expense_id`);
CREATE INDEX IF NOT EXISTS `idx_expense_tags_tag_id` ON `expense_tags` (`tag_id`);

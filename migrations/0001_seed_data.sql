-- 插入默认一级分类
INSERT OR IGNORE INTO `categories` (`id`, `name`, `icon`, `parent_id`, `is_system`, `sort_order`, `created_at`) VALUES
('food', '餐饮', '🍜', NULL, 1, 1, strftime('%s', 'now')),
('transport', '交通', '🚗', NULL, 1, 2, strftime('%s', 'now')),
('shopping', '购物', '🛍️', NULL, 1, 3, strftime('%s', 'now')),
('housing', '住房', '🏠', NULL, 1, 4, strftime('%s', 'now')),
('entertainment', '娱乐', '🎮', NULL, 1, 5, strftime('%s', 'now')),
('health', '医疗健康', '💊', NULL, 1, 6, strftime('%s', 'now')),
('education', '教育', '📚', NULL, 1, 7, strftime('%s', 'now')),
('other', '其他', '📦', NULL, 1, 99, strftime('%s', 'now'));

-- 插入餐饮子分类
INSERT OR IGNORE INTO `categories` (`id`, `name`, `icon`, `parent_id`, `is_system`, `sort_order`, `created_at`) VALUES
('food_breakfast', '早餐', '🌅', 'food', 1, 1, strftime('%s', 'now')),
('food_lunch', '午餐', '☀️', 'food', 1, 2, strftime('%s', 'now')),
('food_dinner', '晚餐', '🌙', 'food', 1, 3, strftime('%s', 'now')),
('food_snack', '零食饮料', '🍪', 'food', 1, 4, strftime('%s', 'now'));

-- 插入交通子分类
INSERT OR IGNORE INTO `categories` (`id`, `name`, `icon`, `parent_id`, `is_system`, `sort_order`, `created_at`) VALUES
('transport_bus', '公交地铁', '🚇', 'transport', 1, 1, strftime('%s', 'now')),
('transport_taxi', '打车', '🚕', 'transport', 1, 2, strftime('%s', 'now')),
('transport_fuel', '加油', '⛽', 'transport', 1, 3, strftime('%s', 'now')),
('transport_parking', '停车', '🅿️', 'transport', 1, 4, strftime('%s', 'now'));

-- 插入购物子分类
INSERT OR IGNORE INTO `categories` (`id`, `name`, `icon`, `parent_id`, `is_system`, `sort_order`, `created_at`) VALUES
('shopping_clothes', '服饰', '👕', 'shopping', 1, 1, strftime('%s', 'now')),
('shopping_daily', '日用品', '🧴', 'shopping', 1, 2, strftime('%s', 'now')),
('shopping_electronics', '数码', '📱', 'shopping', 1, 3, strftime('%s', 'now'));

-- 插入住房子分类
INSERT OR IGNORE INTO `categories` (`id`, `name`, `icon`, `parent_id`, `is_system`, `sort_order`, `created_at`) VALUES
('housing_rent', '房租', '🔑', 'housing', 1, 1, strftime('%s', 'now')),
('housing_utilities', '水电燃气', '💡', 'housing', 1, 2, strftime('%s', 'now')),
('housing_property', '物业费', '🏢', 'housing', 1, 3, strftime('%s', 'now'));

-- 插入娱乐子分类
INSERT OR IGNORE INTO `categories` (`id`, `name`, `icon`, `parent_id`, `is_system`, `sort_order`, `created_at`) VALUES
('entertainment_movie', '电影', '🎬', 'entertainment', 1, 1, strftime('%s', 'now')),
('entertainment_game', '游戏', '🎯', 'entertainment', 1, 2, strftime('%s', 'now')),
('entertainment_travel', '旅行', '✈️', 'entertainment', 1, 3, strftime('%s', 'now'));

-- 插入医疗健康子分类
INSERT OR IGNORE INTO `categories` (`id`, `name`, `icon`, `parent_id`, `is_system`, `sort_order`, `created_at`) VALUES
('health_medical', '看病', '🏥', 'health', 1, 1, strftime('%s', 'now')),
('health_insurance', '保险', '🛡️', 'health', 1, 2, strftime('%s', 'now')),
('health_fitness', '健身', '💪', 'health', 1, 3, strftime('%s', 'now'));

-- 插入教育子分类
INSERT OR IGNORE INTO `categories` (`id`, `name`, `icon`, `parent_id`, `is_system`, `sort_order`, `created_at`) VALUES
('education_course', '课程', '🎓', 'education', 1, 1, strftime('%s', 'now')),
('education_book', '书籍', '📖', 'education', 1, 2, strftime('%s', 'now'));

-- 插入默认标签
INSERT OR IGNORE INTO `tags` (`id`, `name`, `created_at`) VALUES
('tag_daily', '日常', strftime('%s', 'now')),
('tag_necessary', '必要', strftime('%s', 'now')),
('tag_impulse', '冲动消费', strftime('%s', 'now')),
('tag_shared', '共同支出', strftime('%s', 'now')),
('tag_personal', '个人消费', strftime('%s', 'now')),
('tag_gift', '礼物', strftime('%s', 'now')),
('tag_recurring', '固定支出', strftime('%s', 'now'));

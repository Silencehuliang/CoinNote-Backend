import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export type DB = ReturnType<typeof createDB>;

export function createDB(d1: D1Database) {
  return drizzle(d1, { schema });
}

// 默认分类数据
export const DEFAULT_CATEGORIES = [
  { id: 'food', name: '餐饮', icon: '🍜', isSystem: true, sortOrder: 1 },
  { id: 'food_breakfast', name: '早餐', icon: '🌅', parentId: 'food', isSystem: true, sortOrder: 1 },
  { id: 'food_lunch', name: '午餐', icon: '☀️', parentId: 'food', isSystem: true, sortOrder: 2 },
  { id: 'food_dinner', name: '晚餐', icon: '🌙', parentId: 'food', isSystem: true, sortOrder: 3 },
  { id: 'food_snack', name: '零食饮料', icon: '🍪', parentId: 'food', isSystem: true, sortOrder: 4 },
  
  { id: 'transport', name: '交通', icon: '🚗', isSystem: true, sortOrder: 2 },
  { id: 'transport_bus', name: '公交地铁', icon: '🚇', parentId: 'transport', isSystem: true, sortOrder: 1 },
  { id: 'transport_taxi', name: '打车', icon: '🚕', parentId: 'transport', isSystem: true, sortOrder: 2 },
  { id: 'transport_fuel', name: '加油', icon: '⛽', parentId: 'transport', isSystem: true, sortOrder: 3 },
  { id: 'transport_parking', name: '停车', icon: '🅿️', parentId: 'transport', isSystem: true, sortOrder: 4 },
  
  { id: 'shopping', name: '购物', icon: '🛍️', isSystem: true, sortOrder: 3 },
  { id: 'shopping_clothes', name: '服饰', icon: '👕', parentId: 'shopping', isSystem: true, sortOrder: 1 },
  { id: 'shopping_daily', name: '日用品', icon: '🧴', parentId: 'shopping', isSystem: true, sortOrder: 2 },
  { id: 'shopping_electronics', name: '数码', icon: '📱', parentId: 'shopping', isSystem: true, sortOrder: 3 },
  
  { id: 'housing', name: '住房', icon: '🏠', isSystem: true, sortOrder: 4 },
  { id: 'housing_rent', name: '房租', icon: '🔑', parentId: 'housing', isSystem: true, sortOrder: 1 },
  { id: 'housing_utilities', name: '水电燃气', icon: '💡', parentId: 'housing', isSystem: true, sortOrder: 2 },
  { id: 'housing_property', name: '物业费', icon: '🏢', parentId: 'housing', isSystem: true, sortOrder: 3 },
  
  { id: 'entertainment', name: '娱乐', icon: '🎮', isSystem: true, sortOrder: 5 },
  { id: 'entertainment_movie', name: '电影', icon: '🎬', parentId: 'entertainment', isSystem: true, sortOrder: 1 },
  { id: 'entertainment_game', name: '游戏', icon: '🎯', parentId: 'entertainment', isSystem: true, sortOrder: 2 },
  { id: 'entertainment_travel', name: '旅行', icon: '✈️', parentId: 'entertainment', isSystem: true, sortOrder: 3 },
  
  { id: 'health', name: '医疗健康', icon: '💊', isSystem: true, sortOrder: 6 },
  { id: 'health_medical', name: '看病', icon: '🏥', parentId: 'health', isSystem: true, sortOrder: 1 },
  { id: 'health_insurance', name: '保险', icon: '🛡️', parentId: 'health', isSystem: true, sortOrder: 2 },
  { id: 'health_fitness', name: '健身', icon: '💪', parentId: 'health', isSystem: true, sortOrder: 3 },
  
  { id: 'education', name: '教育', icon: '📚', isSystem: true, sortOrder: 7 },
  { id: 'education_course', name: '课程', icon: '🎓', parentId: 'education', isSystem: true, sortOrder: 1 },
  { id: 'education_book', name: '书籍', icon: '📖', parentId: 'education', isSystem: true, sortOrder: 2 },
  
  { id: 'other', name: '其他', icon: '📦', isSystem: true, sortOrder: 99 },
];

// 默认标签数据
export const DEFAULT_TAGS = [
  { id: 'tag_daily', name: '日常', isSystem: true },
  { id: 'tag_necessary', name: '必要', isSystem: true },
  { id: 'tag_impulse', name: '冲动消费', isSystem: true },
  { id: 'tag_shared', name: '共同支出', isSystem: true },
  { id: 'tag_personal', name: '个人消费', isSystem: true },
  { id: 'tag_gift', name: '礼物', isSystem: true },
  { id: 'tag_recurring', name: '固定支出', isSystem: true },
];

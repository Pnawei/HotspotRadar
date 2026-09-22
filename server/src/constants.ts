// 共享常量：分类英文 key 与中文名的映射

export const CATEGORY_NAMES: Record<string, string> = {
  social: '社会',
  entertainment: '娱乐',
  technology: '科技',
  finance: '财经',
  sports: '体育',
  international: '国际',
};

export function getCategoryName(category: string): string {
  return CATEGORY_NAMES[category] || '综合';
}

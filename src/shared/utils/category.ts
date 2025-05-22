import { Category, CategoryList } from '@/shared/types/menu'
import { readFile, writeFile } from '@/shared/utils/file'
import type { MenuItem, MenuList } from '@/shared/types/menu'

const CATEGORY_FILE_PATH = 'data/categories.json'

export async function loadCategories(menuList?: MenuList): Promise<CategoryList> {
  try {
    const data = await readFile(CATEGORY_FILE_PATH)
    let categories = JSON.parse(data) as CategoryList
    
    // '음료' 카테고리가 없으면 추가
    if (!categories.some(category => category.name === '음료')) {
      categories.push({
        id: crypto.randomUUID(),
        name: '음료',
        order: categories.length
      })
      await saveCategories(categories)
    }
    
    // 메뉴 목록이 제공된 경우, 목록에 있는 모든 카테고리를 검사하고 없는 카테고리 추가
    if (menuList && menuList.length > 0) {
      const existingCategoryNames = new Set(categories.map(cat => cat.name))
      const menuCategories = new Set(menuList.map(menu => menu.category))
      
      // 카테고리 목록에 없는 메뉴 카테고리 찾기
      const missingCategories: string[] = []
      menuCategories.forEach(categoryName => {
        if (!existingCategoryNames.has(categoryName)) {
          missingCategories.push(categoryName)
        }
      })
      
      // 누락된 카테고리가 있으면 추가
      if (missingCategories.length > 0) {
        for (const categoryName of missingCategories) {
          categories.push({
            id: crypto.randomUUID(),
            name: categoryName,
            order: categories.length
          })
        }
        await saveCategories(categories)
      }
    }
    
    return categories
  } catch {
    // 파일이 없는 경우 '음료' 카테고리만 포함하여 반환
    const defaultCategories: CategoryList = [{
      id: crypto.randomUUID(),
      name: '음료',
      order: 0
    }]
    
    // 메뉴 목록이 제공된 경우 추가 카테고리 생성
    if (menuList && menuList.length > 0) {
      const defaultCategoryNames = new Set(['음료'])
      const menuCategories = new Set(menuList.map(menu => menu.category))
      
      menuCategories.forEach(categoryName => {
        if (!defaultCategoryNames.has(categoryName)) {
          defaultCategories.push({
            id: crypto.randomUUID(),
            name: categoryName,
            order: defaultCategories.length
          })
        }
      })
    }
    
    await saveCategories(defaultCategories)
    return defaultCategories
  }
}

export async function saveCategories(categories: CategoryList): Promise<void> {
  await writeFile(CATEGORY_FILE_PATH, JSON.stringify(categories, null, 2))
}

export function addCategory(categories: CategoryList, name: string): CategoryList {
  const newCategory: Category = {
    id: crypto.randomUUID(),
    name,
    order: categories.length
  }
  return [...categories, newCategory]
}

export function updateCategory(categories: CategoryList, category: Category): CategoryList {
  return categories.map((c) => (c.id === category.id ? category : c))
}

export function deleteCategory(categories: CategoryList, categoryId: string): CategoryList {
  return categories.filter((c) => c.id !== categoryId)
}

export function reorderCategories(categories: CategoryList, sourceIndex: number, destinationIndex: number): CategoryList {
  const result = Array.from(categories)
  const [removed] = result.splice(sourceIndex, 1)
  result.splice(destinationIndex, 0, removed)
  return result.map((category, index) => ({ ...category, order: index }))
} 
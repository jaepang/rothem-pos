import { Category, CategoryList } from '@/shared/types/menu'
import { readFile, writeFile } from '@/shared/utils/file'

const CATEGORY_FILE_PATH = 'categories.json'

export async function loadCategories(): Promise<CategoryList> {
  try {
    const data = await readFile(CATEGORY_FILE_PATH)
    return JSON.parse(data)
  } catch {
    return []
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
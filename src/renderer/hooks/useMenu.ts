import { useState, useEffect } from 'react'
import { MenuItem, MenuList } from '@/shared/types/menu'
import { loadCategories } from '@/shared/utils/category'
import { DataService } from '@/firebase/dataService'
import { useAuth } from '@/firebase/AuthContext'

export const useMenu = () => {
  const [menus, setMenus] = useState<MenuList>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('전체')
  const [isEditMode, setIsEditMode] = useState<boolean>(false)
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null)
  const [selectedOriginalId, setSelectedOriginalId] = useState<string | null>(null)
  const { token } = useAuth()

  // 원본 ID 추출 헬퍼 함수
  const getOriginalId = (menuId: string) => {
    if (typeof menuId === 'string' && (menuId.endsWith('-hot') || menuId.endsWith('-ice'))) {
      return menuId.substring(0, menuId.lastIndexOf('-'))
    }
    return menuId
  }

  useEffect(() => {
    loadMenuData()
  }, [token])

  const loadMenuData = async () => {
    try {
      const loadedMenus = await DataService.loadData('menu', token || undefined)
    
    // 메뉴 목록을 loadCategories에 전달하여 필요한 카테고리를 생성합니다
    await loadCategories(loadedMenus)
    
    // 불러온 메뉴에 order 필드 유무 확인
    const hasOrderField = loadedMenus.some(menu => 'order' in menu)
    
    if (!hasOrderField) {
      // 카테고리별 메뉴 수 계산
      const categoryCounts = loadedMenus.reduce((acc, menu) => {
        acc[menu.category] = (acc[menu.category] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // 카테고리를 메뉴 수 기준으로 정렬
      const sortedCategories = Object.entries(categoryCounts)
          .sort(([, a], [, b]) => (b as number) - (a as number))
        .map(([category]) => category)
      
      // 정렬된 카테고리 순서대로 메뉴 정렬
      const sortedMenus = [...loadedMenus].sort((a, b) => {
        const aIndex = sortedCategories.indexOf(a.category)
        const bIndex = sortedCategories.indexOf(b.category)
        if (aIndex === bIndex) {
          return a.name.localeCompare(b.name)
        }
        return aIndex - bIndex
      })
      
      // 정렬된 메뉴에 order 필드 추가
      const menusWithOrder = sortedMenus.map((menu, index) => ({
        ...menu,
        order: index + 1
      }))
      
      // 메뉴 상태 업데이트
      setMenus(menusWithOrder)
      
        // 메뉴 정렬 정보를 저장
      try {
          await DataService.saveData('menu', menusWithOrder, token || undefined)
      } catch (error) {
        console.error('메뉴 순서 저장 실패:', error)
      }
    } else {
      // order 필드가 이미 있는 경우 해당 필드로 정렬
      const sortedMenus = [...loadedMenus].sort((a, b) => {
          return (a.order || a.order === 0 ? a.order : 0) - (b.order || b.order === 0 ? b.order : 0)
      })
      setMenus(sortedMenus)
      }
    } catch (error) {
      console.error('메뉴 데이터 로드 실패:', error)
      setMenus([])
    }
  }

  const getCategories = () => {
    return ['전체', ...new Set(menus.map(menu => menu.category))]
  }

  const getFilteredMenus = () => {
    const filteredMenus = selectedCategory === '전체'
      ? menus
      : menus.filter(menu => menu.category === selectedCategory)

    // order 필드로 메뉴 정렬
    return [...filteredMenus].sort((a, b) => {
      return (a.order || 0) - (b.order || 0)
    })
  }

  const getDisplayMenus = () => {
    const sortedMenus = getFilteredMenus()
    
    return sortedMenus.map(menu => {
      if (menu.category === '음료') {
        const variants = []
        if (menu.isHot) {
          variants.push({
            ...menu,
            displayName: `${menu.name} (HOT)`,
            name: menu.name,
            price: Number(menu.hotPrice || menu.price),
            isHot: true,
            isIce: false,
            id: `${menu.id}-hot`, // 고유한 ID 생성
            order: menu.order ? menu.order * 10 : 0 // 정렬을 위한 고유한 순서값 (원본 * 10)
          })
        }
        if (menu.isIce) {
          variants.push({
            ...menu,
            displayName: `${menu.name} (ICE)`,
            name: menu.name,
            price: Number(menu.icePrice || menu.price),
            isHot: false,
            isIce: true,
            id: `${menu.id}-ice`, // 고유한 ID 생성
            order: menu.order ? menu.order * 10 + 1 : 1 // 정렬을 위한 고유한 순서값 (원본 * 10 + 1)
          })
        }
        return variants
      }
      return [{
        ...menu,
        displayName: menu.name
      }]
    }).flat()
  }

  // 메뉴 순서 변경 핸들러
  const handleOrderChange = (index: number) => {
      setSelectedCardIndex(index)
    const menu = getDisplayMenus()[index]
    const origId = getOriginalId(menu.id)
    setSelectedOriginalId(origId)
  }

  // 메뉴 순서 저장 핸들러
  const handleSaveOrder = async () => {
    try {
      await DataService.saveData('menu', menus, token || undefined)
      setIsEditMode(false)
      setSelectedCardIndex(null)
      setSelectedOriginalId(null)
    } catch (error) {
      console.error('메뉴 순서 저장 실패:', error)
      alert('메뉴 순서를 저장하는데 실패했습니다.')
    }
  }

  // 메뉴 순서 편집 취소 핸들러
  const handleCancelEdit = () => {
    setIsEditMode(false)
    setSelectedCardIndex(null)
    setSelectedOriginalId(null)
  }

  return {
    menus,
    selectedCategory,
    setSelectedCategory,
    isEditMode,
    setIsEditMode,
    selectedCardIndex,
    selectedOriginalId,
    getOriginalId,
    getCategories,
    getDisplayMenus,
    handleOrderChange,
    handleSaveOrder,
    handleCancelEdit
  }
} 
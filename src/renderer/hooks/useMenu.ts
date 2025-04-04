import { useState, useEffect } from 'react'
import { MenuItem, MenuList } from '@/shared/types/menu'
import { loadMenuFromJson, saveMenuToJson } from '@/shared/utils/menu'
import { loadCategories } from '@/shared/utils/category'

export const useMenu = () => {
  const [menus, setMenus] = useState<MenuList>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('전체')
  const [isEditMode, setIsEditMode] = useState<boolean>(false)
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null)
  const [selectedOriginalId, setSelectedOriginalId] = useState<string | null>(null)

  // 원본 ID 추출 헬퍼 함수
  const getOriginalId = (menuId: string) => {
    if (typeof menuId === 'string' && (menuId.endsWith('-hot') || menuId.endsWith('-ice'))) {
      return menuId.substring(0, menuId.lastIndexOf('-'))
    }
    return menuId
  }

  useEffect(() => {
    loadMenuData()
  }, [])

  const loadMenuData = async () => {
    const loadedMenus = await loadMenuFromJson()
    
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
        .sort(([, a], [, b]) => b - a)
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
      
      // 메뉴 정렬 정보를 JSON에 저장
      try {
        await saveMenuToJson(menusWithOrder)
      } catch (error) {
        console.error('메뉴 순서 저장 실패:', error)
      }
    } else {
      // order 필드가 이미 있는 경우 해당 필드로 정렬
      const sortedMenus = [...loadedMenus].sort((a, b) => {
        return (a.order || 0) - (b.order || 0)
      })
      setMenus(sortedMenus)
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

  // 순서 변경 함수
  const handleOrderChange = (index: number) => {
    if (!isEditMode) return
    
    const displayMenus = getDisplayMenus()
    
    // 선택된 메뉴의 원본 ID 가져오기
    const selectedMenu = displayMenus[index]
    const origId = getOriginalId(selectedMenu.id)
    
    // 이미 선택된 카드를 다시 클릭한 경우 선택 해제
    if (selectedCardIndex === index || 
        (selectedOriginalId !== null && getOriginalId(selectedMenu.id) === selectedOriginalId)) {
      setSelectedCardIndex(null)
      setSelectedOriginalId(null)
      return
    }
    
    if (selectedCardIndex === null) {
      // 첫 번째 카드 선택
      setSelectedCardIndex(index)
      setSelectedOriginalId(origId) // 원본 ID 저장
    } else if (selectedCardIndex !== index) {
      // 두 번째 카드 선택 시 순서 교환
      const updatedMenus = [...menus]
      const firstMenu = displayMenus[selectedCardIndex]
      const secondMenu = displayMenus[index]
      
      // 원본 메뉴 찾기
      const firstOriginalId = getOriginalId(firstMenu.id)
      const secondOriginalId = getOriginalId(secondMenu.id)
      
      const firstMenuOriginalIndex = updatedMenus.findIndex(m => m.id === firstOriginalId)
      const secondMenuOriginalIndex = updatedMenus.findIndex(m => m.id === secondOriginalId)
      
      if (firstMenuOriginalIndex !== -1 && secondMenuOriginalIndex !== -1) {
        // 두 카드의 order 값 교환 (변형 고려)
        const firstOrder = updatedMenus[firstMenuOriginalIndex].order || 0
        const secondOrder = updatedMenus[secondMenuOriginalIndex].order || 0
        
        // 원본 메뉴 업데이트
        updatedMenus[firstMenuOriginalIndex] = {
          ...updatedMenus[firstMenuOriginalIndex],
          order: secondOrder
        }
        
        updatedMenus[secondMenuOriginalIndex] = {
          ...updatedMenus[secondMenuOriginalIndex],
          order: firstOrder
        }
        
        setMenus(updatedMenus)
      }
      
      // 선택 초기화
      setSelectedCardIndex(null)
      setSelectedOriginalId(null) // 원본 ID 초기화
    }
  }

  // 편집 모드 저장
  const handleSaveOrder = async () => {
    try {
      await saveMenuToJson(menus)
      setIsEditMode(false)
      setSelectedCardIndex(null)
      setSelectedOriginalId(null) // 원본 ID 초기화
      alert('메뉴 순서가 저장되었습니다.')
    } catch (error) {
      console.error('메뉴 순서 저장 실패:', error)
      alert('메뉴 순서 저장에 실패했습니다.')
    }
  }

  // 편집 모드 취소
  const handleCancelEdit = async () => {
    // 원래 메뉴 다시 불러오기
    await loadMenuData()
    setIsEditMode(false)
    setSelectedCardIndex(null)
    setSelectedOriginalId(null) // 원본 ID 초기화
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
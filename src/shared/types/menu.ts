export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  isSoldOut: boolean;
  isFavorite: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
}

export type MenuList = MenuItem[];
export type CategoryList = MenuCategory[]; 
export interface MenuItem {
  id: string;
  name: string;
  displayName?: string;
  category: string;
  price: number;
  isSoldOut: boolean;
  isFavorite: boolean;
  imageUrl: string | null;
  isIce?: boolean;
  isHot?: boolean;
}

export type MenuList = MenuItem[];

export interface Category {
  id: string;
  name: string;
  order: number;
}

export type CategoryList = Category[]; 
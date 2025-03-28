export interface MenuItem {
  id: string;
  name: string;
  displayName?: string;
  category: string;
  price: number;
  icePrice?: number;
  hotPrice?: number;
  isSoldOut: boolean;
  isIce?: boolean;
  isHot?: boolean;
  relatedInventoryIds?: string[];
}

export type MenuList = MenuItem[];

export interface Category {
  id: string;
  name: string;
  order: number;
}

export type CategoryList = Category[]; 
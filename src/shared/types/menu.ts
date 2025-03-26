export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  isSoldOut: boolean;
  isFavorite: boolean;
  imageUrl: string | null;
}

export type MenuList = MenuItem[];

export interface Category {
  id: string;
  name: string;
  order: number;
}

export type CategoryList = Category[]; 
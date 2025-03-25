export interface MenuItem {
  id: string;
  category: string;
  name: string;
  price: number;
  isSoldOut: boolean;
  isFavorite?: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
}

export interface Order {
  id: string;
  items: OrderItem[];
  totalPrice: number;
  orderTime: string;
}

export interface OrderItem {
  menuItem: MenuItem;
  quantity: number;
}
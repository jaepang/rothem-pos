import { MenuItem } from './menu'

export interface OrderItem {
  menuItem: MenuItem;
  quantity: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  totalAmount: number;
  orderDate: string;
  memo?: string;
  status: 'pending' | 'completed';
  printed: boolean;
}

export type OrderList = Order[];
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
  completedAt?: string;
  memo?: string;
  tableNumber?: string;
  status: 'pending' | 'completed' | 'cancelled';
  printed: boolean;
}

export type OrderList = Order[];
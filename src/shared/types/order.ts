import { MenuItem } from './menu';

export interface OrderItem {
  menuItem: MenuItem;
  quantity: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  totalAmount: number;
  orderDate: string;
  tableNumber?: string;
  memo?: string;
}

export type OrderList = Order[]; 
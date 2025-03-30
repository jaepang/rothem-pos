/// <reference types="vite/client" />

/// <reference path="./types/images.d.ts" />

interface ElectronAPI {
  versions: Record<string, string>;
  path: {
    join: (...args: string[]) => Promise<string>;
    resolve: (...args: string[]) => Promise<string>;
  };
  fs: {
    saveImage: (file: ArrayBuffer, menuId: string) => Promise<string>;
    deleteImage: (imageUrl: string) => Promise<void>;
  };
  menu: {
    loadMenuFromJson: () => Promise<any[]>;
    saveMenuToJson: (menuList: any[]) => Promise<void>;
  };
  inventory: {
    loadInventoryFromJson: () => Promise<any[]>;
    saveInventoryToJson: (inventoryList: any[]) => Promise<void>;
  };
  orders: {
    loadOrdersFromJson: () => Promise<any[]>;
    saveOrdersToJson: (orders: any[]) => Promise<boolean>;
  };
  printer: {
    initialize: () => Promise<boolean>;
    getStatus: () => Promise<boolean>;
    printOrder: (order: any) => Promise<void>;
  };
}

interface Window {
  electronAPI: ElectronAPI;
  electron: any;
}

// Electron API 타입 정의
interface ElectronAPI {
  isElectron: boolean;
  platform: string;
  isWindows: boolean;
  fs: {
    readFile: (filePath: string) => Promise<string>;
    writeFile: (filePath: string, content: string) => Promise<void>;
    ensureDir: (dirPath: string) => Promise<void>;
  };
  relaunch: () => Promise<void>;
  getAppVersion: () => Promise<string>;
  ping: () => string;
  getUserDataPath: () => string;
  checkRootElement: () => {
    exists: boolean;
    childCount: number;
    innerHTML: string;
  };
  forceRerender: () => boolean;
}

// Window 인터페이스 확장
declare interface Window {
  electron?: ElectronAPI;
} 
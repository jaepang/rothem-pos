// Global type definitions
interface Window {
  electron: {
    fs: {
      readFile: (filePath: string) => Promise<string>
      writeFile: (filePath: string, content: string) => Promise<void>
      ensureDir: (dirPath: string) => Promise<void>
    }
  };
  electronIPC?: {
    send: (channel: string, data: any) => void;
    sendSync: (channel: string, ...args: any[]) => any;
    on: (channel: string, func: (...args: any[]) => void) => void;
    once: (channel: string, func: (...args: any[]) => void) => void;
    invoke: (channel: string, data?: any) => Promise<any>;
  };
} 
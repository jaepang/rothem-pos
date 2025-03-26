declare global {
  interface Window {
    electron: {
      fs: {
        readFile: (filePath: string) => Promise<string>
        writeFile: (filePath: string, content: string) => Promise<void>
        ensureDir: (dirPath: string) => Promise<void>
      }
    }
  }
}

export async function ensureDataDir() {
  await window.electron.fs.ensureDir('data')
}

export async function readFile(filePath: string): Promise<string> {
  await ensureDataDir()
  return await window.electron.fs.readFile(filePath)
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  await ensureDataDir()
  await window.electron.fs.writeFile(filePath, content)
} 
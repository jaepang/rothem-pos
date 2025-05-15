export async function ensureDataDir() {
  if (!window.electron) {
    throw new Error('electron API가 사용 불가능합니다. 이 기능은 Electron 환경에서만 동작합니다.');
  }
  await window.electron.fs.ensureDir('data');
}

export async function readFile(filePath: string): Promise<string> {
  if (!window.electron) {
    throw new Error('electron API가 사용 불가능합니다. 이 기능은 Electron 환경에서만 동작합니다.');
  }
  await ensureDataDir();
  return await window.electron.fs.readFile(filePath);
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  if (!window.electron) {
    throw new Error('electron API가 사용 불가능합니다. 이 기능은 Electron 환경에서만 동작합니다.');
  }
  await ensureDataDir();
  await window.electron.fs.writeFile(filePath, content);
}
import { defineConfig } from 'vite'
import electron from 'vite-plugin-electron'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 플랫폼 확인
const isWindows = process.platform === 'win32';
console.log(`[Vite] 운영체제: ${process.platform}, 빌드 설정 조정 중...`);

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            minify: false,
            sourcemap: true,
          },
          publicDir: 'public',
        },
      },
      {
        entry: 'electron/preload.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            minify: false,
            sourcemap: true,
            rollupOptions: {
              external: ['electron', 'usb', 'node-thermal-printer'],
              output: {
                format: 'cjs',
              },
            },
          },
        },
      },
    ]),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Windows에서 경로 해결 시 대소문자 구분에 민감해질 수 있도록 설정
    preserveSymlinks: isWindows,
  },
  optimizeDeps: {
    exclude: ['electron', 'usb', 'node-thermal-printer'],
    esbuildOptions: {
      target: isWindows ? 'es2020' : 'es2022',
    }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      external: ['electron', 'usb', 'node-thermal-printer'],
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: undefined,
        // Windows에서 대소문자를 유지하도록 설정
        preserveModules: isWindows,
        preserveModulesRoot: 'src',
      },
    },
    // Windows에서 빌드 최적화 조정
    target: isWindows ? 'es2020' : 'es2022',
    minify: isWindows ? 'esbuild' : true,
    emptyOutDir: true,
    assetsDir: 'assets',
    copyPublicDir: true,
    assetsInlineLimit: 4096,
    sourcemap: true,
    reportCompressedSize: false,
    // Windows에서 더 안정적인 청크 처리 위해
    chunkSizeWarningLimit: 1000,
  },
  publicDir: 'public',
  server: {
    host: true,
    port: 5174,
    strictPort: false,
    cors: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5174,
      // Windows 환경에서 HMR 안정성 개선
      overlay: false,
      timeout: 30000,
      // Electron과 함께 사용할 때는 HMR이 불안정할 수 있음
      clientPort: 5174
    }
  }
}) 
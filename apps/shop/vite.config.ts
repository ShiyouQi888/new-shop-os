import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { VantResolver } from '@vant/auto-import-resolver'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    Components({
      resolvers: [VantResolver()],
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shop-os/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  server: {
    port: 5174,
    host: '0.0.0.0',
  },
  optimizeDeps: {
    // 禁用运行时发现：避免重优化触发批量删缓存被 safe-delete 守卫拦截导致崩溃。
    // dayjs 的包入口是 UMD 文件，浏览器直连时没有 default export，需要显式预构建。
    noDiscovery: true,
    include: ['dayjs'],
  },
  build: {
    emptyOutDir: false,
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern',
        additionalData: `@use "@/styles/variables" as *;`,
      },
    },
  },
})

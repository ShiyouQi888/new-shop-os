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
      // 禁用自动写入 components.d.ts：该文件在 Windows 下常被进程锁定导致 EPERM，且不影响运行时转换
      dts: false,
    }),
  ],
  resolve: {
    alias: [
      { find: '@', replacement: resolve(__dirname, 'src') },
      { find: '@shop-os/shared', replacement: resolve(__dirname, '../../packages/shared/src/index.ts') },
      // dayjs 入口是 UMD，浏览器直连无 default export；统一指向 ESM 构建（与 admin 一致）
      // 注意：replacement 必须为绝对路径 —— 相对路径会被相对 importee 所在目录解析导致 dev 报错
      { find: /^dayjs$/, replacement: resolve(__dirname, 'node_modules/dayjs/esm/index.js') },
      { find: /^dayjs\/plugin\/(.+?)(?:\.js)?$/, replacement: resolve(__dirname, 'node_modules/dayjs/esm/plugin/$1/index.js') },
    ],
  },
  server: {
    port: 5174,
    host: '0.0.0.0',
  },
  optimizeDeps: {
    // 禁用运行时发现：避免重优化触发批量删缓存被 safe-delete 守卫拦截导致崩溃。
    noDiscovery: true,
    include: [],
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
